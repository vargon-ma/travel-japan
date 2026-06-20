import { describe, it, expect } from 'vitest';
import {
  getStartingPriceJpy,
  convertJpyToThb,
  filterEntries,
  sortByPrice,
  searchMatches,
} from './logic.js';

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

describe('convertJpyToThb', () => {
  it('คำนวณบาทจากเยนถูกต้อง', () => {
    expect(convertJpyToThb(1000, 0.23)).toBe(230);
    expect(convertJpyToThb(1800, 0.23)).toBe(414);
  });

  it('ปัดเศษเป็นจำนวนเต็มบาท (.5 ปัดขึ้น)', () => {
    // 100 * 0.235 = 23.5 → 24
    expect(convertJpyToThb(100, 0.235)).toBe(24);
    // 980 * 0.2345 = 229.81 → 230
    expect(convertJpyToThb(980, 0.2345)).toBe(230);
  });

  it('คืน 0 เมื่อ jpy = 0', () => {
    expect(convertJpyToThb(0, 0.23)).toBe(0);
  });

  it('คำนวณถูกต้องเมื่อใช้เรตสำรอง (fallback)', () => {
    // เรตสำรองโดยประมาณ ~0.22
    expect(convertJpyToThb(500, 0.22)).toBe(110);
  });

  it('คืน null เมื่อ jpy ไม่ใช่ตัวเลขที่ใช้ได้ (เช่น null)', () => {
    expect(convertJpyToThb(null, 0.23)).toBe(null);
    expect(convertJpyToThb(undefined, 0.23)).toBe(null);
  });

  it('คืน null เมื่อ rate ไม่ใช่ตัวเลขที่ใช้ได้', () => {
    expect(convertJpyToThb(1000, null)).toBe(null);
    expect(convertJpyToThb(1000, NaN)).toBe(null);
  });
});

const SAMPLE = [
  {
    id: 'super-potato',
    nameTh: 'ซูเปอร์โปเตโต้',
    nameJa: 'スーパーポテト',
    nameRomaji: 'Super Potato',
    category: 'games',
    city: 'tokyo',
    products: [
      { nameTh: 'ตลับเกมแฟมิคอม', priceJpy: 500 },
      { nameTh: 'เครื่องเกมเรโทร', priceJpy: 9800 },
    ],
  },
  {
    id: 'skytree',
    nameTh: 'โตเกียวสกายทรี',
    nameJa: '東京スカイツリー',
    nameRomaji: 'Tokyo Skytree',
    category: 'sightseeing',
    city: 'tokyo',
    products: [{ nameTh: 'บัตรชมวิว', priceJpy: 2100 }],
  },
  {
    id: 'ichiran',
    nameTh: 'อิจิรัน',
    nameJa: '一蘭',
    nameRomaji: 'Ichiran',
    category: 'food',
    city: 'osaka',
    products: [{ nameTh: 'ราเมงทงคตสึ', priceJpy: 980 }],
  },
];

describe('filterEntries', () => {
  it('คืนทุก entry เมื่อไม่มีเงื่อนไข', () => {
    expect(filterEntries(SAMPLE, {})).toHaveLength(3);
    expect(filterEntries(SAMPLE, { category: '', city: '', query: '' })).toHaveLength(3);
  });

  it('กรองตามหมวดเดียว', () => {
    const result = filterEntries(SAMPLE, { category: 'games' });
    expect(result.map((e) => e.id)).toEqual(['super-potato']);
  });

  it('กรองตามเมืองเดียว', () => {
    const result = filterEntries(SAMPLE, { city: 'tokyo' });
    expect(result.map((e) => e.id)).toEqual(['super-potato', 'skytree']);
  });

  it('ค้นหาเจอจากชื่อไทย (case-insensitive + ตัดช่องว่าง)', () => {
    const result = filterEntries(SAMPLE, { query: '  อิจิ ' });
    expect(result.map((e) => e.id)).toEqual(['ichiran']);
  });

  it('ค้นหาเจอจากชื่อโรมาจิแบบไม่สนตัวพิมพ์', () => {
    const result = filterEntries(SAMPLE, { query: 'skytree' });
    expect(result.map((e) => e.id)).toEqual(['skytree']);
  });

  it('ค้นหาเจอจากชื่อสินค้า', () => {
    const result = filterEntries(SAMPLE, { query: 'ราเมง' });
    expect(result.map((e) => e.id)).toEqual(['ichiran']);
  });

  it('ค้นหาไม่เจอ → คืนผลว่าง', () => {
    expect(filterEntries(SAMPLE, { query: 'ไม่มีคำนี้แน่นอน' })).toEqual([]);
  });

  it('combine หลายเงื่อนไข (หมวด + เมือง + ค้นหา)', () => {
    const result = filterEntries(SAMPLE, {
      category: 'games',
      city: 'tokyo',
      query: 'potato',
    });
    expect(result.map((e) => e.id)).toEqual(['super-potato']);
  });

  it('combine ที่ไม่มีอะไรตรง → ผลว่าง', () => {
    const result = filterEntries(SAMPLE, { category: 'games', city: 'osaka' });
    expect(result).toEqual([]);
  });

  it('ไม่แก้ไข array ต้นฉบับ', () => {
    const copy = [...SAMPLE];
    filterEntries(SAMPLE, { category: 'food' });
    expect(SAMPLE).toEqual(copy);
  });
});

