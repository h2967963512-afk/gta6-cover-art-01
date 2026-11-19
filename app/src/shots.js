// Fixed scenes for screenshots: ?shot=editor shows the studio with photos
// loaded; ?shot=cover shows the exported cover alone, full frame.
// Query: photo / photo2 (boulevard or pier), caption, sub, layout, grade,
// size (1080x1080, 1080x1350 or 1920x1080), style, pan (hero panY, -0.5..0.5).
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, state, load) {
  const $ = (id) => document.getElementById(id);
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1080';
  const caption = query.get('caption') ?? 'VICE SUNSET';
  const sub = query.get('sub') ?? 'a night on the coast';
  const titleStyle = query.get('style') ?? 'sunset';

  state.layout = layout;
  state.grade = grade;
  state.size = size;
  state.subtitle = sub;
  state.titleStyle = titleStyle;
  $('layout').value = layout;
  $('grade').value = grade;
  $('size').value = size;
  $('subtitle').value = sub;
  $('titleStyle').value = titleStyle;

  const first = query.get('photo') ?? 'boulevard';
  const second = query.get('photo2');
  await load(first, caption);
  // `pan` shifts the hero photo down so a face near the top of a portrait
  // photo stays in frame in a wide panel.
  const pan = parseFloat(query.get('pan') ?? '0');
  if (state.slots[0]) state.slots[0].panY = pan;
  if (second) {
    // A second photo fills the smaller panels, so the cover shows two photos.
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = `samples/${second}.jpg`;
    });
    // Each small panel shows a different slice of the second photo.
    const slices = [0.28, 0, -0.28];
    state.slots.forEach((slot, i) => {
      if (i > 0) {
        slot.img = img;
        slot.panY = slices[(i - 1) % slices.length];
      }
    });
    const [w, h] = size.split('x').map(Number);
    const c = document.getElementById('cover');
    c.width = w;
    c.height = h;
    const { drawCover } = await import('./cover.js');
    drawCover(c, state, { forExport: true });
  } else if (shot === 'cover') {
    // One photo everywhere: vary the crop per panel so the repeats differ.
    const slices = [0.28, 0, -0.28];
    state.slots.forEach((slot, i) => {
      if (i > 0) slot.panY = slices[(i - 1) % slices.length];
    });
    // Repaint the cover alone once the pan above is applied.
    const [w, h] = size.split('x').map(Number);
    const c = document.getElementById('cover');
    c.width = w;
    c.height = h;
    const { drawCover } = await import('./cover.js');
    drawCover(c, state, { forExport: true });
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
