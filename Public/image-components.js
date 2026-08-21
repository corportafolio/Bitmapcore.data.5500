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
    isPerfect: props.isPerfect || false,
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
    isPerfect: props.isPerfect || false,
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
      isPerfect: options.isPerfect,
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
    return React.createElement('div', { className:'text-center py-8 font-acme text-bitmap-muted text-sm' }, 'No hay imágenes disponibles');
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
      React.createElement('div', { className:'font-alfaslab text-sm text-white truncate flex-1 cursor-pointer', onClick:onClick }, label),
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
        src:'/api/v1/block-image/' + id + '?v=3&size=150&etiquetas=' + encodeURIComponent(etiquetas) + '&tx=' + totalTransactions + '&hash=' + encodeURIComponent(hash) + '&grid=' + isPerfect + '&punk=' + isPunk,
        className:'w-full h-full object-cover',
        loading:'lazy'
      }) :
      React.createElement('div', { className:'w-full h-full flex items-center justify-center text-3xl' }, '\uD83C\uDFF7\uFE0F')
    ),
    price ? React.createElement('div', { className:'font-acme text-xs text-bitmap-orange-light mt-1' }, BitmapUtils.formatBtc(price) + ' BTC') : null
  );
}
