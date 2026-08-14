var SelectorScreenViewModel = {
  _listeners: [],

  subscribe: function(fn) {
    this._listeners.push(fn);
    return function() {
      var idx = this._listeners.indexOf(fn);
      if (idx !== -1) this._listeners.splice(idx, 1);
    }.bind(this);
  },

  notify: function() {
    var self = this;
    this._listeners.forEach(function(fn) { fn(); });
  },

  loadAllMarketplaces: function() {
    StoreMarketplaces.fetchOrdinalswallet();
    StoreMarketplaces.fetchUnisat();
    StoreMarketplaces.fetchLocal();
    StoreMarketplaces.fetchUnified();
    StoreMarketplaces.fetchDescuentos();
    StoreMarketplaces.fetchTags();
    StoreMarketplaces.fetchSales();
  },

  getMarketplaceData: function(id) {
    var store = StoreMarketplaces.get(id);
    if (!store) return { listings: 0, floorPrice: 0, sold: 0, previews: [] };

    switch (id) {
      case 'ordinalswallet':
      case 'unisat':
      case 'local':
        return {
          listings: store.listings ? store.listings.length : 0,
          floorPrice: store.floorPrice || 0,
          sold: store.soldCount || 0,
          previews: (store.listings || []).slice(0, 14).map(function(l) {
            return { blockNumber: l.blockNumber || l.metaNumber, listedPrice: l.listedPrice, source: id, etiquetas: l.etiquetas || '', hash: l.hash || '', totalTransacciones: l.totalTransacciones || 0 };
          })
        };
      case 'unified':
        return {
          listings: store.allListings ? store.allListings.length : 0,
          floorPrice: 0,
          sold: 0,
          previews: (store.allListings || []).slice(0, 14).map(function(l) {
            return { blockNumber: l.metaNumber, listedPrice: l.listedPrice, source: l.source, etiquetas: l.etiquetas || '', hash: l.hash || '', totalTransacciones: l.totalTransacciones || 0 };
          })
        };
      case 'tags':
        return {
          listings: store.tags ? store.tags.length : 0,
          floorPrice: 0,
          sold: 0,
          previews: (store.tags || []).slice(0, 4).map(function(t) {
            return { blockNumber: t.count || 0, listedPrice: 0, tagName: t.name };
          })
        };
      case 'sales':
        return {
          listings: store.sales ? store.sales.length : 0,
          floorPrice: 0,
          sold: store.totalSold || 0,
          previews: (store.sales || []).slice(0, 14).map(function(s) {
            return { blockNumber: s.bitmapNumber, listedPrice: s.listedPrice, etiquetas: s.etiquetas || '', hash: s.hash || '', totalTransacciones: s.totalTransacciones || 0 };
          })
        };
      case 'discounts':
        return {
          listings: store.discounts ? store.discounts.length : 0,
          floorPrice: 0,
          sold: 0,
          previews: (store.discounts || []).slice(0, 14).map(function(d) {
            return { blockNumber: d.bitmapNumber, listedPrice: d.listedPrice, discountPercentage: d.discountPercentage, etiquetas: d.etiquetas || '', hash: d.hash || '', totalTransacciones: d.totalTransacciones || 0 };
          })
        };
      default:
        return { listings: 0, floorPrice: 0, sold: 0, previews: [] };
    }
  }
};
