var I18n = (function() {
  var currentLang = 'en';
  var pendingLang = 'en';
  var strings = {};
  var loaded = false;
  var loadPromise = null;

  function getNested(obj, path) {
    var parts = path.split('.');
    var val = obj;
    for (var i = 0; i < parts.length; i++) {
      if (val && val[parts[i]] !== undefined) {
        val = val[parts[i]];
      } else {
        return null;
      }
    }
    return val;
  }

  function loadStrings(lang) {
    if (loadPromise) return loadPromise;

    loadPromise = fetch('/i18n/strings-' + lang + '.json')
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to load ' + lang);
        return res.json();
      })
      .then(function(data) {
        strings = data;
        loaded = true;
        currentLang = lang;
        pendingLang = lang;
        return data;
      })
      .catch(function(err) {
        console.warn('Failed to load ' + lang + ', falling back to en:', err);
        if (lang !== 'en') {
          return loadStrings('en');
        }
        throw err;
      });
    return loadPromise;
  }

  function init() {
    var saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('lang') : null;
    var lang = saved || 'en';
    return loadStrings(lang).then(function() {
      document.documentElement.lang = currentLang;
      window.dispatchEvent(new CustomEvent('i18n:ready', { detail: { lang: currentLang } }));
    });
  }

  function t(key) {
    var val = getNested(strings, key);
    return val !== null ? val : key;
  }

  function setLanguage(lang) {
    if (lang === currentLang) return;
    if (lang !== 'en' && lang !== 'es') return;
    pendingLang = lang;
  }

  function saveLanguage() {
    if (pendingLang === currentLang) return;
    currentLang = pendingLang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lang', currentLang);
    }
    document.documentElement.lang = currentLang;
    window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: currentLang } }));
  }

  function getCurrentLang() {
    return currentLang;
  }

  function getPendingLang() {
    return pendingLang;
  }

  function isLoaded() {
    return loaded;
  }

  return {
    init: init,
    t: t,
    setLanguage: setLanguage,
    saveLanguage: saveLanguage,
    getCurrentLang: getCurrentLang,
    getPendingLang: getPendingLang,
    isLoaded: isLoaded
  };
})();