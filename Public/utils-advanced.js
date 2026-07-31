var BITMAP_YELLOW = '#FFD700';

var MondrianGenerator = {
  BORDER: 3,
  MIN_PARCEL_PX: 0.2,

  generate: function(canvas, blockNumber, options, size) {
    size = size || 320;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    options = options || {};
    var totalTransactions = options.totalTransactions || 0;
    var hash = options.hash || '';
    var isPerfect = options.isPerfect || false;
    var isPunk = options.isPunk || false;
    var etiquetas = options.etiquetas || '';
    var transactions = options.transactions || [];

    if (totalTransactions === 0 && transactions.length > 0) {
      totalTransactions = transactions.length;
    }
    if (totalTransactions === 0) {
      totalTransactions = Math.abs(blockNumber % 7 + 3);
      isPerfect = true;
    }
    totalTransactions = Math.max(totalTransactions, 1);

    var labelsLower = etiquetas.toLowerCase();
    var is1Tx = labelsLower.split(/[|,]/).some(function(t) { return t.trim() === '1 tx'; });
    var is2Tx = labelsLower.split(/[|,]/).some(function(t) { return t.trim() === '2 tx'; });
    var isWideNeckPunk = labelsLower.indexOf('wide neck punk') !== -1;
    var isStandarPunk = labelsLower.indexOf('standar punk') !== -1;
    var isPristinePunk = labelsLower.indexOf('pristine punk') !== -1;
    var isPunk2tx = labelsLower.indexOf('punk 2tx') !== -1;
    var isSpecial2txPunk = isWideNeckPunk || isStandarPunk || isPristinePunk || isPunk2tx;

    if (totalTransactions === 1 && is1Tx) {
      this._drawSpecial1Tx(ctx, size);
    } else if (totalTransactions === 2 && is2Tx && !isSpecial2txPunk) {
      this._drawSpecial2Tx(ctx, size);
    } else if (totalTransactions === 2 && isSpecial2txPunk) {
      var neckType = isWideNeckPunk ? 1 : isStandarPunk ? 2 : isPristinePunk ? 3 : 4;
      this._draw2txPunk(ctx, size, neckType);
    } else if ((isPerfect || isPunk) && totalTransactions <= 35) {
      if (totalTransactions === 1) {
        this._drawSingleCell(ctx, size);
      } else {
        this._drawPerfectGrid(ctx, totalTransactions, size, isPunk);
      }
    } else {
      this._drawMondrianPacking(ctx, totalTransactions, hash, isPerfect, size);
    }
  },

  _drawSingleCell: function(ctx, size) {
    var a = size - this.BORDER * 2;
    ctx.fillStyle = BITMAP_YELLOW;
    ctx.fillRect(this.BORDER, this.BORDER, a, a);
  },

  _drawSpecial1Tx: function(ctx, size) {
    var m = 5;
    var a = size - m * 2;
    ctx.fillStyle = BITMAP_YELLOW;
    ctx.fillRect(m, m, a, a);
  },

  _drawSpecial2Tx: function(ctx, size) {
    var m = 5;
    var aw = size - m * 2;
    var ah = size - m * 2;
    var totalH = 0.75 + 1.0;
    var h1 = ah * 0.75 / totalH;
    var h2 = ah * 1.0 / totalH;
    ctx.fillStyle = BITMAP_YELLOW;
    ctx.fillRect(m, m, aw, h1);
    ctx.fillRect(m, m + h1 + m, aw, h2);
  },

  _draw2txPunk: function(ctx, size, neckType) {
    var sideM = 40, tbM = 5;
    var aw = size - sideM * 2;
    var ah = size - tbM * 2;
    var proportion = neckType === 1 ? 0.75 : neckType === 3 ? 0.25 : 0.50;
    var h1 = (ah - tbM) / (1 + proportion);
    var h2 = h1 * proportion;
    ctx.fillStyle = BITMAP_YELLOW;
    ctx.fillRect(sideM, tbM, aw, h1);
    var tx2Left = neckType === 4 ? size - sideM - aw * proportion : sideM;
    ctx.fillRect(tx2Left, tbM + h1 + tbM, aw * proportion, h2);
  },

  _drawPerfectGrid: function(ctx, tx, size, isPunk) {
    var BASE = 5, EXTRA = 5, B = this.BORDER;
    var spec = this._getPerfectSpec(tx, isPunk);
    var cols = spec[0], rows = spec[1], mtb = spec[2], mside = spec[3], negras = spec[4];

    var aw = size - B * 2 - mside * 2;
    var ah = size - B * 2 - mtb * 2;
    var contentW = cols * BASE + Math.max(cols - 1, 0) * BASE;
    var contentH = rows * BASE + Math.max(rows - 1, 0) * BASE;
    var cellSize = Math.min((aw - contentW) / cols, (ah - contentH) / rows);
    cellSize = Math.max(cellSize, 0.2);

    var actualW = cols * cellSize + Math.max(cols - 1, 0) * BASE;
    var filledRows = Math.ceil(tx / cols);
    var drawnH = filledRows * cellSize + Math.max(filledRows - 1, 0) * BASE;
    var oX = B + mside + (aw - actualW) / 2;
    var oY = B + mtb + (ah - drawnH) / 2;

    ctx.fillStyle = BITMAP_YELLOW;
    var idx = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (idx >= tx) return;
        var isInNeck = isPunk && negras > 0 && this._isNeckCell(r, c, cols, rows, negras);
        if (!isInNeck) {
          var x = oX + c * (cellSize + BASE);
          var y = oY + r * (cellSize + BASE);
          ctx.fillRect(x, y, cellSize, cellSize);
          idx++;
        }
      }
    }
  },

  _getPerfectSpec: function(tx, isPunk) {
    var E = 5;
    switch (tx) {
      case 1: return [1, 1, 0, 0, 0];
      case 2: return [1, 2, 0, 0, 0];
      case 3: return [1, 3, E, 0, 0];
      case 4: return [2, 2, 0, 0, 0];
      case 5: return isPunk ? [2, 3, 0, E, 1] : [3, 2, 0, 0, 0];
      case 6: return [3, 3, E, 0, 0];
      case 7: return isPunk ? [4, 2, 0, E, 1] : [2, 4, 0, 0, 1];
      case 8: return [3, 3, 0, 0, 1];
      case 9: return [3, 3, 0, 0, 0];
      case 10: return isPunk ? [3, 4, 0, 0, 2] : [2, 5, 0, 0, 0];
      case 11: return isPunk ? [3, 4, 0, 0, 1] : [2, 6, 0, 0, 0];
      case 12: return [3, 4, 0, 0, 0];
      case 13: case 14: case 15: return [3, 5, 0, 0, 0];
      case 16: return [4, 4, 0, 0, 0];
      default:
        if (tx >= 17 && tx <= 24) return [5, 5, 0, 0, 25 - tx];
        if (tx >= 25 && tx <= 35) return [6, 6, 0, 0, 36 - tx];
        var g = Math.ceil(Math.sqrt(tx));
        return [g, g, 0, 0, g * g - tx];
    }
  },

  _isNeckCell: function(row, col, cols, rows, negras) {
    var neckRows = Math.floor(negras / cols) + (negras % cols > 0 ? 1 : 0);
    var neckStartRow = Math.max(rows - neckRows, 0);
    var neckStartCol = negras % cols > 0 ? cols - (negras % cols) : 0;
    return row >= neckStartRow && col >= neckStartCol;
  },

  _generateSimulatedWeights: function(blockNumber, hash, count) {
    var seedStr = hash.replace(/[^0-9]/g, '').substring(0, 8);
    var seed = parseInt(seedStr, 10) || blockNumber;
    var rand = this._seededRandom(seed);
    var weights = [];
    for (var i = 0; i < count; i++) {
      var r = rand();
      var w = Math.pow(r, 4.5) * 15000;
      weights.push(Math.max(Math.floor(w), 100));
    }
    return weights;
  },

  _seededRandom: function(seed) {
    var s = seed;
    return function() {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  },

  _hashCode: function(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  },

  _getSizes: function(hash, txCount, isPerfect) {
    if (isPerfect) {
      var arr = [];
      for (var i = 0; i < txCount; i++) arr.push(1);
      return arr;
    }
    var lists = {
      tiny: [1, 4, 3.4, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      small: [0.9, 1.4, 1.8, 2.3, 2.7, 3.2, 3.6, 4.5, 5, 5.5, 5.9, 6.3],
      medium: [0.8, 1.5, 2.2, 2.9, 3.6, 4.3, 5, 5.7, 6.4, 6.9, 7.4],
      large: [0.8, 1.4, 2, 2.6, 3.2, 3.8, 4.4, 5, 5.6, 6.2, 6.8],
      xlarge1: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7],
      xlarge2: [0.8, 1.3, 1.8, 2.3, 2.8, 3.3, 3.8, 4.3, 4.8, 5.3, 5.8],
      xxlarge1: [0.6, 1.2, 1.8, 2.4, 3, 3.6, 4.2, 4.8, 5.4, 6],
      xxlarge2: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5],
      xxlarge3: [0.4, 0.8, 1.2, 1.6, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5],
      mega: [0.3, 0.6, 1, 1.4, 1.8, 2.2, 2.6, 3, 3.4, 3.8, 4.2]
    };
    var list;
    if (txCount < 20) list = lists.tiny;
    else if (txCount <= 100) list = lists.small;
    else if (txCount <= 500) list = lists.medium;
    else if (txCount <= 1999) list = lists.large;
    else if (txCount <= 2999) list = lists.xlarge1;
    else if (txCount <= 3999) list = lists.xlarge2;
    else if (txCount <= 4999) list = lists.xxlarge1;
    else if (txCount <= 5999) list = lists.xxlarge2;
    else if (txCount <= 6999) list = lists.xxlarge3;
    else list = lists.mega;

    var hv = this._hashCode(hash);
    var sizes = [];
    for (var i = 0; i < txCount; i++) {
      var idx = Math.abs((hv + i * 17 + i * i) % list.length);
      sizes.push(list[idx]);
    }
    return sizes;
  },

  _adjustSizesAndArea: function(sizes) {
    var limit = Math.ceil(Math.sqrt(sizes.length)) * 4;
    var result = sizes.slice();
    var totalArea = 0;
    for (var i = 0; i < sizes.length; i++) {
      var s = Math.round(result[i]);
      if (s > limit) result[i] = limit;
      totalArea += result[i] * result[i];
    }
    return { sizes: result, totalArea: totalArea };
  },

  _createMondrianLayout: function(width) {
    var rows = [];

    function getRow(pos) { return rows[pos.y]; }

    function addRow() {
      var newRow = { y: rows.length, slots: [], map: {} };
      rows.push(newRow);
      return newRow;
    }

    function addSlot(slot) {
      if (slot.r <= 0) return;
      var row = getRow(slot);
      if (!row) return;
      if (row.map[slot.x]) {
        if (slot.r > row.map[slot.x].r) row.map[slot.x].r = slot.r;
        return row.map[slot.x];
      }
      var insertAt = row.slots.length;
      for (var i = 0; i < row.slots.length; i++) {
        if (row.slots[i].x > slot.x) { insertAt = i; break; }
      }
      row.slots.splice(insertAt, 0, slot);
      row.map[slot.x] = slot;
      return slot;
    }

    function removeSlot(slot) {
      var row = getRow(slot);
      if (!row) return;
      delete row.map[slot.x];
      var idx = row.slots.indexOf(slot);
      if (idx >= 0) row.slots.splice(idx, 1);
    }

    function fillSlot(slot, squareWidth) {
      var left = slot.x;
      var right = slot.x + squareWidth;
      var bottom = slot.y;
      var top = slot.y + squareWidth;

      removeSlot(slot);

      for (var rowIndex = bottom; rowIndex < top; rowIndex++) {
        var row = getRow({ y: rowIndex });
        if (row) {
          var collisions = [];
          var maxExcess = 0;
          for (var i = 0; i < row.slots.length; i++) {
            var ts = row.slots[i];
            if (!(ts.x + ts.r <= left || ts.x >= right)) {
              collisions.push(ts);
              maxExcess = Math.max(maxExcess, Math.max(0, ts.x + ts.r - (left + slot.r)));
            }
          }
          if (right < width && !row.map[right]) {
            addSlot({ x: right, y: rowIndex, r: slot.r - squareWidth + maxExcess });
          }
          for (var j = 0; j < collisions.length; j++) {
            collisions[j].r = left - collisions[j].x;
            if (collisions[j].r <= 0) removeSlot(collisions[j]);
          }
        } else {
          addRow();
          if (left > 0) addSlot({ x: 0, y: rowIndex, r: left });
          if (right < width) addSlot({ x: right, y: rowIndex, r: width - right });
        }
      }

      for (var rowIndex = Math.max(0, bottom - squareWidth); rowIndex < bottom; rowIndex++) {
        var row = getRow({ y: rowIndex });
        if (!row) continue;
        for (var i = 0; i < row.slots.length; ) {
          var ts = row.slots[i];
          if (ts.x < right && ts.x + ts.r > left && ts.y + ts.r >= bottom) {
            var oldW = ts.r;
            ts.r = bottom - ts.y;
            var rem = { x: ts.x + ts.r, y: ts.y, w: oldW - ts.r, h: ts.r };
            if (ts.r <= 0) { removeSlot(ts); }
            while (rem.w > 0 && rem.h > 0) {
              if (rem.w <= rem.h) {
                addSlot({ x: rem.x, y: rem.y, r: rem.w });
                rem.y += rem.w; rem.h -= rem.w;
              } else {
                addSlot({ x: rem.x, y: rem.y, r: rem.h });
                rem.x += rem.h; rem.w -= rem.h;
              }
            }
            i = 0;
          } else {
            i++;
          }
        }
      }

      return { x: left, y: bottom, r: squareWidth };
    }

    return {
      place: function(size) {
        for (var ri = 0; ri < rows.length; ri++) {
          var row = rows[ri];
          for (var si = 0; si < row.slots.length; si++) {
            if (row.slots[si].r >= size) return fillSlot(row.slots[si], size);
          }
        }
        var row = addRow();
        var slot = addSlot({ x: 0, y: row.y, r: width });
        return fillSlot(slot, size);
      }
    };
  },

  _drawMondrianPacking: function(ctx, totalTransactions, hash, isPerfect, size) {
    var B = this.BORDER;
    var sizes = this._getSizes(hash, totalTransactions, isPerfect);
    var adj = this._adjustSizesAndArea(sizes);

    var gridW = Math.max(Math.ceil(Math.sqrt(adj.totalArea)), 1);

    var layout = this._createMondrianLayout(gridW);
    var positions = [];

    for (var i = 0; i < adj.sizes.length; i++) {
      var sz = Math.max(Math.round(adj.sizes[i]), 1);
      positions.push(layout.place(sz));
    }

    if (positions.length === 0) return;

    var minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      if (p.x < minC) minC = p.x;
      if (p.x + p.r - 1 > maxC) maxC = p.x + p.r - 1;
      if (p.y < minR) minR = p.y;
      if (p.y + p.r - 1 > maxR) maxR = p.y + p.r - 1;
    }

    var usedW = Math.max(maxC - minC + 1, 1);
    var usedH = Math.max(maxR - minR + 1, 1);
    var cellW = (size - B * 2) / usedW;
    var cellH = (size - B * 2) / usedH;
    var padding = 0.5;

    ctx.fillStyle = BITMAP_YELLOW;
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var x = B + (p.x - minC) * cellW + padding;
      var y = B + (p.y - minR) * cellH + padding;
      var w = cellW * p.r - 2 * padding;
      var h = cellH * p.r - 2 * padding;
      if (w < 1) w = 1;
      if (h < 1) h = 1;
      ctx.fillRect(x, y, w, h);
    }
  }
};

