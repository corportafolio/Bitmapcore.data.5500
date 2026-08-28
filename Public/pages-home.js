function HomePage(props) {
  var navigate = props.navigate;
  var _b = React.useState('');
  var searchQuery = _b[0];
  var setSearchQuery = _b[1];
  var _d = React.useState(false);
  var isSearching = _d[0];
  var setIsSearching = _d[1];
  var _e = React.useState([]);
  var tags = _e[0];
  var setTags = _e[1];
  var _f = React.useState(true);
  var tagsLoading = _f[0];
  var setTagsLoading = _f[1];
  var _g = React.useState('original');
  var sortOrder = _g[0];
  var setSortOrder = _g[1];
  var _h = React.useState(false);
  var sortMenuOpen = _h[0];
  var setSortMenuOpen = _h[1];
  var _i = React.useState([]);
  var pinnedResults = _i[0];
  var setPinnedResults = _i[1];
  var _k = React.useState('');
  var noBlockMessage = _k[0];
  var setNoBlockMessage = _k[1];

  var noBlockTimer = null;

  React.useEffect(function() {
    TagViewModel.loadTagsWithPreviews().then(function(data) {
      setTags(data);
      setTagsLoading(false);
    }).catch(function() {
      setTagsLoading(false);
    });
  }, []);

  React.useEffect(function() {
    var interval = setInterval(function() {
      TagViewModel.loadTagsWithPreviews().then(function(data) {
        setTags(data);
      });
    }, 60000);
    return function() { clearInterval(interval); };
  }, []);

  var commitSearch = function(query) {
    if (!query.trim()) return;
    setSearchQuery('');
    setIsSearching(true);
    var results = [];
    var num = parseInt(query);
    if (!isNaN(num)) {
      BlockViewModel.getBlock(num).then(function(block) {
        setIsSearching(false);
        if (!block) {
          setNoBlockMessage('El bloque ' + num + ' no existe en la base de datos');
          if (noBlockTimer) clearTimeout(noBlockTimer);
          noBlockTimer = setTimeout(function() { setNoBlockMessage(''); }, 10000);
          return;
        }
        var etiquetas = block.etiquetas || '';
        var hash = block.hash || '';
        var totalTransactions = block.totalTransacciones || 0;
        var newResult = {
          type:'block', id:num, label:num + '.bitmap',
          etiquetas:etiquetas, hash:hash, totalTransactions:totalTransactions
        };
        setPinnedResults(function(prev) {
          var exists = prev.some(function(r) { return r.type === newResult.type && r.id === newResult.id; });
          if (exists) return prev;
          return [newResult].concat(prev).slice(0, 5);
        });
      });
    } else {
      results.push({ type:'tag', id:query, label:query });
      var tagBlocks = TagClassifier.getBlocksByTag(query, 3);
      for (var i = 0; i < tagBlocks.length; i++) {
        results.push({ type:'block', id:tagBlocks[i].blockNumber, label:tagBlocks[i].blockNumber + '.bitmap' });
      }
      if (results.length > 1) {
        var pending = results.length - 1;
        for (var j = 1; j < results.length; j++) {
          (function(idx) {
            BlockViewModel.getBlock(results[idx].id).then(function(block) {
              if (block) {
                results[idx].etiquetas = block.etiquetas || '';
                results[idx].hash = block.hash || '';
                results[idx].totalTransactions = block.totalTransacciones || 0;
              } else {
                results[idx] = null;
              }
              pending--;
              if (pending === 0) {
                var toPin = results.slice(1).filter(function(r) { return r !== null; }).slice(0, 3);
                toPin.unshift(results[0]);
                setPinnedResults(function(prev) {
                  var combined = toPin.concat(prev);
                  var seen = {};
                  var deduped = [];
                  for (var k = 0; k < combined.length; k++) {
                    var key = combined[k].type + '-' + combined[k].id;
                    if (!seen[key]) { seen[key] = true; deduped.push(combined[k]); }
                  }
                  return deduped.slice(0, 5);
                });
                setIsSearching(false);
              }
            });
          })(j);
        }
      } else {
        setPinnedResults(function(prev) {
          var exists = prev.some(function(r) { return r.type === results[0].type && r.id === results[0].id; });
          if (exists) return prev;
          return results.concat(prev).slice(0, 5);
        });
        setIsSearching(false);
      }
    }
  };

  var handleKeyDown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        commitSearch(searchQuery);
      }
    }
  };

  var handleRemovePinned = function(index) {
    setPinnedResults(function(prev) { return prev.filter(function(_, i) { return i !== index; }); });
  };

  var handleResultClick = function(result) {
    if (result.type === 'block') navigate('/blocks/' + result.id);
    else navigate('/tags/' + result.id);
  };

  var sortOptions = [
    { key:'A-Z', label:'A-Z' },
    { key:'most_blocks', label:'Con M\u00E1s bloques' },
    { key:'least_blocks', label:'Con Menos bloques' },
    { key:'original', label:'Orden original (Bloque)' }
  ];

  var getSortedTags = function() {
    if (sortOrder === 'original') return tags.slice();
    var arr = tags.slice();
    switch (sortOrder) {
      case 'A-Z':
        arr.sort(function(a, b) { return a.name.localeCompare(b.name); });
        break;
      case 'most_blocks':
        arr.sort(function(a, b) { return (b.count || 0) - (a.count || 0); });
        break;
      case 'least_blocks':
        arr.sort(function(a, b) { return (a.count || 0) - (b.count || 0); });
        break;
    }
    return arr;
  };

  return React.createElement('div', { className:'pl-14 pr-3 py-3' },
    React.createElement('div', { className:'max-w-7xl mx-auto space-y-4 px-2' },
      React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl px-4 py-0.5' },
        React.createElement('div', { className:'flex items-center gap-2' },
          React.createElement('span', { className:'text-lg' }, '\uD83D\uDD0D'),
          React.createElement('input', {
            type:'text',
            value:searchQuery,
            onChange:function(e) { setSearchQuery(e.target.value); setNoBlockMessage(''); },
            onKeyDown:handleKeyDown,
            placeholder:'Buscar bloque o etiqueta...',
            className:'flex-1 bg-bitmap-black border border-bitmap-border rounded-lg px-3 py-2 font-acme text-sm text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange transition-colors h-10'
          })
        ),
        isSearching ? React.createElement('div', { className:'mt-0.5 font-acme text-xs text-bitmap-muted' }, I18n.t('app.loading')) : null,
        noBlockMessage ? React.createElement('div', { className:'mt-0.5 font-acme text-xs text-center', style:{color:'#666666'} }, noBlockMessage) : null
      ),
      pinnedResults.length > 0 ? React.createElement('div', { className:'mt-4' },
        React.createElement('div', { className:'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3' },
          pinnedResults.map(function(result, i) {
            return React.createElement(ResultCard, {
              key: 'pinned-' + result.type + '-' + result.id + '-' + i,
              type: result.type,
              id: result.id,
              label: result.label,
              price: result.price,
              etiquetas: result.etiquetas || '',
              hash: result.hash || '',
              totalTransactions: result.totalTransactions || 0,
              onClick: function() { handleResultClick(result); },
              onRemove: function() { handleRemovePinned(i); }
            });
          })
        )
      ) : null,
      tagsLoading ? React.createElement('div', { className:'flex items-center justify-center h-32 font-acme text-bitmap-muted' }, I18n.t('app.loading')) :
      React.createElement('div', { className:'space-y-2' },
        React.createElement('div', { className:'flex items-center justify-between' },
        React.createElement('h2', { className:'font-alfaslab text-lg text-white' }, tags.length + ' Tablas de Etiquetas (' + tags.length + ')'),
        React.createElement('div', { className:'relative' },
          React.createElement('button', {
            onClick:function() { setSortMenuOpen(!sortMenuOpen); },
            className:'bg-bitmap-orange text-black font-alfaslab text-xs px-3 py-1 rounded-lg whitespace-nowrap'
          }, 'Ordenar'),
          sortMenuOpen ? React.createElement('div', { className:'absolute right-0 top-full mt-1 bg-bitmap-surface border border-bitmap-border rounded-lg py-1 z-50 min-w-[180px]' },
            sortOptions.map(function(opt) {
              var isActive = sortOrder === opt.key;
              return React.createElement('button', {
                key: opt.key,
                onClick:function() { setSortOrder(opt.key); setSortMenuOpen(false); },
                className:'block w-full text-left px-4 py-2 font-acme text-xs transition-colors ' +
                  (isActive ? 'text-bitmap-orange font-bold bg-bitmap-black' : 'text-bitmap-orange-light hover:bg-bitmap-black')
              }, (isActive ? '\u2713 ' : '') + opt.label);
            })
          ) : null
        )
      ),
        React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2' },
          getSortedTags().map(function(tag, i) {
            return React.createElement(TagPreviewCard, {
              key: tag.name + '-' + i,
              tag: tag,
              onClick: function() { navigate('/tag-tables/' + encodeURIComponent(tag.name)); }
            });
          })
        )
      )
    )
  );
}

