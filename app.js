// app.js — ชั้น side-effect: fetch ข้อมูล, render DOM, Leaflet, localStorage
// เรียกใช้ pure functions จาก logic.js แล้วเอาผลไป render
import {
  getStartingPriceJpy,
  getPriceLevel,
  convertJpyToThb,
  filterEntries,
  sortByPrice,
  wikiThumbUrl,
} from './logic.js';

// เรต JPY→THB ดึงสดจาก API ที่ไม่ต้องใช้ key; ถ้าล้มเหลวใช้เรตสำรองด้านล่าง
const RATE_API_URL = 'https://open.er-api.com/v6/latest/JPY';
const FALLBACK_RATE = 0.22; // เรตโดยประมาณ ใช้เมื่อดึงเรตสดไม่สำเร็จ

// หมวดทั้ง 8: ป้ายไทย + ไอคอน (สีกำหนดใน CSS ผ่าน [data-category])
const CATEGORY_META = {
  sightseeing: { label: 'ท่องเที่ยว', icon: '⛩️' },
  food: { label: 'ของกิน', icon: '🍜' },
  games: { label: 'เกม', icon: '🎮' },
  cosplay: { label: 'คอสเพลย์', icon: '🎭' },
  electronics: { label: 'เครื่องใช้ไฟฟ้า', icon: '🔌' },
  'anime-goods': { label: 'ของอนิเมะ', icon: '🧸' },
  cafe: { label: 'คาเฟ่', icon: '☕' },
  shopping: { label: 'ช้อปปิ้ง', icon: '🛍️' },
};
const CATEGORY_ORDER = Object.keys(CATEGORY_META);

const CITY_LABELS = {
  tokyo: 'โตเกียว',
  osaka: 'โอซาก้า',
  kyoto: 'เกียวโต',
};

const jpyFormatter = new Intl.NumberFormat('ja-JP');
const thbFormatter = new Intl.NumberFormat('th-TH');

const CONDITION_LABELS = {
  new: { text: 'มือ 1', cls: 'cond--new' },
  used: { text: 'มือ 2', cls: 'cond--used' },
};

function categoryLabel(cat) {
  return CATEGORY_META[cat]?.label ?? cat;
}
function categoryIcon(cat) {
  return CATEGORY_META[cat]?.icon ?? '📍';
}
function cityLabel(city) {
  return CITY_LABELS[city] ?? city;
}

// ---- บุ๊กมาร์ก (เก็บใน localStorage) ----
const BOOKMARKS_KEY = 'travel-japan:bookmarks';
let bookmarkedIds = new Set();

/** อ่าน id ที่บุ๊กมาร์กจาก localStorage; ถ้าพัง/ไม่มีให้คืน Set ว่าง (เว็บต้องไม่พัง) */
function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
  } catch (err) {
    console.warn('อ่านบุ๊กมาร์กจาก localStorage ไม่สำเร็จ:', err);
    return new Set();
  }
}

/** บันทึก id ที่บุ๊กมาร์กลง localStorage (ล้มเหลวเงียบ ๆ ไม่ให้ทำหน้าเว็บพัง) */
function saveBookmarks() {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bookmarkedIds]));
  } catch (err) {
    console.warn('บันทึกบุ๊กมาร์กลง localStorage ไม่สำเร็จ:', err);
  }
}

/** ปุ่มถูกใจ/บุ๊กมาร์ก ใช้ทั้งบนการ์ด (variant 'card') และในโมดัล (variant 'modal') */
function bookmarkButtonHtml(id, variant) {
  const on = bookmarkedIds.has(id);
  return `
    <button
      type="button"
      class="bookmark-btn bookmark-btn--${variant}${on ? ' is-active' : ''}"
      data-bookmark-toggle="${escapeHtml(String(id))}"
      aria-pressed="${on}"
      aria-label="${on ? 'เอาออกจากบุ๊กมาร์ก' : 'เพิ่มลงบุ๊กมาร์ก'}"
    >
      <span class="bookmark-btn__icon" aria-hidden="true">${on ? '♥' : '♡'}</span>
      ${variant === 'modal' ? `<span class="bookmark-btn__label">${on ? 'บันทึกแล้ว' : 'บุ๊กมาร์ก'}</span>` : ''}
    </button>`;
}

