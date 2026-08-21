// CEREBRO 2: TagViewModel — Dueño de Etiquetas y Clasificacion
// REGLA: Este store NO accede a /api/v1/blocks/ directamente
// USA BlockViewModel.getBlock() para enriquecer datos de bloques

var TagViewModel = {
  _state: {
    allTags: [],
    tagCounts: {},
    tagPreviews: {},
    tagBlocksCache: {},
    _originalTagOrder: [],
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

  // Orden TotalTablas exacto (Android) — 56 tablas de arriba a abajo
  _TOTALTABLAS_ORDER: [
    "txS millonarias",
    "TXs MULTIMILLONARIAS",
    "100k out",
    "250k out",
    "500k out",
    "1M out",
    "2M out",
    "3M out",
    "5M out",
    "21e8",
    "2 tx GRID",
    "3 tx GRID",
    "4 tx GRID",
    "6 tx GRID",
    "9 tx GRID",
    "Grid Punk",
    "5 tx Grid Punk",
    "Punk GRID 10 tx",
    "Giga Punk GRID",
    "Palindrome",
    "Palindrome PERFECT",
    "microstrategy",
    "Wide Neck Punk",
    "Standar Punk",
    "Pristine Punk",
    "Punk 2tx",
    "8000 tx",
    "7000 tx",
    "6000 tx",
    "5000 tx",
    "4000 tx",
    "3000 tx",
    "2000 tx",
    "1000 tx",
    "1 tx",
    "2 tx",
    "sub 100k",
    "sub 50k",
    "sub 25k",
    "sub 10k",
    "sub 1k",
    "power of 10",
    "mythic",
    "epic",
    "rare",
    "first transaction",
    "pizza transaction",
    "block 9",
    "block 78",
    "66 dao",
    "prime number",
    "fibonacci",
    "binary",
    "chinese lucky number",
    "pizza day",
    "leap day"
  ],

  // ===== METODOS PUBLICOS =====

  // Cargar todos los nombres de tags (56 tablas)
  loadAllTagNames: function() {
    var self = this;
    
    // Si ya tenemos _originalTagOrder poblado, solo retornar allTags (cache hit completo)
    if (self._state.allTags.length > 0 && self._state._originalTagOrder.length > 0) {
      return Promise.resolve(self._state.allTags);
    }

    self._set({ isLoading: true });

    return ApiClient.get('/api/v1/tags', true)
      .then(function(res) {
        var tags = res.data || res;
        if (!Array.isArray(tags)) tags = [];

        var names = tags.map(function(t) {
          return t.tagName || t.name || t;
        }).filter(function(n) { return n && n !== ''; });

        // Usar orden de TotalTablas (fuente de verdad) para sort "original"
        var totalTablasOrder = self._TOTALTABLAS_ORDER || [];
        self._state._originalTagOrder = totalTablasOrder.filter(function(n) {
          return names.indexOf(n) !== -1;
        });

        // Ordenar alfabeticamente para allTags (compatibilidad)
        names.sort();

        self._set({ allTags: names, isLoading: false });
        return names;
      })
      .catch(function(err) {
        self._set({ isLoading: false, error: err.message });
        return [];
      });
  },

  // Cargar conteos de todas las tags
  loadTagCounts: function() {
    var self = this;
    if (Object.keys(self._state.tagCounts).length > 0) {
      return Promise.resolve(self._state.tagCounts);
    }

    return ApiClient.get('/api/v1/tags', true)
      .then(function(res) {
        var tags = res.data || res;
        if (!Array.isArray(tags)) tags = [];

        var counts = {};
        tags.forEach(function(t) {
          if (t.tagName && t.count !== undefined) {
            counts[t.tagName] = parseInt(t.count);
          }
        });

        self._set({ tagCounts: counts });
        return counts;
      })
      .catch(function() { return {}; });
  },

  // Cargar preview (primer bloque) de un tag para Mondrian
  loadTagPreview: function(tagName) {
    var self = this;
    if (self._state.tagPreviews[tagName]) {
      return Promise.resolve(self._state.tagPreviews[tagName]);
    }

    return ApiClient.get('/api/v1/tags/' + encodeURIComponent(tagName) + '/preview', true)
      .then(function(res) {
        var block = res.data || res;
        if (!block || block.bloque === undefined) return null;

        block.blockNumber = block.bloque;
        block.txCount = parseInt(block.totalTransacciones) || 0;
        block.totalTransactions = parseInt(block.totalTransacciones) || 0;
        block.hash = block.hash || '';
        block.etiquetas = block.etiquetas || '';
        block.isPerfect = (block.etiquetas || '').toLowerCase().indexOf('grid') !== -1;
        block.isPunk = (block.etiquetas || '').toLowerCase().indexOf('punk') !== -1;
        block.totalEtiquetas = block.totalEtiquetas || 0;
        block.totalBloquesUnicos = block.totalBloquesUnicos || 0;

        var newPreviews = Object.assign({}, self._state.tagPreviews);
        newPreviews[tagName] = block;
        self._set({ tagPreviews: newPreviews });
        return block;
      })
      .catch(function() { return null; });
  },

  // Cargar bloques completos de un tag (paginado, con datos completos)
  loadTagBlocks: function(tagName, page, limit) {
    var self = this;
    page = page || 1;
    limit = limit || 100;
    var offset = (page - 1) * limit;

    var cacheKey = tagName + '_page' + page;
    if (self._state.tagBlocksCache[cacheKey]) {
      return Promise.resolve(self._state.tagBlocksCache[cacheKey]);
    }

    return ApiClient.get('/api/v1/tags/' + encodeURIComponent(tagName) + '?limit=' + limit + '&offset=' + offset, true)
      .then(function(res) {
        var blocks = res.data || res;
        if (!Array.isArray(blocks)) blocks = [];

        var normalized = blocks.map(function(b) {
          return {
            blockNumber: b.bloque || b.blockNumber,
            etiquetas: b.etiquetas || '',
            totalBtc: parseFloat(b.totalBtc || b.total_btc) || 0,
            totalTransactions: parseInt(b.totalTransacciones) || 0,
            hash: b.hash || '',
            mempool: b.mempool || false
          };
        });

        var newCache = Object.assign({}, self._state.tagBlocksCache);
        newCache[cacheKey] = normalized;
        self._set({ tagBlocksCache: newCache });
        return normalized;
      })
      .catch(function() { return []; });
  },

  // Obtener conteo de un tag
  getTagCount: function(tagName) {
    var count = this._state.tagCounts[tagName];
    if (count !== undefined) return Promise.resolve(count);

    return this.loadTagCounts().then(function() {
      return this._state.tagCounts[tagName] || 0;
    }.bind(this));
  },

  // Buscar tags por nombre (filtro local)
  searchTags: function(query) {
    var self = this;
    if (!query || !query.trim()) return Promise.resolve(self._state.allTags);

    var q = query.toLowerCase();
    return Promise.resolve(self._state.allTags.filter(function(tag) {
      return tag.toLowerCase().indexOf(q) !== -1;
    }));
  },

  // Cargar tags con previews (para PantallaDeTablas)
  loadTagsWithPreviews: function() {
    var self = this;
    // Primero cargar conteos para que count sea correcto
    return self.loadTagCounts().then(function() {
      return self.loadAllTagNames().then(function(names) {
        // Usar orden original de la API (TotalTablas order) en lugar de alfabetico
        var orderedNames = self._state._originalTagOrder && self._state._originalTagOrder.length > 0
          ? self._state._originalTagOrder
          : names;
        var promises = orderedNames.map(function(name) {
          return self.loadTagPreview(name).then(function(preview) {
            return { name: name, preview: preview, count: self._state.tagCounts[name] || 0 };
          });
        });
        return Promise.all(promises);
      });
    });
  },

  // Invalidar cache
  invalidateCache: function() {
    this._set({
      allTags: [],
      tagCounts: {},
      tagPreviews: {},
      tagBlocksCache: {},
      _originalTagOrder: []
    });
  }
};