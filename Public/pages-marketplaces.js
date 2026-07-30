function OrdinalswalletPage(props) {
  var navigate = props.navigate;
  var vm = OrdinalswalletViewModel;
  var _a = React.useState(vm.getListings());
  var listings = _a[0];
  var setListings = _a[1];
  var _b = React.useState(vm.getFloorPrice());
  var floorPrice = _b[0];
  var setFloorPrice = _b[1];
  var _c = React.useState(vm.getTotalListings());
  var totalListings = _c[0];
  var setTotalListings = _c[1];
  var _d = React.useState(vm.getCurrentSort());
  var currentSort = _d[0];
  var setCurrentSort = _d[1];
  var _e = React.useState(vm.getLastUpdateTime());
  var lastUpdateTime = _e[0];
  var setLastUpdateTime = _e[1];
  var _f = React.useState(vm.getIsLoading());
  var isLoading = _f[0];
  var setIsLoading = _f[1];
  var _g = React.useState(vm.getCacheCount());
  var cacheCount = _g[0];
  var setCacheCount = _g[1];
  var _h = React.useState(0);
  var tick = _h[0];
  var setTick = _h[1];
  var scrollContainerRef = React.useRef(null);
  var _i = React.useState(false);
  var statsUnchanged = _i[0];
  var setStatsUnchanged = _i[1];

  React.useEffect(function() {
    vm.loadFromCacheOnly();
    vm.startPolling();
    var unsub1 = vm.subscribe('listings', function() { setListings(vm.getListings()); });
    var unsub2 = vm.subscribe('stats', function() {
      setFloorPrice(vm.getFloorPrice());
      setTotalListings(vm.getTotalListings());
    });
    var unsub3 = vm.subscribe('sort', function() { setCurrentSort(vm.getCurrentSort()); });
    var unsub4 = vm.subscribe('time', function() { setLastUpdateTime(vm.getLastUpdateTime()); });
    var unsub5 = vm.subscribe('loading', function() { setIsLoading(vm.getIsLoading()); });
    var unsub6 = vm.subscribe('count', function() { setCacheCount(vm.getCacheCount()); });
    var unsub7 = vm.subscribe('refresh', function() {
      vm.loadFromCacheOnly();
      setStatsUnchanged(false);
    });
    var unsub8 = vm.subscribe('stats-unchanged', function() {
      setStatsUnchanged(true);
      setTimeout(function() { setStatsUnchanged(false); }, 3000);
    });
    return function() {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8();
      vm.stopPolling();
    };
  }, []);

  React.useEffect(function() {
    var timer = setInterval(function() { setTick(function(t) { return t + 1; }); }, 1000);
    return function() { clearInterval(timer); };
  }, []);

  var remaining = Math.max(0, Math.floor(300 - ((Date.now() - lastUpdateTime) / 1000) % 300));
  var mins = Math.floor(remaining / 60);
  var secs = remaining % 60;
  var timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;
  var floorBtc = floorPrice > 0 ? (floorPrice / 100000000).toFixed(5) : 'N/A';

  var handleSort = function(sort) {
    vm.updateSortOrder(sort);
  };

  var handleRefresh = function() {
    vm.triggerManualRefresh();
  };

  var handleScrollCheck = function() {
    var container = scrollContainerRef.current;
    if (!container) return;
    var nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
    if (nearBottom) { vm.loadMore(); }
  };

  var sortButtons = [
    { key: 'listedAtDesc', label: 'Recientes' },
    { key: 'priceDesc', label: '$ Alto' },
    { key: 'priceAsc', label: '$ Bajo' }
  ];

  var _j = React.useState('');
  var searchQuery = _j[0];
  var setSearchQuery = _j[1];

  var filtered = listings;
  if (searchQuery) {
    filtered = listings.filter(function(item) {
      var s = String(item.bitmapNumber || item.bitmapId || item.extraData || '');
      return s.indexOf(searchQuery) !== -1;
    });
  }

  var _k = React.useState(false);
  var showSortMenu = _k[0];
  var setShowSortMenu = _k[1];

  var sortLabel = { listedAtDesc: 'Recientes', priceDesc: '$ Alto', priceAsc: '$ Bajo' };

  React.useEffect(function() {
    if (!showSortMenu) return;
    var close = function() { setShowSortMenu(false); };
    window.addEventListener('click', close);
    return function() { window.removeEventListener('click', close); };
  }, [showSortMenu]);

  return React.createElement('div', { className: 'flex flex-col h-full' },
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border pl-14 pr-4 py-2' },
      React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
        React.createElement('span', { className: 'font-alfaslab text-sm text-white tracking-wide' }, 'Ordinalswallet Marketplace'),
        React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted ml-2 hidden sm:inline' },
          'actualizado: ',
          React.createElement('span', { className: 'text-bitmap-orange font-bold', onClick: handleRefresh, style:{cursor:'pointer'} }, timeStr)
        ),
        React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted hidden sm:inline' },
          'cargados: ',
          React.createElement('span', { className: 'text-bitmap-orange font-bold' }, BitmapUtils.formatNumber(listings.length) + ' / ' + BitmapUtils.formatNumber(totalListings))
        ),
        React.createElement('span', { className: 'font-acme text-xs text-bitmap-text ml-auto hidden md:inline' },
          'listados: ',
          React.createElement('span', { className: 'text-bitmap-orange font-bold' }, BitmapUtils.formatNumber(totalListings))
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
    isLoading && listings.length === 0
      ? React.createElement('div', { className: 'flex items-center justify-center py-16' },
          React.createElement('div', { className: 'font-acme text-bitmap-muted' }, 'Cargando datos...')
        )
      : React.createElement('div', { ref: scrollContainerRef, onScroll: handleScrollCheck, className: 'flex-1 overflow-y-auto pl-14 pr-4' },
          filtered.length === 0
            ? React.createElement('div', { className: 'text-center py-16 font-acme text-bitmap-muted' }, 'No hay listados disponibles')
            : React.createElement('div', { className: 'divide-y divide-bitmap-border' },
                filtered.map(function(item, i) {
                  var btcPrice = item.listedPrice ? (item.listedPrice / 100000000).toFixed(5) : '0';
                  var addr = BitmapUtils.truncateAddress(item.ownerAddress, 6);
                  var etiquetas = item.etiquetas || '';
                  var isPerfect = etiquetas.indexOf('Perfect') !== -1;
                  var isPunk = etiquetas.indexOf('Punk') !== -1;
                  return React.createElement('div', {
                    key: item.bitmapId || i,
                    className: 'px-4 py-3 hover:bg-bitmap-surface transition-colors cursor-pointer'
                  },
                    React.createElement('div', { className: 'flex items-center gap-3' },
                      React.createElement('div', { className: 'flex-shrink-0', style: { width: 80, height: 80 } },
                        React.createElement('img', {
                          src: '/api/v1/block-image/' + (item.bitmapNumber || 0) + '?size=80&etiquetas=' + encodeURIComponent(etiquetas || '') + '&tx=' + (item.totalTransacciones || 0) + '&hash=' + encodeURIComponent(item.hash || '') + '&perfect=' + isPerfect + '&punk=' + isPunk,
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
                              '#' + (item.bitmapNumber || '?') + '.bitmap'
                            ),
                            React.createElement('span', { className: 'font-acme text-xs text-white' }, BitmapUtils.timeAgo(item.listedAt))
                          ),
                          React.createElement('span', { className: 'font-acme text-sm font-semibold text-bitmap-orange-light' },
                            btcPrice + ' BTC'
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
              ),
          vm.getIsLoadingMore() ? React.createElement('div', { className: 'text-center py-4 font-acme text-bitmap-muted text-xs' }, 'Cargando m\u00e1s...') : null,
          !vm.getHasMore() && listings.length > 0 ? React.createElement('div', { className: 'text-center py-4 font-acme text-bitmap-muted text-xs' }, 'Todos los listados cargados') : null
        )
  );
}
function UnisatPage(props) {
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
  var _d = React.useState('price');
  var sortBy = _d[0];
  var setSortBy = _d[1];

  React.useEffect(function() {
    setIsLoading(true);
    MarketplaceApi.getUnisat().then(function(data) {
      var items = data.data || data || [];
      setListings(Array.isArray(items) ? items : []);
      setIsLoading(false);
    }).catch(function() { setIsLoading(false); });
  }, []);

  var filtered = listings
    .filter(function(l) { return !searchQuery || String(l.blockNumber || l.block || l.id || '').indexOf(searchQuery) !== -1; })
    .sort(function(a, b) {
      if (sortBy === 'price') return (a.price || 0) - (b.price || 0);
      return (a.blockNumber || 0) - (b.blockNumber || 0);
    });

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
      React.createElement('div', { className:'flex flex-col sm:flex-row gap-3' },
        React.createElement('input', {
          type:'text', value:searchQuery,
          onChange:function(e) { setSearchQuery(e.target.value); },
          placeholder:'Buscar por n\u00famero de bloque...',
          className:'flex-1 bg-bitmap-surface border border-bitmap-border rounded-lg px-4 py-2.5 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange'
        }),
        React.createElement('select', {
          value:sortBy,
          onChange:function(e) { setSortBy(e.target.value); },
          className:'bg-bitmap-surface border border-bitmap-border rounded-lg px-3 py-2.5 font-acme text-sm text-bitmap-text focus:outline-none'
        },
          React.createElement('option', { value:'price' }, 'Precio'),
          React.createElement('option', { value:'block' }, 'Bloque')
        )
      ),
      isLoading ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
      filtered.length === 0 ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('marketplace.noListings')) :
      React.createElement(MarketPreview, { listings:filtered, marketplace:'unisat' })
    )
  );
}
