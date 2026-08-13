// CEREBRO: ListedTagViewModel
// Dueño de la agrupación de etiquetas de los LISTINGS unificados
// Fuente de datos: UnifiedViewModel (cerebro de unificados)
// Regla: solo agrupa bloques que están LISTADOS en unificados (3 marketplaces),
// no usa bloques que no estén en unified.

var ListedTagViewModel = {
  _state: {
    tagGroups: [],
    isLoading: false,
    error: null,
    lastUpdated: 0
  },
  _listeners: new Set(),

  subscribe: function(cb) {
    ListedTagViewModel._listeners.add(cb);
    return function() { ListedTagViewModel._listeners.delete(cb); };
  },

  _notify: function() {
    ListedTagViewModel._listeners.forEach(function(cb) {
      try { cb(); } catch (e) {}
    });
  },

  getTagGroups: function() { return ListedTagViewModel._state.tagGroups; },
  getIsLoading: function() { return ListedTagViewModel._state.isLoading; },
  getLastUpdated: function() { return ListedTagViewModel._state.lastUpdated; },

  loadTagGroups: function() {
    ListedTagViewModel._state.isLoading = true;
    ListedTagViewModel._notify();
    return ApiClient.get('/api/v1/unified/cache/tags', true)
      .then(function(res) {
        ListedTagViewModel._state.tagGroups = (res && res.data) || [];
        ListedTagViewModel._state.isLoading = false;
        ListedTagViewModel._state.lastUpdated = Date.now();
        ListedTagViewModel._notify();
        return ListedTagViewModel._state.tagGroups;
      })
      .catch(function(err) {
        ListedTagViewModel._state.isLoading = false;
        ListedTagViewModel._state.error = err;
        ListedTagViewModel._notify();
        return [];
      });
  },

  // Listings completos de una etiqueta con filtro por marketplace
  getTagListings: function(tagName, source, offset, limit) {
    var q = '/api/v1/unified/cache/tags/' + encodeURIComponent(tagName) + '?offset=' + (offset || 0) + '&limit=' + (limit || 100);
    if (source && source !== 'all') q += '&source=' + encodeURIComponent(source);
    return ApiClient.get(q, true)
      .then(function(res) {
        return (res && res.data) || { items: [], total: 0 };
      })
      .catch(function() {
        return { items: [], total: 0 };
      });
  },

  // Agrupación local de emergencia usando listings ya cargados en UnifiedViewModel
  buildFromUnifiedListings: function() {
    var listings = UnifiedViewModel.getListings() || [];
    var groups = {};
    listings.forEach(function(item) {
      var etiquetas = item.etiquetas || '';
      var tags = etiquetas.split('|').map(function(t) { return t.trim(); }).filter(function(t) { return t !== ''; });
      tags.forEach(function(tag) {
        if (!groups[tag]) groups[tag] = { tagName: tag, count: 0, previews: [] };
        groups[tag].count++;
        if (groups[tag].previews.length < 6) groups[tag].previews.push(item);
      });
    });
    var result = Object.keys(groups).map(function(k) { return groups[k]; });
    result.sort(function(a, b) { return b.count - a.count; });
    ListedTagViewModel._state.tagGroups = result;
    ListedTagViewModel._notify();
    return result;
  }
};
