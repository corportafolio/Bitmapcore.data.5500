/*
 * ============================================================================
 *  pages-collections-list.js  —  CATÁLOGO DE COLECCIONES REGISTRADAS
 * ============================================================================
 *  Muestra todas las colecciones registradas (estilo Unisat/OrdinalsWallet):
 *  tarjetas con imagen, nombre, descripción y supply. Cada tarjeta lleva a
 *  /collections/:slug (la pantalla dinámica compartida).
 * ============================================================================
 */
function CollectionsListPage(props) {
  var navigate = props.navigate;
  var _col = React.useState([]);
  var collections = _col[0];
  var setCollections = _col[1];
  var _load = React.useState(true);
  var isLoading = _load[0];
  var setIsLoading = _load[1];

  var load = function() {
    setIsLoading(true);
    AssetApi.getCollections().then(function(res) {
      var items = (res && res.data && res.data.collections) || [];
      setCollections(items);
      setIsLoading(false);
    }).catch(function() { setIsLoading(false); });
  };
  React.useEffect(function() { load(); }, []);

  return React.createElement('div', { className: 'flex flex-col h-full bg-bitmap-black overflow-y-auto' },
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border px-4 py-3 flex items-center gap-3' },
      React.createElement('button', { onClick: function() { if (navigate) navigate('/add-collection'); }, className: 'text-bitmap-orange text-xl font-bold' }, '\uFF0B'),
      React.createElement('div', { className: 'flex-1' },
        React.createElement('div', { className: 'font-alfaslab text-white text-base' }, 'Colecciones'),
        React.createElement('div', { className: 'font-acme text-[11px] text-bitmap-muted' }, 'Lista y comercia colecciones Ordinals')
      )
    ),

    isLoading ? React.createElement('div', { className: 'flex-1 flex items-center justify-center text-bitmap-muted font-acme' }, 'Cargando colecciones...')
    : collections.length === 0 ? React.createElement('div', { className: 'flex-1 flex flex-col items-center justify-center p-8 text-center' },
        React.createElement('div', { className: 'font-acme text-bitmap-muted mb-3' }, 'Todavía no hay colecciones registradas.'),
        React.createElement('button', {
          onClick: function() { navigate('/add-collection'); },
          className: 'px-4 py-2 rounded-lg font-acme text-sm font-bold',
          style: { background: 'linear-gradient(180deg,#FE3E00,#b52a00)', color: '#fff' }
        }, '+ Añadir la primera colección')
      )
    : React.createElement('div', { className: 'p-4' },
        React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' },
          collections.map(function(c) {
            var img = c.image || '';
            return React.createElement('button', {
              key: c.slug,
              onClick: function() { navigate('/collections/' + c.slug); },
              className: 'bg-bitmap-surface border border-bitmap-border rounded-xl overflow-hidden hover:border-bitmap-orange/60 transition-colors text-left'
            },
              React.createElement('div', { className: 'w-full aspect-square bg-bitmap-black flex items-center justify-center overflow-hidden' },
                img
                  ? React.createElement('img', { src: img, className: 'w-full h-full object-cover', onError: function(e) { e.target.style.display = 'none'; } })
                  : React.createElement('div', { className: 'font-alfaslab text-4xl text-bitmap-orange/40' }, (c.name ? c.name.charAt(0).toUpperCase() : '?'))
              ),
              React.createElement('div', { className: 'p-3' },
                React.createElement('div', { className: 'font-alfaslab text-white text-sm truncate' }, c.name || c.slug),
                c.description ? React.createElement('div', { className: 'font-acme text-[11px] text-bitmap-muted line-clamp-2 mt-1' }, c.description) : null,
                React.createElement('div', { className: 'flex items-center justify-between mt-2' },
                  React.createElement('span', { className: 'font-acme text-[11px] text-bitmap-muted' }, (c.supply || 0) + ' items'),
                  React.createElement('span', { className: 'font-acme text-[11px] text-bitmap-orange font-bold' }, 'Ver \u2192')
                )
              )
            );
          })
        )
      )
  );
}

if (typeof window !== 'undefined') {
  window.CollectionsListPage = CollectionsListPage;
}
