/* Конфигуратор фасада «трафаретный кирпич» — ванильный JS, Canvas 2D */
'use strict';

/* ---------- Данные ---------- */

const PATTERNS = [
  { id: 'classic', name: 'Классический', sub: 'ровная перевязка в полкирпича', brick: [250, 65], joint: 12, offset: 0.5, rustic: false },
  { id: 'antique', name: 'Старинный', sub: 'неровные края, сколы, лофт', brick: [250, 65], joint: 14, offset: 0.5, rustic: true },
  { id: 'riegel', name: 'Ригельный', sub: 'длинный узкий формат', brick: [490, 40], joint: 12, offset: 0.5, rustic: false },
  { id: 'klinker', name: 'Клинкер 1/3', sub: 'кладка со сдвигом на треть', brick: [240, 71], joint: 10, offset: 1 / 3, rustic: false },
];

const BRICK_COLORS = [
  { id: 'white', name: 'Белый / Слоновая кость', code: 'RAL 9010 / 1013', hex: '#F1EFEA' },
  { id: 'sand', name: 'Песочный / Охра', code: 'RAL 1001', hex: '#CEB08B' },
  { id: 'beige', name: 'Светлый беж / Ваниль', code: 'RAL 1014', hex: '#DBC8A8' },
  { id: 'cappuccino', name: 'Капучино / Кофе с молоком', code: 'NCS S 3010-Y30R', hex: '#9B8672' },
  { id: 'terracotta', name: 'Терракот / Обожжённая глина', code: 'RAL 8004 / 3009', hex: '#8C402B' },
  { id: 'chocolate', name: 'Шоколадный / Умбра', code: 'RAL 8017 / 8019', hex: '#4B3628' },
  { id: 'concrete', name: 'Светло-серый бетон', code: 'RAL 7035 / 7040', hex: '#9DA3A6' },
  { id: 'graphite', name: 'Графит / Антрацит', code: 'RAL 7024 / 7016', hex: '#383E42' },
];

const JOINT_COLORS = [
  { id: 'lime', name: 'Белый известковый', code: 'RAL 9003', hex: '#F4F4F4' },
  { id: 'pearl', name: 'Жемчужный / Светло-кремовый', code: 'NCS S 0502-Y', hex: '#EBE8DF' },
  { id: 'cement', name: 'Светло-серый цементный', code: 'RAL 7035', hex: '#C5C7C4' },
  { id: 'asphalt', name: 'Тёмно-серый / Мокрый асфальт', code: 'RAL 7016', hex: '#373E43' },
  { id: 'black', name: 'Чёрный контрастный', code: 'RAL 9005', hex: '#1E1E1E' },
];

/*
 * Фото дома заказчика. Координаты полигонов — в долях ширины/высоты картинки.
 * regions — зоны, где может быть стена; holes — исключения (окна, ствол, столб).
 * Внутри зон стена дополнительно отбирается по цвету (серая плитка): низкая
 * насыщенность (chroma) и средняя яркость.
 */
/*
 * Фото реальных стен. Стены сняты под углом (перспектива), поэтому мы не
 * накладываем синтетическую кладку, а ПЕРЕКРАШИВАЕМ реальную стену: сохраняем
 * её геометрию, фактуру и тени, меняем только цвет кирпича и цвет шва.
 * Координаты полигонов — в долях ширины/высоты фото.
 *  - regions: зоны, где стена; holes: исключения (окна, цоколь, красный кирпич, крыша).
 *  - key: дополнительный цветовой фильтр серой плитки (низкая насыщенность, средняя яркость).
 *  - avgFrac: радиус локального среднего (доля меньшей стороны) — отделяет тело кирпича от шва.
 *  - tDelta: ширина перехода «шов ↔ кирпич» по яркости.
 */
