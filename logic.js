// logic.js — ชั้น pure functions (ไม่มี DOM / network / Leaflet)
// เป็น seam หลักสำหรับเทสต์: รับ input → คืน output เท่านั้น

/**
 * คืนราคาต่ำสุด (JPY) ในรายการสินค้าของ entry — ใช้สำหรับเรียง/แสดงราคาเริ่มต้น
 * @param {{ products?: Array<{ priceJpy?: number }> }} entry
 * @returns {number|null} ราคาต่ำสุดที่ใช้ได้ หรือ null ถ้าไม่มีราคาที่ใช้ได้
 */
export function getStartingPriceJpy(entry) {
  const products = entry?.products;
  if (!Array.isArray(products) || products.length === 0) return null;

  const prices = products
    .map((p) => p?.priceJpy)
    .filter((price) => typeof price === 'number' && Number.isFinite(price));

  if (prices.length === 0) return null;
  return Math.min(...prices);
}

// ขนาด thumbnail ของ Wikimedia ที่ "อนุญาตให้ render ได้" (ยืนยันด้วยการ probe จริง)
// Wikimedia บล็อกขนาดนอกลิสต์ (คืน 400) ใช้ได้แน่คือ 250 และ 500 — เลือก thumb ใหญ่สุดที่ ≤ ที่ขอ
export const WIKI_THUMB_SIZES = [250, 500];

/**
 * แปลง URL รูปต้นฉบับของ Wikimedia ให้เป็น URL thumbnail ขนาดเล็กลง
 * (ต้นฉบับบางไฟล์ใหญ่หลายสิบ MB ทำให้โหลดช้า/กระตุก) — รูปจากแหล่งอื่นคืนค่าเดิม
 * @param {string} url URL รูป
 * @param {number} width ความกว้างที่ต้องการ (จะ snap ลงเป็นขนาดที่ Wikimedia อนุญาต)
 * @returns {string} URL thumbnail (ถ้าแปลงได้) หรือ URL เดิม
 */
