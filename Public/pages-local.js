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
  var _k = React.useState(false);
  var showConfirmMenu = _k[0];
  var setShowConfirmMenu = _k[1];
  var _l = React.useState([]);
  var confirmItems = _l[0];
  var setConfirmItems = _l[1];

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
    ApiClient.get('/api/v1/unified/cache/listings?sort=listedAtDesc&limit=200&source=local', true)
      .then(function(res) {
        var items = res.data || [];
        setListings(items);
        setIsLoading(false);
      })
      .catch(function() { setIsLoading(false); });
  };

  var fetchUserBitmapsForListing = function() {
    var wallet = StoreApp.get('wallet');
    if (!wallet || !wallet.address) return;
    setIsLoadingDropdown(true);
    setDropdownSearch('');
    setShowConfirmMenu(false);

    Promise.all([
      AssetApi.getUserAssets(wallet.address),
      ApiClient.get('/api/v1/unified/cache/listings?source=local&limit=500', true).catch(function() { return { data: [] }; })
    ]).then(function(results) {
      var res = results[0];
      var listingsRes = results[1];
      var localListings = (listingsRes && listingsRes.data) || [];
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
                priceStr: existing ? (existing.listedPrice / 100000000).toFixed(8) : '',
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
      if (item.id === itemId) return Object.assign({}, item, { isSelected: checked });
      return item;
    });
    setListItems(updated);
  };

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

    try {
      var pubKey = wallet.publicKey;
      if (!pubKey) {
        setListingStatus({ toast:'Error: reconecta la wallet para obtener la public key' });
        return;
      }

      var batchItems = selected.map(function(item) {
        var isPriceUpdate = item.isListed && item.existingPrice > 0 && item.priceSatoshis !== item.existingPrice;
        return {
          inscriptionId: item.id,
          price: item.priceSatoshis,
          sellerAddress: wallet.address,
          sellerOrdinalPublicKey: pubKey || wallet.address,
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

      var createRes = await MarketplaceApi.batchList(batchItems);
      var createJson = await createRes;

      if (createJson.success && createJson.data && createJson.data.psbtToSign) {
        if (window.unisat && window.unisat.signPsbt) {
          try {
            var signPromise = window.unisat.signPsbt(createJson.data.psbtToSign);
            var signTimeout = new Promise(function(_, reject) {
              setTimeout(function() { reject(new Error('timeout')); }, 30000);
            });
            var signedPsbt = await Promise.race([signPromise, signTimeout]);
            var listingIds = createJson.data.listingIds || [];
            if (listingIds.length > 0 && signedPsbt) {
              await MarketplaceApi.batchSign(listingIds, signedPsbt, pubKey || wallet.address);
            }
            setListingStatus({ toast: listingIds.length + ' bitmaps listados/actualizados con 1 firma' });
          } catch(e) {
            setListingStatus({ toast:'Error al firmar: ' + e.message });
          }
        } else {
          setListingStatus({ toast:'Error: Unisat wallet no disponible' });
        }
      } else {
        setListingStatus({ toast:'Error al crear listings' });
      }
      fetchListings();
    } catch(e) {
      setListingStatus({ toast:'Error: ' + e.message });
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

  return React.createElement('div', { className: 'flex flex-col h-full' },
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border pl-14 pr-4 py-2' },
      React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
        React.createElement('span', { className: 'font-alfaslab text-sm text-white tracking-wide' }, 'Bitmapcore Marketplace'),
        React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted ml-2 hidden sm:inline' },
          'cargados: ',
          React.createElement('span', { className: 'text-bitmap-orange font-bold' }, BitmapUtils.formatNumber(filtered.length))
        ),
        React.createElement('div', { className: 'relative' },
          React.createElement('button', {
            onClick: function(e) { e.stopPropagation(); fetchUserBitmapsForListing(); setShowListDropdown(true); },
            disabled: isLoadingDropdown,
            className: 'px-3 py-1 bg-bitmap-orange text-white font-acme text-xs rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
          }, isLoadingDropdown ? 'Cargando...' : 'Listar'),
          showListDropdown ? React.createElement('div', {
            className: 'absolute left-0 top-full mt-1 w-80 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-2 max-h-96 overflow-y-auto'
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
                      }, 'Nuevo')
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
                      style: { accentColor: '#666666', color: '#666666' }
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
                        }, 'Nuevo')
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
        React.createElement('span', { className: 'font-acme text-xs text-bitmap-text ml-auto hidden md:inline' },
          'listados: ',
          React.createElement('span', { className: 'text-bitmap-orange font-bold' }, BitmapUtils.formatNumber(listings.length))
        ),
        React.createElement('span', { className: 'font-acme text-xs text-bitmap-text hidden md:inline' },
          'Piso: ',
          React.createElement('span', { className: 'text-bitmap-orange font-bold' }, floorBtc + ' BTC')
        ),
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
    React.createElement('div', { className: 'pl-14 pr-4 py-2 border-b border-bitmap-border' },
      React.createElement('input', {
        type: 'text',
        value: searchQuery,
        onChange: function(e) { setSearchQuery(e.target.value); },
        placeholder: 'Buscar por numero de bitmap...',
        className: 'w-full bg-bitmap-black border border-bitmap-border rounded-lg px-3 py-2 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange transition-colors'
      })
    ),
    isLoading
      ? React.createElement('div', { className: 'flex items-center justify-center py-16' },
          React.createElement('div', { className: 'font-acme text-bitmap-muted' }, 'Cargando datos...')
        )
      : React.createElement('div', { ref: scrollContainerRef, className: 'flex-1 overflow-y-auto pl-14 pr-4' },
          filtered.length === 0
            ? React.createElement('div', { className: 'text-center py-16 font-acme text-bitmap-muted' }, 'No hay listados disponibles')
            : React.createElement('div', { className: 'divide-y divide-bitmap-border' },
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
                    className: 'px-4 py-3 hover:bg-bitmap-surface transition-colors cursor-pointer'
                  },
                    React.createElement('div', { className: 'flex items-center gap-3' },
                      React.createElement('div', { className: 'flex-shrink-0', style: { width: 80, height: 80 } },
                        React.createElement('img', {
                          src: '/api/v1/block-image/' + bn + '?size=80&etiquetas=' + encodeURIComponent(etiquetas || '') + '&tx=' + txs + '&hash=' + encodeURIComponent(hash || '') + '&perfect=' + isPerfect + '&punk=' + isPunk,
                          width: 80,
                          height: 80,
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
                            etiquetas
                              ? React.createElement(UniversalTagList, { etiquetas: etiquetas, fontSize: 10 })
                              : null
                          ),
                          React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted flex-shrink-0 ml-2 truncate' }, addr)
                        )
                      )
                    )
                  );
                })
              )
        )
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
