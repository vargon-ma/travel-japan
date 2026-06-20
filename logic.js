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
