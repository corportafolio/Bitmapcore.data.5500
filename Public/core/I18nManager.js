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
    console.log('[I18n] fetchStrings called for:', lang, 'URL:', '/i18n/strings-' + lang + '.json');
    return fetch('/i18n/strings-' + lang + '.json')
      .then(function(res) {
        console.log('[I18n] fetch response:', res.status, res.ok, 'for lang:', lang);
        if (!res.ok) throw new Error('Failed to load ' + lang);
        return res.json();
      })
      .then(function(data) {
        console.log('[I18n] strings loaded successfully for:', lang, 'keys:', Object.keys(data).length);
        strings = data;
        loaded = true;
        currentLang = lang;
        pendingLang = lang;
        return data;
      })
      .catch(function(err) {
        console.error('[I18n] FAILED to load', lang, ':', err.message);
        if (lang !== 'en') {
          console.warn('[I18n] falling back to en');
          return fetchStrings('en');
        }
        throw err;
      });
  }

  function init() {
    var saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('lang') : null;
    var explicit = (typeof localStorage !== 'undefined') ? localStorage.getItem('lang_explicit') : null;
    console.log('[I18n] init - saved:', saved, 'explicit:', explicit);
    var lang = (explicit === 'true' && saved) ? saved : 'en';
    console.log('[I18n] init - resolving lang:', lang);
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
    var supported = ['en','es','fr','ja','zh','lo','nl','ko','de','vi','id','el'];
    console.log('[I18n] setLanguage:', lang, 'supported:', supported.indexOf(lang) !== -1);
    if (supported.indexOf(lang) === -1) return;
    pendingLang = lang;
  }

  function saveLanguage() {
    console.log('[I18n] saveLanguage - pendingLang:', pendingLang, 'currentLang before:', currentLang);
    currentLang = pendingLang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lang', currentLang);
      localStorage.setItem('lang_explicit', 'true');
      console.log('[I18n] localStorage saved lang:', localStorage.getItem('lang'), 'explicit:', localStorage.getItem('lang_explicit'));
    }
    return fetchStrings(currentLang).then(function() {
      document.documentElement.lang = currentLang;
      console.log('[I18n] saveLanguage complete, currentLang:', currentLang);
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
