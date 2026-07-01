# Issue 10 — เติมหมวดที่โล่ง: shopping, cafe, anime-goods (+รูป)

> **Label:** `ready-for-agent`

## Parent

`PRD-dataset-expansion.md`

## What to build

แก้ปัญหา "หมวดว่าง/บาง" ที่เห็นชัดสุด — เพิ่มร้านคุณภาพให้หมวดที่ยังโล่ง แต่ละร้านผ่าน Definition of Done เต็ม และมีรูป (จริงหรือภาพประกอบ) demo ได้: เปิดเว็บ กดชิปหมวดนั้น → เจอร้านใหม่พร้อมรูป ไม่เจอ empty-state

- **shopping 0→5** (หมวดใหม่ทั้งหมด) — ตั้งต้น Don Quijote, Shibuya 109, Tokyu Hands/Loft, Shinsaibashi-suji (โอซาก้า), Nakamise (อาซากุสะ)
  - ยึดเกณฑ์จัดหมวด "ขายอะไรเป็นหลัก": ร้านขายปนกัน (ดองกี้)→`shopping` ไม่ใช่ `electronics`
- **cafe 1→4** — คาเฟ่ที่มีเอกลักษณ์ กระจายเมือง
- **anime-goods 2→5** — ร้านของสะสม/ฟิกเกอร์/การ์ดเพิ่ม
- research ผ่าน WebSearch/WebFetch ทุกร้าน ใส่ `sourceUrl` ตรวจสอบได้; ราคา/เวลา label "โดยประมาณ"
- ทุกร้านต้องผ่าน DoD (station, hours, tags≥2, tips≥1, products≥2, googleMapsUrl, พิกัดแม่น) และมีรูป: รูปจริงเสรี → ภาพประกอบ+`isIllustrative` → placeholder ตามลำดับ

## Acceptance criteria

- [ ] `data.json`: shopping = 5, cafe ≥ 4, anime-goods ≥ 5 (floor ≥ 3 ทุกหมวดที่แตะ)
- [ ] ทุกร้านใหม่ผ่าน `validateEntry` (0 error) — dataset guard test เขียว
- [ ] ทุกร้านใหม่มีรูปพร้อม credit/license; รูปภาพประกอบติดธง `isIllustrative` และขึ้นป้ายใน UI
- [ ] ร้าน shopping จัดหมวดตามเกณฑ์ "ขายอะไรเป็นหลัก" (ดองกี้อยู่ shopping)
- [ ] ทุกร้านมี `sourceUrl` ที่ตรวจสอบได้ + ป้าย "ราคาโดยประมาณ"
- [ ] กรองแต่ละหมวดในเว็บแล้วเห็นร้านใหม่ปักหมุดถูกตำแหน่งบนแผนที่ + เปิดโมดัลข้อมูลครบ

## Blocked by

- Issue 09 — Foundation (isIllustrative + validator)
