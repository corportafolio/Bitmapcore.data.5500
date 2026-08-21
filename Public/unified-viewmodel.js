var UnifiedViewModel = {
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
    if (!UnifiedViewModel._listeners[key]) UnifiedViewModel._listeners[key] = [];
    UnifiedViewModel._listeners[key].push(cb);
    return function() {
      UnifiedViewModel._listeners[key] = UnifiedViewModel._listeners[key].filter(function(x) { return x !== cb; });
    };
  },

  _emit: function(key) {
    var cbs = UnifiedViewModel._listeners[key] || [];
    for (var i = 0; i < cbs.length; i++) { try { cbs[i](); } catch(e) {} }
    var allCbs = UnifiedViewModel._listeners['*'] || [];
    for (var j = 0; j < allCbs.length; j++) { try { allCbs[j](); } catch(e) {} }
  },

  getListings: function() { return UnifiedViewModel._listings; },
  getFloorPrice: function() { return UnifiedViewModel._floorPrice; },
  getTotalListings: function() { return UnifiedViewModel._totalListings; },
  getCurrentSort: function() { return UnifiedViewModel._currentSort; },
  getLastUpdateTime: function() { return UnifiedViewModel._lastUpdateTime; },
  getIsLoading: function() { return UnifiedViewModel._isLoading; },
  getCacheCount: function() { return UnifiedViewModel._cacheCount; },
  getHasMore: function() { return UnifiedViewModel._hasMore; },
  getIsLoadingMore: function() { return UnifiedViewModel._isLoadingMore; },

  loadFromCacheOnly: function() {
    UnifiedViewModel._offset = 0;
    UnifiedViewModel._hasMore = true;
    UnifiedViewModel._listings = [];
    UnifiedViewModel._isLoading = true;
    UnifiedViewModel._emit('loading');
    UnifiedViewModel._loadBatch();
    UnifiedViewModel.loadStats();
  },

  _loadBatch: function() {
    var self = UnifiedViewModel;
    var url = '/api/v1/unified/cache/listings?sort=' + self._currentSort + '&offset=' + self._offset + '&limit=' + self._limit;
    ApiClient.get(url, true)
      .then(function(res) {
        var items = res.data || [];
        if (self._offset === 0) { self._listings = items; }
        else { self._listings = self._listings.concat(items); }
        self._offset += items.length;
        self._hasMore = items.length === self._limit;
        self._cacheCount = items.length;
        self._isLoading = false;
        self._isLoadingMore = false;
        self._emit('listings');
        self._emit('loading');
      })
      .catch(function() {
        UnifiedViewModel._isLoading = false;
        UnifiedViewModel._isLoadingMore = false;
        UnifiedViewModel._emit('loading');
      });
  },

  loadMore: function() {
    if (UnifiedViewModel._isLoadingMore || !UnifiedViewModel._hasMore) return;
    UnifiedViewModel._isLoadingMore = true;
    UnifiedViewModel._loadBatch();
  },

  loadStats: function() {
    ApiClient.get('/api/v1/unified/cache/stats', true)
      .then(function(res) {
        UnifiedViewModel._floorPrice = res.data.floorPrice || 0;
        UnifiedViewModel._totalListings = res.data.totalListed || 0;
        UnifiedViewModel._emit('stats');
      })
      .catch(function() {});

    ApiClient.get('/api/v1/unified/cache/last-update', true)
      .then(function(res) {
        UnifiedViewModel._lastUpdateTime = res.data.lastUpdate || 0;
        UnifiedViewModel._emit('time');
      })
      .catch(function() {});

    ApiClient.get('/api/v1/unified/cache/count', true)
      .then(function(res) {
        UnifiedViewModel._cacheCount = res.data.count || 0;
        UnifiedViewModel._emit('count');
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
        sorted.sort(function(a, b) { return (b.listedAt || 0) - (a.listedAt || 0); });
    }
    return sorted;
  },

  updateSortOrder: function(sortBy) {
    if (sortBy === UnifiedViewModel._currentSort) return;
    UnifiedViewModel._currentSort = sortBy;
    UnifiedViewModel._listings = UnifiedViewModel.applySecondarySorting(UnifiedViewModel._listings, sortBy);
    UnifiedViewModel._emit('sort');
    UnifiedViewModel._emit('listings');
  },

  triggerManualRefresh: function() {
    UnifiedViewModel._isLoading = true;
    UnifiedViewModel._emit('loading');
    UnifiedViewModel.loadFromCacheOnly();
  },

  startPolling: function() {
    if (UnifiedViewModel._pollInterval) return;
    UnifiedViewModel._pollInterval = setInterval(function() {
      UnifiedViewModel.loadFromCacheOnly();
    }, 60000);
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        if (UnifiedViewModel._pollInterval) {
          clearInterval(UnifiedViewModel._pollInterval);
          UnifiedViewModel._pollInterval = null;
        }
      } else {
        UnifiedViewModel.loadFromCacheOnly();
        UnifiedViewModel.startPolling();
      }
    });
  },

  stopPolling: function() {
    if (UnifiedViewModel._pollInterval) {
      clearInterval(UnifiedViewModel._pollInterval);
      UnifiedViewModel._pollInterval = null;
    }
  }
};
