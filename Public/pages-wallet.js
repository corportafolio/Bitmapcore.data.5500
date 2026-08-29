function WalletConnectPage(props) {
  var navigate = props.navigate;
  var wallet = StoreApp.get('wallet');
  var _a = React.useState(false);
  var isConnecting = _a[0];
  var setIsConnecting = _a[1];

  var handleConnect = function() {
    setIsConnecting(true);
    StoreApp.connectWallet().then(function() { setIsConnecting(false); }).catch(function() { setIsConnecting(false); });
  };

  var updateWallet = function() { wallet = StoreApp.get('wallet'); };
  React.useEffect(function() {
    var unsub = StoreApp.subscribe('wallet', updateWallet);
    return unsub;
  }, []);

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-md mx-auto space-y-6' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white text-center' }, I18n.t('wallet.connect')),
        !wallet.isConnected ? React.createElement('div', { className:'space-y-4' },
          React.createElement('p', { className:'font-acme text-sm text-bitmap-text text-center' }, I18n.t('wallet.connectPrompt')),
          React.createElement('button', {
            onClick:handleConnect, disabled:isConnecting,
            className:'w-full py-3 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
          }, isConnecting ? I18n.t('app.loading') : I18n.t('wallet.connect'))
        ) : React.createElement('div', { className:'space-y-4' },
          React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4 space-y-3' },
            React.createElement('div', { className:'flex justify-between' },
              React.createElement('span', { className:'font-alfaslab text-sm text-bitmap-muted' }, I18n.t('wallet.address')),
              React.createElement('span', { className:'font-acme text-sm text-white truncate max-w-[200px]' }, wallet.address)
            ),
            React.createElement('div', { className:'flex justify-between' },
              React.createElement('span', { className:'font-alfaslab text-sm text-bitmap-muted' }, I18n.t('wallet.balance')),
              React.createElement('span', { className:'font-acme text-sm text-bitmap-orange-light' }, BitmapUtils.formatBtcSat(wallet.balance * 100000000) + ' BTC')
            )
          ),
          React.createElement('button', {
            onClick:function() { navigate('/wallet/dashboard'); },
            className:'w-full py-3 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-sm rounded-lg hover:border-bitmap-orange transition-colors'
          }, I18n.t('wallet.dashboard')),
          React.createElement('button', {
            onClick:function() { navigate('/mis-activos'); },
            className:'w-full py-3 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-sm rounded-lg hover:border-bitmap-orange transition-colors'
          }, I18n.t('wallet.myAssets')),
          React.createElement('button', {
            onClick:StoreApp.disconnectWallet,
            className:'w-full py-3 text-bitmap-red font-alfaslab text-sm rounded-lg hover:bg-bitmap-red/10 transition-colors'
          }, I18n.t('wallet.disconnect'))
        )
      )
  );
}

function WalletDashboardPage(props) {
  var navigate = props.navigate;
  var wallet = StoreApp.get('wallet');

  if (!wallet.isConnected) {
    return React.createElement('div', { className:'flex items-center justify-center h-full' },
      React.createElement('div', { className:'text-center' },
        React.createElement('p', { className:'font-acme text-bitmap-muted mb-4' }, I18n.t('wallet.notConnected')),
        React.createElement('button', {
          onClick:function() { navigate('/wallet'); },
          className:'px-4 py-2 bg-bitmap-orange text-white rounded-lg font-alfaslab text-sm'
        }, I18n.t('wallet.connect'))
      )
    );
  }

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-md mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, 'Wallet Dashboard'),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
          React.createElement('div', { className:'text-center' },
            React.createElement('div', { className:'font-acme text-3xl text-bitmap-orange-light font-bold' }, BitmapUtils.formatBtcSat((wallet.balance || 0) * 100000000)),
            React.createElement('div', { className:'font-acme text-sm text-bitmap-muted' }, 'BTC')
          )
        ),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4' },
          React.createElement('div', { className:'font-alfaslab text-sm text-bitmap-muted mb-1' }, I18n.t('wallet.address')),
          React.createElement('div', { className:'font-acme text-xs text-white break-all' }, wallet.address)
        ),
        React.createElement('button', {
          onClick:function() { navigate('/mis-activos'); },
          className:'w-full py-3 bg-bitmap-surface border border-bitmap-border text-white font-alfaslab text-sm rounded-lg hover:border-bitmap-orange transition-colors'
        }, I18n.t('wallet.myAssets'))
      )
  );
}

var AssetCache = {
  dbName: 'bitmapcore-assets-v2',
  key: function(address) { return 'assets-' + address.toLowerCase(); },
  load: function(address) {
    return IndexedDBCache.load(AssetCache.dbName, AssetCache.key(address)).then(function(v) {
      if (v && v.collections && v.lastHeight !== undefined) return v;
      return null;
    }).catch(function() { return null; });
  },
  save: function(address, data) {
    var payload = {
      collections: data.collections,
      total: data.total,
      lastHeight: data.lastHeight || 0,
      updatedAt: Date.now()
    };
    return IndexedDBCache.save(AssetCache.dbName, AssetCache.key(address), payload).catch(function() {});
  },
  merge: function(cached, fresh) {
    if (!cached) return fresh;
    var byName = {};
    (cached.collections || []).forEach(function(c) { byName[c.name] = c; });
    (fresh.collections || []).forEach(function(fc) {
      var existing = byName[fc.name];
      if (!existing) { byName[fc.name] = fc; return; }
      var seen = {};
      existing.items.forEach(function(it) { seen[it.id] = it; });
      fc.items.forEach(function(it) { if (!seen[it.id]) existing.items.push(it); });
      existing.items.sort(function(a, b) { return (a.inscriptionNumber || 0) - (b.inscriptionNumber || 0); });
      existing.count = existing.items.length;
    });
    var collections = Object.keys(byName).map(function(n) { return byName[n]; });
    var total = collections.reduce(function(s, c) { return s + c.items.length; }, 0);
    var lastHeight = cached.lastHeight || 0;
    if (fresh.lastHeight && fresh.lastHeight > lastHeight) lastHeight = fresh.lastHeight;
    return { collections: collections, total: total, lastHeight: lastHeight };
  }
};

var ParcelConfirmationCache = {
  dbName: 'bitmapcore-parcel-confs-v3',
  version: 3,
  key: function(parcelId) { return 'conf-v3-' + parcelId; },
  load: function(parcelId) {
    return IndexedDBCache.load(ParcelConfirmationCache.dbName, ParcelConfirmationCache.key(parcelId)).then(function(v) {
      if (v && v.confirmations && v.version === ParcelConfirmationCache.version && v.updatedAt && (Date.now() - v.updatedAt < 3600000)) return v.confirmations;
      return null;
    }).catch(function() { return null; });
  },
  save: function(parcelId, confirmations) {
    return IndexedDBCache.save(ParcelConfirmationCache.dbName, ParcelConfirmationCache.key(parcelId), {
      confirmations: confirmations,
      version: ParcelConfirmationCache.version,
      updatedAt: Date.now()
    }).catch(function() {});
  }
};