var TagClassifier = {
  classify: function(blockNumber) {
    var n = blockNumber;
    if (n % 10000 === 0) return 'Pumpkin';
    if (n % 7777 === 0) return 'Diamond';
    if (n % 5555 === 0) return 'Gold';
    if (n % 3333 === 0) return 'Ruby';
    if (n % 2222 === 0) return 'Emerald';
    if (n % 1111 === 0) return 'Sapphire';
    if (n % 1000 === 0) return 'Silver';
    if (n % 500 === 0) return 'Bronze';
    if (n % 250 === 0) return 'Platinum';
    if (n % 100 === 0) return 'Jade';
    return null;
  },
  getBlocksByTag: function(tag, maxResults) {
    maxResults = maxResults || 20;
    var results = [];
    var multiplier = { Pumpkin:10000, Diamond:7777, Gold:5555, Ruby:3333, Emerald:2222, Sapphire:1111, Silver:1000, Bronze:500, Platinum:250, Jade:100 };
    var m = multiplier[tag];
    if (!m) return results;
    for (var i = 1; i <= maxResults; i++) {
      results.push({ blockNumber: m * i, tag: tag, price: 0.001 * i });
    }
    return results;
  }
};

var ImageProcessor = {
  createThumbnail: function(blockNumber, size) {
    return ImageViewModel.getImage(blockNumber, {}, size || 150);
  },
  loadImage: function(url, callback) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() { callback(null, img); };
    img.onerror = function() { callback(new Error('Failed to load image')); };
    img.src = url;
  }
};

