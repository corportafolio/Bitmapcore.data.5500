function WalletConnectPage(props) {
  var navigate = props.navigate;
  var wallet = StoreApp.get('wallet');
  var _a = React.useState(false);
  var isConnecting = _a[0];
  var setIsConnecting = _a[1];

  var handleConnect = function() {
    setIsConnecting(true);
    StoreApp.connectWallet().then(function() { setIsConnecting(false); }).catch(function() { setIsConnecting(false); });
  };

  var updateWallet = function() { wallet = StoreApp.get('wallet'); };
  React.useEffect(function() {
    var unsub = StoreApp.subscribe('wallet', updateWallet);
    return unsub;
  }, []);

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-md mx-auto space-y-6' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white text-center' }, I18n.t('wallet.connect')),
        !wallet.isConnected ? React.createElement('div', { className:'space-y-4' },
          React.createElement('p', { className:'font-acme text-sm text-bitmap-text text-center' }, I18n.t('wallet.connectPrompt')),
          React.createElement('button', {
            onClick:handleConnect, disabled:isConnecting,
            className:'w-full py-3 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
          }, isConnecting ? I18n.t('app.loading') : I18n.t('wallet.connect'))
        ) : React.createElement('div', { className:'space-y-4' },
          React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4 space-y-3' },
            React.createElement('div', { className:'flex justify-between' },
              React.createElement('span', { className:'font-alfaslab text-sm text-bitmap-muted' }, I18n.t('wallet.address')),
              React.createElement('span', { className:'font-acme text-sm text-white truncate max-w-[200px]' }, wallet.address)
            ),
            React.createElement('div', { className:'flex justify-between' },
              React.createElement('span', { className:'font-alfaslab text-sm text-bitmap-muted' }, I18n.t('wallet.balance')),
              React.createElement('span', { className:'font-acme text-sm text-bitmap-orange-light' }, (wallet.balance || 0).toFixed(8) + ' BTC')
            )
          ),
          React.createElement('button', {
            onClick:function() { navigate('/wallet/dashboard'); },
            className:'w-full py-3 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-sm rounded-lg hover:border-bitmap-orange transition-colors'
          }, I18n.t('wallet.dashboard')),
          React.createElement('button', {
            onClick:function() { navigate('/mis-activos'); },
            className:'w-full py-3 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-sm rounded-lg hover:border-bitmap-orange transition-colors'
          }, I18n.t('wallet.myAssets')),
          React.createElement('button', {
            onClick:StoreApp.disconnectWallet,
            className:'w-full py-3 text-bitmap-red font-alfaslab text-sm rounded-lg hover:bg-bitmap-red/10 transition-colors'
          }, I18n.t('wallet.disconnect'))
        )
      )
  );
}

function WalletDashboardPage(props) {
  var navigate = props.navigate;
  var wallet = StoreApp.get('wallet');

  if (!wallet.isConnected) {
    return React.createElement('div', { className:'flex items-center justify-center h-full' },
      React.createElement('div', { className:'text-center' },
        React.createElement('p', { className:'font-acme text-bitmap-muted mb-4' }, I18n.t('wallet.notConnected')),
        React.createElement('button', {
          onClick:function() { navigate('/wallet'); },
          className:'px-4 py-2 bg-bitmap-orange text-white rounded-lg font-alfaslab text-sm'
        }, I18n.t('wallet.connect'))
      )
    );
  }

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-md mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, 'Wallet Dashboard'),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
          React.createElement('div', { className:'text-center' },
            React.createElement('div', { className:'font-acme text-3xl text-bitmap-orange-light font-bold' }, (wallet.balance || 0).toFixed(8)),
            React.createElement('div', { className:'font-acme text-sm text-bitmap-muted' }, 'BTC')
          )
        ),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
          React.createElement('div', { className:'font-alfaslab text-sm text-bitmap-muted mb-1' }, I18n.t('wallet.address')),
          React.createElement('div', { className:'font-acme text-xs text-white break-all' }, wallet.address)
        ),
        React.createElement('button', {
          onClick:function() { navigate('/mis-activos'); },
          className:'w-full py-3 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-sm rounded-lg hover:border-bitmap-orange transition-colors'
        }, I18n.t('wallet.myAssets'))
      )
  );
}

function MisActivosPage(props) {
  var navigate = props.navigate;
  var wallet = StoreApp.get('wallet');
  var _a = React.useState([]);
  var assets = _a[0];
  var setAssets = _a[1];
  var _b = React.useState(true);
  var isLoading = _b[0];
  var setIsLoading = _b[1];

  React.useEffect(function() {
    if (!wallet.address) { setIsLoading(false); return; }
    setIsLoading(true);
    MisActivosApi.getByAddress(wallet.address).then(function(data) {
      var items = (data && data.data && data.data.inscriptions) || data.inscriptions || data || [];
      setAssets(Array.isArray(items) ? items : []);
      setIsLoading(false);
    }).catch(function() { setIsLoading(false); });
  }, [wallet.address]);

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, I18n.t('wallet.myAssets')),
        !wallet.isConnected ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('wallet.connectPrompt')) :
        isLoading ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
        assets.length === 0 ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, 'No se encontraron activos') :
        React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' },
          assets.map(function(asset, i) {
            return React.createElement('div', { key:i, className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3' },
              React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black' },
                asset.image ? React.createElement('img', { src:asset.image, alt:'', className:'w-full h-full object-cover' }) :
                React.createElement(MondrianCanvas, { blockNumber:asset.blockNumber || i, transactions:[], size:150 })
              ),
              React.createElement('div', { className:'font-alfaslab text-xs text-white truncate' }, asset.name || '#' + (asset.blockNumber || i))
            );
          })
        )
      )
  );
}

function TransactionPage(props) {
  var navigate = props.navigate;
  var txId = props.txId;

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-md mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, 'Transacción #' + txId),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4 space-y-3' },
          React.createElement('div', { className:'flex justify-between' },
            React.createElement('span', { className:'font-alfaslab text-sm text-bitmap-muted' }, 'Estado'),
            React.createElement('span', { className:'font-acme text-sm text-bitmap-green' }, 'Pendiente')
          ),
          React.createElement('div', { className:'flex justify-between' },
            React.createElement('span', { className:'font-alfaslab text-sm text-bitmap-muted' }, 'TX ID'),
            React.createElement('span', { className:'font-acme text-xs text-white truncate max-w-[180px]' }, txId)
          )
        )
      )
  );
}

function PSBTPage(props) {
  var navigate = props.navigate;
  var _a = React.useState('');
  var psbt = _a[0];
  var setPsbt = _a[1];
  var _b = React.useState('');
  var toast = _b[0];
  var setToast = _b[1];

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-md mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, I18n.t('psbt.title')),
        React.createElement('textarea', {
          value:psbt,
          onChange:function(e) { setPsbt(e.target.value); },
          placeholder:I18n.t('psbt.placeholder'),
          className:'w-full h-40 bg-bitmap-surface border border-bitmap-border rounded-lg px-4 py-3 font-acme text-xs text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange resize-none'
        }),
        React.createElement('button', {
          onClick:function() { setToast(I18n.t('psbt.notAvailable')); },
          disabled:!psbt,
          className:'w-full py-3 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
        }, I18n.t('psbt.sign'))
    ),
    toast ? React.createElement(Toast, { message:toast, type:'info', onDone:function() { setToast(''); } }) : null
  );
}
