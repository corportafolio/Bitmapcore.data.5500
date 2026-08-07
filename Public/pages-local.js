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

    var signedPsbt = null;
    var listingActivated = false;

    try {
      setListingStatus({ toast:'Obteniendo clave publica...' });
      var pubKey;
      try {
        pubKey = await StoreApp.getPublicKeyFresh();
      } catch(pke) {
        setListingStatus({ toast:'Error: no se pudo obtener la clave publica de la wallet' });
        return;
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
          sellerPaymentAddress: wallet.address,
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

      if (createJson.success && createJson.data && createJson.data.psbtToSign) {
        var psbtToSign = createJson.data.psbtToSign;

        if (wallet.walletType === 'xverse' && StoreApp._getXverseProvider()) {
          try {
            setListingStatus({ toast:'Firmando en Xverse...' });
            signedPsbt = await StoreApp._xverseSignPsbt(psbtToSign, wallet.address);
          } catch(xe) {
            setListingStatus({ toast:'Xverse: firma cancelada o fallida' });
          }
        } else if (window.unisat && window.unisat.signPsbt) {
          try {
            setListingStatus({ toast:'Firmando en Unisat...' });
            var signPromise = window.unisat.signPsbt(psbtToSign);
            var signTimeout = new Promise(function(_, reject) {
              setTimeout(function() { reject(new Error('timeout')); }, 30000);
            });
            signedPsbt = await Promise.race([signPromise, signTimeout]);
          } catch(ue) {
            setListingStatus({ toast:'Unisat: firma cancelada o fallida' });
          }
        } else {
          setListingStatus({ toast:'Wallet no disponible para firmar' });
        }

        if (signedPsbt) {
          var listingIds = createJson.data.listingIds || [];
          if (listingIds.length > 0) {
            setListingStatus({ toast:'Activando listings...' });
            await MarketplaceApi.batchSign(listingIds, signedPsbt, pubKey);
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
      } else if (signedPsbt) {
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
    if (!showSortMenu && !showListDropdown) return;
    var close = function() { setShowSortMenu(false); setShowListDropdown(false); };
    window.addEventListener('click', close);
    return function() { window.removeEventListener('click', close); };
  }, [showSortMenu, showListDropdown]);

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
        React.createElement('span', { className: 'font-alfaslab text-sm text-white tracking-wide flex-shrink-0 pt-1' }, 'Bitmapcore Marketplace'),
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
      selectedBuyItems.length > 0 ? React.createElement('button', {
        className: 'px-3 py-1 bg-bitmap-orange text-black font-acme text-xs rounded-lg hover:bg-bitmap-orange/80 transition-colors flex-shrink-0 font-bold'
      }, 'Comprar ' + selectedBuyItems.length + ' seleccionados') : React.createElement('button', {
        disabled: true,
        className: 'px-3 py-1 bg-bitmap-orange text-black font-acme text-xs rounded-lg flex-shrink-0 font-bold opacity-50'
      }, 'Comprar seleccionados'),
      React.createElement('div', { className: 'relative flex-shrink-0' },
        React.createElement('button', {
          onClick: function(e) { e.stopPropagation(); fetchUserBitmapsForListing(); setShowListDropdown(true); },
          disabled: isLoadingDropdown,
          className: 'px-3 py-1 bg-bitmap-orange text-black font-acme text-xs rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
        }, isLoadingDropdown ? 'Cargando...' : 'Listar'),
showListDropdown ? React.createElement('div', {
            className: 'absolute left-0 top-full mt-1 w-80 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-2 max-h-[32rem] overflow-y-auto'
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
                        src: '/api/v1/block-image/' + bn + '?size=80&etiquetas=' + encodeURIComponent(etiquetas || '') + '&tx=' + txs + '&hash=' + encodeURIComponent(hash || '') + '&perfect=' + isPerfect + '&punk=' + isPunk,
                        width: '100%',
                        loading: 'lazy',
                        style: { imageRendering: 'pixelated', background: '#1a1a1a', display: 'block' },
                        alt: ''
                      })
                    );
                  })
                )
        ),
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
