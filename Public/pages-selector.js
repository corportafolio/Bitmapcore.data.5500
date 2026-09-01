function SelectorScreenPage(props) {
  var navigate = props.navigate;
  var _tick = React.useState(0);
  var tick = _tick[0];
  var forceUpdate = _tick[1];
  var _loading = React.useState(true);
  var isLoading = _loading[0];
  var setIsLoading = _loading[1];

  var marketplaces = [
    { id:'ordinalswallet', label:'ORDINALSWALLET', path:'/ordinalswallet', logo:'ordinalswallet_logo.png' },
    { id:'unisat', label:'UNISAT', path:'/unisat', logo:'unisat_logo.png' },
    { id:'local', label:'BITMAPCORE', path:'/local', logo:'logo_bitmapcore_logo.png' },
    { id:'discounts', label: I18n.t('selector.discounts'), path:'/discounts', logo:'discount.svg' },
    { id:'unified', label:'UNIFIED', path:'/unified', logo:'layers.svg' },
    { id:'tags', label: I18n.t('selector.listedTags'), path:'/tag-tables', icon:'\uD83C\uDFF7\uFE0F' },
    { id:'sales', label: I18n.t('selector.sales'), path:'/sales', icon:'\uD83D\uDCB0' }
  ];

  React.useEffect(function() {
    setIsLoading(true);
    SelectorScreenViewModel.loadAllMarketplaces();
    var unsub = SelectorScreenViewModel.subscribe(function() { forceUpdate(function(n) { return n + 1; }); });
    var timer = setTimeout(function() { setIsLoading(false); }, 1500);
    return function() { clearTimeout(timer); unsub(); };
  }, []);

  React.useEffect(function() {
    var interval = setInterval(function() {
      SelectorScreenViewModel.loadAllMarketplaces();
    }, 60000);
    return function() { clearInterval(interval); };
  }, []);

  var paginated = { ordinalswallet: true, unisat: true, unified: true };

  return React.createElement('div', { className:'pl-14 pr-3 py-3' },
    isLoading ? React.createElement('div', { className:'flex-1 flex items-center justify-center' },
      React.createElement('p', { className:'font-acme text-bitmap-muted' }, I18n.t ? I18n.t('app.loading') : 'Cargando...')
    ) :
    React.createElement('div', { className:'space-y-2' },
      marketplaces.map(function(mp) {
        var data = SelectorScreenViewModel.getMarketplaceData(mp.id);
        return React.createElement(SelectorBubble, {
          key: mp.id,
          name: mp.label,
          logo: mp.logo,
          icon: mp.icon,
          totalListings: data.totalListings,
          floorPrice: data.floorPrice,
          previews: data.previews,
          salesStats: data.salesStats || null,
          onLoadMore: paginated[mp.id] ? function(pageSize) { SelectorScreenViewModel.loadNextPreviews(mp.id, pageSize); } : null,
          onClick: function() { navigate(mp.path); }
        });
      })
    )
  );
}
