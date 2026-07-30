var UnisatViewModel = {
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
    if (!UnisatViewModel._listeners[key]) UnisatViewModel._listeners[key] = [];
    UnisatViewModel._listeners[key].push(cb);
    return function() {
      UnisatViewModel._listeners[key] = UnisatViewModel._listeners[key].filter(function(x) { return x !== cb; });
    };
  },

  _emit: function(key) {
    var cbs = UnisatViewModel._listeners[key] || [];
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](); } catch(e) {}
    }
    var allCbs = UnisatViewModel._listeners['*'] || [];
    for (var j = 0; j < allCbs.length; j++) {
      try { allCbs[j](); } catch(e) {}
    }
  },

  getListings: function() {
    return UnisatViewModel._listings;
  },

  getFloorPrice: function() {
    return UnisatViewModel._floorPrice;
  },

  getTotalListings: function() {
    return UnisatViewModel._totalListings;
  },

  getCurrentSort: function() {
    return UnisatViewModel._currentSort;
  },

  getLastUpdateTime: function() {
    return UnisatViewModel._lastUpdateTime;
  },

  getIsLoading: function() {
    return UnisatViewModel._isLoading;
  },

  getCacheCount: function() {
    return UnisatViewModel._cacheCount;
  },

  getHasMore: function() {
    return UnisatViewModel._hasMore;
  },

  getIsLoadingMore: function() {
    return UnisatViewModel._isLoadingMore;
  },

  loadFromCacheOnly: function() {
    UnisatViewModel._offset = 0;
    UnisatViewModel._hasMore = true;
    UnisatViewModel._listings = [];
    UnisatViewModel._isLoading = true;
    UnisatViewModel._emit('loading');
    UnisatViewModel._loadBatch();
    UnisatViewModel.loadStats();
  },

  _loadBatch: function() {
    var self = UnisatViewModel;
    var url = '/api/v1/unisat/cache/listings?sort=' + self._currentSort + '&offset=' + self._offset + '&limit=' + self._limit;
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
        UnisatViewModel._isLoading = false;
        UnisatViewModel._isLoadingMore = false;
        UnisatViewModel._emit('loading');
      });
  },

  loadMore: function() {
    if (UnisatViewModel._isLoadingMore || !UnisatViewModel._hasMore) return;
    UnisatViewModel._isLoadingMore = true;
    UnisatViewModel._loadBatch();
  },

  loadStats: function() {
    ApiClient.get('/api/v1/unisat/cache/stats', true)
      .then(function(res) {
        UnisatViewModel._floorPrice = res.data.floorPrice || 0;
        UnisatViewModel._totalListings = res.data.totalListed || 0;
        UnisatViewModel._emit('stats');
      })
      .catch(function() {});

    ApiClient.get('/api/v1/unisat/cache/last-update', true)
      .then(function(res) {
        UnisatViewModel._lastUpdateTime = res.data.lastUpdate || 0;
        UnisatViewModel._emit('time');
      })
      .catch(function() {});

    ApiClient.get('/api/v1/unisat/cache/count', true)
      .then(function(res) {
        UnisatViewModel._cacheCount = res.data.count || 0;
        UnisatViewModel._emit('count');
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
    if (sortBy === UnisatViewModel._currentSort) return;
    UnisatViewModel._currentSort = sortBy;
    UnisatViewModel._listings = UnisatViewModel.applySecondarySorting(
      UnisatViewModel._listings, sortBy
    );
    UnisatViewModel._emit('sort');
    UnisatViewModel._emit('listings');
  },

  triggerManualRefresh: function() {
    UnisatViewModel._isLoading = true;
    UnisatViewModel._emit('loading');
    ApiClient.get('/api/v1/proxy/unisat/stats', true)
      .then(function(res) {
        var newFloor = res.data.floor_price || 0;
        var newListed = res.data.listed || 0;
        var changed = (newFloor !== UnisatViewModel._floorPrice || newListed !== UnisatViewModel._totalListings);
        if (changed) {
          return UnisatViewModel._fetchAndSaveAll().then(function() {
            UnisatViewModel._isLoading = false;
            UnisatViewModel._emit('loading');
            UnisatViewModel._emit('refresh');
          });
        } else {
          UnisatViewModel._isLoading = false;
          UnisatViewModel._emit('loading');
          UnisatViewModel._emit('stats-unchanged');
        }
      })
      .catch(function() {
        UnisatViewModel._isLoading = false;
        UnisatViewModel._emit('loading');
      });
  },

  _fetchAndSaveAll: function() {
    var listings = [];
    var promises = [];
    for (var offset = 0; offset < 300; offset += 60) {
      promises.push(
        ApiClient.get('/api/v1/proxy/unisat/listings?offset=' + offset + '&limit=60', true)
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
    if (UnisatViewModel._pollInterval) return;
    UnisatViewModel._pollInterval = setInterval(function() {
      UnisatViewModel.loadFromCacheOnly();
    }, 300000);
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        if (UnisatViewModel._pollInterval) {
          clearInterval(UnisatViewModel._pollInterval);
          UnisatViewModel._pollInterval = null;
        }
      } else {
        UnisatViewModel.loadFromCacheOnly();
        UnisatViewModel.startPolling();
      }
    });
  },

  stopPolling: function() {
    if (UnisatViewModel._pollInterval) {
      clearInterval(UnisatViewModel._pollInterval);
      UnisatViewModel._pollInterval = null;
    }
  }
};
