# เที่ยวญี่ปุ่น (Travel Japan)

เว็บ static แบบ interactive รวมร้านและสถานที่แนะนำในญี่ปุ่นสำหรับนักท่องเที่ยวไทย
แสดงเป็นกริดการ์ด ราคาทั้งเยน (¥) และบาท (฿) พร้อมแผนที่และบุ๊กมาร์ก

> สถานะปัจจุบัน: เสร็จ **Issue 01–13** — กริดการ์ด + แปลงค่าเงิน ¥/฿ + ฟิลเตอร์/ค้นหา/เรียง + แผนที่หลัก Leaflet ที่ปักหมุดทุก entry และ sync กับฟิลเตอร์ + โมดัลรายละเอียดพร้อมแกลเลอรีรูปและแผนที่ย่อ + บุ๊กมาร์ก (localStorage) และฟิลเตอร์ "เฉพาะที่บุ๊กมาร์ก" + หน้ารวมเครดิต/แหล่งอ้างอิง + ขัดเกลา/แอนิเมชัน/responsive + validator (`validateEntry`/`validateDataset`) พร้อม dataset guard test + ภาพประกอบ (`isIllustrative`) + dataset ครบ **49 ร้าน ทั้ง 8 หมวด** (3 เมือง) + Editor's Pick 10 ร้านครบทุกหมวด

## การรันเว็บ

⚠️ **ต้องรันผ่าน local web server** — เปิดไฟล์ `index.html` ด้วยการดับเบิลคลิก (`file://`) **จะไม่ทำงาน**
เพราะ `app.js` ใช้ `fetch('data.json')` ซึ่งติด CORS บนโปรโตคอล `file://`

เลือกวิธีใดวิธีหนึ่ง แล้วเปิดเบราว์เซอร์ตาม URL ที่ได้:

```bash
# ใช้ Python (ติดมากับเครื่องส่วนใหญ่)
python -m http.server
# → เปิด http://localhost:8000

# หรือใช้ Node
npx serve .
```

หรือใช้ส่วนขยาย **Live Server** ของ VS Code (คลิกขวาที่ `index.html` → "Open with Live Server")

## การรันเทสต์

เทสต์ครอบเฉพาะ pure functions ใน `logic.js` ด้วย [Vitest](https://vitest.dev/)

```bash
npm install      # ครั้งแรกครั้งเดียว
npm test         # รันเทสต์ทั้งหมดหนึ่งรอบ
npm run test:watch   # รันแบบ watch ระหว่างพัฒนา
```

รวม **dataset guard test**: วน `validateEntry` ทุก entry ใน `data.json` — ถ้าเพิ่มร้านที่ข้อมูลไม่ครบเกณฑ์คุณภาพ
(ขาดวิธีเดินทาง/เวลาทำการ/แท็ก/ทิป/สินค้า, `category`/`city` หลุด closed set, รูปไม่มีเครดิต/ลิขสิทธิ์, พิกัดนอกกรอบญี่ปุ่น)
หรือ `id` ซ้ำ → `npm test` จะแดงทันทีก่อนขึ้นเว็บ

### รูปภาพ: จริง / ภาพประกอบ / placeholder

แต่ละรูปใน `images[]` ต้องมี `source`/`credit`/`license` เสมอ ลำดับความพยายามเลือกรูปต่อร้าน:
รูปจริงเสรี → **ภาพประกอบ** (ติดธง `isIllustrative: true` แล้ว UI ขึ้นป้าย "ภาพประกอบ" กำกับว่าไม่ใช่ภาพจริงของสถานที่)
→ placeholder อิโมจิตามหมวด (fallback สุดท้าย)

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
| --- | --- |
| `index.html` | โครงหน้า + โหลด Leaflet (CDN) + `app.js` (ES module) + โครงโมดัล |
| `style.css` | สไตล์ทั้งหมด (ธีมสว่าง มินิมอล, responsive) รวมโมดัล/แกลเลอรี |
| `app.js` | ชั้น side-effect: `fetch`, render DOM, แผนที่หลัก Leaflet (sync ฟิลเตอร์), โมดัลรายละเอียด + แผนที่ย่อ, บุ๊กมาร์กผ่าน `localStorage` |
| `logic.js` | ชั้น pure functions — seam สำหรับเทสต์ (ไม่แตะ DOM/network) |
| `logic.test.js` | เทสต์ของ `logic.js` (Vitest) |
| `data.json` | dataset ร้าน/สถานที่ (ราคาเก็บเป็น JPY เสมอ) |

ข้อมูลแก้ไขที่ `data.json` โดยตรง — ไม่มี backend หรือ build step สำหรับตัวเว็บ
