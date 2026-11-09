# ONA YER SAXOVATI — onlayn do‘kon

## Loyiha tarkibi
- `server.js` — API server, umumiy katalog, buyurtmalar va operator autentifikatsiyasi.
- `data/shop.sqlite` — serverdagi umumiy mahsulotlar va buyurtmalar bazasi (birinchi ishga tushishda yaratiladi).
- `public/` — telefon va kompyuterga mos do‘kon interfeysi.
- `.env` — maxfiy server sozlamalari. Operator kodi brauzer kodiga joylanmagan.

## Kompyuterda ishga tushirish
Node.js 20 yoki yangiroq versiya kerak:
1. Terminalda loyiha papkasiga kiring.
2. `npm install`
3. `.env` ichidagi `JWT_SECRET` qiymatini uzun tasodifiy maxfiy qiymatga almashtiring.
4. `npm start`
5. Brauzerda `http://localhost:3000` ni oching.

## Internetga chiqarish
Bu ZIP server dasturini o‘z ichiga oladi, ammo o‘zi hosting yoki domen sotib olmaydi va serverni internetga avtomatik joylashtirmaydi.
1. O‘zbekistondagi VPS/hostingdan Node.js 20 qo‘llaydigan Linux server oling.
2. Loyihani serverga yuklang; `.env` faylini faqat serverda saqlang.
3. `npm install` va `npm start` bajaring.
4. Domen va HTTPS (Nginx + SSL) ulang. `NODE_ENV=production` bo‘lsin.
5. Serverning `data/` va `public/uploads/` papkalariga yozish ruxsatini bering, muntazam backup oling.
6. Bir nechta server nusxasi ishlatilsa, SQLite o‘rniga umumiy PostgreSQL va umumiy fayl saqlash tizimiga o‘ting.

## Maxfiylik va xavfsizlik
- Operator kodi faqat serverdagi `.env` ichida tekshiriladi; mijozlar sahifasida ko‘rsatilmaydi.
- ZIP faylni begonalarga yubormang: ichida sizning maxfiy `.env` sozlamangiz bor. Serverga yuklagach, `.env` ni xavfsiz saqlang va zaxira nusxalarini himoyalang.
- `JWT_SECRET` ni deploydan oldin albatta kuchli tasodifiy qiymatga almashtiring.
- HTTPS ishlatmasdan internetga ochmang.
- Telefon raqami yordam havolasi sifatida qo‘yilgan; bu avtomatik 24/7 operator navbatchiligini yaratmaydi. Qo‘ng‘iroqlarga javob berish uchun haqiqiy xizmat kerak.

## Yetkazib berish
Saytda 07:00–20:00 ish vaqti ko‘rsatiladi. Buyurtmalar operator kabinetida ko‘rinadi; yetkazish xizmati va kuryerlarni alohida tashkil qilish kerak.

## Hozirgi funksiyalar
Mahsulot qo‘shish/o‘chirish, rasm yuklash, umumiy katalog, savatcha, buyurtma yaratish, buyurtma holatini yangilash, operator kirishi va internet holati xabari.
