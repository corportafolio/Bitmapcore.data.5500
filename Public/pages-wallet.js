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
  var _a = React.useState(null);
  var data = _a[0];
  var setData = _a[1];
  var _b = React.useState(false);
  var isLoading = _b[0];
  var setIsLoading = _b[1];
  var _c = React.useState(null);
  var error = _c[0];
  var setError = _c[1];
  var _d = React.useState(null);
  var walletRef = _d[0];
  var setWalletRef = _d[1];

  React.useEffect(function() {
    var unsub = StoreApp.subscribe('wallet', function(w) { wallet = w; setWalletRef(w); });
    return unsub;
  }, []);

  var loadAssets = function() {
    var w = walletRef || wallet;
    if (!w || !w.address) { setIsLoading(false); setData(null); return; }
    setIsLoading(true);
    setError(null);
    AssetApi.getUserAssets(w.address).then(function(res) {
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error ? res.error.message : 'Error desconocido');
      }
      setIsLoading(false);
    }).catch(function(e) {
      setError(e.message || 'Error de red');
      setIsLoading(false);
    });
  };

  React.useEffect(function() {
    loadAssets();
  }, [wallet.address]);

  var total = data ? data.total : 0;
  var collections = data ? data.collections : [];

  var extractBlockNumber = function(name) {
    if (!name) return null;
    var m = name.match(/^(\d+)\.bitmap$/);
    if (m) return parseInt(m[1], 10);
    var m2 = name.match(/^\d+\.(\d+)\.bitmap$/);
    if (m2) return parseInt(m2[1], 10);
    return null;
  };

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
      React.createElement('div', { className:'flex items-center justify-between' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, 'Mis Activos (' + total + ')'),
        React.createElement('div', { className:'flex items-center gap-3' },
          wallet.isConnected ? React.createElement('button', {
            onClick:loadAssets,
            className:'text-bitmap-orange hover:text-bitmap-orange-light transition-colors font-acme text-xl',
            title:'Refresh'
          }, '\u21BB') : null,
          wallet.isConnected ? React.createElement('span', { className:'font-acme text-sm text-bitmap-muted' }, wallet.address ? wallet.address.slice(-4) : '') : null
        )
      ),
      !wallet.isConnected ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-muted mb-4' }, 'No hay wallet conectada'),
        React.createElement('button', {
          onClick:function() { StoreApp.connectWallet('unisat'); },
          className:'px-4 py-2 bg-bitmap-orange text-white rounded-lg font-alfaslab text-sm'
        }, 'Conectar Wallet')
      ) :
      isLoading ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('div', { className:'inline-block w-8 h-8 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin' }),
        React.createElement('p', { className:'font-acme text-bitmap-muted mt-4' }, I18n.t('app.loading'))
      ) :
      error ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-red mb-4' }, error),
        React.createElement('button', {
          onClick:loadAssets,
          className:'px-4 py-2 bg-bitmap-surface border border-bitmap-border text-white rounded-lg font-alfaslab text-sm'
        }, I18n.t('app.retry'))
      ) :
      collections.length === 0 ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-muted mb-4' }, 'No se encontraron activos'),
        React.createElement('button', {
          onClick:loadAssets,
          className:'px-4 py-2 bg-bitmap-surface border border-bitmap-border text-white rounded-lg font-alfaslab text-sm'
        }, 'Buscar activos')
      ) :
      React.createElement('div', { className:'space-y-3' },
        collections.map(function(col) {
          var isSpecial = col.name === 'Bitmaps' || col.name === 'Parcelas' || col.name === 'Bittick Agents';
          return React.createElement('div', {
            key:col.name,
            onClick:function() { navigate('/mis-activos/detalle/' + encodeURIComponent(col.name)); },
            className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4 cursor-pointer hover:border-bitmap-orange transition-colors'
          },
            React.createElement('div', { className:'flex items-center justify-between mb-3' },
              React.createElement('span', {
                className:'font-alfaslab text-base',
                style:{ color: isSpecial ? '#FE3E00' : '#fff' }
              }, col.name + ' (' + col.count + ')'),
              React.createElement('span', { className:'font-acme text-xs text-bitmap-muted' }, 'Ver todos \u2192')
            ),
            React.createElement('div', { className:'flex items-center gap-2 overflow-x-auto pb-1' },
              col.items.slice(0, 5).map(function(item, idx) {
                var blockNum = extractBlockNumber(item.name);
                var displayNum = item.inscriptionNumber || item.inscription_number;
                return React.createElement('div', { key:idx, className:'flex-shrink-0 flex items-center gap-2 min-w-0' },
                  React.createElement('div', { className:'w-8 h-8 rounded overflow-hidden bg-bitmap-black flex-shrink-0' },
                    blockNum ? React.createElement(MondrianCanvas, { blockNumber:blockNum, transactions:[], size:32 }) : null
                  ),
                  React.createElement('div', { className:'min-w-0' },
                    React.createElement('div', { className:'font-acme text-xs text-white truncate' },
                      item.name ? item.name : '#' + displayNum
                    ),
                    React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted' },
                      displayNum ? '#' + displayNum : ''
                    )
                  )
                );
              })
            )
          );
        })
      )
    )
  );
}

