// CEREBRO 1: BlockViewModel — Dueño Exclusivo de Tabla 1 (blocks)
// REGLA: SOLO este store puede acceder a /api/v1/blocks/...
// NINGUN otro store/componente puede hacer fetch directo a blocks.

var BlockViewModel = {
  _state: {
    currentBlock: null,
    cache: {},           // cache[blockNumber] = blockEntity
    searchCache: {},     // cache[query] = results
    tagBlocksCache: {},  // cache[tagName] = [blockNumbers]
    minMax: null,        // { min: 0, max: 999999 }
    totalCount: null,    // total de bloques
    isLoading: false,
    error: null
  },
  _listeners: new Set(),

  getState: function() {
    return Object.assign({}, this._state);
  },

  subscribe: function(fn) {
    this._listeners.add(fn);
    var self = this;
    return function() { self._listeners.delete(fn); };
  },

  _notify: function() {
    var state = this.getState();
    this._listeners.forEach(function(fn) { fn(state); });
  },

  _set: function(partial) {
    Object.assign(this._state, partial);
    this._notify();
  },

  // ===== METODOS PUBLICOS =====

  // Obtener un bloque por numero (usa cache)
  getBlock: function(blockNumber) {
    var self = this;
    var num = parseInt(blockNumber);
    if (isNaN(num)) return Promise.resolve(null);

    // Cache hit
    if (self._state.cache[num]) {
      return Promise.resolve(self._state.cache[num]);
    }

    self._set({ isLoading: true, error: null });

    return ApiClient.get('/api/v1/blocks/' + num, true)
      .then(function(res) {
        var block = res.data || res;
        if (!block) return null;
        // Normalizar campos
        if (block.bloque !== undefined) {
          block.blockNumber = block.bloque;
          block.txCount = block.totalTransacciones;
        }
        // Guardar en cache
        var newCache = Object.assign({}, self._state.cache);
        newCache[num] = block;
        self._set({ cache: newCache, isLoading: false, currentBlock: block });
        return block;
      })
      .catch(function(err) {
        self._set({ isLoading: false, error: err.message });
        return null;
      });
  },

  // Buscar bloques por query (numero o texto)
  searchBlocks: function(query) {
    var self = this;
    if (!query || !query.trim()) return Promise.resolve([]);

    // Cache hit
    if (self._state.searchCache[query]) {
      return Promise.resolve(self._state.searchCache[query]);
    }

    self._set({ isLoading: true });

    return ApiClient.get('/api/v1/blocks/search?q=' + encodeURIComponent(query), true)
      .then(function(res) {
        var items = res.data || res;
        if (!Array.isArray(items)) items = [];
        var newCache = Object.assign({}, self._state.searchCache);
        newCache[query] = items;
        self._set({ searchCache: newCache, isLoading: false });
        return items;
      })
      .catch(function(err) {
        self._set({ isLoading: false, error: err.message });
        return [];
      });
  },

  // Obtener bloques paginados
  getBlocks: function(page, limit) {
    var self = this;
    page = page || 1;
    limit = limit || 20;

    return ApiClient.get('/api/v1/blocks?page=' + page + '&limit=' + limit, true)
      .then(function(res) {
        return res.data || res;
      })
      .catch(function() { return { items: [], total: 0 }; });
  },

  // Obtener bloques por etiqueta (via API de tags)
  getBlocksByTag: function(tagName, limit) {
    var self = this;
    limit = limit || 50;

    return ApiClient.get('/api/v1/tags/' + encodeURIComponent(tagName), true)
      .then(function(res) {
        var blocks = res.data || res;
        if (!Array.isArray(blocks)) blocks = [];
        return blocks.slice(0, limit);
      })
      .catch(function() { return []; });
  },

  // Buscar bloques por hash
  getBlocksByHashPrefix: function(hashPrefix) {
    return this.searchBlocks(hashPrefix);
  },

  // Buscar bloques por rango de transacciones
  getBlocksByTxRange: function(minTx, maxTx) {
    var self = this;
    var query = minTx + '-' + maxTx;

    if (self._state.searchCache['tx_' + query]) {
      return Promise.resolve(self._state.searchCache['tx_' + query]);
    }

    return ApiClient.get('/api/v1/blocks/search?q=' + encodeURIComponent(query), true)
      .then(function(res) {
        var items = res.data || res;
        if (!Array.isArray(items)) items = [];
        var newCache = Object.assign({}, self._state.searchCache);
        newCache['tx_' + query] = items;
        self._set({ searchCache: newCache });
        return items;
      })
      .catch(function() { return []; });
  },

  // Buscar bloques por rango de bloques
  getBlocksByBlockRange: function(minBlock, maxBlock) {
    var self = this;
    var results = [];
    var promises = [];

    for (var i = minBlock; i <= Math.min(maxBlock, minBlock + 50); i++) {
      promises.push(this.getBlock(i).then(function(block) {
        if (block) results.push(block);
      }));
    }

    return Promise.all(promises).then(function() { return results; });
  },

  // Contar total de bloques
  getBlockCount: function() {
    var self = this;
    if (self._state.totalCount !== null) {
      return Promise.resolve(self._state.totalCount);
    }

    return ApiClient.get('/api/v1/blocks?page=1&limit=1', true)
      .then(function(res) {
        var data = res.data || res;
        var total = data.total || 0;
        self._set({ totalCount: total });
        return total;
      })
      .catch(function() { return 0; });
  },

  // Obtener min/max de bloques
  getMinMaxBlock: function() {
    var self = this;
    if (self._state.minMax) {
      return Promise.resolve(self._state.minMax);
    }

    return ApiClient.get('/api/v1/blocks?page=1&limit=1', true)
      .then(function(res) {
        var data = res.data || res;
        var total = data.total || 0;
        var minMax = { min: 0, max: total - 1 };
        self._set({ minMax: minMax });
        return minMax;
      })
      .catch(function() { return { min: 0, max: 0 }; });
  },

  // Invalidar todo el cache
  invalidateCache: function() {
    this._set({
      cache: {},
      searchCache: {},
      tagBlocksCache: {},
      currentBlock: null,
      minMax: null,
      totalCount: null
    });
  },

  // Limpiar cache de busqueda (no cache de bloques individuales)
  invalidateSearchCache: function() {
    this._set({ searchCache: {} });
  }
};
