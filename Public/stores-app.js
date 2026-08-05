var StoreApp = {
  _listeners: {},
  _state: {
    wallet: { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet' },
    block: { currentBlock:null, recentBlocks:[], searchResults:[], isLoading:false },
    auth: { user:null, isAuthenticated:false },
    notifications: { notifications:[], unreadCount:0 },
    polling: { interval:BitmapConstants.POLLING_INTERVAL, isActive:false, lastPoll:null }
  },
  WALLET_STORAGE_KEY: 'bitmapcore_wallet',

  initWallet: function() {
    try {
      var stored = localStorage.getItem(this.WALLET_STORAGE_KEY);
      if (stored) {
        var wallet = JSON.parse(stored);
        if (wallet.address && wallet.publicKey) {
          this._state.wallet = {
            address: wallet.address,
            publicKey: wallet.publicKey,
            balance: 0,
            isConnected: true,
            network: wallet.network || 'mainnet',
            walletType: wallet.walletType || 'unisat'
          };
          this._emit('wallet');
        }
      }
    } catch(e) {
      console.error('[Wallet] Error loading from storage:', e);
    }
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
  _getXverseProvider: function() {
    if (typeof window === 'undefined') return null;
    if (window.XverseProviders && window.XverseProviders.BitcoinProvider) return window.XverseProviders.BitcoinProvider;
    if (window.BitcoinProvider) return window.BitcoinProvider;
    return null;
  },
  _xverseSignPsbt: async function(psbtBase64, ordinalsAddress) {
    var provider = StoreApp._getXverseProvider();
    if (!provider) throw new Error('Xverse wallet no disponible');
    var result = await provider.request('signPsbt', {
      psbt: psbtBase64,
      signInputs: ordinalsAddress ? { [ordinalsAddress]: [0] } : undefined,
      broadcast: false
    });
    if (result && result.result) return result.result;
    return result;
  },
  connectWallet: function(type) {
    var self = this;
    return new Promise(function(resolve) {
      if (type === 'unisat' && typeof window !== 'undefined' && window.unisat) {
        window.unisat.requestAccounts().then(function(accounts) {
          window.unisat.getPublicKey().then(function(pubKey) {
            StoreApp._state.wallet = { address:accounts[0], publicKey:pubKey, balance:0, isConnected:true, network:'mainnet', walletType:'unisat' };
            localStorage.setItem('bitmapcore_wallet', JSON.stringify({ address:accounts[0], publicKey:pubKey, network:'mainnet', walletType:'unisat' }));
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
      } else if (type === 'xverse' && typeof window !== 'undefined' && StoreApp._getXverseProvider()) {
        var xProvider = StoreApp._getXverseProvider();
        xProvider.request('getAddress', {
          purposes: ['ordinals', 'payment'],
          message: 'Conectar a BitmapCore',
          network: 'Mainnet'
        }).then(function(response) {
          var addrs = (response && response.result) ? response.result : (Array.isArray(response) ? response : []);
          if (!Array.isArray(addrs) || addrs.length === 0) {
            throw new Error('No se obtuvieron direcciones');
          }
          var ordinalsAddr = null;
          var paymentAddr = null;
          for (var ai = 0; ai < addrs.length; ai++) {
            if (addrs[ai].purpose === 'ordinals') ordinalsAddr = addrs[ai];
            else if (addrs[ai].purpose === 'payment') paymentAddr = addrs[ai];
          }
          if (!ordinalsAddr) {
            ordinalsAddr = addrs[0];
            if (addrs.length > 1) paymentAddr = addrs[1];
          }
          var walletData = {
            address: ordinalsAddr.address,
            publicKey: ordinalsAddr.publicKey,
            paymentAddress: paymentAddr ? paymentAddr.address : null,
            paymentPublicKey: paymentAddr ? paymentAddr.publicKey : null,
            balance: 0,
            isConnected: true,
            network: 'mainnet',
            walletType: 'xverse'
          };
          StoreApp._state.wallet = walletData;
          localStorage.setItem('bitmapcore_wallet', JSON.stringify(walletData));
          StoreApp._emit('wallet');
          resolve(ordinalsAddr.address);
        }).catch(function(err) {
          console.error('[Xverse] Error connecting:', err);
          StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
          StoreApp._emit('wallet');
          resolve(null);
        });
      } else if (!type && typeof window !== 'undefined' && window.unisat) {
        window.unisat.requestAccounts().then(function(accounts) {
          window.unisat.getPublicKey().then(function(pubKey) {
            StoreApp._state.wallet = { address:accounts[0], publicKey:pubKey, balance:0, isConnected:true, network:'mainnet', walletType:'unisat' };
            localStorage.setItem('bitmapcore_wallet', JSON.stringify({ address:accounts[0], publicKey:pubKey, network:'mainnet', walletType:'unisat' }));
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
      } else if (!type && typeof window !== 'undefined' && StoreApp._getXverseProvider()) {
        var xProvider2 = StoreApp._getXverseProvider();
        xProvider2.request('getAddress', {
          purposes: ['ordinals', 'payment'],
          message: 'Conectar a BitmapCore',
          network: 'Mainnet'
        }).then(function(response) {
          var addrs2 = (response && response.result) ? response.result : (Array.isArray(response) ? response : []);
          if (!Array.isArray(addrs2) || addrs2.length === 0) {
            throw new Error('No se obtuvieron direcciones');
          }
          var ordAddr2 = null;
          var payAddr2 = null;
          for (var ai2 = 0; ai2 < addrs2.length; ai2++) {
            if (addrs2[ai2].purpose === 'ordinals') ordAddr2 = addrs2[ai2];
            else if (addrs2[ai2].purpose === 'payment') payAddr2 = addrs2[ai2];
          }
          if (!ordAddr2) {
            ordAddr2 = addrs2[0];
            if (addrs2.length > 1) payAddr2 = addrs2[1];
          }
          var walletData2 = {
            address: ordAddr2.address,
            publicKey: ordAddr2.publicKey,
            paymentAddress: payAddr2 ? payAddr2.address : null,
            paymentPublicKey: payAddr2 ? payAddr2.publicKey : null,
            balance: 0,
            isConnected: true,
            network: 'mainnet',
            walletType: 'xverse'
          };
          StoreApp._state.wallet = walletData2;
          localStorage.setItem('bitmapcore_wallet', JSON.stringify(walletData2));
          StoreApp._emit('wallet');
          resolve(ordAddr2.address);
        }).catch(function(err) {
          console.error('[Xverse] Error connecting (auto-detect):', err);
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
    StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
    localStorage.removeItem('bitmapcore_wallet');
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
