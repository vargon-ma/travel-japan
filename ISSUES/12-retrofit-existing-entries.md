# Issue 12 — ย้อนอัปเกรดร้านเดิมให้ถึง DoD + เติมรูป 22 ร้านที่ยังไม่มีรูป

> **Label:** `ready-for-agent`

## Parent

`PRD-dataset-expansion.md`

## What to build

ยกคุณภาพร้านเดิมให้สม่ำเสมอกับมาตรฐานใหม่ (งาน "แก้ของเดิม" ไม่ใช่ "เพิ่มใหม่") — ปิดช่องว่างที่ทำให้บางร้านดูแบน/เว็บดูเงียบ

- **เติม DoD ที่ขาด** ให้ทุกร้านเดิมที่ยังไม่ครบ: `station`, `hours`, `tags` (≥2), `tips` (≥1), `products` (≥2), `googleMapsUrl` — ตรวจว่าร้านไหนขาดด้วย `validateEntry`
- **เติมรูปให้ 22 ร้านที่ยังไม่มีรูป** (super-potato-*, acos-*, yodobashi-*, trader/surugaya/mandarake-complex/gachapon อากิบะ, athome-cafe, สายซูชิ/ปลาไหล ฯลฯ): รูปจริงเสรี → ภาพประกอบ+`isIllustrative` → placeholder ตามลำดับ ทุกรูปมี credit/license
- ตรวจ/แก้พิกัดร้านเดิมที่อาจปักหมุดคลาดให้แม่นระดับตึก

## Acceptance criteria

- [ ] ทุกร้านเดิมใน `data.json` ผ่าน `validateEntry` (0 error) — dataset guard test เขียว
- [ ] 22 ร้านที่เคยไม่มีรูป มีรูปครบ (จริงหรือภาพประกอบ) พร้อม credit/license; ภาพประกอบขึ้นป้าย "ภาพประกอบ"
- [ ] ร้านที่เคยขาด station/hours/tags/tips/products ครบตาม DoD แล้ว
- [ ] ราคา/เวลาทุกร้านมีป้ายกำกับ "โดยประมาณ"
- [ ] ไม่มี entry ใดเหลือ placeholder โดยที่หารูปเสรี (จริง/ประกอบ) ได้ — placeholder เป็น fallback สุดท้ายเท่านั้น

## Blocked by

- Issue 09 — Foundation (isIllustrative + validator)
