// Neon Coast cover engine: draws a multi-panel poster cover from photos,
// a title and a subtitle, onto any 2D canvas. Everything is drawn with the
// canvas API, so the same function paints the live preview and the PNG export.

export const LAYOUTS = {
  hero: 'Hero + three',
  nine: 'Nine-panel grid',
  strip: 'Full bleed + strip',
  duo: 'Split duo',
};

export const GRADES = {
  sunset: 'Vice Sunset',
  neon: 'Neon Night',
  teal: 'Teal Coast',
  pink: 'Hot Pink',
  noir: 'Noir',
};

// Panel rectangles as fractions of the cover [x, y, width, height].
// The bottom 16% of every layout is the title band, drawn over the panels.
export function layoutPanels(layout, count) {
  if (layout === 'nine') {
    const cells = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        cells.push([col / 3, row * 0.28, 1 / 3, 0.28]);
      }
    }
    return cells.slice(0, count);
  }
  if (layout === 'strip') {
    return [
      [0, 0, 1, 0.56],
      [0, 0.56, 1 / 3, 0.28],
      [1 / 3, 0.56, 1 / 3, 0.28],
      [2 / 3, 0.56, 1 / 3, 0.28],
    ].slice(0, count);
  }
  if (layout === 'duo') {
    return [[0, 0, 0.5, 0.84], [0.5, 0, 0.5, 0.84]].slice(0, count);
  }
  // hero: one big panel, three stacked beside it.
  return [
    [0, 0, 0.66, 0.84],
    [0.66, 0, 0.34, 0.28],
    [0.66, 0.28, 0.34, 0.28],
    [0.66, 0.56, 0.34, 0.28],
  ].slice(0, count);
}

export function panelCount(layout) {
  return { hero: 4, nine: 9, strip: 4, duo: 2 }[layout] ?? 4;
}

// A tiny seeded random source so the grain looks the same on every draw.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function gradeStops(grade) {
  if (grade === 'neon') return ['rgba(255,46,136,0.34)', 'rgba(46,230,214,0.30)', 'rgba(20,8,40,0.28)'];
  if (grade === 'teal') return ['rgba(46,230,214,0.26)', 'rgba(0,120,140,0.30)', 'rgba(8,30,48,0.30)'];
  if (grade === 'pink') return ['rgba(255,46,136,0.38)', 'rgba(255,120,80,0.22)', 'rgba(60,8,50,0.26)'];
  if (grade === 'noir') return ['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.34)', 'rgba(0,0,0,0.42)'];
  return ['rgba(255,140,60,0.22)', 'rgba(255,46,120,0.30)', 'rgba(40,10,60,0.34)'];
}

