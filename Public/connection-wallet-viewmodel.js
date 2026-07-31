var ConnectionWalletViewModel = {
  _state: {
    address: null,
    publicKey: null,
    walletType: null,
    isConnected: false,
    balance: 0,
    assets: [],
    lastSync: null
  },
  _listeners: {},
  _storageKey: 'bitmapcore-wallet',

  init: function() {
    this._loadFromLocalStorage();
    this._listenWalletEvents();
    this._tryRestoreSession();
  },

  _loadFromLocalStorage: function() {
    try {
      var stored = localStorage.getItem(this._storageKey);
      if (stored) {
        var data = JSON.parse(stored);
        this._state.address = data.address || null;
        this._state.publicKey = data.publicKey || null;
        this._state.walletType = data.walletType || null;
        this._state.isConnected = data.isConnected || false;
        this._state.assets = data.assets || [];
        this._state.balance = data.balance || 0;
        this._state.lastSync = data.lastSync || null;
      }
    } catch (e) { console.error('Error loading wallet:', e); }
  },

  _saveToLocalStorage: function() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify({
        address: this._state.address,
        publicKey: this._state.publicKey,
        walletType: this._state.walletType,
        isConnected: this._state.isConnected,
        assets: this._state.assets,
        balance: this._state.balance,
        lastSync: this._state.lastSync
      }));
    } catch (e) { console.error('Error saving wallet:', e); }
  },

  _tryRestoreSession: function() {
    var self = this;
    if (window.unisat) {
      window.unisat.getAccounts().then(function(accounts) {
        if (accounts && accounts.length > 0 && !self._state.isConnected) {
          var address = accounts[0];
          return window.unisat.getPublicKey().then(function(pubKey) {
            self._state.address = address;
            self._state.publicKey = pubKey;
            self._state.walletType = 'unisat';
            self._state.isConnected = true;
            self._saveToLocalStorage();
            self._listenWalletEvents();
            self._emit('wallet');
          });
        }
      }).catch(function() {});
    }
    if (window.satsConnect) {
      // Xverse restore would go here if needed
    }
  },

  connectWallet: function(type) {
    var self = this;
    return new Promise(function(resolve, reject) {
      if (type === 'unisat' && window.unisat) {
        window.unisat.requestAccounts().then(function(accounts) {
          if (!accounts || accounts.length === 0) {
            return reject(new Error('No se detectaron cuentas en UniSat'));
          }
          var address = accounts[0];
          return window.unisat.getPublicKey().then(function(pubKey) {
            self._state.address = address;
            self._state.publicKey = pubKey;
            self._state.walletType = 'unisat';
            self._state.isConnected = true;
            self._saveToLocalStorage();
            self._listenWalletEvents();
            self._emit('wallet');
            resolve(address);
          });
        }).catch(reject);
      } else if (type === 'xverse' && window.satsConnect) {
        window.satsConnect.getAddress({
          purposes: ['ordinals', 'payment'],
          network: { type: 'Mainnet' }
        }).then(function(result) {
          var addr = result.addresses && result.addresses[0] ? result.addresses[0].address : null;
          if (addr) {
            self._state.address = addr;
            self._state.publicKey = addr;
            self._state.walletType = 'xverse';
            self._state.isConnected = true;
            self._saveToLocalStorage();
            self._emit('wallet');
            resolve(addr);
          } else reject(new Error('No address'));
        }).catch(reject);
      } else {
        reject(new Error('Wallet no disponible'));
      }
    });
  },

  disconnectWallet: function() {
    this._state.address = null;
    this._state.publicKey = null;
    this._state.walletType = null;
    this._state.isConnected = false;
    this._state.balance = 0;
    this._state.assets = [];
    this._state.lastSync = null;
    this._saveToLocalStorage();
    this._emit('wallet');
    this._emit('assets');
  },

  _listenWalletEvents: function() {
    var self = this;
    if (this._state.walletType === 'unisat' && window.unisat) {
      window.unisat.on('accountsChanged', function(accounts) {
        if (accounts && accounts.length > 0) {
          self._state.address = accounts[0];
          window.unisat.getPublicKey().then(function(pubKey) {
            self._state.publicKey = pubKey;
            self._saveToLocalStorage();
            self._emit('wallet');
          });
        } else {
          self.disconnectWallet();
        }
      });
    }
  },

  signPsbt: function(psbt, options) {
    if (!this._state.isConnected) return Promise.reject(new Error('Wallet no conectada'));
    if (this._state.walletType === 'unisat' && window.unisat) {
      return window.unisat.signPsbt(psbt, options || { autoFinalize: true });
    }
    return Promise.reject(new Error('Wallet no soporta PSBT'));
  },

  signMessage: function(message) {
    if (!this._state.isConnected) return Promise.reject(new Error('Wallet no conectada'));
    if (this._state.walletType === 'unisat' && window.unisat) {
      var sigType = this._state.address && this._state.address.startsWith('bc1p') ? 'bip322-simple' : 'ecdsa';
      return window.unisat.signMessage(message, sigType);
    }
    return Promise.reject(new Error('Wallet no soporta signMessage'));
  },

  getAssets: function() { return this._state.assets; },

  addAsset: function(asset) {
    var exists = this._state.assets.some(function(a) { return a.inscriptionId === asset.inscriptionId; });
    if (!exists) {
      this._state.assets.unshift(asset);
      this._saveToLocalStorage();
      this._emit('assets');
    }
  },

  removeAsset: function(inscriptionId) {
    this._state.assets = this._state.assets.filter(function(a) { return a.inscriptionId !== inscriptionId; });
    this._saveToLocalStorage();
    this._emit('assets');
  },

  clearAssets: function() {
    this._state.assets = [];
    this._saveToLocalStorage();
    this._emit('assets');
  },

  syncAssetsFromServer: function() {
    var self = this;
    if (!this._state.address) return Promise.resolve();
    return fetch('/api/v1/bitmaps/owner/' + this._state.address)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var inscriptions = (data && data.data && data.data.inscriptions) || data.inscriptions || data || [];
        self._state.assets = Array.isArray(inscriptions) ? inscriptions.map(function(ins) {
          return {
            inscriptionId: ins.inscriptionId || ins.id,
            name: ins.name || 'Bitmap #' + (ins.blockNumber || '?'),
            blockNumber: ins.blockNumber,
            image: ins.imageUrl || ins.image,
            pricePaid: ins.pricePaid || 0,
            dateAdded: Date.now(),
            listingId: ins.listingId
          };
        }) : [];
        self._state.lastSync = Date.now();
        self._saveToLocalStorage();
        self._emit('assets');
      })
      .catch(function(e) { console.error('Sync failed:', e); });
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
    for (var i = 0; i < listeners.length; i++) listeners[i](this._getStateForKey(key));
  },

  _getStateForKey: function(key) {
    if (key === 'wallet') return {
      address: this._state.address,
      publicKey: this._state.publicKey,
      walletType: this._state.walletType,
      isConnected: this._state.isConnected,
      balance: this._state.balance
    };
    if (key === 'assets') return this._state.assets;
    return this._state;
  },

  getAddress: function() { return this._state.address; },
  getPublicKey: function() { return this._state.publicKey; },
  getWalletType: function() { return this._state.walletType; },
  isConnected: function() { return this._state.isConnected; },
  getBalance: function() { return this._state.balance; },
  getLastSync: function() { return this._state.lastSync; }
};

ConnectionWalletViewModel.init();