const PHOTOS = [
  {
    id: 'ph1', src: './assets/house1.jpg', name: 'Угол с окном',
    key: { chromaMax: 0.20, lumMin: 0.07, lumMax: 1.0 }, avgFrac: 0.02, tDelta: 0.05,
    regions: [
      [[0.15, 0.30], [0.60, 0.11], [0.93, 0.16], [0.93, 0.86], [0.15, 0.80]],   // основная плоскость
      [[0.905, 0.20], [1.0, 0.0], [1.0, 0.88], [0.905, 0.86]],                  // возврат за углом
    ],
    holes: [
      [[0.45, 0.29], [0.63, 0.29], [0.63, 0.55], [0.45, 0.55]],                 // окно
      [[0.0, 0.83], [1.0, 0.86], [1.0, 1.0], [0.0, 1.0]],                        // цоколь/земля снизу
    ],
  },
  {
    id: 'ph2', src: './assets/house2.jpg', name: 'Угол в саду',
    key: { chromaMax: 0.20, lumMin: 0.07, lumMax: 1.0 }, avgFrac: 0.02, tDelta: 0.05,
    regions: [
      [[0.02, 0.24], [0.52, 0.15], [0.52, 0.82], [0.02, 0.86]],                 // левая плоскость
      [[0.52, 0.15], [0.725, 0.22], [0.725, 0.80], [0.52, 0.82]],               // правая плоскость (на солнце)
    ],
    holes: [
      [[0.27, 0.20], [0.38, 0.20], [0.38, 0.34], [0.27, 0.34]],                 // окно
      [[0.0, 0.80], [0.70, 0.76], [0.70, 1.0], [0.0, 1.0]],                      // цоколь снизу
    ],
  },
  {
    id: 'ph3', src: './assets/house3.jpg', name: 'Стена с тенью',
    key: { chromaMax: 0.26, lumMin: 0.05, lumMax: 1.0 }, avgFrac: 0.018, tDelta: 0.05,
    regions: [
      [[0.03, 0.0], [1.0, 0.0], [1.0, 0.82], [0.03, 0.92]],                     // одна плоскость, уходит вправо
    ],
    holes: [
      [[0.85, 0.12], [0.95, 0.12], [0.95, 0.30], [0.85, 0.30]],                 // окно справа
      [[0.0, 0.90], [1.0, 0.80], [1.0, 1.0], [0.0, 1.0]],                        // низ
    ],
  },
];

const MODES = ['photo', 'scheme'];
const STORAGE_KEY = 'facade-config-v2';
const DEFAULT_STATE = { mode: 'photo', photo: 'ph1', pattern: 'classic', brick: 'terracotta', joint: 'cement' };

function byId(list, id) { return list.find((x) => x.id === id); }

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (s && byId(PATTERNS, s.pattern) && byId(BRICK_COLORS, s.brick) && byId(JOINT_COLORS, s.joint)) {
      const mode = MODES.includes(s.mode) ? s.mode : DEFAULT_STATE.mode;
      const photo = PHOTOS.some((p) => p.id === s.photo) ? s.photo : DEFAULT_STATE.photo;
      return { mode, photo, pattern: s.pattern, brick: s.brick, joint: s.joint };
    }
  } catch (e) { /* localStorage недоступен — работаем без него */ }
  return { ...DEFAULT_STATE };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

const state = loadState();

/* ---------- Утилиты: PRNG и цвет ---------- */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

function shade(hex, dl) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return rgbToHex(...hslToRgb(h, s, Math.max(0, Math.min(1, l + dl))));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const shadeCache = new Map();
function getShades(hex, spread, n = 7) {
  const key = hex + '|' + spread + '|' + n;
  let arr = shadeCache.get(key);
  if (!arr) {
    arr = [];
    for (let i = 0; i < n; i++) arr.push(shade(hex, -spread + (2 * spread * i) / (n - 1)));
    shadeCache.set(key, arr);
  }
  return arr;
}

/* ---------- Зернистость (шум) ---------- */

let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(256, 256);
  const rnd = mulberry32(20240904);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() * 255) | 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