export function wikiThumbUrl(url, width = 500) {
  if (typeof url !== 'string') return url;
  if (url.includes('/thumb/')) return url; // เป็น thumb อยู่แล้ว

  // โครงสร้าง: https://upload.wikimedia.org/wikipedia/<proj>/<h1>/<h1h2>/<File>.<ext>
  const m = url.match(
    /^(https?:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/([0-9a-fA-F])\/([0-9a-fA-F]{2})\/([^/]+)$/,
  );
  if (!m) return url;

  const [, base, d1, d2, file] = m;
  // เลือกขนาดที่อนุญาตซึ่งใหญ่สุดแต่ไม่เกินที่ขอ (ถ้าเล็กกว่าทุกค่าใช้ค่าต่ำสุด)
  const allowed = [...WIKI_THUMB_SIZES].sort((a, b) => a - b);
  const size = allowed.filter((s) => s <= width).pop() ?? allowed[0];
  return `${base}/thumb/${d1}/${d2}/${file}/${size}px-${file}`;
}

// เกณฑ์ระดับราคา (ราคาเริ่มต้นเป็นเยน): ≤1000 = ¥, ≤5000 = ¥¥, มากกว่านั้น = ¥¥¥
// แยกออกมาเป็นค่าคงที่เพื่อให้เทสต์อ้างอิงเกณฑ์เดียวกับโค้ดจริง
export const PRICE_LEVEL_THRESHOLDS = [1000, 5000];

/**
 * คืน "ระดับราคา" แบบหยาบ (1=ถูก, 2=ปานกลาง, 3=สูง) จากราคาเริ่มต้นเป็นเยน
 * ใช้แสดงป้าย ¥ / ¥¥ / ¥¥¥ ไว้กวาดสายตา — ฟรี (0) นับเป็นระดับ 1
 * @param {number|null} jpy ราคาเริ่มต้น (เช่นจาก getStartingPriceJpy)
 * @returns {1|2|3|null} ระดับราคา หรือ null ถ้าไม่มีราคาที่ใช้ได้
 */
export function getPriceLevel(jpy) {
  if (typeof jpy !== 'number' || !Number.isFinite(jpy) || jpy < 0) return null;
  const [low, mid] = PRICE_LEVEL_THRESHOLDS;
  if (jpy <= low) return 1;
  if (jpy <= mid) return 2;
  return 3;
}

/**
 * แปลงราคาเยน (JPY) เป็นบาท (THB) ด้วยอัตราแลกเปลี่ยน แล้วปัดเศษเป็นจำนวนเต็มบาท
 * @param {number} jpy ราคาเป็นเยน
 * @param {number} rate อัตราแลกเปลี่ยน JPY→THB (บาทต่อ 1 เยน)
 * @returns {number|null} ราคาบาท (ปัดเศษ) หรือ null ถ้า input ไม่ใช่ตัวเลขที่ใช้ได้
 */
export function convertJpyToThb(jpy, rate) {
  if (typeof jpy !== 'number' || !Number.isFinite(jpy)) return null;
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return null;
  return Math.round(jpy * rate);
}

/**
 * ตรวจว่า entry ตรงกับคำค้นหรือไม่ (ค้นจากชื่อไทย/ญี่ปุ่น/โรมาจิ ชื่อสินค้า และแท็ก)
 * แบบ case-insensitive และตัดช่องว่างหัวท้ายของคำค้น
 * @param {object} entry
 * @param {string} query
 * @returns {boolean}
 */
export function searchMatches(entry, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (q === '') return true;

  const haystack = [
    entry?.nameTh,
    entry?.nameJa,
    entry?.nameRomaji,
    ...(Array.isArray(entry?.products) ? entry.products.map((p) => p?.nameTh) : []),
    ...(Array.isArray(entry?.tags) ? entry.tags : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

/**
 * กรองรายการตามหมวด/เมือง/คำค้น/บุ๊กมาร์ก — combine ได้หลายเงื่อนไข (AND)
 * เงื่อนไขที่เป็นค่าว่าง/undefined จะถูกข้าม (ไม่กรอง)
 * เป็น pure: id ที่บุ๊กมาร์กถูกส่งเข้ามาเป็น argument (ไม่อ่าน localStorage ในชั้นนี้)
 * @param {Array<object>} entries
 * @param {{ category?: string, city?: string, query?: string,
 *           bookmarkedOnly?: boolean, bookmarkedIds?: Array<string>|Set<string> }} criteria
 * @returns {Array<object>} array ใหม่ของ entries ที่ผ่านเงื่อนไข
 */
export function filterEntries(entries, criteria = {}) {
  if (!Array.isArray(entries)) return [];
  const { category, city, query, bookmarkedOnly, bookmarkedIds } = criteria;
  // รับได้ทั้ง array และ Set — แปลงเป็น Set เพื่อเช็คสมาชิกแบบ O(1)
  const bookmarked = bookmarkedIds instanceof Set ? bookmarkedIds : new Set(bookmarkedIds ?? []);

  return entries.filter((entry) => {
    if (category && entry?.category !== category) return false;
    if (city && entry?.city !== city) return false;
    if (!searchMatches(entry, query)) return false;
    if (bookmarkedOnly && !bookmarked.has(entry?.id)) return false;
    return true;
  });
}

/**
 * เรียงรายการตามราคาเริ่มต้น (ราคาต่ำสุดในสินค้าของ entry)
 * entry ที่ไม่มีราคา (null) จะถูกดันไปท้ายสุดเสมอ ไม่ว่าจะเรียงทิศใด
 * การเรียงแบบ stable: เมื่อราคาเท่ากันจะคงลำดับเดิม
 * @param {Array<object>} entries
 * @param {'asc'|'desc'} direction 'asc' = ถูก→แพง, 'desc' = แพง→ถูก
 * @returns {Array<object>} array ใหม่ที่เรียงแล้ว (ไม่แก้ไขต้นฉบับ)
 */
export function sortByPrice(entries, direction = 'asc') {
  if (!Array.isArray(entries)) return [];
  const sign = direction === 'desc' ? -1 : 1;

  return entries
    .map((entry, index) => ({ entry, index, price: getStartingPriceJpy(entry) }))
    .sort((a, b) => {
      const aHas = a.price !== null;
      const bHas = b.price !== null;
      if (!aHas && !bHas) return a.index - b.index;
      if (!aHas) return 1; // a ไม่มีราคา → ไปท้าย
      if (!bHas) return -1; // b ไม่มีราคา → ไปท้าย
      if (a.price !== b.price) return (a.price - b.price) * sign;
      return a.index - b.index; // ราคาเท่ากัน → คงลำดับเดิม
    })
    .map((item) => item.entry);
}

// ============================================================
//  Validator — ตรวจคุณภาพ entry ก่อนขึ้นเว็บ (seam เดียว, pure)
// ============================================================

// หมวด (Category) แบบปิด 8 ค่า และเมือง (City) แบบปิด 3 ค่า — ต้องตรงกับ CONTEXT.md
export const CATEGORIES = [
  'sightseeing',
  'food',
  'games',
  'cosplay',
  'electronics',
  'anime-goods',
  'cafe',
  'shopping',
];
export const CITIES = ['tokyo', 'osaka', 'kyoto'];

// กรอบพิกัดญี่ปุ่นคร่าว ๆ (โอกินาว่า→ฮอกไกโด) ใช้กันพิกัดหลุด (เช่น สลับ lat/lng หรือค่าไทย)
export const JAPAN_BOUNDS = { latMin: 24, latMax: 46, lngMin: 122, lngMax: 154 };

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * ตรวจว่า entry หนึ่งผ่านเกณฑ์คุณภาพ (schema + DoD) หรือไม่ — pure, ไม่ throw
 * คืน array ของข้อความ error (ว่าง = ผ่าน) โดยข้อความอ้างชื่อฟิลด์ให้ debug ง่าย
 * รูป (`images`) เป็น optional: ถ้าไม่มีก็ผ่าน แต่ถ้ามี ทุกรูปต้องครบ url + credit/source + license
 * @param {object} entry
 * @returns {string[]} รายการ error (ว่าง = ผ่าน)
 */
export function validateEntry(entry) {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return ['entry ต้องเป็น object'];
  }
  const errors = [];

  // ฟิลด์บังคับที่เป็นสตริง
  for (const field of ['id', 'nameTh', 'nameJa', 'nameRomaji', 'description', 'sourceUrl']) {
    if (!isNonEmptyString(entry[field])) errors.push(`ฟิลด์ ${field} ต้องเป็นสตริงที่ไม่ว่าง`);
  }
  // address: รับได้ทั้ง object (th/ja) หรือสตริง แต่ต้องมี
  if (entry.address == null || (typeof entry.address !== 'object' && !isNonEmptyString(entry.address))) {
    errors.push('ฟิลด์ address ต้องมี (object {th,ja} หรือสตริง)');
  }

  // category / city ต้องอยู่ใน closed set
  if (!CATEGORIES.includes(entry.category)) {
    errors.push(`category "${entry.category}" ไม่อยู่ใน closed set 8 หมวด`);
  }
  if (!CITIES.includes(entry.city)) {
    errors.push(`city "${entry.city}" ไม่อยู่ใน closed set 3 เมือง`);
  }

  // lat/lng เป็นตัวเลขในกรอบพิกัดญี่ปุ่น
  const { lat, lng } = entry;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < JAPAN_BOUNDS.latMin || lat > JAPAN_BOUNDS.latMax) {
    errors.push('lat ต้องเป็นตัวเลขในกรอบพิกัดญี่ปุ่น');
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < JAPAN_BOUNDS.lngMin || lng > JAPAN_BOUNDS.lngMax) {
    errors.push('lng ต้องเป็นตัวเลขในกรอบพิกัดญี่ปุ่น');
  }

  // Definition of Done: station, hours, tags≥2, tips≥1
  if (!isNonEmptyString(entry.station)) errors.push('ขาด station (วิธีเดินทาง)');
  if (!isNonEmptyString(entry.hours)) errors.push('ขาด hours (เวลาทำการ)');
  if (!Array.isArray(entry.tags) || entry.tags.length < 2) errors.push('ต้องมี tags อย่างน้อย 2 รายการ');
  if (!Array.isArray(entry.tips) || entry.tips.length < 1) errors.push('ต้องมี tips อย่างน้อย 1 รายการ');

  // products ≥ 2 และแต่ละชิ้นมี nameTh + priceJpy เป็นตัวเลข ≥ 0
  if (!Array.isArray(entry.products) || entry.products.length < 2) {
    errors.push('ต้องมี products อย่างน้อย 2 รายการ');
  } else {
    entry.products.forEach((p, i) => {
      if (!isNonEmptyString(p?.nameTh)) errors.push(`product[${i}] ขาด nameTh`);
      if (typeof p?.priceJpy !== 'number' || !Number.isFinite(p.priceJpy) || p.priceJpy < 0) {
        errors.push(`product[${i}] priceJpy ต้องเป็นตัวเลข ≥ 0`);
      }
    });
  }

  // images: optional; แต่ถ้ามี ทุกรูปต้องมี url + (credit หรือ source) + license (ADR-0001/0003)
  if (entry.images != null) {
    if (!Array.isArray(entry.images)) {
      errors.push('images ต้องเป็น array');
    } else {
      entry.images.forEach((img, i) => {
        if (!isNonEmptyString(img?.url)) errors.push(`image[${i}] ขาด url`);
        if (!isNonEmptyString(img?.credit) && !isNonEmptyString(img?.source)) {
          errors.push(`image[${i}] ขาด credit/source`);
        }
        if (!isNonEmptyString(img?.license)) errors.push(`image[${i}] ขาด license`);
      });
    }
  }

  return errors;
}

/**
 * ตรวจทั้ง dataset: วน validateEntry ทุก entry + เช็ค id ซ้ำระดับชุดข้อมูล
 * คืน array ของ error (ว่าง = ผ่าน) โดย error ของแต่ละ entry จะขึ้นต้นด้วย id เพื่ออ่านง่าย
 * หมายเหตุ: floor ≥ 3 ต่อหมวด จะบังคับหลังเติมหมวดครบ (ISSUES/10–13) จึงยังไม่เช็คที่นี่
 * @param {Array<object>} entries
 * @returns {string[]} รายการ error (ว่าง = ผ่าน)
 */
export function validateDataset(entries) {
  if (!Array.isArray(entries)) return ['dataset.entries ต้องเป็น array'];
  const errors = [];
  const seen = new Set();

  for (const entry of entries) {
    const id = entry?.id;
    const label = isNonEmptyString(id) ? id : '(ไม่มี id)';
    if (isNonEmptyString(id)) {
      if (seen.has(id)) errors.push(`${id}: id ซ้ำในชุดข้อมูล`);
      seen.add(id);
    }
    for (const e of validateEntry(entry)) {
      errors.push(`${label}: ${e}`);
    }
  }

  return errors;
}
