const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

// Admin API key (unlimited) - gunakan environment variable di Vercel
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'doi';

// Resend API key
const RESEND_API_KEY = "re_B5xCbPen_KEPNN6Gnyu6YEHHEP6MNxUrD";
// Inisialisasi API keys menggunakan memory storage (Vercel tidak persistent file system)
let apiKeys = {};

// Middleware untuk CORS
app.use(cors());
app.use(bodyParser.json());

// Serve static files dari public folder jika ada
app.use(express.static(path.join(__dirname, 'public')));

// Middleware untuk validasi API key
const validateApiKey = (req, res, next) => {
  const apiKey = req.query.api || req.headers['x-api-key'];
  
  // Endpoint yang tidak memerlukan API key
const publicEndpoints = [
  '/', 
  '/contact', 
  '/health', 
  '/api/createapikey', 
  '/api/cekapikey', 
  '/api/resetlimit',
  '/api/listkeys'  // ← TAMBAHKAN INI
];
  if (publicEndpoints.includes(req.path)) {
    return next();
  }
  
  if (!apiKey) {
    return res.status(401).json({
      status: false,
      message: 'API key diperlukan. Gunakan parameter ?api=API_KEY atau header x-api-key'
    });
  }
  
  // Cek apakah API key admin
  if (apiKey === ADMIN_API_KEY) {
    req.isAdmin = true;
    return next();
  }
  
  // Cek API key user
  const userKey = apiKeys[apiKey];
  if (!userKey) {
    return res.status(401).json({
      status: false,
      message: 'API key tidak valid atau tidak ditemukan'
    });
  }
  
  // Cek limit
  if (userKey.remaining <= 0) {
    return res.status(403).json({
      status: false,
      message: 'API key limit habis',
      remaining: 0,
      totalLimit: userKey.limit
    });
  }
  
  // Kurangi limit
  userKey.remaining--;
  userKey.totalUsed++;
  userKey.lastUsed = new Date().toISOString();
  
  // Simpan riwayat penggunaan (maksimal 10 riwayat)
  if (!userKey.usageHistory) {
    userKey.usageHistory = [];
  }
  userKey.usageHistory.push({
    endpoint: req.path,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
  });
  
  // Hanya simpan 10 riwayat terakhir
  if (userKey.usageHistory.length > 10) {
    userKey.usageHistory = userKey.usageHistory.slice(-10);
  }
  
  req.apiKeyInfo = userKey;
  req.isAdmin = false;
  next();
};

app.use(validateApiKey);

// Helper untuk response dengan usage info
const responseWithUsage = (req, data) => {
  if (req.isAdmin) {
    return { ...data, usageInfo: 'Admin (Unlimited)' };
  } else if (req.apiKeyInfo) {
    return { 
      ...data, 
      usageInfo: {
        remaining: req.apiKeyInfo.remaining,
        limit: req.apiKeyInfo.limit,
        totalUsed: req.apiKeyInfo.totalUsed
      }
    };
  }
  return data;
};

function generateApiKey() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `fuku_${timestamp}_${random}`;
}

function parseDuration(input) {
  if (!input) return 60 * 60 * 1000;
  
  const match = input.toLowerCase().match(/(\d+)\s*(jam|hari|bulan)/);
  if (!match) return 60 * 60 * 1000;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  if (unit === 'jam') return value * 60 * 60 * 1000;
  if (unit === 'hari') return value * 24 * 60 * 60 * 1000;
  if (unit === 'bulan') return value * 30 * 24 * 60 * 60 * 1000;
  
  return 60 * 60 * 1000;
}

function createKeyData(name, durationMs) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + durationMs);
  return {
    name: name,
    created: now.toISOString(),
    limit: 20,
    remaining: 20,
    totalUsed: 0,
    usageHistory: [],
    lastUsed: null,
    resetAt: resetAt.toISOString(),
    durationMs: durationMs
  };
}