var PollingManager = {
  intervals: {},
  start: function(key, interval, callback) {
    PollingManager.stop(key);
    PollingManager.intervals[key] = window.setInterval(function() {
      if (document.hidden) return;
      callback();
    }, interval || BitmapConstants.POLLING_INTERVAL);
  },
  stop: function(key) {
    if (PollingManager.intervals[key]) {
      clearInterval(PollingManager.intervals[key]);
      delete PollingManager.intervals[key];
    }
  },
  stopAll: function() {
    var keys = Object.keys(PollingManager.intervals);
    for (var i = 0; i < keys.length; i++) {
      PollingManager.stop(keys[i]);
    }
  }
};

var IndexedDBCache = {
  open: function(dbName, version, storeName) {
    return new Promise(function(resolve, reject) {
      var request = indexedDB.open(dbName, version || 1);
      request.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(storeName || 'data')) {
          db.createObjectStore(storeName || 'data');
        }
      };
      request.onsuccess = function(e) { resolve(e.target.result); };
      request.onerror = function(e) { reject(e.target.error); };
    });
  },
  save: function(dbName, key, value) {
    return IndexedDBCache.open(dbName).then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction('data', 'readwrite');
        tx.objectStore('data').put(value, key);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function(e) { reject(e.target.error); };
      });
    });
  },
  load: function(dbName, key) {
    return IndexedDBCache.open(dbName).then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction('data', 'readonly');
        var req = tx.objectStore('data').get(key);
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = function(e) { reject(e.target.error); };
      });
    });
  }
};

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    PollingManager.stopAll();
  }
});
