ไฟล์ที่จำเป็นสำหรับ cloudflare ที่ root
1. เพิ่มไฟล์ wrangler.jsonc
2. เพิ่ม code wrangler.js เพื่อเชื่อมต่อกับ frontend ผ่าน /api

ไฟล์ที่จำเป็นสำหรับการทดสอบในเครื่อง dev ที่ root
1. เพิ่ม .dev.env เพื่อ config GAS_URL api
2. เพิ่ม .gitignore 
/.wrangler/
/.dev.vars

การทดสอบใช้คำสั่ง npx wrangler dev หากไม่เคยติดตั้งต้องกด y เพื่อติดตั้ง npm package
ทดสอบในหน้าต่างไม่ระบุตัวตนด้วย http://localhost:8787