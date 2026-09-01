var BitmapUtils = {
  satsToBtc: function(sats) { return sats / 100000000; },
  btcToSats: function(btc) { return Math.round(btc * 100000000); },
  formatBtc: function(btc, decimals) { return (btc || 0).toFixed(decimals || 8); },
  formatBtcSat: function(sats) { return (sats / 100000000).toFixed(8).replace(/\.?0+$/, '') || '0'; },
  formatSats: function(sats) { return (sats || 0).toLocaleString(); },
  truncateAddress: function(addr, chars) {
    chars = chars || 6;
    if (!addr) return '';
    return addr.slice(0, chars) + '...' + addr.slice(-chars);
  },
  truncateTx: function(tx, chars) {
    chars = chars || 8;
    if (!tx) return '';
    return tx.slice(0, chars) + '...' + tx.slice(-chars);
  },
  isValidAddress: function(addr) { return /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(addr); },
  isValidBlockNumber: function(n) { return n >= 0 && n <= 999999 && Number.isInteger(n); },
  formatDate: function(date) {
    var d = new Date(date);
    var locale = (typeof I18n !== 'undefined' && I18n.getCurrentLang && I18n.getCurrentLang() === 'es') ? 'es-AR' : 'en-US';
    return d.toLocaleDateString(locale, { day:'2-digit', month:'2-digit', year:'numeric' });
  },
  formatDateTime: function(date) {
    var d = new Date(date);
    var locale = (typeof I18n !== 'undefined' && I18n.getCurrentLang && I18n.getCurrentLang() === 'es') ? 'es-AR' : 'en-US';
    return d.toLocaleDateString(locale, { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  },
  timeAgo: function(date) {
    var diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return I18n.t('time.justNow');
    if (diff < 3600) return I18n.t('time.agoMin', { n: Math.floor(diff / 60) });
    if (diff < 86400) return I18n.t('time.agoHours', { n: Math.floor(diff / 3600) });
    return I18n.t('time.agoDays', { n: Math.floor(diff / 86400) });
  },
  formatNumber: function(n) {
    var locale = (typeof I18n !== 'undefined' && I18n.getCurrentLang && I18n.getCurrentLang() === 'es') ? 'es-AR' : 'en-US';
    return (n || 0).toLocaleString(locale);
  },
  formatFileSize: function(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
};

var BitmapConstants = {
  SERVER_HOST: 'https://bitmapcore.net',
  LOCAL_PORT: 3000,
  PROXY_PORT: 5500,
  POLLING_INTERVAL: 300000,
  COLORS: {
    black: '#080008',
    surface: '#191217',
    orange: '#FE3E00',
    orangeLight: '#FF6B35',
    green: '#00AA00',
    red: '#FF3333',
    border: '#2A2A2A',
    text: '#B0B0B0',
    muted: '#666666',
    mondrian: ['#000000','#FE3E00','#FFD700','#E0115F','#50C878','#0F52BA','#FFFFFF']
  },
  TAG_DEFINITIONS: {
    'Pumpkin': { color: '#FE3E00', label: 'Calabaza' },
    'Diamond': { color: '#B9F2FF', label: 'Diamante' },
    'Gold': { color: '#FFD700', label: 'Oro' },
    'Ruby': { color: '#E0115F', label: 'Rubí' },
    'Emerald': { color: '#50C878', label: 'Esmeralda' },
    'Sapphire': { color: '#0F52BA', label: 'Zafiro' },
    'Silver': { color: '#C0C0C0', label: 'Plata' },
    'Bronze': { color: '#CD7F32', label: 'Bronce' },
    'Platinum': { color: '#E5E4E2', label: 'Platino' },
    'Jade': { color: '#00A86B', label: 'Jade' }
  },
  ROUTES: [
    { path: '/', name: 'home' },
    { path: '/marketplace', name: 'marketplace' },
    { path: '/ordinalswallet', name: 'ordinalswallet' },
    { path: '/unisat', name: 'unisat' },
    { path: '/local', name: 'local' },
    { path: '/satflow', name: 'satflow' },
    { path: '/discounts', name: 'discounts' },
    { path: '/unified', name: 'unified' },
    { path: '/tag-tables', name: 'tag-tables' },
    { path: '/tag-tables/:tagName', name: 'tag-groups' },
    { path: '/sales', name: 'sales' },
    { path: '/blocks/:id', name: 'block-detail' },
    { path: '/tags/:tagName', name: 'tag-table' },
    { path: '/wallet', name: 'wallet' },
    { path: '/wallet/dashboard', name: 'wallet-dashboard' },
    { path: '/mis-activos', name: 'mis-activos' },
    { path: '/wallet/transaction/:id', name: 'transaction' },
    { path: '/mondrian/:id', name: 'mondrian' },
    { path: '/search', name: 'search' }
  ]
};

function getParcelTag(name, etiquetas) {
  if (!name || !etiquetas) return null;
  var m = String(name).match(/^(\d+)\.(\d+)\.bitmap$/i);
  if (!m) return null;
  var txNum = parseInt(m[1], 10);
  var re = new RegExp('tx\\s+(millonaria|multimillonaria)\\s+\\(tx#' + txNum + '\\)\\s+([0-9.]+)\\s+BTC', 'i');
  var mm = String(etiquetas).match(re);
  if (!mm) return null;
  return { label: mm[1].toLowerCase() + ' ' + mm[2] + ' BTC', tag: mm[1].toLowerCase() };
}

function getParcelTags(name, blockData, epicBlocks) {
  var tags = [];
  if (!name) return tags;
  var m = String(name).match(/^(\d+)\.(\d+)\.bitmap$/i);
  if (!m) return tags;
  var txNum = parseInt(m[1], 10);
  var block = parseInt(m[2], 10);
  var etiquetas = (blockData && blockData.etiquetas) || '';
  var totalTxs = parseInt((blockData && (blockData.totalTransacciones || blockData.txCount)) || 0, 10);
  var mt = getParcelTag(name, etiquetas);
  if (mt) tags.push(mt.label);
  if (epicBlocks && epicBlocks.indexOf(block) !== -1) {
    tags.push('epic');
    var mythicTx = txNum === 1 || (totalTxs <= 1 && txNum === 0);
    if (mythicTx) tags.push('mythic');
  }
  return tags;
}
