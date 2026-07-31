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
  var vm = ConnectionWalletViewModel;
  var _a = React.useState(vm.getAssets());
  var assets = _a[0];
  var setAssets = _a[1];
  var _b = React.useState(vm.isConnected());
  var isConnected = _b[0];
  var setIsConnected = _b[1];
  var _c = React.useState(false);
  var isSyncing = _c[0];
  var setIsSyncing = _c[1];

  React.useEffect(function() {
    var unsubWallet = vm.subscribe('wallet', function(w) { setIsConnected(w.isConnected); });
    var unsubAssets = vm.subscribe('assets', function(a) { setAssets(a || []); });
    return function() { unsubWallet(); unsubAssets(); };
  }, []);

  var handleSync = function() {
    setIsSyncing(true);
    vm.syncAssetsFromServer().then(function() { setIsSyncing(false); }).catch(function() { setIsSyncing(false); });
  };

  var handleSell = function(asset) {
    if (!vm.isConnected()) { return; }
    navigate('/local/sell/' + asset.inscriptionId);
  };

  return React.createElement('div', { className: 'p-4 lg:p-6' },
    React.createElement('div', { className: 'max-w-5xl mx-auto space-y-4' },
      React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4' },
        React.createElement('h2', { className: 'font-alfaslab text-xl text-white' }, I18n.t('wallet.myAssets')),
        React.createElement('div', { className: 'flex items-center gap-2' },
          vm.getLastSync() && isConnected ? React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted hidden sm:block' }, BitmapUtils.timeAgo(vm.getLastSync())) : null,
          React.createElement('button', {
            onClick: handleSync,
            disabled: isSyncing || !isConnected,
            className: 'px-3 py-1.5 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-xs rounded hover:border-bitmap-orange transition-colors disabled:opacity-50'
          }, isSyncing ? 'Sincronizando...' : 'Sincronizar')
        )
      ),
      !isConnected ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' },
        React.createElement('p', null, 'Conecta tu wallet para ver tus activos'),
        React.createElement('button', {
          onClick: function() { navigate('/wallet'); },
          className: 'mt-4 px-4 py-2 bg-bitmap-orange text-white rounded-lg font-alfaslab text-sm'
        }, 'Conectar Wallet')
      ) :
      assets.length === 0 ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' },
        React.createElement('p', null, 'No hay activos guardados localmente'),
        React.createElement('button', {
          onClick: handleSync,
          disabled: isSyncing,
          className: 'mt-4 px-4 py-2 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-sm rounded hover:border-bitmap-orange transition-colors'
        }, isSyncing ? 'Sincronizando...' : 'Sincronizar desde servidor')
      ) :
      React.createElement('div', { className: 'overflow-x-auto' },
        React.createElement('table', { className: 'w-full text-sm font-acme' },
          React.createElement('thead', null,
            React.createElement('tr', { className: 'text-left text-bitmap-muted border-b border-bitmap-border' },
              React.createElement('th', { className: 'py-2 px-3 w-10' }, '#'),
              React.createElement('th', { className: 'py-2 px-3 w-16' }, 'Imagen'),
              React.createElement('th', { className: 'py-2 px-3' }, 'Nombre'),
              React.createElement('th', { className: 'py-2 px-3' }, 'Bloque'),
              React.createElement('th', { className: 'py-2 px-3 hidden md:table-cell' }, 'Inscription ID'),
              React.createElement('th', { className: 'py-2 px-3' }, 'Precio'),
              React.createElement('th', { className: 'py-2 px-3 hidden sm:table-cell' }, 'Fecha'),
              React.createElement('th', { className: 'py-2 px-3 w-24' }, 'Acciones')
            )
          ),
          React.createElement('tbody', { className: 'divide-y divide-bitmap-border' },
            assets.map(function(asset, i) {
              return React.createElement('tr', { key: asset.inscriptionId || i, className: 'hover:bg-bitmap-surface' },
                React.createElement('td', { className: 'py-2 px-3 text-bitmap-muted' }, i + 1),
                React.createElement('td', { className: 'py-2 px-3' },
                  asset.image ? React.createElement('img', { src: asset.image, alt: '', className: 'w-12 h-12 object-cover rounded bg-bitmap-black' }) :
                  React.createElement('div', { className: 'w-12 h-12 rounded bg-bitmap-black overflow-hidden' },
                    React.createElement(MondrianCanvas, { blockNumber: asset.blockNumber || i, transactions: [], size: 48 })
                  )
                ),
                React.createElement('td', { className: 'py-2 px-3 font-alfaslab text-white truncate max-w-[120px]' }, asset.name || '#' + (asset.blockNumber || '?')),
                React.createElement('td', { className: 'py-2 px-3 text-bitmap-orange' }, '#' + (asset.blockNumber || '?')),
                React.createElement('td', { className: 'py-2 px-3 text-xs text-bitmap-text truncate max-w-[100px] hidden md:table-cell' }, asset.inscriptionId ? asset.inscriptionId.slice(0, 20) + '...' : '-'),
                React.createElement('td', { className: 'py-2 px-3 text-bitmap-orange-light' }, asset.pricePaid ? (asset.pricePaid / 100000000).toFixed(5) + ' BTC' : '-'),
                React.createElement('td', { className: 'py-2 px-3 text-bitmap-muted hidden sm:table-cell' }, asset.dateAdded ? BitmapUtils.timeAgo(asset.dateAdded) : '-'),
                React.createElement('td', { className: 'py-2 px-3' },
                  React.createElement('button', {
                    onClick: function() { handleSell(asset); },
                    className: 'px-2 py-1 bg-bitmap-orange text-white font-alfaslab text-xs rounded hover:bg-bitmap-orange/80 transition-colors'
                  }, 'Vender')
                )
              );
            })
          )
        )
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
