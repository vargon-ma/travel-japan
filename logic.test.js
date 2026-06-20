import { describe, it, expect } from 'vitest';
import { getStartingPriceJpy } from './logic.js';

describe('getStartingPriceJpy', () => {
  it('คืนราคาต่ำสุดเมื่อมีหลาย products', () => {
    const entry = {
      products: [
        { nameTh: 'ก', priceJpy: 1200 },
        { nameTh: 'ข', priceJpy: 480 },
        { nameTh: 'ค', priceJpy: 999 },
      ],
    };
    expect(getStartingPriceJpy(entry)).toBe(480);
  });

  it('คืนราคาของ product เดียวเมื่อมีชิ้นเดียว', () => {
    const entry = { products: [{ nameTh: 'ก', priceJpy: 750 }] };
    expect(getStartingPriceJpy(entry)).toBe(750);
  });

  it('คืน null เมื่อ products ว่าง', () => {
    expect(getStartingPriceJpy({ products: [] })).toBe(null);
  });

  it('คืน null เมื่อไม่มี field products เลย', () => {
    expect(getStartingPriceJpy({})).toBe(null);
  });

  it('ข้าม product ที่ priceJpy ไม่ใช่ตัวเลขที่ใช้ได้', () => {
    const entry = {
      products: [
        { nameTh: 'ก', priceJpy: null },
        { nameTh: 'ข', priceJpy: 300 },
      ],
    };
    expect(getStartingPriceJpy(entry)).toBe(300);
  });

  it('คืน null เมื่อไม่มี priceJpy ที่ใช้ได้เลย', () => {
    const entry = { products: [{ nameTh: 'ก', priceJpy: null }] };
    expect(getStartingPriceJpy(entry)).toBe(null);
  });
});
