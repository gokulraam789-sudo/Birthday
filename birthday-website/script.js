(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'birthday-visitor';

  const login = $('#login');
  const home = $('#home');
  const form = $('#loginForm');
  const nameInput = $('#name');
  const pwInput = $('#password');
  const errorEl = $('#error');

  /* ---------- Helpers ---------- */
  // Ignore spaces, dots, slashes and dashes so 25-10-2005 and 25102005 also work
  const normalise = (s) => String(s).toLowerCase().replace(/[\s./\-]/g, '');
  const titleCase = (s) =>
    s.trim().replace(/\s+/g, ' ').replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toLocaleUpperCase());
  const fill = (text, name) => String(text).replace(/\{name\}/g, name);
  const rand = (min, max) => min + Math.random() * (max - min);

  /* ---------- Floating hearts (background) ---------- */
  function makeHearts() {
    const box = $('#hearts');
    const count = window.innerWidth < 600 ? 14 : 24;
    const colours = ['#f7a8bf', '#f48fb1', '#e2678b', '#ffc9d9', '#f3c978'];
    for (let i = 0; i < count; i++) {
      const h = document.createElement('span');
      h.textContent = '♥';
      h.style.left = rand(0, 100) + '%';
      h.style.fontSize = rand(12, 30) + 'px';
      h.style.color = colours[Math.floor(Math.random() * colours.length)];
      h.style.animationDuration = rand(10, 20) + 's';
      h.style.animationDelay = '-' + rand(0, 20) + 's';
      h.style.setProperty('--x', rand(-40, 40) + 'px');
      h.style.setProperty('--o', rand(0.35, 0.7).toFixed(2));
      box.appendChild(h);
    }
  }

  /* ---------- Confetti ---------- */
  const cv = $('#confetti');
  const ctx = cv.getContext('2d');
  const palette = ['#f48fb1', '#f7a8bf', '#e2678b', '#ffd6e3', '#f3c978', '#ffffff', '#ffb3c7', '#ffe0a3'];
  let W = 0, H = 0, parts = [], running = false;

  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * d; cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  function burst(x, y, n) {
    n = reduceMotion ? Math.round(n / 4) : n;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(4, 13);
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6,
        w: rand(6, 13), h: rand(4, 9), r: rand(0, 6.28), vr: rand(-0.4, 0.4),
        c: palette[Math.floor(Math.random() * palette.length)],
        heart: Math.random() < 0.2, life: 0
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      if (p.y > H + 30 || p.life > 230) { parts.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1 - p.life / 230);
      ctx.fillStyle = p.c;
      if (p.heart) {
        ctx.font = Math.round(p.w * 1.8) + 'px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('♥', 0, 0);
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  /* ---------- Fill the page from config.js ---------- */
  function buildHome(name) {
    $('#title').textContent = 'Happy Birthday, ' + name + '! 🎂';
    $('#wish').textContent = fill(CONFIG.wish, name);
    $('#from').textContent = CONFIG.from;

    const letter = $('#letter');
    letter.innerHTML = '';
    const add = (cls, text) => {
      const p = document.createElement('p');
      if (cls) p.className = cls;
      p.textContent = text;
      letter.appendChild(p);
      return p;
    };
    add('greet', fill(CONFIG.letterGreeting, name));
    CONFIG.letter.forEach((t) => add('', fill(t, name)));
    const sign = add('sign', CONFIG.letterClosing);
    sign.appendChild(document.createElement('br'));
    const from = document.createElement('span');
    from.className = 'from';
    from.textContent = CONFIG.from;
    sign.appendChild(from);

    $('#surpriseTitle').textContent = fill(CONFIG.surpriseTitle, name);
    $('#surpriseText').textContent = fill(CONFIG.surpriseText, name);
    const photo = $('#surprisePhoto');
    if (CONFIG.surprisePhoto) { photo.src = CONFIG.surprisePhoto; photo.hidden = false; }
  }

  function showHome(name, celebrate) {
    buildHome(name);
    const reveal = () => {
      login.hidden = true;
      home.hidden = false;
      home.classList.add('entering');
      window.scrollTo(0, 0);
      if (celebrate) {
        burst(W / 2, H * 0.3, 110);
        setTimeout(() => { burst(W * 0.2, H * 0.4, 50); burst(W * 0.8, H * 0.4, 50); }, 250);
      }
    };
    if (celebrate && !reduceMotion) {
      login.classList.add('leaving');
      setTimeout(reveal, 450);
    } else {
      reveal();
    }
  }

  /* ---------- Login ---------- */
  function fail(msg, field) {
    errorEl.textContent = msg;
    form.classList.remove('shake');
    void form.offsetWidth; // restart animation
    form.classList.add('shake');
    field.focus();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = titleCase(nameInput.value);
    const pw = pwInput.value;

    if (!name) return fail('Please tell me who you are.', nameInput);
    if (!pw.trim()) return fail('Please enter the password.', pwInput);
    if (normalise(pw) !== normalise(CONFIG.password)) {
      return fail('That password is not right. Try your birthday as DD/MM/YYYY.', pwInput);
    }

    errorEl.textContent = '';
    try { sessionStorage.setItem(KEY, name); } catch (err) { /* storage may be blocked */ }
    showHome(name, true);
  });

  [nameInput, pwInput].forEach((el) => el.addEventListener('input', () => { errorEl.textContent = ''; }));

  $('#togglePw').addEventListener('click', function () {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    this.textContent = show ? 'Hide' : 'Show';
    this.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  /* ---------- Home interactions ---------- */
  $('#cakeBtn').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height * 0.3, 70);
  });

  const letterBtn = $('#letterBtn');
  const letterBox = $('#letterBox');
  letterBtn.addEventListener('click', () => {
    const open = letterBox.classList.toggle('open');
    letterBtn.setAttribute('aria-expanded', String(open));
    letterBtn.textContent = open ? 'Close the letter' : 'Open my letter 💌';
    if (open) setTimeout(() => letterBox.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
  });

  const gift = $('#gift');
  let opening = false;
  gift.addEventListener('click', () => {
    const r = gift.getBoundingClientRect();
    if (gift.classList.contains('open')) { burst(r.left + r.width / 2, r.top + 40, 80); return; }
    if (opening) return;
    opening = true;
    gift.classList.add('wiggle');
    setTimeout(() => {
      gift.classList.remove('wiggle');
      gift.classList.add('open');
      gift.setAttribute('aria-label', 'Gift opened. Tap for more confetti');
      $('#giftHint').hidden = true;
      const b = gift.getBoundingClientRect();
      burst(b.left + b.width / 2, b.top + 40, 130);
      setTimeout(() => burst(b.left + b.width / 2, b.top + 40, 70), 300);
      $('#surprise').classList.add('open');
      setTimeout(() => $('#surprise').scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
    }, reduceMotion ? 0 : 600);
  });

  /* ---------- Start ---------- */
  resize();
  window.addEventListener('resize', resize);
  makeHearts();

  let saved = null;
  try { saved = sessionStorage.getItem(KEY); } catch (err) { /* ignore */ }
  if (saved) showHome(saved, false);
  else { login.hidden = false; nameInput.focus(); }
})();
