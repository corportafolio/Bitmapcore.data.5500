function SettingsPage(props) {
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
              language === 'en' ? '\uD83C\uDDEC\uD83C\uDDE7' : '\uD83C\uDDEA\uD83C\uDDF8',
              language === 'en' ? 'English' : 'Espa\u00F1ol'
            ),
            React.createElement('span', { className: 'text-xs transition-transform' + (langDropdownOpen ? ' rotate-180' : '') }, '\u25BC')
          ),
          langDropdownOpen ? React.createElement('div', {
            className: 'absolute right-0 top-full mt-1 w-full bg-bitmap-black border border-bitmap-border rounded-lg shadow-lg z-50 py-1',
            onClick: function(e) { e.stopPropagation(); }
          },
            ['en', 'es'].map(function(l) {
              var isSelected = language === l;
              return React.createElement('button', {
                key: l,
                onClick: function() { handleLanguageSelect(l); },
                className: 'w-full px-4 py-2 text-left font-acme text-sm transition-all flex items-center gap-2 ' +
                  (isSelected ? 'bg-bitmap-orange/10 text-bitmap-orange' : 'text-bitmap-text hover:bg-bitmap-black/30 hover:text-white')
              },
                React.createElement('span', { className: 'flex items-center gap-2' },
                  l === 'en' ? '\uD83C\uDDEC\uD83C\uDDE7' : '\uD83C\uDDEA\uD83C\uDDF8',
                  l === 'en' ? 'English' : 'Espa\u00F1ol'
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