var BlockCache = (function() {
  var DB_NAME = 'BitmapCoreBlockCache';
  var DB_VERSION = 2;
  var STORE_NAME = 'batches';
  var META_STORE = 'meta';
  var REFRESH_INTERVAL = 60 * 60 * 1000;
  var SERVER_BATCH = 50000;
  var TOTAL_BLOCKS = 955001;
  var db = null;
  var isPreloading = false;
  var preloadProgress = { current: 0, total: TOTAL_BLOCKS };
  var preloadCallback = null;

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (db) return resolve(db);
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = function() { reject(request.error); };
      request.onsuccess = function() { db = request.result; resolve(db); };
      request.onupgradeneeded = function(e) {
        var database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'batchIndex' });
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  function getBlock(blockNum) {
    var batchIndex = Math.floor(blockNum / SERVER_BATCH);
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var request = tx.objectStore(STORE_NAME).get(batchIndex);
        request.onsuccess = function() {
          var batch = request.result;
          if (!batch || !batch.blocks) return resolve(null);
          resolve(batch.blocks[blockNum % SERVER_BATCH] || null);
        };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function saveBatch(batchIndex, blocks) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readwrite');
        var request = tx.objectStore(STORE_NAME).put({ batchIndex: batchIndex, blocks: blocks });
        request.onsuccess = function() { resolve(); };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function saveBlocks(blocks) {
    var batchIndex = blocks[0] ? Math.floor(blocks[0].bloque / SERVER_BATCH) : 0;
    return saveBatch(batchIndex, blocks);
  }

  function setLastRefresh(timestamp) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(META_STORE, 'readwrite');
        var request = tx.objectStore(META_STORE).put({ key: 'lastRefresh', value: timestamp });
        request.onsuccess = function() { resolve(); };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function getCacheStatus() {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var request = tx.objectStore(STORE_NAME).count();
        request.onsuccess = function() {
          var batchCount = request.result;
          var totalBatchCount = Math.ceil(TOTAL_BLOCKS / SERVER_BATCH);
          resolve({ batchCount: batchCount, totalBatches: totalBatchCount, complete: batchCount >= totalBatchCount });
        };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function preloadAllAtOnce(callback) {
    if (isPreloading) return Promise.resolve();
    isPreloading = true;
    preloadCallback = callback || null;

    return getCacheStatus().then(function(status) {
      var cachedBlocks = status.batchCount * SERVER_BATCH;
      console.log('📦 BlockCache: Iniciando preload. Batches en caché:', status.batchCount, '/', status.totalBatches);
      preloadProgress = { current: cachedBlocks, total: TOTAL_BLOCKS };

      if (status.complete) {
        console.log('📦 BlockCache: Ya completo en caché.');
        isPreloading = false;
        if (preloadCallback) preloadCallback(true);
        return;
      }

      return downloadNextBatch(status.batchCount);
    });
  }

  function downloadNextBatch(startBatch) {
    var start = startBatch * SERVER_BATCH;
    var remaining = TOTAL_BLOCKS - start;
    if (remaining <= 0) {
      console.log('📦 BlockCache: Preload completo.');
      isPreloading = false;
      setLastRefresh(Date.now());
      if (preloadCallback) preloadCallback(true);
      return;
    }

    var limit = Math.min(remaining, SERVER_BATCH);

    return fetch('/api/v1/blocks/batch?start=' + start + '&limit=' + limit)
      .then(function(r) { return r.json(); })
      .then(function(response) {
        var data = response.data || {};
        var items = data.items || [];
        if (!response.success || items.length === 0) {
          console.log('📦 BlockCache: Sin más bloques (start=' + start + ', limit=' + limit + ')');
          isPreloading = false;
          setLastRefresh(Date.now());
          if (preloadCallback) preloadCallback(true);
          return;
        }

        var blocks = items;
        preloadProgress.current += blocks.length;

        return saveBatch(startBatch, blocks).then(function() {
          var pct = ((preloadProgress.current / preloadProgress.total) * 100).toFixed(1);
          console.log('📦 BlockCache: Batch #' + startBatch + ' guardado (' + blocks.length + ' bloques). Progreso:', pct + '%');

          if (preloadCallback) preloadCallback(false, preloadProgress);

          if (!isPreloading) return;
          setTimeout(function() { downloadNextBatch(startBatch + 1); }, 0);
        });
      })
      .catch(function(err) {
        console.error('📦 BlockCache: Error en batch:', err);
        isPreloading = false;
        if (preloadCallback) preloadCallback(false, preloadProgress, err);
      });
  }

  function clearCache() {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction([STORE_NAME, META_STORE], 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.objectStore(META_STORE).clear();
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { reject(tx.error); };
      });
    });
  }

  return {
    openDB: openDB,
    getBlock: getBlock,
    saveBlock: function() {},
    saveBlocks: saveBlocks,
    getCacheStatus: getCacheStatus,
    preloadAll: preloadAllAtOnce,
    preloadAllAtOnce: preloadAllAtOnce,
    clearCache: clearCache,
    getPreloadProgress: function() { return preloadProgress; },
    isPreloadingActive: function() { return isPreloading; },
    SERVER_BATCH: SERVER_BATCH,
    TOTAL_BLOCKS: TOTAL_BLOCKS,
    REFRESH_INTERVAL: REFRESH_INTERVAL
  };
})();

