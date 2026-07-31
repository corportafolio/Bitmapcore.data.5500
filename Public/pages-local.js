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

  React.useEffect(function() {
    setIsLoading(true);
    MarketplaceApi.getLocal().then(function(data) {
      var items = data.data || data || [];
      setListings(Array.isArray(items) ? items : []);
      setIsLoading(false);
    }).catch(function() { setIsLoading(false); });
  }, []);

  var filtered = listings.filter(function(l) {
    return !searchQuery || String(l.blockNumber || l.block || l.id || '').indexOf(searchQuery) !== -1;
  });

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
      React.createElement('input', {
        type:'text', value:searchQuery,
        onChange:function(e) { setSearchQuery(e.target.value); },
        placeholder:'Buscar por número de bloque...',
        className:'w-full bg-bitmap-surface border border-bitmap-border rounded-lg px-4 py-2.5 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange'
      }),
      isLoading ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
      filtered.length === 0 ? React.createElement('div', { className:'text-center py-12 font-acme text-bitmap-muted' }, I18n.t('marketplace.noListings')) :
      React.createElement(MarketPreview, { listings:filtered, marketplace:'local' })
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
