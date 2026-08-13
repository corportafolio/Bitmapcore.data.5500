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
          React.createElement('span', { className:'font-acme text-sm text-bitmap-muted' }, filteredTags.length + ' / 55 tablas')
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
      React.createElement(MondrianCanvas, {
        blockNumber: blockNum,
        totalTransactions: preview.totalTransactions || 0,
        hash: preview.hash || '',
        isPerfect: preview.isPerfect || false,
        isPunk: preview.isPunk || false,
        etiquetas: preview.etiquetas || '',
        size: 200
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
  var limit = 50;

  React.useEffect(function() {
    loadTagData();
    loadTagBlocks();
  }, [tagName]);

  function loadTagData() {
    TagViewModel.getTagCount(tagName).then(function(count) {
      setTotalCount(count);
    });
  }

  function loadTagBlocks() {
    setIsLoading(true);
    TagViewModel.loadTagBlocks(tagName, currentPage, limit).then(function(blockNumbers) {
      if (blockNumbers.length === 0) {
        setBlocks([]);
        setIsLoading(false);
        return;
      }

      var promises = blockNumbers.map(function(num) {
        return BlockViewModel.getBlock(num);
      });

      Promise.all(promises).then(function(loadedBlocks) {
        var validBlocks = loadedBlocks.filter(function(b) { return b !== null && b !== undefined; });
        setBlocks(validBlocks);
        setIsLoading(false);
      }).catch(function() {
        setBlocks([]);
        setIsLoading(false);
      });
    });
  }

  function loadMore() {
    if (isLoadingMore) return;
    var nextPage = currentPage + 1;
    setIsLoadingMore(true);
    TagViewModel.loadTagBlocks(tagName, nextPage, limit).then(function(blockNumbers) {
      if (blockNumbers.length === 0) {
        setIsLoadingMore(false);
        return;
      }
      var promises = blockNumbers.map(function(num) {
        return BlockViewModel.getBlock(num);
      });
      Promise.all(promises).then(function(loadedBlocks) {
        var validBlocks = loadedBlocks.filter(function(b) { return b !== null && b !== undefined; });
        setBlocks(function(prev) { return prev.concat(validBlocks); });
        setCurrentPage(nextPage);
        setIsLoadingMore(false);
      }).catch(function() {
        setIsLoadingMore(false);
      });
    });
  }

  var decodedName = decodeURIComponent(tagName);

  return React.createElement('div', { className:'p-4 lg:p-6' },
      React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
          React.createElement('div', { className:'flex items-center justify-between' },
            React.createElement('h2', { className:'font-alfaslab text-lg text-white' }, decodedName),
            React.createElement('span', { className:'font-acme text-sm text-bitmap-muted' }, totalCount + ' bloques')
          ),
          React.createElement('div', { className:'flex flex-wrap gap-2 mt-2' },
            React.createElement(UniversalTagList, { etiquetas: decodedName, fontSize: 11, navigate: navigate })
          )
        ),
        isLoading && blocks.length === 0 ? React.createElement('div', { className:'flex items-center justify-center h-64 font-acme text-bitmap-muted' }, I18n.t('app.loading')) : React.createElement('div', { className:'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' },
          blocks.map(function(block, i) {
            var blockNum = block.bloque || block.blockNumber;
            return React.createElement('button', {
              key: blockNum + '-' + i,
              onClick: function() { navigate('/blocks/' + blockNum); },
              className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all text-left'
            },
              React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black relative' },
                React.createElement(MondrianCanvas, {
                  blockNumber: blockNum,
                  totalTransactions: parseInt(block.totalTransacciones) || 0,
                  hash: block.hash || '',
                  isPerfect: (block.etiquetas || '').indexOf('Perfect') !== -1,
                  isPunk: (block.etiquetas || '').indexOf('Punk') !== -1,
                  etiquetas: block.etiquetas || '',
                  transactions: [],
                  size: 150
                })
              ),
              React.createElement('div', { className:'font-alfaslab text-sm text-white' }, 'Block #' + blockNum),
              React.createElement('div', { className:'font-acme text-xs text-bitmap-orange-light' },
                BitmapUtils.formatBtc(block.totalBtc || block.total_btc || 0) + ' BTC'
              )
            );
          })
        ),
        blocks.length === 0 && !isLoading ? React.createElement('div', { className:'text-center py-8 font-acme text-bitmap-muted' }, 'Esta tabla no tiene bloques') : null,
        (blocks.length < totalCount && blocks.length > 0) ? React.createElement('div', { className:'text-center' },
          React.createElement('button', {
            onClick: loadMore,
            disabled: isLoadingMore,
            className:'px-6 py-2 bg-bitmap-surface border border-bitmap-border rounded-lg font-alfaslab text-sm text-bitmap-orange hover:bg-bitmap-black/30 transition-colors disabled:opacity-50'
          }, isLoadingMore ? 'Cargando...' : 'Cargar mas (' + blocks.length + ' / ' + totalCount + ')')
        ) : null
      )
  );
}