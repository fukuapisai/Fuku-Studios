const API_BASE_URL = 'https://api.fukugpt.my.id';
const ADMIN_API_KEY = 'doi';

let currentUser = null;
let userApiKeys = [];
let endpoints = [];
let otpTimer = null;
let otpCode = '';
let otpTimeLeft = 300;
let isMobileMenuOpen = false;

const loginModal = document.getElementById('loginModal');
const userMenu = document.getElementById('userMenu');
const userAvatar = document.getElementById('userAvatar');
const dropdownUserName = document.getElementById('dropdownUserName');
const dropdownUserEmail = document.getElementById('dropdownUserEmail');
const heroButtons = document.getElementById('heroButtons');
const statRemaining = document.getElementById('statRemaining');
const statUsed = document.getElementById('statUsed');
const statKeys = document.getElementById('statKeys');
const apiKeysList = document.getElementById('apiKeysList');
const totalRequests = document.getElementById('totalRequests');
const remainingRequests = document.getElementById('remainingRequests');
const successRate = document.getElementById('successRate');
const endpointsGrid = document.getElementById('endpointsGrid');
const apiTesterModal = document.getElementById('apiTesterModal');
const createKeyModal = document.getElementById('createKeyModal');
const toastContainer = document.getElementById('toastContainer');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.querySelector('.fx-nav-links');

let usageChart = null;

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    setupEventListeners();
    loadEndpoints();
    updateDashboard();
    
    setupModalCloseHandlers();
    
    if (!currentUser) {
        setTimeout(() => {
            loginModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }, 500);
    }
});

function checkLoginStatus() {
    try {
        const userData = localStorage.getItem('fuku_user');
        if (userData) {
            currentUser = JSON.parse(userData);
            updateUIForLoggedInUser();
        }
    } catch (error) {
        localStorage.removeItem('fuku_user');
        localStorage.removeItem('fuku_api_keys');
    }
}

function setupEventListeners() {
    document.getElementById('btnSendOTP').addEventListener('click', sendOTP);
    document.getElementById('btnVerifyOTP').addEventListener('click', verifyOTP);
    document.getElementById('btnResendOTP').addEventListener('click', resendOTP);
    
    document.querySelectorAll('.fx-otp-input').forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length === 1 && index < 3) {
                document.querySelector(`.fx-otp-input[data-index="${index + 1}"]`).focus();
            }
            if (index === 3 && value.length === 1) {
                const allFilled = Array.from(document.querySelectorAll('.fx-otp-input'))
                    .every(input => input.value.length === 1);
                if (allFilled) {
                    setTimeout(verifyOTP, 300);
                }
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                document.querySelector(`.fx-otp-input[data-index="${index - 1}"]`).focus();
            }
            
            if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                e.preventDefault();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').slice(0, 4);
            const otpInputs = document.querySelectorAll('.fx-otp-input');
            pasteData.split('').forEach((char, i) => {
                if (otpInputs[i] && /^\d$/.test(char)) {
                    otpInputs[i].value = char;
                }
            });
            if (pasteData.length === 4) {
                verifyOTP();
            }
        });
    });
    
    userAvatar.addEventListener('click', toggleUserMenu);
    document.getElementById('btnLogout').addEventListener('click', logout);
    
    document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target)) {
            userMenu.querySelector('.fx-user-dropdown').classList.remove('show');
        }
    });
    
    document.getElementById('btnCreateApiKey').addEventListener('click', () => {
        createKeyModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.getElementById('keyName').focus();
    });
    
    document.getElementById('closeCreateKey').addEventListener('click', closeCreateKeyModal);
    document.getElementById('btnCancelCreateKey').addEventListener('click', closeCreateKeyModal);
    document.getElementById('btnCreateKeyConfirm').addEventListener('click', createApiKey);
    
    document.getElementById('closeTester').addEventListener('click', closeTesterModal);
    document.getElementById('btnTestApi').addEventListener('click', testAPI);
    document.getElementById('btnResetTester').addEventListener('click', resetTester);
    document.getElementById('copyUrl').addEventListener('click', copyToClipboard);
    document.getElementById('copyResponse').addEventListener('click', copyResponse);
    
    document.querySelectorAll('.fx-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const endpoint = e.currentTarget.dataset.endpoint;
            openAPITester(endpoint);
        });
    });
    
    menuToggle.addEventListener('click', toggleMobileMenu);
    
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('show');
            isMobileMenuOpen = false;
        });
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (loginModal.style.display === 'flex') loginModal.style.display = 'none';
            if (apiTesterModal.style.display === 'flex') closeTesterModal();
            if (createKeyModal.style.display === 'flex') closeCreateKeyModal();
            document.body.style.overflow = '';
        }
    });
}

