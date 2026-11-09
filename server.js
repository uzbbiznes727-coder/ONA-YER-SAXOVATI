require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const dataDir = path.join(ROOT, "data");
const uploadDir = path.join(ROOT, "public", "uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

if (!process.env.ADMIN_CODE || !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.includes("CHANGE_THIS")) {
  console.error("Set ADMIN_CODE and a strong JWT_SECRET in the server environment.");
  process.exit(1);
}
const db = new Database(path.join(dataDir, "shop.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL,
 description TEXT DEFAULT '', image TEXT DEFAULT '', category TEXT DEFAULT 'Boshqa',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT, customer TEXT NOT NULL, phone TEXT NOT NULL,
 address TEXT NOT NULL, items TEXT NOT NULL, total REAL NOT NULL,
 status TEXT DEFAULT 'Yangi', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(express.static(path.join(ROOT, "public")));
app.use("/api/operator/login", rateLimit({ windowMs: 15*60*1000, limit: 8, standardHeaders: true, legacyHeaders: false }));

const tokenCookie = {
  httpOnly: true, secure: process.env.NODE_ENV === "production",
  sameSite: "strict", maxAge: 8*60*60*1000, path: "/"
};
function requireOperator(req, res, next) {
  try {
    const token = req.cookies.operator_session;
    const payload = jwt.verify(token || "", process.env.JWT_SECRET);
    if (payload.role !== "operator") throw new Error("role");
    next();
  } catch {
    res.status(401).json({ error: "Ruxsat yo‘q. Operator sifatida qayta kiring." });
  }
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + Math.random().toString(36).slice(2) + path.extname(file.originalname).toLowerCase())
});
const upload = multer({
  storage, limits: { fileSize: 5*1024*1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

app.get("/api/health", (_req,res) => res.json({ online:true, shop:"Ona Yer Saxovati" }));
app.get("/api/products", (_req,res) => {
  res.json(db.prepare("SELECT id,name,price,description,image,category FROM products ORDER BY id DESC").all());
});
app.post("/api/operator/login", (req,res) => {
  const code = String(req.body?.code || "");
  const expected = Buffer.from(process.env.ADMIN_CODE);
  const supplied = Buffer.from(code);
  const ok = expected.length === supplied.length && require("crypto").timingSafeEqual(expected, supplied);
  if (!ok) return res.status(401).json({ error:"Kod noto‘g‘ri." });
  const token = jwt.sign({ role:"operator" }, process.env.JWT_SECRET, { expiresIn:"8h" });
  res.cookie("operator_session", token, tokenCookie).json({ ok:true });
});
app.post("/api/operator/logout", (_req,res) => res.clearCookie("operator_session", { path:"/" }).json({ok:true}));
app.get("/api/operator/me", requireOperator, (_req,res) => res.json({ok:true}));
app.post("/api/operator/upload", requireOperator, upload.single("image"), (req,res) => {
  if (!req.file) return res.status(400).json({error:"Rasm yuklanmadi. JPG, PNG, WEBP yoki GIF tanlang."});
  res.json({ image:"/uploads/"+req.file.filename });
});
app.post("/api/operator/products", requireOperator, (req,res) => {
  const {name,price,description,image,category} = req.body || {};
  if (!String(name||"").trim() || !Number.isFinite(Number(price)) || Number(price)<0)
    return res.status(400).json({error:"Mahsulot nomi va to‘g‘ri narx kiriting."});
  const result = db.prepare("INSERT INTO products(name,price,description,image,category) VALUES(?,?,?,?,?)")
    .run(String(name).trim(), Number(price), String(description||""), String(image||""), String(category||"Boshqa"));
  res.json({ok:true,id:result.lastInsertRowid});
});
app.delete("/api/operator/products/:id", requireOperator, (req,res) => {
  db.prepare("DELETE FROM products WHERE id=?").run(Number(req.params.id));
  res.json({ok:true});
});
app.get("/api/operator/orders", requireOperator, (_req,res) => {
  res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 200").all());
});
app.patch("/api/operator/orders/:id", requireOperator, (req,res) => {
  const allowed = ["Yangi","Qabul qilindi","Yo‘lda","Yetkazildi","Bekor qilindi"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({error:"Holat noto‘g‘ri"});
  db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status, Number(req.params.id));
  res.json({ok:true});
});
app.post("/api/orders", (req,res) => {
  const {customer,phone,address,items} = req.body || {};
  if (!customer || !phone || !address || !Array.isArray(items) || !items.length)
    return res.status(400).json({error:"Ism, telefon, manzil va savatchani to‘ldiring."});
  let total=0, verified=[];
  for (const item of items) {
    const p=db.prepare("SELECT id,name,price FROM products WHERE id=?").get(Number(item.id));
    const qty=Math.max(1,Math.min(99,Number(item.qty)||1));
    if (p) { total += p.price*qty; verified.push({id:p.id,name:p.name,price:p.price,qty}); }
  }
  if (!verified.length) return res.status(400).json({error:"Mahsulotlar topilmadi."});
  const result=db.prepare("INSERT INTO orders(customer,phone,address,items,total) VALUES(?,?,?,?,?)")
    .run(String(customer).slice(0,100),String(phone).slice(0,30),String(address).slice(0,300),JSON.stringify(verified),total);
  res.json({ok:true,orderId:result.lastInsertRowid,total});
});
app.get("*", (_req,res) => res.sendFile(path.join(ROOT,"public","index.html")));
app.listen(PORT, "0.0.0.0", () => console.log(`Ona Yer Saxovati server running on port ${PORT}`));
