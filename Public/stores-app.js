var StoreApp = {
  _listeners: {},
  _state: {
    wallet: { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet' },
    block: { currentBlock:null, recentBlocks:[], searchResults:[], isLoading:false },
    auth: { user:null, isAuthenticated:false },
    notifications: { notifications:[], unreadCount:0 },
    polling: { interval:BitmapConstants.POLLING_INTERVAL, isActive:false, lastPoll:null }
  },
  get: function(store) { return StoreApp._state[store] || {}; },
  subscribe: function(key, callback) {
    if (!StoreApp._listeners[key]) StoreApp._listeners[key] = [];
    StoreApp._listeners[key].push(callback);
    return function() {
      StoreApp._listeners[key] = StoreApp._listeners[key].filter(function(cb) { return cb !== callback; });
    };
  },
  _emit: function(key) {
    var listeners = StoreApp._listeners[key] || [];
    for (var i = 0; i < listeners.length; i++) listeners[i](StoreApp._state[key]);
  },
  connectWallet: function(type) {
    var self = this;
    return new Promise(function(resolve) {
      if (type === 'unisat' && typeof window !== 'undefined' && window.unisat) {
        window.unisat.requestAccounts().then(function(accounts) {
          window.unisat.getPublicKey().then(function(pubKey) {
            StoreApp._state.wallet = { address:accounts[0], publicKey:pubKey, balance:0, isConnected:true, network:'mainnet', walletType:'unisat' };
            StoreApp._emit('wallet');
            resolve(accounts[0]);
          }).catch(function(err) {
            console.error('[Wallet] Error obteniendo public key:', err);
            StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
            StoreApp._emit('wallet');
            resolve(null);
          });
        }).catch(function() {
          StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
          StoreApp._emit('wallet');
          resolve(null);
        });
      } else if (type === 'xverse' && typeof window !== 'undefined' && window.satsConnect) {
        window.satsConnect.getAddress({
          purposes: ['ordinals','payment'],
          network: { type:'Mainnet' }
        }).then(function(result) {
          var addr = result.addresses && result.addresses[0] ? result.addresses[0].address : 'demo-address';
          StoreApp._state.wallet = { address:addr, publicKey:addr, balance:0, isConnected:true, network:'mainnet', walletType:'xverse' };
          StoreApp._emit('wallet');
          resolve(addr);
        }).catch(function() {
          StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
          StoreApp._emit('wallet');
          resolve(null);
        });
      } else if (!type && typeof window !== 'undefined' && window.unisat) {
        window.unisat.requestAccounts().then(function(accounts) {
          window.unisat.getPublicKey().then(function(pubKey) {
            StoreApp._state.wallet = { address:accounts[0], publicKey:pubKey, balance:0, isConnected:true, network:'mainnet', walletType:'unisat' };
            StoreApp._emit('wallet');
            resolve(accounts[0]);
          }).catch(function(err) {
            console.error('[Wallet] Error obteniendo public key:', err);
            StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
            StoreApp._emit('wallet');
            resolve(null);
          });
        }).catch(function() {
          StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
          StoreApp._emit('wallet');
          resolve(null);
        });
      } else if (!type && typeof window !== 'undefined' && window.satsConnect) {
        window.satsConnect.getAddress({
          purposes: ['ordinals','payment'],
          network: { type:'Mainnet' }
        }).then(function(result) {
          var addr = result.addresses && result.addresses[0] ? result.addresses[0].address : 'demo-address';
          StoreApp._state.wallet = { address:addr, publicKey:addr, balance:0, isConnected:true, network:'mainnet', walletType:'xverse' };
          StoreApp._emit('wallet');
          resolve(addr);
        }).catch(function() {
          StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
          StoreApp._emit('wallet');
          resolve(null);
        });
      } else {
        StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
        StoreApp._emit('wallet');
        resolve(null);
      }
    });
  },
  disconnectWallet: function() {
    StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet' };
    StoreApp._emit('wallet');
  },
  getBlock: function(id) {
    StoreApp._state.block.isLoading = true;
    StoreApp._emit('block');
    BlockchainApi.getBlock(id).then(function(data) {
      StoreApp._state.block.currentBlock = data.data || data;
      StoreApp._state.block.isLoading = false;
      StoreApp._emit('block');
    }).catch(function() {
      StoreApp._state.block.isLoading = false;
      StoreApp._emit('block');
    });
  },
  searchBlocks: function(query) {
    StoreApp._state.block.isLoading = true;
    StoreApp._emit('block');
    BlockchainApi.searchBlock(query).then(function(data) {
      StoreApp._state.block.searchResults = data.data || data || [];
      StoreApp._state.block.isLoading = false;
      StoreApp._emit('block');
    }).catch(function() {
      StoreApp._state.block.searchResults = [];
      StoreApp._state.block.isLoading = false;
      StoreApp._emit('block');
    });
  },
  addNotification: function(message, type) {
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    StoreApp._state.notifications.notifications.push({ id:id, message:message, type:type||'info', timestamp:Date.now() });
    StoreApp._state.notifications.unreadCount++;
    StoreApp._emit('notifications');
  },
  removeNotification: function(id) {
    StoreApp._state.notifications.notifications = StoreApp._state.notifications.notifications.filter(function(n) { return n.id !== id; });
    StoreApp._emit('notifications');
  },
  startPolling: function(key, callback) {
    StoreApp._state.polling.isActive = true;
    StoreApp._state.polling.lastPoll = new Date();
    StoreApp._emit('polling');
    PollingManager.start(key, BitmapConstants.POLLING_INTERVAL, function() {
      callback();
      StoreApp._state.polling.lastPoll = new Date();
      StoreApp._emit('polling');
    });
  },
  stopPolling: function(key) {
    PollingManager.stop(key);
    StoreApp._state.polling.isActive = false;
    StoreApp._emit('polling');
  }
};
