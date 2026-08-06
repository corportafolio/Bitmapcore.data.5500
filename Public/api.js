var ApiClient = {
  baseUrl: '',
  proxyUrl: '',
  request: function(method, url, data, useProxy) {
    var base = useProxy ? ApiClient.proxyUrl : ApiClient.baseUrl;
    return fetch(base + url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    }).then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  },
  get: function(url, useProxy) { return ApiClient.request('GET', url, null, useProxy); },
  post: function(url, data, useProxy) { return ApiClient.request('POST', url, data, useProxy); }
};

var ProxyRoutes = {
  ordinalswallet: {
    getListings: function() { return ApiClient.get('/api/v1/proxy/ordinalswallet/listings', true); },
    getSold: function() { return ApiClient.get('/api/v1/proxy/ordinalswallet/sold', true); },
    getStats: function() { return ApiClient.get('/api/v1/proxy/ordinalswallet/stats', true); }
  },
  unisat: {
    getActions: function(data) { return ApiClient.post('/api/v1/proxy/unisat/actions', data, true); },
    getListings: function() { return ApiClient.get('/api/v1/proxy/unisat/listings', true); }
  }
};

var WalletApi = {
  connect: function(address) { return ApiClient.post('/api/v1/wallet/connect', { address: address }, true); },
  getBalance: function(address) { return ApiClient.get('/api/v1/wallet/' + address + '/balance', true); },
  getUTXOs: function(address) { return ApiClient.get('/api/v1/wallet/' + address + '/utxos', true); }
};

var BlockchainApi = {
  getBlocks: function(page, limit) { return ApiClient.get('/api/v1/blocks?page=' + page + '&limit=' + limit, true); },
  getBlock: function(id) { return ApiClient.get('/api/v1/blocks/' + id, true); },
  searchBlock: function(query) { return ApiClient.get('/api/v1/blocks/search?q=' + encodeURIComponent(query), true); },
  getBlockTransactions: function(id) { return ApiClient.get('/api/v1/blocks/' + id + '/transactions', true); }
};

var PsbtBuilder = {
  createPSBT: function(data) { return ApiClient.post('/api/v1/transaction/psbt', data, true); },
  signPSBT: function(psbt) { return ApiClient.post('/api/v1/transaction/psbt/sign', { psbt: psbt }, true); },
  broadcastPSBT: function(signedPsbt) { return ApiClient.post('/api/v1/transaction/psbt/broadcast', { psbt: signedPsbt }, true); }
};

var MisActivosApi = {
  getByAddress: function(address) { return ApiClient.get('/api/v1/bitmasowner/' + address, true); }
};

var AssetApi = {
  getUserAssets: function(address) {
    return fetch('/api/v1/assets/address/' + address + '?t=' + Date.now())
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
};

var MarketplaceApi = {
  getOrdinalswallet: function() { return ApiClient.get('/api/v1/proxy/ordinalswallet/listings', true); },
  getUnisat: function() { return ApiClient.post('/api/v1/proxy/unisat/actions', { collection:'bitmap', events:[], cursor:0, size:100 }, true); },
  getLocal: function() { return ApiClient.get('/api/v1/bitmaps/?limit=100', false); },
  getUnified: function() { return ApiClient.get('/api/v1/unified', true); },
  getTags: function() { return ApiClient.get('/api/v1/tags', true); },
  getTagBlocks: function(tag) { return ApiClient.get('/api/v1/tags/' + encodeURIComponent(tag), true); },
  getSales: function() { return ApiClient.get('/api/v1/proxy/ordinalswallet/sold', true); },
  getDescuentos: function() { return ApiClient.get('/api/v1/descuentos', true); },
  getOwnerListings: function(address) {
    return MarketplaceApi.getLocal().then(function(res) {
      var items = (res && res.data && res.data.items) || [];
      return items.filter(function(l) { return l.sellerAddress === address && l.isActive; });
    });
  },
  updateListingPrice: function(id, newPrice, walletAddress, clientUtxo, clientValue) {
    return fetch('/api/v1/bitmaps/' + id + '/price-psbt?newPrice=' + newPrice + '&clientUtxo=' + encodeURIComponent(clientUtxo) + '&clientValue=' + clientValue, {
      method: 'GET',
      headers: { 'wallet-address': walletAddress }
    }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  },
  signPriceUpdate: function(id, signedPsbt, sellerOrdinalPublicKey, newPrice) {
    return fetch('/api/v1/bitmaps/' + id + '/price-sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedPsbt: signedPsbt, sellerOrdinalPublicKey: sellerOrdinalPublicKey, newPrice: newPrice })
    }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  },
  delistListing: function(id, walletAddress) {
    return fetch('/api/v1/bitmaps/' + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'wallet-address': walletAddress }
    }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  },
  batchList: function(items) {
    return fetch('/api/v1/bitmaps/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items })
    }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  },
  batchSign: function(listingIds, signedPsbt, sellerOrdinalPublicKey) {
    return fetch('/api/v1/bitmaps/batch/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingIds: listingIds, signedPsbt: signedPsbt, sellerOrdinalPublicKey: sellerOrdinalPublicKey })
    }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
};
