// Configuration
const API_BASE_URL = 'https://api.fukugpt.my.id';
const ADMIN_API_KEY = 'doi';

// State Management
let currentUser = null;
let userApiKeys = [];
let endpoints = [];
let otpTimer = null;
let otpCode = '';

// DOM Elements
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

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    setupEventListeners();
    loadEndpoints();
    updateDashboard();
    
    // If not logged in, show login modal
    if (!currentUser) {
        setTimeout(() => {
            loginModal.style.display = 'flex';
        }, 1000);
    }
});

// Check if user is logged in
function checkLoginStatus() {
    const userData = localStorage.getItem('fuku_user');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateUIForLoggedInUser();
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Login OTP
    document.getElementById('btnSendOTP').addEventListener('click', sendOTP);
    document.getElementById('btnVerifyOTP').addEventListener('click', verifyOTP);
    document.getElementById('btnResendOTP').addEventListener('click', resendOTP);
    
    // OTP input auto-focus
    document.querySelectorAll('.fx-otp-input').forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < 3) {
                document.querySelector(`.fx-otp-input[data-index="${index + 1}"]`).focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                document.querySelector(`.fx-otp-input[data-index="${index - 1}"]`).focus();
            }
        });
    });
    
    // User menu
    userAvatar.addEventListener('click', toggleUserMenu);
    document.getElementById('btnLogout').addEventListener('click', logout);
    
    // Create API Key
    document.getElementById('btnCreateApiKey').addEventListener('click', () => {
        createKeyModal.style.display = 'flex';
    });
    
    document.getElementById('closeCreateKey').addEventListener('click', () => {
        createKeyModal.style.display = 'none';
    });
    
    document.getElementById('btnCancelCreateKey').addEventListener('click', () => {
        createKeyModal.style.display = 'none';
    });
    
    document.getElementById('btnCreateKeyConfirm').addEventListener('click', createApiKey);
    
    // API Tester
    document.getElementById('closeTester').addEventListener('click', () => {
        apiTesterModal.style.display = 'none';
    });
    
    document.getElementById('btnTestApi').addEventListener('click', testAPI);
    document.getElementById('btnResetTester').addEventListener('click', resetTester);
    document.getElementById('copyUrl').addEventListener('click', copyToClipboard);
    document.getElementById('copyResponse').addEventListener('click', copyResponse);
    
    // Quick Actions
    document.querySelectorAll('.fx-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const endpoint = e.currentTarget.dataset.endpoint;
            openAPITester(endpoint);
        });
    });
    
    // Menu Toggle for Mobile
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.fx-nav-links').classList.toggle('show');
    });
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    if (!currentUser) return;
    
    // Update user menu
    dropdownUserName.textContent = currentUser.name;
    dropdownUserEmail.textContent = currentUser.email;
    userAvatar.innerHTML = `<span>${currentUser.name.charAt(0).toUpperCase()}</span>`;
    
    // Update hero section
    heroButtons.innerHTML = `
        <a href="#dashboard" class="fx-button-primary">
            <i class="fas fa-tachometer-alt"></i> Go to Dashboard
        </a>
        <a href="#endpoints" class="fx-button-secondary">
            <i class="fas fa-code"></i> Explore Endpoints
        </a>
    `;
    
    // Hide login modal
    loginModal.style.display = 'none';
    
    // Load user's API keys
    loadUserApiKeys();
}

// Send OTP
async function sendOTP() {
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    
    if (!name || !email) {
        showToast('error', 'Error', 'Harap isi nama dan email');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('error', 'Error', 'Format email tidak valid');
        return;
    }
    
    // Generate random 4-digit OTP
    otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Send OTP via API
    try {
        const response = await fetch(`${API_BASE_URL}/api/kodeotp?email=${encodeURIComponent(email)}&kode=${otpCode}&api=${ADMIN_API_KEY}`);
        const data = await response.json();
        
        if (data.status) {
            // Store user data temporarily
            currentUser = { name, email };
            
            // Show OTP step
            document.getElementById('loginStep1').classList.remove('active');
            document.getElementById('loginStep2').classList.add('active');
            document.getElementById('otpEmail').textContent = email;
            
            // Start OTP timer
            startOTPTimer();
            
            showToast('success', 'OTP Terkirim', `Kode verifikasi telah dikirim ke ${email}`);
        } else {
            showToast('error', 'Error', data.message || 'Gagal mengirim OTP');
        }
    } catch (error) {
        showToast('error', 'Error', 'Terjadi kesalahan saat mengirim OTP');
        console.error('OTP Error:', error);
    }
}

