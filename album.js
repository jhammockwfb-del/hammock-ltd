/* Shared script for hammock.ltd. Reads places.json (built automatically). */
(function () {
  'use strict';
  const PREVIEW = !!window.ALBUM_PREVIEW; // preview copy has no originals, only previews
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yearsText = y => y.join(', ');
  const placeUrl = slug => `place.html?p=${encodeURIComponent(slug)}`;
  const fullSrc = p => (PREVIEW ? p.thumb : p.src);

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
    $('#count').textContent = `${total.toLocaleString()} photos from ${data.places.length} places`;

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
    $('#another').onclick = pick;
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
            <a class="place" href="${placeUrl(pl.slug)}">
              <div class="ph"><img src="${pl.cover}" alt="" loading="lazy" decoding="async"></div>
              <h3>${esc(pl.name)}</h3>
              <p>${pl.photos.length} photos${pl.years.length > 1 ? `, also ${esc(pl.years.filter(o => o !== y).join(', '))}` : ''}</p>
            </a>`).join('')}
        </div>
      </section>`).join('');

    // A–Z
    $('#az').innerHTML = data.places.slice().sort((a, b) => a.name.localeCompare(b.name)).map(pl =>
      `<li><a href="${placeUrl(pl.slug)}">${esc(pl.name)}</a><span>${esc(yearsText(pl.years))}</span></li>`).join('');
  }

  /* ---------- Place page ---------- */
  function renderPlace(data) {
    const slug = new URLSearchParams(location.search).get('p');
    const idx = data.places.findIndex(p => p.slug === slug);
    const main = $('#place');
    if (idx < 0) {
      main.innerHTML = `<p class="empty">That page doesn't exist. <a href="index.html">See all places</a>.</p>`;
      return;
    }
    const pl = data.places[idx];
    document.title = `${pl.name} | Hammock photos`;
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
        <a href="${placeUrl(prev.slug)}"><small>Previous</small><strong>${esc(prev.name)}</strong></a>
        <a href="${placeUrl(next.slug)}" style="text-align:right"><small>Next</small><strong>${esc(next.name)}</strong></a>
      </nav>`;
    $('#play').onclick = () => viewer.open(items, 0, true);
    main.querySelectorAll('.grid button').forEach(b => (b.onclick = () => viewer.open(items, +b.dataset.i)));
  }

  window.Album = {
    start(page) {
      loadData()
        .then(data => (page === 'home' ? renderHome(data) : renderPlace(data)))
        .catch(err => {
          const box = $('#place') || $('#years');
          if (box) box.innerHTML = `<p class="empty">The photo list didn't load (${esc(err.message)}). Refresh the page to try again.</p>`;
          console.error(err);
        });
    },
  };
})();
