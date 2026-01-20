const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Endpoint untuk contact (dummy handler)
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  
  // Simulasi save ke database (console.log aja)
  console.log('=== CONTACT FORM SUBMISSION ===');
  console.log(`Name: ${name}`);
  console.log(`Email: ${email}`);
  console.log(`Message: ${message}`);
  console.log('=============================');
  
  // Response sukses
  res.status(200).json({
    success: true,
    message: 'Pesan berhasil dikirim! Kami akan menghubungi Anda dalam 1-2 hari kerja.',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'FukuXyz API' });
});

// Tambahkan endpoint ini sebelum route catch-all (*)
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
        
        // Konversi teks ke base64
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

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 FukuXyz website running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});