// Verify OTP
function verifyOTP() {
    const otpInputs = document.querySelectorAll('.fx-otp-input');
    const enteredOTP = Array.from(otpInputs).map(input => input.value).join('');
    
    if (enteredOTP !== otpCode) {
        showToast('error', 'Error', 'Kode OTP salah');
        return;
    }
    
    // Save user to localStorage
    localStorage.setItem('fuku_user', JSON.stringify(currentUser));
    
    // Update UI
    updateUIForLoggedInUser();
    
    // Clear OTP timer
    if (otpTimer) {
        clearInterval(otpTimer);
    }
    
    showToast('success', 'Selamat Datang!', `Halo ${currentUser.name}`);
}

// Resend OTP
function resendOTP() {
    if (!currentUser) return;
    
    // Generate new OTP
    otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    fetch(`${API_BASE_URL}/api/kodeotp?email=${encodeURIComponent(currentUser.email)}&kode=${otpCode}&api=${ADMIN_API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.status) {
                // Reset OTP inputs
                document.querySelectorAll('.fx-otp-input').forEach(input => input.value = '');
                document.querySelector('.fx-otp-input[data-index="0"]').focus();
                
                // Reset timer
                if (otpTimer) {
                    clearInterval(otpTimer);
                }
                startOTPTimer();
                
                showToast('success', 'OTP Dikirim Ulang', 'Kode verifikasi baru telah dikirim');
            }
        });
}

// Start OTP timer
function startOTPTimer() {
    let timeLeft = 300; // 5 minutes
    const timerElement = document.getElementById('otpTimer');
    
    otpTimer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            showToast('warning', 'OTP Kadaluarsa', 'Kode verifikasi telah kadaluarsa');
        }
    }, 1000);
}

// Toggle user menu
function toggleUserMenu() {
    const dropdown = userMenu.querySelector('.fx-user-dropdown');
    dropdown.classList.toggle('show');
}

// Logout
function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        localStorage.removeItem('fuku_user');
        localStorage.removeItem('fuku_api_keys');
        currentUser = null;
        userApiKeys = [];
        
        // Reset UI
        dropdownUserName.textContent = 'Guest';
        dropdownUserEmail.textContent = 'guest@example.com';
        userAvatar.innerHTML = '<i class="fas fa-user"></i>';
        heroButtons.innerHTML = '';
        apiKeysList.innerHTML = `
            <div class="fx-empty-state">
                <i class="fas fa-key"></i>
                <p>Belum ada API key. Buat key pertama Anda!</p>
            </div>
        `;
        
        // Show login modal
        loginModal.style.display = 'flex';
        
        showToast('info', 'Logged Out', 'Anda telah keluar dari sistem');
    }
}

// Load user's API keys
async function loadUserApiKeys() {
    if (!currentUser) return;
    
    try {
        // Get all API keys (admin endpoint)
        const response = await fetch(`${API_BASE_URL}/api/listkeys?apikeyAdmin=${ADMIN_API_KEY}`);
        const data = await response.json();
        
        if (data.status) {
            // Filter keys for this user (by email in key name)
            userApiKeys = data.keys.filter(key => 
                key.name.toLowerCase().includes(currentUser.email.toLowerCase())
            );
            
            // Save to localStorage
            localStorage.setItem('fuku_api_keys', JSON.stringify(userApiKeys));
            
            // Update UI
            updateApiKeysList();
            updateDashboardStats();
        }
    } catch (error) {
        console.error('Error loading API keys:', error);
        // Try to load from localStorage
        const savedKeys = localStorage.getItem('fuku_api_keys');
        if (savedKeys) {
            userApiKeys = JSON.parse(savedKeys);
            updateApiKeysList();
            updateDashboardStats();
        }
    }
}

// Create new API key
async function createApiKey() {
    if (!currentUser) {
        showToast('error', 'Error', 'Harap login terlebih dahulu');
        return;
    }
    
    const keyName = document.getElementById('keyName').value.trim();
    if (!keyName) {
        showToast('error', 'Error', 'Harap beri nama untuk API key');
        return;
    }
    
    // Check if user already has an API key
    if (userApiKeys.length > 0) {
        showToast('warning', 'Peringatan', 'Anda sudah memiliki API key. Hanya diperbolehkan 1 API key per user.');
        return;
    }
    
    try {
        // Create key name with user email for identification
        const fullKeyName = `${keyName} (${currentUser.email})`;
        
        const response = await fetch(`${API_BASE_URL}/api/createapikey?keys=${encodeURIComponent(fullKeyName)}&apikeyAdmin=${ADMIN_API_KEY}`);
        const data = await response.json();
        
        if (data.status) {
            // Add to user's keys
            userApiKeys.push({
                key: data.apiKey,
                name: fullKeyName,
                created: new Date().toISOString(),
                remaining: 20,
                totalUsed: 0,
                lastUsed: null
            });
            
            // Save to localStorage
            localStorage.setItem('fuku_api_keys', JSON.stringify(userApiKeys));
            
            // Update UI
            updateApiKeysList();
            updateDashboardStats();
            
            // Close modal and reset form
            createKeyModal.style.display = 'none';
            document.getElementById('keyName').value = '';
            
            showToast('success', 'API Key Created', `Key: ${data.apiKey.substring(0, 15)}...`);
            
            // Copy API key to clipboard
            navigator.clipboard.writeText(data.apiKey).then(() => {
                showToast('info', 'Copied', 'API key telah disalin ke clipboard');
            });
        } else {
            showToast('error', 'Error', data.message || 'Gagal membuat API key');
        }
    } catch (error) {
        console.error('Error creating API key:', error);
        showToast('error', 'Error', 'Terjadi kesalahan saat membuat API key');
    }
}

// Update API keys list in UI
function updateApiKeysList() {
    if (!userApiKeys.length) {
        apiKeysList.innerHTML = `
            <div class="fx-empty-state">
                <i class="fas fa-key"></i>
                <p>Belum ada API key. Buat key pertama Anda!</p>
            </div>
        `;
        return;
    }
    
    apiKeysList.innerHTML = userApiKeys.map(key => `
        <div class="fx-api-key-item">
            <div class="fx-api-key-header">
                <div class="fx-api-key-name">${key.name.split('(')[0]}</div>
                <div class="fx-api-key-actions">
                    <button class="fx-copy-btn" onclick="copyApiKey('${key.key}')" title="Copy API Key">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="fx-copy-btn" onclick="testWithKey('${key.key}')" title="Test API">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
            <div class="fx-api-key-value">
                <span>${key.key}</span>
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

// Copy API key to clipboard
function copyApiKey(key) {
    navigator.clipboard.writeText(key).then(() => {
        showToast('success', 'Copied', 'API key telah disalin ke clipboard');
    });
}

// Test API with specific key
function testWithKey(apiKey) {
    openAPITester('tiktok', apiKey);
}

// Update dashboard statistics
function updateDashboardStats() {
    const totalRemaining = userApiKeys.reduce((sum, key) => sum + key.remaining, 0);
    const totalUsed = userApiKeys.reduce((sum, key) => sum + (key.totalUsed || 0), 0);
    
    statRemaining.textContent = totalRemaining;
    statUsed.textContent = totalUsed;
    statKeys.textContent = userApiKeys.length;
    
    totalRequests.textContent = totalUsed;
    remainingRequests.textContent = totalRemaining;
    successRate.textContent = totalUsed > 0 ? '95%' : '0%';
    
    // Update chart
    updateUsageChart();
}

// Update usage chart
function updateUsageChart() {
    const ctx = document.getElementById('usageChartCanvas').getContext('2d');
    
    // Destroy existing chart if exists
    if (window.usageChart) {
        window.usageChart.destroy();
    }
    
    const data = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'API Requests',
            data: [12, 19, 8, 15, 22, 18, 25],
            backgroundColor: 'rgba(67, 97, 238, 0.2)',
            borderColor: 'rgba(67, 97, 238, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true
        }]
    };
    
    window.usageChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

