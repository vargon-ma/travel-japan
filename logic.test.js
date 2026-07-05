import { describe, it, expect } from 'vitest';
import {
  getStartingPriceJpy,
  getPriceLevel,
  convertJpyToThb,
  filterEntries,
  sortByPrice,
  searchMatches,
  wikiThumbUrl,
  validateEntry,
  validateDataset,
  CATEGORIES,
  CITIES,
} from './logic.js';
import dataset from './data.json';

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

describe('getPriceLevel', () => {
  it('ราคา ≤1000 เป็นระดับ 1 (¥)', () => {
    expect(getPriceLevel(1)).toBe(1);
    expect(getPriceLevel(500)).toBe(1);
    expect(getPriceLevel(1000)).toBe(1);
  });

  it('ฟรี (0) นับเป็นระดับ 1', () => {
    expect(getPriceLevel(0)).toBe(1);
  });

  it('ราคา 1001–5000 เป็นระดับ 2 (¥¥)', () => {
    expect(getPriceLevel(1001)).toBe(2);
    expect(getPriceLevel(3500)).toBe(2);
    expect(getPriceLevel(5000)).toBe(2);
  });

  it('ราคา >5000 เป็นระดับ 3 (¥¥¥)', () => {
    expect(getPriceLevel(5001)).toBe(3);
    expect(getPriceLevel(35000)).toBe(3);
  });

  it('คืน null เมื่อไม่มีราคาที่ใช้ได้ (null/NaN/ติดลบ)', () => {
    expect(getPriceLevel(null)).toBe(null);
    expect(getPriceLevel(undefined)).toBe(null);
    expect(getPriceLevel(NaN)).toBe(null);
    expect(getPriceLevel(-100)).toBe(null);
  });
});

