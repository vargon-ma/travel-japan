# Issue 11 — ขยายหมวดยอดนิยม: food, games, sightseeing, electronics, cosplay (+รูป)

> **Label:** `ready-for-agent`

## Parent

`PRD-dataset-expansion.md`

## What to build

ขยายหมวดที่คนไทยสนใจมากให้แน่นขึ้นตามเป้าการกระจาย (ความนิยมจริง + floor) — เพิ่มร้านคุณภาพ demo ได้เดี่ยว: กรองหมวดนั้น → เจอร้านเพิ่มพร้อมรูป

- **food 10→12, games 5→7, sightseeing 4→7, electronics 3→5, cosplay 3→4** (รวมเพิ่ม ~11 ร้าน; ปรับเล็กน้อยได้ตามของที่หาเจอ)
- research ผ่าน WebSearch/WebFetch ทุกร้าน เน้นร้าน/สถานที่ที่คนไทยนิยมจริง; ใส่ `sourceUrl`; ราคา/เวลา label "โดยประมาณ"
- ทุกร้านผ่าน DoD (station, hours, tags≥2, tips≥1, products≥2, googleMapsUrl, พิกัดแม่น) และมีรูป: รูปจริงเสรี → ภาพประกอบ+`isIllustrative` → placeholder ตามลำดับ
- คงกระจาย 3 เมืองเดิม ไม่กระจุกโตเกียวเกินจำเป็น

## Acceptance criteria

- [ ] `data.json`: food ≥ 12, games ≥ 7, sightseeing ≥ 7, electronics ≥ 5, cosplay ≥ 4
- [ ] ทุกร้านใหม่ผ่าน `validateEntry` (0 error) — dataset guard test เขียว
- [ ] ทุกร้านใหม่มีรูปพร้อม credit/license; ภาพประกอบติดธง `isIllustrative` + ขึ้นป้าย UI
- [ ] ทุกร้านมี `sourceUrl` ตรวจสอบได้ + ป้าย "ราคาโดยประมาณ"
- [ ] ค้นหาด้วยชื่อ/สินค้า/แท็ก เจอร้านใหม่; ปักหมุดถูกตำแหน่ง; เปิดโมดัลข้อมูลครบ

## Blocked by

- Issue 09 — Foundation (isIllustrative + validator)
