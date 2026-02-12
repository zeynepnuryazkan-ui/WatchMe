const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'data.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

const createDefaultData = () => ({
  users: [
    { id: crypto.randomUUID(), name: 'Platform Admin', email: 'admin@watchme.com', password: 'admin123', role: 'admin' }
  ],
  videos: [],
  reports: [],
  messages: [],
  sessions: {}
});

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(createDefaultData(), null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function sendJson(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function getAuthUser(req, db) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !db.sessions[token]) return null;
  const user = db.users.find((u) => u.id === db.sessions[token].userId);
  return user ? { user, token } : null;
}

function serveStatic(req, res, pathname) {
  const safePath = path.normalize(path.join(ROOT, pathname === '/' ? 'index.html' : pathname));
  if (!safePath.startsWith(ROOT)) return false;
  if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) return false;

  const ext = path.extname(safePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(safePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'POST' && pathname === '/api/register') {
    const body = await parseBody(req);
    const { name, email, password, role } = body;
    if (!name || !email || !password) return sendJson(res, 400, { message: 'Ad, e-posta ve şifre zorunludur.' });

    const db = readDb();
    if (db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      return sendJson(res, 409, { message: 'Bu e-posta zaten kayıtlı.' });
    }

    db.users.push({ id: crypto.randomUUID(), name, email, password, role: role === 'writer' ? 'writer' : 'user' });
    writeDb(db);
    return sendJson(res, 201, { message: 'Kayıt başarılı.' });
  }

  if (req.method === 'POST' && pathname === '/api/login') {
    const body = await parseBody(req);
    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === String(body.email).toLowerCase());
    if (!user || user.password !== body.password) return sendJson(res, 401, { message: 'E-posta veya şifre hatalı.' });

    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = { userId: user.id, createdAt: new Date().toISOString() };
    writeDb(db);
    return sendJson(res, 200, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }

  if (req.method === 'GET' && pathname === '/api/videos') {
    const db = readDb();
    return sendJson(res, 200, db.videos);
  }

  if (req.method === 'POST' && pathname === '/api/videos') {
    const db = readDb();
    const auth = getAuthUser(req, db);
    if (!auth) return sendJson(res, 401, { message: 'Giriş yapmanız gerekiyor.' });
    if (!['writer', 'admin'].includes(auth.user.role)) return sendJson(res, 403, { message: 'Sadece yazarlar video yükleyebilir.' });

    const body = await parseBody(req);
    if (!body.title || !body.videoUrl) return sendJson(res, 400, { message: 'Başlık ve video linki zorunludur.' });

    const video = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description || '',
      videoUrl: body.videoUrl,
      writerId: auth.user.id,
      writerName: auth.user.name,
      writerEmail: auth.user.email,
      createdAt: new Date().toISOString()
    };
    db.videos.unshift(video);
    writeDb(db);
    return sendJson(res, 201, { message: 'Video başarıyla yüklendi.', video });
  }

  if (req.method === 'POST' && pathname === '/api/reports') {
    const db = readDb();
    const auth = getAuthUser(req, db);
    if (!auth) return sendJson(res, 401, { message: 'Giriş yapmanız gerekiyor.' });
    const body = await parseBody(req);
    const video = db.videos.find((v) => v.id === body.videoId);
    if (!video) return sendJson(res, 404, { message: 'Video bulunamadı.' });
    if (!body.reason) return sendJson(res, 400, { message: 'Şikayet nedeni zorunludur.' });

    db.reports.unshift({
      id: crypto.randomUUID(),
      videoId: body.videoId,
      videoTitle: video.title,
      reason: body.reason,
      reporterName: auth.user.name,
      reporterEmail: auth.user.email,
      createdAt: new Date().toISOString(),
      status: 'new'
    });
    writeDb(db);
    return sendJson(res, 201, { message: 'Şikayet admin paneline iletildi.' });
  }

  if (req.method === 'POST' && pathname === '/api/messages') {
    const db = readDb();
    const auth = getAuthUser(req, db);
    if (!auth) return sendJson(res, 401, { message: 'Giriş yapmanız gerekiyor.' });
    const body = await parseBody(req);
    if (!body.subject || !body.message) return sendJson(res, 400, { message: 'Konu ve mesaj zorunludur.' });

    db.messages.unshift({
      id: crypto.randomUUID(),
      subject: body.subject,
      message: body.message,
      fromName: auth.user.name,
      fromEmail: auth.user.email,
      to: 'admin@watchme.com',
      createdAt: new Date().toISOString(),
      status: 'new'
    });
    writeDb(db);
    return sendJson(res, 201, { message: 'Mesajınız admin paneline iletildi.' });
  }

  if (req.method === 'GET' && (pathname === '/api/admin/reports' || pathname === '/api/admin/messages')) {
    const db = readDb();
    const auth = getAuthUser(req, db);
    if (!auth) return sendJson(res, 401, { message: 'Giriş yapmanız gerekiyor.' });
    if (auth.user.role !== 'admin') return sendJson(res, 403, { message: 'Bu işlem için admin yetkisi gerekiyor.' });
    return sendJson(res, 200, pathname.endsWith('reports') ? db.reports : db.messages);
  }

  if (serveStatic(req, res, pathname)) return;
  sendJson(res, 404, { message: 'Bulunamadı' });
});

server.listen(PORT, () => {
  console.log(`🚀 Watch Me hazır: http://localhost:${PORT}`);
});