describe('sortByPrice', () => {
  it('เรียงถูก→แพง (asc) ตามราคาเริ่มต้น', () => {
    const result = sortByPrice(SAMPLE, 'asc');
    expect(result.map((e) => e.id)).toEqual(['super-potato', 'ichiran', 'skytree']);
  });

  it('เรียงแพง→ถูก (desc) ตามราคาเริ่มต้น', () => {
    const result = sortByPrice(SAMPLE, 'desc');
    expect(result.map((e) => e.id)).toEqual(['skytree', 'ichiran', 'super-potato']);
  });

  it('entry ที่ไม่มี products ถูกดันไปท้ายสุดทั้งสองทิศ', () => {
    const withEmpty = [
      { id: 'no-price', products: [] },
      ...SAMPLE,
    ];
    expect(sortByPrice(withEmpty, 'asc').map((e) => e.id)).toEqual([
      'super-potato',
      'ichiran',
      'skytree',
      'no-price',
    ]);
    expect(sortByPrice(withEmpty, 'desc').map((e) => e.id)).toEqual([
      'skytree',
      'ichiran',
      'super-potato',
      'no-price',
    ]);
  });

  it('ราคาเท่ากันคงลำดับเดิม (stable)', () => {
    const tie = [
      { id: 'a', products: [{ priceJpy: 1000 }] },
      { id: 'b', products: [{ priceJpy: 1000 }] },
      { id: 'c', products: [{ priceJpy: 500 }] },
    ];
    expect(sortByPrice(tie, 'asc').map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('ไม่แก้ไข array ต้นฉบับ', () => {
    const copy = [...SAMPLE];
    sortByPrice(SAMPLE, 'asc');
    expect(SAMPLE).toEqual(copy);
  });
});

describe('searchMatches', () => {
  const entry = SAMPLE[0]; // ซูเปอร์โปเตโต้ / Super Potato / ตลับเกมแฟมิคอม

  it('คืน true เมื่อคำค้นว่างหรือมีแต่ช่องว่าง', () => {
    expect(searchMatches(entry, '')).toBe(true);
    expect(searchMatches(entry, '   ')).toBe(true);
    expect(searchMatches(entry, undefined)).toBe(true);
  });

  it('ค้นเจอจากชื่อไทย / ญี่ปุ่น / โรมาจิ (ไม่สนตัวพิมพ์)', () => {
    expect(searchMatches(entry, 'ซูเปอร์')).toBe(true);
    expect(searchMatches(entry, 'スーパー')).toBe(true);
    expect(searchMatches(entry, 'SUPER potato')).toBe(true);
  });

  it('ค้นเจอจากชื่อสินค้า และตัดช่องว่างหัวท้าย', () => {
    expect(searchMatches(entry, '  ตลับเกม ')).toBe(true);
  });

  it('คืน false เมื่อไม่ตรงคำค้น', () => {
    expect(searchMatches(entry, 'ราเมง')).toBe(false);
  });
});