function MisActivosPage(props) {
  var navigate = props.navigate;
  var wallet = StoreApp.get('wallet');
  var _a = React.useState(null);
  var data = _a[0];
  var setData = _a[1];
  var _b = React.useState(false);
  var isLoading = _b[0];
  var setIsLoading = _b[1];
  var _c = React.useState(null);
  var error = _c[0];
  var setError = _c[1];
  var _d = React.useState(null);
  var walletRef = _d[0];
  var setWalletRef = _d[1];
  var _e = React.useState({});
  var parcelPreviewConfs = _e[0];
  var setParcelPreviewConfs = _e[1];
  var _f = React.useState({});
  var bitmapBlockData = _f[0];
  var setBitmapBlockData = _f[1];
  var _g = React.useState({});
  var bitmapTagPrices = _g[0];
  var setBitmapTagPrices = _g[1];
  var _h = React.useState({});
  var bitmapListingPrices = _h[0];
  var setBitmapListingPrices = _h[1];
  var _i = React.useState(null);
  var unifiedFloorPrice = _i[0];
  var setUnifiedFloorPrice = _i[1];

  React.useEffect(function() {
    var unsub = StoreApp.subscribe('wallet', function(w) { wallet = w; setWalletRef(w); });
    return unsub;
  }, []);

  var loadAssets = function() {
    var w = walletRef || wallet;
    if (!w || !w.address) { setIsLoading(false); setData(null); return; }
    var addr = w.address;
    if (!walletRef) setWalletRef(w);
    setError(null);

    AssetCache.load(addr).then(function(cached) {
      if (cached && cached.collections) {
        setData(cached);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      var since = cached && cached.lastHeight ? cached.lastHeight : null;
      return AssetApi.getUserAssets(addr, since || undefined).then(function(res) {
        if (res.success && res.data) {
          var fresh = {
            collections: res.data.collections,
            total: res.data.total,
            lastHeight: res.data.lastHeight || 0
          };
          var merged = cached ? AssetCache.merge(cached, fresh) : fresh;
          AssetCache.save(addr, merged);
          setData(merged);
        } else if (!cached) {
          setError(res.error ? res.error.message : 'Error desconocido');
        }
        setIsLoading(false);
      }).catch(function(e) {
        if (!cached) setError(e.message || 'Error de red');
        setIsLoading(false);
      });
    });
  };

  React.useEffect(function() {
    loadAssets();
    var pollTimer = setInterval(loadAssets, 60000);
    return function() { clearInterval(pollTimer); };
  }, [walletRef]);

  React.useEffect(function() {
    if (!data || !data.collections || !walletRef || !walletRef.address) return;
    var parcelCol = null;
    for (var i = 0; i < data.collections.length; i++) {
      if (data.collections[i].name === 'Parcelas') { parcelCol = data.collections[i]; break; }
    }
    if (!parcelCol || !parcelCol.items || parcelCol.items.length === 0) return;
    var items = parcelCol.items;
    var allIds = [];
    items.forEach(function(item) {
      if (item.id) allIds.push(item.id);
    });
    if (allIds.length === 0) return;
    var tryFetch = function(attempt) {
      AssetApi.getBulkParcelConfirmations(allIds, walletRef.address).then(function(res) {
        if (res && res.success && res.data) {
          setParcelPreviewConfs(function(prev) {
            var updated = {};
            for (var k in prev) updated[k] = prev[k];
            for (var pid in res.data) {
              var confs = res.data[pid];
              if (confs && confs.confirmations) {
                updated[pid] = confs.confirmations;
                ParcelConfirmationCache.save(pid, confs.confirmations);
              }
            }
            return updated;
          });
        }
      }).catch(function() {
        if (attempt < 2) setTimeout(function() { tryFetch(attempt + 1); }, 2000);
      });
    };
    tryFetch(0);
  }, [data, walletRef]);

  React.useEffect(function() {
    if (!data || !data.collections) return;
    var bitmapsCol = null;
    for (var i = 0; i < data.collections.length; i++) {
      if (data.collections[i].name === 'Bitmaps') { bitmapsCol = data.collections[i]; break; }
    }
    if (!bitmapsCol || !bitmapsCol.items || bitmapsCol.items.length === 0) return;
    var blockNums = [];
    for (var j = 0; j < bitmapsCol.items.length; j++) {
      var num = extractBlockNumber(bitmapsCol.items[j].name);
      if (num && blockNums.indexOf(num) === -1) blockNums.push(num);
    }
    var fetches = blockNums.map(function(num) {
      return fetch('/api/v1/blocks/' + num)
        .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function(res) {
          if (res && res.success && res.data) return { key:num, data:res.data };
          return null;
        }).catch(function() { return null; });
    });
    Promise.all(fetches).then(function(results) {
      var map = {};
      for (var k = 0; k < results.length; k++) {
        if (results[k]) map[results[k].key] = results[k].data;
      }
      setBitmapBlockData(map);
    });
    var parcelCol = null;
    for (var pci = 0; pci < data.collections.length; pci++) {
      if (data.collections[pci].name === 'Parcelas') { parcelCol = data.collections[pci]; break; }
    }
    if (parcelCol && parcelCol.items) {
      var parcelBlocks = [];
      for (var pj = 0; pj < parcelCol.items.length; pj++) {
        var pnum = extractBlockNumber(parcelCol.items[pj].name);
        if (pnum && parcelBlocks.indexOf(pnum) === -1) parcelBlocks.push(pnum);
      }
      var parcelFetches = parcelBlocks.map(function(num) {
        return fetch('/api/v1/blocks/' + num)
          .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
          .then(function(res) {
            if (res && res.success && res.data) return { key:num, data:res.data };
            return null;
          }).catch(function() { return null; });
      });
      Promise.all(parcelFetches).then(function(results) {
        var map = {};
        for (var pk = 0; pk < results.length; pk++) {
          if (results[pk]) map[results[pk].key] = results[pk].data;
        }
        setBitmapBlockData(function(prev) {
          var updated = {};
          for (var kk in prev) updated[kk] = prev[kk];
          for (var kk2 in map) updated[kk2] = map[kk2];
          return updated;
        });
      });
    }
    var normalizeTagKey = function(t) {
      return String(t || '').toLowerCase().replace(/(\d+) txs?$/i, '$1 txs').trim();
    };
    fetch('/api/v1/unified/cache/tags').then(function(r) { return r.json(); }).then(function(res) {
      if (res && res.success && res.data) {
        var prices = {};
        res.data.forEach(function(t) {
          if (t && t.tagName) prices[normalizeTagKey(t.tagName)] = t.floorPrice || 0;
        });
        setBitmapTagPrices(prices);
      }
    }).catch(function() {});
    var ids = blockNums.join(',');
    if (ids) {
      fetch('/api/v1/unified/cache/prices?bitmaps=' + ids).then(function(r) { return r.json(); }).then(function(res) {
        if (res && res.success && res.data) {
          var lprices = {};
          for (var n in res.data) {
            var p = parseInt(res.data[n]) || 0;
            if (p > 0) lprices[parseInt(n)] = p;
          }
          setBitmapListingPrices(lprices);
        }
      }).catch(function() {});
    }
    fetch('/api/v1/unified/cache/stats').then(function(r) { return r.json(); }).then(function(res) {
      if (res && res.success && res.data && res.data.floorPrice) {
        setUnifiedFloorPrice(parseInt(res.data.floorPrice) || null);
      }
    }).catch(function() {});
  }, [data]);

  var total = data ? data.total : 0;
  var collections = data ? data.collections : [];

  var extractBlockNumber = function(name) {
    if (!name) return null;
    var m = name.match(/^(\d+)\.bitmap$/);
    if (m) return parseInt(m[1], 10);
    var m2 = name.match(/^\d+\.(\d+)\.bitmap$/);
    if (m2) return parseInt(m2[1], 10);
    return null;
  };

  var bitmapNormalizeTag = function(t) {
    return String(t || '').toLowerCase().replace(/(\d+) txs?$/i, '$1 txs').trim();
  };

  var bitmapBlockTags = function(blockNum) {
    var bd = bitmapBlockData[blockNum] || {};
    var etiquetas = bd.etiquetas || '';
    return etiquetas.split('|').map(function(t) { return t.trim(); }).filter(function(t) { return t !== ''; });
  };

  var bitmapMainTagPrice = function(blockNum) {
    var tags = bitmapBlockTags(blockNum);
    if (tags.length === 0) {
      if (unifiedFloorPrice !== null && unifiedFloorPrice !== undefined) return unifiedFloorPrice;
      var lp = bitmapListingPrices[blockNum];
      return lp !== undefined ? lp : null;
    }
    var best = null;
    for (var i = 0; i < tags.length; i++) {
      var p = bitmapTagPrices[bitmapNormalizeTag(tags[i])];
      if (p !== undefined) {
        if (best === null || p > best) best = p;
      }
    }
    return best;
  };

  var bitmapMainTagName = function(blockNum) {
    var tags = bitmapBlockTags(blockNum);
    if (tags.length === 0) return null;
    var bestTag = null;
    var bestPrice = null;
    for (var i = 0; i < tags.length; i++) {
      var p = bitmapTagPrices[bitmapNormalizeTag(tags[i])];
      if (p !== undefined) {
        if (bestPrice === null || p > bestPrice) { bestPrice = p; bestTag = tags[i]; }
      }
    }
    if (bestTag) return bestTag;
    return tags[0];
  };

  var bitmapNumFontSize = function(name) {
    if (!name) return 11;
    var len = name.length;
    var size = 11;
    if (len > 10) size = 10;
    if (len > 11) size = 9;
    if (len > 12) size = 8;
    if (len > 14) size = 7;
    return size;
  };

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-4xl mx-auto space-y-4' },
      React.createElement('div', { className:'flex items-center justify-between' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, 'Mis Activos (' + total + ')'),
        React.createElement('div', { className:'flex items-center gap-3' },
          wallet.isConnected ? React.createElement('button', {
            onClick:loadAssets,
            className:'text-bitmap-orange hover:text-bitmap-orange-light transition-colors font-acme text-xl',
            title:'Refresh'
          }, '\u21BB') : null,
          wallet.isConnected ? React.createElement('span', { className:'font-acme text-sm text-bitmap-muted' }, wallet.address ? wallet.address.slice(-4) : '') : null
        )
      ),
      !wallet.isConnected ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-muted mb-4' }, 'No hay wallet conectada'),
        React.createElement('button', {
          onClick:function() { if (window.bcAnalytics) window.bcAnalytics.track('wallet_connect_clicked', { walletType: 'unisat', source: 'assets_page' }); StoreApp.connectWallet('unisat'); },
          className:'px-4 py-2 bg-bitmap-orange text-white rounded-lg font-alfaslab text-sm'
        }, 'Conectar Wallet')
      ) :
      isLoading ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('div', { className:'inline-block w-8 h-8 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin' }),
        React.createElement('p', { className:'font-acme text-bitmap-muted mt-4' }, I18n.t('app.loading'))
      ) :
      error ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-red mb-4' }, error),
        React.createElement('button', {
          onClick:loadAssets,
          className:'px-4 py-2 bg-bitmap-surface border border-bitmap-border text-white rounded-lg font-alfaslab text-sm'
        }, I18n.t('app.retry'))
      ) :
      collections.length === 0 ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-muted mb-4' }, 'No se encontraron activos'),
        React.createElement('button', {
          onClick:loadAssets,
          className:'px-4 py-2 bg-bitmap-surface border border-bitmap-border text-white rounded-lg font-alfaslab text-sm'
        }, 'Buscar activos')
      ) :
      React.createElement('div', { className:'space-y-3' },
        collections.map(function(col) {
          var isSpecial = col.name === 'Bitmaps' || col.name === 'Parcelas' || col.name === 'Bittick Agents';
          return React.createElement('div', {
            key:col.name,
            onClick:function() { navigate('/mis-activos/detalle/' + encodeURIComponent(col.name)); },
            className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4 cursor-pointer hover:border-bitmap-orange transition-colors'
          },
            React.createElement('div', { className:'flex items-center justify-between mb-3' },
              React.createElement('span', {
                className:'font-alfaslab text-base',
                style:{ color: isSpecial ? '#FE3E00' : '#fff' }
              }, col.name + ' (' + col.count + ')'),
              col.name === 'Bitmaps'
                ? (function() {
                    var totalSats = 0;
                    col.items.forEach(function(it) {
                      var bn = extractBlockNumber(it.name);
                      var p = bn !== null ? bitmapMainTagPrice(bn) : null;
                      if (p !== null) totalSats += p;
                    });
                    return React.createElement('span', { className:'font-acme text-xs text-bitmap-muted', title:'Total value' },
                      'Total value: ' + BitmapUtils.formatBtcSat(totalSats) + ' BTC'
                    );
                  })()
                : React.createElement('span', { className:'font-acme text-xs text-bitmap-muted' }, 'Ver todos \u2192')
            ),
            React.createElement('div', { className:'flex items-start gap-3 overflow-x-auto pb-1 parcel-scrollbar' },
              col.items.slice().sort(function(a, b) {
                if (col.name === 'Parcelas') {
                  var ca = parcelPreviewConfs[a.id];
                  var cb = parcelPreviewConfs[b.id];
                  var aOk = ca && ca[0] && ca[0].confirmed && ca[1] && ca[1].confirmed ? 1 : 0;
                  var bOk = cb && cb[0] && cb[0].confirmed && cb[1] && cb[1].confirmed ? 1 : 0;
                  return bOk - aOk;
                }
                if (col.name === 'Bitmaps') {
                  var bna = extractBlockNumber(a.name);
                  var bnb = extractBlockNumber(b.name);
                  var taga = bitmapMainTagPrice(bna);
                  var tagb = bitmapMainTagPrice(bnb);
                  if (taga === null && tagb === null) return 0;
                  if (taga === null) return 1;
                  if (tagb === null) return -1;
                  return tagb - taga;
                }
                return 0;
              }).map(function(item, idx) {
                var blockNum = extractBlockNumber(item.name);
                var displayNum = item.inscriptionNumber || item.inscription_number;
                var isParcel = col.name === 'Parcelas';
                var isBitmap = col.name === 'Bitmaps';
                var confs = isParcel ? (parcelPreviewConfs[item.id] || null) : null;
                var pc1 = confs ? confs[0] : null;
                var pc2 = confs ? confs[1] : null;
                var bubbleSize = isParcel ? 'w-20 h-20' : 'w-20 h-20';
                var iconSize = isParcel ? 80 : 80;
                var inscriptionId = item.id ? item.id.slice(0, 12) + '...' : '';
                var last4 = function(addr) { return addr ? addr.slice(-4) : '----'; };
                var walletMatch = isParcel && pc1 && pc2 && pc1.inscriberWallet && pc2.selfTransferFrom && pc2.selfTransferTo
                  ? (last4(pc1.inscriberWallet) === last4(pc2.selfTransferFrom.split(',')[0].trim()) &&
                     last4(pc1.inscriberWallet) === last4(pc2.selfTransferTo.split(',')[0].trim()))
                  : false;
                var bd = isBitmap ? (bitmapBlockData[blockNum] || {}) : {};
                var bTags = isBitmap ? bitmapBlockTags(blockNum) : [];
                var bMainTag = isBitmap ? bitmapMainTagName(blockNum) : null;
                var bMainPrice = isBitmap ? bitmapMainTagPrice(blockNum) : null;
                var bImgUrl = '';
                if (isBitmap && blockNum) {
                  var btx = parseInt(bd.totalTransacciones) || 0;
                  var bhash = bd.hash || '';
                  var betiq = bd.etiquetas || '';
                  var bPerfect = betiq.toLowerCase().indexOf('grid') !== -1;
                  var bPunk = betiq.toLowerCase().indexOf('punk') !== -1;
                  bImgUrl = '/api/v1/block-image/' + blockNum + '?v=5&size=80&etiquetas=' + encodeURIComponent(betiq) + '&tx=' + btx + '&hash=' + encodeURIComponent(bhash) + '&grid=' + bPerfect + '&punk=' + bPunk;
                }
                var confLines = isParcel && pc1 ? React.createElement('div', { className:'w-full text-center text-[8px] leading-tight' },
                  React.createElement('div', { className:'flex items-center justify-center gap-1 text-green-400' },
                    React.createElement('svg', { width:10, height:10, viewBox:'0 0 24 24', fill:'none', stroke:'#00AA00', strokeWidth:3 },
                      React.createElement('path', { d:'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
                      React.createElement('polyline', { points:'22 4 12 14.01 9 11.01' })
                    ),
                    React.createElement('span', { className:'font-mono text-white' }, 'wallet inscribe: '),
                    React.createElement('span', { className:'font-mono' }, last4(pc1.inscriberWallet))
                  ),
                  React.createElement('div', { className:'font-mono text-gray-300' }, 'bloque: ' + (pc1.genesisHeight || '---')),
                  pc1.txid ? React.createElement('a', {
                    className:'font-mono text-blue-400 underline cursor-pointer',
                    style:{ color:'#3b82f6' },
                    title: pc1.txid,
                    onClick: function(e) { e.stopPropagation(); window.open('https://unisat.io/explorer/tx/' + pc1.txid, '_blank'); }
                  }, pc1.txid.slice(0, 16) + '...') : null
                ) : null;
                var conf2Lines = isParcel && pc2 && pc2.confirmed ? React.createElement('div', { className:'w-full text-center text-[8px] leading-tight mt-0.5' },
                  React.createElement('div', { className:'flex items-center justify-center gap-1 text-green-400' },
                    React.createElement('svg', { width:10, height:10, viewBox:'0 0 24 24', fill:'none', stroke:'#00AA00', strokeWidth:3 },
                      React.createElement('path', { d:'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
                      React.createElement('polyline', { points:'22 4 12 14.01 9 11.01' })
                    ),
                    React.createElement('span', { className:'font-mono text-white' }, 'de '),
                    React.createElement('span', { className:'font-mono' }, last4(pc2.selfTransferFrom ? pc2.selfTransferFrom.split(',')[0].trim() : null)),
                    React.createElement('span', { className:'font-mono text-white' }, ' a '),
                    React.createElement('span', { className:'font-mono' }, last4(pc2.selfTransferTo ? pc2.selfTransferTo.split(',')[0].trim() : null))
                  ),
                  React.createElement('div', { className:'font-mono text-gray-300' }, 'bloque: ' + (pc2.selfTransferHeight !== undefined ? pc2.selfTransferHeight : '---')),
                  pc2.txid ? React.createElement('a', {
                    className:'font-mono text-blue-400 underline cursor-pointer',
                    style:{ color:'#3b82f6' },
                    title: pc2.txid,
                    onClick: function(e) { e.stopPropagation(); window.open('https://unisat.io/explorer/tx/' + pc2.txid, '_blank'); }
                  }, pc2.txid.slice(0, 16) + '...') : null
                ) : (isParcel && pc2 ? React.createElement('div', { className:'w-full text-center text-[8px] leading-tight mt-0.5 text-gray-500' },
                  React.createElement('div', { className:'flex items-center justify-center gap-1' },
                    React.createElement('svg', { width:10, height:10, viewBox:'0 0 24 24', fill:'none', stroke:'#666', strokeWidth:3 },
                      React.createElement('path', { d:'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
                      React.createElement('polyline', { points:'22 4 12 14.01 9 11.01' })
                    ),
                    React.createElement('span', { className:'font-mono' }, 'de --- a ---')
                  ),
                  React.createElement('div', { className:'font-mono' }, 'bloque: ---')
                ) : null);
                return React.createElement('div', { key:idx, className:'flex-shrink-0 flex flex-col items-center min-w-0 ' + (isBitmap ? 'gap-[2px]' : 'gap-1') },
                  confLines,
                  conf2Lines,
                  isBitmap ? React.createElement('div', { className:'w-full text-center whitespace-nowrap overflow-hidden', style:{ maxWidth:'80px' } },
                    React.createElement('span', { className:'font-mono text-white leading-[1.1]', title: item.name, style:{ fontSize: bitmapNumFontSize(item.name || ('#' + displayNum)) } },
                      item.name ? item.name : '#' + displayNum
                    )
                  ) : null,
                  isBitmap && bMainTag ? React.createElement('div', { className:'w-full flex justify-center overflow-hidden', style:{ maxWidth:'80px' } },
                    React.createElement(UniversalTag, { text: bMainTag, fontSize: 8 })
                  ) : null,
                  isBitmap ? React.createElement('div', { className:'w-full text-center whitespace-nowrap overflow-hidden', style:{ maxWidth:'80px' } },
                    React.createElement('span', { className:'font-acme text-[10px] text-bitmap-muted leading-[1.1]' },
                      bMainPrice !== null ? BitmapUtils.formatBtcSat(bMainPrice) + ' BTC' : 'N/A'
                    )
                  ) : null,
                  React.createElement('div', { className:bubbleSize + ' rounded overflow-hidden bg-bitmap-black flex-shrink-0' },
                    isParcel
                      ? React.createElement('img', { src:'/api/v1/parcel-image?v=2', alt:'', className:'w-full h-full object-cover' })
                      : (isBitmap && blockNum ? React.createElement('img', {
                          src: bImgUrl,
                          alt:'',
                          className:'w-full h-full object-cover',
                          onError: function(e) { e.target.src = '/api/v1/block-image/' + blockNum + '?v=5&size=80'; }
                        }) : (blockNum ? React.createElement(MondrianCanvas, { blockNumber:blockNum, transactions:[], size:iconSize }) : null))
                  ),
                  isParcel ? (function() {
                    var pbn = extractBlockNumber(item.name);
                    var pbd = pbn !== null ? (bitmapBlockData[pbn] || {}) : {};
                    var pt = pbn !== null ? getParcelTag(item.name, pbd.etiquetas || '') : null;
                    return pt ? React.createElement('div', { className:'mt-0.5 flex justify-center' },
                      React.createElement(UniversalTag, { text: pt.label, fontSize: 7 })
                    ) : null;
                  })() : null,
                  isParcel ? React.createElement('div', { className:'font-acme text-xs text-white truncate text-center w-full', style:{ maxWidth: '80px' } },
                    item.name ? item.name : '#' + displayNum
                  ) : null,
                  isParcel && inscriptionId ? React.createElement('div', {
                    className:'font-mono text-[9px] text-gray-400 truncate text-center w-full cursor-pointer select-all',
                    style:{ maxWidth: '80px', userSelect: 'all' },
                    title: item.id,
                    onClick: function(e) {
                      e.stopPropagation();
                      navigator.clipboard.writeText(item.id);
                    }
                  }, inscriptionId) : null
                );
              })
            )
          );
        })
      )
    )
  );
}

function DetallePage(props) {
  var navigate = props.navigate;
  var currentPath = props.currentPath || '';
  var collectionName = props.collectionName || '';
  if (!collectionName) {
    var parts = currentPath.split('/');
    var lastPart = parts[parts.length - 1];
    if (lastPart) collectionName = decodeURIComponent(lastPart);
  }
  var wallet = StoreApp.get('wallet');
  var _a = React.useState(null);
  var data = _a[0];
  var setData = _a[1];
  var _b = React.useState(false);
  var isLoading = _b[0];
  var setIsLoading = _b[1];
  var _c = React.useState(null);
  var error = _c[0];
  var setError = _c[1];
  var _c2 = React.useState(null);
  var walletRef = _c2[0];
  var setWalletRef = _c2[1];

  React.useEffect(function() {
    var unsub = StoreApp.subscribe('wallet', function(w) { wallet = w; setWalletRef(w); });
    return unsub;
  }, []);

  React.useEffect(function() {
    if (!wallet.address) return;
    var addr = wallet.address;
    setIsLoading(true);
    AssetCache.load(addr).then(function(cached) {
      if (cached && cached.collections) {
        setData(cached);
        setIsLoading(false);
      }
      var since = cached && cached.lastHeight ? cached.lastHeight : null;
      return AssetApi.getUserAssets(addr, since || undefined).then(function(res) {
        if (res.success && res.data) {
          var fresh = {
            collections: res.data.collections,
            total: res.data.total,
            lastHeight: res.data.lastHeight || 0
          };
          var merged = cached ? AssetCache.merge(cached, fresh) : fresh;
          AssetCache.save(addr, merged);
          setData(merged);
        } else if (!cached) {
          setError(res.error ? res.error.message : 'Error');
        }
        setIsLoading(false);
      }).catch(function(e) {
        if (!cached) setError(e.message);
        setIsLoading(false);
      });
    });
  }, [walletRef]);

  var col = null;
  if (data && data.collections) {
    for (var i = 0; i < data.collections.length; i++) {
      if (data.collections[i].name === collectionName) {
        col = data.collections[i];
        break;
      }
    }
  }

  var isBitmapCollection = collectionName === 'Bitmaps';
  var _d = React.useState([]);
  var selectionState = _d[0];
  var setSelectionState = _d[1];
  var _e = React.useState(false);
  var showListModal = _e[0];
  var setShowListModal = _e[1];
  var _f = React.useState({});
  var listingStatus = _f[0];
  var setListingStatus = _f[1];
  var _g = React.useState({});
  var blockDataMap = _g[0];
  var setBlockDataMap = _g[1];
  var _h = React.useState({});
  var myListings = _h[0];
  var setMyListings = _h[1];
  var _i = React.useState(null);
  var editingListing = _i[0];
  var setEditingListing = _i[1];
  var _j = React.useState('');
  var editPriceStr = _j[0];
  var setEditPriceStr = _j[1];
  var _k = React.useState(null);
  var confirmAction = _k[0];
  var setConfirmAction = _k[1];
  var _l = React.useState(null);
  var editMenuFor = _l[0];
  var setEditMenuFor = _l[1];
  var _m = React.useState({});
  var parcelConfirmations = _m[0];
  var setParcelConfirmations = _m[1];

  React.useEffect(function() {
    if (col && col.items) {
      var sel = col.items.filter(function(it) { return it.isBitmap && !it.isParcel; }).map(function(it) {
        return { id:it.id, isSelected:false, priceStr:'', priceSatoshis:0, name:it.name, inscriptionNumber:it.inscriptionNumber };
      });
      setSelectionState(sel);
    }
  }, [col]);

  var loadMyListings = function() {
    if (!wallet.address) return;
    MarketplaceApi.getOwnerListings(wallet.address).then(function(listings) {
      var map = {};
      for (var i = 0; i < listings.length; i++) {
        map[listings[i].inscriptionId] = listings[i];
      }
      setMyListings(map);
    }).catch(function() {});
  };

  React.useEffect(function() { loadMyListings(); }, [walletRef]);

  React.useEffect(function() {
    if (!col || collectionName !== 'Parcelas' || !col.items || !walletRef || !walletRef.address) return;
    var items = col.items;
    var allIds = [];
    items.forEach(function(item) {
      if (item.id) allIds.push(item.id);
    });
    if (allIds.length === 0) return;
    var tryFetch = function(attempt) {
      AssetApi.getBulkParcelConfirmations(allIds, walletRef.address).then(function(res) {
        if (res && res.success && res.data) {
          setParcelConfirmations(function(prev) {
            var updated = {};
            for (var k in prev) updated[k] = prev[k];
            for (var pid in res.data) {
              var confs = res.data[pid];
              if (confs && confs.confirmations) {
                updated[pid] = confs.confirmations;
                ParcelConfirmationCache.save(pid, confs.confirmations);
              }
            }
            return updated;
          });
        }
      }).catch(function() {
        if (attempt < 2) setTimeout(function() { tryFetch(attempt + 1); }, 2000);
      });
    };
    tryFetch(0);
  }, [col, walletRef]);

  React.useEffect(function() {
    if (!col || !col.items || col.items.length === 0) return;
    var blockNums = [];
    for (var i = 0; i < col.items.length; i++) {
      var num = extractBlockNumber(col.items[i].name);
      if (num && blockNums.indexOf(num) === -1) blockNums.push(num);
    }
    var fetches = blockNums.map(function(num) {
      return fetch('/api/v1/blocks/' + num)
        .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function(res) {
          if (res.success && res.data) return { key:num, data:res.data };
          return null;
        }).catch(function() { return null; });
    });
    Promise.all(fetches).then(function(results) {
      var map = {};
      for (var j = 0; j < results.length; j++) {
        if (results[j]) map[results[j].key] = results[j].data;
      }
      setBlockDataMap(map);
    });
  }, [col]);

  var extractBlockNumber = function(name) {
    if (!name) return null;
    var m = name.match(/^(\d+)\.bitmap$/);
    if (m) return parseInt(m[1], 10);
    var m2 = name.match(/^\d+\.(\d+)\.bitmap$/);
    if (m2) return parseInt(m2[1], 10);
    return null;
  };

  var toggleSelection = function(idx) {
    var updated = selectionState.slice();
    updated[idx].isSelected = !updated[idx].isSelected;
    setSelectionState(updated);
  };

  var updatePrice = function(idx, val) {
    var clean = val.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
    var updated = selectionState.slice();
    updated[idx].priceStr = clean;
    updated[idx].priceSatoshis = clean ? Math.round(parseFloat(clean) * 100000000) : 0;
    setSelectionState(updated);
  };

  var handleListar = function() {
    var selected = selectionState.filter(function(it) { return it.isSelected && it.priceSatoshis > 0; });
    if (selected.length === 0) {
      setListingStatus({ toast:'Selecciona al menos un bitmap y ponle precio' });
      return;
    }
    setShowListModal(true);
  };

  var confirmListar = async function() {
    var selected = selectionState.filter(function(it) { return it.isSelected && it.priceSatoshis > 0; });
    if (selected.length === 0) return;

    setShowListModal(false);
    setListingStatus({ listing:true, count:selected.length });

    var signedPsbtHexs = null;
    var listingActivated = false;

    try {
      setListingStatus({ listing:true, count:selected.length, toast:'Preparando listings...' });
      var pubKey = wallet.publicKey;
      if (!pubKey) {
        setListingStatus({ listing:true, count:selected.length, toast:'Obteniendo clave publica...' });
        try {
          pubKey = await StoreApp.getPublicKeyFresh();
        } catch(pke) {
          setListingStatus({ toast:'Error: no se pudo obtener la clave publica de la wallet' });
          return;
        }
      }
      if (!pubKey) {
        setListingStatus({ toast:'Error: reconecta la wallet para obtener la clave publica' });
        return;
      }

      var batchItems = [];
      for (var j = 0; j < selected.length; j++) {
        var item = selected[j];
        var origItem = null;
        for (var k = 0; k < col.items.length; k++) {
          if (col.items[k].id === item.id) { origItem = col.items[k]; break; }
        }
        if (!origItem || !origItem.output || !origItem.value) {
          setListingStatus({ toast: item.name + ': sin datos UTXO, saltado' });
          continue;
        }
        var isPriceUpdate = !!(item.isListed && item.existingPrice > 0 && item.priceSatoshis !== item.existingPrice);
        batchItems.push({
          inscriptionId: item.id,
          price: item.priceSatoshis,
          sellerAddress: wallet.address,
          sellerOrdinalPublicKey: pubKey,
          sellerPaymentAddress: wallet.paymentAddress || wallet.address,
          name: item.name || ('Bitmap #' + item.inscriptionNumber),
          imageUrl: '',
          bitmapNumber: extractBlockNumber(item.name),
          inscriptionNumber: item.inscriptionNumber,
          inscriptionUtxo: origItem.output,
          inscriptionValue: origItem.value,
          inscriptionContentType: origItem.contentType || '',
          inscriptionHeight: origItem.height || 0,
          isPriceUpdate: isPriceUpdate
        });
      }
      if (batchItems.length === 0) {
        setListingStatus({ toast:'Ningun bitmap tiene datos UTXO validos' });
        return;
      }

      setListingStatus({ listing:true, count:selected.length, toast:'Creando listings...' });
      var createRes = await MarketplaceApi.batchList(batchItems);
      var createJson = await createRes;

      if (createJson.success && createJson.data) {
        var psbtToSigns = createJson.data.psbtToSigns || [];
        var psbtHexArray = psbtToSigns.map(function(p) { return p.unsignedPsbtHex; });
        var combinedPsbtB64 = createJson.data.psbtToSign || null;

        if (wallet.walletType === 'xverse' && StoreApp._getXverseProvider()) {
          try {
            setListingStatus({ listing:true, count:selected.length, toast:'Firmando en Xverse...' });
            signedPsbtHexs = [];
            for (var xi = 0; xi < psbtToSigns.length; xi++) {
              setListingStatus({ listing:true, count:selected.length, toast:'Firmando listing ' + (xi + 1) + ' de ' + psbtToSigns.length + ' en Xverse...' });
              var singleSigned = await StoreApp._xverseSignPsbt(psbtToSigns[xi].unsignedPsbtHex, wallet.address, [0]);
              signedPsbtHexs.push(singleSigned);
            }
          } catch(xe) {
            setListingStatus({ toast:'Xverse: firma cancelada o fallida' });
          }
        } else if (window.unisat && window.unisat.signPsbt) {
          try {
            setListingStatus({ listing:true, count:selected.length, toast:'Firmando en Unisat...' });
            signedPsbtHexs = [];
            for (var ui = 0; ui < psbtHexArray.length; ui++) {
              var singleSigned = await window.unisat.signPsbt(psbtHexArray[ui], {
                autoFinalized: false,
                toSignInputs: [{ index: 0, address: wallet.address, sighashTypes: [0x83], useTweakedSigner: true }]
              });
              signedPsbtHexs.push(singleSigned);
            }
          } catch(ue) {
            setListingStatus({ toast:'Unisat: firma cancelada o fallida' });
          }
        } else {
          setListingStatus({ toast:'Wallet no disponible para firmar' });
        }

        if (signedPsbtHexs && signedPsbtHexs.length > 0) {
          var listingIds = createJson.data.listingIds || [];
          if (listingIds.length > 0) {
            setListingStatus({ listing:true, count:selected.length, toast:'Activando listings...' });
            await MarketplaceApi.batchSign(listingIds, signedPsbtHexs, pubKey);
            listingActivated = true;
          }
        } else {
          setListingStatus({ toast:'Firma cancelada. Los listings permanecen inactivos.' });
        }
      } else {
        setListingStatus({ toast:'Error al crear listings' });
      }
    } catch(e) {
      setListingStatus({ toast:'Error: ' + e.message });
    } finally {
      if (listingActivated) {
        setListingStatus({ toast: selected.length + ' bitmaps listados correctamente' });
        loadMyListings();
        fetch('/api/v1/internal/refresh-local', { method: 'POST' }).then(function() {
          if (typeof UnifiedViewModel !== 'undefined') {
            UnifiedViewModel.loadFromCacheOnly();
          }
        }).catch(function() {});
      }
    }
  };

  var handleEditPrice = function(listing) {
    setEditingListing(listing);
    setEditPriceStr(BitmapUtils.formatBtcSat(listing.price));
    setEditMenuFor(null);
  };

  var handleSavePrice = async function() {
    if (!editingListing) return;
    var btcPrice = parseFloat(editPriceStr);
    if (isNaN(btcPrice) || btcPrice <= 0) {
      setListingStatus({ toast:'Precio inválido' });
      setEditingListing(null);
      return;
    }
    var sats = Math.round(btcPrice * 100000000);
    try {
      setListingStatus({ listing:true, count:1, toast:'Generando PSBT...' });
      
      // Buscar el asset item para obtener datos UTXO
      var assetItem = null;
      if (col && col.items) {
        for (var i = 0; i < col.items.length; i++) {
          if (col.items[i].id === editingListing.inscriptionId) {
            assetItem = col.items[i];
            break;
          }
        }
      }
      
      if (!assetItem || !assetItem.output || !assetItem.value) {
        setListingStatus({ toast:'No se encontraron datos UTXO para este bitmap' });
        setEditingListing(null);
        return;
      }

      var pubKey;
      try {
        pubKey = await StoreApp.getPublicKeyFresh();
      } catch(pke) {
        setListingStatus({ toast:'Error: no se pudo obtener la clave publica de la wallet' });
        setEditingListing(null);
        return;
      }
      if (!pubKey) {
        setListingStatus({ toast:'Error: reconecta la wallet para obtener la clave publica' });
        setEditingListing(null);
        return;
      }

      // 1. Obtener PSBT sin firmar para el nuevo precio
      var psbtRes = await MarketplaceApi.updateListingPrice(
        editingListing.id, 
        sats, 
        wallet.address, 
        assetItem.output, 
        assetItem.value
      );

      if (!psbtRes.success || !psbtRes.data || !psbtRes.data.unsignedPsbt) {
        throw new Error('Error generando PSBT: ' + (psbtRes.error?.message || 'desconocido'));
      }

      var unsignedPsbt = psbtRes.data.unsignedPsbt;
      var signedPsbt = null;

      if (wallet.walletType === 'xverse' && StoreApp._getXverseProvider()) {
        try {
          setListingStatus({ listing:true, count:1, toast:'Firmando en Xverse...' });
          signedPsbt = await StoreApp._xverseSignPsbt(unsignedPsbt, wallet.address);
        } catch(xe) {
          throw new Error('Xverse: ' + (xe.message || 'Firma cancelada'));
        }
      } else if (window.unisat && window.unisat.signPsbt) {
        try {
          setListingStatus({ listing:true, count:1, toast:'Firmando en Unisat...' });
          var signPromise = window.unisat.signPsbt(unsignedPsbt, { autoFinalized: false, toSignInputs: [{ index: 0, address: wallet.address, sighashTypes: [0x83], useTweakedSigner: true }] });
          var signTimeout = new Promise(function(_, reject) {
            setTimeout(function() { reject(new Error('timeout')); }, 30000);
          });
          signedPsbt = await Promise.race([signPromise, signTimeout]);
        } catch(ue) {
          throw new Error('Unisat: ' + (ue.message || 'Firma cancelada'));
        }
      } else {
        throw new Error('Wallet no disponible para firmar');
      }

      if (!signedPsbt) throw new Error('Firma cancelada o vacía');

          // 3. Enviar PSBT firmado
          var signRes = await MarketplaceApi.signPriceUpdate(
            editingListing.id, 
            signedPsbt, 
            pubKey, 
            sats
          );

          if (signRes.success) {
            setListingStatus({ toast:'Precio actualizado y firmado correctamente' });
          } else {
            throw new Error(signRes.error?.message || 'Error firmando');
          }

      setEditingListing(null);
      loadMyListings();
    } catch(e) {
      setListingStatus({ toast:'Error: ' + e.message });
      setEditingListing(null);
    }
  };

  var handleDelist = function(listing) {
    setConfirmAction({ type:'delist', listing:listing });
    setEditMenuFor(null);
  };

  var handleConfirmDelist = async function() {
    if (!confirmAction || confirmAction.type !== 'delist') return;
    var listing = confirmAction.listing;
    setConfirmAction(null);
    try {
      await MarketplaceApi.delistListing(listing.id, wallet.address);
      setListingStatus({ toast:'Bitmap deslistado' });
      loadMyListings();
      fetch('/api/v1/internal/refresh-local', { method: 'POST' }).then(function() {
        if (typeof UnifiedViewModel !== 'undefined') {
          UnifiedViewModel.loadFromCacheOnly();
        }
      }).catch(function() {});
    } catch(e) {
      setListingStatus({ toast:'Error: ' + e.message });
    }
  };

  React.useEffect(function() {
    if (!editMenuFor) return;
    var close = function() { setEditMenuFor(null); };
    window.addEventListener('click', close);
    return function() { window.removeEventListener('click', close); };
  }, [editMenuFor]);

  if (!wallet.address) {
    return React.createElement('div', { className:'flex items-center justify-center h-full' },
      React.createElement('p', { className:'font-acme text-bitmap-muted' }, 'No hay wallet conectada')
    );
  }

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-6xl mx-auto space-y-4' },
      React.createElement('div', { className:'flex items-center justify-between' },
        React.createElement('div', { className:'flex items-center gap-3' },
          React.createElement('button', {
            onClick:function() { navigate('/mis-activos'); },
            className:'text-bitmap-orange font-acme text-lg hover:opacity-80'
          }, '\u2190 Volver'),
          React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, collectionName)
        ),
        isBitmapCollection ? React.createElement('button', {
          onClick: function() { if (window.bcAnalytics) window.bcAnalytics.track('list_button_clicked', { source: 'wallet_collection' }); handleListar(); },
          className:'px-4 py-2 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors'
        }, 'Listar') : null
      ),

      listingStatus.toast ? React.createElement('div', {
        className:'bg-bitmap-green/20 border border-bitmap-green text-bitmap-green font-acme text-sm px-4 py-2 rounded-lg'
      }, listingStatus.toast) : null,

      listingStatus.listing ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('div', { className:'inline-block w-8 h-8 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin' }),
        React.createElement('p', { className:'font-acme text-bitmap-muted mt-4' }, 'Listando ' + listingStatus.count + ' bitmaps...')
      ) :

      isLoading ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('div', { className:'inline-block w-8 h-8 border-2 border-bitmap-orange border-t-transparent rounded-full animate-spin' }),
        React.createElement('p', { className:'font-acme text-bitmap-muted mt-4' }, I18n.t('app.loading'))
      ) :

      error ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-red' }, error)
      ) :

      !col ? React.createElement('div', { className:'text-center py-12' },
        React.createElement('p', { className:'font-acme text-bitmap-muted' }, 'Coleccion no encontrada')
      ) :

      isBitmapCollection ? React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-4 gap-3' },
        selectionState.map(function(item, idx) {
          var blockNum = extractBlockNumber(item.name);
          var blockData = blockDataMap[blockNum] || {};
          var etiquetas = blockData.etiquetas || '';
          var tx = parseInt(blockData.totalTransacciones) || 0;
          var hash = blockData.hash || '';
          var isPerfect = etiquetas.toLowerCase().indexOf('grid') !== -1;
          var isPunk = etiquetas.toLowerCase().indexOf('punk') !== -1;
          var tags = etiquetas.split('|').filter(function(t) { return t.trim() !== ''; });
          var listing = myListings[item.id] || null;
          var isListed = !!listing;
          var listedPriceBtc = isListed ? BitmapUtils.formatBtcSat(listing.price) : '';
          var menuOpen = editMenuFor === item.id;

          if (isListed) {
            return React.createElement('div', {
              key:idx,
              className:'bg-bitmap-surface border border-bitmap-border rounded-xl relative'
            },
              React.createElement('div', { className:'flex items-center justify-between px-3 py-2 border-b border-bitmap-border' },
                React.createElement('div', { className:'flex items-center gap-2' },
                  React.createElement('input', {
                    type:'checkbox',
                    checked:item.isSelected,
                    onChange:function() { toggleSelection(idx); },
                    style:{ width:'18px', height:'18px', accentColor:'#FE3E00' }
                  })
                ),
                React.createElement('div', { className:'flex items-center gap-2' },
                  React.createElement('img', {
                    src:'/logo192.png',
                    style:{ width:18, height:18, borderRadius:3 },
                    alt:''
                  }),
                  React.createElement('span', { className:'font-acme text-xs font-bold text-bitmap-orange-light' }, listedPriceBtc + ' BTC'),
                  React.createElement('div', { className:'relative' },
                    React.createElement('button', {
                      onClick:function(e) { e.stopPropagation(); setEditMenuFor(menuOpen ? null : item.id); },
                      className:'p-1 rounded hover:bg-bitmap-border transition-colors'
                    }, React.createElement('svg', { width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, className:'text-bitmap-muted' },
                      React.createElement('path', { d:'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
                      React.createElement('path', { d:'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
                    )),
                    menuOpen ? React.createElement('div', {
                      onClick:function(e) { e.stopPropagation(); },
                      className:'absolute right-0 top-full mt-1 w-44 bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1'
                    },
                      React.createElement('button', {
                        onClick:function() { handleEditPrice(listing); },
                        className:'w-full px-3 py-2 text-left font-acme text-xs text-bitmap-text hover:bg-bitmap-surface transition-colors'
                      }, '\u270F Actualizar precio'),
                      React.createElement('button', {
                        onClick:function() { handleDelist(listing); },
                        className:'w-full px-3 py-2 text-left font-acme text-xs text-bitmap-red hover:bg-bitmap-surface transition-colors'
                      }, '\u2716 Deslistar')
                    ) : null
                  )
                )
              ),
              React.createElement('div', { className:'p-2' },
                tags.length > 0 ? React.createElement('div', { className:'w-full mb-1 px-0.5' },
                  React.createElement(UniversalTagList, { etiquetas:etiquetas, fontSize:9 })
                ) : null,
                React.createElement('div', { className:'w-full aspect-square mb-1 rounded-lg overflow-hidden bg-bitmap-black' },
                  blockNum ? React.createElement('img', {
                    src: '/api/v1/block-image/' + blockNum + '?v=5&size=150&etiquetas=' + encodeURIComponent(etiquetas) + '&tx=' + tx + '&hash=' + encodeURIComponent(hash) + '&grid=' + isPerfect + '&punk=' + isPunk,
                    alt:'',
                    className:'w-full h-full object-cover',
                    onError: function(e) { e.target.src = '/api/v1/block-image/' + blockNum + '?v=5&size=150'; }
                  }) : null
                ),
                React.createElement('div', { className:'font-mono text-[11px] text-white truncate' },
                  item.name || '#' + item.inscriptionNumber
                ),
                React.createElement('div', { className:'font-acme text-[9px] text-bitmap-muted' },
                  item.inscriptionNumber ? '#' + item.inscriptionNumber : ''
                )
              )
            );
          }

          return React.createElement('div', {
            key:idx,
            className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 relative',
            style: item.isSelected ? { borderColor:'#FE3E00' } : {}
          },
            item.isSelected ? React.createElement('div', {
              className:'absolute inset-0 bg-black/30 rounded-xl z-10'
            }) : null,
            React.createElement('div', { className:'absolute top-2 left-2 z-20' },
              React.createElement('input', {
                type:'checkbox',
                checked:item.isSelected,
                onChange:function() { toggleSelection(idx); },
                style:{ width:'18px', height:'18px', accentColor:'#FE3E00' }
              })
            ),
            tags.length > 0 ? React.createElement('div', { className:'w-full mb-1 px-0.5' },
              React.createElement(UniversalTagList, { etiquetas:etiquetas, fontSize:9 })
            ) : null,
            React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black' },
              blockNum ? React.createElement('img', {
                src: '/api/v1/block-image/' + blockNum + '?v=5&size=150&etiquetas=' + encodeURIComponent(etiquetas) + '&tx=' + tx + '&hash=' + encodeURIComponent(hash) + '&grid=' + isPerfect + '&punk=' + isPunk,
                alt:'',
                className:'w-full h-full object-cover',
                onError: function(e) { e.target.src = '/api/v1/block-image/' + blockNum + '?v=5&size=150'; }
              }) : null
            ),
            React.createElement('div', { className:'font-mono text-[11px] text-white truncate' },
              item.name || '#' + item.inscriptionNumber
            ),
            React.createElement('div', { className:'font-acme text-[9px] text-bitmap-muted' },
              item.inscriptionNumber ? '#' + item.inscriptionNumber : ''
            ),
            item.isSelected ? React.createElement('div', { className:'mt-2 relative z-20' },
              React.createElement('input', {
                type:'text',
                inputMode:'decimal',
                placeholder:'Precio en BTC',
                value:item.priceStr,
                onChange:function(e) { updatePrice(idx, e.target.value); },
                className:'w-full bg-bitmap-black border border-bitmap-border rounded px-2 py-1 font-acme text-xs text-white placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange'
              }),
              item.priceSatoshis > 0 ? React.createElement('div', { className:'font-acme text-[10px] text-bitmap-orange-light mt-1' },
                BitmapUtils.formatBtcSat(item.priceSatoshis) + ' BTC'
              ) : null
            ) : null
          );
        })
      ) :

      React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-4 gap-3' },
        (col ? col.items : []).slice().sort(function(a, b) {
          if (collectionName !== 'Parcelas') return 0;
          var ca = parcelConfirmations[a.id];
          var cb = parcelConfirmations[b.id];
          var aOk = ca && ca[0] && ca[0].confirmed && ca[1] && ca[1].confirmed ? 1 : 0;
          var bOk = cb && cb[0] && cb[0].confirmed && cb[1] && cb[1].confirmed ? 1 : 0;
          return bOk - aOk;
        }).map(function(item, idx) {
          var blockNum = extractBlockNumber(item.name);
          var blockData = blockDataMap[blockNum] || {};
          var etiquetas = blockData.etiquetas || '';
          var tx = parseInt(blockData.totalTransacciones) || 0;
          var hash = blockData.hash || '';
          var isPerfect = etiquetas.toLowerCase().indexOf('grid') !== -1;
          var isPunk = etiquetas.toLowerCase().indexOf('punk') !== -1;
          var tags = etiquetas.split('|').filter(function(t) { return t.trim() !== ''; });
          var confs = parcelConfirmations[item.id] || null;
          var tx1 = confs ? confs[0] : null;
          var tx2 = confs ? confs[1] : null;
          var inscriptionIdShort = item.id ? item.id.slice(0, 16) + '...' : '';
          var isParcelItem = item.isParcel || collectionName === 'Parcelas';
            var imgSrc = isParcelItem
              ? '/api/v1/parcel-image?v=2'
              : '/api/v1/block-image/' + blockNum + '?v=5&size=150&etiquetas=' + encodeURIComponent(etiquetas) + '&tx=' + tx + '&hash=' + encodeURIComponent(hash) + '&grid=' + isPerfect + '&punk=' + isPunk;
            return React.createElement('div', { key:idx, className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 flex flex-col items-center' },
              tags.length > 0 ? React.createElement('div', { className:'w-full mb-1 px-0.5' },
                React.createElement(UniversalTagList, { etiquetas:etiquetas, fontSize:9 })
              ) : null,
              isParcelItem ? React.createElement('div', { className:'w-full text-center mb-2 text-[9px] leading-tight' },
                tx1 ? React.createElement('div', null,
                  React.createElement('div', { className:'flex items-center justify-center gap-1 text-green-400 mb-0.5' },
                    React.createElement('svg', { width:12, height:12, viewBox:'0 0 24 24', fill:'none', stroke:'#00AA00', strokeWidth:2.5 },
                      React.createElement('path', { d:'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
                      React.createElement('polyline', { points:'22 4 12 14.01 9 11.01' })
                    ),
                    React.createElement('span', { className:'font-mono text-white' }, 'wallet inscribe: '),
                    React.createElement('span', { className:'font-mono' }, (tx1.inscriberWallet ? tx1.inscriberWallet.slice(-4) : '----'))
                  ),
                  React.createElement('div', { className:'font-mono text-gray-300' }, 'bloque: ' + (tx1.genesisHeight || '---')),
                  tx1.txid ? React.createElement('a', {
                    className:'font-mono text-blue-400 underline cursor-pointer',
                    style:{ color:'#3b82f6' },
                    title: tx1.txid,
                    onClick: function(e) { e.stopPropagation(); window.open('https://unisat.io/explorer/tx/' + tx1.txid, '_blank'); }
                  }, tx1.txid.slice(0, 16) + '...') : null
                ) : null,
                tx2 && tx2.confirmed ? (function() {
                  var last4 = function(addr) { return addr ? addr.slice(-4) : '----'; };
                  var from4 = tx2.selfTransferFrom ? last4(tx2.selfTransferFrom.split(',')[0].trim()) : '----';
                  var to4 = tx2.selfTransferTo ? last4(tx2.selfTransferTo.split(',')[0].trim()) : '----';
                  return React.createElement('div', { className:'mt-1' },
                    React.createElement('div', { className:'flex items-center justify-center gap-1 text-green-400 mb-0.5' },
                      React.createElement('svg', { width:12, height:12, viewBox:'0 0 24 24', fill:'none', stroke:'#00AA00', strokeWidth:2.5 },
                        React.createElement('path', { d:'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
                        React.createElement('polyline', { points:'22 4 12 14.01 9 11.01' })
                      ),
                      React.createElement('span', { className:'font-mono text-white' }, 'de '),
                      React.createElement('span', { className:'font-mono' }, from4),
                      React.createElement('span', { className:'font-mono text-white' }, ' a '),
                      React.createElement('span', { className:'font-mono' }, to4)
                    ),
                    React.createElement('div', { className:'font-mono text-gray-300' }, 'bloque: ' + (tx2.selfTransferHeight !== undefined ? tx2.selfTransferHeight : '---')),
                    tx2.txid ? React.createElement('a', {
                      className:'font-mono text-blue-400 underline cursor-pointer',
                      style:{ color:'#3b82f6' },
                      title: tx2.txid,
                      onClick: function(e) { e.stopPropagation(); window.open('https://unisat.io/explorer/tx/' + tx2.txid, '_blank'); }
                    }, tx2.txid.slice(0, 16) + '...') : null
                  );
                })() : (tx2 ? React.createElement('div', { className:'mt-1 text-gray-500' },
                  React.createElement('div', { className:'flex items-center justify-center gap-1 mb-0.5' },
                    React.createElement('svg', { width:12, height:12, viewBox:'0 0 24 24', fill:'none', stroke:'#666', strokeWidth:2.5 },
                      React.createElement('path', { d:'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
                      React.createElement('polyline', { points:'22 4 12 14.01 9 11.01' })
                    ),
                    React.createElement('span', { className:'font-mono' }, 'de --- a ---')
                  ),
                  React.createElement('div', { className:'font-mono' }, 'bloque: ---')
                ) : null)
              ) : null,
              React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black' },
                blockNum ? React.createElement('img', {
                  src: imgSrc,
                  alt:'',
                  className:'w-full h-full object-cover',
                  onError: function(e) { e.target.src = isParcelItem ? '/api/v1/parcel-image?v=2' : '/api/v1/block-image/' + blockNum + '?v=5&size=150'; }
                }) : null
              ),
              isParcelItem ? (function() {
                var pt = getParcelTag(item.name, etiquetas);
                return pt ? React.createElement('div', { className:'flex justify-center mb-1' },
                  React.createElement(UniversalTag, { text: pt.label, fontSize: 7 })
                ) : null;
              })() : null,
              React.createElement('div', { className:'font-mono text-[11px] text-white truncate text-center w-full' },
                item.name || '#' + item.inscriptionNumber
              ),
              React.createElement('div', { className:'font-acme text-[9px] text-bitmap-muted text-center' },
                item.inscriptionNumber ? '#' + item.inscriptionNumber : ''
              ),
              isParcelItem && inscriptionIdShort ? React.createElement('div', {
                className:'font-mono text-[8px] text-gray-400 truncate text-center w-full cursor-pointer select-all mt-1',
                style:{ userSelect: 'all' },
                title: item.id,
                onClick: function(e) {
                  e.stopPropagation();
                  navigator.clipboard.writeText(item.id);
                }
              }, inscriptionIdShort) : null
            );
        })
      ),

      showListModal ? React.createElement('div', { className:'fixed inset-0 z-50 flex items-center justify-center bg-black/50' },
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6 max-w-md w-full mx-4' },
          React.createElement('h3', { className:'font-alfaslab text-lg text-white mb-4' }, 'Confirmar listado'),
          React.createElement('div', { className:'space-y-3 mb-4 max-h-60 overflow-y-auto' },
            selectionState.filter(function(it) { return it.isSelected && it.priceSatoshis > 0; }).map(function(item, idx) {
              return React.createElement('div', { key:idx, className:'flex justify-between text-sm' },
                React.createElement('span', { className:'font-acme text-white' }, item.name || '#' + item.inscriptionNumber),
                React.createElement('span', { className:'font-alfaslab text-bitmap-orange-light' }, BitmapUtils.formatBtcSat(item.priceSatoshis) + ' BTC')
              );
            })
          ),
          React.createElement('div', { className:'flex gap-3' },
            React.createElement('button', {
              onClick:function() { setShowListModal(false); },
              className:'flex-1 py-2 bg-bitmap-border text-white font-alfaslab text-sm rounded-lg'
            }, 'Cancelar'),
            React.createElement('button', {
              onClick:confirmListar,
              className:'flex-1 py-2 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors'
            }, 'Confirmar y Firmar')
          )
        )
      ) : null,

      editingListing ? React.createElement('div', { className:'fixed inset-0 z-50 flex items-center justify-center bg-black/50' },
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6 max-w-sm w-full mx-4' },
          React.createElement('h3', { className:'font-alfaslab text-lg text-white mb-2' }, 'Actualizar precio'),
          React.createElement('p', { className:'font-acme text-xs text-bitmap-muted mb-4' }, editingListing.name),
          React.createElement('input', {
            type:'text',
            inputMode:'decimal',
            value:editPriceStr,
            onChange:function(e) { setEditPriceStr(e.target.value.replace(/[^0-9.]/g, '')); },
            className:'w-full bg-bitmap-black border border-bitmap-border rounded-lg px-4 py-3 font-acme text-sm text-white focus:outline-none focus:border-bitmap-orange mb-1'
          }),
          React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted mb-4' },
            editPriceStr ? BitmapUtils.formatBtcSat(parseFloat(editPriceStr) * 100000000) + ' BTC' : ''
          ),
          React.createElement('div', { className:'flex gap-3' },
            React.createElement('button', {
              onClick:function() { setEditingListing(null); },
              className:'flex-1 py-2 bg-bitmap-border text-white font-alfaslab text-sm rounded-lg'
            }, 'Cancelar'),
            React.createElement('button', {
              onClick:handleSavePrice,
              className:'flex-1 py-2 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors'
            }, 'Guardar')
          )
        )
      ) : null,

      confirmAction && confirmAction.type === 'delist' ? React.createElement('div', { className:'fixed inset-0 z-50 flex items-center justify-center bg-black/50' },
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6 max-w-sm w-full mx-4' },
          React.createElement('h3', { className:'font-alfaslab text-lg text-white mb-2' }, 'Deslistar bitmap'),
          React.createElement('p', { className:'font-acme text-sm text-bitmap-text mb-1' }, 'Vas a deslistar:'),
          React.createElement('p', { className:'font-acme text-sm text-bitmap-orange font-bold mb-4' }, confirmAction.listing.name),
          React.createElement('p', { className:'font-acme text-xs text-bitmap-muted mb-4' }, 'El bitmap sera removido de tu marketplace.'),
          React.createElement('div', { className:'flex gap-3' },
            React.createElement('button', {
              onClick:function() { setConfirmAction(null); },
              className:'flex-1 py-2 bg-bitmap-border text-white font-alfaslab text-sm rounded-lg'
            }, 'Cancelar'),
            React.createElement('button', {
              onClick:handleConfirmDelist,
              className:'flex-1 py-2 bg-bitmap-red text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-red/80 transition-colors'
            }, 'Deslistar')
          )
        )
      ) : null
    )
  );
}

