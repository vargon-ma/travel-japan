# Issue 03 — ฟิลเตอร์ + ค้นหา + เรียงราคา

> **Label:** `ready-for-agent`

## What to build

แถบฟิลเตอร์เหนือกริด ให้ผู้ใช้กรอง ค้นหา และเรียงรายการ โดยกริดอัปเดตตาม view model

- แถบฟิลเตอร์: เลือกหมวด (ท่องเที่ยว/เกม/คอสเพลย์/เครื่องใช้ไฟฟ้า/อาหาร), เลือกเมือง, ช่องค้นหา (ชื่อร้าน/สถานที่/สินค้า), ปุ่มเรียงราคา (ถูก→แพง / แพง→ถูก)
- `logic.js` เพิ่ม pure functions:
  - `filterEntries(entries, { category, city, query })` → entries ที่ผ่านเงื่อนไข (combine ได้หลายเงื่อนไข)
  - `sortByPrice(entries, direction)` → เรียงตามราคาเริ่มต้น (ใช้ `getStartingPriceJpy`)
- กริด re-render ตามผลของ logic; แสดง empty state ที่เข้าใจง่ายเมื่อไม่มีรายการตรงกับฟิลเตอร์

## Acceptance criteria

- [ ] เลือกหมวด/เมือง/พิมพ์ค้นหา แล้วกริดอัปเดตตามทันที (combine เงื่อนไขได้)
- [ ] เรียงราคาได้ทั้งสองทิศทาง
- [ ] ไม่มีผลลัพธ์ → แสดง empty state ชัดเจน
- [ ] `filterEntries` และ `sortByPrice` เป็น pure functions + มีเทสต์ (กรองเดี่ยว, combine, ค้นหาตรง/ไม่ตรง, ผลว่าง, เรียงสองทิศ, entry ไม่มี products, ราคาเท่ากัน)

## Blocked by

- Issue 01 — Walking skeleton