/** อัปเดตปุ่มบุ๊กมาร์กทุกตัวของ id เดียวกัน (การ์ด + โมดัล) ให้สถานะตรงกัน */
function syncBookmarkButtons(id) {
  const on = bookmarkedIds.has(id);
  for (const btn of document.querySelectorAll('[data-bookmark-toggle]')) {
    if (btn.dataset.bookmarkToggle !== id) continue;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'เอาออกจากบุ๊กมาร์ก' : 'เพิ่มลงบุ๊กมาร์ก');
    const icon = btn.querySelector('.bookmark-btn__icon');
    if (icon) icon.textContent = on ? '♥' : '♡';
    const label = btn.querySelector('.bookmark-btn__label');
    if (label) label.textContent = on ? 'บันทึกแล้ว' : 'บุ๊กมาร์ก';
  }
}

/** เครดิต/ลิขสิทธิ์ของรูป รวมเป็นบรรทัดเดียว */
function imageCreditText(image) {
  return [image?.credit, image?.license].filter(Boolean).join(' · ');
}

/** ป้าย "ภาพประกอบ" มุมรูป เมื่อรูปนั้นเป็นภาพประกอบบริบท (ไม่ใช่ภาพร้านจริง) */
function illustrativeBadgeHtml(image) {
  if (!image?.isIllustrative) return '';
  return '<span class="img-badge" title="ภาพประกอบบริบท ไม่ใช่ภาพจริงของสถานที่">ภาพประกอบ</span>';
}

/** escape ข้อความก่อนยัดลง innerHTML กันมาร์กอัป/quote ในข้อมูลทำ DOM พัง */
function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatJpy(price) {
  if (price === null) return 'สอบถามหน้าร้าน';
  if (price === 0) return 'ฟรี';
  return `¥${jpyFormatter.format(price)}`;
}

function formatThb(priceJpy, rate) {
  if (priceJpy === null || priceJpy === 0) return null; // ฟรี/ไม่มีราคา: ไม่แสดงบาท
  const baht = convertJpyToThb(priceJpy, rate);
  if (baht === null) return null;
  return `฿${thbFormatter.format(baht)}`;
}

/** ป้ายระดับราคา ¥/¥¥/¥¥¥ (เน้นจำนวน ¥ ตามระดับ) */
function priceLevelHtml(level) {
  if (!level) return '';
  const dots = [1, 2, 3]
    .map((n) => `<span class="${n <= level ? 'on' : 'off'}">¥</span>`)
    .join('');
  return `<span class="card__pricelevel" title="ระดับราคา ${level}/3">${dots}</span>`;
}

function tagsHtml(tags, limit = 3) {
  if (!Array.isArray(tags) || tags.length === 0) return '';
  const items = tags
    .slice(0, limit)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join('');
  return `<div class="card__tags">${items}</div>`;
}

// ============================================================
//  การ์ดในกริด
// ============================================================
function createCard(entry, rate) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = entry.id;
  card.dataset.category = entry.category;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `ดูรายละเอียด ${entry.nameTh}`);

  const startingPrice = getStartingPriceJpy(entry);
  const level = getPriceLevel(startingPrice);
  const thb = formatThb(startingPrice, rate);
  const hasImage = Array.isArray(entry.images) && entry.images.length > 0;
  const subtitle = [entry.nameJa, entry.nameRomaji].filter(Boolean).join(' · ');

  const media = hasImage
    ? `<img src="${escapeHtml(wikiThumbUrl(entry.images[0].url, 500))}" alt="${escapeHtml(entry.nameTh)}" loading="lazy" decoding="async" />${illustrativeBadgeHtml(entry.images[0])}`
    : '<span class="card__placeholder" aria-hidden="true">🗾</span>';

  card.innerHTML = `
    <div class="card__media">
      ${media}
      <span class="card__cat"><span aria-hidden="true">${categoryIcon(entry.category)}</span>${escapeHtml(categoryLabel(entry.category))}</span>
      ${priceLevelHtml(level)}
      ${bookmarkButtonHtml(entry.id, 'card')}
    </div>
    <div class="card__body">
      <span class="card__city">📍 ${escapeHtml(cityLabel(entry.city))}</span>
      <h3 class="card__name-th">${escapeHtml(entry.nameTh)}</h3>
      ${subtitle ? `<p class="card__name-ja">${escapeHtml(subtitle)}</p>` : ''}
      ${tagsHtml(entry.tags)}
      <div class="card__foot">
        <span class="card__price-wrap">
          <span class="card__price-label">เริ่มต้น</span>
          <span class="card__price">
            <span class="card__price-jpy">${formatJpy(startingPrice)}</span>
            ${thb ? `<span class="card__price-thb">${thb}</span>` : ''}
          </span>
        </span>
      </div>
    </div>
  `;
  return card;
}

