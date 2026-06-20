# Issue 02 — แปลงค่าเงิน JPY→บาท (เรตสด + fallback)

> **Label:** `ready-for-agent`

## What to build

ดึงอัตราแลกเปลี่ยน JPY→THB สดตอนเปิดเว็บ แล้วแสดงราคาทุกชิ้นทั้งเป็นเยนและบาท

- ตอนโหลด `fetch` เรต JPY→THB จาก free API ที่ไม่ต้องใช้ key
- `convertJpyToThb(jpy, rate)` ใน `logic.js` (pure) คำนวณ + ปัดเศษ
- การ์ด (และที่ที่แสดงราคา) แสดงทั้ง `¥X,XXX` และ `฿X,XXX`
- แสดงป้าย "เรต ณ วันที่ …" จากข้อมูล response
- ถ้า fetch ล้มเหลว ใช้เรตสำรองที่ฝังไว้ในโค้ด พร้อมหมายเหตุว่าเป็นเรตโดยประมาณ — เว็บต้องไม่พัง

## Acceptance criteria

- [ ] ราคาบนการ์ดแสดงทั้ง ¥ และ ฿
- [ ] เรตดึงจาก API ตอนโหลด และมีป้าย "เรต ณ วันที่ …"
- [ ] ปิด network / API ล่ม → เว็บยังแสดงบาทด้วยเรตสำรอง พร้อมหมายเหตุ
- [ ] `convertJpyToThb` เป็น pure function + มีเทสต์ (คำนวณถูก, ปัดเศษ, jpy=0, rate=fallback)

## Blocked by

- Issue 01 — Walking skeleton