var AtlasCache = (function() {
  var DB_NAME = 'BitmapCoreAtlasCache';
  var DB_VERSION = 3;
  var STORE_NAME = 'atlas';
  var db = null;
var inFlight = {};
var cachedKeys = {};
var loaded = false;
var loadAllKeysPromise = null;
var fetchQueue = [];
var activeFetches = 0;
var MAX_CONCURRENT_FETCHES = 6;

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (db) return resolve(db);
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = function() { reject(request.error); };
      request.onsuccess = function() { db = request.result; resolve(db); };
      request.onupgradeneeded = function(e) {
        var database = e.target.result;
        if (e.oldVersion < 3) {
          if (database.objectStoreNames.contains(STORE_NAME)) {
            database.deleteObjectStore(STORE_NAME);
          }
        }
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'gz' });
        }
      };
    });
  }

  function getAtlasBlob(gz) {
    console.log('🗺️ AtlasCache.getAtlasBlob: gz=', gz);
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var request = tx.objectStore(STORE_NAME).get(gz);
        request.onsuccess = function() {
          var row = request.result;
          if (row && row.blob) {
            cachedKeys[gz] = true;
            console.log('🗺️ AtlasCache.getAtlasBlob: gz', gz, 'FOUND in IndexedDB, size=', row.blob.size);
            resolve(row.blob);
          } else {
            console.log('🗺️ AtlasCache.getAtlasBlob: gz', gz, 'NOT FOUND in IndexedDB');
            resolve(null);
          }
        };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function saveAtlasBlob(gz, blob) {
    cachedKeys[gz] = true;
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readwrite');
        var request = tx.objectStore(STORE_NAME).put({ gz: gz, blob: blob });
        request.onsuccess = function() { resolve(); };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function loadAllKeys() {
    if (loaded) {
      console.log('🗺️ AtlasCache.loadAllKeys: already loaded, cachedKeys count=', Object.keys(cachedKeys).length);
      return Promise.resolve();
    }
    if (loadAllKeysPromise) {
      console.log('🗺️ AtlasCache.loadAllKeys: already loading, waiting for existing Promise');
      return loadAllKeysPromise;
    }
    console.log('🗺️ AtlasCache.loadAllKeys: loading from IndexedDB...');
    loadAllKeysPromise = openDB().then(function(database) {
      return new Promise(function(resolve) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var request = tx.objectStore(STORE_NAME).openCursor();
        var count = 0;
        request.onsuccess = function(e) {
          var cursor = e.target.result;
          if (cursor) {
            cachedKeys[cursor.key] = true;
            count++;
            cursor.continue();
          } else {
            loaded = true;
            loadAllKeysPromise = null;
            console.log('🗺️ AtlasCache.loadAllKeys: DONE, cachedKeys count=', count);
            resolve();
          }
        };
        request.onerror = function() {
          console.error('🗺️ AtlasCache.loadAllKeys: ERROR');
          loaded = true;
          loadAllKeysPromise = null;
          resolve();
        };
      });
    });
    return loadAllKeysPromise;
  }

  function hasAtlas(gz) {
    return cachedKeys[gz] === true;
  }

  var ATLAS_TOTAL = 956;
  var ATLAS_CONCURRENT = 50;
  var preloadRunning = false;
  var preloadToken = 0;
  var preloadRadius = 2;
  var lastRegionCenter = null;

  function tileFromCam() {
    var camRow = 0, camCol = 6;
    try {
      if (typeof WorldControls !== 'undefined' && WorldControls.getState) {
        var st = WorldControls.getState();
        var t = st.theta, p = st.phi;
        var gx = Math.round((t / (Math.PI * 2)) * 1000) % 1000;
        camCol = Math.floor(gx / 40);
        if (p >= 0) camRow = Math.floor((p / (Math.PI / 2)) * 499 / 25);
        else camRow = 20 + Math.floor(((-p / (Math.PI / 2)) * 455) / 25);
        camRow = Math.max(0, Math.min(38, camRow));
        camCol = Math.max(0, Math.min(24, camCol));
      }
    } catch (e) {}
    return { row: camRow, col: camCol };
  }

  function regionPending(center, radius) {
    var pending = [];
    for (var dr = -radius; dr <= radius; dr++) {
      for (var dc = -radius; dc <= radius; dc++) {
        var r = center.row + dr;
        var c = center.col + dc;
        if (r < 0 || r > 38 || c < 0 || c > 24) continue;
        var gz = r * 25 + c;
        if (gz < 0 || gz > 955) continue;
        if (!hasAtlas(gz)) pending.push(gz);
      }
    }
    pending.sort(function(a, b) {
      var ra = Math.floor(a / 25), ca = a % 25;
      var rb = Math.floor(b / 25), cb = b % 25;
      var da = Math.abs(ra - center.row) + Math.abs(ca - center.col);
      var db = Math.abs(rb - center.row) + Math.abs(cb - center.col);
      return da - db;
    });
    return pending;
  }

  function cancelPreload() {
    preloadToken++;
    preloadRunning = false;
  }

  function preloadAll(callback) {
    if (preloadRunning) return;
    preloadRunning = true;
    var token = ++preloadToken;

    loadAllKeys().then(function() {
      if (token !== preloadToken) { preloadRunning = false; if (callback) callback(true); return; }
      var center = tileFromCam();
      lastRegionCenter = center;
      var pending = regionPending(center, preloadRadius);
      if (pending.length === 0) {
        preloadRunning = false;
        if (callback) callback(true);
        return;
      }

      var i = 0;
      function next() {
        if (token !== preloadToken) {
          preloadRunning = false;
          if (callback) callback(true);
          return;
        }
        if (i >= pending.length) {
          preloadRunning = false;
          if (callback) callback(true);
          return;
        }
        var gz = pending[i++];
        fetchAtlas(gz, function() { next(); }, false);
      }
      for (var c = 0; c < ATLAS_CONCURRENT && c < pending.length; c++) next();
    });
  }

  function updateRegionFromCamera() {
    if (!preloadRunning) {
      preloadAll();
      return;
    }
    var center = tileFromCam();
    if (!lastRegionCenter) { preloadAll(); return; }
    var moved = Math.abs(center.row - lastRegionCenter.row) + Math.abs(center.col - lastRegionCenter.col);
    if (moved >= 2) {
      cancelPreload();
      preloadAll();
    }
  }

  function ensureAtlas(gz, callback) {
    console.log('🗺️ AtlasCache.ensureAtlas: gz=', gz);
    loadAllKeys().then(function() {
      if (cachedKeys[gz]) {
        console.log('🗺️ AtlasCache.ensureAtlas: gz', gz, 'found in cachedKeys, getting blob');
        getAtlasBlob(gz).then(function(blob) {
          if (blob) {
            console.log('🗺️ AtlasCache.ensureAtlas: gz', gz, 'blob found, size=', blob.size);
            callback(blob);
          } else {
            console.warn('🗺️ AtlasCache.ensureAtlas: gz', gz, 'blob NOT FOUND in IndexedDB, fetching');
            delete cachedKeys[gz];
            fetchAtlas(gz, callback, true);
          }
        });
        return;
      }
      console.log('🗺️ AtlasCache.ensureAtlas: gz', gz, 'NOT in cachedKeys, fetching from API');
      fetchAtlas(gz, callback, true);
    });
  }

  function processFetchQueue() {
    while (fetchQueue.length > 0 && activeFetches < MAX_CONCURRENT_FETCHES) {
      var task = fetchQueue.shift();
      activeFetches++;
      doFetch(task.gz, task.callback);
    }
  }

  function fetchAtlas(gz, callback, urgent) {
    if (activeFetches < MAX_CONCURRENT_FETCHES) {
      activeFetches++;
      doFetch(gz, callback);
    } else if (urgent) {
      fetchQueue.unshift({ gz: gz, callback: callback });
      processFetchQueue();
    } else {
      fetchQueue.push({ gz: gz, callback: callback });
      processFetchQueue();
    }
  }

  function doFetch(gz, callback) {
    if (inFlight[gz]) {
      inFlight[gz].push(callback);
      activeFetches--;
      processFetchQueue();
      return;
    }
    inFlight[gz] = [callback];
    var url = '/api/v1/world/atlas/' + gz;
    fetch(url)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.blob();
      })
      .then(function(blob) {
        activeFetches--;
        var cbs = inFlight[gz] || [];
        delete inFlight[gz];
        for (var i = 0; i < cbs.length; i++) cbs[i](blob);
        saveAtlasBlob(gz, blob).catch(function() {});
        processFetchQueue();
      })
      .catch(function(err) {
        activeFetches--;
        var cbs = inFlight[gz] || [];
        delete inFlight[gz];
        for (var i = 0; i < cbs.length; i++) cbs[i](null);
        processFetchQueue();
      });
  }

  return {
    openDB: openDB,
    ensureAtlas: ensureAtlas,
    hasAtlas: hasAtlas,
    getAtlasBlob: getAtlasBlob,
    saveAtlasBlob: saveAtlasBlob,
    loadAllKeys: loadAllKeys,
    preloadAll: preloadAll,
    cancelPreload: cancelPreload,
    updateRegionFromCamera: updateRegionFromCamera
  };
})();