// Два слоя шума: мелкое зерно и более крупная «штукатурная» фактура.
function grain(ctx, W, H, alpha) {
  const tile = getNoiseTile();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const fine = ctx.createPattern(tile, 'repeat');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fine;
  ctx.fillRect(0, 0, W, H);
  const coarse = ctx.createPattern(tile, 'repeat');
  if (coarse && coarse.setTransform && typeof DOMMatrix !== 'undefined') {
    coarse.setTransform(new DOMMatrix([2.7, 0, 0, 2.7, 0, 0]));
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = coarse;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/* ---------- Рендер стены ---------- */

/**
 * Рисует участок стены в область W×H (в единицах текущей системы координат ctx).
 * opts.wallMM — какая ширина стены в мм помещается в W (задаёт масштаб).
 */
function renderWall(ctx, W, H, st, opts = {}) {
  const pat = byId(PATTERNS, st.pattern);
  const brick = byId(BRICK_COLORS, st.brick);
  const joint = byId(JOINT_COLORS, st.joint);
  const wallMM = opts.wallMM || 1600;
  const s = W / wallMM; // px на мм
  const bw = pat.brick[0] * s, bh = pat.brick[1] * s, j = pat.joint * s;
  const pitchX = bw + j, pitchY = bh + j;
  const rnd = mulberry32(hashSeed(pat.id + '|' + wallMM));

  ctx.save();

  // 1. Шов — базовый слой
  ctx.fillStyle = joint.hex;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.12);

  // 2. Геометрия кирпичей (детерминированная)
  const shades = getShades(brick.hex, pat.rustic ? 0.075 : 0.035);
  const jit = pat.rustic ? 3 * s : 0;
  const jitMid = pat.rustic ? 1.8 * s : 0;
  const J = () => (rnd() * 2 - 1) * jit;
  const M = () => (rnd() * 2 - 1) * jitMid;
  const bricks = [];
  const rows = Math.ceil(H / pitchY) + 1;

  for (let r = 0; r < rows; r++) {
    const y = j + r * pitchY;
    const off = ((r * pat.offset) % 1) * pitchX;
    for (let x = j + off - pitchX; x < W; x += pitchX) {
      const x2 = x + bw, y2 = y + bh, xm = x + bw / 2, ym = y + bh / 2;
      const pts = [
        [x + J(), y + J()], [xm + M(), y + M()], [x2 + J(), y + J()],
        [x2 + M(), ym + M()], [x2 + J(), y2 + J()], [xm + M(), y2 + M()],
        [x + J(), y2 + J()], [x + M(), ym + M()],
      ];
      const shadeIdx = Math.floor(rnd() * shades.length);
      const chips = [];
      if (pat.rustic && rnd() < 0.45) {
        const n = rnd() < 0.3 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          chips.push({ corner: Math.floor(rnd() * 4), a: (4 + rnd() * 7) * s, b: (3 + rnd() * 6) * s });
        }
      }
      bricks.push({ pts, shadeIdx, chips, cx: xm, cy: ym });
    }
  }

  // 3. Заливка кирпичей + рельеф кромок + сколы
  const all = new Path2D();
  const lw = Math.max(1, s * 1.4);
  const chipColor = shade(joint.hex, -0.05);
  const hiPath = new Path2D();
  const loPath = new Path2D();

  for (const b of bricks) {
    const p = new Path2D();
    p.moveTo(b.pts[0][0], b.pts[0][1]);
    for (let i = 1; i < 8; i++) p.lineTo(b.pts[i][0], b.pts[i][1]);
    p.closePath();
    ctx.fillStyle = shades[b.shadeIdx];
    ctx.fill(p);
    all.addPath(p);

    // светлая кромка: лево + верх (p6 → p7 → p0 → p1 → p2)
    hiPath.moveTo(b.pts[6][0], b.pts[6][1]);
    for (const i of [7, 0, 1, 2]) hiPath.lineTo(b.pts[i][0], b.pts[i][1]);
    // тёмная кромка: право + низ (p2 → p3 → p4 → p5 → p6)
    loPath.moveTo(b.pts[2][0], b.pts[2][1]);
    for (const i of [3, 4, 5, 6]) loPath.lineTo(b.pts[i][0], b.pts[i][1]);
  }

  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.clip(all);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.stroke(hiPath);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.stroke(loPath);
  ctx.restore();

  if (pat.rustic) {
    ctx.fillStyle = chipColor;
    for (const b of bricks) {
      for (const c of b.chips) {
        const [px, py] = b.pts[c.corner * 2];
        const dx = px < b.cx ? 1 : -1;
        const dy = py < b.cy ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(px - dx * lw, py - dy * lw);
        ctx.lineTo(px + dx * c.a, py - dy * lw);
        ctx.lineTo(px - dx * lw, py + dy * c.b);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // 4. Зернистость по лицевой поверхности кирпичей
  ctx.save();
  ctx.clip(all);
  grain(ctx, W, H, 0.16);
  ctx.restore();

  ctx.restore();
}

/* ---------- Canvas helpers ---------- */

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width), h = Math.round(rect.height);
  if (w === 0 || h === 0) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* ---------- Режим «Фото»: перекраска реальной стены ---------- */

// Реестр фото: на кожен id — свій стан завантаження та обчислені шари.
const photos = {};
PHOTOS.forEach((p) => { photos[p.id] = { conf: p, ready: false, failed: false, loading: false }; });
let photoDebug = false;

function activePhoto() { return photos[state.photo]; }
function photoModeActive() { const p = activePhoto(); return state.mode === 'photo' && p && p.ready; }

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a || 1e-6), 0, 1); return t * t * (3 - 2 * t); }