function setupModalCloseHandlers() {
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (e.target === apiTesterModal) {
            closeTesterModal();
        }
        if (e.target === createKeyModal) {
            closeCreateKeyModal();
        }
    });
}

function updateUIForLoggedInUser() {
    if (!currentUser) return;
    
    dropdownUserName.textContent = currentUser.name || 'User';
    dropdownUserEmail.textContent = currentUser.email || 'user@example.com';
    
    const firstName = currentUser.name?.split(' ')[0] || 'U';
    userAvatar.innerHTML = `<span>${firstName.charAt(0).toUpperCase()}</span>`;
    userAvatar.style.background = getRandomGradient();
    
    heroButtons.innerHTML = `
        <a href="#dashboard" class="fx-button-primary">
            <i class="fas fa-tachometer-alt"></i> Dashboard
        </a>
        <a href="#endpoints" class="fx-button-secondary">
            <i class="fas fa-code"></i> Endpoints
        </a>
    `;
    
    loginModal.style.display = 'none';
    document.body.style.overflow = '';
    
    loadUserApiKeys();
}

async function sendOTP() {
  const nameInput = document.getElementById('userName');
  const emailInput = document.getElementById('userEmail');
  
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  
  if (!name || !email) {
    showToast('error', 'Error', 'Harap isi nama dan email');
    highlightInvalidInput(nameInput, !name);
    highlightInvalidInput(emailInput, !email);
    return;
  }
  
  if (!validateEmail(email)) {
    showToast('error', 'Error', 'Format email tidak valid');
    highlightInvalidInput(emailInput, true);
    return;
  }
  
  highlightInvalidInput(nameInput, false);
  highlightInvalidInput(emailInput, false);
  
  // OTP random 4 digit angka
  otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  
  const sendBtn = document.getElementById('btnSendOTP');
  const originalHTML = sendBtn.innerHTML;
  sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
  sendBtn.disabled = true;
  
  try {
    const url = `https://api.fukugpt.my.id/api/kodeotp?email=${encodeURIComponent(email)}&kode=${otpCode}&api=doi`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === true) {
      currentUser = { name, email };
      
      document.getElementById('loginStep1').classList.remove('active');
      document.getElementById('loginStep2').classList.add('active');
      document.getElementById('otpEmail').textContent = email;
      
      startOTPTimer();
      
      showToast('success', 'OTP Terkirim', `Kode verifikasi telah dikirim ke ${email}`);
      
      setTimeout(() => {
        document.querySelector('.fx-otp-input[data-index="0"]').focus();
      }, 100);
    } else {
      showToast('error', 'Error', data.message || 'Gagal mengirim OTP');
    }
  } catch (error) {
    console.error(error);
    showToast('error', 'Error', 'Terjadi kesalahan saat mengirim OTP');
  } finally {
    sendBtn.innerHTML = originalHTML;
    sendBtn.disabled = false;
  }
}

function verifyOTP() {
    const otpInputs = document.querySelectorAll('.fx-otp-input');
    const enteredOTP = Array.from(otpInputs).map(input => input.value).join('');
    
    if (enteredOTP.length !== 4) {
        showToast('error', 'Error', 'Harap masukkan 4 digit kode OTP');
        return;
    }
    
    const isValidOTP = enteredOTP === otpCode;
    
    if (!isValidOTP) {
        showToast('error', 'Error', 'Kode OTP salah');
        otpInputs.forEach(input => {
            input.style.animation = 'shake 0.5s';
            setTimeout(() => input.style.animation = '', 500);
        });
        return;
    }
    
    try {
        localStorage.setItem('fuku_user', JSON.stringify(currentUser));
    } catch (error) {
        showToast('error', 'Error', 'Gagal menyimpan data pengguna');
        return;
    }
    
    updateUIForLoggedInUser();
    
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
    
    showToast('success', 'Selamat Datang!', `Halo ${currentUser.name}`);
}

