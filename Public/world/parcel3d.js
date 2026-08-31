var Parcel3D = (function() {

  function isTransparent(r, g, b, a) {
    if (a !== undefined && a < 10) return true;
    return r < 5 && g < 5 && b < 5;
  }

  function colorDist(r1, g1, b1, r2, g2, b2) {
    var dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
    return dr * dr + dg * dg + db * db;
  }

  function extractCellPixels(imageData, cellCol, cellRow, cellSize) {
    var pixels = [];
    var imgWidth = imageData.width;
    var startX = cellCol * cellSize;
    var startY = cellRow * cellSize;

    for (var y = 0; y < cellSize; y++) {
      var row = [];
      for (var x = 0; x < cellSize; x++) {
        var idx = ((startY + y) * imgWidth + (startX + x)) * 4;
        var r = imageData.data[idx];
        var g = imageData.data[idx + 1];
        var b = imageData.data[idx + 2];
        var a = imageData.data[idx + 3];
        if (isTransparent(r, g, b, a)) {
          row.push(null);
        } else {
          row.push({ r: r, g: g, b: b });
        }
      }
      pixels.push(row);
    }
    return pixels;
  }

  function colorsMatch(c1, c2) {
    if (!c1 || !c2) return false;
    return colorDist(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b) < 1800;
  }

  function detectRectangles(pixels) {
    var cellSize = pixels.length;
    var visited = [];
    for (var y = 0; y < cellSize; y++) {
      visited[y] = [];
      for (var x = 0; x < cellSize; x++) {
        visited[y][x] = false;
      }
    }

    var rects = [];

    for (var y = 0; y < cellSize; y++) {
      for (var x = 0; x < cellSize; x++) {
        if (visited[y][x] || !pixels[y][x]) continue;

        var baseColor = pixels[y][x];
        var w = 0;
        while (x + w < cellSize && colorsMatch(pixels[y][x + w], baseColor)) w++;

        var h = 1;
        var canExpand = true;
        while (canExpand && y + h < cellSize) {
          for (var dx = 0; dx < w; dx++) {
            if (!colorsMatch(pixels[y + h][x + dx], baseColor)) { canExpand = false; break; }
          }
          if (canExpand) h++;
        }

        for (var dy = 0; dy < h; dy++) {
          for (var dx = 0; dx < w; dx++) {
            visited[y + dy][x + dx] = true;
          }
        }

        rects.push({
          x: x, y: y, w: w, h: h,
          cr: baseColor.r, cg: baseColor.g, cb: baseColor.b
        });
      }
    }

    return mergeRects(rects, pixels, cellSize);
  }

  function mergeRects(rects, pixels, cellSize) {
    var merged = true;
    while (merged) {
      merged = false;
      for (var i = 0; i < rects.length; i++) {
        for (var j = i + 1; j < rects.length; j++) {
          var a = rects[i], b = rects[j];
          if (!a || !b) continue;

          var canMerge = false;

          if (a.y === b.y && a.h === b.h && colorsMatch(a, b)) {
            if (a.x + a.w === b.x || b.x + b.w === a.x) canMerge = true;
          }
          if (a.x === b.x && a.w === b.w && colorsMatch(a, b)) {
            if (a.y + a.h === b.y || b.y + b.h === a.y) canMerge = true;
          }

          if (canMerge) {
            var nx = Math.min(a.x, b.x);
            var ny = Math.min(a.y, b.y);
            var nw = Math.max(a.x + a.w, b.x + b.w) - nx;
            var nh = Math.max(a.y + a.h, b.y + b.h) - ny;

            if (nw * nh <= a.w * a.h + b.w * b.h + 2) {
              rects[i] = { x: nx, y: ny, w: nw, h: nh, cr: a.cr, cg: a.cg, cb: a.cb };
              rects.splice(j, 1);
              merged = true;
              break;
            }
          }
        }
        if (merged) break;
      }
    }

    return rects.filter(function(r) { return r && r.w > 0 && r.h > 0; });
  }

  function getParcelHeight(tx, rectIndex, hash) {
    var BASE = 0.08;
    var MAX = 0.55;
    var factor = Math.min(tx / 2000, 1.0);
    var hv = 0;
    for (var i = 0; i < hash.length; i++) {
      hv = ((hv << 5) - hv) + hash.charCodeAt(i);
      hv |= 0;
    }
    var variation = 0.5 + 0.5 * Math.abs(Math.sin(hv + rectIndex * 17));
    return BASE + (MAX - BASE) * factor * variation;
  }

  function buildBlockGeometryFromImage(imageData, cellCol, cellRow, cellSize, blockNumber, tx, hash) {
    var pixels = extractCellPixels(imageData, cellCol, cellRow, cellSize);
    var rects = detectRectangles(pixels);

    if (rects.length === 0) {
      rects = [{ x: 0, y: 0, w: cellSize, h: cellSize, cr: 40, cg: 40, cb: 40 }];
    }

    var positions = [];
    var normals = [];
    var colors = [];
    var indices = [];
    var vertexCount = 0;

    for (var i = 0; i < rects.length; i++) {
      var rc = rects[i];
      var px = rc.x / cellSize;
      var py = rc.y / cellSize;
      var pw = rc.w / cellSize;
      var ph = rc.h / cellSize;
      var ht = getParcelHeight(tx, i, hash);

      var nr = rc.cr / 255;
      var ng = rc.cg / 255;
      var nb = rc.cb / 255;

      addCube(
        positions, normals, colors, indices, vertexCount,
        px - 0.5, 0, py - 0.5,
        pw, ht, ph,
        nr, ng, nb
      );
      vertexCount += 24;
    }

    addGroundPlane(positions, normals, colors, indices, vertexCount);

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      colors: new Float32Array(colors),
      indices: new Uint32Array(indices),
      rectCount: rects.length
    };
  }

  function addCube(positions, normals, colors, indices, vertexOffset, x, y, z, w, h, d, r, g, b) {
    var x1 = x, x2 = x + w;
    var y1 = y, y2 = y + h;
    var z1 = z, z2 = z + d;
    var dr = r * 0.7;
    var dg = g * 0.7;
    var db = b * 0.7;

    var faces = [
      { n: [0, 1, 0], verts: [[x1,y2,z1],[x2,y2,z1],[x2,y2,z2],[x1,y2,z2]], c: [r, g, b] },
      { n: [0,-1, 0], verts: [[x1,y1,z2],[x2,y1,z2],[x2,y1,z1],[x1,y1,z1]], c: [dr, dg, db] },
      { n: [0, 0, 1], verts: [[x1,y1,z2],[x1,y2,z2],[x2,y2,z2],[x2,y1,z2]], c: [dr*0.9, dg*0.9, db*0.9] },
      { n: [0, 0,-1], verts: [[x2,y1,z1],[x2,y2,z1],[x1,y2,z1],[x1,y1,z1]], c: [dr*0.8, dg*0.8, db*0.8] },
      { n: [1, 0, 0], verts: [[x2,y1,z2],[x2,y2,z2],[x2,y2,z1],[x2,y1,z1]], c: [dr*0.85, dg*0.85, db*0.85] },
      { n:[-1, 0, 0], verts: [[x1,y1,z1],[x1,y2,z1],[x1,y2,z2],[x1,y1,z2]], c: [dr*0.75, dg*0.75, db*0.75] }
    ];

    for (var f = 0; f < faces.length; f++) {
      var face = faces[f];
      for (var v = 0; v < 4; v++) {
        positions.push(face.verts[v][0], face.verts[v][1], face.verts[v][2]);
        normals.push(face.n[0], face.n[1], face.n[2]);
        colors.push(face.c[0], face.c[1], face.c[2]);
      }
      var base = vertexOffset + f * 4;
      indices.push(base, base+1, base+2, base, base+2, base+3);
    }
  }

  function addGroundPlane(positions, normals, colors, indices, vertexOffset) {
    var S = 0.78;
    var LW = 0.012;
    var SW = 0.03;

    var base = vertexOffset;

    positions.push(-S, -0.01, -S);
    positions.push(-S + SW, -0.01, -S);
    positions.push(-S + SW, -0.01, S);
    positions.push(-S, -0.01, S);
    for (var i = 0; i < 4; i++) { normals.push(0, 1, 0); colors.push(0.55, 0.55, 0.55); }
    indices.push(base, base+1, base+2, base, base+2, base+3);

    base += 4;
    positions.push(-S + SW, -0.01, -S);
    positions.push(-LW, -0.01, -S);
    positions.push(-LW, -0.01, S);
    positions.push(-S + SW, -0.01, S);
    for (var i = 0; i < 4; i++) { normals.push(0, 1, 0); colors.push(0.35, 0.35, 0.38); }
    indices.push(base, base+1, base+2, base, base+2, base+3);

    base += 4;
    positions.push(-LW, -0.009, -S);
    positions.push(LW, -0.009, -S);
    positions.push(LW, -0.009, S);
    positions.push(-LW, -0.009, S);
    for (var i = 0; i < 4; i++) { normals.push(0, 1, 0); colors.push(0.92, 0.92, 0.88); }
    indices.push(base, base+1, base+2, base, base+2, base+3);

    base += 4;
    positions.push(LW, -0.01, -S);
    positions.push(S - SW, -0.01, -S);
    positions.push(S - SW, -0.01, S);
    positions.push(LW, -0.01, S);
    for (var i = 0; i < 4; i++) { normals.push(0, 1, 0); colors.push(0.35, 0.35, 0.38); }
    indices.push(base, base+1, base+2, base, base+2, base+3);

    base += 4;
    positions.push(S - SW, -0.01, -S);
    positions.push(S, -0.01, -S);
    positions.push(S, -0.01, S);
    positions.push(S - SW, -0.01, S);
    for (var i = 0; i < 4; i++) { normals.push(0, 1, 0); colors.push(0.55, 0.55, 0.55); }
    indices.push(base, base+1, base+2, base, base+2, base+3);
  }

  function buildBufferGeometryFromImage(imageData, cellCol, cellRow, cellSize, blockNumber, tx, hash) {
    var geoData = buildBlockGeometryFromImage(imageData, cellCol, cellRow, cellSize, blockNumber, tx, hash);

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(geoData.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(geoData.normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(geoData.colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(geoData.indices, 1));

    return { geometry: geometry, rectCount: geoData.rectCount };
  }

  return {
    extractCellPixels: extractCellPixels,
    detectRectangles: detectRectangles,
    buildBlockGeometryFromImage: buildBlockGeometryFromImage,
    buildBufferGeometryFromImage: buildBufferGeometryFromImage
  };
})();
