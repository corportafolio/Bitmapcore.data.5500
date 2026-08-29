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

function UnifiedPage(props) {
  var navigate = props.navigate;
  var vm = UnifiedViewModel;
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

  var floorBtc = floorPrice > 0 ? BitmapUtils.formatBtcSat(floorPrice) : 'N/A';

  var handleSort = function(sort) { vm.updateSortOrder(sort); };

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
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border pl-14 pr-4 py-2', style: { backgroundColor: '#1A1A1A' } },
      React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
        React.createElement('img', { src: 'BITMAP.png', alt: 'BitmapCore', className:'h-[30px] w-[30px] object-contain rounded flex-shrink-0', style:{ margin:'2px' } }),
        React.createElement('span', { className: 'font-alfaslab text-sm text-white tracking-wide' }, 'Todos los Mercados'),
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
        type: 'text', value: searchQuery,
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
                  var btcPrice = item.listedPrice ? BitmapUtils.formatBtcSat(item.listedPrice) : '0';
                  var addr = BitmapUtils.truncateAddress(item.ownerAddress, 6);
                  var etiquetas = item.etiquetas || '';
                  var isPerfect = etiquetas.toLowerCase().indexOf('grid') !== -1;
                  var isPunk = etiquetas.toLowerCase().indexOf('punk') !== -1;
                  return React.createElement('div', {
                    key: (item.source || '') + '_' + (item.bitmapId || i),
                    className: 'px-4 py-1.5 hover:bg-bitmap-surface transition-colors cursor-pointer'
                  },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                      React.createElement('div', { className: 'flex-shrink-0', style: { width: 55, height: 55 } },
                        React.createElement('img', {
                          src: '/api/v1/block-image/' + (item.bitmapNumber || 0) + '?v=5&size=55&etiquetas=' + encodeURIComponent(etiquetas || '') + '&tx=' + (item.totalTransacciones || 0) + '&hash=' + encodeURIComponent(item.hash || '') + '&grid=' + isPerfect + '&punk=' + isPunk,
                          width: 55,
                          height: 55,
                          loading: 'lazy',
                          style: { imageRendering: 'pixelated', background: '#1a1a1a', borderRadius: 4 }, alt: ''
                        })
                      ),
                      React.createElement('div', { className: 'flex-1 min-w-0' },
                        React.createElement('div', { className: 'flex items-center justify-between' },
                          React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('span', { className: 'font-mono text-sm text-white font-bold' },
                              (item.bitmapNumber || '?') + '.bitmap'
                            ),
                            React.createElement('span', { className: 'font-acme text-xs text-white' }, BitmapUtils.timeAgo(item.listedAt)),
                            React.createElement('span', {
                              className: 'px-1.5 py-0.5 rounded text-[9px] font-acme flex-shrink-0',
                              style: { backgroundColor: sourceColor(item.source) + '22', color: sourceColor(item.source), cursor: 'pointer' },
                              onClick: function(e) {
                                e.stopPropagation();
                                if (item.source === 'ordinalswallet') {
                                  window.open('https://ordinalswallet.com/collection/bitmap', '_blank');
                                } else if (item.source === 'unisat' || item.source === 'satflow') {
                                  window.open('https://unisat.io/market/collection?collectionId=bitmap', '_blank');
                                }
                              }
                            }, sourceLabel(item.source)),
                            React.createElement('img', {
                              src: item.source === 'ordinalswallet'
                                ? 'ordinalswallet_logo.png'
                                : (item.source === 'local' ? 'logo_bitmapcore_logo.png' : 'unisat_logo.png'),
                              style: { width: 10, height: 10, flexShrink: 0, cursor: 'pointer' },
                              onClick: function(e) {
                                e.stopPropagation();
                                if (item.source === 'ordinalswallet') {
                                  window.open('https://ordinalswallet.com/collection/bitmap', '_blank');
                                } else if (item.source === 'unisat' || item.source === 'satflow') {
                                  window.open('https://unisat.io/market/collection?collectionId=bitmap', '_blank');
                                }
                              },
                              alt: ''
                            })
                          ),
                          React.createElement('span', { className: 'font-acme text-sm font-semibold', style:{ color:'#666666' } },
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

function TagTablesPage(props) {
  var navigate = props.navigate;
  var _a = React.useState([]);
  var tags = _a[0];
  var setTags = _a[1];
  var _b = React.useState(true);
  var isLoading = _b[0];
  var setIsLoading = _b[1];

  React.useEffect(function() {
    setIsLoading(true);
    MarketplaceApi.getTags().then(function(data) {
      var items = data.data || data || [];
      setTags(Array.isArray(items) ? items : []);
      setIsLoading(false);
    }).catch(function() { setIsLoading(false); });
  }, []);

  return React.createElement('div', { className:'p-4 lg:p-6' },
      React.createElement('div', { className:'max-w-3xl mx-auto space-y-3' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white mb-4' }, I18n.t('tags.subtitle')),
        isLoading ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
        tags.length === 0 ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, 'No hay etiquetas disponibles') :
        tags.map(function(tag, i) {
          return React.createElement(TagGroupCard, {
            key:i,
            tag: tag.name || tag.tag || '',
            count: tag.count || 0,
            floorPrice: tag.floorPrice || 0,
            onSelect: function() { navigate('/tag-tables/' + encodeURIComponent(tag.name || tag.tag || '')); }
          });
        })
      )
  );
}

function TagGroupsPage(props) {
  var navigate = props.navigate;
  var tagName = props.tagName;
  var _a = React.useState([]);
  var tagBlocks = _a[0];
  var setTagBlocks = _a[1];
  var _b = React.useState(true);
  var isLoading = _b[0];
  var setIsLoading = _b[1];

  React.useEffect(function() {
    if (tagName) {
      setIsLoading(true);
      MarketplaceApi.getTagBlocks(tagName).then(function(data) {
        var items = data.data || data || [];
        setTagBlocks(Array.isArray(items) ? items : []);
        setIsLoading(false);
      }).catch(function() { setIsLoading(false); });
    }
  }, [tagName]);

  return React.createElement('div', { className:'p-4 lg:p-6' },
      React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, 'Bloques con etiqueta: ' + tagName),
        isLoading ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
        tagBlocks.length === 0 ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('tags.noBlocks')) :
        React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' },
          tagBlocks.map(function(block, i) {
            return React.createElement('button', {
              key:i,
              onClick:function() { navigate('/blocks/' + (block.blockNumber || block.id || i)); },
              className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 text-center hover:border-bitmap-orange transition-all'
            },
              React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black flex items-center justify-center' },
                React.createElement(MondrianCanvas, { blockNumber:block.blockNumber || i, transactions:[], size:150 })
              ),
              React.createElement('div', { className:'font-mono text-xs text-white' }, (block.blockNumber || i) + '.bitmap'),
              block.price ? React.createElement('div', { className:'font-acme text-[10px]', style:{ color:'#666666' } }, BitmapUtils.formatBtc(block.price) + ' BTC') : null
            );
          })
        )
      )
  );
}

