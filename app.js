// app.js — ชั้น side-effect: fetch ข้อมูล, render DOM
// เรียกใช้ pure functions จาก logic.js แล้วเอาผลไป render
import {
  getStartingPriceJpy,
  convertJpyToThb,
  filterEntries,
  sortByPrice,
} from './logic.js';

// เรต JPY→THB ดึงสดจาก API ที่ไม่ต้องใช้ key; ถ้าล้มเหลวใช้เรตสำรองด้านล่าง
const RATE_API_URL = 'https://open.er-api.com/v6/latest/JPY';
const FALLBACK_RATE = 0.22; // เรตโดยประมาณ ใช้เมื่อดึงเรตสดไม่สำเร็จ

const CATEGORY_LABELS = {
  sightseeing: 'ท่องเที่ยว',
  games: 'เกม',
  cosplay: 'คอสเพลย์',
  electronics: 'เครื่องใช้ไฟฟ้า',
  food: 'อาหาร',
};

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

/** เครดิต/ลิขสิทธิ์ของรูป รวมเป็นบรรทัดเดียว (ตามข้อกำหนด PRD ต้องให้เครดิต/ระบุ license) */
function imageCreditText(image) {
  return [image?.credit, image?.license].filter(Boolean).join(' · ');
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
  if (price === null) return 'ราคา: สอบถามหน้าร้าน';
  return `¥${jpyFormatter.format(price)}`;
}

function formatThb(priceJpy, rate) {
  if (priceJpy === null) return null;
  const baht = convertJpyToThb(priceJpy, rate);
  if (baht === null) return null;
  return `฿${thbFormatter.format(baht)}`;
}

function createCard(entry, rate) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = entry.id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `ดูรายละเอียด ${entry.nameTh}`);

  const startingPrice = getStartingPriceJpy(entry);
  const thb = formatThb(startingPrice, rate);
  const hasImage = Array.isArray(entry.images) && entry.images.length > 0;
  const subtitle = [entry.nameJa, entry.nameRomaji].filter(Boolean).join(' · ');

  const media = hasImage
    ? `<img src="${entry.images[0].url}" alt="${entry.nameTh}" loading="lazy" />`
    : '<span class="card__placeholder" aria-hidden="true">🗾</span>';

  card.innerHTML = `
    <div class="card__media">${media}</div>
    <div class="card__body">
      <div class="card__badges">
        <span class="badge badge--category">${CATEGORY_LABELS[entry.category] ?? entry.category}</span>
        <span class="badge">${CITY_LABELS[entry.city] ?? entry.city}</span>
      </div>
      <h2 class="card__name-th">${entry.nameTh}</h2>
      <p class="card__name-ja">${subtitle}</p>
      <p class="card__price">
        <span class="card__price-label">ราคาเริ่มต้น</span>
        <span class="card__price-jpy">${formatJpy(startingPrice)}</span>
        ${thb ? `<span class="card__price-thb">${thb}</span>` : ''}
      </p>
    </div>
  `;

  return card;
}

function renderGrid(entries, gridEl, rate) {
  gridEl.replaceChildren(...entries.map((entry) => createCard(entry, rate)));
}

// ---- View model: ฟิลเตอร์ + ค้นหา + เรียง ----
// สถานะของตัวกรองปัจจุบัน; sort = null คือไม่เรียง (คงลำดับใน data.json)
const filterState = { category: '', city: '', query: '', sort: null };

let allEntries = [];
let entryById = new Map();
let currentRate = FALLBACK_RATE;

/** เติม <option> ให้ select จากรายการ {value,label} โดยคงตัวเลือกแรก ("ทั้งหมด") ไว้ */
function populateSelect(selectEl, options) {
  for (const { value, label } of options) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  }
}

/** สร้างตัวเลือกเมืองจากเมืองที่มีจริงใน data (เรียงตามชื่อไทย) เพื่อให้ขยายตามข้อมูล */
function cityOptionsFrom(entries) {
  const cities = [...new Set(entries.map((e) => e.city).filter(Boolean))];
  return cities
    .map((value) => ({ value, label: CITY_LABELS[value] ?? value }))
    .sort((a, b) => a.label.localeCompare(b.label, 'th'));
}

/** คำนวณ view model จาก state: กรองก่อน แล้วค่อยเรียงถ้ามีการเลือกเรียง */
function getViewModel() {
  const filtered = filterEntries(allEntries, {
    category: filterState.category,
    city: filterState.city,
    query: filterState.query,
  });
  return filterState.sort ? sortByPrice(filtered, filterState.sort) : filtered;
}

