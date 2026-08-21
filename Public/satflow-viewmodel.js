var SatflowViewModel = {
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
  _ws: null,
  _wsReconnectAttempts: 0,
  _maxReconnectAttempts: 10,
  _reconnectDelay: 1000,
  _useWebSocket: false,
  _apiKey: null,

  subscribe: function(key, cb) {
    if (!SatflowViewModel._listeners[key]) SatflowViewModel._listeners[key] = [];
    SatflowViewModel._listeners[key].push(cb);
    return function() {
      SatflowViewModel._listeners[key] = SatflowViewModel._listeners[key].filter(function(x) { return x !== cb; });
    };
  },

  _emit: function(key) {
    var cbs = SatflowViewModel._listeners[key] || [];
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](); } catch(e) {}
    }
    var allCbs = SatflowViewModel._listeners['*'] || [];
    for (var j = 0; j < allCbs.length; j++) {
      try { allCbs[j](); } catch(e) {}
    }
  },

  getListings: function() {
    return SatflowViewModel._listings;
  },

  getFloorPrice: function() {
    return SatflowViewModel._floorPrice;
  },

  getTotalListings: function() {
    return SatflowViewModel._totalListings;
  },

  getCurrentSort: function() {
    return SatflowViewModel._currentSort;
  },

  getLastUpdateTime: function() {
    return SatflowViewModel._lastUpdateTime;
  },

  getIsLoading: function() {
    return SatflowViewModel._isLoading;
  },

  getCacheCount: function() {
    return SatflowViewModel._cacheCount;
  },

  getHasMore: function() {
    return SatflowViewModel._hasMore;
  },

  getIsLoadingMore: function() {
    return SatflowViewModel._isLoadingMore;
  },

  getConnectionStatus: function() {
    if (SatflowViewModel._useWebSocket) {
      return SatflowViewModel._ws && SatflowViewModel._ws.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';
    }
    return 'polling';
  },

  setApiKey: function(apiKey) {
    SatflowViewModel._apiKey = apiKey;
  },

  loadFromCacheOnly: function() {
    SatflowViewModel._offset = 0;
    SatflowViewModel._hasMore = true;
    SatflowViewModel._listings = [];
    SatflowViewModel._isLoading = true;
    SatflowViewModel._emit('loading');
    SatflowViewModel._loadBatch();
    SatflowViewModel.loadStats();
  },

  _loadBatch: function() {
    var self = SatflowViewModel;
    var url = '/api/v1/satflow/cache/listings?sort=' + self._currentSort + '&offset=' + self._offset + '&limit=' + self._limit;
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
    if (SatflowViewModel._isLoadingMore || !SatflowViewModel._hasMore) return;
    SatflowViewModel._isLoadingMore = true;
    SatflowViewModel._loadBatch();
  },

  loadStats: function() {
    ApiClient.get('/api/v1/satflow/cache/stats', true)
      .then(function(res) {
        SatflowViewModel._floorPrice = res.data.floorPrice || 0;
        SatflowViewModel._totalListings = res.data.totalListed || 0;
        SatflowViewModel._emit('stats');
      })
      .catch(function() {});

    ApiClient.get('/api/v1/satflow/cache/last-update', true)
      .then(function(res) {
        SatflowViewModel._lastUpdateTime = res.data.lastUpdate || 0;
        SatflowViewModel._emit('time');
      })
      .catch(function() {});

    ApiClient.get('/api/v1/satflow/cache/count', true)
      .then(function(res) {
        SatflowViewModel._cacheCount = res.data.count || 0;
        SatflowViewModel._emit('count');
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
    if (sortBy === SatflowViewModel._currentSort) return;
    SatflowViewModel._currentSort = sortBy;
    SatflowViewModel._listings = SatflowViewModel.applySecondarySorting(
      SatflowViewModel._listings, sortBy
    );
    SatflowViewModel._emit('sort');
    SatflowViewModel._emit('listings');
  },

  triggerManualRefresh: function() {
    SatflowViewModel._isLoading = true;
    SatflowViewModel._emit('loading');
    if (SatflowViewModel._useWebSocket && SatflowViewModel._ws) {
      SatflowViewModel._ws.send(JSON.stringify({ type: 'refresh' }));
      SatflowViewModel._isLoading = false;
      SatflowViewModel._emit('loading');
      SatflowViewModel._emit('refresh');
    } else {
      ApiClient.get('/api/v1/satflow/cache/stats', true)
        .then(function(res) {
          var newFloor = res.data.floorPrice || 0;
          var newListed = res.data.totalListed || 0;
          var changed = (newFloor !== SatflowViewModel._floorPrice || newListed !== SatflowViewModel._totalListings);
          if (changed) {
            return SatflowViewModel._fetchAndSaveAll().then(function() {
              SatflowViewModel._isLoading = false;
              SatflowViewModel._emit('loading');
              SatflowViewModel._emit('refresh');
            });
          } else {
            SatflowViewModel._isLoading = false;
            SatflowViewModel._emit('loading');
            SatflowViewModel._emit('stats-unchanged');
          }
        })
        .catch(function() {
          SatflowViewModel._isLoading = false;
          SatflowViewModel._emit('loading');
        });
    }
  },

  _fetchAndSaveAll: function() {
    var listings = [];
    var promises = [];
    for (var offset = 0; offset < 300; offset += 60) {
      promises.push(
        ApiClient.get('/api/v1/proxy/satflow/listings?offset=' + offset + '&limit=60', true)
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

  connectWebSocket: function() {
    if (SatflowViewModel._ws) return;
    if (!SatflowViewModel._apiKey) {
      console.warn('[Satflow] No API key, skipping WebSocket connection');
      return;
    }

    var wsUrl = 'wss://api.satflow.com/v1/ws?api_key=' + encodeURIComponent(SatflowViewModel._apiKey);
    SatflowViewModel._ws = new WebSocket(wsUrl);

    SatflowViewModel._ws.onopen = function() {
      console.log('[Satflow] WebSocket connected');
      SatflowViewModel._wsReconnectAttempts = 0;
      SatflowViewModel._useWebSocket = true;
      SatflowViewModel._emit('connection');
      SatflowViewModel._ws.send(JSON.stringify({ type: 'subscribe', events: ['listing', 'sale', 'bid', 'update'] }));
    };

    SatflowViewModel._ws.onmessage = function(event) {
      try {
        var msg = JSON.parse(event.data);
        SatflowViewModel._handleWebSocketMessage(msg);
      } catch (e) {
        console.error('[Satflow] WS message parse error:', e);
      }
    };

    SatflowViewModel._ws.onclose = function() {
      console.log('[Satflow] WebSocket closed');
      SatflowViewModel._useWebSocket = false;
      SatflowViewModel._emit('connection');
      SatflowViewModel._scheduleReconnect();
    };

    SatflowViewModel._ws.onerror = function(err) {
      console.error('[Satflow] WebSocket error:', err);
    };
  },

  _scheduleReconnect: function() {
    if (SatflowViewModel._wsReconnectAttempts >= SatflowViewModel._maxReconnectAttempts) {
      console.log('[Satflow] Max reconnect attempts reached, falling back to polling');
      SatflowViewModel._useWebSocket = false;
      SatflowViewModel.startPolling();
      return;
    }
    var delay = SatflowViewModel._reconnectDelay * Math.pow(2, SatflowViewModel._wsReconnectAttempts);
    SatflowViewModel._wsReconnectAttempts++;
    setTimeout(function() {
      SatflowViewModel.connectWebSocket();
    }, delay);
  },

  _handleWebSocketMessage: function(msg) {
    switch (msg.type) {
      case 'listing':
        if (msg.data && msg.data.inscriptionId) {
          SatflowViewModel._listings.unshift(msg.data);
          SatflowViewModel._emit('listings');
        }
        break;
      case 'sale':
        if (msg.data && msg.data.inscriptionId) {
          SatflowViewModel._listings = SatflowViewModel._listings.filter(function(l) { return l.inscriptionId !== msg.data.inscriptionId; });
          SatflowViewModel._emit('listings');
        }
        break;
      case 'update':
        if (msg.data && msg.data.inscriptionId) {
          var idx = SatflowViewModel._listings.findIndex(function(l) { return l.inscriptionId === msg.data.inscriptionId; });
          if (idx >= 0) SatflowViewModel._listings[idx] = msg.data;
          SatflowViewModel._emit('listings');
        }
        break;
      case 'stats':
        if (msg.data) {
          SatflowViewModel._floorPrice = msg.data.floorPrice || 0;
          SatflowViewModel._totalListings = msg.data.totalListed || 0;
          SatflowViewModel._emit('stats');
        }
        break;
    }
  },

  startPolling: function() {
    if (SatflowViewModel._pollInterval) return;
    SatflowViewModel._pollInterval = setInterval(function() {
      SatflowViewModel.loadFromCacheOnly();
    }, 60000);
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        if (SatflowViewModel._pollInterval) {
          clearInterval(SatflowViewModel._pollInterval);
          SatflowViewModel._pollInterval = null;
        }
        if (SatflowViewModel._ws) {
          SatflowViewModel._ws.close();
          SatflowViewModel._ws = null;
        }
      } else {
        if (SatflowViewModel._apiKey && !SatflowViewModel._ws) {
          SatflowViewModel.connectWebSocket();
        } else {
          SatflowViewModel.loadFromCacheOnly();
          SatflowViewModel.startPolling();
        }
      }
    });
  },

  stopPolling: function() {
    if (SatflowViewModel._pollInterval) {
      clearInterval(SatflowViewModel._pollInterval);
      SatflowViewModel._pollInterval = null;
    }
    if (SatflowViewModel._ws) {
      SatflowViewModel._ws.close();
      SatflowViewModel._ws = null;
    }
  }
};