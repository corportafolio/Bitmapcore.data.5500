(function() {
  var Router = ReactRouterDOM;
  var HashRouter = Router.HashRouter;
  var Routes = Router.Routes;
  var Route = Router.Route;
  var useNavigate = Router.useNavigate;
  var useParams = Router.useParams;
  var useLocation = Router.useLocation;

  function Layout(props) {
    var navigate = props.navigate;
    var currentPath = props.currentPath;
    var children = props.children;
    var _sidebar = React.useState(false);
    var sidebarOpen = _sidebar[0];
    var setSidebarOpen = _sidebar[1];
    var _collapsed = React.useState(false);
    var collapsed = _collapsed[0];
    var setCollapsed = _collapsed[1];
    var _tagInfo = React.useState(false);
    var showTagInfo = _tagInfo[0];
    var setShowTagInfo = _tagInfo[1];

    React.useEffect(function() {
      if (collapsed) { document.body.classList.add('sidebar-collapsed'); }
      else { document.body.classList.remove('sidebar-collapsed'); }
      return function() { document.body.classList.remove('sidebar-collapsed'); };
    }, [collapsed]);

    var handleToggleCollapse = function() {
      setCollapsed(function(prev) { return !prev; });
    };

    return React.createElement('div', { className:'flex flex-col h-full' },
      React.createElement(HeaderBar, {
        onMenuToggle: function() { setSidebarOpen(!sidebarOpen); },
        collapsed: collapsed,
        onToggleCollapse: handleToggleCollapse,
        navigate: navigate,
        onInfoClick: function() { setShowTagInfo(!showTagInfo); }
      }),
      React.createElement('div', { className:'flex flex-1 overflow-hidden' },
        React.createElement(Sidebar, {
          isOpen: sidebarOpen,
          collapsed: collapsed,
          onClose: function() { setSidebarOpen(false); },
          navigate: navigate,
          currentPath: currentPath
        }),
        React.createElement('main', { className:'flex-1 overflow-y-auto' },
          children
        ),
        React.createElement(RightSidebar, {
          isOpen: showTagInfo,
          onClose: function() { setShowTagInfo(false); },
          content: React.createElement(TagInfoScreen, { onBack: function() { setShowTagInfo(false); } })
        })
      )
    );
  }

  function AppRoutes() {
    var navigate = useNavigate();
    var location = useLocation();
    var params = useParams();

    var p = {};

    var currentPath = location.pathname;

    var wrapper = function(PageComponent, extraProps) {
      return React.createElement(React.Fragment, null,
        React.createElement(FloatingMarketplaceMenu, { navigate:navigate }),
        React.createElement(Layout, { navigate:navigate, currentPath:currentPath },
          React.createElement(PageComponent, Object.assign({ navigate:navigate, currentPath:currentPath }, extraProps))
        )
      );
    };

    return React.createElement(Routes, null,
      React.createElement(Route, { path:'/', element:wrapper(HomePage) }),
      React.createElement(Route, { path:'/marketplace', element:wrapper(MarketplaceSelectorPage) }),
      React.createElement(Route, { path:'/selector', element:wrapper(SelectorScreenPage) }),
      React.createElement(Route, { path:'/ordinalswallet', element:wrapper(OrdinalswalletPage) }),
      React.createElement(Route, { path:'/unisat', element:wrapper(UnisatPage) }),
      React.createElement(Route, { path:'/satflow', element:wrapper(SatflowPage) }),
      React.createElement(Route, { path:'/local', element:wrapper(LocalPage) }),
      React.createElement(Route, { path:'/mercado-parcelas', element:typeof ParcelsMarketPage !== 'undefined' ? wrapper(ParcelsMarketPage) : wrapper(LocalPage) }),
      React.createElement(Route, { path:'/discounts', element:wrapper(DescuentosPage) }),
      React.createElement(Route, { path:'/unified', element:wrapper(UnifiedPage) }),
      React.createElement(Route, { path:'/tag-tables/:tagName', element:wrapper(TagTableScreen) }),
      React.createElement(Route, { path:'/listed-tags', element:wrapper(ListedTagsPage) }),
      React.createElement(Route, { path:'/listed-tags/:tagName', element:wrapper(ListedTagDetailPage) }),
      React.createElement(Route, { path:'/sales', element:wrapper(VentasPage) }),
      React.createElement(Route, { path:'/blocks/:id', element:wrapper(PantallaDeBloqueEspecifico) }),
      React.createElement(Route, { path:'/wallet', element:wrapper(WalletConnectPage) }),
      React.createElement(Route, { path:'/wallet/dashboard', element:wrapper(WalletDashboardPage) }),
      React.createElement(Route, { path:'/mis-activos', element:wrapper(MisActivosPage) }),
      React.createElement(Route, { path:'/mis-activos/detalle/:collectionName', element:wrapper(DetallePage) }),
      React.createElement(Route, { path:'/wallet/transaction/:id', element:wrapper(TransactionPage) }),
      React.createElement(Route, { path:'/mondrian/:id', element:wrapper(MondrianPreviewPage) }),
      React.createElement(Route, { path:'/search', element:wrapper(BlockSearchPage) }),
      React.createElement(Route, { path:'/settings', element:wrapper(SettingsPage) }),
      React.createElement(Route, { path:'/world', element:React.createElement(WorldPage, { navigate:navigate }) }),
      React.createElement(Route, { path:'/admin/analytics', element:React.createElement('div', {id:'analytics-root', style:{height:'100vh',background:'#080008',padding:'20px',overflow:'auto'}}) })
    );
  }

  function Root() {
    return React.createElement(ErrorBoundary, null,
      React.createElement(HashRouter, null,
        React.createElement(AppRoutes, null)
      )
    );
  }

  var root = ReactDOM.createRoot(document.getElementById('root'));
  StoreApp.initWallet();
  root.render(React.createElement(Root));
})();
