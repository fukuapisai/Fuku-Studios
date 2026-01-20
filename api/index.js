const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto')
const axios = require('axios')
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  console.log('=== CONTACT FORM SUBMISSION ===');
  console.log(`Name: ${name}`);
  console.log(`Email: ${email}`);
  console.log(`Message: ${message}`);
  console.log('=============================');
  res.status(200).json({
    success: true,
    message: 'Pesan berhasil dikirim! Kami akan menghubungi Anda dalam 1-2 hari kerja.',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'FukuXyz API' });
});

app.get('/api/tobase64', (req, res) => {
    try {
        const text = req.query.text;
        
        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Parameter "text" diperlukan',
                example: '/api/tobase64?text=halo'
            });
        }
        
        const base64String = Buffer.from(text).toString('base64');
        
        res.status(200).json({
            success: true,
            original: text,
            base64: base64String,
            length: base64String.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error converting to base64:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan internal server'
        });
    }
});


const k = {
  enc: "GJvE5RZIxrl9SuNrAtgsvCfWha3M7NGC",
  dec: "H3quWdWoHLX5bZSlyCYAnvDFara25FIu"
}

const cryptoProc = (type, data) => {
  const key = Buffer.from(k[type])
  const iv = Buffer.from(k[type].slice(0, 16))
  const cipher = (type === 'enc' ? crypto.createCipheriv : crypto.createDecipheriv)(
    'aes-256-cbc',
    key,
    iv
  )
  let rchipher = cipher.update(
    data,
    ...(type === 'enc' ? ['utf8', 'base64'] : ['base64', 'utf8'])
  )
  rchipher += cipher.final(type === 'enc' ? 'base64' : 'utf8')
  return rchipher
}

async function tiktokDl(url) {
  if (!/tiktok\.com/.test(url)) throw new Error('Invalid url.')

  const { data } = await axios.post(
    'https://savetik.app/requests',
    { bdata: cryptoProc('enc', url) },
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Android 16; Mobile; SM-D639N; rv:130.0) Gecko/130.0 Firefox/130.0',
        'Content-Type': 'application/json'
      }
    }
  )

  if (!data || data.status !== 'success') throw new Error('Fetch failed.')

  return {
    author: data.username,
    thumbnail: data.thumbnailUrl,
    video: cryptoProc('dec', data.data),
    audio: data.mp3
  }
}

app.get('/api/tiktok', async (req, res) => {
  try {
    const url = req.query.url

    if (!url) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "url" diperlukan',
        example: '/api/tiktok?url=https://vt.tiktok.com/xxxx'
      })
    }

    const result = await tiktokDl(url)
    res.status(200).json({
      status: true,
      creator: 'AhmadXyz',
      api: 'fuku',
      result: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    res.status(500).json({
      status: false,
      creator: 'AhmadXyz',
      api: 'fuku',
      message: error.message || 'Terjadi kesalahan internal server'
    })
  }
})

app.listen(PORT, () => {
  console.log(`Web Siap Meluncur Abang kuh${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});