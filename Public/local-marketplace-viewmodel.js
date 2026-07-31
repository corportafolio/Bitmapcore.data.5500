var LocalMarketplaceViewModel = {
  _state: {
    listings: [],
    floorPrice: 0,
    totalListings: 0,
    currentSort: 'listedAtDesc',
    currentPage: 1,
    pageSize: 50,
    isLoading: false,
    error: null
  },
  _listeners: {},
  _apiBase: 'https://80.190.76.108:3000/api/v1',

  loadListings: function(page, sort) {
    var self = this;
    page = page || this._state.currentPage;
    sort = sort || this._state.currentSort;

    this._state.currentPage = page;
    this._state.currentSort = sort;
    this._state.isLoading = true;
    this._emit('listings');

    var sortParam = '';
    if (sort === 'priceAsc') sortParam = '&sort=price_asc';
    else if (sort === 'priceDesc') sortParam = '&sort=price_desc';
    else sortParam = '&sort=listed_desc';

    var url = this._apiBase + '/bitmaps?page=' + page + '&limit=' + this._state.pageSize + sortParam;

    return fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var items = (data && data.data && data.data.items) || data.items || data || [];
        self._state.listings = Array.isArray(items) ? items : [];
        self._state.totalListings = (data && data.data && data.data.total) || data.total || self._state.listings.length;

        var prices = self._state.listings
          .map(function(l) { return l.price || l.listedPrice || 0; })
          .filter(function(p) { return p > 0; });
        self._state.floorPrice = prices.length > 0 ? Math.min.apply(null, prices) : 0;

        self._state.isLoading = false;
        self._state.error = null;
        self._emit('listings');
        self._emit('stats');
      })
      .catch(function(e) {
        self._state.isLoading = false;
        self._state.error = e.message;
        self._emit('listings');
        self._emit('stats');
      });
  },

  loadFromCacheOnly: function() {
    this._emit('listings');
    this._emit('stats');
  },

  buyBitmap: function(listingId, buyerAddress) {
    var self = this;
    return fetch(this._apiBase + '/transaction/buy-bitmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bitmapId: listingId,
        buyerAddress: buyerAddress,
        idempotencyKey: 'buy_' + listingId + '_' + Date.now()
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success || !data.data || !data.data.psbt) {
        throw new Error('No se recibi\u00f3 PSBT del servidor');
      }
      return ConnectionWalletViewModel.signPsbt(data.data.psbt, {
        autoFinalize: true,
        toSignInputs: data.data.toSignInputs
      })
      .then(function(signedPsbt) {
        return fetch(self._apiBase + '/transaction/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signedPsbt: signedPsbt,
            transactionId: data.data.transactionId
          })
        }).then(function(r) { return r.json(); });
      });
    });
  },

  createListing: function(params) {
    var self = this;
    return fetch(this._apiBase + '/bitmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success || !data.data || !data.data.psbtToSign) {
        throw new Error('No se recibi\u00f3 PSBT para firmar listing');
      }
      return ConnectionWalletViewModel.signPsbt(data.data.psbtToSign, { autoFinalize: false })
        .then(function(signedPsbt) {
          return fetch(self._apiBase + '/bitmaps/' + data.data.listing.id + '/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signedPsbt: signedPsbt,
              sellerOrdinalPublicKey: params.sellerOrdinalPublicKey
            })
          }).then(function(r) { return r.json(); });
        });
    });
  },

  updateSortOrder: function(sort) {
    this.loadListings(1, sort);
  },

  subscribe: function(key, callback) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(callback);
    return function() {
      this._listeners[key] = this._listeners[key].filter(function(cb) { return cb !== callback; });
    }.bind(this);
  },

  _emit: function(key) {
    var listeners = this._listeners[key] || [];
    var data = this._getStateForKey(key);
    for (var i = 0; i < listeners.length; i++) listeners[i](data);
  },

  _getStateForKey: function(key) {
    if (key === 'listings') return this._state.listings;
    if (key === 'stats') return { floorPrice: this._state.floorPrice, totalListings: this._state.totalListings };
    if (key === 'loading') return this._state.isLoading;
    if (key === 'sort') return this._state.currentSort;
    return this._state;
  },

  getListings: function() { return this._state.listings; },
  getFloorPrice: function() { return this._state.floorPrice; },
  getTotalListings: function() { return this._state.totalListings; },
  getCurrentSort: function() { return this._state.currentSort; },
  isLoading: function() { return this._state.isLoading; },
  getError: function() { return this._state.error; }
};