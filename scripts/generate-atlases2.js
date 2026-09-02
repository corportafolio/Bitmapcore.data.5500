const Database = require('better-sqlite3');
const { createCanvas, Image } = require('canvas');

const SRC_DB = '/root/bitmapcore-web/data/block_images.db';
const DST_DB = '/tmp/atlas2_output.db';

const AT1_IMG_W = 1280, AT1_IMG_H = 800;
const AT1_GX = 40, AT1_GZ = 25, AT1_CELL = 32;
const A2_AT1_COLS = 3, A2_AT1_ROWS = 10;
const AT1_GRID_COLS = 25, AT1_NORTH = 20, AT1_SOUTH = 19;
const A2_IMG_W = A2_AT1_COLS * AT1_IMG_W;
const A2_IMG_H = A2_AT1_ROWS * AT1_IMG_H;

const NORTH_REG_COLS = Math.floor(AT1_GRID_COLS / A2_AT1_COLS);
const SOUTH_REG_COLS = Math.floor(AT1_GRID_COLS / A2_AT1_COLS);
const NORTH_REG_ROWS = Math.ceil(AT1_NORTH / A2_AT1_ROWS);
const SOUTH_REG_ROWS = Math.ceil(AT1_SOUTH / A2_AT1_ROWS);
const TILES_PER_COL = NORTH_REG_ROWS + SOUTH_REG_ROWS;
const TOTAL_REG = NORTH_REG_COLS * TILES_PER_COL;
const TOTAL_SPECIAL = NORTH_REG_ROWS + SOUTH_REG_ROWS;
const TOTAL_TILES = TOTAL_REG + TOTAL_SPECIAL;

console.log('Atlas2:', TOTAL_TILES, 'tiles |', A2_IMG_W, 'x', A2_IMG_H, 'px | 1 tile at a time');

const srcDb = new Database(SRC_DB, { readonly: true });
srcDb.pragma('journal_mode = WAL');