// Раздельное box-размытие Float32Array (w×h), края — повтор крайнего пикселя.
function boxBlur(src, w, h, r) {
  if (r < 1) return Float32Array.from(src);
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * k;
      acc += src[row + clamp(x + r + 1, 0, w - 1)] - src[row + clamp(x - r, 0, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * k;
      acc += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x];
    }
  }
  return out;
}

// Растеризует полигоны зон/исключений в альфа-маску через canvas.
function rasterizePolygons(conf, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const trace = (poly) => {
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = '#fff';
  conf.regions.forEach(trace);
  ctx.globalCompositeOperation = 'destination-out';
  (conf.holes || []).forEach(trace);
  return ctx.getImageData(0, 0, w, h).data;
}

/*
 * Один раз на фото. Готуємо дані для перефарбування зі збереженням яскравості:
 *   out = brickColor·a[i] + jointColor·b[i]
 * де t — «тіловість» (1 на тілі цеглини, 0 на шві), ratio = L/refL(матеріалу),
 * a = t·ratio, b = (1-t)·ratio. Так фактура, тіні й перспектива зберігаються,
 * а колір тіла й шва беруться окремо.
 */
function buildPhotoData(P) {
  const { canvas: cv, w, h, conf } = P;
  const data = cv.getContext('2d').getImageData(0, 0, w, h).data;
  const poly = rasterizePolygons(conf, w, h);
  const n = w * h;
  const Ln = new Float32Array(n);
  const inMask = new Uint8Array(n);
  const key = conf.key;
  for (let i = 0; i < n; i++) {
    const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
    Ln[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (poly[i * 4 + 3] > 127) {
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (chroma <= key.chromaMax && Ln[i] >= key.lumMin && Ln[i] <= key.lumMax) inMask[i] = 1;
    }
  }

  // Локальне середнє яскравості по стіні (нормоване, щоб краї маски не темнили).
  const r = Math.max(3, Math.round(Math.min(w, h) * (conf.avgFrac || 0.02)));
  const lmMasked = new Float32Array(n);
  for (let i = 0; i < n; i++) lmMasked[i] = inMask[i] ? Ln[i] : 0;
  const blurL = boxBlur(lmMasked, w, h, r);
  const blurM = boxBlur(Float32Array.from(inMask), w, h, r);

  // «Тіловість» t: тіло цеглини світліше за локальне середнє, шов — темніший.
  const delta = conf.tDelta || 0.05;
  const t = new Float32Array(n);
  let brickSum = 0, brickCnt = 0, mortarSum = 0, mortarCnt = 0;
  for (let i = 0; i < n; i++) {
    if (!inMask[i]) continue;
    const local = blurM[i] > 0.02 ? blurL[i] / blurM[i] : Ln[i];
    const ti = smoothstep(-delta, delta, Ln[i] - local);
    t[i] = ti;
    if (ti > 0.6) { brickSum += Ln[i]; brickCnt++; }
    else if (ti < 0.4) { mortarSum += Ln[i]; mortarCnt++; }
  }
  const brickMean = brickCnt ? brickSum / brickCnt : 0.55;
  const mortarMean = mortarCnt ? mortarSum / mortarCnt : 0.4;

  // Попередньо: a = t·ratio, b = (1-t)·ratio; ratio = L / refL(матеріалу).
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (!inMask[i]) continue;
    const ref = Math.max(0.06, t[i] * brickMean + (1 - t[i]) * mortarMean);
    const ratio = clamp(Ln[i] / ref, 0, 1.55);
    a[i] = t[i] * ratio;
    b[i] = (1 - t[i]) * ratio;
  }

  // М'яка альфа краю маски.
  const soft = boxBlur(Float32Array.from(inMask), w, h, 1);
  const maskA = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) maskA[i] = soft[i] * 255;

  P.a = a; P.b = b; P.maskA = maskA;
  P.layer = document.createElement('canvas');
  P.layer.width = w; P.layer.height = h;
  P.layerKey = '';
}