function TagTablePage(props) {
  var navigate = props.navigate;
  var tagName = props.tagName;
  var _a = React.useState([]);
  var tagBlocks = _a[0];
  var setTagBlocks = _a[1];
  var _b = React.useState(true);
  var isLoading = _b[0];
  var setIsLoading = _b[1];

  React.useEffect(function() {
    if (tagName) {
      setIsLoading(true);
      MarketplaceApi.getTagBlocks(tagName).then(function(data) {
        var items = data.data || data || [];
        setTagBlocks(Array.isArray(items) ? items : []);
        setIsLoading(false);
      }).catch(function() { setIsLoading(false); });
    }
  }, [tagName]);

  return React.createElement('div', { className:'p-4 lg:p-6' },
      React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, 'Tabla de etiqueta: ' + tagName),
        isLoading ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
        tagBlocks.length === 0 ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('tags.noBlocks')) :
        React.createElement('div', { className:'space-y-2' },
          tagBlocks.map(function(block, i) {
            return React.createElement('button', {
              key:i,
              onClick:function() { navigate('/blocks/' + (block.bloque || block.blockNumber || i)); },
              className:'w-full bg-bitmap-surface border border-bitmap-border rounded-xl p-3 flex items-center gap-3 hover:border-bitmap-orange transition-all'
            },
              React.createElement('div', { className:'w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-bitmap-black flex items-center justify-center' },
                React.createElement(MondrianCanvas, { blockNumber:block.bloque || block.blockNumber || i, transactions:[], size:48 })
              ),
              React.createElement('div', { className:'flex-1 text-left' },
                React.createElement('div', { className:'font-mono text-sm text-white' }, (block.bloque || block.blockNumber || i) + '.bitmap'),
                block.totalTransacciones || block.txCount ? React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted' }, (block.totalTransacciones || block.txCount) + ' TXs') : null
              ),
              block.totalBtc ? React.createElement('div', { className:'font-acme text-xs', style:{ color:'#666666' } }, BitmapUtils.formatBtc(block.totalBtc) + ' BTC') : null
            );
          })
        )
      )
  );
}