function renderGrid(entries, gridEl, rate) {
  gridEl.replaceChildren(...entries.map((entry) => createCard(entry, rate)));
}

// ============================================================
//  Featured strip (Editor's Pick)
// ============================================================
function createFeatCard(entry, rate) {
  const card = document.createElement('article');
  card.className = 'feat-card';
  card.dataset.id = entry.id;
  card.dataset.category = entry.category;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `ดูรายละเอียด ${entry.nameTh}`);

  const startingPrice = getStartingPriceJpy(entry);
  const thb = formatThb(startingPrice, rate);
  const hasImage = Array.isArray(entry.images) && entry.images.length > 0;
  const reason = entry.editorsPickReason || entry.description || '';

  card.innerHTML = `
    ${hasImage ? `<img class="feat-card__img" src="${escapeHtml(wikiThumbUrl(entry.images[0].url, 500))}" alt="${escapeHtml(entry.nameTh)}" loading="lazy" decoding="async" />` : ''}
    <div class="feat-card__shade"></div>
    <span class="feat-card__ribbon"><span aria-hidden="true">⭐</span> ห้ามพลาด</span>
    <div class="feat-card__body">
      <h3 class="feat-card__name">${escapeHtml(entry.nameTh)}</h3>
      ${reason ? `<p class="feat-card__reason">${escapeHtml(reason)}</p>` : ''}
      <div class="feat-card__meta">
        <span>${categoryIcon(entry.category)} ${escapeHtml(categoryLabel(entry.category))}</span>
        <span class="feat-card__price">${formatJpy(startingPrice)}${thb ? ` · ${thb}` : ''}</span>
      </div>
    </div>
  `;
  return card;
}

function renderFeatured(entries, rate) {
  const section = document.getElementById('featured-section');
  const track = document.getElementById('featured-track');
  if (!section || !track) return;

  const picks = entries.filter((e) => e.editorsPick);
  if (picks.length === 0) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  track.replaceChildren(...picks.map((entry) => createFeatCard(entry, rate)));
}

// ============================================================
//  แผนที่ Leaflet (sync กับ view)
// ============================================================
const JAPAN_CENTER = [36.2, 138.25];
let map = null;
let markerLayer = null;

/** เนื้อหา popup ของหมุด: ชื่อ + รูปย่อ + ราคาเริ่มต้น + ปุ่มเปิดโมดัล */
function buildPopupHtml(entry) {
  const startingPrice = getStartingPriceJpy(entry);
  const thb = formatThb(startingPrice, currentRate);
  const subtitle = [entry.nameJa, entry.nameRomaji].filter(Boolean).join(' · ');
  const hasImage = Array.isArray(entry.images) && entry.images.length > 0;
  const media = hasImage
    ? `<img class="map-popup__img" src="${escapeHtml(wikiThumbUrl(entry.images[0].url, 250))}" alt="${escapeHtml(entry.nameTh)}" loading="lazy" decoding="async" />`
    : '';

  return `
    <div class="map-popup">
      ${media}
      <h3 class="map-popup__name">${escapeHtml(entry.nameTh ?? '')}</h3>
      ${subtitle ? `<p class="map-popup__sub">${escapeHtml(subtitle)}</p>` : ''}
      <p class="map-popup__price">
        <span class="map-popup__jpy">${formatJpy(startingPrice)}</span>
        ${thb ? `<span class="map-popup__thb">${thb}</span>` : ''}
      </p>
      <button type="button" class="map-popup__btn" data-modal-open="${escapeHtml(entry.id)}">
        ดูรายละเอียด
      </button>
    </div>`;
}

/** สร้างแผนที่ครั้งเดียวตอน init */
function setupMap() {
  if (!window.L) {
    console.warn('โหลด Leaflet ไม่สำเร็จ — ข้ามการแสดงแผนที่');
    return;
  }
  map = L.map('map', { scrollWheelZoom: false }).setView(JAPAN_CENTER, 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  map.getContainer().addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-open]');
    if (!btn) return;
    const entry = entryById.get(btn.dataset.modalOpen);
    if (entry) openModal(entry);
  });
}

/** ปักหมุดทุก entry ใน view (ที่มีพิกัด) แล้วซูมให้พอดี */
function renderMap(entries) {
  if (!map || !markerLayer) return;
  markerLayer.clearLayers();

  const markers = [];
  for (const entry of entries) {
    if (typeof entry.lat !== 'number' || typeof entry.lng !== 'number') continue;
    const marker = L.marker([entry.lat, entry.lng]).bindPopup(buildPopupHtml(entry));
    markerLayer.addLayer(marker);
    markers.push(marker);
  }

  // fitBounds ต้องการให้ container มีขนาด; ถ้าแผนที่ถูกซ่อนอยู่ค่อย fit ตอนสลับมาดู
  if (markers.length > 0 && !isMapHidden()) {
    const bounds = L.featureGroup(markers).getBounds();
    map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
  }
}

