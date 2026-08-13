// Pantalla 1: Agrupar Etiquetas Listadas (vistas previas)
// Grid de burbujas, cada burbuja = una etiqueta agrupada de los listings unificados
function ListedTagsPage(props) {
  var navigate = props.navigate;
  var _b = React.useState([]);
  var tagGroups = _b[0];
  var setTagGroups = _b[1];
  var _c = React.useState(true);
  var isLoading = _c[0];
  var setIsLoading = _c[1];
  var _d = React.useState('');
  var searchQuery = _d[0];
  var setSearchQuery = _d[1];

  React.useEffect(function() {
    setIsLoading(true);
    ListedTagViewModel.loadTagGroups().then(function(groups) {
      setTagGroups(groups);
      setIsLoading(false);
    });
  }, []);

  var filtered = tagGroups.filter(function(g) {
    if (searchQuery === '') return true;
    return g.tagName.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
  });

  return React.createElement('div', { className: 'p-4 lg:p-6' },
    React.createElement('div', { className: 'max-w-5xl mx-auto space-y-6' },
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement('h1', { className: 'font-alfaslab text-2xl text-white' }, 'Etiquetas Listadas'),
        React.createElement('span', { className: 'font-acme text-sm text-bitmap-muted' }, filtered.length + ' etiquetas agrupadas')
      ),
      React.createElement('div', { className: 'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
        React.createElement('input', {
          type: 'text',
          value: searchQuery,
          onChange: function(e) { setSearchQuery(e.target.value); },
          placeholder: 'Buscar etiqueta...',
          className: 'w-full bg-bitmap-black border border-bitmap-border rounded-lg px-3 py-2 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange transition-colors h-10'
        })
      ),
      isLoading ? React.createElement('div', { className: 'flex items-center justify-center h-64 font-acme text-bitmap-muted' }, 'Cargando etiquetas listadas...') :
      React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' },
        filtered.map(function(group, i) {
          return React.createElement(ListedTagBubble, {
            key: group.tagName + '-' + i,
            group: group,
            onClick: function() { navigate('/listed-tags/' + encodeURIComponent(group.tagName)); }
          });
        })
      ),
      !isLoading && filtered.length === 0 ? React.createElement('div', { className: 'text-center py-8 font-acme text-bitmap-muted' }, 'No se encontraron etiquetas listadas') : null
    )
  );
}

// Burbuja de cada etiqueta agrupada con vistas previas (solo primeros bloques)
function ListedTagBubble(props) {
  var group = props.group;
  var onClick = props.onClick;
  var previews = (group.previews || []).slice(0, 6);

  return React.createElement('button', {
    onClick: onClick,
    className: 'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all text-left h-full flex flex-col'
  },
    React.createElement('div', { className: 'flex flex-col items-center text-center mb-2' },
      React.createElement(UniversalTag, { text: group.tagName, fontSize: 12 }),
      React.createElement('div', { className: 'font-acme text-xs text-bitmap-muted mt-1' },
        group.count + ' listados'
      )
    ),
    previews.length > 0
      ? React.createElement('div', { className: 'grid grid-cols-3 gap-1' },
          previews.map(function(item, i) {
            var etiquetas = item.etiquetas || '';
            var isPerfect = etiquetas.indexOf('Perfect') !== -1;
            var isPunk = etiquetas.indexOf('Punk') !== -1;
            return React.createElement('img', {
              key: i,
              src: '/api/v1/block-image/' + (item.bitmapNumber || 0) + '?size=80&etiquetas=' + encodeURIComponent(etiquetas || '') + '&tx=' + (item.totalTransacciones || 0) + '&hash=' + encodeURIComponent(item.hash || '') + '&perfect=' + isPerfect + '&punk=' + isPunk,
              style: { width: '100%', aspectRatio: '1', borderRadius: 4, imageRendering: 'pixelated', background: '#1a1a1a' },
              loading: 'lazy', alt: ''
            });
          })
        )
      : React.createElement('div', { className: 'w-full aspect-square rounded-lg bg-bitmap-black flex items-center justify-center' },
          React.createElement('span', { className: 'text-3xl' }, '\uD83C\uDFF7\uFE0F')
        )
  );
}

