function LocalPage(props) {
  var navigate = props.navigate;
  var vm = LocalMarketplaceViewModel;
  var _a = React.useState(vm.getListings());
  var listings = _a[0];
  var setListings = _a[1];
  var _b = React.useState(vm.getCurrentSort());
  var currentSort = _b[0];
  var setCurrentSort = _b[1];
  var _s = React.useState({ floorPrice: vm.getFloorPrice(), totalListings: vm.getTotalListings() });
  var stats = _s[0];
  var setStats = _s[1];
  var _c = React.useState(vm.isLoading());
  var isLoading = _c[0];
  var setIsLoading = _c[1];
  var _d = React.useState('');
  var searchQuery = _d[0];
  var setSearchQuery = _d[1];
  var _dd = React.useState(false);
  var showSortDropdown = _dd[0];
  var setShowSortDropdown = _dd[1];

  React.useEffect(function() {
    vm.loadFromCacheOnly();
    vm.loadListings(1, currentSort);
    var unsubListings = vm.subscribe('listings', function() { setListings(vm.getListings()); });
    var unsubStats = vm.subscribe('stats', function() { setStats({ floorPrice: vm.getFloorPrice(), totalListings: vm.getTotalListings() }); });
    var unsubLoading = vm.subscribe('loading', function(l) { setIsLoading(l); });
    var unsubSort = vm.subscribe('sort', function(s) { setCurrentSort(s); });
    return function() { unsubListings(); unsubStats(); unsubLoading(); unsubSort(); };
  }, []);

  var filtered = listings.filter(function(l) {
    return !searchQuery || String(l.blockNumber || l.bitmapNumber || l.id || '').indexOf(searchQuery) !== -1;
  });

  var sortOptions = [
    { value: 'listedAtDesc', label: 'M\u00E1s recientes' },
    { value: 'priceAsc', label: 'Menor precio' },
    { value: 'priceDesc', label: 'Mayor precio' }
  ];

  var currentSortLabel = 'Orden';
  for (var si = 0; si < sortOptions.length; si++) {
    if (sortOptions[si].value === currentSort) { currentSortLabel = sortOptions[si].label; break; }
  }

  var handleBuy = function(listing) {
    var wallet = ConnectionWalletViewModel;
    if (!wallet.isConnected()) {
      alert('Conecta tu wallet primero');
      navigate('/wallet');
      return;
    }
    var btcPrice = listing.price ? (listing.price / 100000000).toFixed(5) : '0';
    if (confirm('Comprar ' + (listing.name || 'Bitmap #' + listing.bitmapNumber) + ' por ' + btcPrice + ' BTC?')) {
      vm.buyBitmap(listing.id, wallet.getAddress())
        .then(function() { alert('Compra completada'); vm.loadListings(); })
        .catch(function(e) { alert('Error: ' + e.message); });
    }
  };

  return React.createElement('div', { className: 'p-4 lg:p-6' },
    React.createElement('div', { className: 'max-w-4xl mx-auto space-y-4' },
      React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4' },
        React.createElement('div', { className: 'flex items-center gap-4 text-sm font-acme text-bitmap-text' },
          React.createElement('span', null, 'Total: ', stats.totalListings),
          React.createElement('span', null, 'Floor: ', (stats.floorPrice / 100000000).toFixed(5), ' BTC')
        ),
        React.createElement('div', { className: 'relative' },
          React.createElement('button', {
            onClick: function() { setShowSortDropdown(!showSortDropdown); },
            className: 'font-acme text-[9px] text-bitmap-text bg-bitmap-surface border border-bitmap-border rounded px-2 py-1 hover:bg-bitmap-border transition-colors'
          }, currentSortLabel),
          showSortDropdown ? React.createElement('div', {
            className: 'absolute right-0 top-full mt-1 w-32 bg-bitmap-black border border-bitmap-border rounded shadow-lg z-50 py-1'
          }, sortOptions.map(function(opt) {
            return React.createElement('button', {
              key: opt.value,
              onClick: function() { vm.updateSortOrder(opt.value); setShowSortDropdown(false); },
              className: 'w-full px-3 py-1.5 text-left font-acme text-[9px] transition-colors ' + (opt.value === currentSort ? 'text-bitmap-orange bg-bitmap-surface' : 'text-bitmap-text hover:bg-bitmap-surface')
            }, opt.label);
          })) : null
        )
      ),
      React.createElement('input', {
        type: 'text', value: searchQuery,
        onChange: function(e) { setSearchQuery(e.target.value); },
        placeholder: 'Buscar por n\u00famero de bloque...',
        className: 'w-full bg-bitmap-surface border border-bitmap-border rounded-lg px-4 py-2.5 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange mb-4'
      }),
      isLoading && filtered.length === 0 ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
      filtered.length === 0 ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('marketplace.noListings')) :
      React.createElement('div', { className: 'divide-y divide-bitmap-border' },
        filtered.map(function(item, i) {
          var btcPrice = item.price ? (item.price / 100000000).toFixed(5) : '0';
          var tags = (item.etiquetas || item.tags || '').split('|').filter(function(t) { return t.trim() !== ''; });
          return React.createElement('div', {
            key: item.id || i,
            className: 'flex items-center gap-3 px-3 py-3 hover:bg-bitmap-surface transition-colors'
          },
            React.createElement('img', {
              src: '/api/v1/block-image/' + (item.bitmapNumber || item.blockNumber || 0) + '?size=80&etiquetas=' + encodeURIComponent(item.etiquetas || item.tags || '') + '&tx=' + (item.totalTransacciones || 0) + '&hash=' + encodeURIComponent(item.hash || '') + '&perfect=false&punk=false',
              style: { width: 40, height: 40, borderRadius: 4, background: '#1a1a1a', imageRendering: 'pixelated', flexShrink: 0 },
              loading: 'lazy', alt: ''
            }),
            React.createElement('div', { className: 'flex-1 min-w-0' },
              React.createElement('div', { className: 'flex justify-between items-center' },
                React.createElement('div', { className: 'font-alfaslab text-sm text-bitmap-orange truncate' },
                  '#' + (item.bitmapNumber || item.blockNumber || '?') + '.bitmap'
                ),
                React.createElement('span', { className: 'font-acme text-sm text-bitmap-orange-light' }, btcPrice + ' BTC')
              ),
              React.createElement('div', { className: 'flex flex-wrap gap-1 mt-1' },
                tags.slice(0, 3).map(function(tag, ti) {
                  return React.createElement('span', {
                    key: ti,
                    style: { display: 'inline-block', backgroundColor: '#FE3E00', color: '#000', fontSize: '8px', borderRadius: '8px', padding: '1px 5px', whiteSpace: 'nowrap', fontFamily: 'Alfa Slab One, serif', fontWeight: 'bold', lineHeight: '1.2' }
                  }, tag.trim());
                })
              )
            ),
            React.createElement('button', {
              onClick: function() { handleBuy(item); },
              className: 'px-3 py-1.5 bg-bitmap-orange text-white font-alfaslab text-xs rounded hover:bg-bitmap-orange/80 transition-colors flex-shrink-0',
              disabled: isLoading
            }, 'Comprar')
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

  return React.createElement('div', { className: 'p-4 lg:p-6' },
    React.createElement('div', { className: 'max-w-4xl mx-auto space-y-4' },
      React.createElement('h2', { className: 'font-alfaslab text-xl text-white' }, I18n.t('descuentos.title')),
      isLoading ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
      discounts.length === 0 ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('descuentos.noDiscounts')) :
      React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' },
        discounts.map(function(d, i) {
          return React.createElement(DiscountBadge, {
            key: i,
            percentage: d.percentage || 10,
            originalPrice: d.originalPrice || 0.01,
            discountPrice: d.discountPrice || 0.005
          });
        })
      )
    )
  );
}