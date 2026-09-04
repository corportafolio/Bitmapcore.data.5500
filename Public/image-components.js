var _genQueue = [];
var _genProcessing = false;

function _processGenQueue() {
  if (_genQueue.length === 0) { _genProcessing = false; return; }
  _genProcessing = true;
  var task = _genQueue.shift();
  task();
  requestAnimationFrame(_processGenQueue);
}

function _scheduleGeneration(fn) {
  _genQueue.push(fn);
  if (!_genProcessing) _processGenQueue();
}

function MondrianCanvas(props) {
  var blockNumber = props.blockNumber || 0;
  var size = props.size || 320;
  var onClick = props.onClick;

  var options = {
    totalTransactions: props.totalTransactions || props.txCount || 0,
    hash: props.hash || '',
    isGrid: props.isPerfect || false,
    isPunk: props.isPunk || false,
    etiquetas: props.etiquetas || '',
    transactions: props.transactions || []
  };

  var canvasRef = React.useRef(null);

  React.useEffect(function() {
    if (!canvasRef.current) return;
    var canvas = canvasRef.current;
    var cancelled = false;

    var dataURL = ImageViewModel.getCachedSync(blockNumber, size, options);
    if (dataURL) {
      var img = new Image();
      img.onload = function() {
        if (cancelled) return;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = dataURL;
    } else {
      _scheduleGeneration(function() {
        if (cancelled) return;
        ImageViewModel.generateToCanvas(canvas, blockNumber, options, size);
      });
    }

    return function() { cancelled = true; };
  }, [blockNumber, options.totalTransactions, options.hash, options.isPerfect, options.isPunk, options.etiquetas, size]);

  return React.createElement('canvas', {
    ref: canvasRef,
    width: size,
    height: size,
    onClick: onClick,
    className: onClick ? 'cursor-pointer w-full h-full' : 'w-full h-full',
    style: { imageRendering: 'pixelated', background: '#1a1a1a', borderRadius: size === 80 ? 4 : 0 }
  });
}

function BlockThumbnail(props) {
  var blockNumber = props.blockNumber || 0;
  var size = props.size || 150;
  var onClick = props.onClick;

  var options = {
    totalTransactions: props.totalTransactions || 0,
    hash: props.hash || '',
    isGrid: props.isPerfect || false,
    isPunk: props.isPunk || false,
    etiquetas: props.etiquetas || ''
  };

  return React.createElement('div', {
    onClick: onClick,
    className: onClick ? 'cursor-pointer w-full h-full' : 'w-full h-full'
  },
    React.createElement(MondrianCanvas, {
      blockNumber: blockNumber,
      totalTransactions: options.totalTransactions,
      hash: options.hash,
      isPerfect: options.isGrid,
      isPunk: options.isPunk,
      etiquetas: options.etiquetas,
      transactions: [],
      size: size
    })
  );
}

function ImageGallery(props) {
  var images = props.images || [];
  var columns = props.columns || 3;

  if (images.length === 0) {
    return React.createElement('div', { className:'text-center py-8 font-acme text-bitmap-muted text-sm' }, I18n.t('marketplace.noListings'));
  }

  return React.createElement('div', {
    className:'grid gap-3',
    style: { gridTemplateColumns: 'repeat(' + columns + ', 1fr)' }
  },
    images.map(function(src, i) {
      return React.createElement('div', { key:i, className:'aspect-square rounded-lg overflow-hidden bg-bitmap-black' },
        React.createElement('img', { src:src, alt:'', className:'w-full h-full object-cover', loading:'lazy' })
      );
    })
  );
}

function ImageLoader(props) {
  var src = props.src;
  var alt = props.alt;
  var className = props.className;
  var fallback = props.fallback;

  var _a = React.useState('loading');
  var status = _a[0];
  var setStatus = _a[1];

  if (status === 'error' && fallback) {
    return React.createElement('div', { className: className }, fallback);
  }

  return React.createElement('img', {
    src: src,
    alt: alt || '',
    className: className,
    onLoad: function() { setStatus('loaded'); },
    onError: function() { setStatus('error'); },
    loading: 'lazy'
  });
}

function ResultCard(props) {
  var type = props.type;
  var id = props.id;
  var label = props.label;
  var price = props.price;
  var onClick = props.onClick;
  var onRemove = props.onRemove;
  var etiquetas = props.etiquetas || '';
  var hash = props.hash || '';
  var totalTransactions = props.totalTransactions || 0;

  var firstTag = '';
  if (etiquetas) {
    var tags = etiquetas.split(/[|,]/).filter(function(t) { return t.trim() !== ''; });
    if (tags.length > 0) firstTag = tags[0].trim();
  }
  var isPerfect = etiquetas.toLowerCase().indexOf('grid') !== -1;
  var isPunk = etiquetas.toLowerCase().indexOf('punk') !== -1;

  return React.createElement('div', {
    className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all'
  },
    React.createElement('div', { className:'flex items-center justify-between mb-1' },
      React.createElement('div', { className:'font-mono text-sm text-white truncate flex-1 cursor-pointer', onClick:onClick }, label),
      onRemove ? React.createElement('button', {
        onClick:function(e) { e.stopPropagation(); onRemove(); },
        className:'ml-2 text-bitmap-muted hover:text-bitmap-orange transition-colors font-acme text-2xl w-7 h-7 flex items-center justify-center rounded-full hover:bg-bitmap-black flex-shrink-0'
      }, '\u00D7') : null
    ),
    type === 'block' ? (
      firstTag ? React.createElement('div', { className:'mb-1' }, React.createElement(UniversalTag, { text:firstTag, fontSize:9 }))
      : React.createElement('div', { className:'font-acme text-xs mb-1', style:{color:'#666666'} }, '0 tags')
    ) : null,
    React.createElement('div', { onClick:onClick, className:'cursor-pointer w-full aspect-square rounded-lg overflow-hidden bg-bitmap-black' },
      type === 'block' ? React.createElement('img', {
        src:'/api/v1/block-image/' + id + '?v=5&size=150&etiquetas=' + encodeURIComponent(etiquetas) + '&tx=' + totalTransactions + '&hash=' + encodeURIComponent(hash) + '&grid=' + isPerfect + '&punk=' + isPunk,
        className:'w-full h-full object-cover',
        loading:'lazy'
      }) :
      React.createElement('div', { className:'w-full h-full flex items-center justify-center text-3xl' }, '\uD83C\uDFF7\uFE0F')
    ),
    price ? React.createElement('div', { className:'font-acme text-xs text-bitmap-orange-light mt-1' }, BitmapUtils.formatBtc(price) + ' BTC') : null
  );
}

function WalletResultCard(props) {
  var wallet = props.wallet;
  var onClick = props.onClick;
  var onRemove = props.onRemove;
  var inscriptionsCount = wallet.inscriptionsCount || 0;
  var bitmapsCount = wallet.bitmapsCount || 0;
  var btcBalance = wallet.btcBalance || 0;
  var totalPortfolioValue = wallet.totalPortfolioValue || '0 BTC';
  var mostExpensive = wallet.mostExpensiveBitmap;
  var collections = wallet.collections || [];
  var address = wallet.address || wallet.id;
  var shortAddr = address.slice(0, 6) + '...' + address.slice(-4);

  var totalValueBtc = 0;
  collections.forEach(function(c) { totalValueBtc += c.totalValue || 0; });

  return React.createElement('div', {
    className:'bg-bitmap-surface border border-bitmap-orange/50 rounded-xl p-3 hover:border-bitmap-orange transition-all'
  },
    React.createElement('div', { className:'flex items-center justify-between mb-2' },
      React.createElement('div', { className:'flex items-center gap-2 flex-1 cursor-pointer', onClick:onClick },
        React.createElement('div', { className:'w-8 h-8 rounded-full bg-bitmap-orange/20 flex items-center justify-center flex-shrink-0' },
          React.createElement('svg', { className:'w-5 h-5 text-bitmap-orange', fill:'currentColor', viewBox:'0 0 24 24' },
            React.createElement('path', { d:'M21 12V7H5v14h14v-7M21 12l-6 6M21 12l-6-6' })
          )
        ),
        React.createElement('div', { className:'flex-1 min-w-0' },
          React.createElement('div', { className:'font-mono text-sm text-white truncate' }, shortAddr(address)),
          React.createElement('div', { className:'font-acme text-xs text-bitmap-muted' }, I18n.t('home.wallet'))
        )
      ),
      React.createElement('button', {
        onClick:function(e) { e.stopPropagation(); onRemove(); },
        className:'ml-2 text-bitmap-muted hover:text-bitmap-orange transition-colors font-acme text-2xl w-7 h-7 flex items-center justify-center rounded-full hover:bg-bitmap-black flex-shrink-0'
      }, '\u00D7')
    ),
    React.createElement('div', { className:'grid grid-cols-3 gap-2 mb-2 text-center' },
      React.createElement('div', { className:'bg-bitmap-black/50 rounded-lg p-2' },
        React.createElement('div', { className:'font-acme text-xs text-bitmap-orange font-bold' }, inscriptionsCount),
        React.createElement('div', { className:'font-acme text-[9px] text-bitmap-muted' }, I18n.t('home.inscriptions'))
      ),
      React.createElement('div', { className:'bg-bitmap-black/50 rounded-lg p-2' },
        React.createElement('div', { className:'font-acme text-xs text-bitmap-orange font-bold' }, bitmapsCount),
        React.createElement('div', { className:'font-acme text-[9px] text-bitmap-muted' }, I18n.t('home.bitmaps'))
      ),
      React.createElement('div', { className:'bg-bitmap-black/50 rounded-lg p-2' },
        React.createElement('div', { className:'font-acme text-xs text-bitmap-orange-light font-bold' }, btcBalance ? (btcBalance / 100000000).toFixed(8) + ' BTC' : '0 BTC'),
        React.createElement('div', { className:'font-acme text-[9px] text-bitmap-muted' }, I18n.t('home.balance'))
      )
    ),
    React.createElement('div', { className:'bg-bitmap-black/30 rounded-lg p-2 mb-2' },
      React.createElement('div', { className:'font-acme text-[10px] text-bitmap-orange-light flex justify-between' },
        React.createElement('span', null, I18n.t('home.portfolioValue')),
        React.createElement('span', { className:'font-bold' }, totalPortfolioValue)
      )
    ),
    mostExpensive ? React.createElement('div', { className:'bg-bitmap-black/30 rounded-lg p-2 mb-2' },
      React.createElement('div', { className:'font-acme text-[9px] text-bitmap-muted mb-1' }, I18n.t('home.mostExpensive')),
      React.createElement('div', { className:'flex items-center gap-2' },
        React.createElement('img', {
          src:'/api/v1/block-image/' + mostExpensive.blockNumber + '?v=5&size=55&etiquetas=' + encodeURIComponent(mostExpensive.tags || '') + '&tx=1&hash=&grid=false&punk=false',
          className:'w-12 h-12 rounded object-cover flex-shrink-0'
        }),
        React.createElement('div', { className:'flex-1 min-w-0' },
          React.createElement('div', { className:'font-mono text-xs text-white truncate' }, mostExpensive.blockNumber + '.bitmap'),
          React.createElement('div', { className:'font-acme text-[9px] text-bitmap-orange-light' }, (mostExpensive.price / 100000000).toFixed(8) + ' BTC')
        )
      )
    ) : null,
    React.createElement('div', { className:'flex items-center justify-between pt-2 border-t border-bitmap-border/30' },
      React.createElement('div', { className:'flex items-center gap-1' },
        React.createElement('span', { className:'font-acme text-[9px] text-bitmap-muted' }, I18n.t('home.collections')),
        React.createElement('span', { className:'font-acme text-[9px] text-bitmap-text' }, collections.length)
      ),
      React.createElement('div', { className:'font-acme text-xs text-bitmap-orange-light font-bold' },
        (totalValueBtc / 100000000).toFixed(8) + ' BTC'
      )
    )
  );
}

function shortAddr(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