function VentasPage(props) {
  var navigate = props.navigate;
  var _a = React.useState([]);
  var sales = _a[0];
  var setSales = _a[1];
  var _b = React.useState(true);
  var isLoading = _b[0];
  var setIsLoading = _b[1];
  var _c = React.useState(0);
  var btcPrice = _c[0];
  var setBtcPrice = _c[1];
  var _d = React.useState('all');
  var filterSource = _d[0];
  var setFilterSource = _d[1];
  var _e = React.useState('');
  var searchText = _e[0];
  var setSearchText = _e[1];
  var _f = React.useState({});
  var salesStats = _f[0];
  var setSalesStats = _f[1];

  React.useEffect(function() {
    fetch('/api/v1/live/rates')
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d && d.data && d.data.btcPrice !== null) setBtcPrice(d.data.btcPrice); })
      .catch(function() {});
  }, []);

  React.useEffect(function() {
    MarketplaceApi.getSalesStats(filterSource).then(function(data) {
      setSalesStats((data && data.data) || {});
    }).catch(function() {});
  }, [filterSource]);

  var fetchSales = function() {
    setIsLoading(true);
    var url = '/api/v1/sales/history?days=30&limit=200';
    if (filterSource !== 'all') url += '&source=' + filterSource;
    ApiClient.get(url, true).then(function(data) {
      var items = (data && data.data && data.data.items) || [];
      setSales(items);
      setIsLoading(false);
    }).catch(function() { setIsLoading(false); });
  };

  React.useEffect(function() { fetchSales(); }, [filterSource]);

  React.useEffect(function() {
    var interval = setInterval(fetchSales, 60000);
    return function() { clearInterval(interval); };
  }, [filterSource]);

  var timeAgo = function(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    var mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + 'm';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    var days = Math.floor(hrs / 24);
    return days + 'd';
  };

  var groupByDay = function(items) {
    var groups = {};
    var order = [];
    items.forEach(function(s) {
      var d = new Date(s.sold_at);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (!groups[key]) {
        groups[key] = { items: [], totalBtc: 0 };
        order.push(key);
      }
      groups[key].items.push(s);
      groups[key].totalBtc += (s.price || 0) / 100000000;
    });
    return { groups: groups, order: order };
  };

  var formatDayHeader = function(key) {
    var months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var today = new Date();
    var todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayKey = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    var d = new Date(key + 'T12:00:00');
    var label = d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    if (key === todayKey) return 'HOY — ' + label;
    if (key === yesterdayKey) return 'AYER — ' + label;
    return label;
  };

  var filteredSales = sales.filter(function(s) {
    if (searchText && searchText.trim() !== '') {
      var name = (s.bitmap_name || '').toLowerCase();
      var num = String(s.bitmap_number || '');
      var q = searchText.toLowerCase().trim();
      if (name.indexOf(q) === -1 && num.indexOf(q) === -1) return false;
    }
    return true;
  });

  var grouped = groupByDay(filteredSales);
  var h24 = salesStats.h24 || {};
  var d7 = salesStats.d7 || {};
  var d30 = salesStats.d30 || {};

  var renderStatCol = function(label, count, volume) {
    var countStr = count ? BitmapUtils.formatNumber(count) : '0';
    var volBtc = volume > 0 ? BitmapUtils.formatBtcSat(volume) + ' BTC' : '0 BTC';
    var volUsd = volume > 0 && btcPrice ? '$' + ((volume / 100000000) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '$0.00';
    return React.createElement('div', { className: 'flex flex-col items-center px-3 border-r border-[#555]' },
      React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, label),
      React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, countStr + ' ventas'),
      React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, volBtc),
      React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, volUsd)
    );
  };

  return React.createElement('div', { className: 'flex flex-col h-full' },
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border pl-14 pr-4 py-2', style: { backgroundColor: '#1A1A1A' } },
      React.createElement('div', { className: 'flex items-stretch justify-between' },
        React.createElement('div', { className: 'flex items-center gap-2 flex-shrink-0' },
          React.createElement('img', { src: 'BITMAP.png', alt: 'BitmapCore', className: 'h-[45px] w-[45px] object-contain rounded my-[2px]' }),
          React.createElement('span', { className: 'font-alfaslab text-sm text-white tracking-wide pt-1' }, 'Ventas Recientes')
        ),
        React.createElement('div', { className: 'flex items-stretch' },
          renderStatCol('24 horas', h24.count, h24.volume),
          renderStatCol('Última semana', d7.count, d7.volume),
          React.createElement('div', { className: 'flex flex-col items-center px-3' },
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, 'Último mes'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-orange font-bold leading-tight' }, (d30.count ? BitmapUtils.formatNumber(d30.count) : '0') + ' ventas'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, d30.volume > 0 ? BitmapUtils.formatBtcSat(d30.volume) + ' BTC' : '0 BTC'),
            React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted leading-tight' }, d30.volume > 0 && btcPrice ? '$' + ((d30.volume / 100000000) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '$0.00')
          )
        )
      )
    ),
    React.createElement('div', { className: 'pl-14 pr-4 py-1 border-b border-bitmap-border flex items-center gap-2 sticky top-0 z-10', style: { backgroundColor: '#080008' } },
      React.createElement('input', {
        type: 'text',
        placeholder: 'Buscar por nombre o numero...',
        value: searchText,
        onChange: function(e) { setSearchText(e.target.value); },
        className: 'flex-1 bg-transparent border border-[#333] rounded px-3 py-1 font-acme text-xs text-white placeholder-[#666] focus:outline-none focus:border-bitmap-orange',
        style: { maxWidth: '280px' }
      }),
      React.createElement('div', { className: 'flex gap-1 ml-2' },
        ['all', 'ordinalswallet', 'unisat', 'local'].map(function(src) {
          var label = src === 'all' ? 'Todos' : sourceLabel(src);
          var isActive = filterSource === src;
          var logo = src !== 'all' ? sourceLogo(src) : '';
          var children = [];
          if (logo) children.push(React.createElement('img', { key: 'icon', src: logo, alt: '', style: { width: 10, height: 10, flexShrink: 0 } }));
          children.push(label);
          return React.createElement('button', {
            key: src,
            onClick: function() { setFilterSource(src); },
            className: 'px-3 py-1 rounded font-acme text-[11px] transition-colors',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: isActive ? '#8B2500' : 'transparent',
              color: isActive ? '#FFD9A0' : '#888',
              border: '1px solid ' + (isActive ? '#B53D00' : '#444'),
              boxShadow: isActive ? 'inset 0 2px 6px rgba(0,0,0,0.5)' : 'none'
            }
          }, children);
        })
      )
    ),
    React.createElement('div', { className: 'pl-14 pr-4 py-3 flex-1 overflow-y-auto' },
      isLoading ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' }, 'Cargando ventas...') :
      filteredSales.length === 0 ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' }, 'No hay ventas recientes') :
      React.createElement('div', null,
        grouped.order.map(function(dayKey) {
          var group = grouped.groups[dayKey];
          return React.createElement('div', { key: dayKey, className: 'mb-4' },
            React.createElement('div', { className: 'flex items-center gap-3 py-2 border-b border-[#333]' },
              React.createElement('span', { className: 'font-alfaslab text-sm text-white' }, formatDayHeader(dayKey)),
              React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' },
                group.items.length + ' ventas  \u2022  ' + BitmapUtils.formatBtcSat(group.totalBtc * 100000000) + ' BTC'
              )
            ),
            group.items.map(function(sale, i) {
              var etiquetas = sale.etiquetas || '';
              var isPerfect = etiquetas.indexOf('Grid') !== -1;
              var isPunk = etiquetas.indexOf('Punk') !== -1;
              var imgSrc = sale.bitmap_number ? '/api/v1/block-image/' + sale.bitmap_number + '?v=5&size=40&etiquetas=' + encodeURIComponent(etiquetas || '') + '&tx=' + (sale.totalTransacciones || 0) + '&hash=' + encodeURIComponent(sale.hash || '') + '&grid=' + isPerfect + '&punk=' + isPunk : '';
              return React.createElement('div', {
                key: sale.id || i,
                className: 'py-1.5 border-b border-[#222] hover:bg-[#111] transition-colors px-1'
              },
                React.createElement('div', { className: 'flex items-center gap-2' },
                  imgSrc ? React.createElement('img', {
                    src: imgSrc,
                    width: 40,
                    height: 40,
                    loading: 'lazy',
                    style: { imageRendering: 'pixelated', background: '#1a1a1a', borderRadius: 4, flexShrink: 0 },
                    alt: ''
                  }) : null,
                  React.createElement('div', { className: 'flex-1 min-w-0' },
                    React.createElement('div', { className: 'flex items-center gap-2 min-w-0' },
                      React.createElement('span', { className: 'font-alfaslab text-sm text-white truncate' },
                        sale.bitmap_name || ((sale.bitmap_number || '?') + '.bitmap')
                      ),
                      React.createElement('span', {
                        className: 'px-1.5 py-0.5 rounded text-[9px] font-acme flex-shrink-0',
                        style: { backgroundColor: sourceColor(sale.source) + '22', color: sourceColor(sale.source) }
                      }, sourceLabel(sale.source)),
                      React.createElement('img', {
                        src: sale.source === 'ordinalswallet' ? 'ordinalswallet_logo.png' : (sale.source === 'local' ? 'logo_bitmapcore_logo.png' : 'unisat_logo.png'),
                        style: { width: 10, height: 10, flexShrink: 0 },
                        alt: ''
                      }),
                      sale.buyer_address ? React.createElement('span', { className: 'font-acme text-[10px] flex-shrink-0' },
                        React.createElement('span', { style: { color: '#22C55E' } }, 'comprador: '),
                        React.createElement('span', { className: 'text-bitmap-muted' }, '...' + sale.buyer_address.slice(-4))
                      ) : null,
                      sale.seller_address ? React.createElement('span', { className: 'font-acme text-[10px] flex-shrink-0' },
                        React.createElement('span', { style: { color: '#EF4444' } }, 'vendedor: '),
                        React.createElement('span', { className: 'text-bitmap-muted' }, '...' + sale.seller_address.slice(-4))
                      ) : null
                    ),
                    React.createElement('div', { className: 'flex items-center gap-1 min-w-0 overflow-hidden whitespace-nowrap mt-0.5' },
                      React.createElement('span', { className: 'font-acme text-[9px] text-bitmap-muted flex-shrink-0' },
                        etiquetas ? etiquetas.split('|').filter(function(t) { return t.trim() !== ''; }).length + ' tags' : '0 tags'
                      ),
                      React.createElement('div', { className: 'flex items-center gap-1 min-w-0 overflow-hidden' },
                        etiquetas ? etiquetas.split('|').filter(function(t) { return t.trim() !== ''; }).map(function(tag, ti) {
                          return React.createElement(UniversalTag, { key: ti, text: tag.trim(), fontSize: 9 });
                        }) : null
                      )
                    )
                  ),
                  React.createElement('div', { className: 'flex flex-col items-end flex-shrink-0 ml-2' },
                  React.createElement('div', { className: 'flex items-baseline justify-end gap-1' },
                    React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' },
                      btcPrice ? '$' + ((sale.price / 100000000) * btcPrice).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '$0.00'
                    ),
                    React.createElement('span', { className: 'font-acme text-sm text-white' },
                      BitmapUtils.formatBtcSat(sale.price) + ' BTC'
                    )
                  ),
                    React.createElement('span', { className: 'font-acme text-[10px] text-bitmap-muted' },
                      timeAgo(sale.sold_at) + (sale.sold_at ? ' atras' : '')
                    ),
                    sale.txid ? React.createElement('a', {
                      href: 'https://mempool.space/tx/' + sale.txid,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      className: 'font-acme text-[10px] text-bitmap-orange hover:underline'
                    }, 'ver tx \u2197') : null
                  )
                )
              );
            })
          );
        })
      )
    )
  );
}