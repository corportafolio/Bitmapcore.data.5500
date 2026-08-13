// Classification queries for 55 tables - equivalent to Android BlockDao
// Run this to create tag_tables and tagged_blocks tables

const CLASSIFICATION_TABLES = [
  // Grupo 1: Primarias (9)
  { tagName: 'txS millonarias', query: "WHERE etiquetas LIKE '%millonaria%'" },
  { tagName: 'TXs MULTIMILLONARIAS', query: "WHERE lower(etiquetas) LIKE '%multimillonaria%'" },
  { tagName: '100k out', query: "WHERE etiquetas LIKE '%100k out%'" },
  { tagName: '250k out', query: "WHERE etiquetas LIKE '%250k out%'" },
  { tagName: '500k out', query: "WHERE etiquetas LIKE '%500k out%'" },
  { tagName: '1M out', query: "WHERE lower(etiquetas) LIKE '%1m out%'" },
  { tagName: '2M out', query: "WHERE lower(etiquetas) LIKE '%2m out%'" },
  { tagName: '3M out', query: "WHERE lower(etiquetas) LIKE '%3m out%'" },
  { tagName: '5M out', query: "WHERE lower(etiquetas) LIKE '%5m out%'" },

  // Grupo 2: Especiales (13)
  { tagName: '21e8', query: "WHERE lower(hash) LIKE '%21e8%'" },
  { tagName: '2 tx PERFECT', query: "WHERE ('|' || lower(etiquetas) || '|') LIKE '%|2 tx perfect|%'" },
  { tagName: '3 tx PERFECT', query: "WHERE lower(etiquetas) LIKE '%3 tx perfect%'" },
  { tagName: '4 tx PERFECT', query: "WHERE lower(etiquetas) LIKE '%4 tx perfect%'" },
  { tagName: '6 tx PERFECT', query: "WHERE lower(etiquetas) LIKE '%6 tx perfect%'" },
  { tagName: 'Grid Punk', query: "WHERE lower(etiquetas) LIKE '%grid punk%'" },
  { tagName: 'Grid PERFECT', query: "WHERE lower(etiquetas) LIKE '%grid perfect%'" },
  { tagName: 'Punk PERFECT', query: "WHERE lower(etiquetas) LIKE '%punk perfect%'" },
  { tagName: '5 tx Punk PERFECT', query: "WHERE lower(etiquetas) LIKE '%punk perfect%' AND lower(etiquetas) LIKE '%5 tx%'" },
  { tagName: 'Punk PERFECT 10 tx', query: "WHERE lower(etiquetas) LIKE '%punk perfect%' AND lower(etiquetas) LIKE '%10 tx%'" },
  { tagName: 'Giga Punk PERFECT', query: "WHERE lower(etiquetas) LIKE '%punk perfect%' AND lower(etiquetas) LIKE '%giga%'" },
  { tagName: 'Palindrome', query: "WHERE lower(etiquetas) LIKE '%palindrome%'" },
  { tagName: 'Palindrome PERFECT', query: "WHERE lower(etiquetas) LIKE '%palindrome perfect%'" },

  // Grupo 3: Punks Ordinarios (4)
  { tagName: 'Wide Neck Punk', query: "WHERE lower(etiquetas) LIKE '%wide neck punk%'" },
  { tagName: 'Standar Punk', query: "WHERE lower(etiquetas) LIKE '%standar punk%'" },
  { tagName: 'Pristine Punk', query: "WHERE lower(etiquetas) LIKE '%pristine punk%'" },
  { tagName: 'Punk 2tx', query: "WHERE lower(etiquetas) LIKE '%punk 2tx%'" },

  // Grupo 4: Por Cantidad TX (10)
  { tagName: '8000 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) >= 8000" },
  { tagName: '7000 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) BETWEEN 7000 AND 7999" },
  { tagName: '6000 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) BETWEEN 6000 AND 6999" },
  { tagName: '5000 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) BETWEEN 5000 AND 5999" },
  { tagName: '4000 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) BETWEEN 4000 AND 4999" },
  { tagName: '3000 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) BETWEEN 3000 AND 3999" },
  { tagName: '2000 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) BETWEEN 2000 AND 2999" },
  { tagName: '1000 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) BETWEEN 1000 AND 1999" },
  { tagName: '1 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) = 1" },
  { tagName: '2 tx', query: "WHERE CAST(totalTransacciones AS INTEGER) = 2 AND lower(etiquetas) NOT LIKE '%wide neck punk%' AND lower(etiquetas) NOT LIKE '%standar punk%' AND lower(etiquetas) NOT LIKE '%pristine punk%' AND lower(etiquetas) NOT LIKE '%punk 2tx%' AND ('|' || lower(etiquetas) || '|') NOT LIKE '%|2 tx perfect|%'" },

  // Grupo 5: Por Rango Bloque (19)
  { tagName: 'sub 100k', query: "WHERE bloque BETWEEN 50001 AND 100000" },
  { tagName: 'sub 50k', query: "WHERE bloque BETWEEN 25001 AND 50000" },
  { tagName: 'sub 25k', query: "WHERE bloque BETWEEN 10001 AND 25000" },
  { tagName: 'sub 10k', query: "WHERE bloque BETWEEN 1001 AND 10000" },
  { tagName: 'sub 1k', query: "WHERE bloque BETWEEN 1 AND 1000" },
  { tagName: 'power of 10', query: "WHERE bloque IN (10, 100, 1000, 10000, 100000)" },
  { tagName: 'mythic', query: "WHERE bloque = 0" },
  { tagName: 'epic', query: "WHERE bloque % 210000 = 0" },
  { tagName: 'rare', query: "WHERE bloque % 2016 = 0" },
  { tagName: 'first transaction', query: "WHERE bloque = 170" },
  { tagName: 'pizza transaction', query: "WHERE bloque = 57043" },
  { tagName: 'block 9', query: "WHERE bloque = 9" },
  { tagName: 'block 78', query: "WHERE bloque = 78" },
  { tagName: '66 dao', query: "WHERE bloque BETWEEN 660000 AND 669999" },
  { tagName: 'prime number', query: "WHERE bloque IN (2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997)" },
  { tagName: 'fibonacci', query: "WHERE bloque IN (0,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765,10946,17711,28657,46368,75025,121393,196418,317811,514229,832040)" },
  { tagName: 'binary', query: "WHERE CAST(bloque AS TEXT) NOT LIKE '%2%' AND CAST(bloque AS TEXT) NOT LIKE '%3%' AND CAST(bloque AS TEXT) NOT LIKE '%4%' AND CAST(bloque AS TEXT) NOT LIKE '%5%' AND CAST(bloque AS TEXT) NOT LIKE '%6%' AND CAST(bloque AS TEXT) NOT LIKE '%7%' AND CAST(bloque AS TEXT) NOT LIKE '%8%' AND CAST(bloque AS TEXT) NOT LIKE '%9%'" },
  { tagName: 'chinese lucky number', query: "WHERE CAST(bloque AS TEXT) LIKE '%168%'" },
  { tagName: 'pizza day', query: "WHERE bloque BETWEEN 56899 AND 57093" }
];

if (typeof module !== 'undefined') module.exports = CLASSIFICATION_TABLES;