function resendOTP() {
    if (!currentUser || !currentUser.email) {
        showToast('error', 'Error', 'Email tidak ditemukan');
        return;
    }
    
    otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    const resendBtn = document.getElementById('btnResendOTP');
    const originalHTML = resendBtn.innerHTML;
    resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    resendBtn.disabled = true;
    
    fetch(`${API_BASE_URL}/api/message?email=${encodeURIComponent(currentUser.email)}&pesan=Kode%20OTP%20baru:%20${otpCode}&api=${ADMIN_API_KEY}`)
        .then(() => {
            document.querySelectorAll('.fx-otp-input').forEach(input => input.value = '');
            document.querySelector('.fx-otp-input[data-index="0"]').focus();
            
            if (otpTimer) {
                clearInterval(otpTimer);
            }
            startOTPTimer();
            
            resendBtn.innerHTML = originalHTML;
            resendBtn.disabled = false;
            
            showToast('success', 'OTP Dikirim Ulang', 'Kode verifikasi baru telah dikirim');
        })
        .catch(() => {
            resendBtn.innerHTML = originalHTML;
            resendBtn.disabled = false;
            showToast('error', 'Error', 'Gagal mengirim OTP ulang');
        });
}

function startOTPTimer() {
    let timeLeft = 300;
    const timerElement = document.getElementById('otpTimer');
    const verifyBtn = document.getElementById('btnVerifyOTP');
    
    timerElement.textContent = timeLeft;
    verifyBtn.disabled = false;
    
    otpTimer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 30) {
            timerElement.style.color = '#f94144';
        }
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            timerElement.textContent = '0';
            verifyBtn.disabled = true;
            showToast('warning', 'OTP Kadaluarsa', 'Kode verifikasi telah kadaluarsa');
        }
    }, 1000);
}

function toggleUserMenu(e) {
    e.stopPropagation();
    const dropdown = userMenu.querySelector('.fx-user-dropdown');
    dropdown.classList.toggle('show');
}

function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
    navLinks.classList.toggle('show');
    
    const icon = menuToggle.querySelector('i');
    if (isMobileMenuOpen) {
        icon.className = 'fas fa-times';
    } else {
        icon.className = 'fas fa-bars';
    }
}

function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        try {
            localStorage.removeItem('fuku_user');
            localStorage.removeItem('fuku_api_keys');
        } catch (error) {}
        
        currentUser = null;
        userApiKeys = [];
        
        dropdownUserName.textContent = 'Guest';
        dropdownUserEmail.textContent = 'guest@example.com';
        userAvatar.innerHTML = '<i class="fas fa-user"></i>';
        userAvatar.style.background = 'linear-gradient(135deg, var(--primary), var(--secondary))';
        heroButtons.innerHTML = '';
        
        apiKeysList.innerHTML = `
            <div class="fx-empty-state">
                <i class="fas fa-key"></i>
                <p>Belum ada API key. Buat key pertama Anda!</p>
            </div>
        `;
        
        updateDashboardStats();
        
        loginModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.getElementById('loginStep1').classList.add('active');
        document.getElementById('loginStep2').classList.remove('active');
        document.getElementById('userEmail').value = '';
        document.getElementById('userName').value = '';
        
        if (isMobileMenuOpen) {
            toggleMobileMenu();
        }
        
        showToast('info', 'Logged Out', 'Anda telah keluar dari sistem');
    }
}

async function loadUserApiKeys() {
    if (!currentUser) return;
    
    try {
        const savedKeys = localStorage.getItem('fuku_api_keys');
        if (savedKeys) {
            userApiKeys = JSON.parse(savedKeys);
        } else {
            userApiKeys = [];
        }
        
        updateApiKeysList();
        updateDashboardStats();
        
    } catch (error) {
        showToast('error', 'Error', 'Gagal memuat API keys');
    }
}

