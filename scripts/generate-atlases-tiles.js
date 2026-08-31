const Database = require('better-sqlite3');
const { createCanvas } = require('canvas');
const MondrianGenerator = require('/root/bitmapcore-web/utils-mondrian');

const mainDb = new Database('/root/bitmapcore-web/data/bitmapcorp_database.db', { readonly: true });
const imgDb = new Database('/root/bitmapcore-web/data/block_images.db');
imgDb.pragma('journal_mode = WAL');
imgDb.pragma('synchronous = OFF');

imgDb.exec(`
  CREATE TABLE IF NOT EXISTS atlas_images (
    gz INTEGER PRIMARY KEY,
    image_data BLOB,
    width INTEGER,
    height INTEGER,
    cell_size INTEGER,
    cols INTEGER,
    generated_at INTEGER
  )
`);

// ATLAS = 40 columnas gx x 25 filas gz = 1000 celdas (1280x800 px, celda 32px)
const CELL = 32, COLS = 40, ROWS = 25, ATLAS_W = COLS * CELL, ATLAS_H = ROWS * CELL;
// Grid de atlas: 25 tiles horizontales (1000/40) x 39 verticales (20 norte + 19 sur)
const TILES_X = 25;
const TILES_NORTH = 20;   // gz 0-499  (filas hacia arriba: gz 0 abajo, gz 499 arriba)
const TILES_SOUTH = 19;   // gz 500-955 (filas hacia abajo: gz 500 arriba, gz 955 abajo)
const TILES_Y = TILES_NORTH + TILES_SOUTH;
const TOTAL_TILES = TILES_X * TILES_Y;

const blocks = mainDb.prepare('SELECT bloque, hash, totalTransacciones, etiquetas FROM blocks').all();
const blockMap = {};
for (const b of blocks) blockMap[b.bloque] = b;
console.log('Blocks: ' + Object.keys(blockMap).length);
console.log('Tiles: ' + TILES_X + 'x' + TILES_Y + ' = ' + TOTAL_TILES + ' (40x25 celdas)');

console.log('Limpiando tabla atlas_images...');
imgDb.exec('DELETE FROM atlas_images');

const insertStmt = imgDb.prepare('INSERT OR REPLACE INTO atlas_images (gz, image_data, width, height, cell_size, cols, generated_at) VALUES (?,?,?,?,?,?,?)');

const atlasCanvas = createCanvas(ATLAS_W, ATLAS_H);
const atlasCtx = atlasCanvas.getContext('2d');
const cellCanvas = createCanvas(CELL, CELL);
const cellCtx = cellCanvas.getContext('2d');

let done = 0;
const startTime = Date.now();

for (let ty = 0; ty < TILES_Y; ty++) {
  for (let tx = 0; tx < TILES_X; tx++) {
    const tileId = ty * TILES_X + tx;

    atlasCtx.fillStyle = '#1a1828';
    atlasCtx.fillRect(0, 0, ATLAS_W, ATLAS_H);

    for (let row = 0; row < ROWS; row++) {
      // SECCION NORTE (ty 0-19): filas hacia arriba -> fila 0 del atlas = gz alto, fila 24 = gz bajo
      // SECCION SUR (ty 20-38): filas hacia abajo -> fila 0 del atlas = gz bajo, fila 24 = gz alto
      let gz;
      if (ty < TILES_NORTH) {
        gz = ty * ROWS + (ROWS - 1 - row);
      } else {
        gz = 500 + (ty - TILES_NORTH) * ROWS + row;
      }
      if (gz > 955) break;

      for (let col = 0; col < COLS; col++) {
        const gx = tx * COLS + col;
        if (gx >= 1000) break;
        const blockNum = gz * 1000 + gx;
        const b = blockMap[blockNum];
        if (!b) continue;
        try {
          cellCtx.clearRect(0, 0, CELL, CELL);
          MondrianGenerator.generate(cellCanvas, blockNum, {
            totalTransactions: parseInt(b.totalTransacciones) || 0,
            hash: b.hash || '',
            etiquetas: b.etiquetas || '',
            isGrid: false,
            isPunk: false
          }, CELL);
          atlasCtx.drawImage(cellCanvas, col * CELL, row * CELL);
        } catch (e) {}
      }
    }

    const png = atlasCanvas.toBuffer('image/png');
    insertStmt.run(tileId, png, ATLAS_W, ATLAS_H, CELL, COLS, Date.now());
    done++;

    if (done % 20 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const speed = (done / (Date.now() - startTime) * 1000).toFixed(1);
      console.log('[' + done + '/' + TOTAL_TILES + '] tile=' + tileId + ' (' + ty + ',' + tx + ') ' + elapsed + 's ' + speed + '/s');
    }
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log('DONE: ' + done + ' atlases in ' + elapsed + 's. Total: ' + imgDb.prepare('SELECT COUNT(*) as c FROM atlas_images').get().c);
mainDb.close();
imgDb.close();
