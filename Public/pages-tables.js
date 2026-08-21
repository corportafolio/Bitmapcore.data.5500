function PantallaDeTablas(props) {
  var navigate = props.navigate;
  var _b = React.useState([]);
  var tags = _b[0];
  var setTags = _b[1];
  var _c = React.useState(true);
  var isLoading = _c[0];
  var setIsLoading = _c[1];
  var _d = React.useState('');
  var searchQuery = _d[0];
  var setSearchQuery = _d[1];

  React.useEffect(function() {
    loadAllTags();
  }, []);

  function loadAllTags() {
    setIsLoading(true);
    TagViewModel.loadTagsWithPreviews().then(function(data) {
      setTags(data);
      setIsLoading(false);
    }).catch(function() {
      setIsLoading(false);
    });
  }

  var filteredTags = tags.filter(function(t) {
    return t.name.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
  });

  return React.createElement('div', { className:'p-4 lg:p-6' },
      React.createElement('div', { className:'max-w-5xl mx-auto space-y-6' },
        React.createElement('div', { className:'flex items-center justify-between' },
          React.createElement('h1', { className:'font-alfaslab text-2xl text-white' }, 'Tablas de Etiquetas'),
          React.createElement('span', { className:'font-acme text-sm text-bitmap-muted' }, filteredTags.length + ' / 56 tablas')
        ),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
          React.createElement('input', {
            type:'text',
            value:searchQuery,
            onChange:function(e) { setSearchQuery(e.target.value); },
            placeholder:'Buscar tabla...',
            className:'w-full bg-bitmap-black border border-bitmap-border rounded-lg px-3 py-2 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange transition-colors h-10'
          })
        ),
        isLoading ? React.createElement('div', { className:'flex items-center justify-center h-64 font-acme text-bitmap-muted' }, I18n.t('app.loading')) : React.createElement('div', { className:'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' },
          filteredTags.map(function(tag, i) {
            return React.createElement(TagPreviewCard, {
              key: tag.name + '-' + i,
              tag: tag,
              onClick: function() { navigate('/tag-tables/' + encodeURIComponent(tag.name)); }
            });
          })
        ),
        !isLoading && filteredTags.length === 0 ? React.createElement('div', { className:'text-center py-8 font-acme text-bitmap-muted' }, 'No se encontraron tablas') : null
      )
  );
}

function TagPreviewCard(props) {
  var tag = props.tag;
  var onClick = props.onClick;
  var preview = tag.preview;
  var blockNum = preview ? (preview.blockNumber || preview.bloque || 0) : 0;
  var totalEtiquetas = preview ? (parseInt(preview.totalEtiquetas) || tag.count || 0) : 0;
  var totalBloquesUnicos = preview ? (parseInt(preview.totalBloquesUnicos) || totalEtiquetas) : 0;
  var tagName = preview ? preview.tagName : '';
  var isMultiTagBlock = tagName.toLowerCase().indexOf('millonaria') !== -1;

  return React.createElement('button', {
    onClick: onClick,
    className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all text-left h-full flex flex-col'
  },
    React.createElement('div', { className:'flex flex-col items-center text-center mb-2' },
      React.createElement(UniversalTag, { text:tag.name, fontSize:12 }),
      isMultiTagBlock ? React.createElement('div', { className:'font-acme text-xs text-bitmap-muted mt-1' },
        totalEtiquetas + ' etiquetas / ' + totalBloquesUnicos + ' bloques'
      ) : React.createElement('div', { className:'font-acme text-xs text-bitmap-muted mt-1' },
        totalBloquesUnicos + ' bloques'
      ),
      React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted' }, 'Primer bloque #' + blockNum)
    ),
    preview ? React.createElement('div', { className:'w-full aspect-square rounded-lg overflow-hidden bg-bitmap-black relative' },
      React.createElement('img', {
        src:'/api/v1/block-image/' + blockNum + '?v=3&size=200&etiquetas=' + encodeURIComponent(preview.etiquetas || '') + '&tx=' + (preview.totalTransactions || 0) + '&hash=' + encodeURIComponent(preview.hash || '') + '&grid=' + (preview.isPerfect || false) + '&punk=' + (preview.isPunk || false),
        className:'w-full h-full object-cover',
        loading:'lazy'
      })
    ) : React.createElement('div', { className:'w-full aspect-square rounded-lg bg-bitmap-black flex items-center justify-center' },
      React.createElement('span', { className:'text-3xl' }, '\uD83D\uDCCB')
    )
  );
}

