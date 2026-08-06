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
        if (wallet.address) {
          this._state.wallet = {
            address: wallet.address,
            publicKey: null,
            balance: 0,
            isConnected: true,
            network: wallet.network || 'mainnet',
            walletType: wallet.walletType || 'unisat'
          };
          this._emit('wallet');
        }
      }
    } catch(e) {
      localStorage.removeItem(this.WALLET_STORAGE_KEY);
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
  _showWalletError: function(msg) {
    StoreApp.addNotification(msg, 'error');
    var ev = new CustomEvent('wallet-error', { detail: { message: msg } });
    if (typeof window !== 'undefined') window.dispatchEvent(ev);
  },
  _xverseSignPsbt: async function(psbtBase64, ordinalsAddress) {
    var provider = StoreApp._getXverseProvider();
    if (!provider) throw new Error('Xverse wallet no disponible');
    var result = await provider.request('signPsbt', {
      psbt: psbtBase64,
      signInputs: ordinalsAddress ? { [ordinalsAddress]: [0] } : undefined,
      broadcast: false
    });
    var signed = result && result.result ? result.result : result;
    if (signed && typeof signed === 'object' && signed.psbt) return signed.psbt;
    if (typeof signed === 'string') return signed;
    throw new Error('Xverse: respuesta invalida al firmar PSBT');
  },
  getPublicKeyFresh: async function() {
    var wallet = StoreApp._state.wallet;
    if (!wallet || !wallet.address) throw new Error('Wallet no conectada');
    if (wallet.walletType === 'unisat' && window.unisat) {
      return await window.unisat.getPublicKey();
    } else if (wallet.walletType === 'xverse' && StoreApp._getXverseProvider()) {
      var provider = StoreApp._getXverseProvider();
      var response = await provider.request('wallet_connect', {
        addresses: ['ordinals'],
        message: 'BitmapCore necesita tu clave publica',
        network: 'Mainnet'
      });
      var addrs = [];
      if (response && response.addresses) addrs = response.addresses;
      else if (response && response.result && response.result.addresses) addrs = response.result.addresses;
      for (var i = 0; i < addrs.length; i++) {
        if (addrs[i].purpose === 'ordinals' && addrs[i].publicKey) return addrs[i].publicKey;
      }
      if (addrs.length > 0 && addrs[0].publicKey) return addrs[0].publicKey;
      throw new Error('Xverse: no se obtuvo la clave publica');
    }
    throw new Error('Wallet no disponible para obtener clave publica');
  },
  connectWallet: function(type) {
    var self = this;
    return new Promise(function(resolve) {
      if (type === 'unisat' && typeof window !== 'undefined' && window.unisat) {
        window.unisat.requestAccounts().then(function(accounts) {
          window.unisat.getPublicKey().then(function(pubKey) {
            StoreApp._state.wallet = { address:accounts[0], publicKey:pubKey, balance:0, isConnected:true, network:'mainnet', walletType:'unisat' };
            localStorage.setItem('bitmapcore_wallet', JSON.stringify({ address:accounts[0], network:'mainnet', walletType:'unisat' }));
            StoreApp._emit('wallet');
            resolve(accounts[0]);
          }).catch(function() {
            StoreApp._showWalletError('Unisat: no se pudo obtener la clave publica');
            StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
            StoreApp._emit('wallet');
            resolve(null);
          });
        }).catch(function() {
          StoreApp._showWalletError('Unisat: conexion cancelada');
          StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
          StoreApp._emit('wallet');
          resolve(null);
        });
      } else if (type === 'xverse' && typeof window !== 'undefined' && StoreApp._getXverseProvider()) {
        var xProvider = StoreApp._getXverseProvider();
        xProvider.request('wallet_connect', {
          addresses: ['ordinals', 'payment'],
          message: 'Conectar a BitmapCore',
          network: 'Mainnet'
        }).then(function(response) {
          var addrs = [];
          if (response && response.addresses) {
            addrs = response.addresses;
          } else if (response && response.result && response.result.addresses) {
            addrs = response.result.addresses;
          }
          if (!Array.isArray(addrs) || addrs.length === 0) {
            StoreApp._showWalletError('Xverse: no se obtuvieron direcciones');
            StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
            StoreApp._emit('wallet');
            resolve(null);
            return;
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
          if (!ordinalsAddr.publicKey) {
            StoreApp._showWalletError('Xverse: no se obtuvo la clave publica');
            StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
            StoreApp._emit('wallet');
            resolve(null);
            return;
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
          localStorage.setItem('bitmapcore_wallet', JSON.stringify({ address: ordinalsAddr.address, network: 'mainnet', walletType: 'xverse' }));
          StoreApp._emit('wallet');
          resolve(ordinalsAddr.address);
        }).catch(function() {
          StoreApp._showWalletError('Xverse: conexion cancelada o fallida');
          StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
          StoreApp._emit('wallet');
          resolve(null);
        });
      } else if (!type && typeof window !== 'undefined' && window.unisat) {
        window.unisat.requestAccounts().then(function(accounts) {
          window.unisat.getPublicKey().then(function(pubKey) {
            StoreApp._state.wallet = { address:accounts[0], publicKey:pubKey, balance:0, isConnected:true, network:'mainnet', walletType:'unisat' };
            localStorage.setItem('bitmapcore_wallet', JSON.stringify({ address:accounts[0], network:'mainnet', walletType:'unisat' }));
            StoreApp._emit('wallet');
            resolve(accounts[0]);
          }).catch(function() {
            StoreApp._showWalletError('Unisat: no se pudo obtener la clave publica');
            StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
            StoreApp._emit('wallet');
            resolve(null);
          });
        }).catch(function() {
          StoreApp._showWalletError('Unisat: conexion cancelada');
          StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
          StoreApp._emit('wallet');
          resolve(null);
        });
      } else if (!type && typeof window !== 'undefined' && StoreApp._getXverseProvider()) {
        var xProvider2 = StoreApp._getXverseProvider();
        xProvider2.request('wallet_connect', {
          addresses: ['ordinals', 'payment'],
          message: 'Conectar a BitmapCore',
          network: 'Mainnet'
        }).then(function(response) {
          var addrs2 = [];
          if (response && response.addresses) {
            addrs2 = response.addresses;
          } else if (response && response.result && response.result.addresses) {
            addrs2 = response.result.addresses;
          }
          if (!Array.isArray(addrs2) || addrs2.length === 0) {
            StoreApp._showWalletError('Xverse: no se obtuvieron direcciones');
            StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
            StoreApp._emit('wallet');
            resolve(null);
            return;
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
          if (!ordAddr2.publicKey) {
            StoreApp._showWalletError('Xverse: no se obtuvo la clave publica');
            StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
            StoreApp._emit('wallet');
            resolve(null);
            return;
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
          localStorage.setItem('bitmapcore_wallet', JSON.stringify({ address: ordAddr2.address, network: 'mainnet', walletType: 'xverse' }));
          StoreApp._emit('wallet');
          resolve(ordAddr2.address);
        }).catch(function() {
          StoreApp._showWalletError('Xverse: conexion cancelada o fallida');
          StoreApp._state.wallet = { address:null, publicKey:null, balance:0, isConnected:false, network:'mainnet', walletType:null };
          StoreApp._emit('wallet');
          resolve(null);
        });
      } else {
        StoreApp._showWalletError('No se detecto ninguna wallet. Instala Unisat o Xverse.');
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
