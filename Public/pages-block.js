function PantallaDeBloqueEspecifico(props) {
  var navigate = props.navigate;
  var routeParams = ReactRouterDOM.useParams();
  var blockId = routeParams.id;
  var _a = React.useState(null);
  var currentBlock = _a[0];
  var setCurrentBlock = _a[1];
  var _b = React.useState(true);
  var isLoading = _b[0];
  var setIsLoading = _b[1];
  var _c = React.useState([]);
  var listings = _c[0];
  var setListings = _c[1];
  var _d = React.useState(false);
  var listingsLoading = _d[0];
  var setListingsLoading = _d[1];
  var _e = React.useState(false);
  var showBuyMenu = _e[0];
  var setShowBuyMenu = _e[1];
  var _f = React.useState(null);
  var buyStatus = _f[0];
  var setBuyStatus = _f[1];
  var _g = React.useState(null);
  var buySuccessData = _g[0];
  var setBuySuccessData = _g[1];
  var _h = React.useState(null);
  var toastMsg = _h[0];
  var setToastMsg = _h[1];
  var _i = React.useState(null);
  var mempoolFees = _i[0];
  var setMempoolFees = _i[1];
  var _j = React.useState('media');
  var selectedFeeRate = _j[0];
  var setSelectedFeeRate = _j[1];
  var _k = React.useState('');
  var customFeeStr = _k[0];
  var setCustomFeeStr = _k[1];
  var _l = React.useState(false);
  var showCustomFee = _l[0];
  var setShowCustomFee = _l[1];
  var _m = React.useState(null);
  var btcPrice = _m[0];
  var setBtcPrice = _m[1];

  var showToast = function(message, type) {
    setToastMsg({ message: message, type: type || 'error' });
    setTimeout(function() { setToastMsg(null); }, 20000);
  };

  var fetchMempoolFees = function() {
    fetch('https://mempool.space/api/v1/fees/recommended')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setMempoolFees({
          fastestFee: d.fastestFee || 3,
          halfHourFee: d.halfHourFee || 3,
          hourFee: d.hourFee || 1,
          economyFee: d.economyFee || 1,
          minimumFee: d.minimumFee || 1
        });
      })
      .catch(function() {
        setMempoolFees({ fastestFee: 3, halfHourFee: 3, hourFee: 1, economyFee: 1, minimumFee: 1 });
      });
  };

  React.useEffect(function() {
    if (!blockId) return;
    setIsLoading(true);
    BlockViewModel.getBlock(blockId).then(function(block) {
      if (!block) {
        setIsLoading(false);
        return;
      }
      setCurrentBlock(block);
      setIsLoading(false);
    }).catch(function() {
      setIsLoading(false);
    });
  }, [blockId]);

  React.useEffect(function() {
    if (!blockId) return;
    var num = parseInt(blockId);
    if (isNaN(num)) return;
    setListingsLoading(true);
    fetch('/api/v1/bitmap/' + num + '/listings')
      .then(function(r) { return r.json(); })
      .then(function(res) {
        var arr = res && res.data ? res.data : [];
        setListings(Array.isArray(arr) ? arr : []);
      })
      .catch(function() { setListings([]); })
      .then(function() { setListingsLoading(false); });
  }, [blockId]);

  React.useEffect(function() {
    fetch('/api/v1/live/rates')
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d && d.data && d.data.btcPrice !== null) setBtcPrice(d.data.btcPrice); })
      .catch(function() {});
  }, []);

  if (isLoading) {
    return React.createElement('div', { className:'flex items-center justify-center h-full font-acme text-bitmap-muted' }, I18n.t('app.loading'));
  }

  if (!currentBlock) {
    return React.createElement('div', { className:'flex items-center justify-center h-full font-acme text-bitmap-muted' }, 'Bloque no encontrado');
  }

  var bloque = currentBlock.bloque !== undefined ? currentBlock.bloque : blockId;
  var totalBtc = currentBlock.totalBtc || 'N/A';
  var totalTransacciones = currentBlock.totalTransacciones || 'N/A';
  var etiquetas = currentBlock.etiquetas || '';
  var hash = currentBlock.hash || '';
  var mempool = currentBlock.mempool || '';

  var sourceLabel = function(s) {
    if (s === 'ordinalswallet') return 'Ordinalswallet';
    if (s === 'unisat') return 'Unisat';
    if (s === 'local') return 'BitmapCore';
    return s;
  };
  var sourceLogo = function(s) {
    if (s === 'ordinalswallet') return 'ordinalswallet_logo.png';
    if (s === 'unisat') return 'unisat_logo.png';
    if (s === 'local') return 'logo_bitmapcore_logo.png';
    return '';
  };
  var sourceColor = function(s) {
    if (s === 'ordinalswallet') return '#8B5CF6';
    if (s === 'unisat') return '#F59E0B';
    if (s === 'local') return '#FE3E00';
    return '#888';
  };
  var openMarketplace = function(s) {
    if (s === 'ordinalswallet') window.open('https://ordinalswallet.com/collection/bitmap', '_blank');
    else if (s === 'unisat') window.open('https://unisat.io/market/collection?collectionId=bitmap', '_blank');
  };
  var pillColors = {
    'Ordinalswallet': { bg:'#1a56db', border:'#2563eb', shadow:'#3b82f6' },
    'Unisat':         { bg:'#854d0e', border:'#a16207', shadow:'#ca8a04' },
    'BitmapCore':     { bg:'#8B2500', border:'#B53D00', shadow:'#FE3E00' }
  };
  function renderMarketplacePill(name, logoSrc, onClick) {
    var tc = pillColors[name] || { bg:'#8B2500', border:'#B53D00', shadow:'#FE3E00' };
    var children = [
      React.createElement('span', {
        style: {
          display:'inline-block', backgroundColor:tc.bg, color:'#000',
          textShadow:'-1px 0 '+tc.shadow+', 0 1px '+tc.shadow+', 1px 0 '+tc.shadow+', 0 -1px '+tc.shadow,
          borderRadius:'15px', border:'1px solid '+tc.border,
          boxShadow:'inset 0 2px 6px rgba(0,0,0,0.5)',
          fontFamily:"'Alfa Slab One', serif", fontWeight:'bold', fontSize:'11px',
          padding:'2px 8px', whiteSpace:'nowrap'
        }
      }, name),
      logoSrc ? React.createElement('img', { src:logoSrc, alt:name, style:{ height:'15px', width:'15px', objectFit:'contain' } }) : null
    ];
    if (onClick) {
      return React.createElement('button', {
        onClick: onClick,
        className:'flex items-center gap-1 cursor-pointer hover:opacity-80'
      }, children);
    }
    return React.createElement('span', { className:'flex items-center gap-1' }, children);
  }

  var localListing = listings.find(function(l) { return l.source === 'local'; });
  var externalListings = listings.filter(function(l) { return l.source !== 'local'; });

  var getFeeRateSats = function() {
    if (selectedFeeRate === 'custom') {
      var v = parseInt(customFeeStr, 10);
      return Math.max(1, (v > 0) ? v : (mempoolFees ? mempoolFees.hourFee : 1));
    }
    if (!mempoolFees) return Math.max(1, 1);
    if (selectedFeeRate === 'baja') return Math.max(1, Math.floor(mempoolFees.hourFee * 0.7));
    if (selectedFeeRate === 'alta') return Math.max(1, mempoolFees.hourFee * 2);
    return Math.max(1, mempoolFees.hourFee);
  };
  var getMempoolBaja = function() { return Math.max(1, mempoolFees ? Math.floor(mempoolFees.hourFee * 0.7) : 1); };
  var getMempoolMedia = function() { return Math.max(1, mempoolFees ? mempoolFees.hourFee : 1); };
  var getMempoolAlta = function() { return Math.max(1, mempoolFees ? mempoolFees.hourFee * 2 : 3); };

  var openBuyMenu = function(e) {
    e.stopPropagation();
    var w = StoreApp.get('wallet');
    if (!w || !w.address) {
      showToast(I18n.t('toast.noWalletTrade'), 'error');
      return;
    }
    fetchMempoolFees();
    setShowBuyMenu(!showBuyMenu);
  };

  var handleBuy = async function() {
    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) {
      setShowBuyMenu(false);
      showToast(I18n.t('toast.noWalletTrade'), 'error');
      return;
    }
    if (!localListing) return;
    if (window.bcAnalytics) window.bcAnalytics.track('buy_initiated', { itemCount: 1 });

    setShowBuyMenu(true);
    setBuyStatus({ message: I18n.t('toast.preparingBatch'), type: 'loading' });
    setBuySuccessData(null);

    var buyResult = null;
    var idempotencyKey = 'block_buy_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    var bitmapIds = [localListing.bitmapId];
    var feeRate = getFeeRateSats();

    try {
      setBuyStatus({ message: I18n.t('toast.creatingPsbt') + '...', type: 'loading' });

      if (!wallet.publicKey) {
        try {
          wallet.publicKey = await StoreApp.getPublicKeyFresh();
          if (wallet.publicKey) {
            var storedWallet = localStorage.getItem(StoreApp.WALLET_STORAGE_KEY);
            if (storedWallet) {
              var sw = JSON.parse(storedWallet);
              sw.publicKey = wallet.publicKey;
              localStorage.setItem(StoreApp.WALLET_STORAGE_KEY, JSON.stringify(sw));
            }
          }
        } catch(pkErr) { /* continue without publicKey */ }
      }

      if (!wallet.publicKey) {
        setShowBuyMenu(false);
        setBuyStatus(null);
        showToast('No se pudo obtener la clave publica. Reconecte su wallet: vaya a Configuracion > Conectar wallet.', 'error');
        return;
      }

      if (!wallet.paymentPublicKey) {
        try {
          if (wallet.walletType === 'unisat') {
            wallet.paymentPublicKey = wallet.publicKey;
          } else if (wallet.walletType === 'xverse') {
            var xProvider = StoreApp._getXverseProvider();
            if (xProvider) {
              var payResp = await xProvider.request('wallet_connect', {
                addresses: ['payment'],
                message: 'BitmapCore necesita tu clave publica de pago',
                network: 'Mainnet'
              });
              var payAddrs = [];
              if (payResp && payResp.addresses) payAddrs = payResp.addresses;
              else if (payResp && payResp.result && payResp.result.addresses) payAddrs = payResp.result.addresses;
              for (var pi = 0; pi < payAddrs.length; pi++) {
                if (payAddrs[pi].purpose === 'payment' && payAddrs[pi].publicKey) {
                  wallet.paymentPublicKey = payAddrs[pi].publicKey;
                  break;
                }
              }
            }
          }
          if (wallet.paymentPublicKey) {
            var storedWallet2 = localStorage.getItem(StoreApp.WALLET_STORAGE_KEY);
            if (storedWallet2) {
              var sw2 = JSON.parse(storedWallet2);
              sw2.paymentPublicKey = wallet.paymentPublicKey;
              localStorage.setItem(StoreApp.WALLET_STORAGE_KEY, JSON.stringify(sw2));
            }
          }
        } catch(pkErr) { /* continue without paymentPublicKey */ }
      }

      var bodyPayload = {
          bitmapIds: bitmapIds,
          buyerAddress: wallet.address,
          buyerPaymentAddress: wallet.paymentAddress || wallet.address,
          buyerPaymentPublicKey: wallet.paymentPublicKey || wallet.publicKey,
          idempotencyKey: idempotencyKey,
          buyerPublicKey: wallet.publicKey,
          feeRate: feeRate
        };

      var buyRes = await fetch('/api/v1/transaction/batch-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      var buyJson = await buyRes.json();
      if (window.bcAnalytics) window.bcAnalytics.track('buy_api_response', { success: buyJson.success, itemCount: 1 });

      if (!buyJson.success || !buyJson.data || !buyJson.data.psbt) {
        var errMsg = buyJson.error && buyJson.error.message ? buyJson.error.message : (buyJson.error || 'Error al crear PSBT');
        if (typeof errMsg === 'string' && errMsg.indexOf('Saldo disponible insuficiente') !== -1) {
          throw new Error('Operación cancelada: no tienes fondos suficientes. Recarga tu billetera y vuelve a intentar la compra.');
        }
        throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
      }

      var psbtToSign = buyJson.data.psbt;
      var transactionId = buyJson.data.transactionId;
      var items = buyJson.data.items;
      var buyerInputCount = buyJson.data.buyerInputCount || 0;
      var serverMarketplaceFee = buyJson.data.marketplaceFee || 0;
      var signedPsbt = null;

      setBuyStatus({ message: I18n.t('toast.signingPsbt'), type: 'loading' });

      if (wallet.walletType === 'xverse' && StoreApp._getXverseProvider()) {
        try {
          var buyerInputIndices = [];
          for (var bi = items.length; bi < items.length + buyerInputCount; bi++) {
            buyerInputIndices.push(bi);
          }
          signedPsbt = await StoreApp._xverseSignPsbt(psbtToSign, wallet.paymentAddress || wallet.address, buyerInputIndices);
        } catch(xe) {
          throw new Error('Firma Xverse cancelada');
        }
      } else if (window.unisat && window.unisat.signPsbt) {
        try {
          var toSignInputs = [];
          for (var t = items.length; t < items.length + buyerInputCount; t++) {
            toSignInputs.push({ index: t, address: wallet.address });
          }
          var psbtHex = psbtToSign;
          if (psbtToSign && !/^[0-9a-fA-F]+$/.test(psbtToSign)) {
            psbtHex = Uint8Array.from(atob(psbtToSign), function(c) { return c.charCodeAt(0); }).reduce(function(h, b) { return h + b.toString(16).padStart(2, '0'); }, '');
          }
          signedPsbt = await window.unisat.signPsbt(psbtHex, { toSignInputs: toSignInputs });
        } catch(ue) {
          throw new Error('Firma Unisat cancelada');
        }
      } else {
        throw new Error('Wallet no disponible para firmar');
      }

      if (!signedPsbt) {
        throw new Error(I18n.t('toast.signCanceledShort'));
      }

      setBuyStatus({ message: 'IMPORTANTE: No cierre esta pestaña hasta que se complete la transacción. Enviando a la mempool, esperando confirmación...', type: 'loading' });

      var broadcastRes = await fetch('/api/v1/transaction/batch-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedPsbt: signedPsbt,
          transactionId: transactionId
        })
      });
      var broadcastText = await broadcastRes.text();
      var broadcastJson;
      try {
        broadcastJson = JSON.parse(broadcastText);
      } catch(parseErr) {
        if (broadcastRes.ok) {
          broadcastJson = { success: true, data: { txid: 'unknown_' + transactionId } };
        } else {
          throw new Error('Error del servidor (' + broadcastRes.status + '): ' + broadcastText.substring(0, 200));
        }
      }

      if (!broadcastJson.success || !broadcastJson.data) {
        var bErrMsg = broadcastJson.error && broadcastJson.error.message ? broadcastJson.error.message : (broadcastJson.error || 'Error al transmitir');
        throw new Error(typeof bErrMsg === 'string' ? bErrMsg : JSON.stringify(bErrMsg));
      }

      var txid = broadcastJson.data.txid || ('unknown_' + transactionId);

      var totalPaid = items.reduce(function(sum, item) { return sum + item.price; }, 0);
      var totalFees = serverMarketplaceFee > 0 ? serverMarketplaceFee : Math.max(546, Math.floor(totalPaid * 0.02));
      var successItems = items.map(function(item) {
        return { name: item.name || 'Bitmap comprado', status: 'success', txid: txid, price: item.price, fee: totalFees };
      });
      var errorItems = [];

      buyResult = {
        type: 'success',
        items: successItems,
        errors: errorItems,
        totalPaid: totalPaid,
        totalFees: totalFees,
        networkFees: [{ txid: txid, fee: 0 }],
        totalNetworkFee: 0,
        btcPrice: btcPrice
      };

      setBuyStatus({ message: I18n.t('marketplace.purchaseSuccessful'), type: 'done' });
      if (window.bcAnalytics) window.bcAnalytics.track('buy_completed', { successCount: 1, errorCount: 0, totalPaid: totalPaid });

      fetch('/api/v1/internal/refresh-local', { method: 'POST' }).catch(function() {});
      fetch('/api/v1/bitmap/' + bloque + '/listings')
        .then(function(r) { return r.json(); })
        .then(function(res) {
          var arr = res && res.data ? res.data : [];
          setListings(Array.isArray(arr) ? arr : []);
        })
        .catch(function() {});

    } catch(e) {
      buyResult = {
        type: 'error',
        items: [],
        errors: [{ name: bloque + '.bitmap', status: 'error', reason: e.message }],
        totalPaid: 0,
        totalFees: 0,
        networkFees: [],
        totalNetworkFee: 0,
        btcPrice: btcPrice
      };
      setBuyStatus({ message: 'Error: ' + e.message, type: 'error' });
    } finally {
      setBuySuccessData(buyResult);
      setShowBuyMenu(false);
      setBuyStatus(null);
    }
  };

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
      React.createElement('div', { className:'flex flex-col md:flex-row gap-4' },
        React.createElement('div', { className:'flex justify-center md:flex-shrink-0' },
          React.createElement(MondrianCanvas, {
            blockNumber: Number(bloque),
            totalTransactions: parseInt(totalTransacciones) || 0,
            hash: hash,
            isPerfect: etiquetas.toLowerCase().indexOf('grid') !== -1,
            isPunk: etiquetas.toLowerCase().indexOf('punk') !== -1,
            etiquetas: etiquetas,
            transactions: [],
            size: 240
          })
        ),
        !listingsLoading && listings.length > 0 ? React.createElement('div', { className:'flex-1 min-w-0 bg-bitmap-surface border border-bitmap-border rounded-xl p-3' },
          React.createElement('div', { className:'font-alfaslab text-sm text-white mb-2' }, 'Listado en marketplace'),
          externalListings.length > 0 ? externalListings.map(function(l, i) {
            var priceStr = BitmapUtils.formatBtcSat(l.listedPrice) + ' BTC';
            var usdStr = btcPrice ? ' \u2248 $' + ((l.listedPrice / 100000000) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '';
            return React.createElement('div', { key: 'ext-' + i, className:'flex items-center justify-between py-2 border-b border-bitmap-border/40 last:border-0' },
              renderMarketplacePill(sourceLabel(l.source), sourceLogo(l.source), function() { openMarketplace(l.source); }),
              React.createElement('div', { className:'text-right flex-shrink-0 ml-2' },
                React.createElement('div', { className:'font-acme text-xs text-white' }, priceStr),
                usdStr ? React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted' }, usdStr) : null
              )
            );
          }) : null,
          localListing ? React.createElement('div', { className:'mt-2 pt-2 border-t border-bitmap-border' },
            React.createElement('div', { className:'flex items-center justify-between mb-2' },
              renderMarketplacePill('BitmapCore', 'logo_bitmapcore_logo.png', null),
              React.createElement('div', { className:'text-right flex-shrink-0 ml-2' },
                React.createElement('div', { className:'font-acme text-xs text-white' }, BitmapUtils.formatBtcSat(localListing.listedPrice) + ' BTC'),
                btcPrice ? React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted' }, '\u2248 $' + ((localListing.listedPrice / 100000000) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' USD') : null
              )
            ),
            React.createElement('button', {
              onClick: openBuyMenu,
              className:'w-full px-3 py-2 font-acme text-xs rounded-lg font-bold transition-all',
              style: {
                background: 'linear-gradient(180deg, #FF6B35, #E8520E)',
                color: '#000',
                border: '1px solid #FF6B35',
                boxShadow: '0 2px 8px rgba(255,107,53,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
              }
            }, 'Comprar'),
            showBuyMenu ? React.createElement('div', {
              className: 'mt-2 bg-bitmap-black border border-bitmap-border rounded-lg p-3'
            },
              buyStatus && buyStatus.type === 'loading' ? React.createElement('div', { className: 'py-3 text-center' },
                React.createElement('div', { className: 'inline-block w-6 h-6 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin mb-2' }),
                React.createElement('div', { className: 'font-acme text-xs text-bitmap-muted' }, buyStatus.message)
              ) : React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'flex justify-between mb-1' },
                  React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, 'Precio:'),
                  React.createElement('span', { className: 'font-acme text-[10px] text-white' }, BitmapUtils.formatBtcSat(localListing.listedPrice) + ' BTC')
                ),
                React.createElement('div', { className: 'flex justify-between mb-1' },
                  React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, 'Fee marketplace (2%):'),
                  React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange' }, BitmapUtils.formatBtcSat(Math.max(546, Math.floor(localListing.listedPrice * 0.02))) + ' BTC')
                ),
                React.createElement('div', { className: 'flex justify-between mb-2 border-t border-bitmap-border/50 pt-1' },
                  React.createElement('span', { className: 'font-acme text-[10px] text-white font-bold' }, 'Total a pagar:'),
                  React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold' }, BitmapUtils.formatBtcSat(localListing.listedPrice + Math.max(546, Math.floor(localListing.listedPrice * 0.02))) + ' BTC')
                ),
                React.createElement('div', { className: 'mb-2' },
                  React.createElement('span', { className: 'font-acme text-[10px] block mb-1.5', style: { color: '#888' } }, 'Fee de red (sats/vB):'),
                  React.createElement('div', { className: 'flex gap-1.5' },
                    React.createElement('button', {
                      onClick: function(e) { e.stopPropagation(); setSelectedFeeRate('baja'); setShowCustomFee(false); },
                      className: 'flex-1 px-2 py-1.5 rounded font-acme text-[10px] font-bold transition-all text-center',
                      style: {
                        background: selectedFeeRate === 'baja' ? 'linear-gradient(180deg, #FFD700, #E6A800)' : '#1a1a1a',
                        color: selectedFeeRate === 'baja' ? '#000' : '#888',
                        border: '1px solid ' + (selectedFeeRate === 'baja' ? '#FFD700' : '#333')
                      }
                    }, React.createElement('div', null, I18n.t('marketplace.low')), React.createElement('div', { className: 'text-[8px]', style: { color: selectedFeeRate === 'baja' ? '#000' : '#666' } }, '~' + getMempoolBaja())),
                    React.createElement('button', {
                      onClick: function(e) { e.stopPropagation(); setSelectedFeeRate('media'); setShowCustomFee(false); },
                      className: 'flex-1 px-2 py-1.5 rounded font-acme text-[10px] font-bold transition-all text-center',
                      style: {
                        background: selectedFeeRate === 'media' ? 'linear-gradient(180deg, #FFD700, #E6A800)' : '#1a1a1a',
                        color: selectedFeeRate === 'media' ? '#000' : '#888',
                        border: '1px solid ' + (selectedFeeRate === 'media' ? '#FFD700' : '#333')
                      }
                    }, React.createElement('div', null, I18n.t('marketplace.medium')), React.createElement('div', { className: 'text-[8px]', style: { color: selectedFeeRate === 'media' ? '#000' : '#666' } }, '~' + getMempoolMedia())),
                    React.createElement('button', {
                      onClick: function(e) { e.stopPropagation(); setSelectedFeeRate('alta'); setShowCustomFee(false); },
                      className: 'flex-1 px-2 py-1.5 rounded font-acme text-[10px] font-bold transition-all text-center',
                      style: {
                        background: selectedFeeRate === 'alta' ? 'linear-gradient(180deg, #FFD700, #E6A800)' : '#1a1a1a',
                        color: selectedFeeRate === 'alta' ? '#000' : '#888',
                        border: '1px solid ' + (selectedFeeRate === 'alta' ? '#FFD700' : '#333')
                      }
                    }, React.createElement('div', null, I18n.t('marketplace.high')), React.createElement('div', { className: 'text-[8px]', style: { color: selectedFeeRate === 'alta' ? '#000' : '#666' } }, '~' + getMempoolAlta())),
                    React.createElement('button', {
                      onClick: function(e) { e.stopPropagation(); setSelectedFeeRate('custom'); setShowCustomFee(true); },
                      className: 'flex-1 px-2 py-1.5 rounded font-acme text-[10px] font-bold transition-all text-center',
                      style: {
                        background: selectedFeeRate === 'custom' ? 'linear-gradient(180deg, #A0522D, #6B3410)' : '#1a1a1a',
                        color: selectedFeeRate === 'custom' ? '#fff' : '#888',
                        border: '1px solid ' + (selectedFeeRate === 'custom' ? '#A0522D' : '#333')
                      }
                    }, 'Custom')
                  ),
                  selectedFeeRate === 'custom' ? React.createElement('div', { className: 'flex items-center gap-2 mt-2' },
                    React.createElement('input', {
                      type: 'number', min: '1', max: '100', value: customFeeStr,
                      onChange: function(e) { setCustomFeeStr(e.target.value); },
                      onClick: function(e) { e.stopPropagation(); },
                      placeholder: '1-100',
                      className: 'w-20 bg-bitmap-surface border border-bitmap-border rounded px-2 py-1 font-acme text-[10px] text-white focus:outline-none focus:border-bitmap-orange'
                    }),
                    React.createElement('span', { className: 'font-acme text-[10px]', style: { color: '#888' } }, 'sats/vB')
                  ) : null
                ),
                React.createElement('div', { className: 'flex gap-2' },
                  React.createElement('button', {
                    onClick: function(e) { e.stopPropagation(); setShowBuyMenu(false); },
                    className: 'flex-1 px-3 py-1.5 bg-bitmap-surface text-bitmap-text font-acme text-xs rounded hover:bg-bitmap-border transition-colors'
                  }, 'Cancelar'),
                  React.createElement('button', {
                    onClick: function(e) { e.stopPropagation(); handleBuy(); },
                    className: 'flex-1 px-3 py-1.5 font-acme text-xs rounded font-bold transition-all',
                    style: {
                      background: 'linear-gradient(180deg, #FF6B35, #E8520E)',
                      color: '#000',
                      border: '1px solid #FF6B35',
                      boxShadow: '0 2px 8px rgba(255,107,53,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                    }
                  }, 'Comprar')
                )
              )
            ) : null
          ) : null
        ) : null
      ),
      React.createElement('div', { className:'grid grid-cols-3 gap-2' },
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-lg p-3 text-center' },
          React.createElement('div', { className:'font-acme text-xs text-bitmap-muted mb-1' }, 'Bloque'),
          React.createElement('div', { className:'font-mono text-sm text-white' }, bloque + '.bitmap')
        ),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-lg p-3 text-center' },
          React.createElement('div', { className:'font-acme text-xs text-bitmap-muted mb-1' }, 'BTC'),
          React.createElement('div', { className:'font-alfaslab text-sm text-white' }, totalBtc)
        ),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-lg p-3 text-center' },
          React.createElement('div', { className:'font-acme text-xs text-bitmap-muted mb-1' }, 'Transacciones'),
          React.createElement('div', { className:'font-alfaslab text-sm text-white' }, totalTransacciones)
        )
      ),
      hash ? React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-lg p-3' },
        React.createElement('div', { className:'font-acme text-xs text-bitmap-muted mb-1' }, 'Hash'),
        React.createElement('div', { className:'font-acme text-xs text-bitmap-text break-all' }, hash)
      ) : null,
      etiquetas ? React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-lg p-3' },
        React.createElement('div', { className:'font-acme text-xs text-bitmap-muted mb-2' }, 'Etiquetas'),
        React.createElement(UniversalTagList, { etiquetas:etiquetas, fontSize:11, navigate:navigate })
      ) : null,
      React.createElement('button', {
        onClick:function() { navigate('/mondrian/' + bloque); },
        className:'w-full py-3 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors'
      }, 'Ver Mondrian Completo'),
      buySuccessData ? React.createElement('div', {
        className: 'fixed inset-0 z-50 flex items-center justify-center',
        style: { backgroundColor: 'rgba(0,0,0,0.8)' }
      },
        React.createElement('div', {
          className: 'relative w-full max-w-lg mx-4 rounded-xl overflow-hidden',
          style: { backgroundColor: '#111111', border: '1px solid #333', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }
        },
          React.createElement('div', { className: 'px-6 pt-6 pb-4' },
            React.createElement('div', { className: 'flex items-center gap-3 mb-4' },
              React.createElement('div', {
                className: 'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                style: { backgroundColor: buySuccessData.type === 'error' ? 'rgba(255,51,51,0.15)' : 'rgba(0,170,0,0.15)' }
              },
                buySuccessData.type === 'error' ? React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' },
                  React.createElement('path', { d: 'M18 6L6 18M6 6l12 12', stroke: '#FF5555', strokeWidth: 2.5, strokeLinecap: 'round' })
                ) : React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' },
                  React.createElement('path', { d: 'M5 13l4 4L19 7', stroke: '#00AA00', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' })
                )
              ),
              React.createElement('div', null,
                React.createElement('h2', { className: 'font-alfaslab text-lg', style: { color: buySuccessData.type === 'error' ? '#FF5555' : '#00AA00' } },
                  buySuccessData.type === 'error' ? I18n.t('marketplace.buyError') : I18n.t('marketplace.purchaseSuccessful')
                ),
                React.createElement('p', { className: 'font-acme text-xs', style: { color: '#888' } },
                  buySuccessData.type === 'error' ? I18n.t('marketplace.purchaseFailed') : buySuccessData.items.length + ' bitmap comprado exitosamente'
                )
              )
            ),
            buySuccessData.items.length > 0 ? React.createElement('div', { className: 'rounded-lg p-4 mb-4', style: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' } },
              React.createElement('div', { className: 'space-y-2' },
                buySuccessData.items.map(function(item, i) {
                  return React.createElement('div', { key: i, className: 'flex items-center justify-between' },
                    React.createElement('div', { className: 'flex items-center gap-2 min-w-0' },
                      React.createElement('div', { className: 'w-1.5 h-1.5 rounded-full flex-shrink-0', style: { backgroundColor: '#00AA00' } }),
                      React.createElement('span', { className: 'font-acme text-sm truncate', style: { color: '#ddd' } }, item.name)
                    ),
                    React.createElement('span', { className: 'font-acme text-sm flex-shrink-0 ml-3', style: { color: '#aaa' } },
                      BitmapUtils.formatBtcSat(item.price) + ' BTC'
                    )
                  );
                })
              )
            ) : null,
            buySuccessData.totalPaid > 0 ? React.createElement('div', { className: 'rounded-lg p-4 mb-4', style: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' } },
              React.createElement('div', { className: 'flex justify-between mb-2' },
                React.createElement('span', { className: 'font-acme text-xs', style: { color: '#888' } }, 'Subtotal'),
                React.createElement('span', { className: 'font-acme text-xs', style: { color: '#ccc' } }, BitmapUtils.formatBtcSat(buySuccessData.totalPaid) + ' BTC')
              ),
              React.createElement('div', { className: 'flex justify-between mb-2' },
                React.createElement('span', { className: 'font-acme text-xs', style: { color: '#888' } }, 'Fee marketplace'),
                React.createElement('span', { className: 'font-acme text-xs', style: { color: '#aaa' } }, BitmapUtils.formatBtcSat(buySuccessData.totalFees) + ' BTC')
              ),
              React.createElement('div', { className: 'flex justify-between pt-2 mt-2', style: { borderTop: '1px solid #333' } },
                React.createElement('span', { className: 'font-acme text-sm font-bold', style: { color: '#fff' } }, 'Total pagado'),
                React.createElement('span', { className: 'font-acme text-sm font-bold', style: { color: '#00AA00' } },
                  BitmapUtils.formatBtcSat(buySuccessData.totalPaid + buySuccessData.totalFees) + ' BTC'
                )
              ),
              buySuccessData.btcPrice ? React.createElement('div', { className: 'flex justify-end mt-1' },
                React.createElement('span', { className: 'font-acme text-[10px]', style: { color: '#666' } },
                  '\u2248 $' + (((buySuccessData.totalPaid + buySuccessData.totalFees) / 100000000) * buySuccessData.btcPrice).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' USD'
                )
              ) : null
            ) : null,
            buySuccessData.networkFees && buySuccessData.networkFees.length > 0 ? React.createElement('div', { className: 'mb-4' },
              React.createElement('span', { className: 'font-acme text-[10px] block mb-2', style: { color: '#666' } }, 'Transacciones:'),
              React.createElement('div', { className: 'space-y-1.5' },
                buySuccessData.networkFees.map(function(nf, i) {
                  return React.createElement('a', {
                    key: i,
                    href: 'https://mempool.space/tx/' + nf.txid,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    style: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }
                  },
                    React.createElement('span', { className: 'font-acme text-[10px] truncate flex-1', style: { color: '#aaa' } },
                      nf.txid.substring(0, 16) + '...'
                    )
                  );
                })
              )
            ) : null,
            buySuccessData.errors && buySuccessData.errors.length > 0 ? React.createElement('div', { className: 'mb-4 rounded-lg p-3', style: { backgroundColor: 'rgba(255,51,51,0.08)', border: '1px solid rgba(255,51,51,0.2)' } },
              React.createElement('span', { className: 'font-acme text-[10px] block mb-1', style: { color: '#FF5555' } }, 'Bitmap no comprado:'),
              buySuccessData.errors.map(function(err, i) {
                return React.createElement('div', { key: i, className: 'font-acme text-[10px]', style: { color: '#aa5555' } },
                  err.name + ' \u2014 ' + (err.reason || 'Error')
                );
              })
            ) : null
          ),
          React.createElement('div', { className: 'px-6 pb-6 pt-2' },
            React.createElement('button', {
              onClick: function() { setBuySuccessData(null); },
              className: 'w-full py-2.5 rounded-lg font-acme text-sm font-bold transition-colors',
              style: { background: buySuccessData.type === 'error' ? '#FF5555' : 'linear-gradient(180deg, #2F7D32, #1C4E20)', color: '#fff' }
            }, 'Aceptar')
          )
        )
      ) : null,
      toastMsg ? React.createElement(Toast, { message: toastMsg.message, type: toastMsg.type, duration: 20000, onDone: function() { setToastMsg(null); } }) : null
    )
  );
}