function TransactionPage(props) {
  var navigate = props.navigate;
  var routeParams = ReactRouterDOM.useParams();
  var txId = routeParams.id;

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-md mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, 'Transacción #' + txId),
        React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-4 space-y-3' },
          React.createElement('div', { className:'flex justify-between' },
            React.createElement('span', { className:'font-alfaslab text-sm text-bitmap-muted' }, 'Estado'),
            React.createElement('span', { className:'font-acme text-sm text-bitmap-green' }, 'Pendiente')
          ),
          React.createElement('div', { className:'flex justify-between' },
            React.createElement('span', { className:'font-alfaslab text-sm text-bitmap-muted' }, 'TX ID'),
            React.createElement('span', { className:'font-acme text-xs text-white truncate max-w-[180px]' }, txId)
          )
        )
      )
  );
}

function PSBTPage(props) {
  var navigate = props.navigate;
  var _a = React.useState('');
  var psbt = _a[0];
  var setPsbt = _a[1];
  var _b = React.useState('');
  var toast = _b[0];
  var setToast = _b[1];

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-md mx-auto space-y-4' },
        React.createElement('h2', { className:'font-alfaslab text-xl text-white' }, I18n.t('psbt.title')),
        React.createElement('textarea', {
          value:psbt,
          onChange:function(e) { setPsbt(e.target.value); },
          placeholder:I18n.t('psbt.placeholder'),
          className:'w-full h-40 bg-bitmap-surface border border-bitmap-border rounded-lg px-4 py-3 font-acme text-xs text-bitmap-text placeholder-bitmap-muted focus:outline-none focus:border-bitmap-orange resize-none'
        }),
        React.createElement('button', {
          onClick:function() { setToast(I18n.t('psbt.notAvailable')); },
          disabled:!psbt,
          className:'w-full py-3 bg-bitmap-orange text-white font-alfaslab text-sm rounded-lg hover:bg-bitmap-orange/80 transition-colors disabled:opacity-50'
        }, I18n.t('psbt.sign'))
    ),
    toast ? React.createElement(Toast, { message:toast, type:'info', onDone:function() { setToast(''); } }) : null
  );
}
