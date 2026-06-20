// app.js — ชั้น side-effect: fetch ข้อมูล, render DOM
// เรียกใช้ pure functions จาก logic.js แล้วเอาผลไป render
import { getStartingPriceJpy } from './logic.js';

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

    if (entries.length === 0) {
      setStatus(statusEl, 'ยังไม่มีรายการ');
      return;
    }

    renderGrid(entries, gridEl);
    setStatus(statusEl, null);
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
