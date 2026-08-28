var I18n = {
  currentLang: (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'es',
  translations: {
    es: {
      app: { name:'BitmapCore', loading:'Cargando...', error:'Error', retry:'Reintentar', save:'Guardar', cancel:'Cancelar', confirm:'Confirmar', back:'Volver', search:'Buscar', noResults:'Sin resultados', lastUpdate:'Última actualización', connectWallet:'Conectar Wallet', disconnect:'Desconectar' },
      nav: { home:'Inicio', marketplace:'Marketplace', blocks:'Bloques', tags:'Etiquetas', wallet:'Wallet', settings:'Configuración', misActivos:'Mis Activos', sales:'Ventas', discounts:'Descuentos', unified:'Listado Unificado', tagTables:'Tablas de Etiquetas', ordinalswallet:'Ordinalswallet', unisat:'Unisat', local:'Local', parcelas:'Parcelas' },
      home: { title:'BitmapCore', subtitle:'El marketplace de Bitmap en Bitcoin', latestBlocks:'Últimos Bloques', latestSales:'Últimas Ventas', viewAll:'Ver todos', block:'Bloque' },
      marketplace: { title:'Marketplace', selectMarketplace:'Selecciona un marketplace', floorPrice:'Precio mínimo', totalListings:'Total listados', listedAt:'Listado el', price:'Precio', buyNow:'Comprar ahora', noListings:'No hay listados disponibles', filters:'Filtros', sort:'Ordenar', sortByPrice:'Precio', sortByDate:'Fecha', sortByBlock:'Bloque', asc:'Ascendente', desc:'Descendente' },
      block: { title:'Detalle de Bloque', transactions:'Transacciones', size:'Tamaño', date:'Fecha', viewMondrian:'Ver Mondrian Completo', bitmap:'Bitmap', inscription:'Inscripción', notFound:'Bloque no encontrado' },
      tags: { title:'Tablas de Etiquetas', subtitle:'Explora bloques por etiquetas', blocksWithTag:'Bloques con etiqueta', noBlocks:'No hay bloques para esta etiqueta', viewDetails:'Ver detalles' },
      sales: { title:'Ventas Recientes', noSales:'No hay ventas recientes', buyer:'Comprador', seller:'Vendedor', saleDate:'Fecha de venta' },
      descuentos: { title:'Descuentos', noDiscounts:'No hay descuentos disponibles', discountPrice:'Precio con descuento', originalPrice:'Precio original', savings:'Ahorro' },
      unified: { title:'Listado Unificado', subtitle:'Todos los listados en un solo lugar', noListings:'No hay listados disponibles' },
      wallet: { title:'Wallet', connect:'Conectar Wallet', dashboard:'Dashboard', balance:'Balance', address:'Dirección', notConnected:'Wallet no conectada', connectPrompt:'Conecta tu wallet para acceder a tus activos y realizar transacciones', disconnect:'Desconectar', myAssets:'Mis Activos', transaction:'Transacción', psbt:'PSBT Builder' },
      psbt: { title:'PSBT Builder', placeholder:'Pega tu PSBT aquí...', sign:'Firmar PSBT', notAvailable:'Funcionalidad de PSBT no disponible aún' },
      search: { title:'Buscar', placeholder:'Número de bloque o etiqueta...', searching:'Buscando...' },
      settings: { title:'Configuración', language:'Idioma', theme:'Tema', notifications:'Notificaciones', polling:'Actualización automática', interval:'Intervalo', seconds:'segundos' }
    },
    en: {
      app: { name:'BitmapCore', loading:'Loading...', error:'Error', retry:'Retry', save:'Save', cancel:'Cancel', confirm:'Confirm', back:'Back', search:'Search', noResults:'No results', lastUpdate:'Last update', connectWallet:'Connect Wallet', disconnect:'Disconnect' },
      nav: { home:'Home', marketplace:'Marketplace', blocks:'Blocks', tags:'Tags', wallet:'Wallet', settings:'Settings', misActivos:'My Assets', sales:'Sales', discounts:'Discounts', unified:'Unified Listing', tagTables:'Tag Tables', ordinalswallet:'Ordinalswallet', unisat:'Unisat', local:'Local', parcelas:'Parcels' },
      home: { title:'BitmapCore', subtitle:'The Bitmap marketplace on Bitcoin', latestBlocks:'Latest Blocks', latestSales:'Latest Sales', viewAll:'View all', block:'Block' },
      marketplace: { title:'Marketplace', selectMarketplace:'Select a marketplace', floorPrice:'Floor price', totalListings:'Total listings', listedAt:'Listed at', price:'Price', buyNow:'Buy now', noListings:'No listings available', filters:'Filters', sort:'Sort', sortByPrice:'Price', sortByDate:'Date', sortByBlock:'Block', asc:'Ascending', desc:'Descending' },
      block: { title:'Block Detail', transactions:'Transactions', size:'Size', date:'Date', viewMondrian:'View Full Mondrian', bitmap:'Bitmap', inscription:'Inscription', notFound:'Block not found' },
      tags: { title:'Tag Tables', subtitle:'Explore blocks by tags', blocksWithTag:'Blocks with tag', noBlocks:'No blocks for this tag', viewDetails:'View details' },
      sales: { title:'Recent Sales', noSales:'No recent sales', buyer:'Buyer', seller:'Seller', saleDate:'Sale date' },
      descuentos: { title:'Discounts', noDiscounts:'No discounts available', discountPrice:'Discount price', originalPrice:'Original price', savings:'Savings' },
      unified: { title:'Unified Listing', subtitle:'All listings in one place', noListings:'No listings available' },
      wallet: { title:'Wallet', connect:'Connect Wallet', dashboard:'Dashboard', balance:'Balance', address:'Address', notConnected:'Wallet not connected', connectPrompt:'Connect your wallet to access your assets and make transactions', disconnect:'Disconnect', myAssets:'My Assets', transaction:'Transaction', psbt:'PSBT Builder' },
      psbt: { title:'PSBT Builder', placeholder:'Paste your PSBT here...', sign:'Sign PSBT', notAvailable:'PSBT functionality not yet available' },
      search: { title:'Search', placeholder:'Block number or tag...', searching:'Searching...' },
      settings: { title:'Settings', language:'Language', theme:'Theme', notifications:'Notifications', polling:'Auto update', interval:'Interval', seconds:'seconds' }
    }
  },
  t: function(key) {
    var parts = key.split('.');
    var val = I18n.translations[I18n.currentLang];
    for (var i = 0; i < parts.length; i++) {
      if (val && val[parts[i]]) val = val[parts[i]]; else return key;
    }
    return val || key;
  },
  setLanguage: function(lang) {
    I18n.currentLang = lang;
    localStorage.setItem('lang', lang);
  }
};
