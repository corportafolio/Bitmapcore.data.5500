const Database = require('better-sqlite3');
const { createCanvas } = require('canvas');
const crypto = require('crypto');
const MondrianGenerator = require('/root/bitmapcore-web/utils-mondrian');

const mainDb = new Database('/root/bitmapcore-web/data/bitmapcorp_database.db', { readonly: true });
const imgDb = new Database('/root/bitmapcore-web/data/ordinalswallet_cache.db');

imgDb.pragma('journal_mode = WAL');
imgDb.exec(`
  CREATE TABLE IF NOT EXISTS block_images (
    block_number  INTEGER NOT NULL,
    size          INTEGER NOT NULL DEFAULT 80,
    options_hash  TEXT NOT NULL,
    image_data    BLOB NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (block_number, size, options_hash)
  ) WITHOUT ROWID;
  CREATE INDEX IF NOT EXISTS idx_block_images_block ON block_images(block_number);
`);

const insert = imgDb.prepare(`
  INSERT OR REPLACE INTO block_images (block_number, size, options_hash, image_data)
  VALUES (?, ?, ?, ?)
`);

const blocks = mainDb.prepare(`
  SELECT 
    bloque as block_number,
    hash,
    totalTransacciones,
    etiquetas
  FROM blocks
  ORDER BY bloque
`).all();

console.log('Total blocks to process: ' + blocks.length);

const SIZE = 80;
let done = 0;
let generated = 0;
let skipped = 0;
const startTime = Date.now();

for (const b of blocks) {
  const etiquetas = b.etiquetas || '';
  const tx = parseInt(b.totalTransacciones) || 0;
  const hash = b.hash || '';
  const perfect = etiquetas.toLowerCase().indexOf('perfect') !== -1;
  const punk = etiquetas.toLowerCase().indexOf('punk') !== -1;

  const optsHash = crypto.createHash('md5')
    .update(etiquetas + '|' + tx + '|' + (perfect ? 1 : 0) + '|' + (punk ? 1 : 0) + '|' + hash)
    .digest('hex');

  const existing = imgDb.prepare(
    'SELECT 1 FROM block_images WHERE block_number=? AND size=? AND options_hash=?'
  ).get(b.block_number, SIZE, optsHash);

  if (existing) {
    skipped++;
  } else {
    const canvas = createCanvas(SIZE, SIZE);
    MondrianGenerator.generate(canvas, b.block_number, {
      totalTransactions: tx,
      hash: hash,
      etiquetas: etiquetas,
      isPerfect: perfect,
      isPunk: punk
    }, SIZE);

    const png = canvas.toBuffer('image/png');
    insert.run(b.block_number, SIZE, optsHash, png);
    generated++;
  }

  done++;
  if (done % 1000 === 0) {
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = done / elapsed;
    const remaining = (blocks.length - done) / rate;
    console.log(
      '  ' + done + '/' + blocks.length +
      ' (' + generated + ' gen, ' + skipped + ' skip)' +
      ' | ' + rate.toFixed(0) + ' img/s' +
      ' | ETA: ' + Math.round(remaining / 60) + 'min'
    );
  }
}

const totalTime = (Date.now() - startTime) / 1000 / 60;
console.log('\nDone! ' + generated + ' generated, ' + skipped + ' skipped in ' + totalTime.toFixed(1) + ' min');
console.log('DB size: ' + (imgDb.pragma('page_count') * imgDb.pragma('page_size') / 1024 / 1024).toFixed(1) + ' MB');

mainDb.close();
imgDb.close();
