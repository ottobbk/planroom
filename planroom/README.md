# Planroom — พร้อมนำขึ้นเว็บจริง

## ทำไมถึงลากลง Netlify ตรงๆ ไม่ได้
Netlify Drop (ช่องลากไฟล์แบบเร็ว) เผยแพร่ได้แค่ไฟล์ static (HTML/JS/CSS) เท่านั้น
**มันไม่รัน `npm install` ให้** ระบบ backend ในโปรเจกต์นี้ต้องพึ่งแพ็กเกจ
`@netlify/blobs` เพื่อเก็บข้อมูลถาวรข้ามอุปกรณ์ ถ้าลากโฟลเดอร์นี้เข้า Netlify Drop
ตรงๆ หน้าเว็บจะขึ้น แต่ระบบล็อกอิน/บันทึกข้อมูลจะใช้งานไม่ได้เลย

วิธีข้างล่างนี้คือทางที่ **ไม่ต้องเปิด terminal เลยสักคำสั่งเดียว** และยังได้ระบบ
backend ที่ทำงานจริง

## ขั้นตอน (ไม่ใช้ terminal)

### 1) อัพโฟลเดอร์นี้ขึ้น GitHub ผ่านเว็บ
- ไปที่ github.com → เข้าสู่ระบบ (สมัครฟรีถ้ายังไม่มี) → **New repository**
- ตั้งชื่อ เช่น `planroom` → Create repository
- ในหน้า repo กด **Add file → Upload files**
- **ลากทั้งโฟลเดอร์นี้** (ทุกไฟล์ ทุกโฟลเดอร์ย่อย) วางในหน้าเว็บ แล้วกด **Commit changes**

### 2) เชื่อม Netlify กับ repo นี้
- ไปที่ app.netlify.com → **Add new site → Import an existing project**
- เลือก **GitHub** แล้วเลือก repo `planroom` ที่เพิ่งอัพ
- ค่า build settings ปล่อยตามค่าเริ่มต้นที่ตรวจพบได้เลย (ไฟล์ `netlify.toml` ตั้งไว้ให้แล้ว) → กด **Deploy**
- ขั้นตอนนี้ Netlify จะรัน `npm install` และ bundle backend ให้อัตโนมัติ (ต่างจาก Netlify Drop ตรงๆ)

### 3) ตั้งค่ารหัสผ่านและกุญแจเซสชัน (พิมพ์ในเว็บ ไม่มีคำสั่งใดๆ)
ไปที่ **Site settings → Environment variables → Add a variable** แล้วเพิ่ม 2 ค่า:

| Key | ใส่อะไร |
|---|---|
| `APP_PASSWORD` | รหัสผ่านที่คุณจะใช้ล็อกอิน (12 ตัวอักษรขึ้นไป ห้ามใช้ `123546` เดิม) |
| `SESSION_SECRET` | พิมพ์ตัวอักษร/ตัวเลขมั่วๆ ยาวๆ สัก 30+ ตัว (ไม่ต้องมีความหมาย ขอแค่คนอื่นเดาไม่ได้) |

จากนั้นไปที่แท็บ **Deploys** กด **Trigger deploy → Deploy site** อีกครั้งให้ค่าที่ตั้งมีผล

### 4) เปิดใช้งาน
เข้าลิงก์ที่ Netlify ให้มา (เช่น `your-site.netlify.app`) ใส่รหัสผ่านที่ตั้งไว้ในขั้นตอนที่ 3
ควรเข้าได้ทันที และข้อมูลจะซิงก์ข้ามอุปกรณ์ได้จริง

## โครงสร้างไฟล์
```
public/index.html              หน้าเว็บหลัก (เดิมคือ planner.html)
public/cloud-sync.js           สคริปต์ล็อกอิน + ซิงก์ข้อมูล
netlify/functions/api.mjs      backend: login / เก็บข้อมูลถาวรด้วย Netlify Blobs
netlify.toml, package.json     ตั้งค่าการ build/deploy
```

## หมายเหตุความปลอดภัย
- รหัสผ่านเก็บเป็น environment variable บน Netlify เท่านั้น ไม่ถูกส่งไปฝั่งเบราว์เซอร์
  และไม่ถูก commit ลงโค้ด — เห็นได้เฉพาะคนที่มีสิทธิ์เข้าถึง dashboard ของไซต์นี้
- Session cookie เป็น `HttpOnly` + `Secure` + `SameSite=Strict` ป้องกัน XSS/CSRF พื้นฐาน
  (Netlify ให้ HTTPS ฟรีอัตโนมัติ ทำให้ `Secure` ใช้งานได้จริง)
- ถ้าอยากเปลี่ยนรหัสผ่านทีหลัง แก้ค่า `APP_PASSWORD` ใน Environment variables
  แล้วกด Trigger deploy ใหม่ ไม่ต้องแก้โค้ดใดๆ

## ถ้าอยากใช้ terminal (เร็วกว่า แต่ต้องมี Node.js)
ถ้าสะดวกใช้บรรทัดคำสั่ง สามารถข้ามขั้นตอน GitHub ทั้งหมด แล้วใช้ Netlify CLI แทนได้:
```
npm install -g netlify-cli
netlify login
netlify deploy --prod
```
คำสั่งชุดนี้จะ install dependency และ bundle backend ให้เหมือนกัน แล้วค่อยไปตั้ง
`APP_PASSWORD` กับ `SESSION_SECRET` ในขั้นตอนที่ 3 ด้านบนตามปกติ
