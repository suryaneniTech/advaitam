const WORDS = [
  'apple', 'beach', 'piano', 'rocket', 'garden', 'castle', 'planet', 'dragon',
  'coffee', 'sunset', 'forest', 'wizard', 'ocean', 'bridge', 'market', 'school',
  'tiger', 'cloud', 'river', 'mountain', 'library', 'kitchen', 'bicycle', 'camera',
  'diamond', 'festival', 'hospital', 'island', 'jungle', 'kitchen', 'lighthouse',
  'museum', 'notebook', 'orchard', 'palace', 'quilt', 'rainbow', 'stadium', 'theater',
  'umbrella', 'volcano', 'waterfall', 'yacht', 'zebra', 'anchor', 'balloon', 'candle',
];

export function generateWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export function generateDecoyWord(excludeWord) {
  const excluded = normalizeWord(excludeWord);
  let decoy = generateWord();
  let attempts = 0;
  while (normalizeWord(decoy) === excluded && attempts < 30) {
    decoy = generateWord();
    attempts += 1;
  }
  return decoy;
}

export function normalizeWord(word) {
  return String(word || '').trim().toLowerCase();
}

export function isValidWord(word) {
  const normalized = normalizeWord(word);
  return normalized.length >= 2 && normalized.length <= 40 && /^[a-z\s-]+$/.test(normalized);
}
