function LocalPage(props) {
  var navigate = props.navigate;
  var _a = React.useState([]);
  var listings = _a[0];
  var setListings = _a[1];
  var _b = React.useState(true);
  var isLoading = _b[0];
  var setIsLoading = _b[1];
  var _c = React.useState('');
  var searchQuery = _c[0];
  var setSearchQuery = _c[1];
  var scrollContainerRef = React.useRef(null);
  var _d = React.useState('listedAtDesc');
  var currentSort = _d[0];
  var setCurrentSort = _d[1];
  var _e = React.useState(false);
  var showSortMenu = _e[0];
  var setShowSortMenu = _e[1];
  var _f = React.useState(false);
  var showListDropdown = _f[0];
  var setShowListDropdown = _f[1];
  var _g = React.useState([]);
  var listItems = _g[0];
  var setListItems = _g[1];
  var _h = React.useState(false);
  var isLoadingDropdown = _h[0];
  var setIsLoadingDropdown = _h[1];
  var _i = React.useState(null);
  var setListingStatus = _i[1];
  var _j = React.useState('');
  var dropdownSearch = _j[0];
  var setDropdownSearch = _j[1];
  var _jb = React.useState('');
  var bulkPrice = _jb[0];
  var setBulkPrice = _jb[1];
  var _k = React.useState(false);
  var showConfirmMenu = _k[0];
  var setShowConfirmMenu = _k[1];
  var _l = React.useState([]);
  var confirmItems = _l[0];
  var setConfirmItems = _l[1];
  var _m = React.useState(false);
  var showSuccessMenu = _m[0];
  var setShowSuccessMenu = _m[1];
  var _n = React.useState([]);
  var successItems = _n[0];
  var setSuccessItems = _n[1];
  var _o = React.useState(null);
  var successToast = _o[0];
  var setSuccessToast = _o[1];
  var _buySel = React.useState([]);
  var selectedBuyItems = _buySel[0];
  var setSelectedBuyItems = _buySel[1];
  var _vm = React.useState('list');
  var viewMode = _vm[0];
  var setViewMode = _vm[1];
  var _nwl = React.useState(false);
  var noWalletForListing = _nwl[0];
  var setNoWalletForListing = _nwl[1];
  var _buyMenu = React.useState(false);
  var showBuyMenu = _buyMenu[0];
  var setShowBuyMenu = _buyMenu[1];
  var _buyStatus = React.useState(null);
  var buyStatus = _buyStatus[0];
  var setBuyStatus = _buyStatus[1];
  var _buyResult = React.useState(null);
  var buyResult = _buyResult[0];
  var setBuyResult = _buyResult[1];
  var _buySuccess = React.useState(null);
  var buySuccessData = _buySuccess[0];
  var setBuySuccessData = _buySuccess[1];
  var _p = React.useState(0);
  var totalListings = _p[0];
  var setTotalListings = _p[1];
  var _q = React.useState(0);
  var ventas = _q[0];
  var setVentas = _q[1];
  var _r = React.useState(0);
  var volumen = _r[0];
  var setVolumen = _r[1];
  var _s = React.useState(0);
  var volumen24h = _s[0];
  var setVolumen24h = _s[1];
  var _t = React.useState(null);
  var btcPrice = _t[0];
  var setBtcPrice = _t[1];
  var _feeRate = React.useState('media');
  var selectedFeeRate = _feeRate[0];
  var setSelectedFeeRate = _feeRate[1];
  var _customFeeStr = React.useState('');
  var customFeeStr = _customFeeStr[0];
  var setCustomFeeStr = _customFeeStr[1];
  var _showCustomFee = React.useState(false);
  var showCustomFee = _showCustomFee[0];
  var setShowCustomFee = _showCustomFee[1];
  var _mempoolFees = React.useState(null);
  var mempoolFees = _mempoolFees[0];
  var setMempoolFees = _mempoolFees[1];

  var fetchStats = function() {
    fetch('/api/v1/local/stats')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.success && d.data) {
          setVentas(d.data.ventas || 0);
          setVolumen(d.data.volumen || 0);
          setVolumen24h(d.data.volumen24h || 0);
        }
      }).catch(function() {});
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
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(function(r) { return r.json(); })
      .then(function(d) { setBtcPrice(d.bitcoin.usd); })
      .catch(function() {});
  }, []);

  var extractBlockNumber = function(name) {
    if (!name) return null;
    var m = name.match(/^(\d+)\.bitmap$/);
    if (m) return parseInt(m[1], 10);
    var m2 = name.match(/^\d+\.(\d+)\.bitmap$/);
    if (m2) return parseInt(m2[1], 10);
    return null;
  };

  var fetchListings = function() {
    setIsLoading(true);
    MarketplaceApi.getLocal()
      .then(function(res) {
        var items = (res.data && res.data.items) || [];
        var total = (res.data && res.data.total) || (res.data && res.data.items ? res.data.items.length : 0);
        setListings(items);
        setTotalListings(total);
        setIsLoading(false);
        fetchStats();
      })
      .catch(function() { setIsLoading(false); });
  };

  var fetchUserBitmapsForListing = function() {
    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) {
      setNoWalletForListing(true);
      return;
    }
    setNoWalletForListing(false);
    setIsLoadingDropdown(true);
    setDropdownSearch('');
    setBulkPrice('');
    setShowConfirmMenu(false);

    Promise.all([
      AssetApi.getUserAssets(wallet.address),
      MarketplaceApi.getLocal().catch(function() { return { data: { items: [] } }; })
    ]).then(function(results) {
      var res = results[0];
      var listingsRes = results[1];
      var localListings = (listingsRes && listingsRes.data && listingsRes.data.items) || [];
      var listingMap = {};
      localListings.forEach(function(l) {
        if (l.bitmapNumber) listingMap[l.bitmapNumber] = l;
        if (l.bitmapId) listingMap[l.bitmapId] = l;
      });

      if (res.success && res.data) {
        var bitmapCollection = res.data.collections.find(function(c) { return c.name === 'Bitmaps'; });
        if (bitmapCollection && bitmapCollection.items) {
          var items = bitmapCollection.items
            .filter(function(it) { return it.isBitmap && !it.isParcel; })
            .map(function(it) {
              var blockNum = extractBlockNumber(it.name);
              var existing = listingMap[blockNum] || listingMap[it.id] || null;
              return {
                id: it.id,
                name: it.name,
                inscriptionNumber: it.inscriptionNumber,
                output: it.output,
                value: it.value,
                blockNum: blockNum,
                etiquetas: '',
                hash: '',
                totalTransacciones: 0,
                isSelected: false,
                priceStr: (existing && existing.listedPrice) ? (existing.listedPrice / 100000000).toFixed(8) : '',
                priceSatoshis: existing ? existing.listedPrice : 0,
                isListed: !!existing,
                listingId: existing ? (existing.bitmapId || '') : '',
                existingPrice: existing ? existing.listedPrice : 0
              };
            });

          var uniqueBlockNums = [];
          items.forEach(function(it) { if (it.blockNum && uniqueBlockNums.indexOf(it.blockNum) === -1) uniqueBlockNums.push(it.blockNum); });

          Promise.all(uniqueBlockNums.map(function(bn) {
            return fetch('/api/v1/blocks/' + bn).then(function(r) { return r.json(); }).catch(function() { return null; });
          })).then(function(blocksRes) {
            var blockMap = {};
            blocksRes.forEach(function(r) { if (r && r.success && r.data) blockMap[r.data.blockNumber || r.data.bloque] = r.data; });
            items = items.map(function(item) {
              var bd = blockMap[item.blockNum] || {};
              return Object.assign({}, item, {
                etiquetas: bd.etiquetas || '',
                hash: bd.hash || '',
                totalTransacciones: parseInt(bd.totalTransacciones || bd.txCount) || 0
              });
            });
            setListItems(items);
            setIsLoadingDropdown(false);
          }).catch(function() {
            setListItems(items);
            setIsLoadingDropdown(false);
          });
        }
      }
    }).catch(function() { setIsLoadingDropdown(false); });
  };

  var toggleListItemSelection = function(itemId, checked) {
    var updated = listItems.map(function(item) {
      if (item.id === itemId) {
        var newItem = Object.assign({}, item, { isSelected: checked });
        if (checked && bulkPrice && parseFloat(bulkPrice) > 0) {
          newItem.priceStr = bulkPrice;
          newItem.priceSatoshis = Math.round(parseFloat(bulkPrice) * 100000000);
        }
        return newItem;
      }
      return item;
    });
    setListItems(updated);
  };

  var toggleBuySelection = function(itemId) {
    var idx = selectedBuyItems.indexOf(itemId);
    if (idx === -1) {
      setSelectedBuyItems(selectedBuyItems.concat([itemId]));
    } else {
      setSelectedBuyItems(selectedBuyItems.filter(function(id) { return id !== itemId; }));
    }
  };

  var applyBulkPrice = function(val) {
    setBulkPrice(val);
    if (val && parseFloat(val) > 0) {
      var updated = listItems.map(function(item) {
        if (item.isSelected) {
          return Object.assign({}, item, {
            priceStr: val,
            priceSatoshis: Math.round(parseFloat(val) * 100000000)
          });
        }
        return item;
      });
      setListItems(updated);
    }
  };

  var selectedCount = listItems.filter(function(i) { return i.isSelected; }).length;

  var updateListItemPrice = function(itemId, val) {
    var clean = val.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
    var updated = listItems.map(function(item) {
      if (item.id === itemId) {
        var priceStr = clean;
        var priceSatoshis = clean ? Math.round(parseFloat(clean) * 100000000) : 0;
        return Object.assign({}, item, { priceStr: priceStr, priceSatoshis: priceSatoshis });
      }
      return item;
    });
    setListItems(updated);
  };

  var handleListFromDropdown = async function() {
    var selected = listItems.filter(function(it) { return it.isSelected && it.priceSatoshis > 0; });
    if (selected.length === 0) return;

    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) return;

    setShowListDropdown(false);

    var signedPsbtHexs = null;
    var listingActivated = false;

    try {
      setListingStatus({ toast:'Preparando listings...' });
      var pubKey = wallet.publicKey;
      if (!pubKey) {
        setListingStatus({ toast:'Obteniendo clave publica...' });
        try {
          pubKey = await StoreApp.getPublicKeyFresh();
        } catch(pke) {
          setListingStatus({ toast:'Error: no se pudo obtener la clave publica de la wallet' });
          return;
        }
      }
      if (!pubKey) {
        setListingStatus({ toast:'Error: reconecta la wallet para obtener la clave publica' });
        return;
      }

      var batchItems = selected.map(function(item) {
        var isPriceUpdate = item.isListed && item.existingPrice > 0 && item.priceSatoshis !== item.existingPrice;
        return {
          inscriptionId: item.id,
          price: item.priceSatoshis,
          sellerAddress: wallet.address,
          sellerOrdinalPublicKey: pubKey,
          sellerPaymentAddress: wallet.paymentAddress || wallet.address,
          name: item.name || ('Bitmap #' + item.inscriptionNumber),
          imageUrl: '',
          bitmapNumber: item.blockNum || extractBlockNumber(item.name),
          inscriptionNumber: item.inscriptionNumber,
          inscriptionUtxo: item.output,
          inscriptionValue: item.value,
          inscriptionContentType: '',
          inscriptionHeight: 0,
          isPriceUpdate: isPriceUpdate
        };
      });

      setListingStatus({ toast:'Creando listings...' });
      var createRes = await MarketplaceApi.batchList(batchItems);
      var createJson = await createRes;

      if (createJson.success && createJson.data) {
        var psbtToSigns = createJson.data.psbtToSigns || [];
        var psbtHexArray = psbtToSigns.map(function(p) { return p.unsignedPsbtHex; });
        var combinedPsbtB64 = createJson.data.psbtToSign || null;

        if (wallet.walletType === 'xverse' && StoreApp._getXverseProvider()) {
          try {
            setListingStatus({ toast:'Firmando en Xverse...' });
            signedPsbtHexs = [];
            for (var xi = 0; xi < psbtToSigns.length; xi++) {
              setListingStatus({ toast:'Firmando listing ' + (xi + 1) + ' de ' + psbtToSigns.length + ' en Xverse...' });
              var singleSigned = await StoreApp._xverseSignPsbt(psbtToSigns[xi].unsignedPsbtHex, wallet.address, [0]);
              signedPsbtHexs.push(singleSigned);
            }
          } catch(xe) {
            setListingStatus({ toast:'Xverse: firma cancelada o fallida' });
          }
        } else if (window.unisat && window.unisat.signPsbt) {
          try {
            setListingStatus({ toast:'Firmando en Unisat...' });
            signedPsbtHexs = [];
            for (var ui = 0; ui < psbtHexArray.length; ui++) {
              var singleSigned = await window.unisat.signPsbt(psbtHexArray[ui], {
                autoFinalized: false,
                toSignInputs: [{ index: 0, address: wallet.address, sighashTypes: [0x83], useTweakedSigner: true }]
              });
              signedPsbtHexs.push(singleSigned);
            }
          } catch(ue) {
            setListingStatus({ toast:'Unisat: firma cancelada o fallida' });
          }
        } else {
          setListingStatus({ toast:'Wallet no disponible para firmar' });
        }

        if (signedPsbtHexs && signedPsbtHexs.length > 0) {
          var listingIds = createJson.data.listingIds || [];
          if (listingIds.length > 0) {
            setListingStatus({ toast:'Activando listings...' });
            await MarketplaceApi.batchSign(listingIds, signedPsbtHexs, pubKey);
            listingActivated = true;
          }
          setSuccessItems(selected);
          setShowSuccessMenu(true);
        } else {
          setListingStatus({ toast:'Firma cancelada. Los listings permanecen inactivos.' });
        }
      } else {
        setListingStatus({ toast:'Error al crear listings' });
      }
    } catch(e) {
      setListingStatus({ toast:'Error: ' + e.message });
    } finally {
      await fetchListings();
      fetch('/api/v1/internal/refresh-local', { method: 'POST' }).then(function() {
        if (typeof UnifiedViewModel !== 'undefined') {
          UnifiedViewModel.loadFromCacheOnly();
        }
      }).catch(function() {});
      if (listingActivated) {
        setSuccessToast({ message: selected.length + ' bitmaps listados correctamente', type: 'success' });
        setTimeout(function() { setSuccessToast(null); }, 20000);
      } else if (signedPsbtHexs) {
        setSuccessToast({ message: 'No se pudo completar el listado', type: 'error' });
        setTimeout(function() { setSuccessToast(null); }, 20000);
      }
    }
  };

  React.useEffect(function() {
    fetchListings();
    var interval = setInterval(fetchListings, 300000);
    return function() { clearInterval(interval); };
  }, []);

  React.useEffect(function() {
    if (!showSortMenu && !showListDropdown && !showBuyMenu) return;
    var close = function() { setShowSortMenu(false); setShowListDropdown(false); setShowBuyMenu(false); };
    window.addEventListener('click', close);
    return function() { window.removeEventListener('click', close); };
  }, [showSortMenu, showListDropdown, showBuyMenu]);

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

  var handleBuySelected = async function() {
    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) {
      setShowBuyMenu(false);
      setSuccessToast({ message: 'No hay wallet conectada, conecte su wallet para comerciar activos.', type: 'error' });
      setTimeout(function() { setSuccessToast(null); }, 20000);
      return;
    }

    var selected = filtered.filter(function(item) {
      return selectedBuyItems.indexOf(item.bitmapId || item.id) !== -1;
    });

    if (selected.length === 0) return;

    setShowBuyMenu(true);
    setBuyStatus({ message: 'Preparando compra batch...', type: 'loading' });
    setBuyResult(null);
    setBuySuccessData(null);

    var buyResult = null;
    var idempotencyKey = 'batch_buy_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    var bitmapIds = selected.map(function(item) { return item.bitmapId || item.id; });
    var feeRate = getFeeRateSats();

    try {
      setBuyStatus({ message: 'Creando PSBT batch para ' + selected.length + ' bitmaps...', type: 'loading' });

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
        setSuccessToast({ message: 'No se pudo obtener la clave publica. Reconecte su wallet: vaya a Configuracion > Conectar wallet.', type: 'error' });
        setTimeout(function() { setSuccessToast(null); }, 20000);
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
            var storedWallet = localStorage.getItem(StoreApp.WALLET_STORAGE_KEY);
            if (storedWallet) {
              var sw = JSON.parse(storedWallet);
              sw.paymentPublicKey = wallet.paymentPublicKey;
              localStorage.setItem(StoreApp.WALLET_STORAGE_KEY, JSON.stringify(sw));
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

      if (!buyJson.success || !buyJson.data || !buyJson.data.psbt) {
        var errMsg = buyJson.error && buyJson.error.message ? buyJson.error.message : (buyJson.error || 'Error al crear PSBT batch');
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

      setBuyStatus({ message: 'Firmando PSBT en wallet...', type: 'loading' });

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
        throw new Error('Firma cancelada');
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
        var bErrMsg = broadcastJson.error && broadcastJson.error.message ? broadcastJson.error.message : (broadcastJson.error || 'Error al transmitir batch');
        throw new Error(typeof bErrMsg === 'string' ? bErrMsg : JSON.stringify(bErrMsg));
      }

      var txid = broadcastJson.data.txid || ('unknown_' + transactionId);

      var totalPaid = items.reduce(function(sum, item) { return sum + item.price; }, 0);
      var totalFees = serverMarketplaceFee > 0 ? serverMarketplaceFee : Math.max(546 * items.length, Math.floor(totalPaid * 0.02));
      var successItems = items.map(function(item) {
        return { name: item.name || 'Bitmap comprado', status: 'success', txid: txid, price: item.price, fee: Math.round(totalFees / items.length) };
      });
      var errorItems = [];

      var networkFees = [{ txid: txid, fee: 0 }];

      var totalNetworkFee = networkFees.reduce(function(sum, nf) { return sum + nf.fee; }, 0);

      buyResult = {
        type: 'success',
        items: successItems,
        errors: errorItems,
        totalPaid: totalPaid,
        totalFees: totalFees,
        networkFees: networkFees,
        totalNetworkFee: totalNetworkFee,
        btcPrice: btcPrice
      };

      setBuyStatus({ message: 'Compra batch exitosa: ' + successItems.length + ' bitmaps', type: 'done' });

    } catch(e) {
      var errorItems = selected.map(function(item) {
        return { name: '#' + (item.bitmapNumber || '?') + '.bitmap', status: 'error', reason: e.message };
      });
      var totalPaid = 0;
      var totalFees = 0;

      buyResult = {
        type: 'error',
        items: [],
        errors: errorItems,
        totalPaid: totalPaid,
        totalFees: totalFees,
        networkFees: [],
        totalNetworkFee: 0,
        btcPrice: btcPrice
      };

      setBuyStatus({ message: 'Error: ' + e.message, type: 'error' });
    } finally {
      if (buyResult && buyResult.type === 'success' && bitmapIds && bitmapIds.length > 0) {
        var soldSet = {};
        bitmapIds.forEach(function(id) { soldSet[id] = true; });
        setListings(listings.filter(function(l) {
          return !soldSet[l.bitmapId || l.id];
        }));
      }
      setBuySuccessData(buyResult);
      setSelectedBuyItems([]);
      setShowBuyMenu(false);
      fetchListings();
      fetch('/api/v1/internal/refresh-local', { method: 'POST' }).catch(function() {});
    }
  };

  var handleSort = function(sort) {
    setCurrentSort(sort);
    setShowSortMenu(false);
  };

  var handleRefresh = function() {
    fetchListings();
  };

  var sortButtons = [
    { key: 'listedAtDesc', label: 'Recientes' },
    { key: 'priceDesc', label: '$ Alto' },
    { key: 'priceAsc', label: '$ Bajo' }
  ];
  var sortLabel = { listedAtDesc: 'Recientes', priceDesc: '$ Alto', priceAsc: '$ Bajo' };

  var filtered = listings.filter(function(l) {
    return !searchQuery || String(l.bitmapNumber || l.name || '').indexOf(searchQuery) !== -1;
  }).sort(function(a, b) {
    var pa = a.listedPrice || a.price || 0;
    var pb = b.listedPrice || b.price || 0;
    if (currentSort === 'priceAsc') return pa - pb;
    if (currentSort === 'priceDesc') return pb - pa;
    return (b.listedAt || 0) - (a.listedAt || 0);
  });

  var floorPrice = listings.length > 0
    ? Math.min.apply(null, listings.map(function(l) { return (l.listedPrice || l.price) || Infinity; }).filter(function(p) { return p < Infinity; }))
    : 0;
  var floorBtc = floorPrice > 0 ? (floorPrice / 100000000).toFixed(5) : 'N/A';

  var volumeBtc = volumen > 0 ? (volumen / 100000000).toFixed(4) + ' BTC' : '0 BTC';
  var volume24hBtc = volumen24h > 0 ? (volumen24h / 100000000).toFixed(4) + ' BTC' : '0 BTC';
  var pisoBtc = floorPrice > 0 ? (floorPrice / 100000000).toFixed(8) : '0';

  var usd = function(sats) { return btcPrice ? '$' + ((sats / 100000000) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'; };
  var pisoUsd = floorPrice > 0 ? usd(floorPrice) : '-';
  var volumeUsd = volumen > 0 ? '$' + ((volumen / 100000000) * (btcPrice || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-';
  var volume24hUsd = volumen24h > 0 ? '$' + ((volumen24h / 100000000) * (btcPrice || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-';

  var renderMarketplaceTags = function(etiquetas) {
    var tags = etiquetas ? etiquetas.split('|').filter(function(t) { return t.trim() !== ''; }) : [];
    var count = tags.length;
    return React.createElement('div', { className: 'flex items-center gap-1 min-w-0 overflow-hidden whitespace-nowrap' },
      React.createElement('span', { className: 'font-acme text-[9px] text-bitmap-muted flex-shrink-0' },
        count + ' tags'
      ),
      React.createElement('div', { className: 'flex items-center gap-1 min-w-0 overflow-hidden' },
        tags.map(function(tag, i) {
          return React.createElement(UniversalTag, {
            key: i,
            text: tag.trim(),
            fontSize: 9
          });
        })
      )
    );
  };

  return React.createElement('div', { className: 'flex flex-col h-full' },
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border pl-14 pr-4 py-2', style: { backgroundColor: '#1A1A1A' } },
      React.createElement('div', { className: 'flex items-stretch justify-between' },
        React.createElement('div', { className: 'flex items-center gap-2 flex-shrink-0' },
          React.createElement('img', { src: 'BITMAP.png', alt: 'BitmapCore', className: 'h-[45px] w-[45px] object-contain rounded my-[2px]' }),
          React.createElement('span', { className: 'font-alfaslab text-sm text-white tracking-wide pt-1' }, 'Bitmapcore Marketplace')
        ),
        React.createElement('div', { className: 'flex items-stretch' },
          React.createElement('div', { className: 'flex flex-col items-center px-2 border-r border-[#555]' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, 'Piso Global'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, pisoBtc + ' BTC'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, pisoUsd)
          ),
          React.createElement('div', { className: 'flex flex-col items-center px-2 border-r border-[#555]' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, 'Volumen'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, volumeBtc),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, volumeUsd)
          ),
          React.createElement('div', { className: 'flex flex-col items-center px-2 border-r border-[#555]' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, 'Vol 24H'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, volume24hBtc),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, volume24hUsd)
          ),
          React.createElement('div', { className: 'flex flex-col items-center px-2 border-r border-[#555]' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, 'listados'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, BitmapUtils.formatNumber(totalListings)),
            React.createElement('span', null)
          ),
          React.createElement('div', { className: 'flex flex-col items-center px-2' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, 'Ventas'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, BitmapUtils.formatNumber(ventas)),
            React.createElement('span', null)
          )
        )
      )
    ),
    React.createElement('div', { className: 'pl-14 pr-4 py-1 border-b border-bitmap-border flex items-center gap-2 sticky top-0 z-10', style: { backgroundColor: '#080008' } },
      React.createElement('input', {
        type: 'text',
        value: searchQuery,
        onChange: function(e) { setSearchQuery(e.target.value); },
        placeholder: 'Buscar por numero de bitmap...',
        className: 'flex-1 bg-bitmap-black border border-bitmap-border rounded-lg px-3 py-1 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange transition-colors'
      }),
      React.createElement('div', { className: 'relative flex-shrink-0' },
        selectedBuyItems.length > 0 ? React.createElement('button', {
          onClick: function(e) {
            e.stopPropagation();
            var w = StoreApp.get('wallet');
            if (!w || !w.address) {
              setShowBuyMenu(false);
              setSuccessToast({ message: 'No hay wallet conectada, conecte su wallet para comerciar activos.', type: 'error' });
              setTimeout(function() { setSuccessToast(null); }, 20000);
              return;
            }
            fetchMempoolFees();
            setShowBuyMenu(!showBuyMenu);
          },
          className: 'px-3 py-1 bg-bitmap-orange text-black font-acme text-xs rounded-lg hover:bg-bitmap-orange/80 transition-colors flex-shrink-0 font-bold'
        }, 'Comprar ' + selectedBuyItems.length + ' seleccionados') : React.createElement('button', {
          disabled: true,
          className: 'px-3 py-1 bg-bitmap-orange text-black font-acme text-xs rounded-lg flex-shrink-0 font-bold opacity-50'
        }, 'Comprar seleccionados'),
        showBuyMenu ? React.createElement('div', {
          className: 'absolute right-0 top-full mt-1 w-80 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-2 max-h-[32rem] overflow-y-auto'
        },
          buyStatus && buyStatus.type === 'loading' ? React.createElement('div', { className: 'px-3 py-3 text-center' },
            React.createElement('div', { className: 'inline-block w-6 h-6 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin mb-2' }),
            React.createElement('div', { className: 'font-acme text-xs text-bitmap-muted mb-1' }, buyStatus.message),
            React.createElement('div', { className: 'w-full bg-bitmap-surface rounded h-1 mt-2' },
              React.createElement('div', { className: 'bg-bitmap-orange h-1 rounded', style: { width: '50%', animation: 'pulse 1.5s infinite' } })
            )
          ) :
          buyResult ? React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'px-3 py-2 border-b border-bitmap-border' },
              React.createElement('span', { className: 'font-acme text-xs text-white font-bold' }, 'Resultado de compra')
            ),
            React.createElement('div', { className: 'px-3 py-2 max-h-48 overflow-y-auto' },
              buyResult.results.map(function(r, i) {
                return React.createElement('div', { key: i, className: 'flex items-center justify-between py-1 border-b border-bitmap-border/30 last:border-0' },
                  React.createElement('span', { className: 'font-acme text-xs text-white truncate' }, r.name),
                  r.status === 'success' ? React.createElement('span', { className: 'font-acme text-[10px] text-green-400 flex-shrink-0 ml-2' }, '\u2713 Comprado') :
                  React.createElement('span', { className: 'font-acme text-[10px] text-red-400 flex-shrink-0 ml-2' }, r.reason || 'Error')
                );
              })
            ),
            React.createElement('div', { className: 'px-3 py-2 border-t border-bitmap-border' },
              React.createElement('div', { className: 'flex justify-between mb-1' },
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, 'Total pagado:'),
                React.createElement('span', { className: 'font-acme text-[10px] text-white' }, (buyResult.totalPaid / 100000000).toFixed(8) + ' BTC')
              ),
              React.createElement('div', { className: 'flex justify-between mb-2' },
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, 'Fee marketplace:'),
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange' }, (buyResult.totalFees / 100000000).toFixed(8) + ' BTC')
              ),
              React.createElement('button', {
                onClick: function(e) { e.stopPropagation(); setShowBuyMenu(false); setBuyResult(null); setBuyStatus(null); },
                className: 'w-full px-3 py-1.5 bg-bitmap-surface text-bitmap-text font-acme text-xs rounded hover:bg-bitmap-border transition-colors'
              }, 'Cerrar')
            )
          ) :
          React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'px-3 py-2 border-b border-bitmap-border' },
              React.createElement('span', { className: 'font-acme text-xs text-white font-bold' }, 'Confirmar compra')
            ),
            React.createElement('div', { className: 'px-3 py-2 max-h-32 overflow-y-auto' },
              filtered.filter(function(item) {
                return selectedBuyItems.indexOf(item.bitmapId || item.id) !== -1;
              }).map(function(item) {
                var priceSats = item.listedPrice || item.price || 0;
                return React.createElement('div', { key: item.bitmapId || item.id, className: 'flex items-center justify-between py-1 border-b border-bitmap-border/30 last:border-0' },
                  React.createElement('span', { className: 'font-acme text-xs text-white truncate' }, '#' + (item.bitmapNumber || '?') + '.bitmap'),
                  React.createElement('span', { className: 'font-acme text-xs text-white flex-shrink-0 ml-2' }, (priceSats / 100000000).toFixed(8) + ' BTC')
                );
              })
            ),
            React.createElement('div', { className: 'px-3 py-2 border-t border-bitmap-border' },
              React.createElement('div', { className: 'flex justify-between mb-1' },
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, 'Subtotal (' + selectedBuyItems.length + ' items):'),
                React.createElement('span', { className: 'font-acme text-[10px] text-white' },
                  (filtered.filter(function(item) { return selectedBuyItems.indexOf(item.bitmapId || item.id) !== -1; }).reduce(function(sum, item) { return sum + (item.listedPrice || item.price || 0); }, 0) / 100000000).toFixed(8) + ' BTC'
                )
              ),
              React.createElement('div', { className: 'flex justify-between mb-1' },
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, 'Fee marketplace (2%):'),
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange' },
                  (filtered.filter(function(item) { return selectedBuyItems.indexOf(item.bitmapId || item.id) !== -1; }).reduce(function(sum, item) { return sum + Math.max(546, Math.floor((item.listedPrice || item.price || 0) * 0.02)); }, 0) / 100000000).toFixed(8) + ' BTC'
                )
              ),
              React.createElement('div', { className: 'flex justify-between mb-2 border-t border-bitmap-border/50 pt-1' },
                React.createElement('span', { className: 'font-acme text-[10px] text-white font-bold' }, 'Total a pagar:'),
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold' },
                  (filtered.filter(function(item) { return selectedBuyItems.indexOf(item.bitmapId || item.id) !== -1; }).reduce(function(sum, item) { var p = item.listedPrice || item.price || 0; return sum + p + Math.max(546, Math.floor(p * 0.02)); }, 0) / 100000000).toFixed(8) + ' BTC'
                )
              ),
              (function() {
                var w = StoreApp.get('wallet');
                var buyerOrd = w && w.address ? w.address : '';
                var buyerPay = w && w.paymentAddress ? w.paymentAddress : '';
                var sellerItem = filtered.find(function(item) { return selectedBuyItems.indexOf(item.bitmapId || item.id) !== -1; });
                var sellerOrd = sellerItem ? (sellerItem.sellerAddress || sellerItem.ownerAddress || '') : '';
                var sellerPay = sellerItem ? (sellerItem.sellerPaymentAddress || '') : '';
                var hasSellerPay = sellerPay && sellerPay !== sellerOrd;
                var hasBuyerPay = buyerPay && buyerPay !== buyerOrd;
                return React.createElement('div', { className: 'rounded-lg p-3 mb-2', style: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' } },
                  React.createElement('div', { className: 'flex items-center gap-1.5 mb-2' },
                    React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none' },
                      React.createElement('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', stroke: '#FFD700', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                    ),
                    React.createElement('span', { className: 'font-acme text-[10px] font-bold', style: { color: '#FFD700' } }, 'Direcciones de la transaccion')
                  ),
                  React.createElement('div', { className: 'space-y-1.5' },
                    React.createElement('div', null,
                      React.createElement('span', { className: 'font-acme text-[9px] block', style: { color: '#888' } }, 'Vendedor:'),
                      React.createElement('span', { className: 'font-acme text-[10px] block truncate', style: { color: '#ccc', fontFamily: 'monospace' } },
                        sellerOrd ? BitmapUtils.truncateAddress(sellerOrd, 8) : '---'
                      )
                    ),
                    hasSellerPay ? React.createElement('div', null,
                      React.createElement('span', { className: 'font-acme text-[9px] block', style: { color: '#888' } }, 'Pago del vendedor:'),
                      React.createElement('span', { className: 'font-acme text-[10px] block truncate', style: { color: '#FFAA00', fontFamily: 'monospace' } },
                        BitmapUtils.truncateAddress(sellerPay, 8)
                      )
                    ) : null,
                    React.createElement('div', { className: hasSellerPay || hasBuyerPay ? 'pt-1 mt-1' : '', style: (hasSellerPay || hasBuyerPay) ? { borderTop: '1px solid #333' } : {} },
                      React.createElement('span', { className: 'font-acme text-[9px] block', style: { color: '#888' } }, 'Comprador:'),
                      React.createElement('span', { className: 'font-acme text-[10px] block truncate', style: { color: '#00AA00', fontFamily: 'monospace' } },
                        buyerOrd ? BitmapUtils.truncateAddress(buyerOrd, 8) : '---'
                      )
                    ),
                    hasBuyerPay ? React.createElement('div', null,
                      React.createElement('span', { className: 'font-acme text-[9px] block', style: { color: '#888' } }, 'Pago del comprador:'),
                      React.createElement('span', { className: 'font-acme text-[10px] block truncate', style: { color: '#00AA00', fontFamily: 'monospace' } },
                        BitmapUtils.truncateAddress(buyerPay, 8)
                      )
                    ) : null
                  )
                );
              })(),
              React.createElement('div', { className: 'mb-2' },
                React.createElement('span', { className: 'font-acme text-[10px] block mb-1.5', style: { color: '#888' } }, 'Fee de red (sats/vB):'),
                React.createElement('div', { className: 'flex gap-1.5' },
                  React.createElement('button', {
                    onClick: function(e) { e.stopPropagation(); setSelectedFeeRate('baja'); setShowCustomFee(false); },
                    className: 'flex-1 px-2 py-1.5 rounded font-acme text-[10px] font-bold transition-all text-center',
                    style: {
                      background: selectedFeeRate === 'baja' ? 'linear-gradient(180deg, #FFD700, #E6A800)' : '#1a1a1a',
                      color: selectedFeeRate === 'baja' ? '#000' : '#888',
                      border: '1px solid ' + (selectedFeeRate === 'baja' ? '#FFD700' : '#333'),
                      boxShadow: selectedFeeRate === 'baja' ? '0 2px 8px rgba(255,215,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                    }
                  }, React.createElement('div', null, 'Baja'), React.createElement('div', { className: 'text-[8px]', style: { color: selectedFeeRate === 'baja' ? '#000' : '#666' } }, '~' + getMempoolBaja())),
                  React.createElement('button', {
                    onClick: function(e) { e.stopPropagation(); setSelectedFeeRate('media'); setShowCustomFee(false); },
                    className: 'flex-1 px-2 py-1.5 rounded font-acme text-[10px] font-bold transition-all text-center',
                    style: {
                      background: selectedFeeRate === 'media' ? 'linear-gradient(180deg, #FFD700, #E6A800)' : '#1a1a1a',
                      color: selectedFeeRate === 'media' ? '#000' : '#888',
                      border: '1px solid ' + (selectedFeeRate === 'media' ? '#FFD700' : '#333'),
                      boxShadow: selectedFeeRate === 'media' ? '0 2px 8px rgba(255,215,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                    }
                  }, React.createElement('div', null, 'Media'), React.createElement('div', { className: 'text-[8px]', style: { color: selectedFeeRate === 'media' ? '#000' : '#666' } }, '~' + getMempoolMedia())),
                  React.createElement('button', {
                    onClick: function(e) { e.stopPropagation(); setSelectedFeeRate('alta'); setShowCustomFee(false); },
                    className: 'flex-1 px-2 py-1.5 rounded font-acme text-[10px] font-bold transition-all text-center',
                    style: {
                      background: selectedFeeRate === 'alta' ? 'linear-gradient(180deg, #FFD700, #E6A800)' : '#1a1a1a',
                      color: selectedFeeRate === 'alta' ? '#000' : '#888',
                      border: '1px solid ' + (selectedFeeRate === 'alta' ? '#FFD700' : '#333'),
                      boxShadow: selectedFeeRate === 'alta' ? '0 2px 8px rgba(255,215,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none'
                    }
                  }, React.createElement('div', null, 'Alta'), React.createElement('div', { className: 'text-[8px]', style: { color: selectedFeeRate === 'alta' ? '#000' : '#666' } }, '~' + getMempoolAlta())),
                  React.createElement('button', {
                    onClick: function(e) { e.stopPropagation(); setSelectedFeeRate('custom'); setShowCustomFee(true); },
                    className: 'flex-1 px-2 py-1.5 rounded font-acme text-[10px] font-bold transition-all text-center',
                    style: {
                      background: selectedFeeRate === 'custom' ? 'linear-gradient(180deg, #A0522D, #6B3410)' : '#1a1a1a',
                      color: selectedFeeRate === 'custom' ? '#fff' : '#888',
                      border: '1px solid ' + (selectedFeeRate === 'custom' ? '#A0522D' : '#333'),
                      boxShadow: selectedFeeRate === 'custom' ? '0 2px 8px rgba(160,82,45,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
                    }
                  }, 'Custom')
                ),
                selectedFeeRate === 'custom' ? React.createElement('div', { className: 'flex items-center gap-2 mt-2' },
                  React.createElement('input', {
                    type: 'number',
                    min: '1',
                    max: '100',
                    value: customFeeStr,
                    onChange: function(e) { setCustomFeeStr(e.target.value); },
                    onClick: function(e) { e.stopPropagation(); },
                    placeholder: '1-100',
                    className: 'w-20 bg-bitmap-surface border border-bitmap-border rounded px-2 py-1 font-acme text-[10px] text-white focus:outline-none focus:border-bitmap-orange',
                    style: { fontSize: '10px' }
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
                  onClick: function(e) { e.stopPropagation(); handleBuySelected(); },
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
          )
        ) : null
      ),
      React.createElement('div', { className: 'relative flex-shrink-0' },
        React.createElement('button', {
          onClick: function(e) { e.stopPropagation(); fetchUserBitmapsForListing(); setShowListDropdown(true); },
          disabled: isLoadingDropdown,
          className: 'px-3 py-1 bg-bitmap-orange text-black font-acme text-xs rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
        }, isLoadingDropdown ? 'Cargando...' : 'Listar'),
showListDropdown ? React.createElement('div', {
            className: 'absolute right-0 top-full mt-1 w-80 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-2 max-h-[32rem] overflow-y-auto'
          },
            isLoadingDropdown ? React.createElement('div', { className: 'p-3 text-center font-acme text-xs text-bitmap-muted' }, 'Cargando bitmaps...') :
            showConfirmMenu ? React.createElement(React.Fragment, null,
              React.createElement('div', { className: 'px-3 py-2 border-b border-bitmap-border flex items-center gap-2' },
                React.createElement('button', {
                  onClick: function(e) { e.stopPropagation(); setShowConfirmMenu(false); },
                  className: 'text-bitmap-muted hover:text-white transition-colors'
                }, '\u2190'),
                React.createElement('span', { className: 'font-acme text-xs text-white font-bold' }, 'Confirmar listado')
              ),
              React.createElement('div', { className: 'px-3 py-2 max-h-64 overflow-y-auto' },
                confirmItems.map(function(item) {
                  var isIncomplete = !item.priceStr || item.priceSatoshis <= 0;
                  return React.createElement('div', {
                    key: item.id,
                    className: 'flex items-center justify-between py-1.5 border-b border-bitmap-border/30 last:border-0'
                  },
                    React.createElement('div', { className: 'flex items-center gap-2 min-w-0' },
                      React.createElement('span', { className: 'font-acme text-xs text-white truncate' },
                        '#' + (item.blockNum || '?') + '.bitmap'
                      ),
                      item.isListed ? React.createElement('span', {
                        className: 'px-1 py-0.5 bg-bitmap-border/50 text-bitmap-muted font-acme text-[8px] rounded flex-shrink-0'
                      }, 'Listado') : React.createElement('span', {
                        className: 'px-1 py-0.5 bg-bitmap-border/50 text-bitmap-muted font-acme text-[8px] rounded flex-shrink-0'
                      }, 'No Listado')
                    ),
                    React.createElement('span', { className: 'font-acme text-xs flex-shrink-0 ml-2', style: { color: '#666666' } },
                      item.priceStr + ' BTC'
                    )
                  );
                })
              ),
              React.createElement('div', { className: 'p-2 border-t border-bitmap-border flex gap-2' },
                React.createElement('button', {
                  onClick: function(e) { e.stopPropagation(); setShowConfirmMenu(false); },
                  className: 'flex-1 px-3 py-1.5 bg-bitmap-surface text-bitmap-text font-acme text-xs rounded hover:bg-bitmap-border transition-colors'
                }, 'Atr\u00e1s'),
                React.createElement('button', {
                  onClick: function(e) { e.stopPropagation(); handleListFromDropdown(); },
                  className: 'flex-1 px-3 py-1.5 bg-bitmap-orange text-white font-acme text-xs rounded hover:bg-bitmap-orange/80 transition-colors'
                }, 'Confirmar')
              )
            ) :
            showSuccessMenu ? React.createElement(React.Fragment, null,
              React.createElement('div', { className: 'px-3 py-2 border-b border-bitmap-border flex items-center gap-2' },
                React.createElement('span', { className: 'font-acme text-xs text-white font-bold' }, '\u2713 \u00c9xito')
              ),
              React.createElement('div', { className: 'px-3 py-2 max-h-64 overflow-y-auto' },
                successItems.map(function(item) {
                  return React.createElement('div', {
                    key: item.id,
                    className: 'flex items-center justify-between py-1.5 border-b border-bitmap-border/30 last:border-0'
                  },
                    React.createElement('div', { className: 'flex items-center gap-2 min-w-0' },
                      React.createElement('span', { className: 'font-acme text-xs text-white truncate' },
                        '#' + (item.blockNum || '?') + '.bitmap'
                      ),
                      item.isListed ? React.createElement('span', {
                        className: 'px-1 py-0.5 bg-bitmap-border/50 text-bitmap-muted font-acme text-[8px] rounded flex-shrink-0'
                      }, 'Listado') : React.createElement('span', {
                        className: 'px-1 py-0.5 bg-bitmap-border/50 text-bitmap-muted font-acme text-[8px] rounded flex-shrink-0'
                      }, 'No Listado')
                    ),
                    React.createElement('span', { className: 'font-acme text-xs flex-shrink-0 ml-2', style: { color: '#666666' } },
                      item.priceStr + ' BTC'
                    )
                  );
                })
              ),
              React.createElement('div', { className: 'p-2 border-t border-bitmap-border' },
                React.createElement('button', {
                  onClick: function(e) { e.stopPropagation(); setShowSuccessMenu(false); setShowListDropdown(false); },
                  className: 'w-full px-3 py-1.5 bg-bitmap-surface text-bitmap-text font-acme text-xs rounded hover:bg-bitmap-border transition-colors'
                }, 'Cerrar')
              )
            ) :
            noWalletForListing ? React.createElement('div', { className: 'p-4 text-center' },
              React.createElement('div', { className: 'font-acme text-sm text-bitmap-muted mb-2' }, 'No hay wallet conectada'),
              React.createElement('div', { className: 'font-acme text-xs text-bitmap-muted' }, 'Conecte una wallet para listar sus activos.')
            ) :
            listItems.length === 0 ? React.createElement('div', { className: 'p-3 text-center font-acme text-xs text-bitmap-muted' }, 'No hay bitmaps disponibles') :
            React.createElement(React.Fragment, null,
              React.createElement('div', { className: 'px-3 pb-2 border-b border-bitmap-border/50' },
                React.createElement('input', {
                  type: 'text',
                  value: dropdownSearch,
                  onChange: function(e) { setDropdownSearch(e.target.value); },
                  placeholder: 'Buscar por # de bloque...',
                  className: 'w-full bg-bitmap-surface border border-bitmap-border rounded px-2 py-1 font-acme text-xs text-white placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange',
                  onClick: function(e) { e.stopPropagation(); }
                })
              ),
              React.createElement('div', { className: 'flex items-center justify-between px-3 py-2 border-b border-bitmap-border/50' },
                React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted' },
                  selectedCount > 0 ? selectedCount + ' seleccionado' + (selectedCount > 1 ? 's' : '') : 'Sin seleccionar'
                ),
                React.createElement('input', {
                  type: 'text',
                  value: bulkPrice,
                  onChange: function(e) { applyBulkPrice(e.target.value); },
                  onClick: function(e) { e.stopPropagation(); },
                  placeholder: 'Precio BTC',
                  className: 'w-20 bg-bitmap-black border border-bitmap-border rounded px-1 py-0.5 font-acme text-xs text-white text-right placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange'
                })
              ),
              listItems.filter(function(item) {
                if (!dropdownSearch) return true;
                var q = dropdownSearch.toLowerCase();
                return (item.blockNum && String(item.blockNum).indexOf(q) !== -1) ||
                       (item.name && item.name.toLowerCase().indexOf(q) !== -1) ||
                       (item.inscriptionNumber && String(item.inscriptionNumber).indexOf(q) !== -1);
              }).map(function(item, idx) {
                var imgSrc = item.blockNum ? '/api/v1/block-image/' + item.blockNum + '?size=80&etiquetas=' + encodeURIComponent(item.etiquetas || '') + '&tx=' + (item.totalTransacciones || 0) + '&hash=' + encodeURIComponent(item.hash || '') + '&perfect=false&punk=false' : '';
                return React.createElement('div', {
                  key: item.id,
                  className: 'px-3 py-2 hover:bg-bitmap-surface transition-colors border-b border-bitmap-border/50'
                },
                  React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('input', {
                      type: 'checkbox',
                      checked: item.isSelected,
                      onChange: function(e) { toggleListItemSelection(item.id, e.target.checked); },
                      onClick: function(e) { e.stopPropagation(); },
                      className: 'w-4 h-4',
                      style: { accentColor: item.isSelected ? '#00AA00' : '#666666', color: item.isSelected ? '#00AA00' : '#666666' }
                    }),
                    imgSrc ? React.createElement('img', {
                      src: imgSrc,
                      className: 'w-[30px] h-[30px] rounded object-cover flex-shrink-0',
                      onError: function(e) { e.target.style.display = 'none'; }
                    }) : null,
                    React.createElement('div', { className: 'flex-1 min-w-0' },
                      React.createElement('div', { className: 'flex items-center gap-1' },
                        React.createElement('span', { className: 'font-acme text-xs text-white truncate' },
                          '#' + (item.blockNum || '?') + '.bitmap'
                        ),
                        item.isListed ? React.createElement('span', {
                          className: 'px-1 py-0.5 bg-bitmap-orange/20 text-bitmap-orange font-acme text-[8px] rounded flex-shrink-0'
                        }, 'Listado') : React.createElement('span', {
                          className: 'px-1 py-0.5 bg-green-500/20 text-green-400 font-acme text-[8px] rounded flex-shrink-0'
                        }, 'No Listado')
                      ),
                      React.createElement('div', { className: 'font-acme text-[10px] text-bitmap-muted' },
                        '#' + (item.inscriptionNumber || '')
                      )
                    ),
                    React.createElement('input', {
                      type: 'text',
                      value: item.priceStr,
                      onChange: function(e) { updateListItemPrice(item.id, e.target.value); },
                      onClick: function(e) { e.stopPropagation(); },
                      placeholder: 'BTC',
                      className: 'w-20 bg-bitmap-black border border-bitmap-border rounded px-1 py-0.5 font-acme text-xs text-white placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange'
                    })
                  )
                );
              }),
              React.createElement('div', { className: 'p-2 border-t border-bitmap-border' },
                React.createElement('button', {
                  onClick: function(e) {
                    e.stopPropagation();
                    var selected = listItems.filter(function(i) { return i.isSelected && i.priceSatoshis > 0; });
                    if (selected.length === 0) return;
                    setConfirmItems(selected);
                    setShowConfirmMenu(true);
                  },
                  disabled: listItems.filter(function(i) { return i.isSelected && i.priceSatoshis > 0; }).length === 0,
                  className: 'w-full px-3 py-1.5 bg-bitmap-orange text-white font-acme text-xs rounded hover:bg-bitmap-orange/80 disabled:opacity-50'
                }, 'Listar seleccionados')
              )
            )
            )
          : null
        ),
        React.createElement('div', { className: 'flex items-center gap-1 flex-shrink-0' },
          React.createElement('button', {
            onClick: function(e) { e.stopPropagation(); setViewMode(viewMode === 'list' ? 'grid' : 'list'); },
            className: 'px-2 py-1 rounded font-acme text-xs bg-bitmap-surface text-bitmap-text border border-bitmap-border hover:border-bitmap-orange transition-colors',
            title: viewMode === 'list' ? 'Vista cuadros' : 'Vista lista'
          }, viewMode === 'list' ? '\u25A6' : '\u2261'),
          React.createElement('div', { className: 'relative' },
            React.createElement('button', {
              onClick: function(e) { e.stopPropagation(); setShowSortMenu(!showSortMenu); },
              className: 'px-2 py-1 rounded font-acme text-xs bg-bitmap-surface text-bitmap-text border border-bitmap-border hover:border-bitmap-orange transition-colors'
            }, 'orden: ' + sortLabel[currentSort] + ' \u25BE'),
          showSortMenu ? React.createElement('div', {
            className: 'absolute right-0 top-full mt-1 w-32 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1'
          },
            sortButtons.map(function(btn) {
              return React.createElement('button', {
                key: btn.key,
                onClick: function(e) { e.stopPropagation(); handleSort(btn.key); setShowSortMenu(false); },
                className: 'w-full px-3 py-1.5 text-left font-acme text-xs transition-colors ' +
                  (currentSort === btn.key ? 'bg-bitmap-orange text-black font-bold' : 'text-bitmap-text hover:bg-bitmap-surface')
              }, btn.label);
            })
          ) : null
          )
      )
    ),

    isLoading
      ? React.createElement('div', { className: 'flex items-center justify-center py-16' },
          React.createElement('div', { className: 'font-acme text-bitmap-muted' }, 'Cargando datos...')
        )
      : React.createElement('div', { ref: scrollContainerRef, className: 'flex-1 overflow-y-auto pl-14 pr-4' },
          filtered.length === 0
            ? React.createElement('div', { className: 'text-center py-16 font-acme text-bitmap-muted' }, 'No hay listados disponibles')
            : viewMode === 'list'
              ? React.createElement('div', null,
                  filtered.map(function(item, i) {
                    var btcPrice = (item.listedPrice || item.price || 0) / 100000000;
                    var btcPriceStr = btcPrice.toFixed(5);
                    var addr = BitmapUtils.truncateAddress(item.sellerAddress || item.ownerAddress || '', 6);
                    var etiquetas = item.etiquetas || '';
                    var isPerfect = etiquetas.indexOf('Perfect') !== -1;
                    var isPunk = etiquetas.indexOf('Punk') !== -1;
                    var bn = item.bitmapNumber || 0;
                    var hash = item.hash || '';
                    var txs = item.totalTransacciones || 0;
                    return React.createElement('div', {
                      key: (item.source || '') + '_' + (item.bitmapId || item.id || i),
                      className: 'px-4 py-0.5 hover:bg-bitmap-surface transition-colors cursor-pointer border-b border-bitmap-border/30'
                    },
                      React.createElement('div', { className: 'flex items-center gap-3' },
                        React.createElement('div', { className: 'flex-shrink-0', style: { width: 55, height: 55 } },
                          React.createElement('img', {
                            src: '/api/v1/block-image/' + bn + '?size=55&etiquetas=' + encodeURIComponent(etiquetas || '') + '&tx=' + txs + '&hash=' + encodeURIComponent(hash || '') + '&perfect=' + isPerfect + '&punk=' + isPunk,
                            width: 55,
                            height: 55,
                            loading: 'lazy',
                            style: { imageRendering: 'pixelated', background: '#1a1a1a', borderRadius: 4 },
                            alt: ''
                          })
                        ),
                        React.createElement('div', { className: 'flex-1 min-w-0' },
                          React.createElement('div', { className: 'flex items-center justify-between' },
                            React.createElement('div', { className: 'flex items-center gap-2' },
                              React.createElement('span', { className: 'font-alfaslab text-sm text-bitmap-orange font-bold' },
                                '#' + bn + '.bitmap'
                              ),
                              React.createElement('span', { className: 'font-acme text-xs text-white' }, BitmapUtils.timeAgo(item.listedAt))
                            ),
                            React.createElement('span', { className: 'font-acme text-sm font-semibold text-bitmap-orange-light' },
                              btcPriceStr + ' BTC'
                            )
                          ),
                          React.createElement('div', { className: 'flex items-center justify-between mt-0.5' },
                            React.createElement('div', { className: 'flex-1 min-w-0' },
                              renderMarketplaceTags(etiquetas)
                            ),
                            React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted flex-shrink-0 ml-2 truncate' }, addr)
                          )
                        ),
                        React.createElement('div', {
                          onClick: function() { toggleBuySelection(item.bitmapId || item.id); },
                          className: 'w-5 h-5 flex-shrink-0 cursor-pointer rounded flex items-center justify-center',
                          style: { backgroundColor: selectedBuyItems.indexOf(item.bitmapId || item.id) !== -1 ? '#00AA00' : '#444', border: '1px solid #666' }
                        },
                          selectedBuyItems.indexOf(item.bitmapId || item.id) !== -1
                            ? React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none' },
                                React.createElement('path', { d: 'M2 6l3 3 5-5', stroke: '#000', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                              )
                            : null
                        )
                      )
                    );
                  })
                )
              : React.createElement('div', { className: 'flex flex-wrap gap-2 py-2' },
                  filtered.map(function(item, i) {
                    var btcPrice = (item.listedPrice || item.price || 0) / 100000000;
                    var btcPriceStr = btcPrice.toFixed(5);
                    var etiquetas = item.etiquetas || '';
                    var isPerfect = etiquetas.indexOf('Perfect') !== -1;
                    var isPunk = etiquetas.indexOf('Punk') !== -1;
                    var bn = item.bitmapNumber || 0;
                    var hash = item.hash || '';
                    var txs = item.totalTransacciones || 0;
                    var isSelected = selectedBuyItems.indexOf(item.bitmapId || item.id) !== -1;
                    return React.createElement('div', {
                      key: (item.source || '') + '_' + (item.bitmapId || item.id || i),
                      className: 'bg-bitmap-surface border border-bitmap-border rounded-lg overflow-hidden hover:border-bitmap-orange transition-colors cursor-pointer',
                      style: { width: 'calc(20% - 7px)', minWidth: 140 }
                    },
                      React.createElement('div', { className: 'flex items-center justify-between px-2 py-1.5' },
                        React.createElement('div', {
                          onClick: function() { toggleBuySelection(item.bitmapId || item.id); },
                          className: 'w-4 h-4 cursor-pointer rounded flex items-center justify-center flex-shrink-0',
                          style: { backgroundColor: isSelected ? '#00AA00' : '#444', border: '1px solid #666' }
                        },
                          isSelected
                            ? React.createElement('svg', { width: 10, height: 10, viewBox: '0 0 12 12', fill: 'none' },
                                React.createElement('path', { d: 'M2 6l3 3 5-5', stroke: '#000', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                              )
                            : null
                        ),
                        React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold truncate ml-1' },
                          btcPriceStr + ' BTC'
                        )
                      ),
                      React.createElement('img', {
                        src: '/api/v1/block-image/' + bn + '?size=200&etiquetas=' + encodeURIComponent(etiquetas || '') + '&tx=' + txs + '&hash=' + encodeURIComponent(hash || '') + '&perfect=' + isPerfect + '&punk=' + isPunk,
                        width: '100%',
                        loading: 'lazy',
                        style: { imageRendering: 'pixelated', background: '#1a1a1a', display: 'block' },
                        alt: ''
                      })
                    );
                  })
                )
        ),
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
              style: { backgroundColor: buySuccessData.type === 'error' ? 'rgba(255,51,51,0.15)' : buySuccessData.type === 'partial' ? 'rgba(255,170,0,0.15)' : 'rgba(0,170,0,0.15)' }
            },
              buySuccessData.type === 'error' ? React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' },
                React.createElement('path', { d: 'M18 6L6 18M6 6l12 12', stroke: '#FF5555', strokeWidth: 2.5, strokeLinecap: 'round' })
              ) : buySuccessData.type === 'partial' ? React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' },
                React.createElement('path', { d: 'M12 9v4M12 17h.01', stroke: '#FFAA00', strokeWidth: 2.5, strokeLinecap: 'round' }),
                React.createElement('circle', { cx: 12, cy: 12, r: 10, stroke: '#FFAA00', strokeWidth: 2 })
              ) : React.createElement('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' },
                React.createElement('path', { d: 'M5 13l4 4L19 7', stroke: '#00AA00', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' })
              )
            ),
            React.createElement('div', null,
              React.createElement('h2', { className: 'font-alfaslab text-lg', style: { color: buySuccessData.type === 'error' ? '#FF5555' : buySuccessData.type === 'partial' ? '#FFAA00' : '#00AA00' } },
                buySuccessData.type === 'error' ? 'Error en la compra' : buySuccessData.type === 'partial' ? 'Compra parcial' : 'Compra exitosa'
              ),
              React.createElement('p', { className: 'font-acme text-xs', style: { color: '#888' } },
                buySuccessData.type === 'error' ? 'No se completó la compra. Ningún bitmap fue comprado.' :
                buySuccessData.type === 'partial' ? buySuccessData.items.length + ' bitmap' + (buySuccessData.items.length > 1 ? 's' : '') + ' comprado' + (buySuccessData.items.length > 1 ? 's' : '') + ' exitosamente' :
                buySuccessData.items.length + ' bitmap' + (buySuccessData.items.length > 1 ? 's' : '') + ' comprado' + (buySuccessData.items.length > 1 ? 's' : '') + ' exitosamente'
              )
            )
          ),
          buySuccessData.items.length > 0 ? React.createElement('div', { className: 'rounded-lg p-4 mb-4', style: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' } },
            React.createElement('div', { className: 'space-y-2' },
              buySuccessData.items.map(function(item, i) {
                return React.createElement('div', { key: i, className: 'flex items-center justify-between' },
                  React.createElement('div', { className: 'flex items-center gap-2 min-w-0' },
                    React.createElement('div', {
                      className: 'w-1.5 h-1.5 rounded-full flex-shrink-0',
                      style: { backgroundColor: '#00AA00' }
                    }),
                    React.createElement('span', { className: 'font-acme text-sm truncate', style: { color: '#ddd' } }, item.name)
                  ),
                  React.createElement('span', { className: 'font-acme text-sm flex-shrink-0 ml-3', style: { color: '#aaa' } },
                    (item.price / 100000000).toFixed(8) + ' BTC'
                  )
                );
              })
            )
          ) : null,
          buySuccessData.totalPaid > 0 ? React.createElement('div', { className: 'rounded-lg p-4 mb-4', style: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' } },
            React.createElement('div', { className: 'flex justify-between mb-2' },
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#888' } }, 'Subtotal'),
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#ccc' } },
                (buySuccessData.totalPaid / 100000000).toFixed(8) + ' BTC'
              )
            ),
            React.createElement('div', { className: 'flex justify-between mb-2' },
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#888' } }, 'Fee marketplace'),
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#aaa' } },
                (buySuccessData.totalFees / 100000000).toFixed(8) + ' BTC'
              )
            ),
            buySuccessData.totalNetworkFee > 0 ? React.createElement('div', { className: 'flex justify-between mb-2' },
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#888' } }, 'Fee de red (mempool)'),
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#aaa' } },
                (buySuccessData.totalNetworkFee / 100000000).toFixed(8) + ' BTC'
              )
            ) : null,
            React.createElement('div', {
              className: 'flex justify-between pt-2 mt-2',
              style: { borderTop: '1px solid #333' }
            },
              React.createElement('span', { className: 'font-acme text-sm font-bold', style: { color: '#fff' } }, 'Total pagado'),
              React.createElement('span', { className: 'font-acme text-sm font-bold', style: { color: '#00AA00' } },
                ((buySuccessData.totalPaid + buySuccessData.totalFees) / 100000000).toFixed(8) + ' BTC'
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
                  style: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' },
                  onMouseOver: function(e) { e.currentTarget.style.borderColor = '#00AA00'; },
                  onMouseOut: function(e) { e.currentTarget.style.borderColor = '#2a2a2a'; }
                },
                  React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', flexShrink: 0 },
                    React.createElement('path', { d: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6', stroke: '#00AA00', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    React.createElement('polyline', { points: '15 3 21 3 21 9', stroke: '#00AA00', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    React.createElement('line', { x1: '10', y1: '14', x2: '21', y2: '3', stroke: '#00AA00', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                  ),
                  React.createElement('span', { className: 'font-acme text-[10px] truncate flex-1', style: { color: '#aaa' } },
                    nf.txid.substring(0, 16) + '...'
                  ),
                  React.createElement('span', { className: 'font-acme text-[10px] flex-shrink-0', style: { color: '#666' } },
                    nf.fee > 0 ? (nf.fee / 100000000).toFixed(6) + ' BTC' : ''
                  )
                );
              })
            )
          ) : null,
          buySuccessData.errors && buySuccessData.errors.length > 0 ? React.createElement('div', { className: 'mb-4 rounded-lg p-3', style: { backgroundColor: 'rgba(255,51,51,0.08)', border: '1px solid rgba(255,51,51,0.2)' } },
            React.createElement('span', { className: 'font-acme text-[10px] block mb-1', style: { color: '#FF5555' } }, 'Bitmaps no comprados:'),
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
            style: { background: buySuccessData.type === 'error' ? '#FF5555' : buySuccessData.type === 'partial' ? '#FFAA00' : 'linear-gradient(180deg, #2F7D32, #1C4E20)', color: '#fff' },
            onMouseOver: function(e) { e.currentTarget.style.background = buySuccessData.type === 'error' ? '#ff7777' : buySuccessData.type === 'partial' ? '#ffc34d' : 'linear-gradient(180deg, #3A913D, #256028)'; },
            onMouseOut: function(e) { e.currentTarget.style.background = buySuccessData.type === 'error' ? '#FF5555' : buySuccessData.type === 'partial' ? '#FFAA00' : 'linear-gradient(180deg, #2F7D32, #1C4E20)'; }
          }, 'Aceptar')
        )
      )
    ) : null,
    successToast ? React.createElement(Toast, { message: successToast.message, type: successToast.type, duration: 20000, onDone: function() { setSuccessToast(null); } }) : null
  );
}

function DescuentosPage(props) {
  var navigate = props.navigate;
  var _a = React.useState([]);
  var discounts = _a[0];
  var setDiscounts = _a[1];
  var _b = React.useState(true);
  var isLoading = _b[0];
  var setIsLoading = _b[1];

  React.useEffect(function() {
    setIsLoading(true);
    MarketplaceApi.getDescuentos().then(function(data) {
      var items = data.data || data || [];
      setDiscounts(Array.isArray(items) ? items : []);
      setIsLoading(false);
    }).catch(function() { setIsLoading(false); });
  }, []);

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
      React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, I18n.t('descuentos.title')),
      isLoading ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
      discounts.length === 0 ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('descuentos.noDiscounts')) :
      React.createElement('div', { className:'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' },
        discounts.map(function(d, i) {
          return React.createElement(DiscountBadge, {
            key:i,
            percentage: d.percentage || 10,
            originalPrice: d.originalPrice || 0.01,
            discountPrice: d.discountPrice || 0.005
          });
        })
      )
    )
  );
}
