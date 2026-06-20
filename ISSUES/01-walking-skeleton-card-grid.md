# Issue 01 — Walking skeleton: กริดการ์ดจากข้อมูล

> **Label:** `ready-for-agent`

## What to build

วาง scaffold ของโปรเจกต์ทั้งหมดให้เป็น walking skeleton ที่ตัดผ่านทุกชั้น: โหลดข้อมูลจาก `data.json` → ผ่าน pure logic → render เป็นกริดการ์ดบนหน้าเว็บ

- สร้างไฟล์: `index.html`, `style.css`, `app.js` (ES module), `logic.js` (ES module ของ pure functions), `data.json`, `package.json` (Vitest เป็น dev dependency), `README.md`
- `data.json` มี seed 2–3 entry (ข้อมูลจริงพอใช้ ใส่ครบ field ตาม schema ใน PRD: id, nameTh, nameJa, nameRomaji, category, city, description, lat, lng, address, images[], products[], sourceUrl)
- `app.js` `fetch('data.json')` แล้ว render กริดการ์ด: แต่ละการ์ดแสดงชื่อไทย + ชื่อญี่ปุ่น/โรมาจิกำกับ, รูป (หรือ placeholder ถ้าไม่มี), ป้ายหมวด + เมือง, ราคาเริ่มต้นเป็น ¥
- `logic.js` มีฟังก์ชันแรก `getStartingPriceJpy(entry)` คืนราคาต่ำสุดใน `products` (ไม่มี products → คืนค่าที่จัดการได้ เช่น null)
- `README.md` อธิบายว่าต้องรันผ่าน local web server (เช่น `python -m http.server` หรือ Live Server) เพราะ `fetch` ติด CORS บน `file://` + วิธีรันเทสต์ (`npm test`)
- ตั้งค่า Vitest + เขียนเทสต์แรกของ `getStartingPriceJpy`

## Acceptance criteria

- [ ] เปิดเว็บผ่าน local server แล้วเห็นกริดการ์ดจาก `data.json`
- [ ] การ์ดแสดงชื่อ TH + JA/โรมาจิ, รูป/placeholder, ป้ายหมวด+เมือง, ราคาเริ่มต้น ¥
- [ ] `getStartingPriceJpy` เป็น pure function ใน `logic.js` ถูก import โดยทั้ง `app.js` และเทสต์
- [ ] `npm test` รันผ่าน และมีเทสต์ครอบ `getStartingPriceJpy` (หลาย products / product เดียว / ไม่มี product)
- [ ] `README.md` บอกวิธีรันเว็บผ่าน server และวิธีรันเทสต์

## Blocked by

None - can start immediately