app.get('/api/createapikey', (req, res) => {
  const { keys, apikeyAdmin, waktu } = req.query;
  
  if (!apikeyAdmin) {
    return res.status(400).json({ status: false, message: 'Parameter apikeyAdmin diperlukan' });
  }
  
  if (apikeyAdmin !== ADMIN_API_KEY) {
    return res.status(403).json({ status: false, message: 'API key admin tidak valid' });
  }
  
  if (!keys) {
    return res.status(400).json({ status: false, message: 'Parameter keys diperlukan (nama untuk API key)' });
  }
  
  const durationMs = parseDuration(waktu);
  const apiKey = generateApiKey();
  apiKeys[apiKey] = createKeyData(keys, durationMs);
  
  const data = apiKeys[apiKey];
  
  res.status(200).json({
    status: true,
    message: 'API key berhasil dibuat',
    apiKey: apiKey,
    info: {
      name: data.name,
      limit: data.limit,
      remaining: data.remaining,
      created: new Date(data.created).toLocaleString(),
      resetAt: new Date(data.resetAt).toLocaleString(),
      duration: waktu || '1jam (default)',
      exampleUsage: `/api/tiktok?url=...&api=${apiKey}`,
      note: 'Limit akan reset otomatis sesuai waktu yang dipilih'
    }
  });
});
// Endpoint untuk cek info API key
app.get('/api/cekapikey', (req, res) => {
  const { api } = req.query;
  
  if (!api) {
    return res.status(400).json({
      status: false,
      message: 'Parameter api diperlukan'
    });
  }
  
  if (api === ADMIN_API_KEY) {
    return res.status(200).json({
      status: true,
      isAdmin: true,
      message: 'API Key Admin (Unlimited)',
      totalUserKeys: Object.keys(apiKeys).length,
      environment: process.env.NODE_ENV || 'development'
    });
  }
  
  const userKey = apiKeys[api];
  if (!userKey) {
    return res.status(404).json({
      status: false,
      message: 'API key tidak ditemukan'
    });
  }
  
  const now = new Date();
  const resetTime = new Date(userKey.resetAt);
  const msRemaining = resetTime - now;
  const minutesRemaining = Math.max(0, Math.floor(msRemaining / 60000));
  const secondsRemaining = Math.max(0, Math.floor((msRemaining % 60000) / 1000));
  
  const percentageUsed = ((userKey.totalUsed || 0) / userKey.limit) * 100;
  
  res.status(200).json({
    status: true,
    isAdmin: false,
    apiKey: api,
    info: {
      name: userKey.name,
      created: new Date(userKey.created).toLocaleString(),
      lastUsed: userKey.lastUsed ?
        new Date(userKey.lastUsed).toLocaleString() :
        'Belum pernah digunakan',
      limit: userKey.limit,
      remaining: userKey.remaining,
      totalUsed: userKey.totalUsed || 0,
      percentageUsed: `${percentageUsed.toFixed(1)}%`,
      resetAt: resetTime.toLocaleString(),
      timeToReset: `${minutesRemaining} menit ${secondsRemaining} detik`,
      usageHistory: (userKey.usageHistory || []).slice(-5),
      note: 'Limit akan otomatis reset setiap 1 jam'
    }
  });
});

// Endpoint untuk reset limit (admin only)
app.get('/api/resetlimit', (req, res) => {
  const { api, apikeyAdmin } = req.query;
  
  if (!apikeyAdmin || apikeyAdmin !== ADMIN_API_KEY) {
    return res.status(403).json({
      status: false,
      message: 'Hanya admin yang bisa reset limit'
    });
  }
  
  if (!api) {
    return res.status(400).json({
      status: false,
      message: 'Parameter api diperlukan'
    });
  }
  
  const userKey = apiKeys[api];
  if (!userKey) {
    return res.status(404).json({
      status: false,
      message: 'API key tidak ditemukan'
    });
  }
  
  // Reset limit
  userKey.remaining = userKey.limit;
  
  res.status(200).json({
    status: true,
    message: 'Limit berhasil direset',
    apiKey: api,
    remaining: userKey.remaining,
    limit: userKey.limit,
    note: 'Reset hanya berlaku selama server berjalan'
  });
});

