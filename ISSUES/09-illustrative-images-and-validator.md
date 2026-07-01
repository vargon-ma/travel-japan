# Issue 09 — Foundation: ฟิลด์ `isIllustrative` + ป้าย UI + `validateEntry` + tests

> **Label:** `ready-for-agent`

## Parent

`PRD-dataset-expansion.md`

## What to build

วาง foundation (prefactor) ให้ batch เนื้อหา 10–13 ต่อยอดได้ — ตัดผ่านทุกชั้น (schema → logic → UI → test) และพิสูจน์ทางเดินด้วยข้อมูลจริงอย่างน้อย 2 ร้าน

- **Schema:** รองรับฟิลด์ `isIllustrative?: boolean` บนแต่ละรายการใน `images[]` ของ entry (`true` = ภาพประกอบบริบท ไม่ใช่ภาพร้านจริง) ทุกรูปยังต้องมี `source`/`credit`/`license` เสมอ (ADR-0001/0003)
- **Logic (seam เดียว) — `logic.js`:** เพิ่ม pure function `validateEntry(entry)` คืน array ของ error string (ว่าง = ผ่าน) ไม่ throw / ไม่แตะ DOM/network ตรวจ:
  - ฟิลด์บังคับตาม schema ครบ
  - `category` ∈ closed set 8 ค่า; `city` ∈ closed set 3 ค่า
  - DoD: มี `station`, `hours`, `tags.length ≥ 2`, `tips.length ≥ 1`, `products.length ≥ 2`
  - ทุก product มี `nameTh` + `priceJpy` เป็นตัวเลข ≥ 0
  - ทุก image มี `url` + (`credit` หรือ `source`) + `license`
  - `lat`/`lng` เป็นตัวเลขในกรอบพิกัดญี่ปุ่นคร่าว ๆ
  - (optional) `validateDataset(entries)` เช็ค `id` ซ้ำ + floor ≥ 3 ต่อหมวด ถ้าช่วยให้ test อ่านง่าย
- **UI (side-effect layer):** เรนเดอร์ป้ายเล็ก "ภาพประกอบ" มุมรูปเมื่อ `isIllustrative === true` ทั้งในการ์ดและแกลเลอรีโมดัล
- **พิสูจน์ทางเดิน:** แปลงร้านเดิมอย่างน้อย 2 ร้าน — 1 ร้านให้มีรูป `isIllustrative: true` (เห็นป้าย), อีก 1 ร้าน placeholder→รูปจริงเสรี (มี credit/license)
- อัปเดต `CLAUDE.md` (ส่วน pure functions + image policy) และ README ให้ตรง

## Acceptance criteria

- [ ] `validateEntry(entry)` มีใน `logic.js` เป็น pure function คืน array ของ error (ว่าง = ผ่าน)
- [ ] `describe('validateEntry')` ใน `logic.test.js`: เคสสมบูรณ์→ไม่มี error; ขาดแต่ละ DoD field→error ตรงจุด; category/city นอก closed set→error; image ไม่มี license→error; product ราคาไม่ใช่ตัวเลข→error
- [ ] มี dataset guard test: วน `validateEntry` ทุก entry ใน `data.json` แล้วได้ 0 error รวม + `id` ไม่ซ้ำ
- [ ] UI แสดงป้าย "ภาพประกอบ" เมื่อ `isIllustrative === true` (การ์ด + แกลเลอรีโมดัล)
- [ ] มีอย่างน้อย 1 ร้านใช้ `isIllustrative: true` จริง และอย่างน้อย 1 ร้านเดิมเปลี่ยนจาก placeholder เป็นรูปจริง
- [ ] `npm test` เขียวทั้งหมด; `CLAUDE.md`/README อัปเดตตรงกับพฤติกรรมใหม่

## Blocked by

- None — can start immediately