async function createApiKey() {
    if (!currentUser) {
        showToast('error', 'Error', 'Harap login terlebih dahulu');
        return;
    }
    
    const keyNameInput = document.getElementById('keyName');
    const keyName = keyNameInput.value.trim();
    
    if (!keyName) {
        showToast('error', 'Error', 'Harap beri nama untuk API key');
        highlightInvalidInput(keyNameInput, true);
        return;
    }
    
    highlightInvalidInput(keyNameInput, false);
    
    if (userApiKeys.length >= 3) {
        showToast('warning', 'Peringatan', 'Maksimal 3 API keys per user');
        return;
    }
    
    const createBtn = document.getElementById('btnCreateKeyConfirm');
    const originalHTML = createBtn.innerHTML;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membuat...';
    createBtn.disabled = true;
    
    try {
        const fullKeyName = `${keyName} (${currentUser.email})`;
        
        const response = await fetch(`${API_BASE_URL}/api/createapikey?keys=${encodeURIComponent(fullKeyName)}&apikeyAdmin=${ADMIN_API_KEY}`);
        const data = await response.json();
        
        if (data.status) {
            const newKey = {
                key: data.apiKey,
                name: fullKeyName,
                created: new Date().toISOString(),
                remaining: 20,
                totalUsed: 0,
                lastUsed: null
            };
            
            userApiKeys.push(newKey);
            
            try {
                localStorage.setItem('fuku_api_keys', JSON.stringify(userApiKeys));
            } catch (error) {
                showToast('error', 'Error', 'Gagal menyimpan API key');
                return;
            }
            
            updateApiKeysList();
            updateDashboardStats();
            
            closeCreateKeyModal();
            keyNameInput.value = '';
            
            showToast('success', 'API Key Created', 'API key berhasil dibuat');
            
            copyToClipboardText(data.apiKey, 'API key telah disalin ke clipboard');
            
        } else {
            showToast('error', 'Error', data.message || 'Gagal membuat API key');
        }
    } catch (error) {
        showToast('error', 'Error', 'Terjadi kesalahan saat membuat API key');
    } finally {
        createBtn.innerHTML = originalHTML;
        createBtn.disabled = false;
    }
}

function updateApiKeysList() {
    if (!userApiKeys || userApiKeys.length === 0) {
        apiKeysList.innerHTML = `
            <div class="fx-empty-state">
                <i class="fas fa-key"></i>
                <p>Belum ada API key. Buat key pertama Anda!</p>
            </div>
        `;
        return;
    }
    
    apiKeysList.innerHTML = userApiKeys.map((key, index) => `
        <div class="fx-api-key-item">
            <div class="fx-api-key-header">
                <div class="fx-api-key-name">${escapeHtml(key.name.split('(')[0].trim())}</div>
                <div class="fx-api-key-actions">
                    <button class="fx-copy-btn" onclick="copyApiKey('${escapeHtml(key.key)}')" title="Copy API Key">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="fx-copy-btn" onclick="testWithKey('${escapeHtml(key.key)}')" title="Test API">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="fx-copy-btn fx-delete-btn" onclick="deleteApiKey(${index})" title="Delete Key">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="fx-api-key-value">
                <span class="fx-key-preview">${key.key.substring(0, 20)}...</span>
                <button class="fx-show-btn" onclick="toggleKeyVisibility(${index})" title="Show Full Key">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <div class="fx-full-key" id="fullKey-${index}" style="display: none;">
                <code>${escapeHtml(key.key)}</code>
            </div>
            <div class="fx-api-key-stats">
                <div class="fx-api-stat">
                    <span class="fx-stat-value">${key.remaining}</span>
                    <span class="fx-stat-label">Remaining</span>
                </div>
                <div class="fx-api-stat">
                    <span class="fx-stat-value">${key.totalUsed || 0}</span>
                    <span class="fx-stat-label">Used</span>
                </div>
                <div class="fx-api-stat">
                    <span class="fx-stat-value">${key.lastUsed ? formatDate(key.lastUsed) : 'Never'}</span>
                    <span class="fx-stat-label">Last Used</span>
                </div>
            </div>
        </div>
    `).join('');
}

