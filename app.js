// app.js — ชั้น side-effect: fetch ข้อมูล, render DOM
// เรียกใช้ pure functions จาก logic.js แล้วเอาผลไป render
import { getStartingPriceJpy, filterEntries, sortByPrice } from './logic.js';

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

function formatJpy(price) {
  if (price === null) return 'ราคา: สอบถามหน้าร้าน';
  return `¥${jpyFormatter.format(price)}`;
}

function createCard(entry) {
  const card = document.createElement('article');
  card.className = 'card';

  const startingPrice = getStartingPriceJpy(entry);
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
        ${formatJpy(startingPrice)}
      </p>
    </div>
  `;

  return card;
}

function renderGrid(entries, gridEl) {
  gridEl.replaceChildren(...entries.map(createCard));
}

// ---- View model: ฟิลเตอร์ + ค้นหา + เรียง ----
// สถานะของตัวกรองปัจจุบัน; sort = null คือไม่เรียง (คงลำดับใน data.json)
const filterState = { category: '', city: '', query: '', sort: null };

let allEntries = [];

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

  renderGrid(view, gridEl);
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

function setStatus(statusEl, message, isError = false) {
  statusEl.textContent = message ?? '';
  statusEl.classList.toggle('status--error', isError);
  statusEl.hidden = !message;
}

async function init() {
  const gridEl = document.getElementById('card-grid');
  const statusEl = document.getElementById('grid-status');

  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entries = data.entries ?? [];

    allEntries = entries;

    setupFilters(gridEl, statusEl);
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
