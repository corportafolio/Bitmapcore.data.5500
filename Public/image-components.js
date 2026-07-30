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
      ImageViewModel.generateToCanvas(canvas, blockNumber, options, size);
    }

    return function() { cancelled = true; };
  }, [blockNumber, options.totalTransactions, options.hash, options.isPerfect, options.isPunk, options.etiquetas, size]);

  return React.createElement('canvas', {
    ref: canvasRef,
    width: size,
    height: size,
    onClick: onClick,
    className: onClick ? 'cursor-pointer w-full h-full' : 'w-full h-full',
    style: { imageRendering: 'pixelated' }
  });
}

function LazyMondrian(props) {
  var blockNumber = props.blockNumber || 0;
  var size = props.size || 80;
  var hash = props.hash || '';
  var totalTransactions = props.totalTransactions || 0;
  var etiquetas = props.etiquetas || '';
  var isPerfect = props.isPerfect || false;
  var isPunk = props.isPunk || false;

  var containerRef = React.useRef(null);
  var _a = React.useState(false);
  var isVisible = _a[0];
  var setIsVisible = _a[1];

  React.useEffect(function() {
    var node = containerRef.current;
    if (!node) return;
    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return function() { observer.disconnect(); };
  }, []);

  if (!isVisible) {
    return React.createElement('div', {
      ref: containerRef,
      style: { width: size, height: size, background: '#1a1a1a', borderRadius: 4 }
    });
  }

  return React.createElement('div', { ref: containerRef },
    React.createElement(MondrianCanvas, {
      blockNumber: blockNumber,
      size: size,
      hash: hash,
      totalTransactions: totalTransactions,
      etiquetas: etiquetas,
      isPerfect: isPerfect,
      isPunk: isPunk
    })
  );
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
  var marketplace = props.marketplace;
  var onClick = props.onClick;

  return React.createElement('button', {
    onClick: onClick,
    className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all text-left'
  },
    React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black' },
      type === 'block' ? React.createElement(MondrianCanvas, { blockNumber:Number(id), transactions:[], size:150 }) :
      React.createElement('div', { className:'w-full h-full flex items-center justify-center text-3xl' }, '\uD83C\uDFF7\uFE0F')
    ),
    React.createElement('div', { className:'font-alfaslab text-sm text-white truncate' }, label),
    price ? React.createElement('div', { className:'font-acme text-xs text-bitmap-orange-light' }, BitmapUtils.formatBtc(price) + ' BTC') : null
  );
}