function isMapHidden() {
  const view = document.getElementById('view');
  return !view || !view.classList.contains('is-map');
}

// ============================================================
//  View model: ฟิลเตอร์ + ค้นหา + เรียง
// ============================================================
const filterState = { category: '', city: '', query: '', sort: null, bookmarkedOnly: false };

let allEntries = [];
let entryById = new Map();
let currentRate = FALLBACK_RATE;
let lastView = []; // view ล่าสุด ใช้ re-render แผนที่ตอนสลับมุมมอง

function populateSelect(selectEl, options) {
  for (const { value, label } of options) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  }
}

function cityOptionsFrom(entries) {
  const cities = [...new Set(entries.map((e) => e.city).filter(Boolean))];
  return cities
    .map((value) => ({ value, label: cityLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'th'));
}

function getViewModel() {
  const filtered = filterEntries(allEntries, {
    category: filterState.category,
    city: filterState.city,
    query: filterState.query,
    bookmarkedOnly: filterState.bookmarkedOnly,
    bookmarkedIds,
  });
  return filterState.sort ? sortByPrice(filtered, filterState.sort) : filtered;
}

/** render กริด + แผนที่ + ตัวนับ ตาม view model ปัจจุบัน */
function applyView(gridEl, statusEl) {
  const view = allEntries.length === 0 ? [] : getViewModel();
  lastView = view;
  renderMap(view);
  updateResultCount(view.length);

  if (allEntries.length === 0) {
    gridEl.replaceChildren();
    setStatus(statusEl, 'ยังไม่มีรายการ', 'empty');
    return;
  }

  if (view.length === 0) {
    gridEl.replaceChildren();
    setStatus(statusEl, emptyMessage(), 'empty');
    return;
  }

  renderGrid(view, gridEl, currentRate);
  setStatus(statusEl, null);
}

/** ข้อความ empty-state ที่เข้าใจง่ายตามบริบทที่ทำให้ว่าง */
function emptyMessage() {
  if (filterState.bookmarkedOnly && bookmarkedIds.size === 0) {
    return 'ยังไม่มีรายการที่บุ๊กมาร์ก — กดปุ่ม ♡ บนการ์ดหรือในรายละเอียดเพื่อบันทึก';
  }
  // หมวดที่ยังไม่มีข้อมูลเลย (เช่นหมวดใหม่ในเฟสนี้) → บอกว่ากำลังจะมา
  if (filterState.category && !allEntries.some((e) => e.category === filterState.category)) {
    return `หมวด "${categoryLabel(filterState.category)}" กำลังจะมาเร็ว ๆ นี้ ✨`;
  }
  return 'ไม่พบรายการที่ตรงกับเงื่อนไข — ลองปรับฟิลเตอร์หรือคำค้นหา';
}

function updateResultCount(n) {
  const el = document.getElementById('result-count');
  if (!el) return;
  el.innerHTML = `พบ <b>${n}</b> รายการ`;
}

// ============================================================
//  แถบชิปหมวด
// ============================================================
function renderCatbar(gridEl, statusEl) {
  const bar = document.getElementById('catbar');
  if (!bar) return;

  const chips = [{ value: '', label: 'ทั้งหมด', icon: '🗾' }];
  // เรียงตาม CATEGORY_ORDER แต่โชว์ครบทุกหมวด (แม้ยังไม่มีข้อมูลในเฟสนี้)
  for (const cat of CATEGORY_ORDER) {
    chips.push({ value: cat, label: categoryLabel(cat), icon: categoryIcon(cat) });
  }

  bar.replaceChildren(
    ...chips.map(({ value, label, icon }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (value === filterState.category ? ' is-active' : '');
      btn.dataset.cat = value;
      if (value) btn.dataset.category = value; // ให้ --cat ของ CSS ทำงาน
      btn.innerHTML = `<span class="chip__icon" aria-hidden="true">${icon}</span>${escapeHtml(label)}`;
      return btn;
    }),
  );

  bar.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filterState.category = chip.dataset.cat;
    for (const c of bar.querySelectorAll('.chip')) {
      c.classList.toggle('is-active', c.dataset.cat === filterState.category);
    }
    applyView(gridEl, statusEl);
  });
}