function DetallePage(props) {
  var navigate = props.navigate;
  var currentPath = props.currentPath || '';
  var collectionName = props.collectionName || '';
  if (!collectionName) {
    var parts = currentPath.split('/');
    var lastPart = parts[parts.length - 1];
    if (lastPart) collectionName = decodeURIComponent(lastPart);
  }
  var wallet = StoreApp.get('wallet');
  var _a = React.useState(null);
  var data = _a[0];
  var setData = _a[1];
  var _b = React.useState(false);
  var isLoading = _b[0];
  var setIsLoading = _b[1];
  var _c = React.useState(null);
  var error = _c[0];
  var setError = _c[1];

  React.useEffect(function() {
    if (!wallet.address) return;
    setIsLoading(true);
    AssetApi.getUserAssets(wallet.address).then(function(res) {
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error ? res.error.message : 'Error');
      }
      setIsLoading(false);
    }).catch(function(e) {
      setError(e.message);
      setIsLoading(false);
    });
  }, [wallet.address]);

  var col = null;
  if (data && data.collections) {
    for (var i = 0; i < data.collections.length; i++) {
      if (data.collections[i].name === collectionName) {
        col = data.collections[i];
        break;
      }
    }
  }

  var isBitmapCollection = collectionName === 'Bitmaps';
  var _d = React.useState([]);
  var selectionState = _d[0];
  var setSelectionState = _d[1];
  var _e = React.useState(false);
  var showListModal = _e[0];
  var setShowListModal = _e[1];
  var _f = React.useState({});
  var listingStatus = _f[0];
  var setListingStatus = _f[1];
  var _g = React.useState({});
  var blockDataMap = _g[0];
  var setBlockDataMap = _g[1];

  React.useEffect(function() {
    if (col && col.items) {
      var sel = col.items.filter(function(it) { return it.isBitmap && !it.isParcel; }).map(function(it) {
        return { id:it.id, isSelected:false, priceStr:'', priceSatoshis:0, name:it.name, inscriptionNumber:it.inscriptionNumber, output:it.output, value:it.value, contentType:it.contentType, height:it.height };
      });
      setSelectionState(sel);
    }
  }, [col]);

  React.useEffect(function() {
    if (!col || !col.items || col.items.length === 0) return;
    var blockNums = [];
    for (var i = 0; i < col.items.length; i++) {
      var num = extractBlockNumber(col.items[i].name);
      if (num && blockNums.indexOf(num) === -1) blockNums.push(num);
    }
    var fetches = blockNums.map(function(num) {
      return fetch('/api/v1/blocks/' + num)
        .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function(res) {
          if (res.success && res.data) return { key:num, data:res.data };
          return null;
        }).catch(function() { return null; });
    });
    Promise.all(fetches).then(function(results) {
      var map = {};
      for (var j = 0; j < results.length; j++) {
        if (results[j]) map[results[j].key] = results[j].data;
      }
      setBlockDataMap(map);
    });
  }, [col]);

  var extractBlockNumber = function(name) {
    if (!name) return null;
    var m = name.match(/^(\d+)\.bitmap$/);
    if (m) return parseInt(m[1], 10);
    return null;
  };

  var toggleSelection = function(idx) {
    var updated = selectionState.slice();
    updated[idx].isSelected = !updated[idx].isSelected;
    setSelectionState(updated);
  };

  var updatePrice = function(idx, val) {
    var clean = val.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
    var updated = selectionState.slice();
    updated[idx].priceStr = clean;
    updated[idx].priceSatoshis = clean ? Math.round(parseFloat(clean) * 100000000) : 0;
    setSelectionState(updated);
  };

  var handleListar = function() {
    var selected = selectionState.filter(function(it) { return it.isSelected && it.priceSatoshis > 0; });
    if (selected.length === 0) {
      setListingStatus({ toast:'Selecciona al menos un bitmap y ponle precio' });
      return;
    }
    setShowListModal(true);
  };

  var confirmListar = async function() {
    var selected = selectionState.filter(function(it) { return it.isSelected && it.priceSatoshis > 0; });
    if (selected.length === 0) return;

    setShowListModal(false);
    setListingStatus({ listing:true, count:selected.length });

    var successCount = 0;
    var errors = [];

    try {
      var pubKey = wallet.publicKey;
      if (!pubKey) {
        console.error('[Listar] No hay public key disponible. Reconecta la wallet.');
        setListingStatus({ toast:'Error: reconecta la wallet para obtener la public key' });
        return;
      }

      for (var j = 0; j < selected.length; j++) {
        var item = selected[j];
        var price = item.priceSatoshis;
        if (!item.output || !item.value) {
          console.error('[Listar] Sin datos UTXO para', item.name, 'output:', item.output, 'value:', item.value);
          errors.push(item.name + ': sin datos UTXO');
          continue;
        }
        try {
          var createRes = await fetch('/api/v1/bitmaps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inscriptionId: item.id,
              price: price,
              sellerAddress: wallet.address,
              sellerOrdinalPublicKey: pubKey || wallet.address,
              sellerPaymentAddress: wallet.address,
              name: item.name || ('Bitmap #' + item.inscriptionNumber),
              imageUrl: '',
              bitmapNumber: extractBlockNumber(item.name),
              inscriptionNumber: item.inscriptionNumber,
              inscriptionUtxo: item.output || '',
              inscriptionValue: item.value || 0,
              inscriptionContentType: item.contentType || '',
              inscriptionHeight: item.height || 0
            })
          });
          var createJson = await createRes.json();

          if (createJson.success && createJson.data && createJson.data.psbtToSign) {
            if (window.unisat && window.unisat.signPsbt) {
              try {
                var signPromise = window.unisat.signPsbt(createJson.data.psbtToSign);
                var signTimeout = new Promise(function(_, reject) {
                  setTimeout(function() { reject(new Error('timeout')); }, 15000);
                });
                var signedPsbt = await Promise.race([signPromise, signTimeout]);
                var listingId = createJson.data.listing ? createJson.data.listing.id : '';
                if (listingId && signedPsbt) {
                  var signRes = await fetch('/api/v1/bitmaps/' + listingId + '/sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      signedPsbt: signedPsbt,
                      sellerOrdinalPublicKey: pubKey || wallet.address
                    })
                  });
                  var signJson = await signRes.json();
                  if (signJson.success) {
                    successCount++;
                  } else {
                    errors.push(item.name || item.id);
                  }
                } else {
                  successCount++;
                }
              } catch(e) {
                successCount++;
              }
            } else {
              successCount++;
            }
          } else {
            errors.push(item.name || item.id);
          }
        } catch(e) {
          errors.push(item.name || item.id);
        }
      }

      var msg = successCount + ' bitmaps listados';
      if (errors.length > 0) msg += ' (' + errors.length + ' errores)';
      setListingStatus({ toast:msg });
    } catch(e) {
      setListingStatus({ toast:'Error: ' + e.message });
    }
  };

  if (!wallet.address) {
    return React.createElement('div', { className:'flex items-center justify-center h-full' },
      React.createElement('p', { className:'font-acme text-bitmap-muted' }, 'No hay wallet conectada')
    );
  }

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-5xl mx-auto space-y-4' },
      React.createElement('div', { className:'flex items-center justify-between' },
        React.createElement('div', { className:'flex items-center gap-3' },
          React.createElement('button', {
            onClick:function() { navigate('/mis-activos'); },
            className:'text-bitmap-orange font-acme text-lg hover:opacity-80'
          }, '\u2190 Volver'),
          React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, collectionName)
        ),
        isBitmapCollection ? React.createElement('button', {
          onClick:handleListar,
          className:'px-4 py-2 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors'
        }, 'Listar') : null
      ),

      listingStatus.toast ? React.createElement('div', {
        className:'bg-bitmap-green/20 border border-bitmap-green text-bitmap-green font-acme text-sm px-4 py-2 rounded-lg'
      }, listingStatus.toast) : null,

      listingStatus.listing ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('div', { className:'inline-block w-8 h-8 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin' }),
        React.createElement('p', { className:'font-acme text-bitmap-muted mt-4' }, 'Listando ' + listingStatus.count + ' bitmaps...')
      ) :

      isLoading ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('div', { className:'inline-block w-8 h-8 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin' }),
        React.createElement('p', { className:'font-acme text-bitmap-muted mt-4' }, I18n.t('app.loading'))
      ) :

      error ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-red' }, error)
      ) :

      !col ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-muted' }, 'Coleccion no encontrada')
      ) :

      isBitmapCollection ? React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' },
        selectionState.map(function(item, idx) {
          var blockNum = extractBlockNumber(item.name);
          var blockData = blockDataMap[blockNum] || {};
          var etiquetas = blockData.etiquetas || '';
          var tx = parseInt(blockData.totalTransacciones) || 0;
          var hash = blockData.hash || '';
          var isPerfect = etiquetas.indexOf('Perfect') !== -1;
          var isPunk = etiquetas.indexOf('Punk') !== -1;
          var tags = etiquetas.split('|').filter(function(t) { return t.trim() !== ''; });
          return React.createElement('div', {
            key:idx,
            className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 relative',
            style: item.isSelected ? { borderColor:'#FE3E00' } : {}
          },
            item.isSelected ? React.createElement('div', {
              className:'absolute inset-0 bg-black/30 rounded-xl z-10'
            }) : null,
            React.createElement('div', { className:'absolute top-2 left-2 z-20' },
              React.createElement('input', {
                type:'checkbox',
                checked:item.isSelected,
                onChange:function() { toggleSelection(idx); },
                style:{ width:'18px', height:'18px', accentColor:'#FE3E00' }
              })
            ),
            tags.length > 0 ? React.createElement('div', { className:'w-full mb-1 px-0.5' },
              React.createElement(UniversalTagList, { etiquetas:etiquetas, fontSize:9 })
            ) : null,
            React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black' },
              blockNum ? React.createElement('img', {
                src: '/api/v1/block-image/' + blockNum + '?size=150&etiquetas=' + encodeURIComponent(etiquetas) + '&tx=' + tx + '&hash=' + encodeURIComponent(hash) + '&perfect=' + isPerfect + '&punk=' + isPunk,
                alt:'',
                className:'w-full h-full object-cover',
                onError: function(e) { e.target.src = '/api/v1/block-image/' + blockNum + '?size=150'; }
              }) : null
            ),
            React.createElement('div', { className:'font-alfaslab text-xs text-white truncate' },
              item.name || '#' + item.inscriptionNumber
            ),
            React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted' },
              item.inscriptionNumber ? '#' + item.inscriptionNumber : ''
            ),
            item.isSelected ? React.createElement('div', { className:'mt-2 relative z-20' },
              React.createElement('input', {
                type:'text',
                inputMode:'decimal',
                placeholder:'',
                value:item.priceStr,
                onChange:function(e) { updatePrice(idx, e.target.value); },
                className:'w-full bg-bitmap-black border border-bitmap-border rounded px-2 py-1 font-acme text-xs text-white placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange'
              }),
              item.priceSatoshis > 0 ? React.createElement('div', { className:'font-acme text-[10px] text-bitmap-orange-light mt-1' },
                item.priceSatoshis.toLocaleString() + ' sats'
              ) : null
            ) : null
          );
        })
      ) :

      React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' },
        (col ? col.items : []).map(function(item, idx) {
          var blockNum = extractBlockNumber(item.name);
          var blockData = blockDataMap[blockNum] || {};
          var etiquetas = blockData.etiquetas || '';
          var tx = parseInt(blockData.totalTransacciones) || 0;
          var hash = blockData.hash || '';
          var isPerfect = etiquetas.indexOf('Perfect') !== -1;
          var isPunk = etiquetas.indexOf('Punk') !== -1;
          var tags = etiquetas.split('|').filter(function(t) { return t.trim() !== ''; });
          return React.createElement('div', { key:idx, className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3' },
            tags.length > 0 ? React.createElement('div', { className:'w-full mb-1 px-0.5' },
              React.createElement(UniversalTagList, { etiquetas:etiquetas, fontSize:9 })
            ) : null,
            React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black' },
              blockNum ? React.createElement('img', {
                src: '/api/v1/block-image/' + blockNum + '?size=150&etiquetas=' + encodeURIComponent(etiquetas) + '&tx=' + tx + '&hash=' + encodeURIComponent(hash) + '&perfect=' + isPerfect + '&punk=' + isPunk,
                alt:'',
                className:'w-full h-full object-cover',
                onError: function(e) { e.target.src = '/api/v1/block-image/' + blockNum + '?size=150'; }
              }) : null
            ),
            React.createElement('div', { className:'font-alfaslab text-xs text-white truncate' },
              item.name || '#' + item.inscriptionNumber
            ),
            React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted' },
              item.inscriptionNumber ? '#' + item.inscriptionNumber : ''
            )
          );
        })
      ),

      showListModal ? React.createElement('div', { className:'fixed inset-0 z-50 flex items-center justify-center bg-black/50' },
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6 max-w-md w-full mx-4' },
          React.createElement('h3', { className:'font-alfaslab text-lg text-white mb-4' }, 'Confirmar listado'),
          React.createElement('div', { className:'space-y-3 mb-4 max-h-60 overflow-y-auto' },
            selectionState.filter(function(it) { return it.isSelected && it.priceSatoshis > 0; }).map(function(item, idx) {
              return React.createElement('div', { key:idx, className:'flex justify-between text-sm' },
                React.createElement('span', { className:'font-acme text-white' }, item.name || '#' + item.inscriptionNumber),
                React.createElement('span', { className:'font-alfaslab text-bitmap-orange-light' }, item.priceSatoshis.toLocaleString() + ' sats')
              );
            })
          ),
          React.createElement('div', { className:'flex gap-3' },
            React.createElement('button', {
              onClick:function() { setShowListModal(false); },
              className:'flex-1 py-2 bg-bitmap-border text-white font-alfaslab text-sm rounded-lg'
            }, 'Cancelar'),
            React.createElement('button', {
              onClick:confirmListar,
              className:'flex-1 py-2 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors'
            }, 'Confirmar y Firmar')
          )
        )
      ) : null
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