// Load available endpoints
function loadEndpoints() {
    endpoints = [
        {
            id: 'tiktok',
            name: 'TikTok Downloader',
            description: 'Download video TikTok tanpa watermark',
            method: 'GET',
            path: '/api/tiktok',
            icon: 'fab fa-tiktok',
            parameters: [
                { name: 'url', type: 'text', required: true, label: 'TikTok URL', placeholder: 'https://vt.tiktok.com/...' }
            ]
        },
        {
            id: 'dolphin',
            name: 'Dolphin AI Chat',
            description: 'Chat AI dengan berbagai template otak',
            method: 'GET',
            path: '/api/dolphin',
            icon: 'fas fa-brain',
            parameters: [
                { name: 'teks', type: 'text', required: true, label: 'Pertanyaan', placeholder: 'Apa itu AI?' },
                { name: 'otak', type: 'select', required: false, label: 'Template', options: ['logical', 'creative', 'summarize', 'code-beginner', 'code-advanced'] }
            ]
        },
        {
            id: 'turboseek',
            name: 'Turboseek AI Search',
            description: 'Search engine AI dengan sumber terpercaya',
            method: 'GET',
            path: '/api/turboseek',
            icon: 'fas fa-search',
            parameters: [
                { name: 'teks', type: 'text', required: true, label: 'Pertanyaan', placeholder: 'What is machine learning?' }
            ]
        },
        {
            id: 'base64',
            name: 'Base64 Encoder',
            description: 'Convert text to Base64 format',
            method: 'GET',
            path: '/api/tobase64',
            icon: 'fas fa-code',
            parameters: [
                { name: 'text', type: 'text', required: true, label: 'Text', placeholder: 'Hello World' }
            ]
        },
        {
            id: 'message',
            name: 'Send Email',
            description: 'Kirim email melalui API',
            method: 'GET',
            path: '/api/message',
            icon: 'fas fa-envelope',
            parameters: [
                { name: 'email', type: 'email', required: true, label: 'Email Tujuan', placeholder: 'user@example.com' },
                { name: 'pesan', type: 'text', required: true, label: 'Pesan', placeholder: 'Halo, ini pesan test' }
            ]
        },
        {
            id: 'fukucek',
            name: 'Check Payment',
            description: 'Cek status pembayaran QRIS',
            method: 'GET',
            path: '/api/fukucek',
            icon: 'fas fa-qrcode',
            parameters: [
                { name: 'transactionId', type: 'text', required: true, label: 'Transaction ID', placeholder: 'TRX123456' }
            ]
        }
    ];
    
    renderEndpoints();
}

