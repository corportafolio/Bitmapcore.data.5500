var OrdinalswalletViewModel = {
  _listings: [],
  _floorPrice: 0,
  _totalListings: 0,
  _currentSort: 'listedAtDesc',
  _lastUpdateTime: 0,
  _isLoading: false,
  _cacheCount: 0,
  _offset: 0,
  _limit: 100,
  _hasMore: true,
  _isLoadingMore: false,
  _pollInterval: null,
  _listeners: {},

  subscribe: function(key, cb) {
    if (!OrdinalswalletViewModel._listeners[key]) OrdinalswalletViewModel._listeners[key] = [];
    OrdinalswalletViewModel._listeners[key].push(cb);
    return function() {
      OrdinalswalletViewModel._listeners[key] = OrdinalswalletViewModel._listeners[key].filter(function(x) { return x !== cb; });
    };
  },

  _emit: function(key) {
    var cbs = OrdinalswalletViewModel._listeners[key] || [];
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](); } catch(e) {}
    }
    var allCbs = OrdinalswalletViewModel._listeners['*'] || [];
    for (var j = 0; j < allCbs.length; j++) {
      try { allCbs[j](); } catch(e) {}
    }
  },

  getListings: function() {
    return OrdinalswalletViewModel._listings;
  },

  getFloorPrice: function() {
    return OrdinalswalletViewModel._floorPrice;
  },

  getTotalListings: function() {
    return OrdinalswalletViewModel._totalListings;
  },

  getCurrentSort: function() {
    return OrdinalswalletViewModel._currentSort;
  },

  getLastUpdateTime: function() {
    return OrdinalswalletViewModel._lastUpdateTime;
  },

  getIsLoading: function() {
    return OrdinalswalletViewModel._isLoading;
  },

  getCacheCount: function() {
    return OrdinalswalletViewModel._cacheCount;
  },

  getHasMore: function() {
    return OrdinalswalletViewModel._hasMore;
  },

  getIsLoadingMore: function() {
    return OrdinalswalletViewModel._isLoadingMore;
  },

  loadFromCacheOnly: function() {
    OrdinalswalletViewModel._offset = 0;
    OrdinalswalletViewModel._hasMore = true;
    OrdinalswalletViewModel._listings = [];
    OrdinalswalletViewModel._isLoading = true;
    OrdinalswalletViewModel._emit('loading');
    OrdinalswalletViewModel._loadBatch();
    OrdinalswalletViewModel.loadStats();
  },

  _loadBatch: function() {
    var self = OrdinalswalletViewModel;
    var url = '/api/v1/ordinalswallet/cache/listings?sort=' + self._currentSort + '&offset=' + self._offset + '&limit=' + self._limit;
    ApiClient.get(url, true)
      .then(function(res) {
        var items = res.data || [];
        if (self._offset === 0) {
          self._listings = items;
        } else {
          self._listings = self._listings.concat(items);
        }
        self._offset += items.length;
        self._hasMore = items.length === self._limit;
        self._cacheCount = items.length;
        self._isLoading = false;
        self._isLoadingMore = false;
        self._emit('listings');
        self._emit('loading');
      })
      .catch(function() {
        OrdinalswalletViewModel._isLoading = false;
        OrdinalswalletViewModel._isLoadingMore = false;
        OrdinalswalletViewModel._emit('loading');
      });
  },

  loadMore: function() {
    if (OrdinalswalletViewModel._isLoadingMore || !OrdinalswalletViewModel._hasMore) return;
    OrdinalswalletViewModel._isLoadingMore = true;
    OrdinalswalletViewModel._loadBatch();
  },

  loadStats: function() {
    ApiClient.get('/api/v1/ordinalswallet/cache/stats', true)
      .then(function(res) {
        OrdinalswalletViewModel._floorPrice = res.data.floorPrice || 0;
        OrdinalswalletViewModel._totalListings = res.data.totalListed || 0;
        OrdinalswalletViewModel._emit('stats');
      })
      .catch(function() {});

    ApiClient.get('/api/v1/ordinalswallet/cache/last-update', true)
      .then(function(res) {
        OrdinalswalletViewModel._lastUpdateTime = res.data.lastUpdate || 0;
        OrdinalswalletViewModel._emit('time');
      })
      .catch(function() {});

    ApiClient.get('/api/v1/ordinalswallet/cache/count', true)
      .then(function(res) {
        OrdinalswalletViewModel._cacheCount = res.data.count || 0;
        OrdinalswalletViewModel._emit('count');
      })
      .catch(function() {});
  },

  applySecondarySorting: function(listings, sortBy) {
    var sorted = listings.slice();
    switch (sortBy) {
      case 'priceAsc':
        sorted.sort(function(a, b) {
          var diff = (a.listedPrice || 0) - (b.listedPrice || 0);
          if (diff !== 0) return diff;
          return (b.listedAt || 0) - (a.listedAt || 0);
        });
        break;
      case 'priceDesc':
        sorted.sort(function(a, b) {
          var diff = (b.listedPrice || 0) - (a.listedPrice || 0);
          if (diff !== 0) return diff;
          return (b.listedAt || 0) - (a.listedAt || 0);
        });
        break;
      default:
        sorted.sort(function(a, b) {
          return (b.listedAt || 0) - (a.listedAt || 0);
        });
    }
    return sorted;
  },

  updateSortOrder: function(sortBy) {
    if (sortBy === OrdinalswalletViewModel._currentSort) return;
    OrdinalswalletViewModel._currentSort = sortBy;
    OrdinalswalletViewModel._listings = OrdinalswalletViewModel.applySecondarySorting(
      OrdinalswalletViewModel._listings, sortBy
    );
    OrdinalswalletViewModel._emit('sort');
    OrdinalswalletViewModel._emit('listings');
  },

  triggerManualRefresh: function() {
    OrdinalswalletViewModel._isLoading = true;
    OrdinalswalletViewModel._emit('loading');
    ApiClient.get('/api/v1/proxy/ordinalswallet/stats', true)
      .then(function(res) {
        var newFloor = res.data.floor_price || 0;
        var newListed = res.data.listed || 0;
        var changed = (newFloor !== OrdinalswalletViewModel._floorPrice || newListed !== OrdinalswalletViewModel._totalListings);
        if (changed) {
          return OrdinalswalletViewModel._fetchAndSaveAll().then(function() {
            OrdinalswalletViewModel._isLoading = false;
            OrdinalswalletViewModel._emit('loading');
            OrdinalswalletViewModel._emit('refresh');
          });
        } else {
          OrdinalswalletViewModel._isLoading = false;
          OrdinalswalletViewModel._emit('loading');
          OrdinalswalletViewModel._emit('stats-unchanged');
        }
      })
      .catch(function() {
        OrdinalswalletViewModel._isLoading = false;
        OrdinalswalletViewModel._emit('loading');
      });
  },

  _fetchAndSaveAll: function() {
    var listings = [];
    var promises = [];
    for (var offset = 0; offset < 300; offset += 60) {
      promises.push(
        ApiClient.get('/api/v1/proxy/ordinalswallet/listings?offset=' + offset + '&limit=60', true)
          .then(function(res) {
            var items = res.data || [];
            if (Array.isArray(items)) listings = listings.concat(items);
          })
          .catch(function() {})
      );
    }
    return Promise.all(promises).then(function() {
      return listings;
    });
  },

  startPolling: function() {
    if (OrdinalswalletViewModel._pollInterval) return;
    OrdinalswalletViewModel._pollInterval = setInterval(function() {
      OrdinalswalletViewModel.loadFromCacheOnly();
    }, 300000);
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        if (OrdinalswalletViewModel._pollInterval) {
          clearInterval(OrdinalswalletViewModel._pollInterval);
          OrdinalswalletViewModel._pollInterval = null;
        }
      } else {
        OrdinalswalletViewModel.loadFromCacheOnly();
        OrdinalswalletViewModel.startPolling();
      }
    });
  },

  stopPolling: function() {
    if (OrdinalswalletViewModel._pollInterval) {
      clearInterval(OrdinalswalletViewModel._pollInterval);
      OrdinalswalletViewModel._pollInterval = null;
    }
  }
};
