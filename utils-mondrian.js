const { createCanvas } = require('canvas');

const MondrianGenerator = {
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

    if (totalTransactions === 0 && transactions.length > 0) totalTransactions = transactions.length;
    if (totalTransactions === 0) { totalTransactions = Math.abs(blockNumber % 7 + 3); isPerfect = true; }
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
      if (totalTransactions === 1) this._drawSingleCell(ctx, size);
      else this._drawPerfectGrid(ctx, totalTransactions, size, isPunk);
    } else {
      this._drawMondrianPacking(ctx, blockNumber, totalTransactions, hash, isPerfect, isPunk, size);
    }
  },

  _drawSingleCell: function(ctx, size) {
    var a = size - this.BORDER * 2;
    ctx.fillStyle = '#FE3E00';
    ctx.fillRect(this.BORDER, this.BORDER, a, a);
  },

  _drawSpecial1Tx: function(ctx, size) {
    var m = 5, a = size - m * 2;
    ctx.fillStyle = '#FE3E00'; ctx.fillRect(m, m, a, a);
  },

  _drawSpecial2Tx: function(ctx, size) {
    var m = 5, aw = size - m * 2, ah = size - m * 2;
    var totalH = 1.75, h1 = ah * 0.75 / totalH, h2 = ah * 1.0 / totalH;
    ctx.fillStyle = '#FE3E00';
    ctx.fillRect(m, m, aw, h1);
    ctx.fillRect(m, m + h1 + m, aw, h2);
  },

  _draw2txPunk: function(ctx, size, neckType) {
    var sideM = 40, tbM = 5, aw = size - sideM * 2, ah = size - tbM * 2;
    var proportion = neckType === 1 ? 0.75 : neckType === 3 ? 0.25 : 0.50;
    var h1 = (ah - tbM) / (1 + proportion), h2 = h1 * proportion;
    ctx.fillStyle = '#FE3E00';
    ctx.fillRect(sideM, tbM, aw, h1);
    var tx2Left = neckType === 4 ? size - sideM - aw * proportion : sideM;
    ctx.fillRect(tx2Left, tbM + h1 + tbM, aw * proportion, h2);
  },

  _drawPerfectGrid: function(ctx, tx, size, isPunk) {
    var BASE = 5, EXTRA = 5, B = this.BORDER;
    var spec = this._getPerfectSpec(tx, isPunk);
    var cols = spec[0], rows = spec[1], mtb = spec[2], mside = spec[3], negras = spec[4];
    var aw = size - B * 2 - mside * 2, ah = size - B * 2 - mtb * 2;
    var contentW = cols * BASE + Math.max(cols - 1, 0) * BASE;
    var contentH = rows * BASE + Math.max(rows - 1, 0) * BASE;
    var cellSize = Math.min((aw - contentW) / cols, (ah - contentH) / rows);
    cellSize = Math.max(cellSize, 0.2);
    var actualW = cols * cellSize + Math.max(cols - 1, 0) * BASE;
    var filledRows = Math.ceil(tx / cols);
    var drawnH = filledRows * cellSize + Math.max(filledRows - 1, 0) * BASE;
    var oX = B + mside + (aw - actualW) / 2;
    var oY = B + mtb + (ah - drawnH) / 2;
    ctx.fillStyle = '#FE3E00';
    var idx = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (idx >= tx) return;
        var isInNeck = isPunk && negras > 0 && this._isNeckCell(r, c, cols, rows, negras);
        if (!isInNeck) {
          ctx.fillRect(oX + c * (cellSize + BASE), oY + r * (cellSize + BASE), cellSize, cellSize);
          idx++;
        }
      }
    }
  },

  _getPerfectSpec: function(tx, isPunk) {
    var E = 5;
    switch (tx) {
      case 1: return [1, 1, 0, 0, 0]; case 2: return [1, 2, 0, 0, 0]; case 3: return [1, 3, E, 0, 0];
      case 4: return [2, 2, 0, 0, 0]; case 5: return isPunk ? [2, 3, 0, E, 1] : [3, 2, 0, 0, 0];
      case 6: return [3, 3, E, 0, 0]; case 7: return isPunk ? [4, 2, 0, E, 1] : [2, 4, 0, 0, 1];
      case 8: return [3, 3, 0, 0, 1]; case 9: return [3, 3, 0, 0, 0];
      case 10: return isPunk ? [3, 4, 0, 0, 2] : [2, 5, 0, 0, 0];
      case 11: return isPunk ? [3, 4, 0, 0, 1] : [2, 6, 0, 0, 0];
      case 12: return [3, 4, 0, 0, 0]; case 13: case 14: case 15: return [3, 5, 0, 0, 0];
      case 16: return [4, 4, 0, 0, 0];
      default:
        if (tx >= 17 && tx <= 24) return [5, 5, 0, 0, 25 - tx];
        if (tx >= 25 && tx <= 35) return [6, 6, 0, 0, 36 - tx];
        var g = Math.ceil(Math.sqrt(tx)); return [g, g, 0, 0, g * g - tx];
    }
  },

  _isNeckCell: function(row, col, cols, rows, negras) {
    var neckRows = Math.floor(negras / cols) + (negras % cols > 0 ? 1 : 0);
    var neckStartRow = Math.max(rows - neckRows, 0);
    var neckStartCol = negras % cols > 0 ? cols - (negras % cols) : 0;
    return row >= neckStartRow && col >= neckStartCol;
  },

  _seededRandom: function(seed) {
    var s = seed;
    return function() { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  },

  _getSizes: function(hash, txCount, isPerfect) {
    if (isPerfect) { var arr = []; for (var i = 0; i < txCount; i++) arr.push(1); return arr; }
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

  _hashCode: function(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return hash;
  },

  _adjustSizes: function(sizes) {
    if (sizes.length === 0) return sizes;
    var result = sizes.slice();
    var indexed = sizes.map(function(s, i) { return [i, s]; }).sort(function(a, b) { return b[1] - a[1]; });
    var txCount = sizes.length;
    var maxRatio = txCount >= 6000 ? 0.10 : txCount >= 5000 ? 0.20 : txCount >= 4000 ? 0.25 : txCount >= 3000 ? 0.30 : 0.40;
    var target = Math.max(Math.floor(sizes.length * maxRatio), 1);
    var reduceSet = {};
    for (var i = 0; i < Math.min(target, indexed.length); i++) reduceSet[indexed[i][0]] = true;
    for (var attempt = 0; attempt < 200; attempt++) {
      var effectiveArea = 0;
      for (var i = 0; i < sizes.length; i++) {
        var s = reduceSet[i] ? result[i] : sizes[i];
        effectiveArea += (s + 1) * (s + 1);
      }
      var gw = Math.ceil(Math.sqrt(effectiveArea));
      if (effectiveArea <= gw * gw) break;
      var candidates = [];
      for (var k in reduceSet) candidates.push([parseInt(k), result[parseInt(k)]]);
      candidates.sort(function(a, b) { return b[1] - a[1]; });
      var reduceCount = Math.max(Math.floor(candidates.length * 0.5), 1);
      for (var j = 0; j < reduceCount && j < candidates.length; j++) result[candidates[j][0]] = Math.max(candidates[j][1] * 0.7, 0.5);
    }
    return result;
  },

  _drawMondrianPacking: function(ctx, blockNumber, totalTransactions, hash, isPerfect, isPunk, size) {
    var B = this.BORDER;
    var hv = this._hashCode(hash);
    var sizes = this._getSizes(hash, totalTransactions, isPerfect);
    var adjusted = this._adjustSizes(sizes);
    var totalArea = 0;
    for (var i = 0; i < adjusted.length; i++) totalArea += adjusted[i] * adjusted[i];
    var gridW = Math.max(Math.ceil(Math.sqrt(totalArea)), 1);
    var grid = [];
    for (var i = 0; i < gridW * gridW; i++) grid.push(false);
    var positions = [];
    var seed = (hv + blockNumber) || blockNumber;
    var rand = this._seededRandom(seed);
    for (var i = 0; i < adjusted.length; i++) {
      var sz = Math.max(Math.round(adjusted[i]), 1);
      if (!this._placeLowest(grid, gridW, sz, positions)) this._placeRandom(grid, gridW, sz, positions, rand);
    }
    this._applyGravity(grid, gridW, positions);
    var minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      if (p.col < minC) minC = p.col; if (p.col + p.size - 1 > maxC) maxC = p.col + p.size - 1;
      if (p.row < minR) minR = p.row; if (p.row + p.size - 1 > maxR) maxR = p.row + p.size - 1;
    }
    if (positions.length === 0) return;
    var usedW = Math.max(maxC - minC + 1, 1), usedH = Math.max(maxR - minR + 1, 1);
    var cellW = (size - B * 2) / usedW, cellH = (size - B * 2) / usedH, padding = 0.5;
    ctx.fillStyle = '#FE3E00';
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var x = B + (p.col - minC) * cellW + padding, y = B + (p.row - minR) * cellH + padding;
      var w = Math.max(cellW * p.size - 2 * padding, 1), h = Math.max(cellH * p.size - 2 * padding, 1);
      ctx.fillRect(x, y, w, h);
    }
  },

  _placeLowest: function(grid, gw, sz, positions) {
    var maxPos = gw - sz + 1; if (maxPos <= 0) return false;
    for (var row = 0; row < maxPos; row++) {
      for (var col = 0; col < maxPos; col++) {
        if (this._canPlace(grid, col, row, sz, gw)) {
          for (var r = row; r < row + sz; r++) for (var c = col; c < col + sz; c++) grid[r * gw + c] = true;
          positions.push({ col: col, row: row, size: sz });
          return true;
        }
      }
    }
    return false;
  },

  _placeRandom: function(grid, gw, sz, positions, rand) {
    var maxPos = gw - sz + 1; if (maxPos <= 0) return;
    var attempts = Math.min(200, gw * gw * 2);
    for (var a = 0; a < attempts; a++) {
      var col = Math.floor(rand() * maxPos), row = Math.floor(rand() * maxPos);
      if (this._canPlace(grid, col, row, sz, gw)) {
        for (var r = row; r < row + sz; r++) for (var c = col; c < col + sz; c++) grid[r * gw + c] = true;
        positions.push({ col: col, row: row, size: sz });
        return;
      }
    }
    this._placeLowest(grid, gw, sz, positions);
  },

  _canPlace: function(grid, col, row, sz, gw) {
    var endR = Math.min(row + sz, gw), endC = Math.min(col + sz, gw);
    for (var r = row; r < endR; r++) for (var c = col; c < endC; c++) if (grid[r * gw + c]) return false;
    return true;
  },

  _applyGravity: function(grid, gw, positions) {
    positions.sort(function(a, b) { return a.row - b.row; });
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      if (p.row + p.size >= gw) continue;
      var targetRow = p.row + p.size, canFall = true;
      for (var c = p.col; c < p.col + p.size; c++) if (grid[targetRow * gw + c]) { canFall = false; break; }
      if (canFall) {
        for (var r = p.row; r < p.row + p.size; r++) for (var c = p.col; c < p.col + p.size; c++) grid[r * gw + c] = false;
        var newRow = p.row + 1;
        for (var r = newRow; r < newRow + p.size; r++) for (var c = p.col; c < p.col + p.size; c++) grid[r * gw + c] = true;
        p.row = newRow;
      }
    }
  }
};

module.exports = MondrianGenerator;