function MondrianPreviewPage(props) {
  var navigate = props.navigate;
  var routeParams = ReactRouterDOM.useParams();
  var blockId = routeParams.id;

  return React.createElement('div', { className:'flex items-center justify-center h-full p-4' },
    React.createElement(MondrianCanvas, { blockNumber:Number(blockId), transactions:[], size:500 })
  );
}

function BlockSearchPage(props) {
  var navigate = props.navigate;
  var _a = React.useState('');
  var query = _a[0];
  var setQuery = _a[1];
  var _b = React.useState([]);
  var results = _b[0];
  var setResults = _b[1];
  var _c = React.useState(false);
  var isSearching = _c[0];
  var setIsSearching = _c[1];

  var handleSearch = function(value) {
    setQuery(value);
    if (!value.trim()) { setResults([]); return; }
    setIsSearching(true);
    var num = parseInt(value);
    var r = [];
    if (!isNaN(num)) {
      for (var i = 0; i < 8; i++) r.push({ blockNumber:num + i, label:(num + i) + '.bitmap' });
    } else {
      r.push({ blockNumber:1, label:value });
      r.push({ blockNumber:2, label:value });
    }
    setResults(r);
    setIsSearching(false);
  };

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
      React.createElement('input', {
        type:'text', value:query,
        onChange:function(e) { handleSearch(e.target.value); },
        placeholder:I18n.t('search.placeholder'),
        className:'w-full bg-bitmap-surface border border-bitmap-border rounded-lg px-4 py-3 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange',
        autoFocus:true
      }),
      isSearching ? React.createElement('div', { className:'text-center font-acme text-sm text-bitmap-muted' }, I18n.t('search.searching')) : null,
      results.length > 0 ? React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' },
        results.map(function(r, i) {
          return React.createElement('button', {
            key:i,
            onClick:function() { navigate('/blocks/' + r.blockNumber); },
            className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all text-left'
          },
            React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black' },
              React.createElement(MondrianCanvas, { blockNumber:r.blockNumber, transactions:[], size:150 })
            ),
            React.createElement('div', { className:'font-alfaslab text-xs text-white' }, r.label)
          );
        })
      ) : null
    )
  );
}