/** render กริดตาม view model ปัจจุบัน พร้อม empty state ที่เข้าใจง่าย */
function applyView(gridEl, statusEl) {
  if (allEntries.length === 0) {
    gridEl.replaceChildren();
    setStatus(statusEl, 'ยังไม่มีรายการ');
    return;
  }

  const view = getViewModel();
  if (view.length === 0) {
    gridEl.replaceChildren();
    setStatus(statusEl, 'ไม่พบรายการที่ตรงกับเงื่อนไข — ลองปรับฟิลเตอร์หรือคำค้นหา');
    return;
  }

  renderGrid(view, gridEl, currentRate);
  setStatus(statusEl, null);
}

/** ผูก event ของแถบฟิลเตอร์เข้ากับ state แล้ว re-render กริด */
function setupFilters(gridEl, statusEl) {
  const categoryEl = document.getElementById('filter-category');
  const cityEl = document.getElementById('filter-city');
  const searchEl = document.getElementById('filter-search');
  const sortButtons = [...document.querySelectorAll('.sort__btn')];

  populateSelect(
    categoryEl,
    Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
  );
  populateSelect(cityEl, cityOptionsFrom(allEntries));

  categoryEl.addEventListener('change', () => {
    filterState.category = categoryEl.value;
    applyView(gridEl, statusEl);
  });

  cityEl.addEventListener('change', () => {
    filterState.city = cityEl.value;
    applyView(gridEl, statusEl);
  });

  searchEl.addEventListener('input', () => {
    filterState.query = searchEl.value;
    applyView(gridEl, statusEl);
  });

  // ปุ่มเรียงราคาแบบ toggle: กดปุ่มที่เลือกอยู่ซ้ำ = ยกเลิกการเรียง (กลับลำดับเดิม)
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

// ---- โมดัลรายละเอียด + แกลเลอรีรูป (Issue 05) ----
let modalMap = null; // instance ของ Leaflet แผนที่ย่อ; สร้างใหม่ทุกครั้งที่เปิด ทำลายตอนปิด
let lastFocused = null; // element ที่โฟกัสอยู่ก่อนเปิดโมดัล เพื่อคืนโฟกัสตอนปิด

/** แกลเลอรีรูป: หลายรูปเลื่อนดูได้ (prev/next); ถ้าไม่มีรูปใช้ placeholder */
function buildGalleryHtml(entry) {
  const images = Array.isArray(entry.images) ? entry.images : [];
  if (images.length === 0) {
    return `<div class="gallery gallery--empty"><span class="gallery__placeholder" aria-hidden="true">🗾</span></div>`;
  }
  const first = images[0];
  const multi = images.length > 1;
  return `
    <div class="gallery">
      <img class="gallery__img" src="${escapeHtml(first.url)}" alt="${escapeHtml(entry.nameTh)}" />
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

/** ผูกปุ่ม prev/next ของแกลเลอรีให้สลับรูป + อัปเดตตัวนับและเครดิต (วนรอบ) */
function setupGallery(root, entry) {
  const images = Array.isArray(entry.images) ? entry.images : [];
  if (images.length <= 1) return;

  const imgEl = root.querySelector('.gallery__img');
  const idxEl = root.querySelector('[data-gallery-index]');
  const creditEl = root.querySelector('[data-gallery-credit]');
  let i = 0;

  const show = (n) => {
    i = (n + images.length) % images.length;
    imgEl.src = images[i].url;
    if (idxEl) idxEl.textContent = String(i + 1);
    if (creditEl) creditEl.textContent = imageCreditText(images[i]);
  };

  root.querySelector('[data-gallery-prev]')?.addEventListener('click', () => show(i - 1));
  root.querySelector('[data-gallery-next]')?.addEventListener('click', () => show(i + 1));
}

/** ลิสต์สินค้า/เมนูพร้อมราคา ¥ และ ฿; หมวดเกมแสดงป้ายมือหนึ่ง/มือสอง */
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

/** เปิดโมดัลรายละเอียดของ entry: ประกอบเนื้อหา → แสดง → ตั้งแผนที่ย่อ → จัดโฟกัส */
function openModal(entry) {
  const modalEl = document.getElementById('modal');
  const bodyEl = document.getElementById('modal-body');
  const subtitle = [entry.nameJa, entry.nameRomaji].filter(Boolean).join(' · ');
  const addr = entry.address ?? {};
  const hasCoords = typeof entry.lat === 'number' && typeof entry.lng === 'number';

  bodyEl.innerHTML = `
    ${buildGalleryHtml(entry)}
    <div class="modal__info">
      <div class="card__badges">
        <span class="badge badge--category">${CATEGORY_LABELS[entry.category] ?? entry.category}</span>
        <span class="badge">${CITY_LABELS[entry.city] ?? entry.city}</span>
      </div>
      <h2 id="modal-title" class="modal__title">${escapeHtml(entry.nameTh ?? '')}</h2>
      ${subtitle ? `<p class="modal__subtitle">${escapeHtml(subtitle)}</p>` : ''}
      ${entry.description ? `<p class="modal__desc">${escapeHtml(entry.description)}</p>` : ''}

      <h3 class="modal__heading">สินค้า / เมนูตัวอย่าง</h3>
      ${buildProductsHtml(entry.products, currentRate)}

      <h3 class="modal__heading">ที่อยู่</h3>
      <p class="modal__address">
        ${addr.th ? `<span>${escapeHtml(addr.th)}</span>` : ''}
        ${addr.ja ? `<span class="modal__address-ja">${escapeHtml(addr.ja)}</span>` : ''}
      </p>
      ${hasCoords ? '<div id="modal-map" class="modal__map"></div>' : ''}

      ${
        entry.sourceUrl
          ? `<p class="modal__source"><a href="${escapeHtml(entry.sourceUrl)}" target="_blank" rel="noopener noreferrer">แหล่งอ้างอิง ↗</a></p>`
          : ''
      }
    </div>
  `;

  setupGallery(bodyEl, entry);

  lastFocused = document.activeElement;
  modalEl.hidden = false;
  document.body.classList.add('modal-open');

  // แผนที่ย่อ: สร้างหลังโมดัลแสดงแล้ว (container มีขนาด) แล้ว invalidateSize กันเรนเดอร์เพี้ยน
  if (hasCoords && window.L) {
    modalMap = L.map('modal-map', { scrollWheelZoom: false }).setView([entry.lat, entry.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(modalMap);
    L.marker([entry.lat, entry.lng]).addTo(modalMap);
    setTimeout(() => modalMap?.invalidateSize(), 50);
  }

  modalEl.querySelector('.modal__close')?.focus();
}

/** ปิดโมดัล: ทำลายแผนที่ย่อ คืนสถานะหน้า และคืนโฟกัสให้ element เดิม */
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

/** ผูก event เปิดโมดัล (คลิก/Enter/Space ที่การ์ด) และปิดโมดัล (ปุ่ม/พื้นหลัง/Esc) ครั้งเดียว */
function setupModal(gridEl) {
  const modalEl = document.getElementById('modal');

  const openFromCard = (target) => {
    const card = target.closest('.card');
    if (!card) return;
    const entry = entryById.get(card.dataset.id);
    if (entry) openModal(entry);
  };

  gridEl.addEventListener('click', (e) => openFromCard(e.target));
  gridEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.target.closest('.card')) return;
    e.preventDefault();
    openFromCard(e.target);
  });

  modalEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-modal-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

/**
 * ดึงเรต JPY→THB สดตอนโหลด; ถ้าล้มเหลวคืนเรตสำรอง (isFallback: true) — เว็บต้องไม่พัง
 * @returns {Promise<{ rate: number, asOf: string|null, isFallback: boolean }>}
 */
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

function setStatus(statusEl, message, isError = false) {
  statusEl.textContent = message ?? '';
  statusEl.classList.toggle('status--error', isError);
  statusEl.hidden = !message;
}

async function init() {
  const gridEl = document.getElementById('card-grid');
  const statusEl = document.getElementById('grid-status');
  const rateLabelEl = document.getElementById('rate-label');

  // ดึงเรตคู่ขนานกับข้อมูล; เรตมี fallback ในตัวจึงไม่ทำให้ init ล้มเหลว
  const ratePromise = loadRate();

  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entries = data.entries ?? [];

    const rateInfo = await ratePromise;
    renderRateLabel(rateLabelEl, rateInfo);

    allEntries = entries;
    entryById = new Map(entries.map((entry) => [entry.id, entry]));
    currentRate = rateInfo.rate;

    setupFilters(gridEl, statusEl);
    setupModal(gridEl);
    applyView(gridEl, statusEl);
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err);
    setStatus(
      statusEl,
      'โหลดข้อมูลไม่สำเร็จ — ต้องเปิดเว็บผ่าน local web server (ดู README) ไม่ใช่เปิดไฟล์ตรงๆ',
      true,
    );
  }
}

init();
