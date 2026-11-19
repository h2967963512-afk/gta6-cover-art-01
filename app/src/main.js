// Neon Coast wiring: keeps the cover state, binds every control, paints the
// live preview, and exports the cover as a PNG at the chosen post size.
import { drawCover, layoutPanels, panelCount } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const $ = (id) => document.getElementById(id);

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'VICE SUNSET',
  subtitle: 'a night on the coast',
  titleStyle: 'sunset',
  grain: true,
  vignette: true,
  size: '1080x1080',
  slots: [],
};

let selected = 0;
let lastRects = [];

function emptySlots(n) {
  const slots = [];
  for (let i = 0; i < n; i++) slots.push({ img: null, zoom: 1.15, panX: 0, panY: 0 });
  return slots;
}

function syncSlotCount() {
  const n = panelCount(state.layout);
  while (state.slots.length < n) state.slots.push({ img: null, zoom: 1.15, panX: 0, panY: 0 });
  state.slots.length = n;
  if (selected >= n) selected = 0;
}

function readControls() {
  state.layout = $('layout').value;
  state.grade = $('grade').value;
  state.title = $('title').value;
  state.subtitle = $('subtitle').value;
  state.titleStyle = $('titleStyle').value;
  state.grain = $('grain').checked;
  state.vignette = $('vignette').checked;
  state.size = $('size').value;
}

function redraw() {
  readControls();
  syncSlotCount();
  const [w, h] = state.size.split('x').map(Number);
  const ratio = w / h;
  canvas.width = w;
  canvas.height = h;
  canvas.style.aspectRatio = `${w} / ${h}`;
  lastRects = drawCover(canvas, state, { selected });
  const slot = state.slots[selected];
  $('zoom').value = slot.zoom;
  $('panX').value = slot.panX;
  $('panY').value = slot.panY;
  $('panelLabel').textContent = `Panel: ${panelName(selected)} — ${slot.img ? 'photo loaded' : 'empty, load a photo'}`;
}

function panelName(i) {
  if (state.layout === 'hero') return i === 0 ? 'hero' : `side ${i}`;
  if (state.layout === 'nine') return `cell ${i + 1}`;
  if (state.layout === 'strip') return i === 0 ? 'full bleed' : `strip ${i}`;
  return i === 0 ? 'left' : 'right';
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

async function loadIntoSelected(url) {
  const img = await loadImage(url);
  state.slots[selected].img = img;
  redraw();
}

$('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const img = await loadImage(URL.createObjectURL(file));
    state.slots[selected].img = img;
    $('status').textContent = `Photo loaded into ${panelName(selected)}.`;
  } catch {
    $('status').textContent = 'That file could not be read as a photo.';
  }
  redraw();
});

$('sampleBoulevard').addEventListener('click', () => loadIntoSelected('samples/boulevard.jpg'));
$('samplePier').addEventListener('click', () => loadIntoSelected('samples/pier.jpg'));

$('fillAll').addEventListener('click', () => {
  const img = state.slots[selected].img;
  if (!img) {
    $('status').textContent = 'Load a photo into the selected panel first.';
    return;
  }
  state.slots.forEach((slot, i) => {
    slot.img = img;
    // Vary the crop per panel so one photo reads differently in each frame.
    slot.panX = (i % 3 - 1) * 0.18;
    slot.panY = (Math.floor(i / 3) % 2 === 0 ? -0.08 : 0.1) * (i % 2 === 0 ? 1 : -1);
  });
  $('status').textContent = 'One photo now fills every panel, cropped differently in each.';
  redraw();
});

$('clearPanel').addEventListener('click', () => {
  state.slots[selected].img = null;
  redraw();
});

// Shuffle picks a fresh layout and grade together, for a one-tap new look.
$('shuffleLook').addEventListener('click', () => {
  const layouts = ['hero', 'nine', 'strip', 'duo'];
  const grades = ['sunset', 'neon', 'teal', 'pink', 'noir'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  $('layout').value = pick(layouts);
  $('grade').value = pick(grades);
  $('status').textContent = 'New look shuffled — export when you like it.';
  redraw();
});

// Arrow keys nudge the selected panel's photo, so cropping needs no mouse.
document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const step = 0.03;
  const slot = state.slots[selected];
  if (!slot) return;
  if (e.key === 'ArrowLeft') { slot.panX = Math.max(-0.5, slot.panX - step); redraw(); }
  if (e.key === 'ArrowRight') { slot.panX = Math.min(0.5, slot.panX + step); redraw(); }
  if (e.key === 'ArrowUp') { slot.panY = Math.max(-0.5, slot.panY - step); redraw(); }
  if (e.key === 'ArrowDown') { slot.panY = Math.min(0.5, slot.panY + step); redraw(); }
});

$('zoom').addEventListener('input', (e) => { state.slots[selected].zoom = Number(e.target.value); redraw(); });
$('panX').addEventListener('input', (e) => { state.slots[selected].panX = Number(e.target.value); redraw(); });
$('panY').addEventListener('input', (e) => { state.slots[selected].panY = Number(e.target.value); redraw(); });

['layout', 'grade', 'titleStyle', 'size', 'grain', 'vignette'].forEach((id) => {
  $(id).addEventListener('change', redraw);
});
['title', 'subtitle'].forEach((id) => {
  $(id).addEventListener('input', redraw);
});

canvas.addEventListener('click', (e) => {
  const box = canvas.getBoundingClientRect();
  const fx = (e.clientX - box.left) / box.width;
  const fy = (e.clientY - box.top) / box.height;
  const hit = lastRects.findIndex(([x, y, w, h]) => fx >= x && fx <= x + w && fy >= y && fy <= y + h);
  if (hit >= 0) {
    selected = hit;
    redraw();
  }
});

$('exportBtn').addEventListener('click', () => {
  const [w, h] = state.size.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, { forExport: true });
  off.toBlob((blob) => {
    if (!blob) {
      $('status').textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-${state.size}.png`;
    a.click();
    $('status').textContent = `Saved neon-coast-${state.size}.png (${w} × ${h}).`;
  }, 'image/png');
});

// Fixed scenes for screenshots: ?shot=editor shows the studio with photos
// loaded; ?shot=cover shows the cover alone, full frame.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, state, async (sample, text) => {
    const img = await loadImage(`samples/${sample}.jpg`);
    syncSlotCount();
    state.slots.forEach((slot) => { slot.img = img; });
    state.title = text;
    $('title').value = text;
    redraw();
  });
} else {
  redraw();
}
