var SelectorScreenViewModel = {
  _listeners: [],
  _data: {
    ordinalswallet: { totalListings: 0, floorPrice: 0, previews: [] },
    unisat: { totalListings: 0, floorPrice: 0, previews: [] },
    local: { totalListings: 0, floorPrice: 0, previews: [] },
    unified: { totalListings: 0, floorPrice: 0, previews: [] },
    discounts: { totalListings: 0, floorPrice: 0, previews: [] },
    tags: { totalListings: 0, floorPrice: 0, previews: [] },
    sales: { totalListings: 0, floorPrice: 0, previews: [], salesStats: null }
  },

  subscribe: function(fn) {
    this._listeners.push(fn);
    return function() {
      var idx = this._listeners.indexOf(fn);
      if (idx !== -1) this._listeners.splice(idx, 1);
    }.bind(this);
  },

  notify: function() {
    this._listeners.forEach(function(fn) { fn(); });
  },

  _mapListing: function(l, source) {
    var bn = l.blockNumber || l.bitmapNumber || l.bitmap_number || l.metaNumber || 0;
    return {
      blockNumber: bn,
      listedPrice: l.listedPrice || l.price || 0,
      source: source,
      etiquetas: l.etiquetas || '',
      hash: l.hash || '',
      totalTransacciones: l.totalTransacciones || 0
    };
  },

  loadAllMarketplaces: function(pageSize) {
    var self = this;
    var ps = pageSize || 12;

    function sortByPrice(arr) {
      return arr.slice().sort(function(a, b) { return (a.listedPrice || 0) - (b.listedPrice || 0); });
    }

    self._fetchOrdinalswallet(ps, sortByPrice);
    self._fetchUnisat(ps, sortByPrice);
    self._fetchUnified(ps, sortByPrice);
    self._fetchLocal();
    self._fetchDescuentos();
    self._fetchTags();
    self._fetchSales();
  },

  _fetchOrdinalswallet: function(ps, sortByPrice) {
    var self = this;
    fetch('/api/v1/ordinalswallet/cache/listings?sort=priceAsc&offset=0&limit=' + ps).then(function(r) { return r.json(); }).then(function(res) {
      var items = res.data || [];
      var previews = sortByPrice(items.map(function(l) { return self._mapListing(l, 'ordinalswallet'); }));
      fetch('/api/v1/ordinalswallet/cache/stats').then(function(r2) { return r2.json(); }).then(function(st) {
        var sd = st.data || {};
        self._data.ordinalswallet = {
          totalListings: sd.totalListed || 0,
          floorPrice: sd.floorPrice || 0,
          previews: previews
        };
        self.notify();
      }).catch(function() {
        self._data.ordinalswallet = {
          totalListings: 0,
          floorPrice: 0,
          previews: previews
        };
        self.notify();
      });
    }).catch(function() {});
  },

  _fetchUnisat: function(ps, sortByPrice) {
    var self = this;
    fetch('/api/v1/unisat/cache/listings?sort=priceAsc&offset=0&limit=' + ps).then(function(r) { return r.json(); }).then(function(res) {
      var items = res.data || [];
      var previews = sortByPrice(items.map(function(l) { return self._mapListing(l, 'unisat'); }));
      fetch('/api/v1/unisat/cache/stats').then(function(r2) { return r2.json(); }).then(function(st) {
        var sd = st.data || {};
        self._data.unisat = {
          totalListings: sd.totalListed || items.length,
          floorPrice: sd.floorPrice || 0,
          previews: previews
        };
        self.notify();
      }).catch(function() {
        self._data.unisat = {
          totalListings: items.length,
          floorPrice: 0,
          previews: previews
        };
        self.notify();
      });
    }).catch(function() {});
  },

  _fetchUnified: function(ps, sortByPrice) {
    var self = this;
    fetch('/api/v1/unified/cache/listings?sort=priceAsc&offset=0&limit=' + ps).then(function(r) { return r.json(); }).then(function(res) {
      var items = res.data || [];
      var previews = sortByPrice(items.map(function(l) { return self._mapListing(l, l.source || 'unified'); }));
      var prices = items.map(function(l) { return l.listedPrice || 0; }).filter(function(p) { return p > 0; });
      var floor = prices.length > 0 ? Math.min.apply(null, prices) : 0;
      fetch('/api/v1/unified/cache/count').then(function(r2) { return r2.json(); }).then(function(ct) {
        self._data.unified = {
          totalListings: (ct.data || {}).count || items.length,
          floorPrice: floor,
          previews: previews
        };
        self.notify();
      }).catch(function() {
        self._data.unified = {
          totalListings: items.length,
          floorPrice: floor,
          previews: previews
        };
        self.notify();
      });
    }).catch(function() {});
  },

  _fetchLocal: function() {
    var self = this;
    fetch('/api/v1/local/cache/listings?limit=100').then(function(r) { return r.json(); }).then(function(res) {
      var items = res.data || [];
      var prices = items.map(function(l) { return l.listedPrice || l.price || 0; }).filter(function(p) { return p > 0; });
      self._data.local = {
        totalListings: items.length,
        floorPrice: prices.length > 0 ? Math.min.apply(null, prices) : 0,
        previews: items.map(function(l) { return self._mapListing(l, 'local'); }).sort(function(a, b) { return (a.listedPrice || 0) - (b.listedPrice || 0); })
      };
      self.notify();
    }).catch(function() {});
  },

  _fetchDescuentos: function() {
    var self = this;
    fetch('/api/v1/descuentos').then(function(r) { return r.json(); }).then(function(res) {
      var groups = res.data || [];
      var totalItems = 0;
      var minFloor = 0;
      var allItems = [];
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        totalItems += g.totalItems || 0;
        if (g.floorPrice > 0 && (minFloor === 0 || g.floorPrice < minFloor)) minFloor = g.floorPrice;
        if (g.floorItems && g.floorItems.length) {
          for (var j = 0; j < g.floorItems.length; j++) {
            var fi = g.floorItems[j];
            allItems.push({
              blockNumber: fi.bitmapNumber || fi.blockNumber || 0,
              listedPrice: fi.listedPrice || fi.price || 0,
              source: 'descuentos',
              etiquetas: g.tagName || fi.etiquetas || '',
              hash: fi.hash || '',
              totalTransacciones: fi.totalTransacciones || 0,
              discountPercentage: g.discountPercentage || 0
            });
          }
        }
      }
      allItems.sort(function(a, b) { return (b.discountPercentage || 0) - (a.discountPercentage || 0); });
      self._data.discounts = {
        totalListings: totalItems,
        floorPrice: minFloor,
        previews: allItems
      };
      self.notify();
    }).catch(function() {});
  },

  _fetchTags: function() {
    var self = this;
    fetch('/api/v1/unified/cache/tags').then(function(r) { return r.json(); }).then(function(res) {
      var tags = res.data || [];
      var previews = tags.map(function(t) {
        return {
          tagName: t.tagName,
          count: t.count || 0,
          floorPrice: t.floorPrice || 0
        };
      });
      var totalTags = tags.length;
      var totalItems = tags.reduce(function(sum, t) { return sum + (t.count || 0); }, 0);
      var minFloor = tags.reduce(function(min, t) {
        var fp = t.floorPrice || 0;
        return (fp > 0 && (min === 0 || fp < min)) ? fp : min;
      }, 0);
      self._data.tags = {
        totalListings: totalItems,
        floorPrice: minFloor,
        previews: previews
      };
      self.notify();
    }).catch(function() {});
  },

  _fetchSales: function() {
    var self = this;
    fetch('/api/v1/sales/history?days=30&limit=500').then(function(r) { return r.json(); }).then(function(res) {
      var raw = res.data || {};
      var items = raw.items || [];
      var previews = items.map(function(s) {
        return {
          blockNumber: s.bitmap_number || s.bitmapNumber || 0,
          listedPrice: s.price || s.listedPrice || 0,
          source: s.source || 'sales',
          etiquetas: s.etiquetas || '',
          hash: s.hash || '',
          totalTransacciones: s.totalTransacciones || 0
        };
      });
      fetch('/api/v1/sales/stats').then(function(r2) { return r2.json(); }).then(function(st) {
        self._data.sales = {
          totalListings: raw.total || items.length,
          floorPrice: 0,
          previews: previews,
          salesStats: st.data || null
        };
        self.notify();
      }).catch(function() {
        self._data.sales = {
          totalListings: raw.total || items.length,
          floorPrice: 0,
          previews: previews,
          salesStats: null
        };
        self.notify();
      });
    }).catch(function() {});
  },

  loadNextPreviews: function(id, pageSize) {
    var self = this;
    var d = this._data[id];
    if (!d) return;

    var currentLen = d.previews.length;
    var total = d.totalListings;
    if (currentLen >= total) return;

    var sortParam = (id === 'ordinalswallet' || id === 'unisat' || id === 'unified')
      ? '&sort=priceAsc' : '';

    var endpointMap = {
      ordinalswallet: '/api/v1/ordinalswallet/cache/listings',
      unisat: '/api/v1/unisat/cache/listings',
      unified: '/api/v1/unified/cache/listings'
    };
    var endpoint = endpointMap[id];
    if (!endpoint) return;

    fetch(endpoint + '?offset=' + currentLen + '&limit=' + pageSize + sortParam)
      .then(function(r) { return r.json(); })
      .then(function(res) {
        var items = res.data || [];
        var newItems = items.map(function(l) { return self._mapListing(l, id); });
        d.previews = d.previews.concat(newItems);
        self.notify();
      }).catch(function() {});
  },

  getMarketplaceData: function(id) {
    return this._data[id] || { totalListings: 0, floorPrice: 0, previews: [], salesStats: null };
  }
};