// ============================================================
//  Toolbar: เมือง / ค้นหา / เรียง / สลับมุมมอง
// ============================================================
function setupFilters(gridEl, statusEl) {
  const cityEl = document.getElementById('filter-city');
  const searchEl = document.getElementById('filter-search');
  const sortButtons = [...document.querySelectorAll('.sort__btn')];

  populateSelect(cityEl, cityOptionsFrom(allEntries));

  cityEl.addEventListener('change', () => {
    filterState.city = cityEl.value;
    applyView(gridEl, statusEl);
  });

  searchEl.addEventListener('input', () => {
    filterState.query = searchEl.value;
    applyView(gridEl, statusEl);
  });

  for (const btn of sortButtons) {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.direction;
      filterState.sort = filterState.sort === dir ? null : dir;
      for (const b of sortButtons) {
        b.setAttribute('aria-pressed', String(b.dataset.direction === filterState.sort));
      }
      applyView(gridEl, statusEl);
    });
  }
}

/** ปุ่มสลับมุมมองกริด ↔ แผนที่ */
function setupViewToggle() {
  const view = document.getElementById('view');
  const buttons = [...document.querySelectorAll('.viewtoggle__btn')];

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const wantMap = btn.dataset.view === 'map';
      view.classList.toggle('is-map', wantMap);
      for (const b of buttons) {
        b.setAttribute('aria-pressed', String((b.dataset.view === 'map') === wantMap));
      }
      // แผนที่ถูกสร้างตอนถูกซ่อน → ต้อง invalidateSize + fit ใหม่เมื่อแสดง
      if (wantMap && map) {
        setTimeout(() => {
          map.invalidateSize();
          renderMap(lastView);
        }, 0);
      }
    });
  }
}

// ============================================================
//  บุ๊กมาร์ก
// ============================================================
function toggleBookmark(id, gridEl, statusEl) {
  if (bookmarkedIds.has(id)) bookmarkedIds.delete(id);
  else bookmarkedIds.add(id);
  saveBookmarks();
  if (filterState.bookmarkedOnly) applyView(gridEl, statusEl);
  syncBookmarkButtons(id);
}

function setupBookmarks(gridEl, statusEl) {
  const onToggleClick = (e) => {
    const btn = e.target.closest('[data-bookmark-toggle]');
    if (!btn) return;
    e.stopPropagation();
    toggleBookmark(btn.dataset.bookmarkToggle, gridEl, statusEl);
  };
  gridEl.addEventListener('click', onToggleClick);
  document.getElementById('modal').addEventListener('click', onToggleClick);

  const toggleBtn = document.getElementById('filter-bookmarked');
  toggleBtn.addEventListener('click', () => {
    filterState.bookmarkedOnly = !filterState.bookmarkedOnly;
    toggleBtn.setAttribute('aria-pressed', String(filterState.bookmarkedOnly));
    toggleBtn.classList.toggle('is-active', filterState.bookmarkedOnly);
    applyView(gridEl, statusEl);
  });
}

// ============================================================
//  โมดัลรายละเอียด + แกลเลอรี
// ============================================================
let modalMap = null;
let lastFocused = null;

function buildGalleryHtml(entry) {
  const images = Array.isArray(entry.images) ? entry.images : [];
  if (images.length === 0) {
    return `<div class="gallery gallery--empty"><span class="gallery__placeholder" aria-hidden="true">🗾</span></div>`;
  }
  const first = images[0];
  const multi = images.length > 1;
  return `
    <div class="gallery">
      <img class="gallery__img" src="${escapeHtml(wikiThumbUrl(first.url, 500))}" alt="${escapeHtml(entry.nameTh)}" decoding="async" />
      <span class="img-badge img-badge--gallery" data-gallery-badge${first.isIllustrative ? '' : ' hidden'} title="ภาพประกอบบริบท ไม่ใช่ภาพจริงของสถานที่">ภาพประกอบ</span>
      ${
        multi
          ? `<button type="button" class="gallery__nav gallery__nav--prev" data-gallery-prev aria-label="รูปก่อนหน้า">‹</button>
             <button type="button" class="gallery__nav gallery__nav--next" data-gallery-next aria-label="รูปถัดไป">›</button>
             <span class="gallery__counter"><span data-gallery-index>1</span>/${images.length}</span>`
          : ''
      }
      <p class="gallery__credit" data-gallery-credit>${escapeHtml(imageCreditText(first))}</p>
    </div>`;
}

