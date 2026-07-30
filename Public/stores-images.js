// CEREBRO 4: ImageViewModel — Generador y Cache de Imágenes Mondrian
// REGLA: Unico punto de acceso para generar y cachear imágenes de bloques
// REGLA: Independiente de otros cerebros (no depende de BlockViewModel, TagViewModel, ni MarketplaceViewModel)
// REGLA: Usa MondrianGenerator de utils-advanced.js (no duplica algoritmo)
// EQUIVALENTE ANDROID: Cerebro 7 (BlockImageViewModel + BlockImageCacheRepository)

var ImageViewModel = {
  _state: {
    imageCache: {},
    isGenerating: false,
    error: null,
    stats: { generated: 0, cached: 0 }
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

  getCachedSync: function(blockNumber, size, options) {
    var extra = '';
    if (options) {
      extra = '_' + (options.hash || '') + '_' + (options.totalTransactions || 0) + '_' + (options.etiquetas || '');
    }
    return this._state.imageCache[blockNumber + '_' + (size || 320) + extra] || null;
  },

  getImage: function(blockNumber, options, size) {
    var self = this;
    size = size || 320;
    var extra = options ? '_' + (options.hash || '') + '_' + (options.totalTransactions || 0) + '_' + (options.etiquetas || '') : '';
    var key = blockNumber + '_' + size + extra;
    if (self._state.imageCache[key]) {
      var s = Object.assign({}, self._state.stats);
      s.cached++;
      self._set({ stats: s });
      return Promise.resolve(self._state.imageCache[key]);
    }
    return IndexedDBCache.load('bitmapcore-images', key).then(function(dataURL) {
      if (dataURL) {
        var newCache = Object.assign({}, self._state.imageCache);
        newCache[key] = dataURL;
        var st = Object.assign({}, self._state.stats);
        st.cached++;
        self._set({ imageCache: newCache, stats: st });
        return dataURL;
      }
      return self._generateAndCache(blockNumber, options, size);
    });
  },

  generateToCanvas: function(canvas, blockNumber, options, size) {
    MondrianGenerator.generate(canvas, blockNumber, options || {}, size || 320);
    this.cacheResult(blockNumber, size || 320, canvas, options);
  },

  cacheResult: function(blockNumber, size, canvas, options) {
    var extra = options ? '_' + (options.hash || '') + '_' + (options.totalTransactions || 0) + '_' + (options.etiquetas || '') : '';
    var key = blockNumber + '_' + (size || 320) + extra;
    var dataURL = canvas.toDataURL();
    var newCache = Object.assign({}, this._state.imageCache);
    newCache[key] = dataURL;
    var s = Object.assign({}, this._state.stats);
    s.generated++;
    this._set({ imageCache: newCache, stats: s });
    IndexedDBCache.save('bitmapcore-images', key, dataURL).catch(function() {});
  },

  _generateAndCache: function(blockNumber, options, size) {
    var self = this;
    var canvas = document.createElement('canvas');
    MondrianGenerator.generate(canvas, blockNumber, options || {}, size || 320);
    var dataURL = canvas.toDataURL();
    var extra = options ? '_' + (options.hash || '') + '_' + (options.totalTransactions || 0) + '_' + (options.etiquetas || '') : '';
    var key = blockNumber + '_' + (size || 320) + extra;
    var newCache = Object.assign({}, self._state.imageCache);
    newCache[key] = dataURL;
    var s = Object.assign({}, self._state.stats);
    s.generated++;
    self._set({ imageCache: newCache, stats: s });
    IndexedDBCache.save('bitmapcore-images', key, dataURL).catch(function() {});
    return dataURL;
  },

  generateBatch: function(blockNumbers, options, size) {
    var self = this;
    self._set({ isGenerating: true });
    var promises = [];
    var seen = {};
    var extra = options ? '_' + (options.hash || '') + '_' + (options.totalTransactions || 0) + '_' + (options.etiquetas || '') : '';
    for (var i = 0; i < blockNumbers.length; i++) {
      var key = blockNumbers[i] + '_' + (size || 320) + extra;
      if (!seen[key] && !self._state.imageCache[key]) {
        seen[key] = true;
        promises.push(self.getImage(blockNumbers[i], options, size));
      }
    }
    if (promises.length === 0) {
      self._set({ isGenerating: false });
      return Promise.resolve();
    }
    return Promise.all(promises).then(function() {
      self._set({ isGenerating: false });
    }).catch(function(err) {
      self._set({ isGenerating: false, error: err.message });
    });
  },

  invalidateCache: function(blockNumber) {
    if (blockNumber !== undefined && blockNumber !== null) {
      var newCache = Object.assign({}, this._state.imageCache);
      var keys = Object.keys(newCache);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(blockNumber + '_') === 0) {
          delete newCache[keys[i]];
        }
      }
      this._set({ imageCache: newCache });
    } else {
      this._set({ imageCache: {}, stats: { generated: 0, cached: 0 } });
    }
  }
};