const dstDb = new Database(DST_DB);
dstDb.pragma('journal_mode = WAL');
dstDb.pragma('synchronous = OFF');
dstDb.exec(`
  CREATE TABLE IF NOT EXISTS atlas2_images (
    tile_id INTEGER PRIMARY KEY,
    image_data BLOB,
    width INTEGER,
    height INTEGER,
    cell_size INTEGER,
    atlas1_cols INTEGER,
    atlas1_rows INTEGER,
    hemisphere TEXT,
    generated_at INTEGER
  )
`);
const insertStmt = dstDb.prepare(`
  INSERT OR REPLACE INTO atlas2_images
  (tile_id, image_data, width, height, cell_size, atlas1_cols, atlas1_rows, hemisphere, generated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const totalAtlas1 = srcDb.prepare('SELECT COUNT(*) as c FROM atlas_images').get().c;
console.log('Atlas1:', totalAtlas1);

function loadImage(gz) {
  return new Promise((resolve) => {
    const row = srcDb.prepare('SELECT image_data FROM atlas_images WHERE gz = ?').get(gz);
    if (!row) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = row.image_data;
  });
}

function getAtlas1Pos(gz) {
  let row, col;
  if (gz < AT1_NORTH * AT1_GZ) {
    row = Math.floor(gz / AT1_GZ);
    col = gz % AT1_GRID_COLS;
  } else {
    const sGz = gz - AT1_NORTH * AT1_GZ;
    row = AT1_NORTH + Math.floor(sGz / AT1_GZ);
    col = sGz % AT1_GRID_COLS;
  }
  return { row, col };
}

function buildTileGzList(tileId) {
  const gzList = [];
  if (tileId >= TOTAL_REG) {
    const specialIdx = tileId - TOTAL_REG;
    const isNorth = specialIdx < NORTH_REG_ROWS;
    const rowGroup = isNorth ? specialIdx : specialIdx - NORTH_REG_ROWS;
    const col = AT1_GRID_COLS - (AT1_GRID_COLS % A2_AT1_COLS);
    for (let r = 0; r < A2_AT1_ROWS; r++) {
      let gz;
      if (isNorth) {
        gz = (rowGroup * A2_AT1_ROWS + r) * AT1_GRID_COLS + col;
      } else {
        gz = AT1_NORTH * AT1_GZ + (rowGroup * A2_AT1_ROWS + r) * AT1_GRID_COLS + col;
      }
      if (gz < totalAtlas1) gzList.push(gz);
    }
    return { gzList, hemisphere: isNorth ? 'north_special' : 'south_special', isSpecial: true };
  }

  const a2Col = Math.floor(tileId / TILES_PER_COL);
  const tileInCol = tileId % TILES_PER_COL;
  const isNorthTile = tileInCol < NORTH_REG_ROWS;
  const rowGroup = isNorthTile ? tileInCol : tileInCol - NORTH_REG_ROWS;
  const hemisphere = isNorthTile ? 'north' : 'south';

  for (let r = 0; r < A2_AT1_ROWS; r++) {
    for (let c = 0; c < A2_AT1_COLS; c++) {
      const gridCol = a2Col * A2_AT1_COLS + c;
      let gz;
      if (isNorthTile) {
        gz = (rowGroup * A2_AT1_ROWS + r) * AT1_GRID_COLS + gridCol;
      } else {
        gz = AT1_NORTH * AT1_GZ + (rowGroup * A2_AT1_ROWS + r) * AT1_GRID_COLS + gridCol;
      }
      if (gz < totalAtlas1) gzList.push(gz);
    }
  }
  return { gzList, hemisphere, isSpecial: false };
}

async function generateTile(tileId) {
  const { gzList, hemisphere, isSpecial } = buildTileGzList(tileId);
  const imgW = isSpecial ? AT1_IMG_W : A2_IMG_W;
  const canvas = createCanvas(imgW, A2_IMG_H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1828';
  ctx.fillRect(0, 0, imgW, A2_IMG_H);

  let drawn = 0;
  for (const gz of gzList) {
    const img = await loadImage(gz);
    if (!img) continue;

    const { row, col } = getAtlas1Pos(gz);

    if (isSpecial) {
      const localRow = isSpecial && hemisphere.includes('north')
        ? (row % A2_AT1_ROWS)
        : ((row - AT1_NORTH) % A2_AT1_ROWS);
      ctx.drawImage(img, 0, 0, AT1_IMG_W, AT1_IMG_H, 0, localRow * AT1_IMG_H, AT1_IMG_W, AT1_IMG_H);
    } else {
      const localCol = col % A2_AT1_COLS;
      const isNorth = gz < AT1_NORTH * AT1_GZ;
      const baseRow = isNorth ? Math.floor(row / A2_AT1_ROWS) * A2_AT1_ROWS : AT1_NORTH + Math.floor((row - AT1_NORTH) / A2_AT1_ROWS) * A2_AT1_ROWS;
      const localRow = row - baseRow;
      const dx = localCol * AT1_IMG_W;
      const dy = localRow * AT1_IMG_H;
      const sw = A2_AT1_COLS * AT1_GX * AT1_CELL;
      ctx.drawImage(img, 0, 0, sw, AT1_IMG_H, dx, dy, sw, AT1_IMG_H);
    }
    drawn++;
  }

  const png = canvas.toBuffer('image/png');
  insertStmt.run(tileId, png, imgW, A2_IMG_H, AT1_CELL,
    isSpecial ? 1 : A2_AT1_COLS, A2_AT1_ROWS, hemisphere, Date.now());

  return { drawn, pngSize: png.length };
}

async function main() {
  const startTime = Date.now();
  console.log('=== Generando ' + TOTAL_TILES + ' Atlas2 (1 a la vez) ===');
  console.log('');

  const existing = dstDb.prepare('SELECT tile_id FROM atlas2_images').all().map(r => r.tile_id);
  const startTile = existing.length > 0 ? Math.max(...existing) + 1 : 0;
  console.log('Starting from tile', startTile, '(existing:', existing.length, ')');
  console.log('');

  for (let tileId = startTile; tileId < TOTAL_TILES; tileId++) {
    const { drawn, pngSize } = await generateTile(tileId);
    if ((tileId + 1) % 6 === 0 || tileId === TOTAL_TILES - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const mem = process.memoryUsage();
      console.log('[' + (tileId + 1) + '/' + TOTAL_TILES + '] tile=' + tileId + ' drawn=' + drawn + ' size=' + (pngSize / 1024).toFixed(0) + 'KB mem=' + (mem.heapUsed / 1048576).toFixed(0) + 'MB ' + elapsed + 's');
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('DONE: ' + TOTAL_TILES + ' atlas2 en ' + elapsed + 's');
  console.log('Total en DB:', dstDb.prepare('SELECT COUNT(*) as c FROM atlas2_images').get().c);

  srcDb.close();
  dstDb.close();
}

main().catch(err => { console.error(err); process.exit(1); });