function setupGallery(root, entry) {
  const images = Array.isArray(entry.images) ? entry.images : [];
  if (images.length <= 1) return;

  const imgEl = root.querySelector('.gallery__img');
  const idxEl = root.querySelector('[data-gallery-index]');
  const creditEl = root.querySelector('[data-gallery-credit]');
  const badgeEl = root.querySelector('[data-gallery-badge]');
  let i = 0;

  const show = (n) => {
    i = (n + images.length) % images.length;
    imgEl.src = wikiThumbUrl(images[i].url, 500);
    if (idxEl) idxEl.textContent = String(i + 1);
    if (creditEl) creditEl.textContent = imageCreditText(images[i]);
    if (badgeEl) badgeEl.hidden = !images[i].isIllustrative;
  };

  root.querySelector('[data-gallery-prev]')?.addEventListener('click', () => show(i - 1));
  root.querySelector('[data-gallery-next]')?.addEventListener('click', () => show(i + 1));
}

/** แถบข้อมูลด่วน: เวลาเปิด / การเดินทาง / ช่วงที่แนะนำ */
function buildFactGridHtml(entry) {
  const facts = [];
  if (entry.hours) facts.push({ icon: '🕒', label: 'เวลาเปิด', value: entry.hours });
  if (entry.station) facts.push({ icon: '🚉', label: 'การเดินทาง', value: entry.station });
  if (entry.bestTime) facts.push({ icon: '🌤️', label: 'ช่วงที่แนะนำ', value: entry.bestTime });
  if (facts.length === 0) return '';
  const items = facts
    .map(
      (f) => `
      <div class="fact">
        <span class="fact__icon" aria-hidden="true">${f.icon}</span>
        <span>
          <span class="fact__label">${f.label}</span><br />
          <span class="fact__value">${escapeHtml(f.value)}</span>
        </span>
      </div>`,
    )
    .join('');
  return `<div class="factgrid">${items}</div>`;
}

function buildTipsHtml(tips) {
  if (!Array.isArray(tips) || tips.length === 0) return '';
  const items = tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  return `
    <h3 class="modal__heading">💡 ทิปจากนักเดินทาง</h3>
    <ul class="tips">${items}</ul>`;
}

function buildProductsHtml(products, rate) {
  if (!Array.isArray(products) || products.length === 0) {
    return '<p class="modal__empty">ไม่มีข้อมูลราคาสินค้า/เมนู</p>';
  }
  const rows = products
    .map((p) => {
      const priceJpy = typeof p.priceJpy === 'number' ? p.priceJpy : null;
      const thb = formatThb(priceJpy, rate);
      const cond = CONDITION_LABELS[p.condition];
      const condHtml = cond ? `<span class="cond ${cond.cls}">${cond.text}</span>` : '';
      return `
        <li class="product">
          <span class="product__name">${escapeHtml(p.nameTh ?? '')}${condHtml}</span>
          <span class="product__price">
            <span class="product__jpy">${formatJpy(priceJpy)}</span>
            ${thb ? `<span class="product__thb">${thb}</span>` : ''}
          </span>
        </li>`;
    })
    .join('');
  return `<ul class="products">${rows}</ul>`;
}

function modalTagsHtml(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return '';
  const items = tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  return `<div class="modal__tags">${items}</div>`;
}

