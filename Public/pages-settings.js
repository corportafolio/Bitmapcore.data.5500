function SettingsPage(props) {
  var langMap = {en:{f:'\uD83C\uDDEC\uD83C\uDDE7',n:'English'},es:{f:'\uD83C\uDDEA\uD83C\uDDF8',n:'Espa\u00F1ol'},fr:{f:'\uD83C\uDDEB\uD83C\uDDF7',n:'Fran\u00E7ais'},ja:{f:'\uD83C\uDDEF\uD83C\uDDF5',n:'\u65E5\u672C\u8A9E'},zh:{f:'\uD83C\uDDE8\uD83C\uDDF3',n:'\u4E2D\u6587'},lo:{f:'\uD83C\uDDF1\uD83C\uDDF6',n:'ລາວ'},nl:{f:'\uD83C\uDDF3\uD83C\uDDF1',n:'Nederlands'},ko:{f:'\uD83C\uDDF0\uD83C\uDDF7',n:'\uD55C\uAD6D\uC5B4'},de:{f:'\uD83C\uDDE9\uD83C\uDDEA',n:'Deutsch'},vi:{f:'\uD83C\uDDFB\uD83C\uDDF3',n:'Ti\u1EBFng Vi\u1EC7t'},id:{f:'\uD83C\uDDEE\uD83C\uDDE9',n:'Bahasa Indonesia'},el:{f:'\uD83C\uDDEC\uD83C\uDDF7',n:'\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC'}};
  var _a = React.useState(I18n.getCurrentLang());
  var language = _a[0];
  var setLanguage = _a[1];
  var _b = React.useState(false);
  var langDropdownOpen = _b[0];
  var setLangDropdownOpen = _b[1];
  var _c = React.useState(false);
  var isSaving = _c[0];
  var setIsSaving = _c[1];

  React.useEffect(function() {
    if (!langDropdownOpen) return;
    var closeDropdown = function() { setLangDropdownOpen(false); };
    window.addEventListener('click', closeDropdown);
    return function() { window.removeEventListener('click', closeDropdown); };
  }, [langDropdownOpen]);

  var handleLanguageSelect = function(lang) {
    setLanguage(lang);
    if (typeof I18n !== 'undefined' && I18n.setLanguage) {
      I18n.setLanguage(lang);
    }
  };

  var handleSave = function() {
    var prevLang = I18n.getCurrentLang();
    if (typeof bcAnalytics !== 'undefined' && bcAnalytics.track) bcAnalytics.track('language_change', {from: prevLang, to: language});
    setIsSaving(true);
    if (typeof I18n !== 'undefined' && I18n.saveLanguage) {
      I18n.saveLanguage().then(function() {
        setIsSaving(false);
        setTimeout(function() { location.reload(); }, 400);
      }).catch(function() {
        setIsSaving(false);
        setTimeout(function() { location.reload(); }, 400);
      });
    } else {
      setIsSaving(false);
      setTimeout(function() { location.reload(); }, 400);
    }
  };

  return React.createElement('div', { className:'p-4 lg:p-6' },
    React.createElement('div', { className:'max-w-xl mx-auto space-y-6' },
      React.createElement('h2', { className:'font-alfaslab text-xl text-white flex items-center gap-2 mb-2' },
        React.createElement('span', { className:'text-xl' }, '\u2699\uFE0F'),
        ' ', I18n.t('settings.title')
      ),

      React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6' },
        React.createElement('label', { className:'font-acme text-xs text-bitmap-muted block mb-2' }, I18n.t('settings.language')),
        React.createElement('div', { className:'relative' },
          React.createElement('button', {
            onClick: function(e) { e.stopPropagation(); setLangDropdownOpen(!langDropdownOpen); },
            className: 'w-full py-3 rounded-lg border-2 font-alfaslab text-sm transition-all flex items-center justify-between ' +
              'border-bitmap-orange bg-bitmap-orange/10 text-bitmap-orange'
          },
            React.createElement('span', { className: 'flex items-center gap-2' },
              langMap[language] ? langMap[language].f : '\uD83C\uDDEC\uD83C\uDDE7',
              langMap[language] ? langMap[language].n : 'English'
            ),
            React.createElement('span', { className: 'text-xs transition-transform' + (langDropdownOpen ? ' rotate-180' : '') }, '\u25BC')
          ),
          langDropdownOpen ? React.createElement('div', {
            className: 'absolute right-0 top-full mt-1 w-full bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1',
            onClick: function(e) { e.stopPropagation(); }
          },
            ['en', 'es', 'fr', 'ja', 'zh', 'lo', 'nl', 'ko', 'de', 'vi', 'id', 'el'].map(function(l) {
              var isSelected = language === l;
              var li = langMap[l] || {f:'\uD83C\uDDEC\uD83C\uDDE7',n:l};
              return React.createElement('button', {
                key: l,
                onClick: function() { handleLanguageSelect(l); },
                className: 'w-full px-4 py-2 text-left font-acme text-sm transition-all flex items-center gap-2 ' +
                  (isSelected ? 'bg-bitmap-orange/10 text-bitmap-orange' : 'text-bitmap-text hover:bg-bitmap-black/30 hover:text-white')
              },
                React.createElement('span', { className: 'flex items-center gap-2' },
                  li.f,
                  li.n
                ),
                isSelected ? React.createElement('span', { className: 'ml-auto text-bitmap-orange' }, '\u2713') : null
              );
            }),
            React.createElement('div', { className: 'border-t border-bitmap-border my-1' }),
            React.createElement('button', {
              onClick: function(e) { e.stopPropagation(); handleSave(); },
              disabled: isSaving,
              className: 'w-full px-4 py-2 font-alfaslab text-xs text-center transition-colors ' +
                'bg-bitmap-orange text-white rounded-lg hover:bg-bitmap-orange/80 disabled:opacity-50 mx-2 my-1'
            }, isSaving ? I18n.t('app.loading') : I18n.t('settings.save'))
          ) : null
        )
      ),

      React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-6' },
        React.createElement('h3', { className:'font-alfaslab text-lg text-white mb-4 flex items-center gap-2' },
          React.createElement('span', { className:'text-xl' }, '\uD83D\uDCCA'),
          ' ', I18n.t('settings.about')
        ),
        React.createElement('div', { className:'space-y-2 font-acme text-sm text-bitmap-text' },
          React.createElement('p', null, I18n.t('settings.appVersion')),
          React.createElement('p', { className:'text-bitmap-muted' }, I18n.t('settings.tagline'))
        )
      )
    )
  );
}