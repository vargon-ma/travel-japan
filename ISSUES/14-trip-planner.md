# Issue 14 — Trip Planner: จัดร้านที่บุ๊กมาร์กลงวันเที่ยว + งบประมาณ

> **Label:** `ready-for-agent`

## What to build

มุมมองที่ 3 "📅 แผนเที่ยว" ต่อจาก "▦ กริด" / "🗺 แผนที่" เดิม ให้ผู้ใช้จัด Entry ที่บุ๊กมาร์กไว้ลงเป็น Trip Day
(ดูนิยาม Trip Plan / Trip Day / Trip Total / Bookmark ใน [CONTEXT.md](../CONTEXT.md) และเหตุผลของดีไซน์ใน
[ADR-0004](../docs/adr/0004-trip-plan-built-on-bookmark-pool.md))

- ปุ่ม/toggle มุมมองที่ 3 คู่กับ `viewtoggle__btn` เดิม (`data-view="trip"`)
- ในมุมมองนี้: list ของ Entry ที่บุ๊กมาร์กไว้ทั้งหมด แบ่งเป็นกลุ่ม "ยังไม่จัดวัน" + "วันที่ 1", "วันที่ 2", ... (ป้ายลำดับ ไม่ผูกปฏิทิน)
- แต่ละ Entry มี dropdown/ปุ่มเลือกว่าจะย้ายไปวันไหน (ไม่ทำ drag & drop) + ปุ่ม "+ เพิ่มวัน" สร้าง Trip Day ใหม่
- ภายในหนึ่ง Trip Day: ปุ่ม ▲▼ ย้ายลำดับ Entry เอง (ไม่มี route optimizer อัตโนมัติ)
- แผนที่: มี tab เลือกวัน — เลือกวันไหนแผนที่โชว์เฉพาะหมุดของวันนั้น มีเลขลำดับกำกับ (1, 2, 3...) และเส้น polyline เชื่อมตามลำดับ (reuse แผนที่ Leaflet เดิมจาก Issue 04)
- สรุปงบประมาณ: ยอดรวมต่อ Trip Day + ยอดรวมทั้ง Trip Plan เป็น ¥ และ ฿ (reuse `convertJpyToThb`, `getStartingPriceJpy`)
- เก็บ Trip Plan ใน `localStorage` (key ใหม่ เช่น `tripPlanDays`) ตามแพทเทิร์นเดียวกับบุ๊กมาร์กใน Issue 06 (อ่าน/เขียนแบบ fail-silent ไม่ให้เว็บพัง)
- **Invariant (ADR-0004):** เลิกบุ๊กมาร์ก Entry ที่อยู่ใน Trip Day ใดๆ แล้ว ต้องเอา Entry นั้นออกจาก Trip Day นั้นทันทีอัตโนมัติ
- ปุ่มจัดวันอยู่เฉพาะในมุมมอง "แผนเที่ยว" เท่านั้น — การ์ดกริด (`renderGrid`) ไม่ต้องแก้

### Logic layer (pure functions ใหม่ใน `logic.js`)

- ฟังก์ชันคำนวณ Trip Total ต่อวัน/ทั้งทริป จาก Entry[] + rate (คืน JPY และ THB) — ล้วน pure ไม่แตะ localStorage
- ฟังก์ชัน sync ที่ตัด Entry ที่ไม่ได้บุ๊กมาร์กแล้วออกจากโครงสร้าง Trip Day (รับ tripDays + bookmarkedIds → คืน tripDays ที่กรองแล้ว)

## Acceptance criteria

- [ ] toggle มุมมองมี "📅 แผนเที่ยว" เพิ่มจากกริด/แผนที่ สลับได้ปกติ
- [ ] Entry ที่บุ๊กมาร์กไว้ขึ้นในกลุ่ม "ยังไม่จัดวัน" โดยดีฟอลต์ ย้ายไปวันที่ต้องการได้ด้วยปุ่ม/dropdown
- [ ] กด "+ เพิ่มวัน" สร้าง Trip Day ใหม่ได้ไม่จำกัดจำนวน
- [ ] ปุ่ม ▲▼ ย้ายลำดับ Entry ภายในวันเดียวกันได้
- [ ] เลือก tab วันในมุมมองแผนเที่ยว → แผนที่โชว์เฉพาะหมุดวันนั้น มีเลขลำดับ + เส้นเชื่อมตามลำดับ
- [ ] โชว์ยอดรวม ¥/฿ ต่อวัน และยอดรวมทั้งทริป ถูกต้องตรงกับ Entry ที่จัดไว้
- [ ] Trip Plan คงอยู่หลังรีโหลดหน้า (localStorage)
- [ ] เลิกบุ๊กมาร์ก Entry ที่อยู่ใน Trip Day แล้ว → หายจาก Trip Day นั้นทันที (เทสต์ครอบ sync function นี้)
- [ ] ฟังก์ชันคำนวณ Trip Total และฟังก์ชัน sync บุ๊กมาร์ก↔Trip Day เป็น pure function ใน `logic.js` + มีเทสต์ครอบใน `logic.test.js`
- [ ] การ์ดในกริด (`renderGrid`) ไม่มีการเปลี่ยนแปลง

## Blocked by

- Issue 01 — Walking skeleton
- Issue 04 — แผนที่ Leaflet sync กับ view
- Issue 06 — บุ๊กมาร์ก (localStorage) + ฟิลเตอร์ "เฉพาะที่ถูกใจ"
