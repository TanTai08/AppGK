import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function createApp(databasePath = process.env.DATABASE_PATH || 'server/data/app.db') {
  if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, sku TEXT NOT NULL, price INTEGER NOT NULL CHECK(price>=0), quantity INTEGER NOT NULL CHECK(quantity>=0), UNIQUE(user_id,sku));`);
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || (process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:19006').split(',').includes(origin)) }));
  app.use(express.json({ limit: '16kb' }));
  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });
  const digest = token => createHash('sha256').update(token).digest('hex');
  const userView = user => ({ id: user.id, name: user.name, email: user.email });
  function startSession(user, res) {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(token), user.id, Date.now() + 7 * 86400000);
    return res.json({ token, user: userView(user) });
  }
  app.get('/api/health', (_, res) => res.json({ ok: true }));
  app.post('/api/auth/register', authLimit, (req, res) => {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Nhập tên, email hợp lệ và mật khẩu từ 8 đến 128 ký tự.' });
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    try {
      const result = db.prepare('INSERT INTO users(name,email,password) VALUES (?,?,?)').run(name.trim(), email.trim().toLowerCase(), `${salt}:${hash}`);
      return startSession(db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid), res);
    } catch (e) { if (e.code?.startsWith('ERR_SQLITE') && e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email đã được sử dụng.' }); throw e; }
  });
  app.post('/api/auth/login', authLimit, (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) return res.status(400).json({ error: 'Thông tin đăng nhập không hợp lệ.' });
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.trim().toLowerCase());
    const [salt, hash] = user?.password.split(':') || ['invalid-salt', '00'.repeat(64)];
    if (!timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex')) || !user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    return startSession(user, res);
  });
  app.use('/api', (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    const session = token && db.prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(digest(token), Date.now());
    if (!session) return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    req.userId = session.user_id; req.token = digest(token); next();
  });
  app.get('/api/auth/me', (req, res) => res.json(userView(db.prepare('SELECT * FROM users WHERE id=?').get(req.userId))));
  app.post('/api/auth/logout', (req, res) => { db.prepare('DELETE FROM sessions WHERE token=?').run(req.token); res.status(204).end(); });
  app.get('/api/products', (req, res) => res.json(db.prepare('SELECT id,name,sku,price,quantity FROM products WHERE user_id=? ORDER BY id DESC').all(req.userId)));
  function validateProduct(req, res, next) {
    const { name, sku, price, quantity } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || typeof sku !== 'string' || !sku.trim() || sku.trim().length > 40 || !Number.isSafeInteger(price) || price < 0 || price > 1e12 || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1e9) return res.status(400).json({ error: 'Tên và mã sản phẩm bắt buộc. Giá và số lượng phải là số nguyên không âm hợp lệ.' });
    req.product = { name: name.trim(), sku: sku.trim().toUpperCase(), price, quantity }; next();
  }
  function saveProduct(req, res, update) {
    const { name, sku, price, quantity } = req.product;
    try {
      let id = Number(req.params.id);
      if (update) {
        const result = db.prepare('UPDATE products SET name=?,sku=?,price=?,quantity=? WHERE id=? AND user_id=?').run(name, sku, price, quantity, id, req.userId);
        if (!result.changes) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
      } else id = Number(db.prepare('INSERT INTO products(user_id,name,sku,price,quantity) VALUES (?,?,?,?,?)').run(req.userId, name, sku, price, quantity).lastInsertRowid);
      res.status(update ? 200 : 201).json({ id, name, sku, price, quantity });
    } catch (e) { if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Mã sản phẩm đã tồn tại.' }); throw e; }
  }
  app.post('/api/products', validateProduct, (req, res) => saveProduct(req, res, false));
  app.put('/api/products/:id', validateProduct, (req, res) => saveProduct(req, res, true));
  app.delete('/api/products/:id', (req, res) => {
    const result = db.prepare('DELETE FROM products WHERE id=? AND user_id=?').run(Number(req.params.id), req.userId);
    if (!result.changes) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
    res.status(204).end();
  });
  app.use((err, req, res, next) => { console.error(err.message); res.status(err.status === 400 ? 400 : 500).json({ error: err.status === 400 ? 'Dữ liệu không hợp lệ.' : 'Có lỗi máy chủ. Vui lòng thử lại.' }); });
  return { app, db };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { app } = createApp();
  app.listen(Number(process.env.PORT) || 3001, '0.0.0.0', () => console.log('API ready on port ' + (process.env.PORT || 3001)));
}
