/* Shared script for hammock.ltd. Reads places.json (built automatically). */
(function () {
  'use strict';
  const PREVIEW = !!window.ALBUM_PREVIEW; // preview copy has no originals, only previews
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yearsText = y => y.join(', ');
  // The preview copy links with #slug because its host drops query strings.
  const placeUrl = slug => (PREVIEW ? `place.html#${slug}` : `place.html?p=${encodeURIComponent(slug)}`);
  const fullSrc = p => (PREVIEW ? p.thumb : p.src);
  let tripCount = {};
  const label = pl => (tripCount[pl.name] > 1 ? `${pl.name} ${pl.years.join(', ')}` : pl.name);

  async function loadData() {
    const res = await fetch('places.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`places.json returned ${res.status}`);
    return res.json();
  }

  /* ---------- Viewer: one photo at a time, with optional slideshow ---------- */
  const viewer = {
    el: null, list: [], i: 0, timer: null, seconds: 5,
    build() {
      if (this.el) return;
      const el = document.createElement('div');
      el.className = 'viewer';
      el.hidden = true;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'Photo viewer');
      el.innerHTML = `
        <div class="v-top">
          <span class="v-count" aria-live="polite"></span>
          <div class="v-group">
            <button class="v-btn v-play" type="button">Play slideshow</button>
            <button class="v-btn v-full" type="button">Full screen</button>
            <button class="v-btn v-close" type="button">Close</button>
          </div>
        </div>
        <div class="v-stage">
          <img alt="">
          <button class="v-nav prev" type="button" aria-label="Previous photo"><span aria-hidden="true">&lsaquo;</span></button>
          <button class="v-nav next" type="button" aria-label="Next photo"><span aria-hidden="true">&rsaquo;</span></button>
        </div>
        <div class="v-bot">
          <span class="v-cap"></span>
          <a class="v-btn v-orig" target="_blank" rel="noopener">Open original</a>
        </div>`;
      document.body.appendChild(el);
      this.el = el;
      $('.v-close', el).onclick = () => this.close();
      $('.prev', el).onclick = () => { this.stop(); this.go(-1); };
      $('.next', el).onclick = () => { this.stop(); this.go(1); };
      $('.v-play', el).onclick = () => (this.timer ? this.stop() : this.play());
      $('.v-full', el).onclick = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      };
      if (!el.requestFullscreen) $('.v-full', el).hidden = true;
      if (PREVIEW) $('.v-orig', el).hidden = true;
      document.addEventListener('keydown', e => {
        if (el.hidden) return;
        if (e.key === 'Escape') this.close();
        else if (e.key === 'ArrowRight') { this.stop(); this.go(1); }
        else if (e.key === 'ArrowLeft') { this.stop(); this.go(-1); }
        else if (e.key === ' ') { e.preventDefault(); this.timer ? this.stop() : this.play(); }
      });
      let x0 = null;
      const stage = $('.v-stage', el);
      stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) { this.stop(); this.go(dx < 0 ? 1 : -1); }
        x0 = null;
      });
    },
    open(list, i = 0, slideshow = false) {
      this.build();
      this.list = list; this.i = i;
      this.lastFocus = document.activeElement;
      this.el.hidden = false;
      document.body.style.overflow = 'hidden';
      this.show();
      $('.v-close', this.el).focus();
      if (slideshow) this.play();
    },
    close() {
      this.stop();
      if (document.fullscreenElement) document.exitFullscreen();
      this.el.hidden = true;
      document.body.style.overflow = '';
      if (this.lastFocus) this.lastFocus.focus();
    },
    go(d) { this.i = (this.i + d + this.list.length) % this.list.length; this.show(); },
    show() {
      const item = this.list[this.i];
      const img = $('.v-stage img', this.el);
      img.src = item.full;
      img.alt = item.alt;
      $('.v-count', this.el).textContent = `${this.i + 1} of ${this.list.length}`;
      $('.v-cap', this.el).innerHTML = item.caption;
      $('.v-orig', this.el).href = item.full;
      const next = this.list[(this.i + 1) % this.list.length];
      if (next) new Image().src = next.full; // load the next one early
    },
    play() {
      this.stop();
      $('.v-play', this.el).textContent = 'Pause';
      this.timer = setInterval(() => this.go(1), this.seconds * 1000);
    },
    stop() {
      clearInterval(this.timer); this.timer = null;
      if (this.el) $('.v-play', this.el).textContent = 'Play slideshow';
    },
  };

  const itemFor = (place, p, n) => ({
    full: fullSrc(p),
    alt: `${place.name}, photo ${n} of ${place.photos.length}`,
    caption: `<a href="${placeUrl(place.slug)}">${esc(place.name)}</a>, ${esc(yearsText(place.years))}. Photo ${n} of ${place.photos.length}.`,
  });

  function everything(data) {
    const all = [];
    data.places.forEach(pl => pl.photos.forEach((p, k) => all.push({ place: pl, photo: p, n: k + 1 })));
    return all;
  }
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* ---------- Homepage ---------- */
  function renderHome(data) {
    const all = everything(data);
    const total = all.length;
    const allYears = data.places.flatMap(p => p.years);
    $('#count').textContent = `${total.toLocaleString()} photos from ${new Set(data.places.map(p => p.name)).size} places, ${Math.min(...allYears)} to ${Math.max(...allYears)}`;

    // Hero: one random photo
    let current;
    const heroImg = $('#heroImg');
    const favs = all.filter(a => a.photo.fav);
    const pool = favs.length ? favs : all; // favorites (if any are listed) for the top photo
    const pick = () => {
      current = pool[Math.floor(Math.random() * pool.length)];
      heroImg.src = PREVIEW ? current.photo.thumb : current.photo.src;
      heroImg.alt = `${current.place.name}, photo ${current.n}`;
      $('#heroCap').innerHTML = itemFor(current.place, current.photo, current.n).caption;
    };
    pick();

    // "Surprise me": flick through a few photos like shuffling a deck, then land on one.
    const btn = $('#another');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    btn.onclick = () => {
      if (still) return pick();
      btn.disabled = true;
      heroImg.classList.add('shuffling');
      let flips = 0;
      const t = setInterval(() => {
        heroImg.src = all[Math.floor(Math.random() * all.length)].photo.thumb;
        if (++flips >= 8) {
          clearInterval(t);
          heroImg.classList.remove('shuffling');
          pick();
          btn.disabled = false;
        }
      }, 85);
    };
    heroImg.onclick = () => {
      const pl = current.place;
      viewer.open(pl.photos.map((p, k) => itemFor(pl, p, k + 1)), current.n - 1);
    };
    const slideshowAll = () => viewer.open(shuffle(all).map(a => itemFor(a.place, a.photo, a.n)), 0, true);
    document.querySelectorAll('[data-slideshow]').forEach(b => (b.onclick = slideshowAll));

    // Year spine (newest first). A place visited in several years appears in each.
    const byYear = new Map();
    data.places.forEach(pl => pl.years.forEach(y => {
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(pl);
    }));
    const years = [...byYear.keys()].sort((a, b) => b - a);
    $('#years').innerHTML = years.map(y => `
      <section class="year" aria-labelledby="y${y}">
        <h2 id="y${y}">${y}</h2>
        <div class="year-places">
          ${byYear.get(y).map(pl => `
            <a class="place" href="${placeUrl(pl.slug)}" style="--tilt:${tilt(pl.slug + y)}deg">
              <div class="ph"><img src="${coverFor(pl, y)}" alt="" loading="lazy" decoding="async"></div>
              <h3>${esc(pl.name)}</h3>
              <p>${pl.photos.length} photos${pl.years.length > 1 ? `, also ${esc(pl.years.filter(o => o !== y).join(', '))}` : ''}</p>
            </a>`).join('')}
        </div>
      </section>`).join('');

    startGame(data, all);

    // A–Z
    const byName = new Map();
    data.places.forEach(pl => { if (!byName.has(pl.name)) byName.set(pl.name, []); byName.get(pl.name).push(pl); });
    $('#az').innerHTML = [...byName.keys()].sort((a, b) => a.localeCompare(b)).map(name => {
      const trips = byName.get(name).slice().sort((a, b) => a.years[0] - b.years[0]);
      if (trips.length === 1) return `<li><a href="${placeUrl(trips[0].slug)}">${esc(name)}</a><span>${esc(yearsText(trips[0].years))}</span></li>`;
      return `<li><span class="az-name">${esc(name)}</span><span class="az-trips">${trips.map(t => `<a href="${placeUrl(t.slug)}">${esc(yearsText(t.years))}</a>`).join(' ')}</span></li>`;
    }).join('');
  }

  // A place visited in several years gets a different photo in each year's row.
  function coverFor(pl, y) {
    const k = pl.years.indexOf(y);
    if (k <= 0 || !pl.photos.length) return pl.cover;
    return pl.photos[Math.floor((pl.photos.length * k) / pl.years.length)].thumb;
  }

  // Small, steady tilt per snapshot so the layout looks hand-placed but never jumps between visits.
  function tilt(s) {
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return ((h % 50) / 10 - 2.5).toFixed(1);
  }

  /* ---------- "Where was this?" guessing game ---------- */
  function startGame(data, all) {
    const box = $('#game');
    if (!box || data.places.length < 4) { if (box) box.hidden = true; return; }
    const img = $('#gImg'), choices = $('#gChoices'), result = $('#gResult'), score = $('#gScore'), next = $('#gNext');
    let right = 0, tries = 0, last = null;
    const yes = ['Nailed it!', 'Yes! Good eye.', 'Correct!', "That's the one."];

    function round() {
      let a;
      do { a = all[Math.floor(Math.random() * all.length)]; } while (all.length > 1 && a === last);
      last = a;
      img.src = a.photo.thumb;
      img.alt = 'Mystery photo';
      const others = [...new Set(data.places.map(p => p.name))].filter(n => n !== a.place.name);
      const options = shuffle([a.place.name, ...shuffle(others).slice(0, 3)]);
      choices.innerHTML = options.map((p, k) => `<button type="button" class="choice" data-k="${k}">${esc(p)}</button>`).join('');
      result.innerHTML = '';
      next.hidden = true;
      choices.querySelectorAll('.choice').forEach(b => (b.onclick = () => {
        const picked = options[+b.dataset.k];
        tries++;
        choices.querySelectorAll('.choice').forEach((c, k) => {
          c.disabled = true;
          if (options[k] === a.place.name) c.classList.add('right');
        });
        if (picked === a.place.name) {
          right++;
          result.innerHTML = `${yes[Math.floor(Math.random() * yes.length)]} ${esc(a.place.name)}, ${esc(yearsText(a.place.years))}.`;
        } else {
          b.classList.add('wrong');
          result.innerHTML = `Nope, that was ${esc(a.place.name)}, ${esc(yearsText(a.place.years))}. <a href="${placeUrl(a.place.slug)}">See those photos</a>`;
        }
        score.textContent = `Score: ${right} of ${tries}`;
        next.hidden = false;
        next.focus();
      }));
    }
    next.onclick = round;
    round();
  }

  /* ---------- Place page ---------- */
  function renderPlace(data) {
    const slug = new URLSearchParams(location.search).get('p') || location.hash.slice(1);
    const idx = data.places.findIndex(p => p.slug === slug);
    const main = $('#place');
    if (idx < 0) {
      main.innerHTML = `<p class="empty">That page doesn't exist. <a href="index.html">See all places</a>.</p>`;
      return;
    }
    const pl = data.places[idx];
    document.title = `${label(pl)} | Hammock photos`;
    const items = pl.photos.map((p, k) => itemFor(pl, p, k + 1));
    const prev = data.places[(idx - 1 + data.places.length) % data.places.length];
    const next = data.places[(idx + 1) % data.places.length];
    const vids = pl.videos.length ? `
      <section class="videos">
        <h2 class="section-h">Videos</h2>
        <div class="vgrid">${pl.videos.map(v => `<video controls preload="metadata" src="${v.src}"></video>`).join('')}</div>
        ${pl.videos.some(v => v.type === 'video/quicktime') ? '<p>Some videos are in Apple\'s .MOV format and may only play on iPhone, iPad, Mac or in Safari.</p>' : ''}
      </section>` : '';

    main.innerHTML = `
      <header class="place-head">
        <div class="yrs${pl.years.length > 2 ? ' many' : ''}">${esc(pl.years.join(' '))}</div>
        <div>
          <h1>${esc(pl.name)}</h1>
          <p class="meta">${pl.region ? esc(pl.region) + '. ' : ''}${pl.photos.length} photos${pl.videos.length ? `, ${pl.videos.length} video${pl.videos.length > 1 ? 's' : ''}` : ''}</p>
        </div>
      </header>
      ${pl.note ? `<p class="note">${esc(pl.note)}</p>` : ''}
      <div class="tools">
        <button class="btn" type="button" id="play">Play slideshow</button>
        <a class="btn quiet" href="index.html">All places</a>
      </div>
      <div class="grid">
        ${pl.photos.map((p, k) => `<button type="button" data-i="${k}" aria-label="Open photo ${k + 1}"><img src="${p.thumb}" width="${p.w}" height="${p.h}" alt="" loading="lazy" decoding="async"></button>`).join('')}
      </div>
      ${vids}
      <nav class="neighbors" aria-label="Other places">
        <a href="${placeUrl(prev.slug)}"><small>Previous</small><strong>${esc(label(prev))}</strong></a>
        <a href="${placeUrl(next.slug)}" style="text-align:right"><small>Next</small><strong>${esc(label(next))}</strong></a>
      </nav>`;
    $('#play').onclick = () => viewer.open(items, 0, true);
    main.querySelectorAll('.grid button').forEach(b => (b.onclick = () => viewer.open(items, +b.dataset.i)));
  }

  window.Album = {
    start(page) {
      loadData()
        .then(data => {
          tripCount = {};
          data.places.forEach(p => (tripCount[p.name] = (tripCount[p.name] || 0) + 1));
          if (page === 'home') return renderHome(data);
          renderPlace(data);
          window.addEventListener('hashchange', () => { renderPlace(data); scrollTo(0, 0); });
        })
        .catch(err => {
          const box = $('#place') || $('#years');
          if (box) box.innerHTML = `<p class="empty">The photo list didn't load (${esc(err.message)}). Refresh the page to try again.</p>`;
          console.error(err);
        });
    },
  };
})();
