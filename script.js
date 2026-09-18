/* ==========================================
   Sahil Erkek Kuaförü — script.js
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ──────────────────────────────────────────
  // 1. Navbar: Scroll'da arka plan değişimi
  // ──────────────────────────────────────────
  const navbar = document.getElementById('navbar');

  function handleNavbarScroll() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavbarScroll, { passive: true });
  handleNavbarScroll(); // İlk yükleme için çalıştır


  // ──────────────────────────────────────────
  // 2. Hamburger Menü (Mobil)
  // ──────────────────────────────────────────
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks     = document.getElementById('navLinks');

  hamburgerBtn.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburgerBtn.classList.toggle('active', isOpen);
    hamburgerBtn.setAttribute('aria-expanded', isOpen);
  });

  // Nav link'e tıklayınca mobil menüyü kapat
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburgerBtn.classList.remove('active');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    });
  });


  // ──────────────────────────────────────────
  // 3. Smooth Scroll (tüm # linkler)
  // ──────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();

      const navHeight = navbar.offsetHeight;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });


  // ──────────────────────────────────────────
  // 4. Scroll-to-Top Butonu
  // ──────────────────────────────────────────
  const scrollTopBtn = document.getElementById('scrollTopBtn');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }, { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });


  // ──────────────────────────────────────────
  // 5. Scroll Reveal Animasyonu
  // ──────────────────────────────────────────
  const revealElements = document.querySelectorAll(
    '.service-card, .team-card, .testimonial-card, .contact-item, .section-header'
  );

  revealElements.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
  );

  revealElements.forEach(el => revealObserver.observe(el));


  // ──────────────────────────────────────────
  // 6. Randevu Formu — Validasyon & Gönderim
  // ──────────────────────────────────────────
  const appointmentForm = document.getElementById('appointmentForm');
  const formSuccess      = document.getElementById('formSuccess');

  // Minimum tarihi bugün olarak ayarla
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  // Form gönderimi Supabase entegrasyonu index.html'deki inline script tarafından yönetiliyor
  // (script.js'deki eski handler kaldırıldı)


  // ──────────────────────────────────────────
  // 7. Aktif Nav Link Vurgusu (Scroll Spy)
  // ──────────────────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-link');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navAnchors.forEach(a => {
            a.classList.toggle(
              'active-nav',
              a.getAttribute('href') === `#${id}`
            );
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach(section => sectionObserver.observe(section));

  // ──────────────────────────────────────────
  // 8. Copyright Yılı — Dinamik Güncelleme
  // ──────────────────────────────────────────
  const yearEl = document.getElementById('copyright-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }

});
