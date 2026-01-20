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
});

app.get('/api/turboseek', async (req, res) => {
  try {
    const question = req.query.teks
    
    if (!question) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "teks" diperlukan',
        example: '/api/turboseek?teks=What is LLM?'
      })
    }
    
    // Fungsi turboseek langsung di sini
    const turboseek = async (question) => {
      const inst = axios.create({
        baseURL: 'https://www.turboseek.io/api',
        headers: {
          origin: 'https://www.turboseek.io',
          referer: 'https://www.turboseek.io/',
          'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
        }
      })
      
      const { data: sources } = await inst.post('/getSources', { question })
      const { data: similarQuestions } = await inst.post('/getSimilarQuestions', { question, sources })
      const { data: answer } = await inst.post('/getAnswer', { question, sources })
      
      const cleanAnswer = answer.match(/<p>(.*?)<\/p>/gs)?.map(match =>
        match.replace(/<\/?p>/g, '')
        .replace(/<\/?strong>/g, '')
        .replace(/<\/?em>/g, '')
        .replace(/<\/?b>/g, '')
        .replace(/<\/?i>/g, '')
        .replace(/<\/?u>/g, '')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .trim()
      ).join('\n\n') || answer.replace(/<\/?[^>]+(>|$)/g, '').trim()
      
      return { status: true, answer: cleanAnswer, sources: sources.map(s => s.url), similarQuestions }
    }
    
    const result = await turboseek(question)
    
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
      message: error.message
    })
  }
});


async function dolphinai(question, { template = 'logical' } = {}) {
  const templates = ['logical', 'creative', 'summarize', 'code-beginner', 'code-advanced']
  if (!question) throw new Error('Question is required.')
  if (!templates.includes(template)) throw new Error(`Available templates: ${templates.join(', ')}.`)

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
  })

  const result = data
    .split('\n\n')
    .filter(line => line && line.startsWith('data: {'))
    .map(line => JSON.parse(line.substring(6)))
    .map(line => line.choices[0].delta.content)
    .join('')

  if (!result) throw new Error('No result found.')
  return { status: true, result }
}

app.get('/api/dolphin', async (req, res) => {
  try {
    const question = req.query.teks
    const template = req.query.otak || 'logical'

    if (!question) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "teks" diperlukan',
        example: '/api/dolphin?teks=Halo&otak=logical'
      })
    }

    const result = await dolphinai(question, { template })

    res.status(200).json({
      status: true,
      creator: 'AhmadXyz',
      api: 'fuku',
      template: template,
      result: result.result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      status: false,
      creator: 'AhmadXyz',
      api: 'fuku',
      message: error.message
    })
  }
})




app.listen(PORT, () => {
  console.log(`Web Siap Meluncur Abang kuh${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});