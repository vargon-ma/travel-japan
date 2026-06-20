# Issue 06 — บุ๊กมาร์ก (localStorage) + ฟิลเตอร์ "เฉพาะที่ถูกใจ"

> **Label:** `ready-for-agent`

## What to build

ปุ่มถูกใจ/บุ๊กมาร์กที่บันทึกข้ามการเปิดเว็บ และฟิลเตอร์ดูเฉพาะรายการที่บุ๊กมาร์ก

- ปุ่มถูกใจบนการ์ดและในโมดัล (toggle สถานะ)
- เก็บ id ที่บุ๊กมาร์กไว้ใน `localStorage` (คงอยู่เมื่อเปิดใหม่)
- เพิ่ม toggle "เฉพาะที่บุ๊กมาร์ก" ในแถบฟิลเตอร์
- ขยาย `filterEntries` ให้รับ `{ bookmarkedOnly, bookmarkedIds }` (pure — id ที่บุ๊กมาร์กถูกส่งเข้าไปเป็น argument ไม่อ่าน localStorage ใน logic)

## Acceptance criteria

- [ ] กดถูกใจบนการ์ด/โมดัลแล้วสถานะเปลี่ยนและตรงกัน
- [ ] รายการบุ๊กมาร์กคงอยู่หลังรีโหลดหน้า (localStorage)
- [ ] toggle "เฉพาะที่บุ๊กมาร์ก" กรองให้เห็นเฉพาะที่บันทึกไว้
- [ ] `filterEntries` รองรับ `bookmarkedOnly`/`bookmarkedIds` แบบ pure + มีเทสต์ครอบ

## Blocked by

- Issue 01 — Walking skeleton
- Issue 03 — ฟิลเตอร์ + ค้นหา + เรียงราคา
