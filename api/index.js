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

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 FukuXyz website running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});