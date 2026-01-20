// FukuXyz Website - Modern AI Enterprise JavaScript
// Author: FukuXyz Team
// Version: 1.0.0

// Nunggu DOM siap dulu bro
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 FukuXyz Website Loaded - AI Enterprise Mode Activated');
  
  // Inisialisasi semua komponen
  initNavbar();
  initTabs();
  initContactForm();
  initAnimations();
  initMobileMenu();
  
  // Auto-update tahun di footer (biar ga ketinggalan zaman)
  updateFooterYear();
});

// Navbar efek scroll (biar keren dikit)
function initNavbar() {
  const navbar = document.querySelector('.fx-navbar');
  
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// Mobile menu toggle (buat HP biar ga berantakan)
function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.querySelector('.fx-nav-links');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
      menuToggle.innerHTML = navLinks.classList.contains('active') ?
        '<i class="fas fa-times"></i>' :
        '<i class="fas fa-bars"></i>';
    });
    
    // Tutup menu kalo diklik di luar
    document.addEventListener('click', function(event) {
      if (!menuToggle.contains(event.target) && !navLinks.contains(event.target)) {
        navLinks.classList.remove('active');
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
      }
    });
  }
}

// Tab system untuk solutions (biar ga overload info)
function initTabs() {
  const tabs = document.querySelectorAll('.fx-tab');
  const tabPanes = document.querySelectorAll('.fx-tab-pane');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Remove active class dari semua tabs
      tabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      // Add active class ke tab yang diklik
      this.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Contact form handler (simpan ke console aja, nanti integrasi backend)
function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');
  
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Ambil data dari form
      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        company: document.getElementById('company').value,
        message: document.getElementById('message').value
      };
      
      // Validasi sederhana
      if (!formData.name || !formData.email || !formData.message) {
        showFormMessage('Please fill in all required fields.', 'error');
        return;
      }
      
      // Loading state
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      submitBtn.disabled = true;
      
      try {
        // Kirim data ke backend API
        const response = await fetch('/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          // Sukses bro!
          showFormMessage(result.message, 'success');
          contactForm.reset();
          
          // Auto-hide message setelah 5 detik
          setTimeout(() => {
            formMessage.style.display = 'none';
          }, 5000);
        } else {
          // Ada error dari server
          showFormMessage('Something went wrong. Please try again.', 'error');
        }
      } catch (error) {
        // Error network atau lainnya
        console.error('Error submitting form:', error);
        showFormMessage('Network error. Please check your connection.', 'error');
        
        // Fallback: log ke console aja kalo API ga jalan
        console.log('=== CONTACT FORM DATA (Fallback) ===');
        console.log(formData);
      } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }
  
  // Helper buat nampilin message
  function showFormMessage(message, type) {
    if (!formMessage) return;
    
    formMessage.textContent = message;
    formMessage.className = 'fx-form-message ' + type;
    formMessage.style.display = 'block';
    
    // Scroll ke message biar keliatan
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Animasi simple buat elements (ga pake GSAP biar ringan)
function initAnimations() {
  // Intersection Observer buat animasi fade-in
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fx-animated');
      }
    });
  }, observerOptions);
  
  // Observe elements yang mau dianimasikan
  const animatedElements = document.querySelectorAll('.fx-service-card, .fx-portfolio-card, .fx-testimonial-card');
  animatedElements.forEach(el => {
    el.classList.add('fx-animate-on-scroll');
    observer.observe(el);
  });
  
  // Tambahin CSS class buat animation
  const style = document.createElement('style');
  style.textContent = `
        .fx-animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .fx-animate-on-scroll.fx-animated {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* Delay buat staggered animation */
        .fx-service-card:nth-child(2) { transition-delay: 0.1s; }
        .fx-service-card:nth-child(3) { transition-delay: 0.2s; }
        .fx-portfolio-card:nth-child(2) { transition-delay: 0.1s; }
        .fx-portfolio-card:nth-child(3) { transition-delay: 0.2s; }
        .fx-testimonial-card:nth-child(2) { transition-delay: 0.1s; }
        .fx-testimonial-card:nth-child(3) { transition-delay: 0.2s; }
    `;
  document.head.appendChild(style);
}

// Update tahun di footer otomatis (biar ga ketinggalan zaman)
function updateFooterYear() {
  const currentYear = new Date().getFullYear();
  const footerText = document.querySelector('.fx-footer-bottom p:first-child');
  
  if (footerText) {
    footerText.innerHTML = footerText.innerHTML.replace('2023', currentYear);
  }
}

// Smooth scroll buat anchor links (biar mulus gitu)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      // Close mobile menu kalo lagi open
      const navLinks = document.querySelector('.fx-nav-links');
      const menuToggle = document.getElementById('menuToggle');
      
      if (navLinks && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        if (menuToggle) {
          menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
      }
      
      // Scroll ke element target
      window.scrollTo({
        top: targetElement.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  });
});

// Tambahin efek hover buat stats cards
document.querySelectorAll('.fx-stat-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-5px)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
  });
});