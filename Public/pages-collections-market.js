/*
 * ============================================================================
 *  pages-collections-market.js  —  PANTALLA DINÁMICA DE COLECCIÓN (independiente)
 * ============================================================================
 *  UNA sola pantalla compartida por TODAS las colecciones registradas. Se cambia
 *  de colección por su slug (id). NO usa pages-local ni pages-bittick.
 *
 *  - Mercado (comprar): listings activos de listings donde collection === slug.
 *  - Listar: activos del wallet conectado que pertenecen a inscriptions.json.
 *  Todo el listado y la compra DELEGAN a MarketplaceLister / MarketplaceBuyer
 *  con una cfg dinámica (endpoints unificados). Nunca lógica duplicada.
 * ============================================================================
 */
function CollectionsMarketPage(props) {
  var navigate = props.navigate;
  var params = (typeof ReactRouterDOM !== 'undefined' && ReactRouterDOM.useParams) ? ReactRouterDOM.useParams() : {};
  var slug = params.slug;

  var _col = React.useState(null);
  var collection = _col[0];
  var setCollection = _col[1];
  var _load = React.useState(true);
  var isLoading = _load[0];
  var setIsLoading = _load[1];
  var _err = React.useState(null);
  var error = _err[0];
  var setError = _err[1];

  // Listings activos (mercado / comprar)
  var _listings = React.useState([]);
  var listings = _listings[0];
  var setListings = _listings[1];
  var _selected = React.useState([]);
  var selectedIds = _selected[0];
  var setSelectedIds = _selected[1];

  // Items del usuario listables (para listar)
  var _ownItems = React.useState([]);
  var ownItems = _ownItems[0];
  var setOwnItems = _ownItems[1];
  var _showListMenu = React.useState(false);
  var showListMenu = _showListMenu[0];
  var setShowListMenu = _showListMenu[1];
  var _listSel = React.useState({});
  var listSelection = _listSel[0];
  var setListSelection = _listSel[1];
  var _prices = React.useState({});
  var listPrices = _prices[0];
  var setListPrices = _prices[1];
  var _bulk = React.useState('');
  var bulkPrice = _bulk[0];
  var setBulkPrice = _bulk[1];
  var _listStatus = React.useState(null);
  var listStatus = _listStatus[0];
  var setListStatus = _listStatus[1];

  // Buy menu state
  var _showBuy = React.useState(false);
  var showBuyMenu = _showBuy[0];
  var setShowBuyMenu = _showBuy[1];
  var _buyStatus = React.useState(null);
  var buyStatus = _buyStatus[0];
  var setBuyStatus = _buyStatus[1];
  var _buyResult = React.useState(null);
  var buyResult = _buyResult[0];
  var setBuyResult = _buyResult[1];

  var walletNow = StoreApp.get('wallet');

  var collectionCfg = React.useMemo(function() {
    return {
      collection: slug,
      idFromItem: function(item) { return item.listingId || item.bitmapId || item.id; },
      assetLabel: (collection && collection.name) ? collection.name : 'activo',
      nameFromItem: function(item) { return item.name || item.title || ((collection && collection.name) || 'Activo') + ' #' + (item.inscriptionNumber || ''); },
      transport: {
        batchBuy: function(payload) { payload.collection = slug; return MarketplaceApi.unifiedBuy(payload); },
        batchBroadcast: function(payload) { payload.collection = slug; return MarketplaceApi.unifiedBroadcast(payload); }
      }
    };
  }, [slug, collection]);

  // Cargar colección + listings activos de esa colección
  var loadAll = function() {
    setIsLoading(true);
    setError(null);
    AssetApi.getCollection(slug).then(function(colRes) {
      if (!colRes || !colRes.success || !colRes.data) { setIsLoading(false); setError('Colección no encontrada'); return; }
      setCollection(colRes.data);
      // Listings activos
      MarketplaceApi.getLocal().then(function(listRes) {
        var all = (listRes && listRes.data && listRes.data.items) || [];
        var mine = all.filter(function(l) { return l.collection === slug && l.isActive; });
        setListings(mine);
        setIsLoading(false);
      }).catch(function() { setIsLoading(false); });
    }).catch(function() { setIsLoading(false); setError('Colección no encontrada'); });
  };

  React.useEffect(function() { if (slug) loadAll(); }, [slug]);

  // Cargar items del wallet que pertenecen a inscriptions.json de la colección
  var loadOwnItems = function() {
    var w = StoreApp.get('wallet');
    if (!w || !w.address || !collection) return;
    AssetApi.getUserAssets(w.address).then(function(res) {
      var set = {};
      (collection.items || []).forEach(function(it) {
        var id = (it && (it.inscriptionId || it.id)) || '';
        if (id) set[id] = true;
      });
      var owned = [];
      var collections = (res && res.data && res.data.collections) || [];
      collections.forEach(function(c) {
        (c.items || []).forEach(function(it) {
          var id = it.id || it.inscriptionId || '';
          if (set[id]) {
            owned.push({ id: id, name: it.name || it.title, inscriptionNumber: it.inscriptionNumber || it.number, output: it.output || it.satpoint, value: it.value, isSelected: false, priceSatoshis: 0, isListed: false, existingPrice: 0 });
          }
        });
      });
      setOwnItems(owned);
    }).catch(function() {});
  };
  React.useEffect(function() { loadOwnItems(); }, [collection]);

  var toggleOwn = function(id, checked) {
    setOwnItems(ownItems.map(function(it) {
      if (it.id === id) return Object.assign({}, it, { isSelected: checked });
      return it;
    }));
  };

  var setPrice = function(id, val) {
    var clean = val.replace(/[^0-9.]/g, '');
    var sats = clean ? Math.round(parseFloat(clean) * 100000000) : 0;
    setListPrices(Object.assign({}, listPrices, { [id]: { btc: clean, sats: sats } }));
  };

  var applyBulk = function(val) {
    setBulkPrice(val);
    if (val && parseFloat(val) > 0) {
      var np = {};
      ownItems.forEach(function(it) { if (it.isSelected) np[it.id] = { btc: val, sats: Math.round(parseFloat(val) * 100000000) }; });
      setListPrices(Object.assign({}, listPrices, np));
    }
  };

  var handleList = function() {
    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) return;
    var selected = ownItems.filter(function(it) { return it.isSelected && listPrices[it.id] && listPrices[it.id].sats > 0; });
    if (selected.length === 0) return;
    setListStatus('Preparando listings...');

    var _listTrackingId = null;
    TrackingAPI.startListing(slug, selected).then(function(id) {
      _listTrackingId = id;

      MarketplaceLister.list({
        selected: selected,
        listApi: {
          create: function(items) { return MarketplaceApi.unifiedList(slug, items); },
          sign: function(ids, hexs, pubKey) { return MarketplaceApi.unifiedSign(slug, ids, hexs, pubKey); }
        },
        toBatchItem: function(item, w, pubKey) {
          return {
            inscriptionId: item.id,
            price: listPrices[item.id].sats,
            sellerAddress: w.address,
            sellerOrdinalPublicKey: pubKey,
            sellerPaymentAddress: w.paymentAddress || w.address,
            name: item.name || ((collection && collection.name) || 'Activo') + ' #' + (item.inscriptionNumber || ''),
            imageUrl: '',
            inscriptionNumber: item.inscriptionNumber || 0,
            inscriptionUtxo: item.output,
            inscriptionValue: item.value,
            inscriptionContentType: '',
            inscriptionHeight: 0,
            isPriceUpdate: false
          };
        }
      }, {
        status: function(m) { setListStatus(m); TrackingAPI.updateListing(_listTrackingId, { items_json: selected.map(function(i) { return { id: i.id, name: i.name, price: listPrices[i.id] ? listPrices[i.id].sats : 0, inscriptionNumber: i.inscriptionNumber }; }) }); },
        onError: function(m) { setListStatus(m); TrackingAPI.submitListing(_listTrackingId, 'error', m, 'LIST_ERROR'); },
        onActivated: function() { setListStatus('Colección listada correctamente'); loadAll(); TrackingAPI.submitListing(_listTrackingId, 'activated', null, null); },
        onComplete: function() { setShowListMenu(false); }
      });
    });
  };

  // Selección de compra
  var toggleBuy = function(id) {
    var idx = selectedIds.indexOf(id);
    if (idx === -1) setSelectedIds(selectedIds.concat([id]));
    else setSelectedIds(selectedIds.filter(function(i) { return i !== id; }));
  };
  var buySelected = listings.filter(function(l) { return selectedIds.indexOf(l.listingId || l.bitmapId || l.id) !== -1 && (l.listedPrice || l.price) > 0; });

  var handleBuy = function() {
    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) return;
    if (buySelected.length === 0) return;
    setShowBuyMenu(true);
    setBuyResult(null);
    setBuyStatus({ message: 'Preparando compra...', type: 'loading' });

    var _buyTrackingId = null;
    TrackingAPI.startBuying(slug, buySelected).then(function(id) {
      _buyTrackingId = id;

      MarketplaceBuyer.buy({
        selected: buySelected,
        idFromItem: function(item) { return item.listingId || item.bitmapId || item.id; },
        buyIdsKey: 'ids',
        collection: slug,
        assetLabel: (collection && collection.name) ? collection.name : 'activo',
        nameFromItem: function(item) { return item.name || ((collection && collection.name) || 'Activo'); },
        transport: {
          batchBuy: function(payload) { payload.collection = slug; return MarketplaceApi.unifiedBuy(payload); },
          batchBroadcast: function(payload) { payload.collection = slug; return MarketplaceApi.unifiedBroadcast(payload); }
        }
      }, { feeRate: 3, idempotencyPrefix: 'collection_buy' }, {
        status: function(s) { setBuyStatus({ message: s.message, type: s.type }); },
        onBatchBuy: function(buyJson) {
          TrackingAPI.updateBuying(_buyTrackingId, { psbt_hex: buyJson.psbtHex || null });
        },
        onResult: function(result) {
          if (result.type === 'success') {
            TrackingAPI.submitBuying(_buyTrackingId, 'confirmed', null, null, result.txid || null);
          } else {
            TrackingAPI.submitBuying(_buyTrackingId, 'error', result.errors ? result.errors.map(function(e){return e.error||''}).join('; ') : 'Unknown error', 'BUY_ERROR');
          }
          setBuyResult(result);
          setBuyStatus({ message: result.type === 'success' ? 'Compra exitosa' : 'Error en la compra', type: result.type });
          setSelectedIds([]);
          setTimeout(function() { loadAll(); }, 2000);
        }
      });
    });
  };

  var fmtBtc = function(sats) { return BitmapUtils ? BitmapUtils.formatBtcSat(sats) : ((sats || 0) / 1e8).toFixed(6); };
  var imgUrl = function(item) {
    return '/api/v1/ordinal-content/' + (item.id || item.inscriptionId || '');
  };

  // ====== RENDER ======
  return React.createElement('div', { className: 'flex flex-col h-full bg-bitmap-black' },
    // Header
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border px-4 py-3 flex items-center gap-3' },
      React.createElement('button', { onClick: function() { navigate('/add-collection'); }, className: 'text-bitmap-orange text-xl font-bold' }, '\uFF0B'),
      collection && collection.image
        ? React.createElement('img', { src: collection.image, className: 'w-10 h-10 rounded object-cover', alt: collection.name })
        : React.createElement('div', { className: 'w-10 h-10 rounded flex items-center justify-center text-white font-alfaslab', style: { background: '#FE3E00' } }, (collection && collection.name ? collection.name.charAt(0) : '?')),
      React.createElement('div', { className: 'flex-1' },
        React.createElement('div', { className: 'font-alfaslab text-white text-base' }, (collection && collection.name) || 'Colección'),
        React.createElement('div', { className: 'font-acme text-[11px] text-bitmap-muted' }, (collection && collection.description) || ''),
        collection && (collection.x_account || collection.discord)
          ? React.createElement('div', { className: 'flex gap-3 mt-1' },
              collection.x_account ? React.createElement('a', { href: collection.x_account, target: '_blank', className: 'text-[11px] text-bitmap-orange hover:underline' }, 'X') : null,
              collection.discord ? React.createElement('a', { href: collection.discord, target: '_blank', className: 'text-[11px] text-bitmap-orange hover:underline' }, 'Discord') : null
            )
          : null
      ),
      collection ? React.createElement('span', { className: 'font-acme text-[11px] text-bitmap-muted' }, (collection.supply || collection.total || 0) + ' items') : null
    ),

    isLoading ? React.createElement('div', { className: 'flex-1 flex items-center justify-center text-bitmap-muted font-acme' }, 'Cargando...')
    : error ? React.createElement('div', { className: 'flex-1 flex items-center justify-center text-bitmap-red font-acme' }, error)
    : React.createElement('div', { className: 'flex-1 overflow-y-auto' },

      // ----- Mi colección: listar -----
      React.createElement('div', { className: 'p-4' },
        React.createElement('div', { className: 'flex items-center justify-between mb-3' },
          React.createElement('span', { className: 'font-alfaslab text-white text-sm' }, 'Mi colección'),
          React.createElement('button', {
            onClick: function() { setShowListMenu(!showListMenu); },
            className: 'px-3 py-1.5 rounded-lg text-xs font-acme font-bold',
            style: { background: 'linear-gradient(180deg,#FE3E00,#b52a00)', color: '#fff' }
          }, 'Listar')
        ),
        showListMenu ? React.createElement('div', { className: 'bg-bitmap-surface border border-bitmap-border rounded-lg p-3 mb-3' },
          React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
            React.createElement('input', { type: 'number', min: '0', placeholder: 'Precio BTC para todos', value: bulkPrice, onChange: function(e) { applyBulk(e.target.value); }, className: 'flex-1 bg-bitmap-black border border-bitmap-border rounded px-3 py-1.5 text-xs text-white' }),
            React.createElement('button', { onClick: handleList, className: 'px-3 py-1.5 rounded text-xs font-acme text-white', style: { background: 'linear-gradient(180deg,#FE3E00,#b52a00)' } }, listStatus && listStatus.indexOf('Creando') !== -1 ? '...' : 'Confirmar listado')
          ),
          listStatus ? React.createElement('div', { className: 'text-[11px] mb-2', style: { color: '#FFAA00' } }, listStatus) : null,
          ownItems.length === 0
            ? React.createElement('div', { className: 'text-[12px] text-bitmap-muted py-2' }, 'No se encontraron items de esta colección en tu wallet conectada.')
            : React.createElement('div', { className: 'max-h-64 overflow-y-auto space-y-1' },
                ownItems.map(function(it) {
                  var p = listPrices[it.id];
                  return React.createElement('div', { key: it.id, className: 'flex items-center gap-2 py-1 border-b border-bitmap-border/30' },
                    React.createElement('input', { type: 'checkbox', checked: !!it.isSelected, onChange: function(e) { toggleOwn(it.id, e.target.checked); } }),
                    React.createElement('img', { src: imgUrl(it), className: 'w-6 h-6 rounded object-cover', onError: function(e) { e.target.style.visibility = 'hidden'; } }),
                    React.createElement('span', { className: 'flex-1 text-[11px] text-white truncate' }, it.name || it.id),
                    React.createElement('input', { type: 'text', value: p ? p.btc : '', placeholder: 'Precio', onChange: function(e) { setPrice(it.id, e.target.value); }, className: 'w-24 bg-bitmap-black border border-bitmap-border rounded px-2 py-1 text-[11px] text-white' })
                  );
                })
              )
        ) : null
      ),

      // ----- Mercado: comprar -----
      React.createElement('div', { className: 'px-4 pb-4' },
        React.createElement('div', { className: 'flex items-center justify-between mb-2' },
          React.createElement('span', { className: 'font-alfaslab text-white text-sm' }, 'Mercado'),
          buySelected.length > 0
            ? React.createElement('button', { onClick: function() { setShowBuyMenu(!showBuyMenu); handleBuy(); }, className: 'px-3 py-1.5 rounded-lg text-xs font-acme font-bold', style: { background: 'linear-gradient(180deg,#FE3E00,#b52a00)', color: '#fff' } }, 'Comprar ' + buySelected.length)
            : null
        ),
        buyStatus ? React.createElement('div', { className: 'text-[11px] mb-2', style: buyStatus.type === 'error' ? { color: '#FF5555' } : { color: '#FFAA00' } }, buyStatus.message) : null,
        listings.length === 0
          ? React.createElement('div', { className: 'text-center py-10 text-bitmap-muted font-acme text-sm' }, 'Aún no hay items listados en esta colección.')
          : React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3' },
              listings.map(function(l) {
                var lid = l.listingId || l.bitmapId || l.id;
                var sel = selectedIds.indexOf(lid) !== -1;
                return React.createElement('div', {
                  key: lid,
                  onClick: function() { toggleBuy(lid); },
                  className: 'bg-bitmap-surface border rounded-lg p-2 cursor-pointer transition-colors',
                  style: sel ? { borderColor: '#FE3E00' } : { borderColor: 'transparent' }
                },
                  React.createElement('img', { src: imgUrl(l), className: 'w-full aspect-square object-cover rounded mb-1', onError: function(e) { e.target.style.visibility = 'hidden'; } }),
                  React.createElement('div', { className: 'text-[11px] text-white truncate' }, l.name || ('#' + (l.inscriptionNumber || ''))),
                  React.createElement('div', { className: 'text-[11px] text-bitmap-orange font-bold' }, fmtBtc(l.listedPrice || l.price) + ' BTC')
                );
              })
            )
      )
    )
  );
}

if (typeof window !== 'undefined') {
  window.CollectionsMarketPage = CollectionsMarketPage;
}
