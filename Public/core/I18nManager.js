var I18nManager = (function() {
  var currentLang = 'en';
  var pendingLang = 'en';
  var strings = {};
  var loaded = false;

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

  function fetchStrings(lang) {
    return fetch('/i18n/strings-' + lang + '.json')
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
          return fetchStrings('en');
        }
        throw err;
      });
  }

  function init() {
    var saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('lang') : null;
    var explicit = (typeof localStorage !== 'undefined') ? localStorage.getItem('lang_explicit') : null;
    var lang = (explicit === 'true' && saved) ? saved : 'en';
    return fetchStrings(lang).then(function() {
      document.documentElement.lang = currentLang;
      window.dispatchEvent(new CustomEvent('i18n:ready', { detail: { lang: currentLang } }));
    });
  }

  function t(key, params) {
    var val = getNested(strings, key);
    if (val === null) return key;
    if (params && typeof val === 'string') {
      Object.keys(params).forEach(function(k) {
        val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return val;
  }

  function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'es' && lang !== 'fr' && lang !== 'ja') return;
    pendingLang = lang;
  }

  function saveLanguage() {
    currentLang = pendingLang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lang', currentLang);
      localStorage.setItem('lang_explicit', 'true');
    }
    return fetchStrings(currentLang).then(function() {
      document.documentElement.lang = currentLang;
      window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: currentLang } }));
    });
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