function loadPhoto(P) {
  if (P.ready || P.loading || P.failed) return;
  P.loading = true;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      P.canvas = c; P.w = c.width; P.h = c.height;
      buildPhotoData(P);
      P.ready = true;
    } catch (e) {
      console.warn('Фото: не удалось подготовить слои', e);
      P.failed = true;
    }
    P.loading = false;
    syncUI(); scheduleRender(); maybeRunPendingExport();
  };
  img.onerror = () => {
    P.failed = true; P.loading = false;
    console.warn('Фото не загрузилось:', P.conf.src);
    syncUI(); scheduleRender(); maybeRunPendingExport();
  };
  img.src = P.conf.src;
}

// Перефарбований шар стіни для поточних кольорів (кешується за ключем).
function ensurePhotoLayer(P, st) {
  const key = [st.brick, st.joint, photoDebug ? 'dbg' : ''].join('|');
  if (P.layerKey === key) return P.layer;
  const { w, h, a, b, maskA } = P;
  const ctx = P.layer.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  if (photoDebug) {
    for (let i = 0; i < w * h; i++) { d[i * 4] = 255; d[i * 4 + 3] = maskA[i]; }
  } else {
    const [br, bg, bb] = hexToRgb(byId(BRICK_COLORS, st.brick).hex);
    const [mr, mg, mb] = hexToRgb(byId(JOINT_COLORS, st.joint).hex);
    for (let i = 0; i < w * h; i++) {
      const ai = a[i], bi = b[i];
      d[i * 4] = ai * br + bi * mr;
      d[i * 4 + 1] = ai * bg + bi * mg;
      d[i * 4 + 2] = ai * bb + bi * mb;
      d[i * 4 + 3] = maskA[i];
    }
  }
  ctx.putImageData(img, 0, 0);
  P.layerKey = key;
  return P.layer;
}

// Розмір елемента canvas під пропорції активного фото (whole photo, без обрізання).
function photoElementSize(P, boxW, boxH) {
  const aspect = P.w / P.h;
  let width = boxW, height = width / aspect;
  if (height > boxH) { height = boxH; width = height * aspect; }
  return { width: Math.round(width), height: Math.round(height) };
}

function renderPhoto(ctx, w, h, st) {
  const P = activePhoto();
  const layer = ensurePhotoLayer(P, st);
  ctx.drawImage(P.canvas, 0, 0, w, h);
  ctx.drawImage(layer, 0, 0, w, h);
}

/* ---------- UI ---------- */

const $ = (q) => document.querySelector(q);
const els = {
  wall: $('#wall'),
  modes: $('#modes'),
  photoPicker: $('#photoPicker'),
  caption: $('#caption'),
  patterns: $('#patterns'),
  brickSw: $('#brickSwatches'),
  brickSel: $('#brickSel'),
  jointSw: $('#jointSwatches'),
  jointSel: $('#jointSel'),
  save: $('#saveBtn'),
};

function buildPatterns() {
  for (const p of PATTERNS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pattern';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.dataset.id = p.id;
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'p-name';
    name.textContent = p.name;
    const sub = document.createElement('span');
    sub.className = 'p-sub';
    sub.textContent = p.sub;
    b.append(cv, name, sub);
    b.addEventListener('click', () => select('pattern', p.id));
    els.patterns.appendChild(b);
  }
}

function buildSwatches(container, list, key) {
  for (const c of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (luminance(c.hex) > 0.5 ? ' light' : '');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.setAttribute('aria-label', `${c.name} (${c.code})`);
    b.title = `${c.name} — ${c.code}`;
    b.dataset.id = c.id;
    b.style.setProperty('--c', c.hex);
    b.addEventListener('click', () => select(key, c.id));
    container.appendChild(b);
  }
}

function select(key, id) {
  if (state[key] === id) return;
  state[key] = id;
  saveState();
  haptic();
  syncUI();
  scheduleRender();
}

