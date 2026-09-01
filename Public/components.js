var Header = React.createElement;

function HeaderBar(props) {
  var onMenuToggle = props.onMenuToggle;
  var collapsed = props.collapsed;
  var onToggleCollapse = props.onToggleCollapse;
  var showBackButton = props.showBackButton;
  var title = props.title;
  var navigate = props.navigate;
  var onInfoClick = props.onInfoClick;
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
  var _live = React.useState({ btcPrice: null, feeFastest: null });
  var liveData = _live[0];
  var setLiveData = _live[1];
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
    var fetchLive = function() {
      fetch('/api/v1/live/rates')
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d && d.data) {
            var btc = d.data.btcPrice;
            var fee = d.data.feeFastest;
            if (btc !== null) setBtcPrice(btc);
            setLiveData({ btcPrice: btc, feeFastest: fee });
          }
        })
        .catch(function() {});
    };
    fetchLive();
    var interval = setInterval(fetchLive, 60000);
    return function() { clearInterval(interval); };
  }, []);

  return React.createElement('header', { className:'flex items-center justify-between h-14 bg-bitmap-black border-b border-bitmap-border pl-[3px] pr-4 sm:pr-6 z-30 relative' },
    showBackButton ? React.createElement('button', {
      onClick: function() { if (navigate) navigate(-1); },
      className:'font-alfaslab text-bitmap-orange text-sm hover:text-bitmap-orange-light transition-colors mr-2'
    }, I18n.t('ui.back')) : null,
    !showBackButton && onToggleCollapse ? React.createElement('button', {
      onClick: onToggleCollapse,
      className:'text-bitmap-muted text-[9px] mr-3 cursor-pointer hover:opacity-70 transition-opacity',
      title: collapsed ? I18n.t('ui.expandSidebar') : I18n.t('ui.collapseSidebar')
    }, collapsed ? '\u25B6' : '\u25C0') : null,
    !showBackButton ? React.createElement('div', { className:'flex items-center gap-2 cursor-pointer', onClick: function() { navigate('/'); } },
      React.createElement('img', { src:'logo_bitmapcore_logo.png', alt:'BitmapCore', className:'h-6 w-6 object-contain' }),
      React.createElement('span', { className:'font-howdybun text-bitmap-orange text-lg tracking-wide hidden sm:block' }, 'Bitmapcore'),
      btcPrice ? React.createElement('span', { className:'font-acme text-xs text-bitmap-text ml-2' }, 'BTC $' + Number(btcPrice).toLocaleString()) : null,
      React.createElement('span', { className:'flex items-center gap-1 font-acme text-xs text-bitmap-text ml-1' },
        React.createElement('svg', { className:'w-4 h-4 text-bitmap-orange', stroke:'currentColor', fill:'none', viewBox:'0 0 24 24', xmlns:'http://www.w3.org/2000/svg', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round' },
          React.createElement('path', { d:'M14 11h1a2 2 0 0 1 2 2v3a1.5 1.5 0 0 0 3 0v-7l-3 -3' }),
          React.createElement('path', { d:'M4 20v-14a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v14' }),
          React.createElement('path', { d:'M3 20l12 0' }),
          React.createElement('path', { d:'M18 7v1a1 1 0 0 0 1 1h1' }),
          React.createElement('path', { d:'M4 11l10 0' })
        ),
        liveData.feeFastest !== null ? liveData.feeFastest + ' sat/vB' : '-- sat/vB'
      )
    ) : null,
    title ? React.createElement('span', { className: showBackButton ? 'font-alfaslab text-white text-lg flex-1 text-center' : 'font-alfaslab text-white text-lg flex-1' }, title) : React.createElement('div', { className:'flex-1' }),
    !showBackButton ? React.createElement('a', {
      href:'https://x.com/BitmapCorp',
      target:'_blank',
      rel:'noopener noreferrer',
      className:'text-bitmap-text hover:text-white transition-colors mr-2 cursor-pointer',
      title:'@BitmapCorp'
    }, React.createElement('img', { src:'x-icon.webp', alt:'X', style:{ width:'25px', height:'25px', borderRadius:'50%', objectFit:'contain', border:'1px solid #555' } })) : null,
    !showBackButton && onInfoClick ? React.createElement('button', {
      onClick: onInfoClick,
        className:'text-bitmap-orange hover:text-bitmap-orange-light transition-colors mr-2 text-[25px] cursor-pointer',
      title: I18n.t('ui.tagInfo')
    }, React.createElement('svg', {
  className: 'w-[25px] h-[25px]',
  fill: 'currentColor',
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg'
}, React.createElement('path', {
  d: 'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 9.5C12.8284 9.5 13.5 8.82843 13.5 8C13.5 7.17157 12.8284 6.5 12 6.5C11.1716 6.5 10.5 7.17157 10.5 8C10.5 8.82843 11.1716 9.5 12 9.5ZM14 15H13V10.5H10V12.5H11V15H10V17H14V15Z'
}))) : null,
    !showBackButton ? React.createElement('button', {
      onClick: function() { navigate('/selector'); },
      className:'font-alfaslab text-bitmap-orange text-xs px-2 py-1 border border-bitmap-orange rounded hover:bg-bitmap-orange hover:text-black transition-colors mr-2 whitespace-nowrap'
    }, I18n.t('nav.bitmapMarkets')) : null,
    React.createElement('div', { className:'relative' },
      React.createElement('button', {
        onClick: function(e) { e.stopPropagation(); setShowHamburgerMenu(!showHamburgerMenu); },
        className:'font-alfaslab text-white text-[30px]'
      }, '\u2261'),
      showHamburgerMenu ? React.createElement('div', {
        className:'absolute right-0 top-full mt-1 w-56 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1',
        onClick: function(e) { e.stopPropagation(); }
      },
        walletAddress ? React.createElement('button', { onClick: function() { navigate('/mis-activos'); setShowHamburgerMenu(false); }, className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-orange-light hover:bg-bitmap-black/30 hover:text-white transition-colors' }, '\uD83D\uDCB0 ' + BitmapUtils.truncateAddress(walletAddress, 4)) :
        React.createElement('button', { onClick: function(e) { e.stopPropagation(); setShowHamburgerMenu(false); setShowWalletSubmenu(true); }, className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors' }, '\uD83D\uDD17 ' + I18n.t('hamburger.connectWallet')),
        walletAddress ? React.createElement('button', { onClick: function() { StoreApp.disconnectWallet(); setShowHamburgerMenu(false); }, className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-red hover:bg-bitmap-black/30 hover:text-white transition-colors' }, I18n.t('hamburger.disconnect')) : null,
        React.createElement('button', { onClick: function() { navigate('/settings'); setShowHamburgerMenu(false); }, className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors' }, I18n.t('hamburger.settings')),
        React.createElement('div', { className:'border-t border-bitmap-border my-1' }),
        React.createElement('button', { onClick: function() { navigate('/world'); setShowHamburgerMenu(false); }, className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors' }, I18n.t('hamburger.world')),
        React.createElement('div', { className:'border-t border-bitmap-border my-1' }),
        React.createElement('a', { href:'https://x.com/BitmapCorp', target:'_blank', rel:'noopener noreferrer', className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors block' }, '@BitmapCorp')
      ) : null,
      showWalletSubmenu ? React.createElement('div', {
        className:'absolute right-0 top-full mt-1 w-48 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1',
        onClick: function(e) { e.stopPropagation(); }
      },
        React.createElement('button', {
          onClick: function() { setShowWalletSubmenu(false); if (window.bcAnalytics) window.bcAnalytics.track('wallet_connect_clicked', { walletType: 'unisat', source: 'hamburger_menu' }); StoreApp.connectWallet('unisat'); },
          className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors flex items-center gap-2'
        },
          React.createElement('img', { src:'unisat_logo.png', alt:'Unisat', style:{ width:'20px', height:'20px', borderRadius:'3px', objectFit:'contain' } }),
          'Unisat'
        ),
        React.createElement('button', {
          onClick: function() { setShowWalletSubmenu(false); if (window.bcAnalytics) window.bcAnalytics.track('wallet_connect_clicked', { walletType: 'xverse', source: 'hamburger_menu' }); StoreApp.connectWallet('xverse'); },
          className:'w-full px-4 py-2 text-left font-acme text-sm text-bitmap-text hover:bg-bitmap-black/30 hover:text-white transition-colors flex items-center gap-2'
        },
          React.createElement('img', { src:'xverse-logo.png', alt:'Xverse', style:{ width:'20px', height:'20px', borderRadius:'3px', objectFit:'contain' } }),
          'Xverse'
        )
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
    { value: 'listedAtDesc', label: I18n.t('sidebar.sortRecent') },
    { value: 'priceAsc', label: I18n.t('sidebar.sortLowest') },
    { value: 'priceDesc', label: I18n.t('sidebar.sortHighest') }
  ];

  var currentSortLabel = I18n.t('sidebar.sort');
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
        React.createElement('span', { className:'font-alfaslab text-[10px] text-bitmap-orange' }, I18n.t('sidebar.listings')),
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
          ? React.createElement('div', { className:'text-center py-8 font-acme text-xs text-bitmap-muted' }, I18n.t('app.loading'))
          : listings.map(function(item, i) {
              var btcPrice = item.listedPrice ? BitmapUtils.formatBtcSat(item.listedPrice) : '0';
              var tags = (item.etiquetas || '').split('|').filter(function(t) { return t.trim() !== ''; });
              return React.createElement('div', {
                key: (item.source || '') + '_' + (item.bitmapId || i),
                className: 'flex items-center gap-2 px-[3px] py-[3px] hover:bg-bitmap-surface transition-colors cursor-pointer',
                onClick: function() { navigate('/blocks/' + (item.bitmapNumber || '')); onClose(); }
              },
            React.createElement('img', {
              src: '/api/v1/block-image/' + (item.bitmapNumber || 0) + '?v=5&size=80&etiquetas=' + encodeURIComponent(item.etiquetas || '') + '&tx=' + (item.totalTransacciones || 0) + '&hash=' + encodeURIComponent(item.hash || '') + '&grid=' + ((item.etiquetas || '').toLowerCase().indexOf('grid') !== -1) + '&punk=' + ((item.etiquetas || '').toLowerCase().indexOf('punk') !== -1),
              style: { width: 35, height: 35, borderRadius: 4, background: '#1a1a1a', imageRendering: 'pixelated', flexShrink: 0 },
              loading: 'lazy', alt: ''
            }),
            React.createElement('div', { className:'flex-1 min-w-0' },
              React.createElement('div', { className:'flex justify-between items-center' },
                React.createElement('div', { className:'font-mono text-[9px] text-white truncate' },
                  (item.bitmapNumber || '?') + '.bitmap'
                ),
                React.createElement('div', { className:'flex items-center gap-1' },
                  React.createElement('span', { className:'font-acme text-[9px] text-white' },
                    BitmapUtils.timeAgo(item.listedAt)
                  ),
                  React.createElement('span', { className:'font-acme text-[9px]', style:{ color:'#666666' } },
                    btcPrice
                  )
                )
              ),
              React.createElement('div', { className:'flex justify-between items-center' },
                React.createElement('div', { style:{ display:'flex', flexWrap:'nowrap', overflow:'hidden', gap:'4px' } },
                  tags.slice(0, 3).map(function(tag, ti) {
                    return React.createElement('span', {
                      key: ti,
                      style:{ display:'inline-block', backgroundColor:'#8B2500', color:'#000', textShadow:'-1px 0 #FE3E00, 0 1px #FE3E00, 1px 0 #FE3E00, 0 -1px #FE3E00', border:'1px solid #B53D00', boxShadow:'inset 0 2px 6px rgba(0,0,0,0.5)', fontSize:'7px', borderRadius:'8px', padding:'2px 6px', whiteSpace:'nowrap', fontFamily:'Alfa Slab One, serif', fontWeight:'bold', lineHeight:'1.2' }
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
  var duration = props.duration || 3000;

  React.useEffect(function() {
    var timer = setTimeout(onDone, duration);
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
  var _confirm = React.useState(false);
  var showConfirm = _confirm[0];
  var setShowConfirm = _confirm[1];

  var items = [
    { id:'home', label: I18n.t('floatMenu.home'), path:'/', icon:'\uD83C\uDFE0', isImage:false },
    { id:'ordinalswallet', label:'Ordinalswallet', path:'/ordinalswallet', icon:'ordinalswallet_logo.png', isImage:true },
    { id:'unisat', label:'Unisat', path:'/unisat', icon:'unisat_logo.png', isImage:true },
    { id:'satflow', label:'Satflow', path:'/satflow', icon:'satflow-logo.png', isImage:true },
    { id:'local', label:'BitmapCore', path:'/local', icon:'logo_bitmapcore_logo.png', isImage:true },
    { id:'discounts', label: I18n.t('floatMenu.discounts'), path:'/discounts', icon:'discount.svg', isImage:true },
    { id:'unified', label:'Unified', path:'/unified', icon:'layers.svg', isImage:true },
    { id:'tags', label: I18n.t('floatMenu.listedTags'), path:'/listed-tags', icon:'\uD83C\uDFF7\uFE0F', isImage:false },
    { id:'sales', label: I18n.t('floatMenu.sales'), path:'/sales', icon:'\uD83D\uDCB0', isImage:false }
  ];

  return React.createElement('div', { className:'fm-container' },
    React.createElement('button', {
      className:'fm-toggle',
      onClick:function() { setIsOpen(!isOpen); },
      title: I18n.t('floatMenu.marketplaces')
    },
      React.createElement('svg', { width:'18', height:'24', viewBox:'0 0 18 24', fill:'var(--bitmap-orange)' },
        React.createElement('circle', { cx:'9', cy:'4', r:'2.5' }),
        React.createElement('circle', { cx:'9', cy:'12', r:'2.5' }),
        React.createElement('circle', { cx:'9', cy:'20', r:'2.5' })
      )
    ),
    isOpen ? React.createElement(React.Fragment, null,
      items.map(function(item) {
        return React.createElement('button', {
          key:item.id,
          className:'fm-icon',
          onClick:function() { navigate(item.path); },
          title:item.label
        },
          item.isImage ? React.createElement('img', { src:item.icon, alt:item.label }) :
          item.isTagIcon ? React.createElement('svg', { width:'16', height:'16', viewBox:'0 0 24 24', fill:'none', stroke:'var(--bitmap-orange)', strokeWidth:'2', strokeLinecap:'round', strokeLinejoin:'round' },
            React.createElement('path', { d:'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' }),
            React.createElement('line', { x1:'7', y1:'7', x2:'7.01', y2:'7' })
          ) : React.createElement('span', { style:{fontSize:'16px'} }, item.icon)
        );
      })
    ) : null
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
      React.createElement('h1', { className:'font-alfaslab text-2xl text-bitmap-orange mb-4' }, I18n.t('ui.error')),
      React.createElement('p', { className:'font-acme text-bitmap-text mb-6' }, I18n.t('ui.somethingWrong')),
      React.createElement('button', { onClick:function() { setHasError(false); }, className:'px-4 py-2 bg-bitmap-orange text-white rounded-lg font-alfaslab' }, I18n.t('app.retry'))
    );
  }
  return props.children;
}
var TAG_NAMES = [
  "txS millonarias", "TXs MULTIMILLONARIAS", "100k out", "250k out", "500k out",
  "1M out", "2M out", "3M out", "5M out", "21e8",
  "2 tx GRID", "3 tx GRID", "4 tx GRID", "6 tx GRID", "Grid Punk",
  "5 tx Grid Punk", "Punk GRID 10 tx", "Giga Punk GRID",
  "Palindrome", "Palindrome PERFECT", "microstrategy", "Wide Neck Punk", "Standar Punk", "Pristine Punk",
  "Punk 2tx", "8000 tx", "7000 tx", "6000 tx", "5000 tx",
  "4000 tx", "3000 tx", "2000 tx", "1000 tx", "1 tx",
  "2 tx", "leap day", "sub 100k", "sub 50k", "sub 25k", "sub 10k",
  "sub 1k", "power of 10", "mythic", "epic", "rare",
  "first transaction", "pizza transaction", "block 9", "block 78", "66 dao",
  "prime number", "fibonacci", "binary", "chinese lucky number", "pizza day"
];

var TAG_DESCRIPTIONS = [];
function loadTagDescriptions() {
  if (TAG_DESCRIPTIONS.length > 0) return;
  var d = I18n.t('tagDesc');
  if (Array.isArray(d)) {
    TAG_DESCRIPTIONS = d;
  }
}

function TagInfoScreen(props) {
  var onBack = props.onBack;
  loadTagDescriptions();
  return React.createElement('div', { className:'flex flex-col h-full bg-bitmap-black' },
    React.createElement('div', { className:'flex items-center h-12 px-3 border-b border-bitmap-border bg-bitmap-surface' },
      React.createElement('button', {
        onClick: onBack,
        className:'text-bitmap-orange hover:text-bitmap-orange-light transition-colors mr-3 text-lg'
      }, '\u2190'),
      React.createElement('span', { className:'font-alfaslab text-white text-sm' }, I18n.t('ui.tagInfo'))
    ),
    React.createElement('div', { className:'flex-1 overflow-y-auto p-3 space-y-2' },
      TAG_NAMES.map(function(name, i) {
        var desc = TAG_DESCRIPTIONS[i] || '';
        return React.createElement('div', { key:i, className:'bg-bitmap-surface border border-bitmap-border rounded-lg p-3' },
          React.createElement('div', { className:'flex items-center gap-2 mb-1' },
            React.createElement('span', { className:'text-bitmap-muted text-xs font-bold' }, (i + 1) + '.'),
            React.createElement('span', { className:'inline-block px-2 py-0.5 bg-bitmap-orange/10 border border-bitmap-orange/30 rounded text-bitmap-orange text-xs font-alfaslab' }, name)
          ),
          desc ? React.createElement('p', { className:'text-bitmap-text text-xs leading-relaxed pl-5' }, desc) : null
        );
      })
    )
  );
}

function RightSidebar(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var content = props.content;

  if (!isOpen) return null;

  var overlay = React.createElement('div', {
    className:'fixed inset-0 bg-bitmap-black/50 z-40 lg:hidden',
    onClick: onClose
  });

  var sidebar = React.createElement('div', {
    className:'fixed top-14 right-0 bottom-0 w-80 bg-bitmap-black border-l border-bitmap-border z-50 transform transition-all duration-200 translate-x-0 overflow-hidden'
  },
    content
  );

  return React.createElement(React.Fragment, null, overlay, sidebar);
}
