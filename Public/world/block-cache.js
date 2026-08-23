var BlockCache = (function() {
  var DB_NAME = 'BitmapCoreBlockCache';
  var DB_VERSION = 1;
  var STORE_NAME = 'blocks';
  var META_STORE = 'meta';
  var REFRESH_INTERVAL = 60 * 60 * 1000;
  var BATCH_SIZE = 1000;
  var db = null;
  var isPreloading = false;
  var preloadProgress = { current: 0, total: 0, startBlock: 0 };
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
          var store = database.createObjectStore(STORE_NAME, { keyPath: 'bloque' });
          store.createIndex('bloque', 'bloque', { unique: true });
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  function getBlock(blockNum) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var request = store.get(blockNum);
        request.onsuccess = function() { resolve(request.result || null); };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function saveBlock(blockData) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var request = store.put(blockData);
        request.onsuccess = function() { resolve(); };
        request.onerror = function() { reject(request.error); };
      });
    });
  }

  function saveBlocks(blocks) {
    return openDB().then(function(database) {
      return new Promise(function(resolve, reject) {
        var tx = database.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var count = 0;
        blocks.forEach(function(block) {
          var request = store.put(block);
          request.onsuccess = function() {
            count++;
            if (count === blocks.length) resolve();
          };
          request.onerror = function() { reject(request.error); };
        });
      });
    });
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

    return getTotalBlocks().then(function(cachedCount) {
      console.log('📦 BlockCache: Iniciando preload. En caché:', cachedCount, 'bloques');
      preloadProgress = { current: cachedCount, total: 955001, startBlock: cachedCount };
      return preloadNextBatch();
    });
  }

  function preloadNextBatch() {
    var start = preloadProgress.current;
    if (start >= 955001) {
      console.log('📦 BlockCache: Preload completo. Total en caché:', preloadProgress.current);
      isPreloading = false;
      setLastRefresh(Date.now());
      if (preloadCallback) preloadCallback(true);
      return Promise.resolve();
    }

    var limit = BATCH_SIZE;
    console.log('📦 BlockCache: Descargando lote', start, '-', start + limit - 1);

    return fetch('/api/v1/blocks/batch?start=' + start + '&limit=' + limit)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.success || !data.items || data.items.length === 0) {
          console.log('📦 BlockCache: Sin más bloques');
          isPreloading = false;
          if (preloadCallback) preloadCallback(true);
          return;
        }

        var blocks = data.items;
        preloadProgress.current += blocks.length;
        preloadProgress.startBlock = start;

        return saveBlocks(blocks).then(function() {
          console.log('📦 BlockCache: Lote guardado. Progreso:', preloadProgress.current, '/', 955001);

          if (preloadCallback) preloadCallback(false, preloadProgress);

          setTimeout(preloadNextBatch, 200);
        });
      })
      .catch(function(err) {
        console.error('📦 BlockCache: Error en preload:', err);
        isPreloading = false;
        if (preloadCallback) preloadCallback(false, preloadProgress, err);
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
    getPreloadProgress: getPreloadProgress,
    isPreloadingActive: isPreloadingActive,
    clearCache: clearCache,
    BATCH_SIZE: BATCH_SIZE,
    REFRESH_INTERVAL: REFRESH_INTERVAL
  };
})();