// Render endpoints grid
function renderEndpoints() {
    endpointsGrid.innerHTML = endpoints.map(endpoint => `
        <div class="fx-endpoint-card" onclick="openAPITester('${endpoint.id}')">
            <div class="fx-endpoint-icon">
                <i class="${endpoint.icon}"></i>
            </div>
            <h3 class="fx-endpoint-title">${endpoint.name}</h3>
            <p class="fx-endpoint-desc">${endpoint.description}</p>
            <div class="fx-endpoint-meta">
                <span class="fx-endpoint-method">${endpoint.method}</span>
                <code class="fx-endpoint-path">${endpoint.path}</code>
            </div>
        </div>
    `).join('');
}

// Open API tester modal
function openAPITester(endpointId, apiKey = null) {
    if (!currentUser) {
        showToast('error', 'Error', 'Harap login terlebih dahulu');
        return;
    }
    
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;
    
    // Use user's API key if available
    const userApiKey = apiKey || (userApiKeys[0] ? userApiKeys[0].key : '');
    
    if (!userApiKey) {
        showToast('error', 'Error', 'Anda belum memiliki API key');
        return;
    }
    
    // Update modal title
    document.getElementById('testerTitle').textContent = endpoint.name;
    
    // Build URL
    const baseUrl = `${API_BASE_URL}${endpoint.path}?api=${userApiKey}`;
    document.getElementById('apiUrl').value = baseUrl;
    
    // Build parameters form
    const paramsContainer = document.getElementById('testerParams');
    paramsContainer.innerHTML = endpoint.parameters.map(param => {
        if (param.type === 'select') {
            return `
                <div class="fx-param-group">
                    <label>${param.label} ${param.required ? '<span style="color:#f94144">*</span>' : ''}</label>
                    <select class="fx-param-select" data-name="${param.name}">
                        ${param.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        }
        
        return `
            <div class="fx-param-group">
                <label>${param.label} ${param.required ? '<span style="color:#f94144">*</span>' : ''}</label>
                <input type="${param.type}" 
                       data-name="${param.name}" 
                       data-required="${param.required}"
                       placeholder="${param.placeholder}"
                       ${param.required ? 'required' : ''}>
            </div>
        `;
    }).join('');
    
    // Show modal
    apiTesterModal.style.display = 'flex';
}

// Test API endpoint
async function testAPI() {
    if (!currentUser) {
        showToast('error', 'Error', 'Harap login terlebih dahulu');
        return;
    }
    
    const userApiKey = userApiKeys[0] ? userApiKeys[0].key : '';
    if (!userApiKey) {
        showToast('error', 'Error', 'Anda belum memiliki API key');
        return;
    }
    
    const urlInput = document.getElementById('apiUrl');
    let url = urlInput.value.split('?')[0]; // Remove existing params
    
    // Collect parameters
    const params = new URLSearchParams();
    params.append('api', userApiKey);
    
    const paramInputs = document.querySelectorAll('#testerParams input, #testerParams select');
    let hasErrors = false;
    
    paramInputs.forEach(input => {
        const name = input.dataset.name;
        const value = input.value.trim();
        const required = input.dataset.required === 'true';
        
        if (required && !value) {
            showToast('error', 'Error', `Parameter ${name} harus diisi`);
            input.style.borderColor = '#f94144';
            hasErrors = true;
            return;
        }
        
        if (value) {
            params.append(name, value);
            input.style.borderColor = '';
        }
    });
    
    if (hasErrors) return;
    
    // Build final URL
    const finalUrl = `${url}?${params.toString()}`;
    urlInput.value = finalUrl;
    
    // Show loading
    const responseOutput = document.getElementById('apiResponse');
    responseOutput.innerHTML = '<code>Loading...</code>';
    
    try {
        const response = await fetch(finalUrl);
        const data = await response.json();
        
        // Format JSON response
        const formattedJson = JSON.stringify(data, null, 2);
        responseOutput.innerHTML = `<code>${formattedJson}</code>`;
        
        // Apply Prism syntax highlighting
        Prism.highlightAllUnder(responseOutput);
        
        // Update API key usage if successful
        if (data.status && userApiKeys[0]) {
            userApiKeys[0].remaining--;
            userApiKeys[0].totalUsed = (userApiKeys[0].totalUsed || 0) + 1;
            userApiKeys[0].lastUsed = new Date().toISOString();
            
            // Update UI
            updateApiKeysList();
            updateDashboardStats();
            
            // Save to localStorage
            localStorage.setItem('fuku_api_keys', JSON.stringify(userApiKeys));
        }
        
        showToast('success', 'Success', 'API request berhasil');
    } catch (error) {
        responseOutput.innerHTML = `<code>{
  "error": "${error.message}",
  "status": "failed"
}</code>`;
        showToast('error', 'Error', 'Gagal melakukan request API');
    }
}

// Reset API tester
function resetTester() {
    document.querySelectorAll('#testerParams input').forEach(input => {
        input.value = '';
        input.style.borderColor = '';
    });
    
    document.getElementById('apiResponse').innerHTML = `<code>{
  "status": "ready",
  "message": "Masukkan parameter dan klik Test API"
}</code>`;
}

// Copy URL to clipboard
function copyToClipboard() {
    const url = document.getElementById('apiUrl').value;
    navigator.clipboard.writeText(url).then(() => {
        showToast('success', 'Copied', 'URL telah disalin ke clipboard');
    });
}

// Copy response to clipboard
function copyResponse() {
    const responseText = document.getElementById('apiResponse').textContent;
    navigator.clipboard.writeText(responseText).then(() => {
        showToast('success', 'Copied', 'Response telah disalin ke clipboard');
    });
}

// Show toast notification
function showToast(type, title, message) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `fx-toast fx-toast-${type}`;
    toast.innerHTML = `
        <div class="fx-toast-icon">
            <i class="${icons[type]}"></i>
        </div>
        <div class="fx-toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

// Utility functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Add CSS for slide out animation
const style = document.createElement('style');
style.textContent = `
@keyframes toastSlideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.fx-nav-links.show {
    display: flex !important;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.fx-user-dropdown.show {
    opacity: 1 !important;
    visibility: visible !important;
    transform: translateY(0) !important;
}
`;
document.head.appendChild(style);