var BlockCache = (function() {
  var DB_NAME = 'BitmapCoreBlockCache';
  var DB_VERSION = 2;
  var STORE_NAME = 'batches';
  var META_STORE = 'meta';
  var REFRESH_INTERVAL = 60 * 60 * 1000;
  var BATCH_SIZE = 50000;
  var TOTAL_BLOCKS = 955001;
  var TOTAL_BATCHES = Math.ceil(TOTAL_BLOCKS / BATCH_SIZE);
  var db = null;
  var isPreloading = false;
  var preloadProgress = { current: 0, total: TOTAL_BLOCKS, startBlock: 0 };
  var preloadCallback = null;

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (db) return resolve(db);
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = function() { reject(request.error); };
      request.onsuccess = function() {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = function(e) {
        var database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          var store = database.createObjectStore(STORE_NAME, { keyPath: 'batchIndex' });
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  function getBatchIndex(blockNum) {
    return Math.floor(blockNum / BATCH_SIZE);
  }

  function getBlockInBatch(blockNum, batch) {
    var localIndex = blockNum % BATCH_SIZE;
    return batch[localIndex] || null;
  }

  function getBlock(blockNum) {
    var batchIndex = getBatchIndex(blockNum);
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var request = store.get(batchIndex);
        request.onsuccess = function() {
          var batch = request.result;
          if (!batch || !batch.blocks) {
            resolve(null);
            return;
          }
          var block = getBlockInBatch(blockNum, batch.blocks);
          resolve(block);
        };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function saveBatch(batchIndex, blocks) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var request = store.put({ batchIndex: batchIndex, blocks: blocks });
        request.onsuccess = function() { resolve(); };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function saveBlocks(blocks) {
    var startIndex = blocks[0] ? getBatchIndex(blocks[0].bloque) : 0;
    return saveBatch(startIndex, blocks);
  }

  function getLastRefresh() {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(META_STORE, 'readonly');
        var store = tx.objectStore(META_STORE);
        var request = store.get('lastRefresh');
        request.onsuccess = function() {
          resolve(request.result ? request.result.value : 0);
        };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function setLastRefresh(timestamp) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(META_STORE, 'readwrite');
        var store = tx.objectStore(META_STORE);
        var request = store.put({ key: 'lastRefresh', value: timestamp });
        request.onsuccess = function() { resolve(); };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function getTotalBlocks() {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var request = store.count();
        request.onsuccess = function() {
          var batchCount = request.result;
          resolve(batchCount * BATCH_SIZE);
        };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function getCachedBatchesCount() {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var request = store.count();
        request.onsuccess = function() { resolve(request.result); };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function needsRefresh() {
    return getLastRefresh().then(function(lastRefresh) {
      return Date.now() - lastRefresh > REFRESH_INTERVAL;
    });
  }

  function preloadAll(callback) {
    if (isPreloading) return Promise.resolve();
    isPreloading = true;
    preloadCallback = callback || null;

    return getCachedBatchesCount().then(function(cachedBatchCount) {
      var cachedBlocks = cachedBatchCount * BATCH_SIZE;
      console.log('📦 BlockCache: Iniciando preload. En caché:', cachedBlocks, 'bloques');
      preloadProgress = { current: cachedBlocks, total: TOTAL_BLOCKS, startBlock: cachedBlocks };
      return preloadNextBatch();
    });
  }

  function preloadNextBatch() {
    var start = preloadProgress.current;
    if (start >= TOTAL_BLOCKS) {
      console.log('📦 BlockCache: Preload completo. Total en caché:', preloadProgress.current);
      isPreloading = false;
      setLastRefresh(Date.now());
      if (preloadCallback) preloadCallback(true);
      return Promise.resolve();
    }

    var promises = [];
    var limit = BATCH_SIZE;

    for (var i = 0; i < 5; i++) {
      var batchStart = start + i * limit;
      if (batchStart >= TOTAL_BLOCKS) break;

      promises.push(
        fetch('/api/v1/blocks/batch?start=' + batchStart + '&limit=' + limit)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (!data.success || !data.items || data.items.length === 0) {
              return { blocks: [], start: batchStart };
            }
            return { blocks: data.items, start: batchStart };
          })
          .catch(function(err) {
            console.error('📦 BlockCache: Error en batch:', err);
            return { blocks: [], start: batchStart };
          })
      );
    }

    return Promise.all(promises).then(function(results) {
      var allBlocks = [];
      var resultsToSave = [];

      results.forEach(function(result) {
        if (result.blocks && result.blocks.length > 0) {
          allBlocks = allBlocks.concat(result.blocks);
          resultsToSave.push(result);
        }
      });

      if (allBlocks.length === 0) {
        console.log('📦 BlockCache: Sin más bloques');
        isPreloading = false;
        if (preloadCallback) preloadCallback(true);
        return;
      }

      preloadProgress.current += allBlocks.length;

      return Promise.all(resultsToSave.map(function(result) {
        return saveBatch(Math.floor(result.start / BATCH_SIZE), result.blocks);
      })).then(function() {
        console.log('📦 BlockCache: Lotes guardados. Progreso:', preloadProgress.current, '/', TOTAL_BLOCKS);
        if (preloadCallback) preloadCallback(false, preloadProgress);

        if (!isPreloading) return;
        preloadNextBatch();
      });
    });
  }

  function preloadAllAtOnce(callback) {
    if (isPreloading) return Promise.resolve();
    isPreloading = true;
    preloadCallback = callback || null;

    return getCachedBatchesCount().then(function(cachedBatchCount) {
      var cachedBlocks = cachedBatchCount * BATCH_SIZE;
      console.log('📦 BlockCache: Descarga completa de', TOTAL_BLOCKS, 'bloques...');
      preloadProgress = { current: cachedBlocks, total: TOTAL_BLOCKS, startBlock: cachedBlocks };

      return fetch('/api/v1/blocks/batch?start=' + cachedBlocks + '&limit=' + (TOTAL_BLOCKS - cachedBlocks))
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.success || !data.items || data.items.length === 0) {
            console.log('📦 BlockCache: Sin más bloques');
            isPreloading = false;
            if (preloadCallback) preloadCallback(true);
            return;
          }

          var blocks = data.items;
          console.log('📦 BlockCache: Recibidos', blocks.length, 'bloques en 1 request');

          return Promise.all(
            Array.from({ length: Math.ceil(blocks.length / BATCH_SIZE) }, function(_, i) {
              var start = i * BATCH_SIZE;
              var batchBlocks = blocks.slice(start, start + BATCH_SIZE);
              var batchIndex = Math.floor((cachedBlocks + start) / BATCH_SIZE);
              return saveBatch(batchIndex, batchBlocks);
            })
          ).then(function() {
            preloadProgress.current = TOTAL_BLOCKS;
            console.log('📦 BlockCache: Preload completo. Total en caché:', TOTAL_BLOCKS);
            isPreloading = false;
            setLastRefresh(Date.now());
            if (preloadCallback) preloadCallback(true);
          });
        })
        .catch(function(err) {
          console.error('📦 BlockCache: Error en preloadAllAtOnce:', err);
          isPreloading = false;
          if (preloadCallback) preloadCallback(false, preloadProgress, err);
        });
    });
  }

  function getPreloadProgress() {
    return preloadProgress;
  }

  function isPreloadingActive() {
    return isPreloading;
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
    saveBlock: saveBlock,
    saveBlocks: saveBlocks,
    getLastRefresh: getLastRefresh,
    setLastRefresh: setLastRefresh,
    getTotalBlocks: getTotalBlocks,
    needsRefresh: needsRefresh,
    preloadAll: preloadAll,
    preloadAllAtOnce: preloadAllAtOnce,
    getPreloadProgress: getPreloadProgress,
    isPreloadingActive: isPreloadingActive,
    clearCache: clearCache,
    BATCH_SIZE: BATCH_SIZE,
    REFRESH_INTERVAL: REFRESH_INTERVAL
  };
})();