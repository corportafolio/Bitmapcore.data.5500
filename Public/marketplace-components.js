function MarketplaceBubble(props) {
  var name = props.name;
  var icon = props.icon;
  var listings = props.listings || 0;
  var floorPrice = props.floorPrice || 0;
  var sold = props.sold || 0;
  var images = props.images || [];
  var isDiscount = props.isDiscount;
  var onSelect = props.onSelect;

  return React.createElement('button', {
    onClick: onSelect,
    className:'flex items-center gap-4 w-full bg-bitmap-surface border border-bitmap-border rounded-xl p-4 hover:border-bitmap-orange transition-all text-left'
  },
    React.createElement('div', { className:'w-12 h-12 rounded-lg bg-bitmap-black flex items-center justify-center flex-shrink-0 text-2xl' }, icon),
    React.createElement('div', { className:'flex-1 min-w-0' },
      React.createElement('div', { className:'font-alfaslab text-sm text-white truncate' }, name),
      React.createElement('div', { className:'flex gap-3 mt-1' },
        React.createElement('span', { className:'font-acme text-xs text-bitmap-muted' }, listings + ' listados'),
        floorPrice > 0 ? React.createElement('span', { className:'font-acme text-xs text-bitmap-orange-light' }, 'Piso: ' + BitmapUtils.formatBtc(floorPrice)) : null,
        sold > 0 ? React.createElement('span', { className:'font-acme text-xs text-bitmap-muted' }, sold + ' vendidos') : null
      )
    ),
    isDiscount ? React.createElement('div', { className:'bg-bitmap-green text-white text-xs font-alfaslab px-2 py-1 rounded-full' }, 'OFF') : null,
    React.createElement('span', { className:'text-bitmap-muted text-sm' }, '\u203A')
  );
}

function MarketPreview(props) {
  var listings = props.listings || [];
  var marketplace = props.marketplace;

  if (listings.length === 0) {
    return React.createElement('div', { className:'text-center py-8 font-acme text-bitmap-muted text-sm' }, I18n.t('marketplace.noListings'));
  }

  return React.createElement('div', { className:'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' },
    listings.slice(0, 8).map(function(listing, i) {
      var blockNum = listing.blockNumber || listing.block || i;
      return React.createElement('button', {
        key: i,
        className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all text-left'
      },
        React.createElement('div', { className:'w-full aspect-square mb-2 rounded-lg overflow-hidden bg-bitmap-black' },
          React.createElement(MondrianCanvas, { blockNumber:blockNum, transactions:[], size:200 })
        ),
        React.createElement('div', { className:'font-alfaslab text-sm text-white' }, 'Block #' + blockNum),
        React.createElement('div', { className:'font-acme text-xs text-bitmap-orange-light' },
          listing.price ? BitmapUtils.formatBtc(listing.price) + ' BTC' : 'N/A'
        )
      );
    })
  );
}

function FloorPrice(props) {
  var price = props.price || 0;
  var marketplace = props.marketplace;

  return React.createElement('div', { className:'flex items-center justify-between bg-bitmap-surface border border-bitmap-border rounded-lg p-3' },
    React.createElement('span', { className:'font-alfaslab text-xs text-bitmap-muted' }, 'Piso ' + (marketplace || '')),
    React.createElement('span', { className:'font-acme text-sm font-semibold text-bitmap-orange-light' }, BitmapUtils.formatBtc(price) + ' BTC')
  );
}

function SaleCard(props) {
  var blockNumber = props.blockNumber;
  var price = props.price;
  var date = props.date;
  var marketplace = props.marketplace;
  var image = props.image;

  return React.createElement('div', { className:'flex items-center gap-3 bg-bitmap-surface border border-bitmap-border rounded-lg p-3' },
    React.createElement('div', { className:'w-12 h-12 rounded-lg overflow-hidden bg-bitmap-black flex-shrink-0' },
      image ? React.createElement('img', { src:image, alt:'Block ' + blockNumber, className:'w-full h-full object-cover' }) :
      React.createElement(MondrianCanvas, { blockNumber:blockNumber, transactions:[], size:48 })
    ),
    React.createElement('div', { className:'min-w-0 flex-1' },
      React.createElement('div', { className:'font-alfaslab text-sm text-white' }, 'Block #' + blockNumber),
      React.createElement('div', { className:'font-acme text-xs text-bitmap-muted' }, (marketplace || '') + ' \u2022 ' + (date || ''))
    ),
    React.createElement('div', { className:'font-acme text-sm font-semibold text-bitmap-orange-light' },
      BitmapUtils.formatBtcSat(price) + ' BTC'
    )
  );
}

function TagGroupCard(props) {
  var tag = props.tag;
  var count = props.count;
  var floorPrice = props.floorPrice || 0;
  var onSelect = props.onSelect;

  return React.createElement('button', {
    onClick: onSelect,
    className:'flex items-center justify-between w-full bg-bitmap-surface border border-bitmap-border rounded-lg p-3 hover:border-bitmap-orange transition-all text-left'
  },
    React.createElement('div', null,
      React.createElement('div', { className:'font-alfaslab text-sm font-semibold text-white' }, tag),
      React.createElement('div', { className:'font-acme text-xs text-bitmap-muted' }, count + ' bloques')
    ),
    React.createElement('div', { className:'font-acme text-sm text-bitmap-orange-light' },
      BitmapUtils.formatBtc(floorPrice) + ' BTC'
    )
  );
}