function buildPhotoPicker() {
  for (const p of PHOTOS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(p.id === state.photo));
    b.setAttribute('aria-label', p.name);
    b.dataset.id = p.id;
    b.style.backgroundImage = `url("${p.src}")`;
    const s = document.createElement('span');
    s.textContent = p.name;
    b.appendChild(s);
    b.addEventListener('click', () => selectPhoto(p.id));
    els.photoPicker.appendChild(b);
  }
}

function selectPhoto(id) {
  if (state.photo === id) return;
  state.photo = id;
  saveState();
  haptic();
  loadPhoto(photos[id]);
  syncUI();
  scheduleRender();
}

function syncUI() {
  const groups = [[els.modes, 'mode'], [els.photoPicker, 'photo'], [els.patterns, 'pattern'], [els.brickSw, 'brick'], [els.jointSw, 'joint']];
  for (const [container, key] of groups) {
    container.querySelectorAll('[role="radio"]').forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.id === state[key]));
    });
  }
  const allFailed = PHOTOS.every((p) => photos[p.id].failed);
  const photoBtn = els.modes.querySelector('[data-id="photo"]');
  photoBtn.disabled = allFailed;
  photoBtn.title = allFailed ? 'Фото недоступно' : '';
  document.body.classList.toggle('mode-photo', state.mode === 'photo' && !allFailed);
  const bc = byId(BRICK_COLORS, state.brick);
  const jc = byId(JOINT_COLORS, state.joint);
  els.brickSel.innerHTML = `<b>${bc.name}</b> · ${bc.code}`;
  els.jointSel.innerHTML = `<b>${jc.name}</b> · ${jc.code}`;
  if (state.mode === 'photo') {
    els.caption.textContent = `Кирпич: ${bc.name} · шов: ${jc.name}`;
  } else {
    els.caption.textContent = `${byId(PATTERNS, state.pattern).name} · кирпич: ${bc.name} · шов: ${jc.name}`;
  }
}

/* ---------- Отрисовка превью и миниатюр ---------- */

let raf = 0;
function scheduleRender() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; draw(); });
}

function sizeWallCanvas() {
  // В режиме фото canvas принимает пропорции активного снимка (фото целиком).
  if (photoModeActive()) {
    const P = activePhoto();
    const parent = els.wall.parentElement;
    const cs = getComputedStyle(parent);
    const boxW = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const boxH = Math.min(window.innerHeight * 0.52, 460);
    const s = photoElementSize(P, boxW, boxH);
    els.wall.style.width = s.width + 'px';
    els.wall.style.height = s.height + 'px';
  } else {
    els.wall.style.width = '';
    els.wall.style.height = '';
  }
}

function draw() {
  if (state.mode === 'photo') {
    const P = activePhoto();
    if (P && !P.ready && !P.failed) loadPhoto(P);
  }
  sizeWallCanvas();
  const main = fitCanvas(els.wall);
  if (main) {
    if (photoModeActive()) renderPhoto(main.ctx, main.w, main.h, state);
    else renderWall(main.ctx, main.w, main.h, state);
  }
  els.patterns.querySelectorAll('.pattern').forEach((btn) => {
    const cv = btn.querySelector('canvas');
    const t = fitCanvas(cv);
    if (t) renderWall(t.ctx, t.w, t.h, { ...state, pattern: btn.dataset.id }, { wallMM: 900 });
  });
}

/* ---------- Telegram Mini App ---------- */

const tg = (window.Telegram && window.Telegram.WebApp) || null;

function isTelegram() {
  return !!(tg && (tg.initData || (tg.platform && tg.platform !== 'unknown')));
}

function applyTgTheme() {
  if (!tg) return;
  const p = tg.themeParams || {};
  if (!Object.keys(p).length) return;
  const root = document.documentElement;
  root.classList.add('tg');
  const map = {
    bg_color: '--bg',
    secondary_bg_color: '--card',
    text_color: '--text',
    hint_color: '--muted',
    button_color: '--accent',
    button_text_color: '--accent-text',
  };
  for (const [k, v] of Object.entries(map)) if (p[k]) root.style.setProperty(v, p[k]);
  root.style.colorScheme = tg.colorScheme || 'light';
  try {
    if (p.bg_color) {
      if (tg.setHeaderColor) tg.setHeaderColor(p.bg_color);
      if (tg.setBackgroundColor) tg.setBackgroundColor(p.bg_color);
    }
  } catch (e) { /* старые клиенты */ }
}