describe('wikiThumbUrl', () => {
  const ORIG =
    'https://upload.wikimedia.org/wikipedia/commons/d/df/Castillo_de_Osaka_2023.jpg';

  it('แปลงต้นฉบับ Wikimedia เป็น thumb ตามขนาดที่อนุญาต', () => {
    expect(wikiThumbUrl(ORIG, 500)).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Castillo_de_Osaka_2023.jpg/500px-Castillo_de_Osaka_2023.jpg',
    );
  });

  it('snap ขนาดที่ขอลงเป็นขนาดที่อนุญาตที่ใหญ่สุดแต่ไม่เกิน (640→500)', () => {
    expect(wikiThumbUrl(ORIG, 640)).toContain('/500px-');
  });

  it('ขอเล็กกว่าทุกค่าที่อนุญาต ใช้ขนาดต่ำสุด (200→250)', () => {
    expect(wikiThumbUrl(ORIG, 200)).toContain('/250px-');
  });

  it('คงอักขระเข้ารหัสในชื่อไฟล์ (เช่น %E2%85%A2)', () => {
    const url =
      'https://upload.wikimedia.org/wikipedia/commons/8/84/Tokyo_Skytree_2014_%E2%85%A2.jpg';
    expect(wikiThumbUrl(url, 500)).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Tokyo_Skytree_2014_%E2%85%A2.jpg/500px-Tokyo_Skytree_2014_%E2%85%A2.jpg',
    );
  });

  it('ไม่แตะ URL ที่เป็น thumb อยู่แล้ว', () => {
    const thumb =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Castillo_de_Osaka_2023.jpg/500px-Castillo_de_Osaka_2023.jpg';
    expect(wikiThumbUrl(thumb, 500)).toBe(thumb);
  });

  it('คืน URL เดิมเมื่อไม่ใช่รูปจาก Wikimedia upload (เช่น Unsplash)', () => {
    const other = 'https://images.unsplash.com/photo-123';
    expect(wikiThumbUrl(other, 500)).toBe(other);
  });

  it('ทนต่อ input ที่ไม่ใช่สตริง', () => {
    expect(wikiThumbUrl(null, 500)).toBe(null);
    expect(wikiThumbUrl(undefined, 500)).toBe(undefined);
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
    tags: ['เรโทร', 'ของสะสม'],
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

  it('bookmarkedOnly: true กรองเฉพาะ id ที่อยู่ใน bookmarkedIds', () => {
    const result = filterEntries(SAMPLE, {
      bookmarkedOnly: true,
      bookmarkedIds: ['skytree', 'ichiran'],
    });
    expect(result.map((e) => e.id)).toEqual(['skytree', 'ichiran']);
  });

  it('bookmarkedOnly: false ไม่กรองด้วยบุ๊กมาร์ก (คืนทุก entry แม้ส่ง bookmarkedIds มา)', () => {
    const result = filterEntries(SAMPLE, {
      bookmarkedOnly: false,
      bookmarkedIds: ['skytree'],
    });
    expect(result).toHaveLength(3);
  });

  it('bookmarkedOnly: true แต่ไม่มี id ที่บุ๊กมาร์ก → ผลว่าง', () => {
    expect(filterEntries(SAMPLE, { bookmarkedOnly: true, bookmarkedIds: [] })).toEqual([]);
    expect(filterEntries(SAMPLE, { bookmarkedOnly: true })).toEqual([]);
  });

  it('รองรับ bookmarkedIds เป็น Set', () => {
    const result = filterEntries(SAMPLE, {
      bookmarkedOnly: true,
      bookmarkedIds: new Set(['super-potato']),
    });
    expect(result.map((e) => e.id)).toEqual(['super-potato']);
  });

  it('combine bookmarkedOnly กับหมวด/ค้นหา (AND)', () => {
    const result = filterEntries(SAMPLE, {
      category: 'sightseeing',
      bookmarkedOnly: true,
      bookmarkedIds: ['skytree', 'ichiran'],
    });
    expect(result.map((e) => e.id)).toEqual(['skytree']);
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

  it('ค้นเจอจากแท็ก (tags)', () => {
    expect(searchMatches(entry, 'เรโทร')).toBe(true);
    expect(searchMatches(entry, 'ของสะสม')).toBe(true);
  });

  it('คืน false เมื่อไม่ตรงคำค้น', () => {
    expect(searchMatches(entry, 'ราเมง')).toBe(false);
  });
});

// entry สมบูรณ์ตาม DoD — ใช้เป็นฐานแล้ว "ทำให้พัง" ทีละจุดในเทสต์
function makeValidEntry(overrides = {}) {
  return {
    id: 'valid-entry',
    nameTh: 'ร้านตัวอย่าง',
    nameJa: 'サンプル店',
    nameRomaji: 'Sample Shop',
    category: 'food',
    city: 'tokyo',
    description: 'คำอธิบายร้านตัวอย่างสำหรับทดสอบ validateEntry',
    lat: 35.6812,
    lng: 139.7671,
    address: { th: 'โตเกียว', ja: '東京' },
    hours: '10:00–20:00',
    station: 'ติดสถานีตัวอย่าง ~3 นาที',
    tags: ['แท็กหนึ่ง', 'แท็กสอง'],
    tips: ['ทิปหนึ่ง'],
    images: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Example.jpg',
        source: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
        credit: 'ภาพ: ตัวอย่าง / Wikimedia Commons',
        license: 'CC BY-SA 4.0',
      },
    ],
    products: [
      { nameTh: 'สินค้าหนึ่ง', priceJpy: 500 },
      { nameTh: 'สินค้าสอง', priceJpy: 1200 },
    ],
    sourceUrl: 'https://example.com/',
    ...overrides,
  };
}

