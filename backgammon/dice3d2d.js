/**
 * dice3d2d.js — 3D-in-2D Orthographic Die Engine & Base-38 Time Ident System
 * Night0WL CameLcase Architecture • Twisted23 Parlour Lounge
 * Live Base-38: https://base38.now62.com/ (T0UX = 1584540571, Charset 38 with | and ^)
 */

export const T0UX = 1584540571;
export const BASE38_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz|^";

export function getBase38TimeIdent(epochSec) {
  const sec = epochSec !== undefined ? epochSec : Math.floor(Date.now() / 1000);
  let rel = sec - T0UX;
  if (rel <= 0) return "0";
  let s = "";
  while (rel > 0) {
    s = BASE38_CHARSET[rel % 38] + s;
    rel = Math.floor(rel / 38);
  }
  return s;
}

export function SLog(...args) {
  console.log('🐸 [SLog]', ...args);
}

export const DIRECTIONS = {
  STOP: 'S',
  RIGHT: 'R',
  LEFT: 'L',
  UP: 'U',
  DOWN: 'D'
};

// All 24 valid Top-Front (TF) combinations for a right-handed standard die
export const VALID_TFS = [
  12, 13, 14, 15,
  21, 23, 24, 26,
  31, 32, 35, 36,
  41, 42, 45, 46,
  51, 53, 54, 56,
  62, 63, 64, 65
];

// Helper to calculate Right face given Top (T) and Front (F)
function getRightFace(t, f) {
  // Standard right-handed die cycle for each top
  const rightMap = {
    '1': { '2': 4, '3': 2, '4': 5, '5': 3 },
    '2': { '1': 3, '3': 6, '4': 1, '6': 4 },
    '3': { '1': 5, '2': 1, '5': 6, '6': 2 },
    '4': { '1': 2, '2': 6, '5': 1, '6': 5 },
    '5': { '1': 4, '3': 1, '4': 6, '6': 3 },
    '6': { '2': 3, '3': 5, '4': 2, '5': 4 }
  };
  return rightMap[t] ? rightMap[t][f] || 3 : 3;
}

export function getEndTF(currentTF, direction) {
  const t = Math.floor(currentTF / 10);
  const f = currentTF % 10;
  const b = 7 - f; // Back
  const d = 7 - t; // Down / Bottom
  const r = getRightFace(t, f);
  const l = 7 - r; // Left

  let newT = t;
  let newF = f;

  switch (direction) {
    case DIRECTIONS.UP:
      newT = f;
      newF = d;
      break;
    case DIRECTIONS.DOWN:
      newT = b;
      newF = t;
      break;
    case DIRECTIONS.LEFT:
      newT = r;
      newF = f;
      break;
    case DIRECTIONS.RIGHT:
      newT = l;
      newF = f;
      break;
    default:
      return currentTF;
  }
  return newT * 10 + newF;
}

// Draw standard die pips on a 2D canvas context
function drawPips(ctx, val, x, y, size, dotColor = '#0f172a') {
  ctx.fillStyle = dotColor;
  const r = size * 0.085;
  const p1 = size * 0.25;
  const p2 = size * 0.50;
  const p3 = size * 0.75;

  const dot = (px, py) => {
    ctx.beginPath();
    ctx.arc(x + px, y + py, r, 0, Math.PI * 2);
    ctx.fill();
  };

  if (val === 1) {
    dot(p2, p2);
  } else if (val === 2) {
    dot(p1, p1); dot(p3, p3);
  } else if (val === 3) {
    dot(p1, p1); dot(p2, p2); dot(p3, p3);
  } else if (val === 4) {
    dot(p1, p1); dot(p3, p1);
    dot(p1, p3); dot(p3, p3);
  } else if (val === 5) {
    dot(p1, p1); dot(p3, p1);
    dot(p2, p2);
    dot(p1, p3); dot(p3, p3);
  } else if (val === 6) {
    dot(p1, p1); dot(p3, p1);
    dot(p1, p2); dot(p3, p2);
    dot(p1, p3); dot(p3, p3);
  }
}

export function renderDie2D(ctx, opts) {
  const {
    x = 0,
    y = 0,
    size = 80,
    tf = 12,
    direction = DIRECTIONS.STOP,
    angleDeg = 0,
    showOrientationCompass = true
  } = opts;

  const topVal = Math.floor(tf / 10);
  const frontVal = tf % 10;

  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);

  // Subtle dynamic squash/stretch during flip
  let scaleX = 1;
  let scaleY = 1;
  if (angleDeg > 0 && angleDeg < 90) {
    const rad = (angleDeg * Math.PI) / 180;
    if (direction === DIRECTIONS.LEFT || direction === DIRECTIONS.RIGHT) {
      scaleX = Math.abs(Math.cos(rad));
    } else if (direction === DIRECTIONS.UP || direction === DIRECTIONS.DOWN) {
      scaleY = Math.abs(Math.cos(rad));
    }
  }
  ctx.scale(scaleX, scaleY);

  // Die body background
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;
  const radius = size * 0.18;
  const hs = size / 2;

  ctx.beginPath();
  ctx.roundRect(-hs, -hs, size, size, radius);
  ctx.fill();

  // Reset shadow for borders & pips
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  // Subtle 3D edge gloss
  const grad = ctx.createLinearGradient(-hs, -hs, hs, hs);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Render top face pips (red for 1, black/navy for others)
  const pipColor = topVal === 1 ? '#dc2626' : '#0f172a';
  drawPips(ctx, topVal, -hs, -hs, size, pipColor);

  // Orientation compass badge (displays Front face orientation in tiny discreet text)
  if (showOrientationCompass && scaleX > 0.8 && scaleY > 0.8) {
    ctx.fillStyle = '#64748b';
    ctx.font = `bold ${Math.max(9, Math.floor(size * 0.12))}px ui-monospace, SFMono-Regular, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`F:${frontVal}`, 0, hs - 4);
  }

  ctx.restore();
}