function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (tg.disableVerticalSwipes && tg.isVersionAtLeast && tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes();
    applyTgTheme();
    if (tg.onEvent) tg.onEvent('themeChanged', applyTgTheme);
  } catch (e) { /* вне Telegram — игнорируем */ }
}

function haptic() {
  try { if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); } catch (e) { /* ignore */ }
}

/* ---------- Экспорт PNG ---------- */

function makeExportCanvas() {
  const W = 1600, bar = 150;
  const isPhoto = photoModeActive();
  const P = isPhoto ? activePhoto() : null;
  const wallH = isPhoto ? Math.round(P.h * (W / P.w)) : 850;
  const H = wallH + bar;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (isPhoto) {
    const layer = ensurePhotoLayer(P, state);
    ctx.drawImage(P.canvas, 0, 0, W, wallH);
    ctx.drawImage(layer, 0, 0, W, wallH);
  } else {
    renderWall(ctx, W, wallH, state, { wallMM: 2400 });
  }

  const p = byId(PATTERNS, state.pattern);
  const bc = byId(BRICK_COLORS, state.brick);
  const jc = byId(JOINT_COLORS, state.joint);

  ctx.fillStyle = '#141414';
  ctx.fillRect(0, H - bar, W, bar);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 32px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const title = isPhoto ? `Трафаретный кирпич · ${P.conf.name}` : `Трафаретный кирпич · ${p.name}`;
  ctx.fillText(title, 40, H - bar + 44);

  let x = 40;
  const cy = H - 46;
  const item = (label, col) => {
    ctx.fillStyle = col.hex;
    ctx.fillRect(x, cy - 20, 40, 40);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, cy - 19.5, 39, 39);
    x += 54;
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '26px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    const t = `${label}: ${col.name} (${col.code})`;
    ctx.fillText(t, x, cy);
    x += ctx.measureText(t).width + 44;
  };
  item('Кирпич', bc);
  item('Шов', jc);
  return c;
}

function showOverlay(blob, name) {
  const url = URL.createObjectURL(blob);
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', 'Результат');

  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Превью кладки';

  const hint = document.createElement('p');
  hint.textContent = 'Долгое нажатие на картинку → «Сохранить изображение»';

  const row = document.createElement('div');
  row.className = 'row';
  const dl = document.createElement('a');
  dl.href = url;
  dl.download = name;
  dl.className = 'primary';
  dl.textContent = 'Скачать PNG';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Закрыть';
  row.append(dl, close);

  ov.append(img, hint, row);
  const dismiss = () => { ov.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  close.addEventListener('click', dismiss);
  ov.addEventListener('click', (e) => { if (e.target === ov) dismiss(); });
  document.body.appendChild(ov);
}

function canWebShareFiles() {
  if (!navigator.canShare || typeof File === 'undefined') return false;
  try {
    return navigator.canShare({ files: [new File([new Blob()], 'x.png', { type: 'image/png' })] });
  } catch (e) { return false; }
}

async function makeExportBlob() {
  const c = makeExportCanvas();
  const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('toBlob failed');
  return blob;
}

function exportFileName() {
  return `fasad-${state.pattern}-${state.brick}-${state.joint}.png`;
}

// Отдаёт готовый PNG: системное «Поделиться» → скачивание → оверлей с картинкой.
async function deliverBlob(blob, name) {
  if (canWebShareFiles()) {
    const file = new File([blob], name, { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: 'Фасад — трафаретный кирпич' });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // пользователь отменил
    }
  }
  if ('download' in HTMLAnchorElement.prototype && !isTelegram()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    showOverlay(blob, name);
  }
}

// Ссылка на эту же страницу с текущим выбором — чтобы открыть её во внешнем браузере из Telegram.
function exportUrl() {
  const u = new URL(location.href);
  u.hash = '';
  u.search = '';
  for (const k of ['mode', 'photo', 'pattern', 'brick', 'joint']) u.searchParams.set(k, state[k]);
  u.searchParams.set('export', '1');
  return u.toString();
}

