# เที่ยวญี่ปุ่น (Travel Japan)

เว็บ static แบบ interactive รวมร้านและสถานที่แนะนำในญี่ปุ่นสำหรับนักท่องเที่ยวไทย
แสดงเป็นกริดการ์ด ราคาทั้งเยน (¥) และบาท (฿) พร้อมแผนที่และบุ๊กมาร์ก

> สถานะปัจจุบัน: เสร็จ **Issue 01–03 + Issue 05** — กริดการ์ด + แปลงค่าเงิน ¥/฿ + ฟิลเตอร์/ค้นหา/เรียง + โมดัลรายละเอียดพร้อมแกลเลอรีรูปและแผนที่ย่อ (Leaflet)
> ยังไม่ทำ: **Issue 04** (แผนที่หลักที่ปักหมุดทุก entry และ sync กับฟิลเตอร์) — โมดัลโหลด Leaflet ไว้แล้ว สไลซ์นี้จะมาต่อภายหลัง

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

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
| --- | --- |
| `index.html` | โครงหน้า + โหลด Leaflet (CDN) + `app.js` (ES module) + โครงโมดัล |
| `style.css` | สไตล์ทั้งหมด (ธีมสว่าง มินิมอล, responsive) รวมโมดัล/แกลเลอรี |
| `app.js` | ชั้น side-effect: `fetch`, render DOM, โมดัลรายละเอียด + แผนที่ย่อ Leaflet (ต่อไปจะมี localStorage) |
| `logic.js` | ชั้น pure functions — seam สำหรับเทสต์ (ไม่แตะ DOM/network) |
| `logic.test.js` | เทสต์ของ `logic.js` (Vitest) |
| `data.json` | dataset ร้าน/สถานที่ (ราคาเก็บเป็น JPY เสมอ) |

ข้อมูลแก้ไขที่ `data.json` โดยตรง — ไม่มี backend หรือ build step สำหรับตัวเว็บ
