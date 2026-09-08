function BittickAgentsPage(props) {
  var navigate = props.navigate;
  var _a = React.useState([]);
  var agents = _a[0];
  var setAgents = _a[1];
  var _b = React.useState(true);
  var isLoading = _b[0];
  var setIsLoading = _b[1];
  var _vm = React.useState('grid');
  var viewMode = _vm[0];
  var setViewMode = _vm[1];
  var _cs = React.useState('inscriptionDesc');
  var currentSort = _cs[0];
  var setCurrentSort = _cs[1];
  var _ss = React.useState(false);
  var showSortMenu = _ss[0];
  var setShowSortMenu = _ss[1];
  var _sel = React.useState([]);
  var selectedItems = _sel[0];
  var setSelectedItems = _sel[1];
  var _ld = React.useState(false);
  var showListDropdown = _ld[0];
  var setShowListDropdown = _ld[1];
  var _li = React.useState([]);
  var listItems = _li[0];
  var setListItems = _li[1];
  var _ild = React.useState(false);
  var isLoadingDropdown = _ild[0];
  var setIsLoadingDropdown = _ild[1];
  var _nw = React.useState(false);
  var noWalletForListing = _nw[0];
  var setNoWalletForListing = _nw[1];
  var _bm = React.useState(false);
  var showBuyMenu = _bm[0];
  var setShowBuyMenu = _bm[1];
  var _bs = React.useState(null);
  var buyStatus = _bs[0];
  var setBuyStatus = _bs[1];
  var _bst = React.useState(null);
  var buySuccessData = _bst[0];
  var setBuySuccessData = _bst[1];
  var _ds = React.useState('');
  var dropdownSearch = _ds[0];
  var setDropdownSearch = _ds[1];
  var _bp = React.useState('');
  var bulkPrice = _bp[0];
  var setBulkPrice = _bp[1];
  var _cm = React.useState(false);
  var showConfirmMenu = _cm[0];
  var setShowConfirmMenu = _cm[1];
  var _ci = React.useState([]);
  var confirmItems = _ci[0];
  var setConfirmItems = _ci[1];
  var _sm = React.useState(false);
  var showSuccessMenu = _sm[0];
  var setShowSuccessMenu = _sm[1];
  var _si = React.useState([]);
  var successItems = _si[0];
  var setSuccessItems = _si[1];
  var _fr = React.useState('media');
  var selectedFeeRate = _fr[0];
  var setSelectedFeeRate = _fr[1];
  var _cf = React.useState('');
  var customFeeStr = _cf[0];
  var setCustomFeeStr = _cf[1];
  var _mf = React.useState(null);
  var mempoolFees = _mf[0];
  var setMempoolFees = _mf[1];
  var _st = React.useState(null);
  var listingStatus = _st[0];
  var setListingStatus = _st[1];
  var _showCustomFee = React.useState(false);
  var showCustomFee = _showCustomFee[0];
  var setShowCustomFee = _showCustomFee[1];
  var _bt = React.useState(null);
  var buyToast = _bt[0];
  var setBuyToast = _bt[1];
  var _desc = React.useState(false);
  var showDescription = _desc[0];
  var setShowDescription = _desc[1];

  var BITTICK_COLLECTION_NAME = I18n.t('marketplace.bittickAgentsTitle');

  var sortButtons = [
    { key: 'inscriptionDesc', label: I18n.t('marketplace.sortRecent') },
    { key: 'inscriptionAsc', label: I18n.t('marketplace.sortPriceLow') },
    { key: 'nameAsc', label: I18n.t('marketplace.sortAZ') }
  ];
  var sortLabel = {
    inscriptionDesc: I18n.t('marketplace.sortRecent'),
    inscriptionAsc: I18n.t('marketplace.sortPriceLow'),
    nameAsc: I18n.t('marketplace.sortAZ')
  };

  React.useEffect(function() {
    setIsLoading(true);
    fetch('/api/v1/assets/collections/bitticks-agents')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.success && d.data && d.data.items) {
          var agents = d.data.items.map(function(item) {
            var botMatch = item.meta.name.match(/Bittick Agent #(\d+)/);
            var botNumber = botMatch ? parseInt(botMatch[1], 10) : null;
            return {
              id: item.id,
              name: item.meta.name,
              botNumber: botNumber,
              inscriptionNumber: item.inscriptionNumber || null,
              attributes: item.meta.attributes || [],
              listedPrice: null,
              listedPriceBtc: null
            };
          });
          setAgents(agents);
        }
        setIsLoading(false);
      })
      .catch(function() { setIsLoading(false); });
  }, []);

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

  var filtered = agents.slice().sort(function(a, b) {
    if (currentSort === 'inscriptionAsc') return (a.inscriptionNumber || 0) - (b.inscriptionNumber || 0);
    if (currentSort === 'nameAsc') return (a.name || '').localeCompare(b.name || '');
    return (b.inscriptionNumber || 0) - (a.inscriptionNumber || 0);
  });

  var toggleSelection = function(id) {
    var idx = selectedItems.indexOf(id);
    if (idx === -1) {
      setSelectedItems(selectedItems.concat([id]));
    } else {
      setSelectedItems(selectedItems.filter(function(i) { return i !== id; }));
    }
  };

  var toggleSelectAll = function() {
    var allIds = filtered.map(function(a) { return a.id; });
    if (selectedItems.length === allIds.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(allIds);
    }
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

  var getMempoolBaja = function() { return Math.max(1, mempoolFees ? Math.floor(mempoolFees.hourFee * 0.7) : 1); };
  var getMempoolMedia = function() { return Math.max(1, mempoolFees ? mempoolFees.hourFee : 1); };
  var getMempoolAlta = function() { return Math.max(1, mempoolFees ? mempoolFees.hourFee * 2 : 3); };
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

  var fetchUserBitticksForListing = function() {
    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) {
      setNoWalletForListing(true);
      setIsLoadingDropdown(false);
      return;
    }
    setNoWalletForListing(false);
    setIsLoadingDropdown(true);
    setDropdownSearch('');
    setBulkPrice('');
    setShowConfirmMenu(false);

    Promise.all([
      AssetApi.getUserAssets(wallet.address),
      fetch('/api/v1/assets/collections/bitticks-agents').then(function(r) { return r.json(); })
    ]).then(function(results) {
      var res = results[0];
      var colData = results[1];
      var botNumberMap = {};
      if (colData.success && colData.data && colData.data.items) {
        colData.data.items.forEach(function(item) {
          var m = item.meta.name.match(/Bittick Agent #(\d+)/);
          if (m) botNumberMap[item.id] = parseInt(m[1], 10);
        });
      }
      if (res.success && res.data) {
        var bittickCollection = res.data.collections.find(function(c) { return c.name === BITTICK_COLLECTION_NAME; });
        if (bittickCollection && bittickCollection.items) {
          var items = bittickCollection.items.map(function(it) {
            var botNum = botNumberMap[it.id] !== undefined ? botNumberMap[it.id] : null;
            var displayName = botNum !== null ? 'Bittick Agent #' + botNum : (it.name || 'Bittick Agent');
            return {
              id: it.id,
              name: displayName,
              botNumber: botNum,
              inscriptionNumber: it.inscriptionNumber,
              output: it.output,
              value: it.value,
              isSelected: false,
              priceStr: '',
              priceSatoshis: 0,
              isListed: false
            };
          });
          setListItems(items);
        } else {
          setListItems([]);
        }
      }
      setIsLoadingDropdown(false);
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

  var selectedDropdownCount = listItems.filter(function(i) { return i.isSelected; }).length;

  var handleListFromDropdown = function() {
    var selected = listItems.filter(function(it) { return it.isSelected && it.priceSatoshis > 0; });
    if (selected.length === 0) return;
    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) return;
    setShowListDropdown(false);

    var _listTrackingId = null;
    TrackingAPI.startListing('bittick', selected).then(function(id) {
      _listTrackingId = id;

      MarketplaceLister.list({
        selected: selected,
        listApi: {
          create: function(items) { return MarketplaceApi.unifiedList('bittick', items); },
          sign: function(listingIds, signedPsbtHexs, pubKey) { return MarketplaceApi.unifiedSign('bittick', listingIds, signedPsbtHexs, pubKey); }
        },
        toBatchItem: function(item, wallet, pubKey) {
          return {
            inscriptionId: item.id,
            price: item.priceSatoshis,
            sellerAddress: wallet.address,
            sellerOrdinalPublicKey: pubKey,
            sellerPaymentAddress: wallet.paymentAddress || wallet.address,
            name: item.name || 'Bittick Agent',
            imageUrl: '',
            bitmapNumber: 0,
            inscriptionNumber: item.inscriptionNumber,
            inscriptionUtxo: item.output,
            inscriptionValue: item.value,
            inscriptionContentType: '',
            inscriptionHeight: 0,
            isPriceUpdate: false
          };
        }
      }, {
        status: function(msg) { setListingStatus({ toast: msg }); TrackingAPI.updateListing(_listTrackingId, { items_json: selected.map(function(i) { return { id: i.id, name: i.name, price: i.priceSatoshis, inscriptionNumber: i.inscriptionNumber }; }) }); },
        onError: function(msg) { setListingStatus({ toast: msg }); TrackingAPI.submitListing(_listTrackingId, 'error', msg, 'LIST_ERROR'); },
        onActivated: function(activated) {
          setSuccessItems(activated);
          setShowSuccessMenu(true);
          TrackingAPI.submitListing(_listTrackingId, 'activated', null, null);
        }
      });
    });
  };

  var handleBuySelected = function() {
    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) {
      setShowBuyMenu(false);
      setBuyToast(I18n.t('toast.noWalletTrade'));
      setTimeout(function() { setBuyToast(null); }, 8000);
      return;
    }

    var selectedBuy = filtered.filter(function(item) {
      return selectedItems.indexOf(item.id) !== -1 && item.listedPrice && item.listedPrice > 0;
    });

    if (selectedBuy.length === 0) {
      setShowBuyMenu(false);
      setBuyToast(I18n.t('toast.noPricedItemsSelected'));
      setTimeout(function() { setBuyToast(null); }, 8000);
      return;
    }
    if (window.bcAnalytics) window.bcAnalytics.track('buy_initiated', { itemCount: selectedBuy.length });

    setShowBuyMenu(true);
    setBuyStatus({ message: 'Preparando compra batch...', type: 'loading' });
    setBuySuccessData(null);

    var _buyTrackingId = null;
    TrackingAPI.startBuying('bittick', selectedBuy).then(function(id) {
      _buyTrackingId = id;

      var feeRate = getFeeRateSats();

      MarketplaceBuyer.buy({
        selected: selectedBuy,
        idFromItem: function(item) { return item.listingId || item.id; },
        buyIdsKey: 'ids',
        collection: 'bittick',
        assetLabel: 'agente',
        nameFromItem: function(item) { return item.name || ('Agent #' + (item.inscriptionNumber || '')); },
        transport: {
          batchBuy: MarketplaceApi.unifiedBuy,
          batchBroadcast: MarketplaceApi.unifiedBroadcast
        }
      }, {
        feeRate: feeRate, idempotencyPrefix: 'batch_buy'
      }, {
        status: function(s) { setBuyStatus({ message: s.message, type: s.type }); },
        onBatchBuy: function(buyJson) {
          if (window.bcAnalytics) window.bcAnalytics.track('buy_api_response', { success: !!buyJson.success, itemCount: selectedBuy.length });
          TrackingAPI.updateBuying(_buyTrackingId, { psbt_hex: buyJson.psbtHex || null });
        },
        onResult: function(result) {
          if (window.bcAnalytics && result.type === 'success') {
            window.bcAnalytics.track('buy_completed', { successCount: result.items.length, errorCount: result.errors.length, totalPaid: result.totalPaid });
          }
          if (result.type === 'success') {
            TrackingAPI.submitBuying(_buyTrackingId, 'confirmed', null, null, result.txid || null);
          } else {
            TrackingAPI.submitBuying(_buyTrackingId, 'error', result.errors ? result.errors.map(function(e){return e.error||''}).join('; ') : 'Unknown error', 'BUY_ERROR');
          }
          setBuySuccessData(result);
          setSelectedItems([]);
          setShowBuyMenu(false);
        }
      });
    });
  };

  var handleSort = function(sort) {
    setCurrentSort(sort);
    setShowSortMenu(false);
  };

  React.useEffect(function() {
    if (!showSortMenu && !showListDropdown && !showBuyMenu) return;
    var close = function() { setShowSortMenu(false); setShowListDropdown(false); setShowBuyMenu(false); };
    window.addEventListener('click', close);
    return function() { window.removeEventListener('click', close); };
  }, [showSortMenu, showListDropdown, showBuyMenu]);

  return React.createElement('div', { className: 'flex flex-col h-full' },
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border pl-14 pr-4 py-2', style: { backgroundColor: '#1A1A1A' } },
      React.createElement('div', { className: 'flex items-stretch justify-between' },
        React.createElement('div', { className: 'flex items-center gap-2 flex-shrink-0' },
          React.createElement('img', { src: 'LogoBittick.png', alt: I18n.t('marketplace.bittickAgentsTitle'), className: 'h-[45px] w-[45px] object-contain rounded my-[2px]' }),
          React.createElement('span', { className: 'font-alfaslab text-sm text-white tracking-wide pt-1' }, I18n.t('marketplace.bittickAgentsTitle')),
          React.createElement('button', {
            onClick: function(e) { e.stopPropagation(); setShowDescription(!showDescription); },
            className: 'ml-2 px-2 py-1 text-[10px] font-acme bg-bitmap-surface text-bitmap-orange border border-bitmap-orange rounded hover:bg-bitmap-orange hover:text-black transition-colors flex-shrink-0'
          }, I18n.t('marketplace.collectionInfo'))
        ),
        React.createElement('div', { className: 'flex items-stretch' },
          React.createElement('div', { className: 'flex flex-col items-center px-2 border-r border-[#555]' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, I18n.t('marketplace.globalFloor')),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, '-'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, '-')
          ),
          React.createElement('div', { className: 'flex flex-col items-center px-2 border-r border-[#555]' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, I18n.t('marketplace.volume')),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, '0 BTC'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, '-')
          ),
          React.createElement('div', { className: 'flex flex-col items-center px-2 border-r border-[#555]' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, I18n.t('marketplace.volume24h')),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, '0 BTC'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, '-')
          ),
          React.createElement('div', { className: 'flex flex-col items-center px-2 border-r border-[#555]' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, I18n.t('marketplace.listings')),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, '0'),
            React.createElement('span', null)
          ),
          React.createElement('div', { className: 'flex flex-col items-center px-2' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, I18n.t('marketplace.sales')),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, '0'),
            React.createElement('span', null)
          )
        )
      )
    ),
    showDescription ? React.createElement('div', { className: 'pl-14 pr-4 pb-3 border-b border-bitmap-border', style: { backgroundColor: '#1A1A1A' } },
      React.createElement('div', { className: 'max-w-3xl' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-2' },
          React.createElement('span', { className: 'font-acme text-[11px] text-bitmap-orange font-bold' }, I18n.t('marketplace.collectionInfo') + ':'),
          React.createElement('span', { className: 'font-acme text-[11px] text-bitmap-muted' }, I18n.t('marketplace.supply') + ': 100')
        ),
        React.createElement('p', { className: 'font-acme text-[11px] text-bitmap-text leading-relaxed', style: { lineHeight: '1.6' } },
          I18n.t('marketplace.collectionDescription')
        )
      )
    ) : null,
    listingStatus && listingStatus.toast ? React.createElement('div', { className: 'pl-14 pr-4 py-1.5 border-b border-bitmap-border', style: { backgroundColor: '#141414' } },
      React.createElement('p', { className: 'font-acme text-xs', style: { color: '#FF9C4A' } }, listingStatus.toast)
    ) : null,
    React.createElement('div', { className: 'pl-14 pr-4 py-1 border-b border-bitmap-border flex items-center gap-2 sticky top-0 z-10', style: { backgroundColor: '#080008' } },
      React.createElement('div', { className: 'flex items-center gap-1 flex-shrink-0' },
        React.createElement('button', {
          onClick: function(e) { e.stopPropagation(); toggleSelectAll(); },
          className: 'px-2 py-1 rounded font-acme text-xs bg-bitmap-surface text-bitmap-text border border-bitmap-border hover:border-bitmap-orange transition-colors',
          title: I18n.t('marketplace.selectAll')
        }, selectedItems.length === filtered.length && filtered.length > 0 ? '\u2611' : '\u2610'),
        React.createElement('button', {
          onClick: function(e) { e.stopPropagation(); setViewMode(viewMode === 'list' ? 'grid' : 'list'); },
          className: 'px-2 py-1 rounded font-acme text-xs bg-bitmap-surface text-bitmap-text border border-bitmap-border hover:border-bitmap-orange transition-colors',
          title: viewMode === 'list' ? I18n.t('marketplace.gridView') : I18n.t('marketplace.listView')
        }, viewMode === 'list' ? '\u25A6' : '\u2261')
      ),
      React.createElement('div', { className: 'relative flex-shrink-0' },
        React.createElement('button', {
          onClick: function(e) { e.stopPropagation(); setShowSortMenu(!showSortMenu); },
          className: 'px-2 py-1 rounded font-acme text-xs bg-bitmap-surface text-bitmap-text border border-bitmap-border hover:border-bitmap-orange transition-colors'
        }, I18n.t('marketplace.sortLabel') + sortLabel[currentSort] + ' \u25BE'),
        showSortMenu ? React.createElement('div', {
          className: 'absolute left-0 top-full mt-1 w-32 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1'
        },
          sortButtons.map(function(btn) {
            return React.createElement('button', {
              key: btn.key,
              onClick: function(e) { e.stopPropagation(); handleSort(btn.key); },
              className: 'w-full px-3 py-1.5 text-left font-acme text-xs transition-colors ' +
                (currentSort === btn.key ? 'bg-bitmap-orange text-black font-bold' : 'text-bitmap-text hover:bg-bitmap-surface')
            }, btn.label);
          })
        ) : null
      ),
      React.createElement('div', { className: 'flex-1' }),
      React.createElement('div', { className: 'relative flex-shrink-0' },
        React.createElement('button', {
          onClick: function(e) {
            e.stopPropagation();
            var w = StoreApp.get('wallet');
            if (!w || !w.address) {
              setShowListDropdown(false);
              setListingStatus({ toast: I18n.t('toast.noWalletTrade') });
              setTimeout(function() { setListingStatus(null); }, 20000);
              return;
            }
            fetchUserBitticksForListing();
            setShowListDropdown(true);
          },
          disabled: isLoadingDropdown,
          className: 'px-3 py-1 bg-bitmap-orange text-black font-acme text-xs rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
        }, isLoadingDropdown ? I18n.t('app.loading') : I18n.t('marketplace.list')),
        showListDropdown ? React.createElement('div', {
          className: 'absolute right-0 top-full mt-1 w-80 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-2 max-h-[32rem] overflow-y-auto'
        },
          isLoadingDropdown ? React.createElement('div', { className: 'p-3 text-center font-acme text-xs text-bitmap-muted' }, I18n.t('app.loading')) :
          showConfirmMenu ? React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'px-3 py-2 border-b border-bitmap-border flex items-center gap-2' },
              React.createElement('button', {
                onClick: function(e) { e.stopPropagation(); setShowConfirmMenu(false); },
                className: 'text-bitmap-muted hover:text-white transition-colors'
              }, '\u2190'),
              React.createElement('span', { className: 'font-acme text-xs text-white font-bold' }, I18n.t('marketplace.confirmListing'))
            ),
            React.createElement('div', { className: 'px-3 py-2 max-h-64 overflow-y-auto' },
              confirmItems.map(function(item) {
                return React.createElement('div', {
                  key: item.id,
                  className: 'flex items-center justify-between py-1.5 border-b border-bitmap-border/30 last:border-0'
                },
                  React.createElement('div', { className: 'flex items-center gap-2 min-w-0' },
                    React.createElement('span', { className: 'font-acme text-xs text-white truncate' }, item.name || 'Agent'),
                    React.createElement('span', { className: 'font-acme text-[8px] text-bitmap-muted flex-shrink-0' }, '#' + (item.inscriptionNumber || ''))
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
              }, I18n.t('app.back')),
              React.createElement('button', {
                onClick: function(e) { e.stopPropagation(); handleListFromDropdown(); },
                className: 'flex-1 px-3 py-1.5 bg-bitmap-orange text-white font-acme text-xs rounded hover:bg-bitmap-orange/80 transition-colors'
              }, I18n.t('app.confirm'))
            )
          ) :
          showSuccessMenu ? React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'px-3 py-2 border-b border-bitmap-border' },
              React.createElement('span', { className: 'font-acme text-xs text-white font-bold' }, I18n.t('marketplace.success'))
            ),
            React.createElement('div', { className: 'px-3 py-2 max-h-64 overflow-y-auto' },
              successItems.map(function(item) {
                return React.createElement('div', {
                  key: item.id,
                  className: 'flex items-center justify-between py-1.5 border-b border-bitmap-border/30 last:border-0'
                },
                  React.createElement('div', { className: 'flex items-center gap-2 min-w-0' },
                    React.createElement('span', { className: 'font-acme text-xs text-white truncate' }, item.name || 'Agent')
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
              }, I18n.t('marketplace.close'))
            )
          ) :
          noWalletForListing ? React.createElement('div', { className: 'p-4 text-center' },
            React.createElement('div', { className: 'font-acme text-sm text-bitmap-muted mb-2' }, I18n.t('marketplace.noWalletConnected')),
            React.createElement('div', { className: 'font-acme text-xs text-bitmap-muted' }, I18n.t('marketplace.connectWalletToList'))
          ) :
          listItems.length === 0 ? React.createElement('div', { className: 'p-3 text-center font-acme text-xs text-bitmap-muted' }, I18n.t('marketplace.noBittickAgentsInWallet')) :
          React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'px-3 pb-2 border-b border-bitmap-border/50 flex items-center gap-2' },
              React.createElement('input', {
                type: 'text',
                value: dropdownSearch,
                onChange: function(e) { setDropdownSearch(e.target.value); },
                placeholder: I18n.t('marketplace.searchByNameOrInscription'),
                className: 'flex-1 min-w-0 bg-bitmap-surface border border-bitmap-border rounded px-2 py-1 font-acme text-xs text-white placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange',
                onClick: function(e) { e.stopPropagation(); }
              }),
              React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted flex-shrink-0' },
                I18n.t('marketplace.agentsCount', { count: listItems.length })
              )
            ),
            React.createElement('div', { className: 'flex items-center justify-between px-3 py-2 border-b border-bitmap-border/50' },
              React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted' },
                selectedDropdownCount > 0 ? selectedDropdownCount + ' ' + I18n.t('marketplace.selected') : I18n.t('marketplace.noneSelected')
              ),
              React.createElement('input', {
                type: 'text',
                value: bulkPrice,
                onChange: function(e) { applyBulkPrice(e.target.value); },
                onClick: function(e) { e.stopPropagation(); },
                placeholder: I18n.t('marketplace.priceBtc'),
                className: 'w-20 bg-bitmap-black border border-bitmap-border rounded px-1 py-0.5 font-acme text-xs text-white text-right placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange'
              })
            ),
            listItems.filter(function(item) {
              if (!dropdownSearch) return true;
              var q = dropdownSearch.toLowerCase();
              return (item.name && item.name.toLowerCase().indexOf(q) !== -1) ||
                     (item.id && item.id.toLowerCase().indexOf(q) !== -1) ||
                     (item.botNumber !== null && String(item.botNumber).indexOf(q) !== -1);
            }).map(function(item) {
              var imgSrc = '/api/v1/ordinal-content/' + item.id;
              var botMatch = item.name ? item.name.match(/Bittick Agent #(\d+)/) : null;
              var botNum = botMatch ? parseInt(botMatch[1], 10) : null;
              var displayName = botNum !== null ? 'Bittick Agent #' + botNum : (item.name || 'Agent');
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
                    className: 'bitmap-check'
                  }),
                  React.createElement('img', {
                    src: imgSrc,
                    alt: displayName,
                    className: 'w-8 h-8 rounded object-cover flex-shrink-0',
                    loading: 'lazy',
                    onError: function(e) { e.target.style.display = 'none'; }
                  }),
                  React.createElement('div', { className: 'flex-1 min-w-0' },
                    React.createElement('div', { className: 'flex items-center gap-1' },
                      React.createElement('span', { className: 'font-acme text-xs text-white truncate' }, displayName),
                      item.isListed ? React.createElement('span', {
                        className: 'px-1 py-0.5 bg-bitmap-orange/20 text-bitmap-orange font-acme text-[8px] rounded flex-shrink-0'
                      }, I18n.t('marketplace.listed')) : React.createElement('span', {
                        className: 'px-1 py-0.5 bg-red-500/20 text-red-400 font-acme text-[8px] rounded flex-shrink-0'
                      }, I18n.t('marketplace.notListed'))
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
              }, I18n.t('marketplace.listSelected'))
            )
          )
        ) : null
      ),
      React.createElement('div', { className: 'relative flex-shrink-0' },
        selectedItems.length > 0 ? React.createElement('button', {
          onClick: function(e) {
            e.stopPropagation();
            fetchMempoolFees();
            handleBuySelected();
          },
          className: 'px-3 py-1 bg-bitmap-orange text-black font-acme text-xs rounded-lg hover:bg-bitmap-orange/80 transition-colors flex-shrink-0 font-bold'
        }, I18n.t('marketplace.buySelected') + ' (' + selectedItems.length + ')') : React.createElement('button', {
          disabled: true,
          className: 'px-3 py-1 bg-bitmap-orange text-black font-acme text-xs rounded-lg flex-shrink-0 font-bold opacity-50'
        }, I18n.t('marketplace.buySelected')),
        buyToast ? React.createElement('div', {
          className: 'absolute right-0 top-full mt-1 px-3 py-2 rounded-lg shadow-lg z-50 whitespace-nowrap font-acme text-xs font-bold',
          style: { backgroundColor: '#2A0A0A', border: '1px solid #FF3333', color: '#FF5555', boxShadow: '0 4px 12px rgba(255,51,51,0.3)' }
        },
          React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement('div', { className: 'w-1.5 h-1.5 rounded-full flex-shrink-0', style: { backgroundColor: '#FF3333' } }),
            React.createElement('span', null, buyToast)
          )
        ) : null,
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
          buySuccessData ? React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'px-3 py-2 border-b border-bitmap-border' },
              React.createElement('span', { className: 'font-acme text-xs text-white font-bold' }, I18n.t('marketplace.buyResult'))
            ),
            React.createElement('div', { className: 'px-3 py-2 max-h-48 overflow-y-auto' },
              buySuccessData.items.map(function(r, i) {
                return React.createElement('div', { key: i, className: 'flex items-center justify-between py-1 border-b border-bitmap-border/30 last:border-0' },
                  React.createElement('span', { className: 'font-acme text-xs text-white truncate' }, r.name),
                  r.status === 'success' ? React.createElement('span', { className: 'font-acme text-[10px] text-green-400 flex-shrink-0 ml-2' }, I18n.t('marketplace.purchased')) :
                  React.createElement('span', { className: 'font-acme text-[10px] text-red-400 flex-shrink-0 ml-2' }, r.reason || I18n.t('app.error'))
                );
              }),
              buySuccessData.errors.length > 0 ? buySuccessData.errors.map(function(r, i) {
                return React.createElement('div', { key: 'err_' + i, className: 'flex items-center justify-between py-1 border-b border-bitmap-border/30 last:border-0' },
                  React.createElement('span', { className: 'font-acme text-xs text-white truncate' }, r.name),
                  React.createElement('span', { className: 'font-acme text-[10px] text-red-400 flex-shrink-0 ml-2' }, r.reason || I18n.t('app.error'))
                );
              }) : null
            ),
            React.createElement('div', { className: 'px-3 py-2 border-t border-bitmap-border' },
              React.createElement('div', { className: 'flex justify-between mb-1' },
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, I18n.t('marketplace.totalPaid')),
                React.createElement('span', { className: 'font-acme text-[10px] text-white' }, BitmapUtils.formatBtcSat(buySuccessData.totalPaid) + ' BTC')
              ),
              React.createElement('div', { className: 'flex justify-between mb-2' },
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, I18n.t('marketplace.marketplaceFee')),
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange' }, BitmapUtils.formatBtcSat(buySuccessData.totalFees) + ' BTC')
              ),
              React.createElement('button', {
                onClick: function(e) { e.stopPropagation(); setShowBuyMenu(false); setBuySuccessData(null); setBuyStatus(null); },
                className: 'w-full px-3 py-1.5 bg-bitmap-surface text-bitmap-text font-acme text-xs rounded hover:bg-bitmap-border transition-colors'
              }, I18n.t('marketplace.close'))
            )
          ) :
          React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'px-3 py-2 border-b border-bitmap-border' },
              React.createElement('span', { className: 'font-acme text-xs text-white font-bold' }, I18n.t('marketplace.confirmPurchase'))
            ),
            React.createElement('div', { className: 'px-3 py-2 max-h-32 overflow-y-auto' },
              filtered.filter(function(item) {
                return selectedItems.indexOf(item.id) !== -1 && item.listedPrice && item.listedPrice > 0;
              }).map(function(item) {
                var priceSats = item.listedPrice || 0;
                return React.createElement('div', { key: item.id, className: 'flex items-center justify-between py-1 border-b border-bitmap-border/30 last:border-0' },
                  React.createElement('span', { className: 'font-acme text-xs text-white truncate' }, item.name || 'Agent #' + item.inscriptionNumber),
                  React.createElement('span', { className: 'font-acme text-xs text-white flex-shrink-0 ml-2' }, BitmapUtils.formatBtcSat(priceSats) + ' BTC')
                );
              })
            ),
            React.createElement('div', { className: 'px-3 py-2 border-t border-bitmap-border' },
              React.createElement('div', { className: 'flex justify-between mb-1' },
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, I18n.t('marketplace.subtotal') + ' (' + selectedItems.length + ' ' + I18n.t('marketplace.items') + '):'),
                React.createElement('span', { className: 'font-acme text-[10px] text-white' },
                  BitmapUtils.formatBtcSat(filtered.filter(function(item) { return selectedItems.indexOf(item.id) !== -1 && item.listedPrice && item.listedPrice > 0; }).reduce(function(sum, item) { return sum + (item.listedPrice || 0); }, 0)) + ' BTC'
                )
              ),
              React.createElement('div', { className: 'flex justify-between mb-1' },
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, I18n.t('marketplace.marketplaceFee') + ' (2%):'),
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange' },
                  BitmapUtils.formatBtcSat(filtered.filter(function(item) { return selectedItems.indexOf(item.id) !== -1 && item.listedPrice && item.listedPrice > 0; }).reduce(function(sum, item) { return sum + Math.max(546, Math.floor((item.listedPrice || 0) * 0.02)); }, 0)) + ' BTC'
                )
              ),
              React.createElement('div', { className: 'flex justify-between mb-2 border-t border-bitmap-border/50 pt-1' },
                React.createElement('span', { className: 'font-acme text-[10px] text-white font-bold' }, I18n.t('marketplace.totalToPay')),
                React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold' },
                  BitmapUtils.formatBtcSat(filtered.filter(function(item) { return selectedItems.indexOf(item.id) !== -1 && item.listedPrice && item.listedPrice > 0; }).reduce(function(sum, item) { var p = item.listedPrice || 0; return sum + p + Math.max(546, Math.floor(p * 0.02)); }, 0)) + ' BTC'
                )
              ),
              React.createElement('div', { className: 'mb-2' },
                React.createElement('span', { className: 'font-acme text-[10px] block mb-1.5', style: { color: '#888' } }, I18n.t('marketplace.networkFee')),
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
                  }, I18n.t('marketplace.custom'))
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
                }, I18n.t('app.cancel')),
                React.createElement('button', {
                  onClick: function(e) { e.stopPropagation(); handleBuySelected(); },
                  className: 'flex-1 px-3 py-1.5 font-acme text-xs rounded font-bold transition-all',
                  style: {
                    background: 'linear-gradient(180deg, #FF6B35, #E8520E)',
                    color: '#000',
                    border: '1px solid #FF6B35',
                    boxShadow: '0 2px 8px rgba(255,107,53,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                  }
                }, I18n.t('marketplace.buySelected'))
              )
            )
          )
        ) : null
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
                buySuccessData.type === 'error' ? I18n.t('marketplace.purchaseFailed') :
                buySuccessData.items.length + ' ' + I18n.t('marketplace.purchasedSuccess')
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
                    BitmapUtils.formatBtcSat(item.price) + ' BTC'
                  )
                );
              })
            )
          ) : null,
          buySuccessData.errors.length > 0 ? React.createElement('div', { className: 'rounded-lg p-4 mb-4', style: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' } },
            React.createElement('div', { className: 'space-y-2' },
              buySuccessData.errors.map(function(item, i) {
                return React.createElement('div', { key: i, className: 'flex items-center justify-between' },
                  React.createElement('div', { className: 'flex items-center gap-2 min-w-0' },
                    React.createElement('div', {
                      className: 'w-1.5 h-1.5 rounded-full flex-shrink-0',
                      style: { backgroundColor: '#FF5555' }
                    }),
                    React.createElement('span', { className: 'font-acme text-sm truncate', style: { color: '#ddd' } }, item.name)
                  ),
                  React.createElement('span', { className: 'font-acme text-xs flex-shrink-0 ml-3', style: { color: '#FF5555' } },
                    item.reason || I18n.t('app.error')
                  )
                );
              })
            )
          ) : null,
          buySuccessData.totalPaid > 0 ? React.createElement('div', { className: 'rounded-lg p-4 mb-4', style: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' } },
            React.createElement('div', { className: 'flex justify-between mb-2' },
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#888' } }, I18n.t('marketplace.subtotal')),
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#ccc' } },
                BitmapUtils.formatBtcSat(buySuccessData.totalPaid) + ' BTC'
              )
            ),
            React.createElement('div', { className: 'flex justify-between mb-2' },
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#888' } }, I18n.t('marketplace.marketplaceFee')),
              React.createElement('span', { className: 'font-acme text-xs', style: { color: '#FF6B35' } },
                BitmapUtils.formatBtcSat(buySuccessData.totalFees) + ' BTC'
              )
            )
          ) : null
        ),
        React.createElement('div', { className: 'px-6 pb-6' },
          React.createElement('button', {
            onClick: function() { setBuySuccessData(null); setBuyStatus(null); },
            className: 'w-full px-4 py-3 rounded-lg font-acme text-sm font-bold transition-all',
            style: {
              background: 'linear-gradient(180deg, #FF6B35, #E8520E)',
              color: '#000',
              border: '1px solid #FF6B35',
              boxShadow: '0 4px 12px rgba(255,107,53,0.3)'
            }
          }, I18n.t('marketplace.close'))
        )
      )
    ) : null,
    isLoading
      ? React.createElement('div', { className: 'flex items-center justify-center py-16' },
          React.createElement('div', { className: 'w-8 h-8 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin' })
        )
      : React.createElement('div', { className: 'flex-1 overflow-y-auto pl-14 pr-4 py-3' },
          filtered.length === 0
            ? React.createElement('div', { className: 'text-center py-16 font-acme text-bitmap-muted' }, 'No agents found')
            : viewMode === 'list'
              ? React.createElement('div', null,
                  filtered.map(function(agent, i) {
                    var contentId = agent.id;
                    var imgUrl = '/api/v1/ordinal-content/' + contentId;
                    var isSelected = selectedItems.indexOf(agent.id) !== -1;
                    return React.createElement('div', {
                      key: agent.id || i,
                      className: 'px-4 py-1 hover:bg-bitmap-surface transition-colors cursor-pointer border-b border-bitmap-border/30'
                    },
                      React.createElement('div', { className: 'flex items-center gap-3' },
                        React.createElement('div', { className: 'flex-shrink-0', style: { width: 40, height: 40 } },
                          React.createElement('img', {
                            src: imgUrl,
                            alt: agent.name || 'Agent',
                            className: 'w-[40px] h-[40px] rounded object-cover',
                            loading: 'lazy',
                            onError: function(e) { e.target.style.display = 'none'; }
                          })
                        ),
                        React.createElement('div', { className: 'flex-1 min-w-0' },
                          React.createElement('div', { className: 'flex items-center justify-between' },
                            React.createElement('span', { className: 'font-mono text-sm text-white font-bold truncate' },
                              agent.botNumber !== null ? 'Bittick Agent #' + agent.botNumber : (agent.name || 'Agent')
                            ),
                            agent.inscriptionNumber ? React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted flex-shrink-0 ml-2' },
                              '#' + agent.inscriptionNumber
                            ) : null
                          )
                        ),
                        React.createElement('div', { className: 'flex items-center gap-2 flex-shrink-0' },
                          agent.listedPrice ? React.createElement('span', { className: 'font-acme text-xs font-semibold', style: { color: '#666666' } },
                            BitmapUtils.formatBtcSat(agent.listedPrice) + ' BTC'
                          ) : React.createElement('span', { className: 'flex items-center gap-1' },
                            React.createElement('span', { className: 'w-1.5 h-1.5 rounded-full flex-shrink-0', style: { backgroundColor: '#FF3333' } }),
                            React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted' }, I18n.t('marketplace.notListed'))
                          ),
                          React.createElement('div', {
                            onClick: function() { toggleSelection(agent.id); },
                            className: 'w-5 h-5 flex-shrink-0 cursor-pointer rounded flex items-center justify-center',
                            style: { backgroundColor: isSelected ? '#00AA00' : '#444', border: '1px solid #666' }
                          },
                            isSelected
                              ? React.createElement('svg', { width: 12, height: 12, viewBox: '0 0 12 12', fill: 'none' },
                                  React.createElement('path', { d: 'M2 6l3 3 5-5', stroke: '#000', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                                )
                              : null
                          )
                        )
                      )
                    );
                  })
                )
              : React.createElement('div', { className: 'flex flex-wrap gap-2 py-2' },
                  filtered.map(function(agent, i) {
                    var contentId = agent.id;
                    var imgUrl = '/api/v1/ordinal-content/' + contentId;
                    var isSelected = selectedItems.indexOf(agent.id) !== -1;
                    return React.createElement('div', {
                      key: agent.id || i,
                      className: 'bg-bitmap-surface border border-bitmap-border rounded-lg overflow-hidden hover:border-bitmap-orange transition-colors cursor-pointer',
                      style: { width: 'calc(20% - 7px)', minWidth: 140 }
                    },
                      React.createElement('div', { className: 'flex items-center justify-between px-2 py-1.5' },
                        React.createElement('div', { className: 'flex items-center gap-1 flex-shrink-0' },
                          agent.listedPrice ? React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold' },
                            BitmapUtils.formatBtcSat(agent.listedPrice) + ' BTC'
                          ) : React.createElement('span', { className: 'flex items-center gap-1' },
                            React.createElement('span', { className: 'w-1.5 h-1.5 rounded-full flex-shrink-0', style: { backgroundColor: '#FF3333' } }),
                            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' }, I18n.t('marketplace.notListed'))
                          )
                        ),
                        React.createElement('div', {
                          onClick: function() { toggleSelection(agent.id); },
                          className: 'w-4 h-4 cursor-pointer rounded flex items-center justify-center flex-shrink-0',
                          style: { backgroundColor: isSelected ? '#00AA00' : '#444', border: '1px solid #666' }
                        },
                          isSelected
                            ? React.createElement('svg', { width: 10, height: 10, viewBox: '0 0 12 12', fill: 'none' },
                                React.createElement('path', { d: 'M2 6l3 3 5-5', stroke: '#000', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
                              )
                            : null
                        )
                      ),
                      React.createElement('img', {
                        src: imgUrl,
                        alt: agent.name || 'Agent',
                        className: 'w-full object-cover group-hover:scale-105 transition-transform duration-200',
                        style: { aspectRatio: '1/1', background: '#111', display: 'block' },
                        loading: 'lazy',
                        onError: function(e) { e.target.style.display = 'none'; }
                      }),
                      React.createElement('div', { className: 'p-2 text-center' },
                        React.createElement('div', { className: 'font-acme text-[12px] text-bitmap-orange truncate' },
                          agent.botNumber !== null ? 'Bittick Agent #' + agent.botNumber : (agent.name || 'Agent')
                        ),
                        agent.inscriptionNumber ? React.createElement('div', { className: 'font-acme text-[10px] text-bitmap-muted truncate' },
                          '#' + agent.inscriptionNumber
                        ) : null
                      )
                    );
                  })
                )
        )
  );
}