function DiscountBadge(props) {
  var percentage = props.percentage || 0;
  var originalPrice = props.originalPrice || 0;
  var discountPrice = props.discountPrice || 0;

  return React.createElement('div', { className:'relative' },
    React.createElement('div', { className:'absolute top-2 right-2 z-10 bg-bitmap-green text-white text-xs font-alfaslab px-2 py-1 rounded-full' }, '-' + percentage + '%'),
    React.createElement('div', { className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3' },
      React.createElement('div', { className:'flex items-baseline gap-2' },
        React.createElement('span', { className:'font-acme text-sm text-bitmap-green font-semibold' }, BitmapUtils.formatBtc(discountPrice) + ' BTC'),
        React.createElement('span', { className:'font-acme text-xs text-bitmap-muted line-through' }, BitmapUtils.formatBtc(originalPrice))
      )
    )
  );
}

function SelectorBubble(props) {
  var name = props.name;
  var logo = props.logo;
  var icon = props.icon;
  var listings = props.listings || 0;
  var floorPrice = props.floorPrice || 0;
  var sold = props.sold || 0;
  var previews = props.previews || [];
  var onClick = props.onClick;

  var _off = React.useState(0);
  var offset = _off[0];
  var setOffset = _off[1];

  var floorBtc = floorPrice > 0 && floorPrice !== 0x7fffffffffffffff ? BitmapUtils.formatBtc(floorPrice) : 'N/A';
  var listingsFmt = listings > 0 ? listings.toLocaleString() : 'N/A';

  var hasArrow = previews.length > 1;
  var visible = previews.length > 0
    ? previews.slice(offset).concat(previews.slice(0, offset))
    : [];

  function handleArrow(e) {
    e.stopPropagation();
    setOffset(previews.length > 0 ? (offset + 1) % previews.length : 0);
  }

  function buildImageUrl(p) {
    var bn = p.blockNumber || 0;
    var et = encodeURIComponent(p.etiquetas || '');
    var tx = p.totalTransacciones || 0;
    var h = encodeURIComponent(p.hash || '');
    var isPerfect = (p.etiquetas || '').indexOf('Perfect') !== -1;
    var isPunk = (p.etiquetas || '').indexOf('Punk') !== -1;
    return '/api/v1/block-image/' + bn + '?size=80&etiquetas=' + et + '&tx=' + tx + '&hash=' + h + '&perfect=' + isPerfect + '&punk=' + isPunk;
  }

  return React.createElement('div', {
    className:'bg-bitmap-surface border border-bitmap-border rounded-xl p-3 hover:border-bitmap-orange transition-all'
  },
    React.createElement('div', { className:'flex items-center justify-between mb-2 cursor-pointer', onClick: onClick },
      React.createElement('span', { className:'font-alfaslab text-sm text-white tracking-wide' }, name),
      logo ? React.createElement('img', { src:logo, alt:name, className:'h-8 w-8 object-contain' }) :
      icon ? React.createElement('span', { className:'text-xl' }, icon) : null
    ),
    React.createElement('div', { className:'flex gap-2 mb-2' },
      React.createElement('span', { className:'font-acme text-xs text-bitmap-muted' },
        React.createElement('span', { className:'text-bitmap-orange' }, 'Listados: '), listingsFmt
      ),
      React.createElement('span', { className:'font-acme text-xs text-bitmap-muted' },
        ' / ',
        React.createElement('span', { className:'text-bitmap-orange' }, 'Piso: '), floorBtc
      )
    ),
    visible.length > 0 ? React.createElement('div', { className:'flex items-center gap-[2px]' },
      React.createElement('div', { className:'flex gap-[2px] overflow-x-hidden flex-1' },
        visible.map(function(preview, i) {
          var priceBtc = preview.listedPrice ? BitmapUtils.formatBtcSat(preview.listedPrice) : 'N/A';
          return React.createElement('div', {
            key: preview.blockNumber + '-' + offset + '-' + i,
            className:'flex flex-col items-center bg-bitmap-black rounded-lg p-1 flex-shrink-0',
            style: { minWidth: 82 }
          },
            React.createElement('span', { className:'font-acme text-[10px] text-bitmap-orange-light whitespace-nowrap' }, priceBtc),
            React.createElement('img', {
              src: buildImageUrl(preview),
              alt: '#' + (preview.blockNumber || '?'),
              className:'w-[80px] h-[80px] rounded mt-1',
              style: { imageRendering: 'pixelated', background: '#1a1a1a' },
              loading: 'lazy'
            }),
            React.createElement('span', { className:'font-alfaslab text-[9px] text-bitmap-orange mt-1' }, '#' + (preview.blockNumber || '?')),
            preview.source ? React.createElement('span', { className:'font-acme text-[7px] text-bitmap-muted mt-0.5' }, preview.source) : null
          );
        })
      ),
      hasArrow ? React.createElement('button', {
        onClick: handleArrow,
        className:'flex items-center justify-center w-[28px] h-[80px] bg-bitmap-black border border-bitmap-border rounded-lg flex-shrink-0 hover:border-bitmap-orange transition-colors cursor-pointer'
      },
        React.createElement('svg', { width:'14', height:'14', viewBox:'0 0 24 24', fill:'none', stroke:'var(--bitmap-orange)', strokeWidth:'2.5', strokeLinecap:'round', strokeLinejoin:'round' },
          React.createElement('polyline', { points:'9 18 15 12 9 6' })
        )
      ) : null
    ) : React.createElement('div', { className:'font-acme text-[10px] text-bitmap-muted' }, 'Sin previsualizaciones')
  );
}