// Pantalla 2: Detalles de etiquetas listadas y agrupadas (lista completa)
function ListedTagDetailPage(props) {
  var navigate = props.navigate;
  var tagName = decodeURIComponent(props.tagName || '');
  var _b = React.useState('all');
  var filterSource = _b[0];
  var setFilterSource = _b[1];
  var _c = React.useState([]);
  var items = _c[0];
  var setItems = _c[1];
  var _d = React.useState(0);
  var total = _d[0];
  var setTotal = _d[1];
  var _e = React.useState(true);
  var isLoading = _e[0];
  var setIsLoading = _e[1];
  var _f = React.useState(0);
  var offset = _f[0];
  var setOffset = _f[1];
  var _g = React.useState(false);
  var isLoadingMore = _g[0];
  var setIsLoadingMore = _g[1];
  var limit = 100;

  React.useEffect(function() {
    fetchListings(0, true);
  }, [tagName, filterSource]);

  function fetchListings(nextOffset, reset) {
    if (!reset) setIsLoadingMore(true);
    else setIsLoading(true);
    ListedTagViewModel.getTagListings(tagName, filterSource, nextOffset, limit).then(function(data) {
      var newItems = data.items || [];
      setTotal(data.total || 0);
      setItems(reset ? newItems : function(prev) { return prev.concat(newItems); });
      setOffset(nextOffset);
      setIsLoading(false);
      setIsLoadingMore(false);
    }).catch(function() {
      setIsLoading(false);
      setIsLoadingMore(false);
    });
  }

  function loadMore() {
    if (isLoadingMore) return;
    fetchListings(offset + limit, false);
  }

  function sourceLogo(s) {
    if (s === 'ordinalswallet') return 'ordinalswallet_logo.png';
    if (s === 'unisat') return 'unisat_logo.png';
    return 'logo_bitmapcore_logo.png';
  }

  function sourceLabel(s) {
    if (s === 'ordinalswallet') return 'Ordinalswallet';
    if (s === 'unisat') return 'Unisat';
    return 'BitmapCore';
  }

  function sourceColor(s) {
    if (s === 'ordinalswallet') return '#8B5CF6';
    if (s === 'unisat') return '#F59E0B';
    return '#FE3E00';
  }

  return React.createElement('div', { className: 'flex flex-col h-full' },
    React.createElement('div', { className: 'bg-bitmap-surface border-b border-bitmap-border pl-14 pr-4 py-2', style: { backgroundColor: '#1A1A1A' } },
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('button', {
            onClick: function() { navigate('/listed-tags'); },
            className: 'font-acme text-xs text-bitmap-orange hover:underline'
          }, '\u2190 Volver'),
          React.createElement(UniversalTag, { text: tagName, fontSize: 13 }),
          React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted' }, total + ' listados')
        ),
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
      )
    ),
    React.createElement('div', { className: 'flex-1 overflow-y-auto pl-14 pr-4 py-3' },
      isLoading
        ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' }, 'Cargando listados...')
        : items.length === 0
          ? React.createElement('div', { className: 'text-center py-12 font-acme text-bitmap-muted' }, 'No hay listados con esta etiqueta')
          : React.createElement('div', { className: 'divide-y divide-bitmap-border' },
              items.map(function(item, i) {
                var btcPrice = item.listedPrice ? (item.listedPrice / 100000000).toFixed(5) : '0';
                var addr = BitmapUtils.truncateAddress(item.ownerAddress, 6);
                var etiquetas = item.etiquetas || '';
                var isPerfect = etiquetas.indexOf('Perfect') !== -1;
                var isPunk = etiquetas.indexOf('Punk') !== -1;
                return React.createElement('div', {
                  key: (item.source || '') + '_' + (item.bitmapId || i),
                  className: 'px-4 py-3 hover:bg-bitmap-surface transition-colors cursor-pointer',
                  onClick: function() { navigate('/blocks/' + (item.bitmapNumber || 0)); }
                },
                  React.createElement('div', { className: 'flex items-center gap-3' },
                    React.createElement('div', { className: 'flex-shrink-0', style: { width: 80, height: 80 } },
                      React.createElement('img', {
                        src: '/api/v1/block-image/' + (item.bitmapNumber || 0) + '?size=80&etiquetas=' + encodeURIComponent(etiquetas || '') + '&tx=' + (item.totalTransacciones || 0) + '&hash=' + encodeURIComponent(item.hash || '') + '&perfect=' + isPerfect + '&punk=' + isPunk,
                        width: 80, height: 80, loading: 'lazy',
                        style: { imageRendering: 'pixelated', background: '#1a1a1a', borderRadius: 4 }, alt: ''
                      })
                    ),
                    React.createElement('div', { className: 'flex-1 min-w-0' },
                      React.createElement('div', { className: 'flex items-center justify-between' },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                          React.createElement('span', { className: 'font-alfaslab text-sm text-bitmap-orange font-bold' },
                            '#' + (item.bitmapNumber || '?') + '.bitmap'
                          ),
                          React.createElement('span', {
                            className: 'px-1.5 py-0.5 rounded text-[9px] font-acme flex-shrink-0',
                            style: { backgroundColor: sourceColor(item.source) + '22', color: sourceColor(item.source) }
                          }, sourceLabel(item.source)),
                          React.createElement('img', {
                            src: sourceLogo(item.source),
                            style: { width: 10, height: 10, flexShrink: 0 },
                            alt: ''
                          })
                        ),
                        React.createElement('span', { className: 'font-acme text-sm font-semibold text-bitmap-orange-light' },
                          btcPrice + ' BTC'
                        )
                      ),
                      React.createElement('div', { className: 'flex items-center justify-between mt-0.5' },
                        React.createElement('div', { className: 'flex-1 min-w-0' },
                          etiquetas ? React.createElement(UniversalTagList, { etiquetas: etiquetas, fontSize: 10 }) : null
                        ),
                        React.createElement('span', { className: 'font-acme text-xs text-bitmap-muted truncate ml-2' }, addr)
                      )
                    )
                  )
                );
              })
            ),
      isLoadingMore ? React.createElement('div', { className: 'text-center py-4 font-acme text-bitmap-muted text-xs' }, 'Cargando m\u00e1s...') : null,
      !isLoading && items.length < total && items.length > 0 ? React.createElement('div', { className: 'text-center' },
        React.createElement('button', {
          onClick: loadMore,
          disabled: isLoadingMore,
          className: 'px-6 py-2 bg-bitmap-surface border border-bitmap-border rounded-lg font-alfaslab text-sm text-bitmap-orange hover:bg-bitmap-black/30 transition-colors disabled:opacity-50'
        }, isLoadingMore ? 'Cargando...' : 'Cargar mas (' + items.length + ' / ' + total + ')')
      ) : null
    )
  );
}
