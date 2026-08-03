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

  var fetchListings = function() {
    setIsLoading(true);
    ApiClient.get('/api/v1/unified/cache/listings?sort=listedAtDesc&limit=200', true)
      .then(function(res) {
        var items = (res.data || []).filter(function(item) {
          return item.source === 'local';
        });
        setListings(items);
        setIsLoading(false);
      })
      .catch(function() { setIsLoading(false); });
  };

  React.useEffect(function() {
    fetchListings();
    var interval = setInterval(fetchListings, 300000);
    return function() { clearInterval(interval); };
  }, []);

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
        React.createElement('span', { className: 'font-acme text-xs text-bitmap-text hidden md:inline' },
          'listados: ',
          React.createElement('span', { className: 'text-bitmap-orange font-bold' }, BitmapUtils.formatNumber(listings.length))
        ),
        React.createElement('span', { className: 'font-acme text-xs text-bitmap-text hidden md:inline' },
          'Piso: ',
          React.createElement('span', { className: 'text-bitmap-orange font-bold' }, floorBtc + ' BTC')
        ),
        React.createElement('div', { className: 'relative ml-auto md:ml-2' },
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
                onClick: function(e) { e.stopPropagation(); handleSort(btn.key); },
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