var Atlas2Cache = (function() {
  var DB_NAME = 'BitmapCoreAtlas2Cache';
  var DB_VERSION = 2;
  var STORE_NAME = 'atlas2';
  var db = null;
  var cachedKeys = {};
  var loaded = false;
  var loadAllKeysPromise = null;
  var fetchQueue = [];
  var activeFetches = 0;
  var MAX_CONCURRENT = 6;
  var TOTAL_TILES = 36;

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (db) return resolve(db);
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = function() { reject(request.error); };
      request.onsuccess = function() { db = request.result; resolve(db); };
      request.onupgradeneeded = function(e) {
        var database = e.target.result;
        if (e.oldVersion < 2) {
          if (database.objectStoreNames.contains(STORE_NAME)) {
            database.deleteObjectStore(STORE_NAME);
          }
        }
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'tileId' });
        }
      };
    });
  }

  function getBlob(tileId) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var request = tx.objectStore(STORE_NAME).get(tileId);
        request.onsuccess = function() {
          var row = request.result;
          if (row && row.blob) { cachedKeys[tileId] = true; resolve(row.blob); }
          else resolve(null);
        };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function saveBlob(tileId, blob) {
    cachedKeys[tileId] = true;
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readwrite');
        var request = tx.objectStore(STORE_NAME).put({ tileId: tileId, blob: blob });
        request.onsuccess = function() { resolve(); };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function loadAllKeys() {
    if (loaded) return Promise.resolve();
    if (loadAllKeysPromise) return loadAllKeysPromise;
    loadAllKeysPromise = openDB().then(function(database) {
      return new Promise(function(resolve) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var request = tx.objectStore(STORE_NAME).openCursor();
        var count = 0;
        request.onsuccess = function(e) {
          var cursor = e.target.result;
          if (cursor) { cachedKeys[cursor.key] = true; count++; cursor.continue(); }
          else { loaded = true; loadAllKeysPromise = null; resolve(); }
        };
        request.onerror = function() { loaded = true; loadAllKeysPromise = null; resolve(); };
      });
    });
    return loadAllKeysPromise;
  }

  var preloadRunning = false;
  var preloadCallbacks = [];

  function preloadAll(callback) {
    if (callback) preloadCallbacks.push(callback);
    if (preloadRunning) { console.log('🗺️ [A2DEBUG] Atlas2Cache.preloadAll: already running, queued callback'); return; }
    preloadRunning = true;
    console.log('🗺️ [A2DEBUG] Atlas2Cache.preloadAll: START');

    loadAllKeys().then(function() {
      var pending = [];
      for (var i = 0; i < TOTAL_TILES; i++) {
        if (!cachedKeys[i]) pending.push(i);
      }
      console.log('🗺️ [A2DEBUG] Atlas2Cache.preloadAll: loadAllKeys done, cachedKeys count=' + Object.keys(cachedKeys).length + ', pending=' + pending.length);
      if (pending.length === 0) {
        console.log('🗺️ [A2DEBUG] Atlas2Cache.preloadAll: ALL CACHED, firing callback');
        preloadRunning = false;
        var cbs = preloadCallbacks.splice(0);
        for (var j = 0; j < cbs.length; j++) cbs[j](true);
        return;
      }
      console.log('🗺️ Atlas2Cache: Preloading', pending.length, 'tiles');
      var done = 0;
      var idx = 0;
      function next() {
        if (idx >= pending.length) {
          if (done >= pending.length) {
            console.log('🗺️ Atlas2Cache: Preload DONE, fetched', done, 'tiles');
            preloadRunning = false;
            var cbs = preloadCallbacks.splice(0);
            for (var j = 0; j < cbs.length; j++) cbs[j](true);
          }
          return;
        }
        var tileId = pending[idx++];
        fetchTile(tileId, function(blob) {
          done++;
          setTimeout(next, 0);
        });
      }
      for (var c = 0; c < MAX_CONCURRENT && c < pending.length; c++) next();
    });
  }

  function fetchTile(tileId, callback) {
    if (activeFetches >= MAX_CONCURRENT) { console.log('🗺️ [A2DEBUG] fetchTile: tileId=' + tileId + ' QUEUED (activeFetches=' + activeFetches + ')'); fetchQueue.push({ tileId: tileId, callback: callback }); return; }
    activeFetches++;
    var url = '/api/v1/world/atlas2/' + tileId;
    console.log('🗺️ [A2DEBUG] fetchTile: tileId=' + tileId + ' FETCHING from ' + url + ' (activeFetches=' + activeFetches + ')');
    fetch(url).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    }).then(function(blob) {
      activeFetches--;
      console.log('🗺️ [A2DEBUG] fetchTile: tileId=' + tileId + ' RECEIVED ' + blob.size + ' bytes');
      saveBlob(tileId, blob).catch(function() {});
      if (callback) callback(blob);
      processQueue();
    }).catch(function(err) {
      activeFetches--;
      console.log('🗺️ [A2DEBUG] fetchTile: tileId=' + tileId + ' FETCH ERROR: ' + (err.message || err));
      if (callback) callback(null);
      processQueue();
    });
  }

  function processQueue() {
    while (fetchQueue.length > 0 && activeFetches < MAX_CONCURRENT) {
      var task = fetchQueue.shift();
      fetchTile(task.tileId, task.callback);
    }
  }

  function ensureAtlas2(tileId, callback) {
    loadAllKeys().then(function() {
      console.log('🗺️ [A2DEBUG] ensureAtlas2: tileId=' + tileId + ', cachedKeys[tileId]=' + !!cachedKeys[tileId]);
      if (cachedKeys[tileId]) {
        getBlob(tileId).then(function(blob) {
          console.log('🗺️ [A2DEBUG] ensureAtlas2: tileId=' + tileId + ', getBlob returned=' + (blob ? blob.size + ' bytes' : 'NULL'));
          if (blob) callback(blob);
          else { delete cachedKeys[tileId]; console.log('🗺️ [A2DEBUG] ensureAtlas2: tileId=' + tileId + ' blob null, fetching from server'); fetchTile(tileId, callback); }
        }).catch(function(err) { console.log('🗺️ [A2DEBUG] ensureAtlas2: tileId=' + tileId + ' getBlob ERROR: ' + err.message); fetchTile(tileId, callback); });
        return;
      }
      console.log('🗺️ [A2DEBUG] ensureAtlas2: tileId=' + tileId + ' not cached, fetching from server');
      fetchTile(tileId, callback);
    });
  }

  return {
    openDB: openDB,
    ensureAtlas2: ensureAtlas2,
    getBlob: getBlob,
    saveBlob: saveBlob,
    loadAllKeys: loadAllKeys,
    preloadAll: preloadAll,
    TOTAL_TILES: TOTAL_TILES
  };
})();