function TagTableScreen(props) {
  var navigate = props.navigate;
  var routeParams = ReactRouterDOM.useParams();
  var tagName = routeParams.tagName;
  var _b = React.useState([]);
  var blocks = _b[0];
  var setBlocks = _b[1];
  var _c = React.useState(true);
  var isLoading = _c[0];
  var setIsLoading = _c[1];
  var _d = React.useState(1);
  var currentPage = _d[0];
  var setCurrentPage = _d[1];
  var _e = React.useState(0);
  var totalCount = _e[0];
  var setTotalCount = _e[1];
  var _f = React.useState(false);
  var isLoadingMore = _f[0];
  var setIsLoadingMore = _f[1];
  var _g = React.useState(true);
  var hasMore = _g[0];
  var setHasMore = _g[1];
  var _h = React.useState('grid');
  var viewMode = _h[0];
  var setViewMode = _h[1];
  var _i = React.useState(false);
  var showTagInfo = _i[0];
  var setShowTagInfo = _i[1];
  var limit = 100;

  var decodedName;
  try { decodedName = decodeURIComponent(tagName); } catch(e) { decodedName = tagName; }

  React.useEffect(function() {
    setBlocks([]);
    setCurrentPage(1);
    setHasMore(true);
    loadTagData();
    loadTagBlocks();
  }, [tagName]);

  React.useEffect(function() {
    if (!showTagInfo) return;
    function close(e) {
      var el = document.getElementById('taginfo-popover');
      var btn = document.getElementById('taginfo-btn');
      if ((el && el.contains(e.target)) || (btn && btn.contains(e.target))) return;
      setShowTagInfo(false);
    }
    document.addEventListener('mousedown', close);
    return function() { document.removeEventListener('mousedown', close); };
  }, [showTagInfo]);

  React.useEffect(function() {
    if (!hasMore || isLoadingMore || isLoading) return;
    function handleScroll() {
      var scrollH = document.documentElement.scrollHeight || document.body.scrollHeight;
      var clientH = document.documentElement.clientHeight || document.body.clientHeight;
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollH > 0 && (scrollTop + clientH) / scrollH >= 0.8) {
        loadMore();
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return function() { window.removeEventListener('scroll', handleScroll); };
  }, [hasMore, isLoadingMore, isLoading, currentPage]);

  function loadTagData() {
    TagViewModel.getTagCount(tagName).then(function(count) {
      setTotalCount(count);
    });
  }

  function loadTagBlocks() {
    setIsLoading(true);
    TagViewModel.loadTagBlocks(tagName, 1, limit).then(function(blocksData) {
      setBlocks(blocksData);
      setHasMore(blocksData.length >= limit);
      setIsLoading(false);
    });
  }

  function loadMore() {
    if (isLoadingMore || !hasMore) return;
    var nextPage = currentPage + 1;
    setIsLoadingMore(true);
    TagViewModel.loadTagBlocks(tagName, nextPage, limit).then(function(newBlocks) {
      if (newBlocks.length === 0) {
        setHasMore(false);
        setIsLoadingMore(false);
        return;
      }
      setBlocks(function(prev) { return prev.concat(newBlocks); });
      setCurrentPage(nextPage);
      setHasMore(newBlocks.length >= limit);
      setIsLoadingMore(false);
    }).catch(function() {
      setIsLoadingMore(false);
    });
  }

  var tagInfoIdx = -1;
  if (typeof TAG_NAMES !== 'undefined' && typeof TAG_DESCRIPTIONS !== 'undefined') {
    for (var ti = 0; ti < TAG_NAMES.length; ti++) {
      if (TAG_NAMES[ti] === decodedName) { tagInfoIdx = ti; break; }
    }
  }

  var infoSVG = React.createElement('svg', {
    className: 'w-[22px] h-[22px]',
    fill: 'currentColor',
    viewBox: '0 0 24 24',
    xmlns: 'http://www.w3.org/2000/svg'
  }, React.createElement('path', {
    d: 'M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 9.5C12.8284 9.5 13.5 8.82843 13.5 8C13.5 7.17157 12.8284 6.5 12 6.5C11.1716 6.5 10.5 7.17157 10.5 8C10.5 8.82843 11.1716 9.5 12 9.5ZM14 15H13V10.5H10V12.5H11V15H10V17H14V15Z'
  }));

  var gridIcon = React.createElement('svg', { width:'22', height:'22', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2' },
    React.createElement('rect', { x:'3', y:'3', width:'7', height:'7', rx:'1' }),
    React.createElement('rect', { x:'14', y:'3', width:'7', height:'7', rx:'1' }),
    React.createElement('rect', { x:'3', y:'14', width:'7', height:'7', rx:'1' }),
    React.createElement('rect', { x:'14', y:'14', width:'7', height:'7', rx:'1' })
  );

  var listIcon = React.createElement('svg', { width:'22', height:'22', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'2' },
    React.createElement('line', { x1:'3', y1:'6', x2:'21', y2:'6' }),
    React.createElement('line', { x1:'3', y1:'12', x2:'21', y2:'12' }),
    React.createElement('line', { x1:'3', y1:'18', x2:'21', y2:'18' })
  );

  return React.createElement('div', { className:'pl-14 pr-4 py-4 lg:py-6' },
      React.createElement('div', { className:'max-w-7xl mx-auto space-y-0.5' },
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4 relative' },
          React.createElement('div', { className:'flex items-center justify-between gap-1 flex-wrap' },
            React.createElement('div', { className:'flex items-center gap-1' },
              React.createElement(UniversalTagList, { etiquetas: decodedName, fontSize: 12, navigate: navigate }),
              React.createElement('button', {
                id: 'taginfo-btn',
                onClick: function(e) { e.stopPropagation(); setShowTagInfo(!showTagInfo); },
                className: 'text-bitmap-orange hover:text-bitmap-orange-light transition-colors cursor-pointer',
                title: 'Informacion de la etiqueta'
              }, infoSVG)
            ),
            React.createElement('div', { className:'flex items-center gap-1' },
              React.createElement('span', { className:'font-acme text-sm text-bitmap-muted whitespace-nowrap' }, totalCount + ' bloques'),
              React.createElement('button', {
                onClick: function() { setViewMode(viewMode === 'grid' ? 'list' : 'grid'); },
                className: 'p-1 rounded transition-colors ' + (viewMode === 'list' ? 'text-bitmap-orange' : 'text-bitmap-muted hover:text-white'),
                title: viewMode === 'grid' ? 'Vista lista' : 'Vista grilla'
              }, viewMode === 'grid' ? listIcon : gridIcon)
            )
          ),
          showTagInfo ? React.createElement('div', { id:'taginfo-popover', className:'absolute left-0 top-full mt-1 z-50 w-80 bg-bitmap-surface border border-bitmap-border rounded-xl p-3 shadow-lg' },
            React.createElement('div', { className:'flex items-center justify-between mb-1' },
              React.createElement('span', { className:'inline-block px-2 py-0.5 bg-bitmap-orange/10 border border-bitmap-orange/30 rounded text-bitmap-orange text-xs font-alfaslab' }, decodedName),
              React.createElement('button', { onClick: function() { setShowTagInfo(false); }, className:'text-bitmap-muted hover:text-white transition-colors text-sm ml-2' }, '\u2715')
            ),
            tagInfoIdx >= 0
              ? React.createElement('p', { className:'text-bitmap-text text-xs leading-relaxed', style:{whiteSpace:'pre-line'} }, TAG_DESCRIPTIONS[tagInfoIdx])
              : React.createElement('p', { className:'font-acme text-xs text-bitmap-muted' }, 'Sin informacion disponible para esta etiqueta')
          ) : null
        ),
        isLoading && blocks.length === 0 ? React.createElement('div', { className:'flex items-center justify-center h-64 font-acme text-bitmap-muted' }, I18n.t('app.loading')) : (
          viewMode === 'grid'
            ? React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0.5' },
                blocks.map(function(block, i) {
                  var blockNum = block.blockNumber;
                  var etiquetas = block.etiquetas || '';
                  var imgParams = 'v=3&size=200&etiquetas=' + encodeURIComponent(etiquetas) + '&tx=' + block.totalTransactions + '&hash=' + encodeURIComponent(block.hash || '') + '&grid=' + (etiquetas.toLowerCase().indexOf('grid') !== -1) + '&punk=' + (etiquetas.toLowerCase().indexOf('punk') !== -1);
                  return React.createElement('button', {
                    key: blockNum + '-' + i,
                    onClick: function() { navigate('/blocks/' + blockNum); },
                    className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all text-left'
                  },
                    React.createElement('div', { className:'w-full aspect-square mb-0.5 rounded-lg overflow-hidden bg-bitmap-black relative' },
                      React.createElement('img', {
                        src: '/api/v1/block-image/' + blockNum + '?' + imgParams,
                        className: 'w-full h-full object-cover',
                        loading: 'lazy',
                        alt: 'Block ' + blockNum
                      })
                    ),
                    React.createElement('div', { className:'font-alfaslab text-sm text-white' }, blockNum + '.bitmap'),
                    React.createElement('div', { className:'font-acme text-xs', style:{ color:'#666666' } },
                      BitmapUtils.formatBtc(block.totalBtc || 0) + ' BTC'
                    )
                  );
                })
              )
            : React.createElement('div', { className:'divide-y divide-bitmap-border' },
                blocks.map(function(block, i) {
                  var blockNum = block.blockNumber;
                  var etiquetas = block.etiquetas || '';
                  var imgParams = 'v=3&size=55&etiquetas=' + encodeURIComponent(etiquetas) + '&tx=' + block.totalTransactions + '&hash=' + encodeURIComponent(block.hash || '') + '&grid=' + (etiquetas.toLowerCase().indexOf('grid') !== -1) + '&punk=' + (etiquetas.toLowerCase().indexOf('punk') !== -1);
                  return React.createElement('button', {
                    key: blockNum + '-' + i,
                    onClick: function() { navigate('/blocks/' + blockNum); },
                    className: 'w-full px-4 py-0.5 hover:bg-bitmap-surface transition-colors text-left'
                  },
                    React.createElement('div', { className:'flex items-center gap-0.5' },
                      React.createElement('div', { className:'flex-shrink-0', style: { width: 55, height: 55 } },
                        React.createElement('img', {
                          src: '/api/v1/block-image/' + blockNum + '?' + imgParams,
                          width: 55,
                          height: 55,
                          loading: 'lazy',
                          style: { imageRendering: 'pixelated', background: '#1a1a1a', borderRadius: 4 },
                          alt: ''
                        })
                      ),
                      React.createElement('div', { className:'flex-1 min-w-0' },
                        React.createElement('div', { className:'flex items-center justify-between' },
                          React.createElement('span', { className:'font-alfaslab text-sm text-white font-bold' }, blockNum + '.bitmap'),
                          React.createElement('span', { className:'font-acme text-sm font-semibold', style:{ color:'#666666' } },
                            BitmapUtils.formatBtc(block.totalBtc || 0) + ' BTC'
                          )
                        ),
                        React.createElement('div', { className:'flex items-center justify-between mt-0.5' },
                          React.createElement('div', { className:'flex items-center gap-1 min-w-0 overflow-hidden whitespace-nowrap' },
                            React.createElement('span', { className:'font-acme text-[9px] text-bitmap-muted flex-shrink-0' }, (etiquetas ? etiquetas.split('|').filter(function(t){return t.trim()!=='';}).length : 0) + ' tags'),
                            React.createElement('div', { className:'flex items-center gap-1 min-w-0 overflow-hidden' },
                              etiquetas ? etiquetas.split('|').filter(function(t){return t.trim()!=='';}).map(function(tag, ti) {
                                return React.createElement(UniversalTag, { key:ti, text:tag.trim(), fontSize:9 });
                              }) : null
                            )
                          )
                        )
                      )
                    )
                  );
                })
              )
        ),
        blocks.length === 0 && !isLoading ? React.createElement('div', { className:'text-center py-8 font-acme text-bitmap-muted' }, 'Esta tabla no tiene bloques') : null,
        isLoadingMore ? React.createElement('div', { className:'text-center py-4 font-acme text-bitmap-muted' }, 'Cargando mas...') : null,
        !hasMore && blocks.length > 0 ? React.createElement('div', { className:'text-center py-4 font-acme text-bitmap-muted' }, blocks.length + ' bloques cargados') : null
      )
  );
}