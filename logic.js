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
 * ตรวจว่า entry ตรงกับคำค้นหรือไม่ (ค้นจากชื่อไทย/ญี่ปุ่น/โรมาจิ และชื่อสินค้า)
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
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

/**
 * กรองรายการตามหมวด/เมือง/คำค้น — combine ได้หลายเงื่อนไข (AND)
 * เงื่อนไขที่เป็นค่าว่าง/undefined จะถูกข้าม (ไม่กรอง)
 * @param {Array<object>} entries
 * @param {{ category?: string, city?: string, query?: string }} criteria
 * @returns {Array<object>} array ใหม่ของ entries ที่ผ่านเงื่อนไข
 */
export function filterEntries(entries, criteria = {}) {
  if (!Array.isArray(entries)) return [];
  const { category, city, query } = criteria;

  return entries.filter((entry) => {
    if (category && entry?.category !== category) return false;
    if (city && entry?.city !== city) return false;
    if (!searchMatches(entry, query)) return false;
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
