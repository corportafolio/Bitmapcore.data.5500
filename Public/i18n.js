var I18n = (function() {
  return {
    currentLang: 'en',
    translations: {},

    init: function() {
      return I18nManager.init().then(function() {
        I18n.currentLang = I18nManager.getCurrentLang();
      });
    },

    t: function(key) {
      return I18nManager.t(key);
    },

    setLanguage: function(lang) {
      I18nManager.setLanguage(lang);
      I18n.currentLang = I18nManager.getPendingLang();
    },

    saveLanguage: function() {
      I18nManager.saveLanguage();
      I18n.currentLang = I18nManager.getCurrentLang();
    },

    getCurrentLang: function() {
      return I18nManager.getCurrentLang();
    }
  };
})();