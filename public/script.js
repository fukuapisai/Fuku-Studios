document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 FukuXyz Website Loaded - AI Enterprise Mode Activated');
  initNavbar();
  initTabs();
  initContactForm();
  initAnimations();
  initMobileMenu();
  updateFooterYear();
});

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

function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.querySelector('.fx-nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function(event) {
      event.stopPropagation();
      navLinks.classList.toggle('active');
      menuToggle.innerHTML = navLinks.classList.contains('active') ?
        '<i class="fas fa-times"></i>' :
        '<i class="fas fa-bars"></i>';
    });
    
    navLinks.addEventListener('click', function(event) {
      event.stopPropagation();
    });
    
    document.addEventListener('click', function() {
      navLinks.classList.remove('active');
      menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    });
  }
}

function initTabs() {
  const tabs = document.querySelectorAll('.fx-tab');
  const tabPanes = document.querySelectorAll('.fx-tab-pane');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');
  
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        company: document.getElementById('company').value,
        message: document.getElementById('message').value
      };
      
      if (!formData.name || !formData.email || !formData.message) {
        showFormMessage('Please fill in all required fields.', 'error');
        return;
      }
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      submitBtn.disabled = true;
      
      try {
        const response = await fetch('/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          showFormMessage(result.message, 'success');
          contactForm.reset();
          setTimeout(() => {
            formMessage.style.display = 'none';
          }, 5000);
        } else {
          showFormMessage('Something went wrong. Please try again.', 'error');
        }
      } catch (error) {
        console.error(error);
        showFormMessage('Network error. Please check your connection.', 'error');
        console.log(formData);
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }
  
  function showFormMessage(message, type) {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = 'fx-form-message ' + type;
    formMessage.style.display = 'block';
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function initAnimations() {
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
  
  const animatedElements = document.querySelectorAll('.fx-service-card, .fx-portfolio-card, .fx-testimonial-card');
  animatedElements.forEach(el => {
    el.classList.add('fx-animate-on-scroll');
    observer.observe(el);
  });
  
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
.fx-service-card:nth-child(2) { transition-delay: 0.1s; }
.fx-service-card:nth-child(3) { transition-delay: 0.2s; }
.fx-portfolio-card:nth-child(2) { transition-delay: 0.1s; }
.fx-portfolio-card:nth-child(3) { transition-delay: 0.2s; }
.fx-testimonial-card:nth-child(2) { transition-delay: 0.1s; }
.fx-testimonial-card:nth-child(3) { transition-delay: 0.2s; }
`;
  document.head.appendChild(style);
}

function updateFooterYear() {
  const currentYear = new Date().getFullYear();
  const footerText = document.querySelector('.fx-footer-bottom p:first-child');
  if (footerText) {
    footerText.innerHTML = footerText.innerHTML.replace('2023', currentYear);
  }
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      const navLinks = document.querySelector('.fx-nav-links');
      const menuToggle = document.getElementById('menuToggle');
      if (navLinks && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        if (menuToggle) {
          menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
      }
      window.scrollTo({
        top: targetElement.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  });
});

document.querySelectorAll('.fx-stat-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-5px)';
  });
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
  });
});