// Endpoint untuk lihat semua API keys (admin only)
app.get('/api/listkeys', (req, res) => {
  const { apikeyAdmin } = req.query;
  
  if (!apikeyAdmin || apikeyAdmin !== ADMIN_API_KEY) {
    return res.status(403).json({
      status: false,
      message: 'Hanya admin yang bisa melihat semua keys'
    });
  }
  
  const keysList = Object.entries(apiKeys).map(([key, data]) => ({
    key,
    name: data.name,
    created: data.created,
    remaining: data.remaining,
    totalUsed: data.totalUsed || 0,
    lastUsed: data.lastUsed
  }));
  
  res.status(200).json({
    status: true,
    totalKeys: keysList.length,
    keys: keysList
  });
});

// Contact form endpoint
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  const resend = new Resend('re_B5xCbPen_KEPNN6Gnyu6YEHHEP6MNxUrD');

  console.log('=== CONTACT FORM SUBMISSION ===');
  console.log(`Name: ${name}`);
  console.log(`Email: ${email}`);
  console.log(`Message: ${message}`);
  console.log('=============================');

  try {
    await resend.emails.send({
      from: "Contact Form <onboarding@resend.dev>",
      to: "sigmaskibidilbk@gmail.com",
      subject: "Pesan Baru dari Contact Form",
      html: `
        <div style="font-family:Arial;background:#f2f2f2;padding:20px">
          <div style="max-width:600px;background:#fff;margin:auto;padding:30px;border-radius:12px">
            <h2>📩 Pesan Baru</h2>
            <p><strong>Nama:</strong> ${name}</p>
            <p><strong>Email Pengirim:</strong> ${email}</p>
            <p><strong>Pesan:</strong></p>
            <div style="white-space:pre-line;border:1px solid #ddd;padding:10px;border-radius:8px">
              ${message}
            </div>
            <hr>
            <small>Dikirim pada ${new Date().toLocaleString()}</small>
          </div>
        </div>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Pesan berhasil dikirim! Kami akan menghubungi Anda dalam 1-2 hari kerja.',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Gagal kirim email:", err);

    res.status(500).json({
      success: false,
      message: "Gagal mengirim pesan",
      error: err.message
    });
  }
});

// Home endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'FukuXyz API',
    version: '1.0.0',
    status: 'Online',
    endpoints: [
      '/api/createapikey - Buat API key baru (admin only)',
      '/api/cekapikey - Cek info API key',
      '/api/resetlimit - Reset limit (admin only)',
      '/api/tiktok - Download TikTok video',
      '/api/turboseek - Search engine AI',
      '/api/dolphin - AI Chat',
      '/api/tobase64 - Convert text to base64',
      '/api/gateaway - Payment gateway',
      '/api/fukucek - Check payment status',
      '/api/message - Send email message',
      '/contact - Contact form (POST)',
      '/health - Health check'
    ],
    note: 'Semua endpoint /api/... memerlukan API key'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'FukuXyz API',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    totalApiKeys: Object.keys(apiKeys).length
  });
});

// API Endpoints (yang memerlukan API key)

app.get("/api/message", async (req, res) => {
  const { email, pesan } = req.query;

  if (!email || !pesan) {
    return res.status(400).json({
      status: false,
      message: 'Parameter "email" dan "pesan" wajib diisi'
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      status: false,
      message: "Format email tidak valid"
    });
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: "Fukushima Official <onboarding@resend.dev>",
      to: email,
      subject: "Pesan Baru",
      html: `
        <div style="font-family:Arial;background:#f2f2f2;padding:20px">
          <div style="max-width:500px;background:#fff;margin:auto;padding:30px;border-radius:12px;text-align:center">
            <h2>📩 Pesan Untuk Anda</h2>
            <p>${pesan}</p>
            <hr>
            <small>${new Date().toLocaleString()}</small>
          </div>
        </div>
      `
    });

    return res.json(responseWithUsage(req, {
      status: true,
      message: "Pesan berhasil dikirim",
      email
    }));

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: "Gagal mengirim email",
      error: err.message
    });
  }
});

app.get("/api/fukucek", async (req, res) => {
  const trxId = req.query.transactionId;

  if (!trxId) {
    return res.status(400).json({
      status: false,
      message: 'Missing "transactionId" query parameter'
    });
  }

  // Hardcode license
  const licensex = "cashify_9720b6cfc9513ad38ed60f410ccefe3571926c2037534f66c707d44fcb827fa4";

  try {
    const { data } = await axios.post(
      "https://cashify.my.id/api/generate/check-status",
      { transactionId: trxId },
      {
        headers: {
          "x-license-key": licensex,
          "content-type": "application/json"
        }
      }
    );

    res.json(responseWithUsage(req, {
      status: true,
      transactionId: data.data.transactionId,
      amount: data.data.amount,
      paymentStatus: data.data.status,
      expiredAt: data.data.expiredAt
    }));

  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Failed to check payment status",
      error: err.response?.data || err.message
    });
  }
});

app.get("/api/gateaway", async (req, res) => {
  const harga = req.query.harga;

  if (!harga) {
    return res.status(400).json({
      status: false,
      message: 'Missing "harga" query param'
    });
  }

  // Hardcode license dan id QRIS
  const license = "cashify_9720b6cfc9513ad38ed60f410ccefe3571926c2037534f66c707d44fcb827fa4";
  const qrisId = "353809a2-cfc8-4e99-8560-aa98dd7c15cc";

  try {
    const { data } = await axios.post(
      "https://cashify.my.id/api/generate/qris",
      {
        id: qrisId,
        amount: Number(harga),
        useUniqueCode: true,
        packageIds: ["id.dana"],
        expiredInMinutes: 15
      },
      {
        headers: {
          "x-license-key": license,
          "content-type": "application/json"
        }
      }
    );

    res.json(responseWithUsage(req, {
      status: true,
      gateway: "Cashify",
      qr_string: data.data.qr_string,
      transactionId: data.data.transactionId,
      originalAmount: data.data.originalAmount,
      totalAmount: data.data.totalAmount,
      uniqueNominal: data.data.uniqueNominal,
      packageIds: data.data.packageIds
    }));

  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Failed to create QRIS payment",
      error: err.response?.data || err.message
    });
  }
});

app.get('/api/tobase64', (req, res) => {
  try {
    const text = req.query.text;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Parameter "text" diperlukan',
        example: '/api/tobase64?text=halo&api=API_KEY'
      });
    }
    
    const base64String = Buffer.from(text).toString('base64');
    
    res.status(200).json(responseWithUsage(req, {
      success: true,
      original: text,
      base64: base64String,
      length: base64String.length,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error converting to base64:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan internal server'
    });
  }
});

// Crypto functions
const k = {
  enc: "GJvE5RZIxrl9SuNrAtgsvCfWha3M7NGC",
  dec: "H3quWdWoHLX5bZSlyCYAnvDFara25FIu"
};

const cryptoProc = (type, data) => {
  const key = Buffer.from(k[type]);
  const iv = Buffer.from(k[type].slice(0, 16));
  const cipher = (type === 'enc' ? crypto.createCipheriv : crypto.createDecipheriv)(
    'aes-256-cbc',
    key,
    iv
  );
  let rchipher = cipher.update(
    data,
    ...(type === 'enc' ? ['utf8', 'base64'] : ['base64', 'utf8'])
  );
  rchipher += cipher.final(type === 'enc' ? 'base64' : 'utf8');
  return rchipher;
};

// TikTok download function
async function tiktokDl(url) {
  if (!/tiktok\.com/.test(url)) throw new Error('Invalid url.');

  const { data } = await axios.post(
    'https://savetik.app/requests',
    { bdata: cryptoProc('enc', url) },
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Android 16; Mobile; SM-D639N; rv:130.0) Gecko/130.0 Firefox/130.0',
        'Content-Type': 'application/json'
      }
    }
  );

  if (!data || data.status !== 'success') throw new Error('Fetch failed.');

  return {
    author: data.username,
    thumbnail: data.thumbnailUrl,
    video: cryptoProc('dec', data.data),
    audio: data.mp3
  };
}

app.get('/api/tiktok', async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "url" diperlukan',
        example: '/api/tiktok?url=https://vt.tiktok.com/xxxx&api=API_KEY'
      });
    }

    const result = await tiktokDl(url);
    res.status(200).json(responseWithUsage(req, {
      status: true,
      creator: 'AhmadXyz',
      api: 'fuku',
      result: result,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    res.status(500).json({
      status: false,
      creator: 'AhmadXyz',
      api: 'fuku',
      message: error.message || 'Terjadi kesalahan internal server'
    });
  }
});

// Turboseek AI
app.get('/api/turboseek', async (req, res) => {
  try {
    const question = req.query.teks;
    
    if (!question) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "teks" diperlukan',
        example: '/api/turboseek?teks=What is LLM?&api=API_KEY'
      });
    }
    
    const turboseek = async (question) => {
      const inst = axios.create({
        baseURL: 'https://www.turboseek.io/api',
        headers: {
          origin: 'https://www.turboseek.io',
          referer: 'https://www.turboseek.io/',
          'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
        }
      });
      
      const { data: sources } = await inst.post('/getSources', { question });
      const { data: similarQuestions } = await inst.post('/getSimilarQuestions', { question, sources });
      const { data: answer } = await inst.post('/getAnswer', { question, sources });
      
      const cleanAnswer = answer.match(/<p>(.*?)<\/p>/gs)?.map(match =>
        match.replace(/<\/?p>/g, '')
        .replace(/<\/?strong>/g, '')
        .replace(/<\/?em>/g, '')
        .replace(/<\/?b>/g, '')
        .replace(/<\/?i>/g, '')
        .replace(/<\/?u>/g, '')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .trim()
      ).join('\n\n') || answer.replace(/<\/?[^>]+(>|$)/g, '').trim();
      
      return { status: true, answer: cleanAnswer, sources: sources.map(s => s.url), similarQuestions };
    };
    
    const result = await turboseek(question);
    
    res.status(200).json(responseWithUsage(req, {
      status: true,
      creator: 'AhmadXyz',
      api: 'fuku',
      result: result,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    res.status(500).json({
      status: false,
      creator: 'AhmadXyz',
      api: 'fuku',
      message: error.message
    });
  }
});

// Dolphin AI
async function dolphinai(question, { template = 'logical' } = {}) {
  const templates = ['logical', 'creative', 'summarize', 'code-beginner', 'code-advanced'];
  if (!question) throw new Error('Question is required.');
  if (!templates.includes(template)) throw new Error(`Available templates: ${templates.join(', ')}.`);

  const { data } = await axios.post('https://chat.dphn.ai/api/chat', {
    messages: [{ role: 'user', content: question }],
    model: 'dolphinserver:24B',
    template: template
  }, {
    headers: {
      origin: 'https://chat.dphn.ai',
      referer: 'https://chat.dphn.ai/',
      'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
    }
  });

  const result = data
    .split('\n\n')
    .filter(line => line && line.startsWith('data: {'))
    .map(line => JSON.parse(line.substring(6)))
    .map(line => line.choices[0].delta.content)
    .join('');

  if (!result) throw new Error('No result found.');
  return { status: true, result };
}

app.get('/api/dolphin', async (req, res) => {
  try {
    const question = req.query.teks;
    const template = req.query.otak || 'logical';

    if (!question) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "teks" diperlukan',
        example: '/api/dolphin?teks=Halo&otak=logical&api=API_KEY'
      });
    }

    const result = await dolphinai(question, { template });

    res.status(200).json(responseWithUsage(req, {
      status: true,
      creator: 'AhmadXyz',
      api: 'fuku',
      template: template,
      result: result.result,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    res.status(500).json({
      status: false,
      creator: 'AhmadXyz',
      api: 'fuku',
      message: error.message
    });
  }
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server FukuXyz API running on port ${PORT}`);
    console.log(`🔑 Admin Key: ${ADMIN_API_KEY}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export untuk Vercel
module.exports = app;