window.toggleKeyVisibility = function(index) {
    const fullKeyElement = document.getElementById(`fullKey-${index}`);
    const eyeIcon = document.querySelector(`#fullKey-${index}`).previousElementSibling
        .querySelector('.fx-show-btn i');
    
    if (fullKeyElement.style.display === 'none') {
        fullKeyElement.style.display = 'block';
        eyeIcon.className = 'fas fa-eye-slash';
    } else {
        fullKeyElement.style.display = 'none';
        eyeIcon.className = 'fas fa-eye';
    }
};


window.deleteApiKey = function(index) {
    showToast(
        'error',
        'Tidak Diizinkan',
        'API key tidak bisa dihapus. Untuk menambah atau mengganti API key, silakan beli paket baru.'
    );
    return;
};

window.copyApiKey = function(key) {
    copyToClipboardText(key, 'API key telah disalin ke clipboard');
};

window.testWithKey = function(apiKey) {
    openAPITester('tiktok', apiKey);
};

function updateDashboardStats() {
    const totalRemaining = userApiKeys.reduce((sum, key) => sum + (key.remaining || 0), 0);
    const totalUsed = userApiKeys.reduce((sum, key) => sum + (key.totalUsed || 0), 0);
    
    statRemaining.textContent = totalRemaining;
    statUsed.textContent = totalUsed;
    statKeys.textContent = userApiKeys.length;
    
    totalRequests.textContent = totalUsed;
    remainingRequests.textContent = totalRemaining;
    
    const rate = totalUsed > 0 ? 95 : 0;
    successRate.textContent = `${rate}%`;
    
    updateUsageChart();
}

