var StoreMarketplaces = {
  _listeners: {},
  _state: {
    ordinalswallet: { listings:[], floorPrice:0, soldCount:0, images:[], isLoading:false, error:null },
    unisat: { listings:[], floorPrice:0, soldCount:0, images:[], isLoading:false, error:null },
    local: { listings:[], floorPrice:0, soldCount:0, images:[], isLoading:false, error:null },
    satflow: { listings:[], floorPrice:0, soldCount:0, images:[], isLoading:false, error:null },
    unified: { allListings:[], totalCount:0, isLoading:false },
    tags: { tags:[], isLoading:false },
    sales: { sales:[], totalSold:0, isLoading:false },
    descuentos: { discounts:[], isLoading:false }
  },
  get: function(marketplace) { return StoreMarketplaces._state[marketplace] || {}; },
  subscribe: function(key, callback) {
    if (!StoreMarketplaces._listeners[key]) StoreMarketplaces._listeners[key] = [];
    StoreMarketplaces._listeners[key].push(callback);
    return function() {
      StoreMarketplaces._listeners[key] = StoreMarketplaces._listeners[key].filter(function(cb) { return cb !== callback; });
    };
  },
  _emit: function(key) {
    var listeners = StoreMarketplaces._listeners[key] || [];
    for (var i = 0; i < listeners.length; i++) listeners[i](StoreMarketplaces._state[key]);
  },
  fetchOrdinalswallet: function() {
    StoreMarketplaces._state.ordinalswallet.isLoading = true;
    StoreMarketplaces._emit('ordinalswallet');
    OrdinalswalletViewModel.loadFromCacheOnly();
    var checkData = function() {
      var vm = OrdinalswalletViewModel;
      StoreMarketplaces._state.ordinalswallet = {
        listings: vm.getListings(),
        floorPrice: vm.getFloorPrice(),
        soldCount: vm.getTotalListings(),
        images: [],
        isLoading: false,
        error: null
      };
      StoreMarketplaces._emit('ordinalswallet');
    };
    setTimeout(checkData, 800);
    var unsub = OrdinalswalletViewModel.subscribe('stats', function() {
      checkData();
      unsub();
    });
  },
  fetchUnisat: function() {
    StoreMarketplaces._state.unisat.isLoading = true;
    StoreMarketplaces._emit('unisat');
    MarketplaceApi.getUnisat().then(function(data) {
      var listings = data.data || data || [];
      if (!Array.isArray(listings)) listings = [];
      var floor = 0;
      if (listings.length > 0) {
        var prices = listings.map(function(l) { return l.price || 0; }).filter(function(p) { return p > 0; });
        floor = prices.length > 0 ? Math.min.apply(null, prices) : 0;
      }
      StoreMarketplaces._state.unisat = { listings:listings, floorPrice:floor, soldCount:listings.length, images:[], isLoading:false, error:null };
      StoreMarketplaces._emit('unisat');
    }).catch(function(e) {
      StoreMarketplaces._state.unisat.isLoading = false;
      StoreMarketplaces._state.unisat.error = e.message;
      StoreMarketplaces._emit('unisat');
    });
  },
  fetchLocal: function() {
    StoreMarketplaces._state.local.isLoading = true;
    StoreMarketplaces._emit('local');
    MarketplaceApi.getLocal().then(function(data) {
      var listings = data.data || data || [];
      if (!Array.isArray(listings)) listings = [];
      var floor = 0;
      if (listings.length > 0) {
        var prices = listings.map(function(l) { return l.price || 0; }).filter(function(p) { return p > 0; });
        floor = prices.length > 0 ? Math.min.apply(null, prices) : 0;
      }
      StoreMarketplaces._state.local = { listings:listings, floorPrice:floor, soldCount:listings.length, images:[], isLoading:false, error:null };
      StoreMarketplaces._emit('local');
    }).catch(function(e) {
      StoreMarketplaces._state.local.isLoading = false;
      StoreMarketplaces._state.local.error = e.message;
      StoreMarketplaces._emit('local');
    });
  },
  fetchUnified: function() {
    StoreMarketplaces._state.unified.isLoading = true;
    StoreMarketplaces._emit('unified');
    MarketplaceApi.getUnified().then(function(data) {
      var all = data.data || data || [];
      if (!Array.isArray(all)) all = [];
      StoreMarketplaces._state.unified = { allListings:all, totalCount:all.length, isLoading:false };
      StoreMarketplaces._emit('unified');
    }).catch(function() {
      StoreMarketplaces._state.unified.isLoading = false;
      StoreMarketplaces._emit('unified');
    });
  },
  fetchTags: function() {
    StoreMarketplaces._state.tags.isLoading = true;
    StoreMarketplaces._emit('tags');
    MarketplaceApi.getTags().then(function(data) {
      var tags = data.data || data || [];
      if (!Array.isArray(tags)) tags = [];
      StoreMarketplaces._state.tags = { tags:tags, isLoading:false };
      StoreMarketplaces._emit('tags');
    }).catch(function() {
      StoreMarketplaces._state.tags.isLoading = false;
      StoreMarketplaces._emit('tags');
    });
  },
  fetchSales: function() {
    StoreMarketplaces._state.sales.isLoading = true;
    StoreMarketplaces._emit('sales');
    MarketplaceApi.getSales().then(function(data) {
      var sales = data.data || data || [];
      if (!Array.isArray(sales)) sales = [];
      StoreMarketplaces._state.sales = { sales:sales, totalSold:sales.length, isLoading:false };
      StoreMarketplaces._emit('sales');
    }).catch(function() {
      StoreMarketplaces._state.sales.isLoading = false;
      StoreMarketplaces._emit('sales');
    });
  },
  fetchDescuentos: function() {
    StoreMarketplaces._state.descuentos.isLoading = true;
    StoreMarketplaces._emit('descuentos');
    MarketplaceApi.getDescuentos().then(function(data) {
      var discounts = data.data || data || [];
      if (!Array.isArray(discounts)) discounts = [];
      StoreMarketplaces._state.descuentos = { discounts:discounts, isLoading:false };
      StoreMarketplaces._emit('descuentos');
    }).catch(function() {
      StoreMarketplaces._state.descuentos.isLoading = false;
      StoreMarketplaces._emit('descuentos');
    });
  },
  fetchSatflow: function() {
    StoreMarketplaces._state.satflow.isLoading = true;
    StoreMarketplaces._emit('satflow');
    SatflowViewModel.loadFromCacheOnly();
    var checkData = function() {
      var vm = SatflowViewModel;
      StoreMarketplaces._state.satflow = {
        listings: vm.getListings(),
        floorPrice: vm.getFloorPrice(),
        soldCount: vm.getTotalListings(),
        images: [],
        isLoading: false,
        error: null
      };
      StoreMarketplaces._emit('satflow');
    };
    setTimeout(checkData, 800);
    var unsub = SatflowViewModel.subscribe('stats', function() {
      checkData();
      unsub();
    });
  }
};
