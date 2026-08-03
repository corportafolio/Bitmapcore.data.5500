var Header = React.createElement;

function HeaderBar(props) {
  var onMenuToggle = props.onMenuToggle;
  var collapsed = props.collapsed;
  var onToggleCollapse = props.onToggleCollapse;
  var showBackButton = props.showBackButton;
  var title = props.title;
  var navigate = props.navigate;
  var walletState = StoreApp.get('wallet');
  var _wa = React.useState(walletState.isConnected ? walletState.address : null);
  var walletAddress = _wa[0];
  var setWalletAddress = _wa[1];
  var _hc = React.useState(false);
  var showHamburgerMenu = _hc[0];
  var setShowHamburgerMenu = _hc[1];
  var _price = React.useState(null);
  var btcPrice = _price[0];
  var setBtcPrice = _price[1];
  var _ws = React.useState(false);
  var showWalletSubmenu = _ws[0];
  var setShowWalletSubmenu = _ws[1];

  React.useEffect(function() {
    if (!showHamburgerMenu && !showWalletSubmenu) return;
    var close = function() { setShowHamburgerMenu(false); setShowWalletSubmenu(false); };
    window.addEventListener('click', close);
    return function() { window.removeEventListener('click', close); };
  }, [showHamburgerMenu, showWalletSubmenu]);

  React.useEffect(function() {
    var unsub = StoreApp.subscribe('wallet', function(w) {
      setWalletAddress(w.isConnected ? w.address : null);
    });
    return unsub;
  }, []);

  React.useEffect(function() {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(function(r) { return r.json(); })
      .then(function(d) { setBtcPrice(d.bitcoin.usd); })
      .catch(function() {});
  }, []);

  return React.createElement('header', { className:'flex items-center justify-between h-14 bg-bitmap-black border-b border-bitmap-border pl-[3px] pr-4 sm:pr-6 z-30 relative' },
    showBackButton ? React.createElement('button', {
      onClick: function() { if (navigate) navigate(-1); },
      className:'font-alfaslab text-bitmap-orange text-sm hover:text-bitmap-orange-light transition-colors mr-2'
    }, '\u2190 Volver') : null,
    !showBackButton && onToggleCollapse ? React.createElement('button', {
      onClick: onToggleCollapse,
      className:'text-bitmap-muted text-[9px] mr-3 cursor-pointer hover:opacity-70 transition-opacity',
      title: collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'
    }, collapsed ? '\u25B6' : '\u25C0') : null,
    !showBackButton ? React.createElement('div', { className:'flex items-center gap-2 cursor-pointer', onClick: function() { navigate('/'); } },
      React.createElement('img', { src:'logo_bitmapcore_logo.png', alt:'BitmapCore', className:'h-6 w-6 object-contain' }),
      React.createElement('span', { className:'font-howdybun text-bitmap-orange text-lg tracking-wide hidden sm:block' }, 'Bitmapcore'),
      btcPrice ? React.createElement('span', { className:'font-acme text-xs text-bitmap-text ml-2' }, 'BTC $' + Number(btcPrice).toLocaleString()) : null
    ) : null,
    title ? React.createElement('span', { className: showBackButton ? 'font-alfaslab text-white text-lg flex-1 text-center' : 'font-alfaslab text-white text-lg flex-1' }, title) : React.createElement('div', { className:'flex-1' }),
    !showBackButton ? React.createElement('button', {
      onClick: function() { navigate('/selector'); },
      className:'font-alfaslab text-bitmap-orange text-xs px-2 py-1 border border-bitmap-orange rounded hover:bg-bitmap-orange hover:text-black transition-colors mr-2 whitespace-nowrap'
    }, 'Mercados Bitmap') : null,
    React.createElement('div', { className:'relative' },
      React.createElement('button', {
        onClick: function(e) { e.stopPropagation(); setShowHamburgerMenu(!showHamburgerMenu); },
        className:'font-alfaslab text-white text-xl'
      }, '\u2261'),
      showHamburgerMenu ? React.createElement('div', {
        className:'absolute right-0 top-full mt-1 w-56 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1',
        onClick: function(e) { e.stopPropagation(); }
      },
        walletAddress ? React.createElement('button', { onClick: function() { navigate('/mis-activos'); setShowHamburgerMenu(false); }, className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-orange-light hover:bg-bitmap-black/30 hover:text-white transition-colors' }, '\uD83D\uDCB0 ' + BitmapUtils.truncateAddress(walletAddress, 4)) :
        React.createElement('button', { onClick: function(e) { e.stopPropagation(); setShowHamburgerMenu(false); setShowWalletSubmenu(true); }, className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors' }, '\uD83D\uDD17 Conectar Wallet'),
        React.createElement('button', { onClick: function() { navigate('/settings'); setShowHamburgerMenu(false); }, className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors' }, 'Perfil'),
        React.createElement('div', { className:'border-t border-bitmap-border my-1' }),
        React.createElement('a', { href:'https://bitmapcore.net/whitepaper', target:'_blank', className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors block' }, 'Whitepaper'),
        React.createElement('button', { onClick: function() { navigate('/tag-tables'); setShowHamburgerMenu(false); }, className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors' }, 'Actualizar Tablas'),
        React.createElement('div', { className:'border-t border-bitmap-border my-1' }),
        React.createElement('a', { href:'https://x.com/BitmapCorp', target:'_blank', rel:'noopener noreferrer', className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors block' }, '@BitmapCorp')
      ) : null,
      showWalletSubmenu ? React.createElement('div', {
        className:'absolute right-0 top-full mt-1 w-48 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1',
        onClick: function(e) { e.stopPropagation(); }
      },
        React.createElement('button', {
          onClick: function() { setShowWalletSubmenu(false); StoreApp.connectWallet('unisat'); },
          className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors'
        }, 'Unisat'),
        React.createElement('button', {
          onClick: function() { setShowWalletSubmenu(false); StoreApp.connectWallet('xverse'); },
          className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors'
        }, 'Xverse')
      ) : null
    ),
    showBackButton && !title ? React.createElement('div', { className:'flex-1' }) : null
  );
}

function Sidebar(props) {
  var isOpen = props.isOpen;
  var collapsed = props.collapsed;
  var onClose = props.onClose;
  var navigate = props.navigate;
  var currentPath = props.currentPath;

  var vm = UnifiedViewModel;
  var _a = React.useState(vm.getListings());
  var listings = _a[0];
  var setListings = _a[1];
  var _s = React.useState(vm.getCurrentSort());
  var currentSort = _s[0];
  var setCurrentSort = _s[1];
  var _dd = React.useState(false);
  var showDropdown = _dd[0];
  var setShowDropdown = _dd[1];

  React.useEffect(function() {
    vm.loadFromCacheOnly();
    var unsub = vm.subscribe('listings', function() { setListings(vm.getListings()); });
    var unsubSort = vm.subscribe('sort', function() { setCurrentSort(vm.getCurrentSort()); });
    return function() { unsub(); unsubSort(); };
  }, []);

  var sortOptions = [
    { value: 'listedAtDesc', label: 'M\u00E1s recientes' },
    { value: 'priceAsc', label: 'Menor precio' },
    { value: 'priceDesc', label: 'Mayor precio' }
  ];

  var currentSortLabel = 'Orden';
  for (var si = 0; si < sortOptions.length; si++) {
    if (sortOptions[si].value === currentSort) { currentSortLabel = sortOptions[si].label; break; }
  }

  var overlay = isOpen ? React.createElement('div', {
    className:'fixed inset-0 bg-bitmap-black/50 z-40 lg:hidden',
    onClick: onClose
  }) : null;

  var sidebarWidth = collapsed ? 'w-0' : 'w-60';
  var sidebarHidden = collapsed ? 'overflow-hidden' : '';

  var sidebar = React.createElement('aside', {
    className: 'fixed top-14 left-0 bottom-0 ' + sidebarWidth + ' bg-bitmap-black border-r border-bitmap-border z-50 transform transition-all duration-200 ' + (isOpen ? 'translate-x-0' : '-translate-x-full') + ' lg:translate-x-0 lg:relative lg:top-0 lg:z-0 overflow-y-auto ' + sidebarHidden
  },
    React.createElement('div', { className:'flex flex-col h-full' },
      React.createElement('div', { className:'flex items-center justify-between px-3 py-2 border-b border-bitmap-border', style:{ minHeight:'36px' } },
        React.createElement('span', { className:'font-alfaslab text-[10px] text-bitmap-orange' }, 'Listados'),
        React.createElement('div', { className:'relative' },
          React.createElement('button', {
            onClick: function() { setShowDropdown(!showDropdown); },
            className:'font-acme text-[9px] text-bitmap-text bg-bitmap-surface border border-bitmap-border rounded px-2 py-1 hover:bg-bitmap-border transition-colors'
          }, currentSortLabel),
          showDropdown ? React.createElement('div', {
            className:'absolute right-0 top-full mt-1 w-32 bg-bitmap-black border border-bitmap-border rounded shadow-lg z-50 py-1'
          },
            sortOptions.map(function(opt) {
              return React.createElement('button', {
                key: opt.value,
                onClick: function() { vm.updateSortOrder(opt.value); setShowDropdown(false); },
                className: 'w-full px-3 py-1.5 text-left font-acme text-[9px] transition-colors ' + (opt.value === currentSort ? 'text-bitmap-orange bg-bitmap-surface' : 'text-bitmap-text hover:bg-bitmap-surface')
              }, opt.label);
            })
          ) : null
        )
      ),
      React.createElement('div', { className:'flex-1 overflow-y-auto divide-y divide-bitmap-border' },
        listings.length === 0
          ? React.createElement('div', { className:'text-center py-8 font-acme text-xs text-bitmap-muted' }, 'Cargando...')
          : listings.map(function(item, i) {
              var btcPrice = item.listedPrice ? (item.listedPrice / 100000000).toFixed(5) : '0';
              var tags = (item.etiquetas || '').split('|').filter(function(t) { return t.trim() !== ''; });
              return React.createElement('div', {
                key: (item.source || '') + '_' + (item.bitmapId || i),
                className: 'flex items-center gap-2 px-[3px] py-[3px] hover:bg-bitmap-surface transition-colors cursor-pointer',
                onClick: function() { navigate('/blocks/' + (item.bitmapNumber || '')); onClose(); }
              },
            React.createElement('img', {
              src: '/api/v1/block-image/' + (item.bitmapNumber || 0) + '?size=80&etiquetas=' + encodeURIComponent(item.etiquetas || '') + '&tx=' + (item.totalTransacciones || 0) + '&hash=' + encodeURIComponent(item.hash || '') + '&perfect=false&punk=false',
              style: { width: 35, height: 35, borderRadius: 4, background: '#1a1a1a', imageRendering: 'pixelated', flexShrink: 0 },
              loading: 'lazy', alt: ''
            }),
            React.createElement('div', { className:'flex-1 min-w-0' },
              React.createElement('div', { className:'flex justify-between items-center' },
                React.createElement('div', { className:'font-alfaslab text-[9px] text-bitmap-orange truncate' },
                  '#' + (item.bitmapNumber || '?') + '.bitmap'
                ),
                React.createElement('div', { className:'flex items-center gap-1' },
                  React.createElement('span', { className:'font-acme text-[9px] text-white' },
                    BitmapUtils.timeAgo(item.listedAt)
                  ),
                  React.createElement('span', { className:'font-acme text-[9px] text-bitmap-orange-light' },
                    btcPrice
                  )
                )
              ),
              React.createElement('div', { className:'flex justify-between items-center' },
                React.createElement('div', { style:{ display:'flex', flexWrap:'nowrap', overflow:'hidden', gap:'4px' } },
                  tags.slice(0, 3).map(function(tag, ti) {
                    return React.createElement('span', {
                      key: ti,
                      style:{ display:'inline-block', backgroundColor:'#FE3E00', color:'#000', fontSize:'7px', borderRadius:'8px', padding:'1px 4px', whiteSpace:'nowrap', fontFamily:'Alfa Slab One, serif', fontWeight:'bold', lineHeight:'1.2' }
                    }, tag.trim());
                  })
                ),
React.createElement('img', {
              src: item.source === 'ordinalswallet' 
                ? 'ordinalswallet_logo.png' 
                : (item.source === 'local' ? 'logo_bitmapcore_logo.png' : 'unisat_logo.png'),
              style: { width: 10, height: 10, flexShrink: 0 },
              alt: ''
            })
              )
            )
              );
            })
      )
    )
  );

  return React.createElement(React.Fragment, null, overlay, sidebar);
}

function LoadingSpinner() {
  return React.createElement('div', { className:'flex items-center justify-center h-full' },
    React.createElement('div', { className:'w-8 h-8 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin' })
  );
}

function Toast(props) {
  var message = props.message;
  var type = props.type;
  var onDone = props.onDone;

  React.useEffect(function() {
    var timer = setTimeout(onDone, 3000);
    return function() { clearTimeout(timer); };
  }, []);

  var bgClass = type === 'error' ? 'bg-bitmap-red' : type === 'success' ? 'bg-bitmap-green' : 'bg-bitmap-orange';
  return React.createElement('div', { className:'fixed bottom-4 right-4 z-50 ' + bgClass + ' text-white px-4 py-3 rounded-lg font-acme text-sm shadow-lg' },
    React.createElement('div', { className:'flex items-center gap-2' },
      React.createElement('span', null, message),
      React.createElement('button', { onClick:onDone, className:'ml-2 opacity-70 hover:opacity-100' }, '\u2715')
    )
  );
}

function Modal(props) {
  if (!props.isOpen) return null;
  return React.createElement('div', { className:'fixed inset-0 bg-bitmap-black/50 flex items-center justify-center z-50' },
    React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6 max-w-md w-full mx-4' },
      props.title ? React.createElement('h3', { className:'font-alfaslab text-lg text-white mb-4' }, props.title) : null,
      props.children,
      React.createElement('div', { className:'flex justify-end gap-3 mt-4' },
        props.onCancel ? React.createElement('button', { onClick:props.onCancel, className:'px-4 py-2 font-alfaslab text-sm text-bitmap-muted hover:text-white transition-colors' }, I18n.t('app.cancel')) : null,
        props.onConfirm ? React.createElement('button', { onClick:props.onConfirm, className:'px-4 py-2 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors' }, I18n.t('app.confirm')) : null
      )
    )
  );
}

function NotificationBell(props) {
  var count = props.count || 0;
  return React.createElement('button', { className:'relative text-xl' },
    '\uD83D\uDD14',
    count > 0 ? React.createElement('span', { className:'absolute -top-1 -right-1 w-4 h-4 bg-bitmap-red rounded-full text-[10px] text-white flex items-center justify-center font-acme' }, count > 9 ? '9+' : count) : null
  );
}

function FloatingMarketplaceMenu(props) {
  var navigate = props.navigate;
  var _open = React.useState(false);
  var isOpen = _open[0];
  var setIsOpen = _open[1];

  var items = [
    { id:'ordinalswallet', label:'Ordinalswallet', path:'/ordinalswallet', icon:'ordinalswallet_logo.png', isImage:true },
    { id:'unisat', label:'Unisat', path:'/unisat', icon:'unisat_logo.png', isImage:true },
    { id:'local', label:'BitmapCore', path:'/local', icon:'logo_bitmapcore_logo.png', isImage:true },
    { id:'discounts', label:'Descuentos', path:'/discounts', icon:'\uD83D\uDFE2', isImage:false },
    { id:'unified', label:'Unified', path:'/unified', icon:'\uD83D\uDD35', isImage:false },
    { id:'tags', label:'Etiquetas por Precio', path:'/tag-tables', icon:'\uD83C\uDFF7\uFE0F', isImage:false },
    { id:'sales', label:'Ventas', path:'/sales', icon:'\uD83D\uDCB0', isImage:false }
  ];

  return React.createElement('div', { className:'fm-container' },
    React.createElement('button', {
      className:'fm-toggle',
      onClick:function() { setIsOpen(!isOpen); },
      title:'Marketplaces'
    },
      React.createElement('svg', { width:'18', height:'24', viewBox:'0 0 18 24', fill:'var(--bitmap-orange)' },
        React.createElement('circle', { cx:'9', cy:'4', r:'2.5' }),
        React.createElement('circle', { cx:'9', cy:'12', r:'2.5' }),
        React.createElement('circle', { cx:'9', cy:'20', r:'2.5' })
      )
    ),
    isOpen ? items.map(function(item) {
      return React.createElement('button', {
        key:item.id,
        className:'fm-icon',
        onClick:function() { navigate(item.path); },
        title:item.label
      },
        item.isImage ? React.createElement('img', { src:item.icon, alt:item.label }) : React.createElement('span', { style:{fontSize:'16px'} }, item.icon)
      );
    }) : null
  );
}

function ErrorBoundary(props) {
  var _a = React.useState(false);
  var hasError = _a[0];
  var setHasError = _a[1];

  React.useEffect(function() {
    var handler = function() { setHasError(true); };
    window.addEventListener('error', handler);
    return function() { window.removeEventListener('error', handler); };
  }, []);

  if (hasError) {
    return React.createElement('div', { className:'flex flex-col items-center justify-center w-full h-full bg-bitmap-black p-8' },
      React.createElement('h1', { className:'font-alfaslab text-2xl text-bitmap-orange mb-4' }, 'Error'),
      React.createElement('p', { className:'font-acme text-bitmap-text mb-6' }, 'Algo sali\u00F3 mal'),
      React.createElement('button', { onClick:function() { setHasError(false); }, className:'px-4 py-2 bg-bitmap-orange text-white rounded-lg font-alfaslab' }, I18n.t('app.retry'))
    );
  }
  return props.children;
}