function updateUsageChart() {
    const ctx = document.getElementById('usageChartCanvas').getContext('2d');
    
    if (usageChart) {
        usageChart.destroy();
    }
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const requestsData = userApiKeys.length > 0 ? 
        [12, 19, 8, 15, 22, 18, 25] : 
        [0, 0, 0, 0, 0, 0, 0];
    
    const data = {
        labels: days,
        datasets: [{
            label: 'API Requests',
            data: requestsData,
            backgroundColor: 'rgba(67, 97, 238, 0.2)',
            borderColor: 'rgba(67, 97, 238, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: 'white',
            pointBorderColor: 'rgba(67, 97, 238, 1)',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };
    
    usageChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(67, 97, 238, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 6,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        padding: 10
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        padding: 10
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function loadEndpoints() {
    endpoints = [
        {
            id: 'tiktok',
            name: 'TikTok Downloader',
            description: 'Download video TikTok tanpa watermark.',
            method: 'GET',
            path: '/api/tiktok',
            icon: 'fab fa-tiktok',
            color: '#000000',
            parameters: [
                { name: 'url', type: 'text', required: true, label: 'TikTok URL', placeholder: 'https://vt.tiktok.com/...' }
            ]
        },
        {
            id: 'dolphin',
            name: 'Dolphin AI Chat',
            description: 'Chat AI dengan berbagai template otak.',
            method: 'GET',
            path: '/api/dolphin',
            icon: 'fas fa-brain',
            color: '#4cc9f0',
            parameters: [
                { name: 'teks', type: 'text', required: true, label: 'Pertanyaan', placeholder: 'Apa itu AI?' },
                { name: 'otak', type: 'select', required: false, label: 'Template', options: [
                    { value: 'logical', label: 'Logical' },
                    { value: 'creative', label: 'Creative' },
                    { value: 'summarize', label: 'Summarize' },
                    { value: 'code-beginner', label: 'Code Beginner' },
                    { value: 'code-advanced', label: 'Code Advanced' }
                ]}
            ]
        },
        {
            id: 'turboseek',
            name: 'Turboseek AI Search',
            description: 'Search engine AI dengan sumber terpercaya.',
            method: 'GET',
            path: '/api/turboseek',
            icon: 'fas fa-search',
            color: '#f8961e',
            parameters: [
                { name: 'teks', type: 'text', required: true, label: 'Pertanyaan', placeholder: 'What is machine learning?' }
            ]
        },
        {
            id: 'base64',
            name: 'Base64 Encoder',
            description: 'Convert text to Base64 format.',
            method: 'GET',
            path: '/api/tobase64',
            icon: 'fas fa-code',
            color: '#7209b7',
            parameters: [
                { name: 'text', type: 'text', required: true, label: 'Text', placeholder: 'Hello World' }
            ]
        },
        {
            id: 'message',
            name: 'Send Email',
            description: 'Kirim email melalui API.',
            method: 'GET',
            path: '/api/message',
            icon: 'fas fa-envelope',
            color: '#f72585',
            parameters: [
                { name: 'email', type: 'email', required: true, label: 'Email Tujuan', placeholder: 'user@example.com' },
                { name: 'pesan', type: 'textarea', required: true, label: 'Pesan', placeholder: 'Halo, ini pesan test' }
            ]
        },
        {
            id: 'fukucek',
            name: 'Check Payment',
            description: 'Cek status pembayaran QRIS.',
            method: 'GET',
            path: '/api/fukucek',
            icon: 'fas fa-qrcode',
            color: '#4361ee',
            parameters: [
                { name: 'transactionId', type: 'text', required: true, label: 'Transaction ID', placeholder: 'TRX123456' }
            ]
        }
    ];
    
    renderEndpoints();
}

function renderEndpoints() {
    endpointsGrid.innerHTML = endpoints.map(endpoint => `
        <div class="fx-endpoint-card" onclick="openAPITester('${endpoint.id}')">
            <div class="fx-endpoint-icon" style="background: ${endpoint.color || 'linear-gradient(135deg, var(--primary), var(--secondary))'};">
                <i class="${endpoint.icon}"></i>
            </div>
            <h3 class="fx-endpoint-title">${endpoint.name}</h3>
            <p class="fx-endpoint-desc">${endpoint.description}</p>
            <div class="fx-endpoint-meta">
                <span class="fx-endpoint-method" style="background: ${endpoint.color || 'var(--primary)'};">${endpoint.method}</span>
                <code class="fx-endpoint-path" title="${endpoint.path}">${endpoint.path}</code>
            </div>
        </div>
    `).join('');
}

function openAPITester(endpointId, apiKey = null) {
    if (!currentUser) {
        showToast('error', 'Error', 'Harap login terlebih dahulu');
        loginModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        return;
    }
    
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (!endpoint) {
        showToast('error', 'Error', 'Endpoint tidak ditemukan');
        return;
    }
    
    const userApiKey = apiKey || (userApiKeys[0] ? userApiKeys[0].key : null);
    
    if (!userApiKey) {
        showToast('error', 'Error', 'Anda belum memiliki API key');
        createKeyModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        return;
    }
    
    document.getElementById('testerTitle').textContent = endpoint.name;
    
    const baseUrl = `${API_BASE_URL}${endpoint.path}?api=${userApiKey}`;
    document.getElementById('apiUrl').value = baseUrl;
    
    const paramsContainer = document.getElementById('testerParams');
    paramsContainer.innerHTML = endpoint.parameters.map(param => {
        if (param.type === 'select') {
            return `
                <div class="fx-param-group">
                    <label>${param.label} ${param.required ? '<span>*</span>' : ''}</label>
                    <select class="fx-param-select" data-name="${param.name}" ${param.required ? 'required' : ''}>
                        ${param.options.map(opt => `
                            <option value="${opt.value || opt}" ${opt.label ? `data-label="${opt.label}"` : ''}>
                                ${opt.label || opt}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }
        
        if (param.type === 'textarea') {
            return `
                <div class="fx-param-group">
                    <label>${param.label} ${param.required ? '<span>*</span>' : ''}</label>
                    <textarea 
                        class="fx-param-textarea"
                        data-name="${param.name}" 
                        data-required="${param.required}"
                        placeholder="${param.placeholder}"
                        rows="3"
                        ${param.required ? 'required' : ''}></textarea>
                </div>
            `;
        }
        
        return `
            <div class="fx-param-group">
                <label>${param.label} ${param.required ? '<span>*</span>' : ''}</label>
                <input type="${param.type}" 
                       class="fx-param-input"
                       data-name="${param.name}" 
                       data-required="${param.required}"
                       placeholder="${param.placeholder}"
                       ${param.required ? 'required' : ''}>
            </div>
        `;
    }).join('');
    
    paramsContainer.innerHTML += `
        <div class="fx-param-info">
            <i class="fas fa-key"></i>
            <span>Menggunakan API Key: ${userApiKey.substring(0, 15)}...</span>
        </div>
    `;
    
    apiTesterModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        const firstInput = paramsContainer.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function testAPI() {
    if (!currentUser) {
        showToast('error', 'Error', 'Harap login terlebih dahulu');
        return;
    }
    
    const userApiKey = userApiKeys[0] ? userApiKeys[0].key : null;
    if (!userApiKey) {
        showToast('error', 'Error', 'Anda belum memiliki API key');
        return;
    }
    
    const urlInput = document.getElementById('apiUrl');
    let url = urlInput.value.split('?')[0];
    
    const params = new URLSearchParams();
    params.append('api', userApiKey);
    
    const paramInputs = document.querySelectorAll('#testerParams .fx-param-input, #testerParams .fx-param-select, #testerParams .fx-param-textarea');
    let hasErrors = false;
    
    paramInputs.forEach(input => {
        input.classList.remove('error');
        const errorMsg = input.parentNode.querySelector('.fx-error-message');
        if (errorMsg) errorMsg.remove();
    });
    
    paramInputs.forEach(input => {
        const name = input.dataset.name;
        const value = input.value.trim();
        const required = input.dataset.required === 'true';
        
        if (required && !value) {
            showInputError(input, `Parameter ${name} harus diisi`);
            hasErrors = true;
            return;
        }
        
        if (input.type === 'email' && value && !validateEmail(value)) {
            showInputError(input, 'Format email tidak valid');
            hasErrors = true;
            return;
        }
        
        if (value) {
            params.append(name, value);
        }
    });
    
    if (hasErrors) return;
    
    const finalUrl = `${url}?${params.toString()}`;
    urlInput.value = finalUrl;
    
    const responseOutput = document.getElementById('apiResponse');
    responseOutput.innerHTML = '<code class="language-json">Loading...</code>';
    
    const testBtn = document.getElementById('btnTestApi');
    const originalHTML = testBtn.innerHTML;
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    testBtn.disabled = true;
    
    try {
        const response = await fetch(finalUrl);
        const data = await response.json();
        
        const formattedJson = JSON.stringify(data, null, 2);
        responseOutput.innerHTML = `<code class="language-json">${escapeHtml(formattedJson)}</code>`;
        
        Prism.highlightAllUnder(responseOutput);
        
        if (data.status && userApiKeys[0]) {
            userApiKeys[0].remaining = Math.max(0, userApiKeys[0].remaining - 1);
            userApiKeys[0].totalUsed = (userApiKeys[0].totalUsed || 0) + 1;
            userApiKeys[0].lastUsed = new Date().toISOString();
            
            updateApiKeysList();
            updateDashboardStats();
            
            try {
                localStorage.setItem('fuku_api_keys', JSON.stringify(userApiKeys));
            } catch (error) {}
        }
        
        showToast('success', 'Success', 'API request berhasil');
        
    } catch (error) {
        responseOutput.innerHTML = `<code class="language-json">{
  "error": "${escapeHtml(error.message)}",
  "status": false,
  "message": "Gagal melakukan request API"
}</code>`;
        showToast('error', 'Error', 'Gagal melakukan request API');
    } finally {
        testBtn.innerHTML = originalHTML;
        testBtn.disabled = false;
        
        Prism.highlightAllUnder(responseOutput);
    }
}

function resetTester() {
    document.querySelectorAll('#testerParams input, #testerParams select, #testerParams textarea').forEach(input => {
        input.value = '';
        input.classList.remove('error');
        
        if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        }
        
        const errorMsg = input.parentNode.querySelector('.fx-error-message');
        if (errorMsg) errorMsg.remove();
    });
    
    document.getElementById('apiResponse').innerHTML = `<code class="language-json">{
  "status": "ready",
  "message": "Masukkan parameter dan klik Test API"
}</code>`;
    
    Prism.highlightAllUnder(document.getElementById('apiResponse'));
}

function closeTesterModal() {
    apiTesterModal.style.display = 'none';
    document.body.style.overflow = '';
}

function closeCreateKeyModal() {
    createKeyModal.style.display = 'none';
    document.body.style.overflow = '';
    document.getElementById('keyName').value = '';
}

function copyToClipboard() {
    const url = document.getElementById('apiUrl').value;
    copyToClipboardText(url, 'URL telah disalin ke clipboard');
}

function copyResponse() {
    const responseText = document.getElementById('apiResponse').textContent;
    copyToClipboardText(responseText, 'Response telah disalin ke clipboard');
}

function copyToClipboardText(text, successMessage) {
    if (!text || text === 'Loading...') {
        showToast('warning', 'Warning', 'Tidak ada teks untuk disalin');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('success', 'Copied', successMessage);
    }).catch(err => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('success', 'Copied', successMessage);
        } catch (err) {
            showToast('error', 'Error', 'Gagal menyalin ke clipboard');
        }
        document.body.removeChild(textArea);
    });
}

function showInputError(input, message) {
    input.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fx-error-message';
    errorDiv.textContent = message;
    errorDiv.style.color = '#f94144';
    errorDiv.style.fontSize = '0.9rem';
    errorDiv.style.marginTop = '5px';
    input.parentNode.appendChild(errorDiv);
}

function highlightInvalidInput(input, isInvalid) {
    if (isInvalid) {
        input.style.borderColor = '#f94144';
        input.style.boxShadow = '0 0 0 3px rgba(249, 65, 68, 0.1)';
    } else {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    }
}

function showToast(type, title, message) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const colors = {
        success: '#4cc9f0',
        error: '#f94144',
        warning: '#f8961e',
        info: '#4361ee'
    };
    
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `fx-toast fx-toast-${type}`;
    toast.innerHTML = `
        <div class="fx-toast-icon">
            <i class="${icons[type]}" style="color: ${colors[type]}"></i>
        </div>
        <div class="fx-toast-content">
            <h4>${escapeHtml(title)}</h4>
            <p>${escapeHtml(message)}</p>
        </div>
        <button class="fx-toast-close" onclick="removeToast('${toastId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .fx-toast-close {
            background: none;
            border: none;
            color: var(--gray);
            cursor: pointer;
            padding: 5px;
            margin-left: 10px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        .fx-toast-close:hover {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
    
    toastContainer.appendChild(toast);
    
    const autoRemove = setTimeout(() => {
        removeToast(toastId);
    }, 5000);
    
    toast.dataset.timeoutId = autoRemove;
    
    toast.addEventListener('click', (e) => {
        if (!e.target.closest('.fx-toast-close')) {
            removeToast(toastId);
        }
    });
}

window.removeToast = function(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    
    if (toast.dataset.timeoutId) {
        clearTimeout(toast.dataset.timeoutId);
    }
    
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
};

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

function generateRandomKey(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getRandomGradient() {
    const gradients = [
        'linear-gradient(135deg, #4361ee, #7209b7)',
        'linear-gradient(135deg, #f72585, #b5179e)',
        'linear-gradient(135deg, #4cc9f0, #4895ef)',
        'linear-gradient(135deg, #f8961e, #f3722c)',
        'linear-gradient(135deg, #90be6d, #43aa8b)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .fx-param-input.error,
    .fx-param-select.error,
    .fx-param-textarea.error {
        border-color: #f94144 !important;
        box-shadow: 0 0 0 3px rgba(249, 65, 68, 0.1) !important;
    }
    
    .fx-param-textarea {
        width: 100%;
        resize: vertical;
        min-height: 80px;
        font-family: 'Inter', sans-serif;
    }
    
    .fx-param-info {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
        margin-top: 20px;
        color: var(--gray);
        font-size: 0.9rem;
    }
    
    .fx-param-info i {
        color: var(--primary);
    }
    
    .fx-key-preview {
        font-family: 'Courier New', monospace;
        opacity: 0.9;
    }
    
    .fx-show-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        transition: all 0.2s;
    }
    
    .fx-show-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
    }
    
    .fx-delete-btn:hover {
        background: rgba(249, 65, 68, 0.2) !important;
        color: #f94144 !important;
    }
    
    .fx-full-key {
        margin: 10px 0;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        overflow-x: auto;
    }
    
    .fx-full-key code {
        font-family: 'Courier New', monospace;
        font-size: 0.8rem;
        color: var(--success);
        word-break: break-all;
    }
`;
document.head.appendChild(shakeStyle);