function openModal(entry) {
  const modalEl = document.getElementById('modal');
  const bodyEl = document.getElementById('modal-body');
  const subtitle = [entry.nameJa, entry.nameRomaji].filter(Boolean).join(' · ');
  const addr = entry.address ?? {};
  const hasCoords = typeof entry.lat === 'number' && typeof entry.lng === 'number';
  const level = getPriceLevel(getStartingPriceJpy(entry));
  const priceBadge = level ? `<span class="badge badge--price">${'¥'.repeat(level)}</span>` : '';
  const gmaps =
    entry.googleMapsUrl ||
    (hasCoords ? `https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.lng}` : '');

  bodyEl.innerHTML = `
    ${buildGalleryHtml(entry)}
    <div class="modal__info" data-category="${escapeHtml(entry.category)}">
      <div class="modal__badges">
        <span class="badge badge--category">${categoryIcon(entry.category)} ${escapeHtml(categoryLabel(entry.category))}</span>
        <span class="badge">📍 ${escapeHtml(cityLabel(entry.city))}</span>
        ${priceBadge}
      </div>
      <h2 id="modal-title" class="modal__title">${escapeHtml(entry.nameTh ?? '')}</h2>
      ${subtitle ? `<p class="modal__subtitle">${escapeHtml(subtitle)}</p>` : ''}
      <div class="modal__actions">${bookmarkButtonHtml(entry.id, 'modal')}</div>
      ${entry.description ? `<p class="modal__desc">${escapeHtml(entry.description)}</p>` : ''}
      ${modalTagsHtml(entry.tags)}
      ${buildFactGridHtml(entry)}
      ${buildTipsHtml(entry.tips)}

      <h3 class="modal__heading">🛍️ สินค้า / เมนูตัวอย่าง</h3>
      ${buildProductsHtml(entry.products, currentRate)}

      <h3 class="modal__heading">📌 ที่อยู่</h3>
      <p class="modal__address">
        ${addr.th ? `<span>${escapeHtml(addr.th)}</span>` : ''}
        ${addr.ja ? `<span class="modal__address-ja">${escapeHtml(addr.ja)}</span>` : ''}
      </p>
      ${hasCoords ? '<div id="modal-map" class="modal__map"></div>' : ''}

      <div class="modal__links">
        ${gmaps ? `<a class="btn-link btn-link--map" href="${escapeHtml(gmaps)}" target="_blank" rel="noopener noreferrer">🗺 เปิดใน Google Maps</a>` : ''}
        ${entry.sourceUrl ? `<a class="btn-link" href="${escapeHtml(entry.sourceUrl)}" target="_blank" rel="noopener noreferrer">🔗 แหล่งอ้างอิง</a>` : ''}
      </div>
    </div>
  `;

  setupGallery(bodyEl, entry);

  lastFocused = document.activeElement;
  modalEl.hidden = false;
  document.body.classList.add('modal-open');

  modalEl.querySelector('.modal__close')?.focus();

  // สร้างแผนที่ย่อ "หลัง" โมดัลแสดง+เพนต์แล้ว (rAF) เพื่อไม่ให้การสร้าง Leaflet
  // บล็อกแอนิเมชันเปิดโมดัล — เปิดได้ลื่นทันที แล้วแผนที่ค่อยขึ้นตาม
  if (hasCoords && window.L) {
    requestAnimationFrame(() => {
      if (modalEl.hidden) return; // ผู้ใช้ปิดก่อนแผนที่จะถูกสร้าง
      const mapContainer = document.getElementById('modal-map');
      if (!mapContainer) return;
      modalMap = L.map(mapContainer, { scrollWheelZoom: false }).setView(
        [entry.lat, entry.lng],
        15,
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(modalMap);
      L.marker([entry.lat, entry.lng]).addTo(modalMap);
      modalMap.invalidateSize();
    });
  }
}

function closeModal() {
  const modalEl = document.getElementById('modal');
  if (modalEl.hidden) return;
  if (modalMap) {
    modalMap.remove();
    modalMap = null;
  }
  modalEl.hidden = true;
  document.body.classList.remove('modal-open');
  lastFocused?.focus?.();
  lastFocused = null;
}

/** ผูก event เปิดโมดัลจากการ์ด/featured (คลิก/Enter/Space) และปิดโมดัล (ปุ่ม/พื้นหลัง/Esc) */
function setupModal(gridEl) {
  const modalEl = document.getElementById('modal');
  const featuredTrack = document.getElementById('featured-track');

  const openFromCard = (target, selector) => {
    if (target.closest('[data-bookmark-toggle]')) return;
    const card = target.closest(selector);
    if (!card) return;
    const entry = entryById.get(card.dataset.id);
    if (entry) openModal(entry);
  };

  gridEl.addEventListener('click', (e) => openFromCard(e.target, '.card'));
  gridEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('[data-bookmark-toggle]')) return;
    if (!e.target.closest('.card')) return;
    e.preventDefault();
    openFromCard(e.target, '.card');
  });

  if (featuredTrack) {
    featuredTrack.addEventListener('click', (e) => openFromCard(e.target, '.feat-card'));
    featuredTrack.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!e.target.closest('.feat-card')) return;
      e.preventDefault();
      openFromCard(e.target, '.feat-card');
    });
  }

  modalEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-modal-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ============================================================
