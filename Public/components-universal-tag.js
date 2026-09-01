function translateTagText(text) {
  if (!text) return text;
  if (typeof I18n === 'undefined' || !I18n.getCurrentLang) return text;
  var lang = I18n.getCurrentLang();
  if (lang === 'es') return text;
  var lower = text.toLowerCase();
  if (lang === 'fr') {
    if (lower.indexOf('multimillonaria') !== -1) {
      return text.replace(/multimillonaria/gi, 'Multimillionnaire');
    }
    if (lower.indexOf('millonaria') !== -1) {
      return text.replace(/millonaria/gi, 'Millionnaire');
    }
    return text;
  }
  if (lower.indexOf('multimillonaria') !== -1) {
    return text.replace(/multimillonaria/gi, 'Multimillionaire');
  }
  if (lower.indexOf('millonaria') !== -1) {
    return text.replace(/millonaria/gi, 'Millionaire');
  }
  return text;
}

function UniversalTag(props) {
  var text = translateTagText(props.text);
  var fontSize = props.fontSize || 12;
  var onPress = props.onPress;
  var paddingH = Math.round(fontSize * 0.28);
  var paddingV = Math.round(fontSize * 0.16);

  return React.createElement('span', {
    onClick: onPress,
    style: {
      display: 'inline-block',
      backgroundColor: '#8B2500',
      color: '#000000',
      textShadow: '-1px 0 #FE3E00, 0 1px #FE3E00, 1px 0 #FE3E00, 0 -1px #FE3E00',
      fontFamily: "'Alfa Slab One', serif",
      fontWeight: 'bold',
      fontSize: fontSize + 'px',
      borderRadius: '15px',
      border: '1px solid #B53D00',
      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
      paddingLeft: paddingH + 'px',
      paddingRight: paddingH + 'px',
      paddingTop: paddingV + 'px',
      paddingBottom: paddingV + 'px',
      lineHeight: 1.2,
      cursor: onPress ? 'pointer' : 'default',
      whiteSpace: 'nowrap'
    },
    className: onPress ? 'hover:opacity-80 transition-opacity' : ''
  }, text);
}

function UniversalTagList(props) {
  var etiquetas = props.etiquetas;
  var fontSize = props.fontSize || 12;
  var navigate = props.navigate;

  if (!etiquetas || etiquetas === '') return null;

  var tags = etiquetas.split('|').filter(function(t) { return t.trim() !== ''; });

  return React.createElement('div', { className:'flex flex-wrap gap-1.5' },
    tags.map(function(tag, i) {
      return React.createElement(UniversalTag, {
        key: i,
        text: tag.trim(),
        fontSize: fontSize,
        onPress: navigate ? function() { navigate('/tag-tables/' + encodeURIComponent(tag.trim())); } : undefined
      });
    })
  );
}
