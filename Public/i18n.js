var I18n = (function() {
  return {
    currentLang: 'en',

    init: function() {
      return I18nManager.init().then(function() {
        I18n.currentLang = I18nManager.getCurrentLang();
      });
    },

    t: function(key, params) {
      return I18nManager.t(key, params);
    },

    setLanguage: function(lang) {
      I18nManager.setLanguage(lang);
    },

    saveLanguage: function() {
      return I18nManager.saveLanguage().then(function() {
        I18n.currentLang = I18nManager.getCurrentLang();
      });
    },

    getCurrentLang: function() {
      return I18nManager.getCurrentLang();
    }
  };
})();