async function exportPNG() {
  els.save.disabled = true;
  try {
    // Внутри Telegram нет Web Share, а скачивание blob-файлов WebView блокирует:
    // открываем страницу во внешнем браузере, там сработает системное «Поделиться».
    if (isTelegram() && !canWebShareFiles() && tg.openLink) {
      tg.openLink(exportUrl());
      return;
    }
    await deliverBlob(await makeExportBlob(), exportFileName());
  } catch (e) {
    console.error(e);
    alert('Не удалось подготовить картинку. Попробуйте ещё раз.');
  } finally {
    els.save.disabled = false;
  }
}

// Страница открыта по ссылке с ?export=1 (из Telegram): показываем готовую картинку
// и кнопку сохранения — «Поделиться» браузер разрешает только по жесту пользователя.
async function showExportPrompt() {
  const blob = await makeExportBlob();
  const name = exportFileName();
  const url = URL.createObjectURL(blob);
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', 'Сохранение картинки');

  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Превью кладки';
  const hint = document.createElement('p');
  hint.textContent = 'Картинка готова. Нажмите, чтобы сохранить или отправить.';
  const row = document.createElement('div');
  row.className = 'row';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'primary';
  save.textContent = 'Сохранить / Поделиться';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Закрыть';
  row.append(save, close);
  ov.append(img, hint, row);

  const dismiss = () => { ov.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  save.addEventListener('click', async () => {
    save.disabled = true;
    try { await deliverBlob(blob, name); } catch (e) { console.error(e); } finally { save.disabled = false; }
  });
  close.addEventListener('click', dismiss);
  document.body.appendChild(ov);
}

let pendingExport = false;

// Состояние из адреса (?mode=&pattern=&brick=&joint=&export=1). Возвращает true, если нужно сразу показать экспорт.
function applyUrlState() {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return false;
  const lists = { pattern: PATTERNS, brick: BRICK_COLORS, joint: JOINT_COLORS };
  if (MODES.includes(q.get('mode'))) state.mode = q.get('mode');
  if (PHOTOS.some((p) => p.id === q.get('photo'))) state.photo = q.get('photo');
  for (const [k, list] of Object.entries(lists)) if (byId(list, q.get(k))) state[k] = q.get(k);
  saveState();
  const wantsExport = q.get('export') === '1';
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
  return wantsExport;
}

function maybeRunPendingExport() {
  if (!pendingExport) return;
  const P = activePhoto();
  if (state.mode === 'photo' && P && !P.ready && !P.failed) return; // ждём фото
  pendingExport = false;
  draw();
  showExportPrompt().catch((e) => console.error(e));
}

/* ---------- Инициализация ---------- */

function init() {
  buildPatterns();
  buildSwatches(els.brickSw, BRICK_COLORS, 'brick');
  buildSwatches(els.jointSw, JOINT_COLORS, 'joint');
  els.modes.querySelectorAll('[role="radio"]').forEach((b) => b.addEventListener('click', () => select('mode', b.dataset.id)));
  buildPhotoPicker();
  pendingExport = applyUrlState();
  syncUI();
  initTelegram();
  loadPhoto(activePhoto());
  els.save.addEventListener('click', exportPNG);
  maybeRunPendingExport();
  // Наблюдаем за контейнером, а не за canvas: его размер мы меняем сами (иначе цикл).
  if ('ResizeObserver' in window) new ResizeObserver(scheduleRender).observe(els.wall.parentElement);
  window.addEventListener('resize', scheduleRender);
  window.addEventListener('orientationchange', scheduleRender);
  scheduleRender();
}

init();

// Для отладки в консоли: перекрасочная модель по фото.
window.facade = {
  state, draw, renderWall, makeExportCanvas, PATTERNS, BRICK_COLORS, JOINT_COLORS, PHOTOS, photos,
  active: activePhoto,
  // photoDebug(true) подсвечивает маску активного фото красным — для подбора полигонов/порогов.
  photoDebug(on) { photoDebug = !!on; Object.values(photos).forEach((p) => { p.layerKey = ''; }); scheduleRender(); },
  // Пересобрать данные активного фото после правки conf (regions/holes/key/avgFrac/tDelta) из консоли.
  rebuild() { const p = activePhoto(); if (p && p.canvas) { buildPhotoData(p); scheduleRender(); } },
};