function MarketplaceSelectorPage(props) {
  var navigate = props.navigate;

  var ow = StoreMarketplaces.get('ordinalswallet');
  var un = StoreMarketplaces.get('unisat');
  var lo = StoreMarketplaces.get('local');
  var un2 = StoreMarketplaces.get('unified');
  var ta = StoreMarketplaces.get('tags');
  var sa = StoreMarketplaces.get('sales');
  var de = StoreMarketplaces.get('descuentos');

  React.useEffect(function() {
    StoreMarketplaces.fetchOrdinalswallet();
    StoreMarketplaces.fetchUnisat();
    StoreMarketplaces.fetchLocal();
    StoreMarketplaces.fetchUnified();
    StoreMarketplaces.fetchTags();
    StoreMarketplaces.fetchSales();
    StoreMarketplaces.fetchDescuentos();
  }, []);

  var marketplaces = [
    { id:'ordinalswallet', label:'Ordinalswallet', icon:'\uD83D\uDFE7', path:'/ordinalswallet' },
    { id:'unisat', label:'Unisat', icon:'\uD83D\uDFE1', path:'/unisat' },
    { id:'local', label:'BitmapCore', icon:'\uD83D\uDFE0', path:'/local' },
    { id:'discounts', label:'Descuentos', icon:'\uD83D\uDFE2', path:'/discounts', isDiscount:true },
    { id:'unified', label:'Unified', icon:'\uD83D\uDD35', path:'/unified' },
    { id:'tags', label:'Etiquetas', icon:'\uD83C\uDFF7\uFE0F', path:'/tag-tables' },
    { id:'sales', label:'Ventas', icon:'\uD83D\uDCB0', path:'/sales' }
  ];

  var getData = function(id) {
    switch (id) {
      case 'ordinalswallet': return { listings:ow.listings.length, floor:ow.floorPrice, sold:ow.soldCount };
      case 'unisat': return { listings:un.listings.length, floor:un.floorPrice, sold:un.soldCount };
      case 'local': return { listings:lo.listings.length, floor:lo.floorPrice, sold:lo.soldCount };
      case 'unified': return { listings:un2.allListings.length, floor:0, sold:0 };
      case 'tags': return { listings:ta.tags.length, floor:0, sold:0 };
      case 'sales': return { listings:sa.sales.length, floor:0, sold:sa.totalSold };
      case 'discounts': return { listings:de.discounts.length, floor:0, sold:0 };
      default: return { listings:0, floor:0, sold:0 };
    }
  };

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-3xl mx-auto space-y-3' },
      React.createElement('h2', { className:'font-alfaslab text-xl text-white mb-4' }, I18n.t('marketplace.selectMarketplace')),
      marketplaces.map(function(mp) {
        var data = getData(mp.id);
        return React.createElement(MarketplaceBubble, {
          key: mp.id,
          name: mp.label,
          icon: mp.icon,
          listings: data.listings,
          floorPrice: data.floor,
          sold: data.sold,
          isDiscount: mp.isDiscount,
          onSelect: function() { navigate(mp.path); }
        });
      })
    )
  );
}