//  เรต / หมายเหตุราคา / เครดิต / สถานะ
// ============================================================
async function loadRate() {
  try {
    const res = await fetch(RATE_API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.THB;
    if (typeof rate !== 'number' || !Number.isFinite(rate)) {
      throw new Error('ไม่พบเรต THB ใน response');
    }
    return { rate, asOf: data.time_last_update_utc ?? null, isFallback: false };
  } catch (err) {
    console.warn('ดึงเรตแลกเปลี่ยนไม่สำเร็จ ใช้เรตสำรอง:', err);
    return { rate: FALLBACK_RATE, asOf: null, isFallback: true };
  }
}

function renderRateLabel(labelEl, { rate, asOf, isFallback }) {
  const rateText = `¥1 ≈ ฿${rate.toFixed(4)}`;
  if (isFallback) {
    labelEl.textContent = `${rateText} · เรตโดยประมาณ (ดึงเรตสดไม่สำเร็จ)`;
  } else {
    const asOfDate = asOf ? new Date(asOf) : null;
    const asOfText =
      asOfDate && !Number.isNaN(asOfDate.getTime())
        ? asOfDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;
    labelEl.textContent = asOfText ? `${rateText} · เรต ณ ${asOfText}` : rateText;
  }
  labelEl.hidden = false;
}

function renderPriceNote(noteEl, note) {
  if (!noteEl) return;
  const text = note ?? 'ราคาทั้งหมดเป็นค่าโดยประมาณ (เยน) อาจเปลี่ยนแปลงได้ตามช่วงเวลาและร้าน';
  noteEl.textContent = `ℹ︎ ${text}`;
  noteEl.hidden = false;
}

function renderHeroStats(entries) {
  const wrap = document.getElementById('hero-stats');
  if (!wrap) return;
  const cities = new Set(entries.map((e) => e.city).filter(Boolean));
  const cats = new Set(entries.map((e) => e.category).filter(Boolean));
  const set = (key, val) => {
    const el = wrap.querySelector(`[data-stat="${key}"]`);
    if (el) el.textContent = String(val);
  };
  set('entries', entries.length);
  set('categories', Math.max(cats.size, CATEGORY_ORDER.length));
  set('cities', cities.size || 3);
  wrap.hidden = false;
}

function renderCredits(entries) {
  const sourcesEl = document.getElementById('credits-sources');
  const imagesEl = document.getElementById('credits-images');

  if (sourcesEl) {
    sourcesEl.replaceChildren(
      ...entries
        .filter((entry) => entry.sourceUrl)
        .map((entry) => {
          const li = document.createElement('li');
          const name = [entry.nameTh, entry.nameRomaji].filter(Boolean).join(' · ');
          const a = document.createElement('a');
          a.href = entry.sourceUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = name || entry.sourceUrl;
          li.appendChild(a);
          return li;
        }),
    );
  }

  if (imagesEl) {
    const items = [];
    for (const entry of entries) {
      for (const image of Array.isArray(entry.images) ? entry.images : []) {
        const li = document.createElement('li');
        li.append(`${entry.nameTh} — `);
        if (image.source) {
          const a = document.createElement('a');
          a.href = image.source;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = image.credit ?? 'ดูที่มา';
          li.appendChild(a);
          if (image.license) li.append(` · ${image.license}`);
        } else {
          li.append([image.credit, image.license].filter(Boolean).join(' · '));
        }
        items.push(li);
      }
    }
    imagesEl.replaceChildren(...items);
  }
}

function setStatus(statusEl, message, variant = null) {
  statusEl.textContent = message ?? '';
  statusEl.classList.toggle('status--loading', variant === 'loading');
  statusEl.classList.toggle('status--empty', variant === 'empty');
  statusEl.classList.toggle('status--error', variant === 'error');
  statusEl.hidden = !message;
}

// ============================================================
//  Init
// ============================================================
async function init() {
  const gridEl = document.getElementById('card-grid');
  const statusEl = document.getElementById('grid-status');
  const rateLabelEl = document.getElementById('rate-label');
  const priceNoteEl = document.getElementById('price-note');

  setStatus(statusEl, 'กำลังโหลดข้อมูล…', 'loading');
  const ratePromise = loadRate();

  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entries = data.entries ?? [];

    const rateInfo = await ratePromise;
    renderRateLabel(rateLabelEl, rateInfo);
    renderPriceNote(priceNoteEl, data.priceNote);

    allEntries = entries;
    entryById = new Map(entries.map((entry) => [entry.id, entry]));
    currentRate = rateInfo.rate;
    bookmarkedIds = loadBookmarks();

    renderHeroStats(entries);
    renderCredits(entries);
    renderFeatured(entries, currentRate);

    renderCatbar(gridEl, statusEl);
    setupFilters(gridEl, statusEl);
    setupViewToggle();
    setupModal(gridEl);
    setupBookmarks(gridEl, statusEl);
    setupMap();
    applyView(gridEl, statusEl);
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err);
    setStatus(
      statusEl,
      'โหลดข้อมูลไม่สำเร็จ — ต้องเปิดเว็บผ่าน local web server (ดู README) ไม่ใช่เปิดไฟล์ตรงๆ',
      'error',
    );
  }
}

init();