function drawPhotoInto(ctx, img, rect, slot) {
  const [rx, ry, rw, rh] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  if (!img) {
    const g = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    g.addColorStop(0, '#3a1c5c');
    g.addColorStop(1, '#160a28');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
    return;
  }
  const zoom = slot.zoom ?? 1.15;
  const base = Math.max(rw / img.naturalWidth, rh / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * base;
  const ph = img.naturalHeight * base;
  // Clamp the pan so the photo always covers its whole panel, however far
  // the sliders or a shot scene push it.
  const maxOx = Math.max(0, (pw - rw) / 2);
  const maxOy = Math.max(0, (ph - rh) / 2);
  const ox = Math.max(-maxOx, Math.min(maxOx, (slot.panX ?? 0) * rw));
  const oy = Math.max(-maxOy, Math.min(maxOy, (slot.panY ?? 0) * rh));
  ctx.drawImage(img, rx + (rw - pw) / 2 + ox, ry + (rh - ph) / 2 + oy, pw, ph);
  ctx.restore();
}

function applyGrade(ctx, rect, grade, noir) {
  const [rx, ry, rw, rh] = rect;
  const [top, mid, bottom] = gradeStops(grade);
  const g = ctx.createLinearGradient(rx, ry, rx, ry + rh);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(rx, ry, rw, rh);
  if (noir) {
    ctx.fillStyle = 'rgba(10,10,18,0.12)';
    ctx.fillRect(rx, ry, rw, rh);
  }
}

function fitFont(ctx, text, maxWidth, startSize, weight = 900) {
  let size = startSize;
  const family = '"Arial Narrow", "Helvetica Neue", Impact, "Arial Black", sans-serif';
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawTitleBand(ctx, w, h, state) {
  const bandY = h * 0.84;
  const bandH = h * 0.16;
  const g = ctx.createLinearGradient(0, bandY, w, bandY);
  if (state.grade === 'neon') {
    g.addColorStop(0, '#12082e');
    g.addColorStop(0.5, '#3d0a4d');
    g.addColorStop(1, '#0a2e33');
  } else if (state.grade === 'teal') {
    g.addColorStop(0, '#062a33');
    g.addColorStop(1, '#0a1a2e');
  } else if (state.grade === 'noir') {
    g.addColorStop(0, '#111111');
    g.addColorStop(1, '#000000');
  } else {
    g.addColorStop(0, '#2b0a3d');
    g.addColorStop(0.55, '#a3135e');
    g.addColorStop(1, '#ff7a3d');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, bandY, w, bandH);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(0, bandY, w, Math.max(2, h * 0.004));

  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const cx = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    const size = fitFont(ctx, title, w * 0.92, bandH * 0.52);
    const ty = bandY + bandH * (sub ? 0.34 : 0.5);
    ctx.save();
    if (state.titleStyle === 'sunset') {
      const tg = ctx.createLinearGradient(0, ty - size / 2, 0, ty + size / 2);
      tg.addColorStop(0, '#fff3c4');
      tg.addColorStop(0.5, '#ffb347');
      tg.addColorStop(1, '#ff2e88');
      ctx.fillStyle = tg;
      ctx.strokeStyle = 'rgba(20,4,32,0.9)';
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.strokeText(title, cx, ty);
      ctx.fillText(title, cx, ty);
    } else if (state.titleStyle === 'neon') {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = Math.max(2, size * 0.045);
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.35;
      ctx.strokeText(title, cx, ty);
      ctx.fillText(title, cx, ty);
      ctx.shadowBlur = 0;
    } else if (state.titleStyle === 'black') {
      ctx.fillStyle = '#14081f';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, size * 0.04);
      ctx.strokeText(title, cx, ty);
      ctx.fillText(title, cx, ty);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(20,4,32,0.9)';
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.strokeText(title, cx, ty);
      ctx.fillText(title, cx, ty);
    }
    ctx.restore();
  }
  if (sub) {
    ctx.font = `italic 600 ${Math.max(12, bandH * 0.2)}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = 'rgba(255,247,239,0.92)';
    ctx.fillText(sub, cx, bandY + bandH * 0.78);
  }
}

function drawGrain(ctx, w, h, amount) {
  const rand = seededRandom(20261119);
  ctx.save();
  ctx.globalAlpha = 0.09;
  const dots = Math.floor((w * h) / 9000) * amount;
  for (let i = 0; i < dots; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
  }
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// A row of halftone dots along the title band, a print-poster touch that
// also hides the seam where the panels meet the band.
function drawHalftone(ctx, w, h) {
  const y = h * 0.84;
  const step = Math.max(10, w * 0.012);
  ctx.save();
  for (let x = step / 2; x < w; x += step) {
    const r = (Math.sin(x * 0.05) * 0.5 + 0.5) * step * 0.22 + step * 0.08;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(x, y + step * 0.4, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Paints the whole cover for `state` onto `canvas` (preview or export size). */
export function drawCover(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const noir = state.grade === 'noir';
  ctx.save();
  ctx.fillStyle = '#160a28';
  ctx.fillRect(0, 0, w, h);
  if (noir) ctx.filter = 'grayscale(1) contrast(1.08)';
  const rects = layoutPanels(state.layout, panelCount(state.layout));
  const gutter = Math.max(3, Math.round(w * 0.006));
  rects.forEach((frac, i) => {
    const rect = [
      frac[0] * w + gutter / 2,
      frac[1] * h + gutter / 2,
      frac[2] * w - gutter,
      frac[3] * h - gutter,
    ];
    const slot = state.slots[i] ?? {};
    drawPhotoInto(ctx, slot.img ?? null, rect, slot);
  });
  ctx.filter = 'none';
  rects.forEach((frac) => {
    const rect = [
      frac[0] * w + gutter / 2,
      frac[1] * h + gutter / 2,
      frac[2] * w - gutter,
      frac[3] * h - gutter,
    ];
    applyGrade(ctx, rect, state.grade, noir);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.strokeRect(rect[0], rect[1], rect[2], rect[3]);
  });
  ctx.restore();

  drawTitleBand(ctx, w, h, state);
  drawHalftone(ctx, w, h);
  if (state.vignette) drawVignette(ctx, w, h);
  if (state.grain) drawGrain(ctx, w, h, 1);

  if (opts.selected != null && !opts.forExport) {
    const frac = rects[opts.selected];
    if (frac) {
      ctx.save();
      ctx.strokeStyle = '#2ee6d6';
      ctx.lineWidth = Math.max(4, w * 0.008);
      ctx.setLineDash([Math.max(10, w * 0.02), Math.max(8, w * 0.012)]);
      ctx.strokeRect(frac[0] * w + 2, frac[1] * h + 2, frac[2] * w - 4, frac[3] * h - 4);
      ctx.restore();
    }
  }
  return rects;
}