describe('validateEntry', () => {
  it('entry สมบูรณ์ → ไม่มี error', () => {
    expect(validateEntry(makeValidEntry())).toEqual([]);
  });

  it('คืน error เดียวเมื่อ entry ไม่ใช่ object', () => {
    expect(validateEntry(null)).toHaveLength(1);
    expect(validateEntry('x')).toHaveLength(1);
    expect(validateEntry([])).toHaveLength(1);
  });

  it('ขาดฟิลด์บังคับ (nameTh/description/sourceUrl) → error ตรงจุด', () => {
    const errs = validateEntry(makeValidEntry({ nameTh: '', description: '  ', sourceUrl: undefined }));
    expect(errs.some((e) => e.includes('nameTh'))).toBe(true);
    expect(errs.some((e) => e.includes('description'))).toBe(true);
    expect(errs.some((e) => e.includes('sourceUrl'))).toBe(true);
  });

  it('category นอก closed set → error', () => {
    const errs = validateEntry(makeValidEntry({ category: 'gadgets' }));
    expect(errs.some((e) => e.includes('category'))).toBe(true);
  });

  it('city นอก closed set → error', () => {
    const errs = validateEntry(makeValidEntry({ city: 'nara' }));
    expect(errs.some((e) => e.includes('city'))).toBe(true);
  });

  it('ขาด station → error ตรงจุด', () => {
    expect(validateEntry(makeValidEntry({ station: '' })).some((e) => e.includes('station'))).toBe(true);
  });

  it('ขาด hours → error ตรงจุด', () => {
    expect(validateEntry(makeValidEntry({ hours: undefined })).some((e) => e.includes('hours'))).toBe(true);
  });

  it('tags น้อยกว่า 2 → error ตรงจุด', () => {
    expect(validateEntry(makeValidEntry({ tags: ['เดียว'] })).some((e) => e.includes('tags'))).toBe(true);
    expect(validateEntry(makeValidEntry({ tags: [] })).some((e) => e.includes('tags'))).toBe(true);
  });

  it('tips ว่าง → error ตรงจุด', () => {
    expect(validateEntry(makeValidEntry({ tips: [] })).some((e) => e.includes('tips'))).toBe(true);
  });

  it('products น้อยกว่า 2 → error ตรงจุด', () => {
    expect(
      validateEntry(makeValidEntry({ products: [{ nameTh: 'ชิ้นเดียว', priceJpy: 100 }] })).some((e) =>
        e.includes('products'),
      ),
    ).toBe(true);
  });

  it('product ที่ราคาไม่ใช่ตัวเลข → error', () => {
    const errs = validateEntry(
      makeValidEntry({
        products: [
          { nameTh: 'ก', priceJpy: 'ฟรี' },
          { nameTh: 'ข', priceJpy: 200 },
        ],
      }),
    );
    expect(errs.some((e) => e.includes('priceJpy'))).toBe(true);
  });

  it('product ที่ราคาติดลบ → error', () => {
    const errs = validateEntry(
      makeValidEntry({
        products: [
          { nameTh: 'ก', priceJpy: -50 },
          { nameTh: 'ข', priceJpy: 200 },
        ],
      }),
    );
    expect(errs.some((e) => e.includes('priceJpy'))).toBe(true);
  });

  it('product ที่ไม่มี nameTh → error', () => {
    const errs = validateEntry(
      makeValidEntry({
        products: [
          { nameTh: '', priceJpy: 100 },
          { nameTh: 'ข', priceJpy: 200 },
        ],
      }),
    );
    expect(errs.some((e) => e.includes('nameTh'))).toBe(true);
  });

  it('ราคา 0 (ฟรี) ถือว่าใช้ได้', () => {
    expect(
      validateEntry(
        makeValidEntry({
          products: [
            { nameTh: 'เข้าฟรี', priceJpy: 0 },
            { nameTh: 'ของที่ระลึก', priceJpy: 800 },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('image ไม่มี license → error', () => {
    const errs = validateEntry(
      makeValidEntry({
        images: [{ url: 'https://x/y.jpg', credit: 'ใครสักคน' }],
      }),
    );
    expect(errs.some((e) => e.includes('license'))).toBe(true);
  });

  it('image ไม่มี credit → error (ADR-0001 บังคับ credit เสมอ)', () => {
    const errs = validateEntry(
      makeValidEntry({
        images: [{ url: 'https://x/y.jpg', license: 'CC0' }],
      }),
    );
    expect(errs.some((e) => e.toLowerCase().includes('credit'))).toBe(true);
  });

  it('image ที่มี source แต่ไม่มี credit → ยัง error (source ไม่แทน credit)', () => {
    const errs = validateEntry(
      makeValidEntry({
        images: [{ url: 'https://x/y.jpg', source: 'https://commons.example/File:Y', license: 'CC0' }],
      }),
    );
    expect(errs.some((e) => e.toLowerCase().includes('credit'))).toBe(true);
  });

  it('image ไม่มี url → error', () => {
    const errs = validateEntry(
      makeValidEntry({
        images: [{ credit: 'ใครสักคน', license: 'CC0' }],
      }),
    );
    expect(errs.some((e) => e.includes('url'))).toBe(true);
  });

  it('entry ที่ไม่มี images เลย ถือว่าผ่าน (image เป็น optional)', () => {
    const e = makeValidEntry();
    delete e.images;
    expect(validateEntry(e)).toEqual([]);
  });

  it('image ที่มี isIllustrative: true ยังต้องมี credit/license ครบ (ยังผ่าน)', () => {
    const errs = validateEntry(
      makeValidEntry({
        images: [
          {
            url: 'https://x/y.jpg',
            source: 'https://commons.wikimedia.org/wiki/File:Y.jpg',
            credit: 'ภาพประกอบ: ใครสักคน',
            license: 'CC BY-SA 2.0',
            isIllustrative: true,
          },
        ],
      }),
    );
    expect(errs).toEqual([]);
  });

  it('lat/lng นอกกรอบพิกัดญี่ปุ่น → error', () => {
    expect(validateEntry(makeValidEntry({ lat: 13.75 })).some((e) => e.includes('lat'))).toBe(true);
    expect(validateEntry(makeValidEntry({ lng: 100.5 })).some((e) => e.includes('lng'))).toBe(true);
    expect(validateEntry(makeValidEntry({ lat: 'x', lng: null })).length).toBeGreaterThanOrEqual(2);
  });
});

describe('validateDataset', () => {
  it('คืน array ว่างเมื่อทุก entry ผ่านและ id ไม่ซ้ำ', () => {
    expect(validateDataset([makeValidEntry({ id: 'a' }), makeValidEntry({ id: 'b' })])).toEqual([]);
  });

  it('รายงาน id ซ้ำ', () => {
    const errs = validateDataset([makeValidEntry({ id: 'dup' }), makeValidEntry({ id: 'dup' })]);
    expect(errs.some((e) => e.includes('dup') && e.includes('ซ้ำ'))).toBe(true);
  });

  it('รวม error ของ entry ที่บกพร่องพร้อม id นำหน้า', () => {
    const errs = validateDataset([makeValidEntry({ id: 'broken', category: 'nope' })]);
    expect(errs.some((e) => e.startsWith('broken') && e.includes('category'))).toBe(true);
  });

  it('ทนต่อ input ที่ไม่ใช่ array', () => {
    expect(validateDataset(null)).toHaveLength(1);
  });
});

// ---- Dataset guard: data.json จริงต้องผ่าน validator ทั้งหมด ----
describe('data.json (dataset guard)', () => {
  it('ทุก entry ผ่าน validateEntry (0 error รวม) และ id ไม่ซ้ำ', () => {
    const errors = validateDataset(dataset.entries);
    expect(errors).toEqual([]);
  });

  it('category ของทุก entry อยู่ใน closed set; city อยู่ใน closed set', () => {
    for (const e of dataset.entries) {
      expect(CATEGORIES).toContain(e.category);
      expect(CITIES).toContain(e.city);
    }
  });

  it('ทุกหมวดมี entry อย่างน้อย 3 รายการ (floor ≥ 3 กัน empty-state)', () => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    for (const e of dataset.entries) counts[e.category]++;
    for (const c of CATEGORIES) {
      expect(counts[c], `หมวด ${c} มี ${counts[c]} รายการ (ต้อง ≥ 3)`).toBeGreaterThanOrEqual(3);
    }
  });

  it('Editor\'s Picks: มี 8–10 ร้าน กระจายหลายหมวด/หลายเมือง และมีเหตุผลทุกอัน', () => {
    const picks = dataset.entries.filter((e) => e.editorsPick === true);
    // 8–10 picks (คัดจาก ~49 ร้าน)
    expect(picks.length).toBeGreaterThanOrEqual(8);
    expect(picks.length).toBeLessThanOrEqual(10);
    // ทุก pick มี editorsPickReason ที่จับต้องได้ (ไม่ว่าง)
    for (const e of picks) {
      expect(typeof e.editorsPickReason === 'string' && e.editorsPickReason.trim().length > 0,
        `${e.id} ขาด editorsPickReason`).toBe(true);
    }
    // กระจายหลายหมวด (ไม่กระจุกแนวเดียว) และมากกว่า 1 เมือง
    expect(new Set(picks.map((e) => e.category)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(picks.map((e) => e.city)).size).toBeGreaterThan(1);
  });
});
