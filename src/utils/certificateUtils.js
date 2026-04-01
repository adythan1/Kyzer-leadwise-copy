// src/utils/certificateUtils.js
// Certificate utility functions for better code organization

import leadwiseLogoUrl from '@/assets/images/leadwise.svg';
import { getBaseURL } from '@/lib/supabase';

/**
 * Public page URL for viewing a certificate (no login). Requires {@link share_token} on the row and RPC `get_certificate_by_share_token`.
 * @param {string} shareToken
 * @returns {string | null}
 */
export function buildCertificateShareLink(shareToken) {
  if (!shareToken || typeof shareToken !== 'string') {
    return null;
  }
  const trimmed = shareToken.trim();
  if (!trimmed) {
    return null;
  }
  const base = String(getBaseURL()).replace(/\/$/, '');
  return `${base}/c/${encodeURIComponent(trimmed)}`;
}

/** Leadwise wordmark (`leadwise.svg`): `.st0` navy, `.st1` orange */
export const LEADWISE_BRAND_NAVY = '#002654';
export const LEADWISE_BRAND_ORANGE = '#F7841C';

/** Gallery certificate: logo-navy frame, white panel, brand-orange accent bar */
export const GALLERY_CERT_COLORS = {
  frame: LEADWISE_BRAND_NAVY,
  accentBar: LEADWISE_BRAND_ORANGE,
  recipient: LEADWISE_BRAND_NAVY,
};

/**
 * Rejects obvious invalid sources before assigning img.src (avoids net::ERR_INVALID_URL noise).
 * @param {string} src
 * @returns {boolean}
 */
export function isPlausibleCertificateImageSrc(src) {
  const s = String(src).trim();
  if (!s) return false;
  if (s.startsWith('blob:')) return true;
  if (s.startsWith('data:')) {
    const comma = s.indexOf(',');
    if (comma <= 4) return false;
    return comma < s.length - 1;
  }
  if (typeof URL !== 'undefined' && typeof URL.canParse === 'function') {
    const hasScheme = /^[a-zA-Z][a-zA-Z+\-.]*:/.test(s);
    if (hasScheme && !URL.canParse(s)) return false;
  }
  return true;
}

/**
 * Loads an image for certificate rendering (logo). Resolves null on failure.
 * @param {string} src
 * @returns {Promise<HTMLImageElement | null>}
 */
export function loadCertificateImage(src) {
  if (!src || !isPlausibleCertificateImageSrc(src)) return Promise.resolve(null);
  const trimmed = String(src).trim();
  return new Promise((resolve) => {
    const img = new Image();
    // crossOrigin breaks many data: and blob: URLs in canvas/logo loading (invalid URL / tainted canvas)
    if (!/^data:|^blob:/i.test(trimmed)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = trimmed;
  });
}

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Normalizes a user-supplied hex color for canvas/CSS. Returns fallback if invalid.
 * @param {string | null | undefined} value
 * @param {string | null} [fallback]
 * @returns {string | null}
 */
export function sanitizeHexColor(value, fallback = null) {
  if (value == null || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return fallback;
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.length === 9
    ? trimmed.toLowerCase()
    : trimmed.slice(0, 7).toLowerCase();
}

/**
 * @param {Record<string, unknown> | null | undefined} themeColors
 * @returns {Record<string, string>}
 */
export function normalizeThemeColorsPartial(themeColors) {
  const out = {};
  if (!themeColors || typeof themeColors !== 'object') return out;
  const keys = ['primary', 'secondary', 'accent', 'background', 'text'];
  for (const k of keys) {
    const v = sanitizeHexColor(
      typeof themeColors[k] === 'string' ? themeColors[k] : null,
      null
    );
    if (v) out[k] = v;
  }
  return out;
}

/**
 * Strips invalid keys; returns null when nothing to persist.
 * @param {Record<string, unknown> | null | undefined} themeColors
 * @returns {Record<string, string> | null}
 */
export function cleanThemeColorsForPersistence(themeColors) {
  const n = normalizeThemeColorsPartial(themeColors);
  return Object.keys(n).length > 0 ? n : null;
}

/**
 * Draws the Leadwise gallery-style certificate (canvas).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Record<string, string>} data - certificate_data fields
 * @param {{ logo_url?: string | null, logo_position?: string, theme_colors?: Record<string, string> }} [template]
 */
export async function drawGalleryCertificate(ctx, width, height, data, template = {}) {
  const custom = normalizeThemeColorsPartial(template.theme_colors);
  const FRAME = custom.primary ?? GALLERY_CERT_COLORS.frame;
  const accentBar = custom.accent ?? GALLERY_CERT_COLORS.accentBar;
  const recipientColor = custom.secondary ?? GALLERY_CERT_COLORS.recipient;
  const panelBg = custom.background ?? '#ffffff';
  const headline = custom.text ?? '#111827';
  const pad = 12;
  const innerPad = 16;
  const radii = [8, 8, 36, 8];

  ctx.fillStyle = FRAME;
  ctx.fillRect(0, 0, width, height);

  const ix = pad;
  const iy = pad;
  const iw = width - pad * 2;
  const ih = height - pad * 2;

  ctx.fillStyle = panelBg;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(ix, iy, iw, ih, radii);
    ctx.fill();
  } else {
    ctx.fillRect(ix, iy, iw, ih);
  }

  const cx = ix + innerPad;
  let cy = iy + innerPad;
  const cw = iw - innerPad * 2;

  ctx.save();
  ctx.fillStyle = 'rgba(229, 231, 235, 0.9)';
  ctx.font = 'bold 240px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('L', ix + iw / 2, iy + ih / 2);
  ctx.restore();

  const customLogo = template?.logo_url ? sanitizeTemplateUrl(template.logo_url) : null;
  const logoSrc = customLogo || leadwiseLogoUrl;
  const logoImg = await loadCertificateImage(logoSrc);
  if (logoImg) {
    const targetH = 28;
    const scale = targetH / logoImg.height;
    const targetW = logoImg.width * scale;
    ctx.drawImage(logoImg, cx, cy, targetW, targetH);
    cy += targetH + 6;
  } else {
    cy += 4;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = headline;
  ctx.font = '600 10px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(data.organization_name || 'Leadwise Academy', cx, cy);
  cy += 16;

  ctx.fillStyle = '#6b7280';
  ctx.font = '600 11px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Verified certificate of course completion', cx, cy);
  cy += 22;

  ctx.fillStyle = headline;
  const titleFont = 'bold 22px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.font = titleFont;
  const courseTitle = data.course_title || 'Course';
  const titleLayout = calculateTextLayout(courseTitle, cw - 8, titleFont);
  titleLayout.lines.forEach((line, index) => {
    ctx.fillText(line, cx, cy + index * titleLayout.lineHeight);
  });
  cy += titleLayout.totalHeight + 14;

  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + cw - 8, cy);
  ctx.stroke();
  cy += 16;

  ctx.fillStyle = '#6b7280';
  ctx.font = '600 11px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Awarded to', cx, cy);
  cy += 18;

  ctx.fillStyle = recipientColor;
  ctx.font = 'bold 17px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  const recipient = data.user_name || 'Learner';
  const nameLayout = calculateTextLayout(recipient, cw - 8, 'bold 17px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif');
  nameLayout.lines.forEach((line, index) => {
    ctx.fillText(line, cx, cy + index * nameLayout.lineHeight);
  });
  cy += nameLayout.totalHeight + 12;

  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 10px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  const issueLine =
    data.issue_date || data.completion_date
      ? `Issued ${data.issue_date || data.completion_date}`
      : '';
  if (issueLine) {
    ctx.fillText(issueLine, cx, cy);
    cy += 16;
  }

  if (data.certificate_id) {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 9px ui-monospace, monospace';
    ctx.fillText(String(data.certificate_id), cx, cy);
  }

  const barH = 8;
  ctx.fillStyle = accentBar;
  ctx.fillRect(0, height - barH, width, barH);
}

/** Landscape “formal / medical-style” palette: deep navy + teal accents (inspired by classic certificate layouts). */
export const FORMAL_CERT_NAVY = '#0c2844';
export const FORMAL_CERT_TEAL = '#0d9488';

function drawFormalCornerTriangles(ctx, width, height, navy, teal) {
  ctx.save();
  const fillTri = (x0, y0, x1, y1, x2, y2, color, alpha) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  };
  fillTri(width, 0, width - 260, 0, width, 220, navy, 0.92);
  fillTri(width, 0, width - 140, 28, width, 150, teal, 0.88);
  fillTri(width - 70, 0, width - 220, 110, width - 24, 150, navy, 0.5);
  fillTri(0, height, 260, height, 0, height - 220, navy, 0.92);
  fillTri(0, height, 140, height - 28, 0, height - 150, teal, 0.88);
  fillTri(70, height, 220, height - 110, 24, height - 150, navy, 0.5);
  ctx.restore();
}

/**
 * Formal landscape certificate: off-white field, geometric navy/teal corners, serif + script typography.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Record<string, string>} data
 * @param {{ logo_url?: string | null, logo_position?: string, theme_colors?: Record<string, string> }} [template]
 */
export async function drawFormalCertificate(ctx, width, height, data, template = {}) {
  const custom = normalizeThemeColorsPartial(template.theme_colors);
  const navy = custom.primary ?? FORMAL_CERT_NAVY;
  const teal = custom.secondary ?? FORMAL_CERT_TEAL;
  const bg = custom.background ?? '#f3f4f2';
  const greyBody = custom.text ?? '#4b5563';
  const greyMuted = '#9ca3af';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  drawFormalCornerTriangles(ctx, width, height, navy, teal);

  const pad = 48;
  const cx = width / 2;

  const customLogo = template?.logo_url ? sanitizeTemplateUrl(template.logo_url) : null;
  const logoSrc = customLogo || leadwiseLogoUrl;
  const logoImg = await loadCertificateImage(logoSrc);

  let headerTextY = pad;
  if (logoImg) {
    const lh = 42;
    const sc = lh / logoImg.height;
    const lw = logoImg.width * sc;
    ctx.drawImage(logoImg, pad, pad, lw, lh);
    headerTextY = pad + lh + 10;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = navy;
  ctx.font = 'bold 16px "Times New Roman", Times, Georgia, serif';
  ctx.fillText(data.organization_name || 'Organization', pad, headerTextY);
  ctx.fillStyle = greyMuted;
  ctx.font = '11px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('Verified training completion', pad, headerTextY + 22);

  let y = height * 0.26;
  ctx.textAlign = 'center';
  ctx.fillStyle = navy;
  ctx.font = 'bold 24px "Times New Roman", Times, Georgia, serif';
  ctx.fillText('CERTIFICATE OF COMPLETION', cx, y);
  y += 40;
  ctx.fillStyle = greyBody;
  ctx.font = '13px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('This is to certify that', cx, y);
  y += 32;

  const scriptFont = 'normal 42px "Great Vibes", "Brush Script MT", "Apple Chancery", cursive';
  ctx.fillStyle = navy;
  ctx.font = scriptFont;
  const recipient = data.user_name || 'Recipient';
  const nameLayout = calculateTextLayout(recipient, width * 0.72, scriptFont);
  nameLayout.lines.forEach((line, index) => {
    ctx.fillText(line, cx, y + index * nameLayout.lineHeight);
  });
  y += nameLayout.totalHeight + 16;

  ctx.strokeStyle = greyMuted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 200, y);
  ctx.lineTo(cx + 200, y);
  ctx.stroke();
  y += 28;

  const course = data.course_title || 'Course';
  const completion = data.completion_date || '';
  const instructor = data.instructor_name || '';
  const bodyParts = [
    `This certifies that the above named participant has successfully completed the program "${course}"`,
  ];
  if (completion) bodyParts.push(`on ${completion}.`);
  else bodyParts.push('.');
  if (instructor) bodyParts.push(` Presented by ${instructor}.`);
  const body = bodyParts.join('');
  ctx.fillStyle = greyBody;
  const bodyFont = '14px Inter, system-ui, -apple-system, sans-serif';
  ctx.font = bodyFont;
  const bodyLayout = calculateTextLayout(body, width - pad * 4, bodyFont);
  bodyLayout.lines.forEach((line, index) => {
    ctx.fillText(line, cx, y + index * bodyLayout.lineHeight);
  });

  const footLineY = height - 72;
  ctx.strokeStyle = navy;
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = navy;
  ctx.font = 'italic 13px "Times New Roman", Times, Georgia, serif';
  const instructorLine = instructor.trim() || '—';
  ctx.fillText(instructorLine, width * 0.24, footLineY - 4);
  const dateLine = (data.issue_date || data.completion_date || '').trim() || '—';
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.fillText(dateLine, width * 0.76, footLineY - 4);
  ctx.beginPath();
  ctx.moveTo(width * 0.24 - 88, footLineY);
  ctx.lineTo(width * 0.24 + 88, footLineY);
  ctx.moveTo(width * 0.76 - 88, footLineY);
  ctx.lineTo(width * 0.76 + 88, footLineY);
  ctx.stroke();
  ctx.textBaseline = 'top';
  ctx.fillStyle = navy;
  ctx.font = 'bold 10px "Times New Roman", Times, Georgia, serif';
  ctx.fillText('INSTRUCTOR', width * 0.24, footLineY + 6);
  ctx.fillText('DATE', width * 0.76, footLineY + 6);

  if (data.certificate_id) {
    ctx.font = '500 9px ui-monospace, monospace';
    ctx.fillStyle = greyMuted;
    ctx.textAlign = 'center';
    ctx.fillText(String(data.certificate_id), cx, height - 14);
  }
}

/** Achievement template palette (green / orange / cream / gold). */
export const ACHIEVEMENT_GREEN = '#003D2B';
export const ACHIEVEMENT_ORANGE = '#F15A24';
export const ACHIEVEMENT_CREAM = '#FEF9F1';
export const ACHIEVEMENT_GOLD = '#F9E076';
export const ACHIEVEMENT_INK = '#1A1A1A';

function drawAchievementWavesTR(ctx, width, height, green, orange) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width - 300, 0);
  ctx.bezierCurveTo(width - 180, height * 0.06, width - 220, height * 0.16, width - 80, height * 0.22);
  ctx.bezierCurveTo(width - 20, height * 0.18, width, height * 0.12, width, 0);
  ctx.closePath();
  ctx.fillStyle = green;
  ctx.globalAlpha = 1;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width - 150, 0);
  ctx.bezierCurveTo(width - 80, height * 0.05, width - 140, height * 0.12, width - 40, height * 0.18);
  ctx.bezierCurveTo(width - 8, height * 0.12, width, height * 0.06, width, 0);
  ctx.closePath();
  ctx.fillStyle = orange;
  ctx.globalAlpha = 0.96;
  ctx.fill();
  ctx.restore();
}

function drawAchievementWavesBL(ctx, width, height, green, orange) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(300, height);
  ctx.bezierCurveTo(180, height - height * 0.06, 220, height - height * 0.16, 80, height - height * 0.22);
  ctx.bezierCurveTo(20, height - height * 0.18, 0, height - height * 0.12, 0, height);
  ctx.closePath();
  ctx.fillStyle = green;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(150, height);
  ctx.bezierCurveTo(80, height - height * 0.05, 140, height - height * 0.12, 40, height - height * 0.18);
  ctx.bezierCurveTo(8, height - height * 0.12, 0, height - height * 0.06, 0, height);
  ctx.closePath();
  ctx.fillStyle = orange;
  ctx.globalAlpha = 0.96;
  ctx.fill();
  ctx.restore();
}

function drawAchievementSeal(ctx, cx, cy, outerR, orange, ink) {
  const spikes = 32;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= spikes * 2; i++) {
    const t = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR : outerR * 0.86;
    const x = cx + Math.cos(t) * r;
    const y = cy + Math.sin(t) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = orange;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, outerR * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 8px Inter, system-ui, sans-serif';
  const star = '★';
  ctx.fillText(`${star} ${star} ${star}`, cx, cy - 18);
  ctx.font = 'bold 10px Inter, system-ui, sans-serif';
  ctx.fillText('COMPLETION', cx, cy - 2);
  ctx.font = 'bold 9px Inter, system-ui, sans-serif';
  ctx.fillText('AWARD', cx, cy + 12);
  ctx.font = 'bold 8px Inter, system-ui, sans-serif';
  ctx.fillText(`${star} ${star} ${star}`, cx, cy + 24);
  ctx.restore();
  const ribbonW = 16;
  const ribbonH = 38;
  ctx.fillStyle = '#2d2d2d';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + outerR - 4);
  ctx.lineTo(cx - 8 - ribbonW, cy + outerR + ribbonH);
  ctx.lineTo(cx - 4, cy + outerR + ribbonH - 10);
  ctx.lineTo(cx, cy + outerR + 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 8, cy + outerR - 4);
  ctx.lineTo(cx + 8 + ribbonW, cy + outerR + ribbonH);
  ctx.lineTo(cx + 4, cy + outerR + ribbonH - 10);
  ctx.lineTo(cx, cy + outerR + 6);
  ctx.closePath();
  ctx.fill();
}

/**
 * Landscape “Certificate of Achievement” style: cream field, green/orange waves, gold frame, award seal.
 */
export async function drawAchievementCertificate(ctx, width, height, data, template = {}) {
  const custom = normalizeThemeColorsPartial(template.theme_colors);
  const green = custom.primary ?? ACHIEVEMENT_GREEN;
  const orange = custom.secondary ?? ACHIEVEMENT_ORANGE;
  const gold = custom.accent ?? ACHIEVEMENT_GOLD;
  const cream = custom.background ?? ACHIEVEMENT_CREAM;
  const ink = custom.text ?? ACHIEVEMENT_INK;

  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, width, height);
  drawAchievementWavesTR(ctx, width, height, green, orange);
  drawAchievementWavesBL(ctx, width, height, green, orange);

  const frameInset = 18;
  ctx.strokeStyle = gold;
  ctx.lineWidth = 5;
  ctx.strokeRect(frameInset, frameInset, width - frameInset * 2, height - frameInset * 2);

  const pad = 40;
  const contentRight = width * 0.58;

  const customLogo = template?.logo_url ? sanitizeTemplateUrl(template.logo_url) : null;
  const logoSrc = customLogo || leadwiseLogoUrl;
  const logoImg = await loadCertificateImage(logoSrc);

  let headerY = pad + 8;
  if (logoImg) {
    const lh = 36;
    const sc = lh / logoImg.height;
    const lw = logoImg.width * sc;
    ctx.drawImage(logoImg, pad, headerY, lw, lh);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = ink;
    ctx.font = 'bold 14px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText((data.organization_name || 'COMPANY NAME').toUpperCase(), pad, headerY + lh + 8);
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;
    ctx.font = 'bold 14px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText((data.organization_name || 'COMPANY NAME').toUpperCase(), pad, headerY);
  }

  let y = height * 0.22;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = ink;
  ctx.font = 'bold 46px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('Certificate', pad, y);
  y += 52;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(pad + 220, y);
  ctx.stroke();
  y += 16;
  ctx.font = 'bold 13px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('OF ACHIEVEMENT', pad, y);
  y += 28;
  ctx.font = '11px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('THIS CERTIFICATE IS PRESENTED TO', pad, y);
  y += 28;
  ctx.fillStyle = orange;
  ctx.font = 'bold 26px Inter, system-ui, -apple-system, sans-serif';
  const recipient = data.user_name || 'Name Surname';
  const nameFont = 'bold 26px Inter, system-ui, -apple-system, sans-serif';
  const nameLayout = calculateTextLayout(recipient, contentRight - pad, nameFont);
  nameLayout.lines.forEach((line, i) => {
    ctx.fillText(line, pad, y + i * nameLayout.lineHeight);
  });
  y += nameLayout.totalHeight + 12;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(Math.min(pad + 280, contentRight - 20), y);
  ctx.stroke();
  y += 20;

  const course = data.course_title || 'the training program';
  const completion = data.completion_date || data.issue_date || '';
  const instructor = data.instructor_name || '';
  const body = `For outstanding completion of "${course}".` +
    (completion ? ` Completed on ${completion}.` : ' ') +
    (instructor ? ` Recognized by ${instructor}.` : ' This credential verifies your achievement with our organization.');
  ctx.fillStyle = ink;
  const bodyFont = '13px Inter, system-ui, -apple-system, sans-serif';
  ctx.font = bodyFont;
  const bodyLayout = calculateTextLayout(body, contentRight - pad - 8, bodyFont);
  bodyLayout.lines.forEach((line, i) => {
    ctx.fillText(line, pad, y + i * bodyLayout.lineHeight);
  });

  const sealX = width * 0.78;
  const sealY = height * 0.36;
  drawAchievementSeal(ctx, sealX, sealY, 76, orange, ink);

  const footY = height - 58;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const dateStr = (data.issue_date || data.completion_date || new Date().toLocaleDateString()).toUpperCase();
  ctx.fillStyle = ink;
  ctx.font = '11px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText(dateStr, width * 0.22, footY);
  ctx.font = 'italic 14px "Brush Script MT", "Segoe Script", cursive';
  ctx.fillText(instructor || ' ', width * 0.78, footY);
  ctx.beginPath();
  ctx.moveTo(width * 0.22 - 90, footY + 2);
  ctx.lineTo(width * 0.22 + 90, footY + 2);
  ctx.moveTo(width * 0.78 - 90, footY + 2);
  ctx.lineTo(width * 0.78 + 90, footY + 2);
  ctx.stroke();
  ctx.textBaseline = 'top';
  ctx.font = 'bold 10px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = ink;
  ctx.fillText('DATE', width * 0.22, footY + 8);
  ctx.fillText('SIGNATURE', width * 0.78, footY + 8);

  if (data.certificate_id) {
    ctx.font = '500 9px ui-monospace, monospace';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText(String(data.certificate_id), width / 2, height - 12);
  }
}

/**
 * Canvas pixel size per theme (formal is wider landscape).
 * @param {string} theme
 * @returns {{ width: number, height: number }}
 */
export function getCertificateCanvasDimensions(theme = 'gallery') {
  if (theme === 'formal' || theme === 'achievement') {
    return { width: 960, height: 640 };
  }
  return { width: 800, height: 600 };
}

/**
 * Renders a full certificate onto a 2D canvas (gallery or legacy theme).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {string} theme
 * @param {Record<string, string>} placeholderData
 * @param {{ logo_url?: string | null, logo_position?: string, showWatermark?: boolean, theme_colors?: Record<string, string> }} [template]
 */
export async function renderCertificateCanvas(ctx, width, height, theme, placeholderData, template = {}) {
  const resolvedTheme = theme || 'gallery';
  const showWatermark = template.showWatermark !== false;

  if (resolvedTheme === 'gallery') {
    await drawGalleryCertificate(ctx, width, height, placeholderData, template);
    return;
  }

  if (resolvedTheme === 'formal') {
    await drawFormalCertificate(ctx, width, height, placeholderData, template);
    return;
  }

  if (resolvedTheme === 'achievement') {
    await drawAchievementCertificate(ctx, width, height, placeholderData, template);
    return;
  }

  const themeConfig = CERTIFICATE_THEMES[resolvedTheme] || CERTIFICATE_THEMES.classic;
  const customBg = normalizeThemeColorsPartial(template.theme_colors).background;
  ctx.fillStyle = customBg ?? themeConfig.colors.background;
  ctx.fillRect(0, 0, width, height);

  drawCertificateBorder(ctx, width, height, resolvedTheme, template);
  if (showWatermark) {
    drawWatermark(ctx, width, height);
  }

  const sanitizedLogoUrl = template?.logo_url ? sanitizeTemplateUrl(template.logo_url) : null;
  if (sanitizedLogoUrl) {
    const logoImg = await loadCertificateImage(sanitizedLogoUrl);
    if (logoImg) {
      drawLogo(ctx, logoImg, template.logo_position || 'top-left', width, height);
    }
  }

  const orgName = placeholderData.organization_name || 'Leadwise Academy';
  const orgStyles = getFontStyles(resolvedTheme, 'small', template);
  ctx.fillStyle = orgStyles.fillStyle;
  ctx.textAlign = 'center';
  const orgSizeMatch = orgStyles.font.match(/(\d+)px/);
  const orgSize = orgSizeMatch ? orgSizeMatch[1] : '11';
  const orgFamilyMatch = orgStyles.font.match(/px\s+(.+)$/);
  const orgFamily = orgFamilyMatch ? orgFamilyMatch[1] : 'sans-serif';
  ctx.font = `bold ${orgSize}px ${orgFamily}`;
  ctx.fillText(orgName, width / 2, height * 0.12);

  const titleStyles = getFontStyles(resolvedTheme, 'title', template);
  ctx.fillStyle = titleStyles.fillStyle;
  ctx.textAlign = 'center';
  ctx.font = titleStyles.font;
  ctx.fillText('Certificate of Completion', width / 2, height * 0.3);

  const positions = getDefaultPlaceholderPositions(width, height, resolvedTheme);

  Object.keys(positions).forEach((placeholder) => {
    if (placeholder === '{{organization_name}}') return;

    const position = positions[placeholder];
    const textType = position.textType || 'body';
    const key = placeholder.replace(/[{}]/g, '');
    const value = placeholderData[key];

    if (value) {
      const fontStyles = getFontStyles(resolvedTheme, textType, template);
      ctx.fillStyle = fontStyles.fillStyle;
      ctx.textAlign = fontStyles.textAlign;
      ctx.font = fontStyles.font;

      const maxWidth = width * 0.8;
      const textLayout = calculateTextLayout(String(value), maxWidth, fontStyles.font);
      textLayout.lines.forEach((line, index) => {
        const y = position.y + index * textLayout.lineHeight;
        ctx.fillText(line, position.x, y);
      });
    }
  });
}

/**
 * Validates certificate template data
 * @param {Object} templateData - The template data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export const validateCertificateTemplate = (templateData, { hasUploadedFile = false } = {}) => {
  const errors = [];

  if (!templateData.name?.trim()) {
    errors.push('Template name is required');
  }

  if (!templateData.template_url?.trim() && !hasUploadedFile) {
    errors.push('Template image is required');
  }

  if (templateData.name && templateData.name.length > 255) {
    errors.push('Template name must be less than 255 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generates a unique certificate ID
 * @returns {string} - Unique certificate ID
 */
export const generateCertificateId = () => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `CERT-${timestamp}-${randomString}`;
};

/**
 * Formats certificate data for display
 * @param {Object} certificateData - Raw certificate data
 * @returns {Object} - Formatted certificate data
 */
export const formatCertificateData = (certificateData) => {
  if (!certificateData?.certificate_data) return null;

  const data = certificateData.certificate_data;

  return {
    recipient: data.user_name || 'Unknown',
    course: data.course_title || 'Unknown Course',
    completionDate: data.completion_date || new Date().toLocaleDateString(),
    issueDate: data.issue_date || new Date().toLocaleDateString(),
    certificateId: data.certificate_id || 'Unknown',
    instructor: data.instructor_name || 'Leadwise Academy',
    organization: data.organization_name || 'Leadwise Academy'
  };
};

/**
 * Gets default placeholder positions for certificate generation
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} theme - Theme name for positioning adjustments
 * @returns {Object} - Placeholder positions
 */
export const getDefaultPlaceholderPositions = (width, height, theme = 'classic') => {
  const centerX = width / 2;

  // Base positions that can be adjusted per theme
  // Adjusted layout to accommodate organization header at top
  const basePositions = {
    '{{organization_name}}': { x: centerX, y: height * 0.12, textType: 'small' },
    '{{user_name}}': { x: centerX, y: height * 0.48, textType: 'title' },
    '{{course_title}}': { x: centerX, y: height * 0.58, textType: 'subtitle' },
    '{{instructor_name}}': { x: centerX, y: height * 0.68, textType: 'body' },
    '{{completion_date}}': { x: centerX * 1.25, y: height * 0.82, textType: 'small' },
    '{{certificate_id}}': { x: centerX * 0.75, y: height * 0.82, textType: 'small' },
    '{{issue_date}}': { x: centerX, y: height * 0.90, textType: 'small' }
  };

  // Theme-specific adjustments
  if (theme === 'elegant') {
    // More spacing for elegant theme
    basePositions['{{user_name}}'].y = height * 0.45;
    basePositions['{{course_title}}'].y = height * 0.55;
    basePositions['{{instructor_name}}'].y = height * 0.65;
  } else if (theme === 'corporate') {
    // Compact layout for corporate theme
    basePositions['{{user_name}}'].y = height * 0.46;
    basePositions['{{course_title}}'].y = height * 0.56;
    basePositions['{{instructor_name}}'].y = height * 0.66;
  }

  return basePositions;
};

/**
 * Calculates dynamic text positioning based on content length
 * @param {string} text - Text content
 * @param {number} maxWidth - Maximum width for text
 * @param {string} font - Font string
 * @returns {Object} - Positioning and wrapping information
 */
export const calculateTextLayout = (text, maxWidth, font) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  return {
    lines,
    lineHeight: parseInt(font.match(/\d+/)[0]) * 1.2,
    totalHeight: lines.length * parseInt(font.match(/\d+/)[0]) * 1.2
  };
};

/**
 * Draws decorative border on certificate canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} theme - Theme name
 * @param {{ theme_colors?: Record<string, string> }} [template]
 */
export const drawCertificateBorder = (ctx, width, height, theme = 'classic', template = {}) => {
  const themeConfig = CERTIFICATE_THEMES[theme] || CERTIFICATE_THEMES.classic;
  const custom = normalizeThemeColorsPartial(template.theme_colors);
  const border = { ...themeConfig.decorations.border };
  if (custom.primary) border.color = custom.primary;
  ctx.strokeStyle = border.color;
  ctx.lineWidth = border.width;
  ctx.setLineDash(border.style === 'dashed' ? [10, 5] : []);
  
  // Main border
  ctx.strokeRect(
    border.width / 2, 
    border.width / 2, 
    width - border.width, 
    height - border.width
  );
  
  // Corner decorations
  if (themeConfig.decorations.corner) {
    const cornerSize = themeConfig.decorations.corner.size;
    const cornerColor = custom.accent ?? themeConfig.decorations.corner.color;
    
    ctx.fillStyle = cornerColor;
    
    // Top-left corner
    ctx.fillRect(0, 0, cornerSize, cornerSize);
    // Top-right corner
    ctx.fillRect(width - cornerSize, 0, cornerSize, cornerSize);
    // Bottom-left corner
    ctx.fillRect(0, height - cornerSize, cornerSize, cornerSize);
    // Bottom-right corner
    ctx.fillRect(width - cornerSize, height - cornerSize, cornerSize, cornerSize);
  }
};

/**
 * UI labels and defaults for per-template color overrides (see normalizeThemeColorsPartial keys).
 * @param {string} themeKey
 * @returns {{ key: string, label: string, defaultColor: string }[]}
 */
export function getCertificateThemeColorSlots(themeKey) {
  const t = themeKey || 'gallery';
  if (t === 'gallery') {
    return [
      { key: 'primary', label: 'Frame', defaultColor: LEADWISE_BRAND_NAVY },
      { key: 'accent', label: 'Accent bar', defaultColor: LEADWISE_BRAND_ORANGE },
      { key: 'secondary', label: 'Recipient name', defaultColor: LEADWISE_BRAND_NAVY },
      { key: 'background', label: 'Inner panel', defaultColor: '#ffffff' },
      { key: 'text', label: 'Headings', defaultColor: '#111827' },
    ];
  }
  if (t === 'formal') {
    return [
      { key: 'primary', label: 'Corner navy', defaultColor: FORMAL_CERT_NAVY },
      { key: 'secondary', label: 'Teal accent', defaultColor: FORMAL_CERT_TEAL },
      { key: 'background', label: 'Background', defaultColor: '#f3f4f2' },
      { key: 'text', label: 'Body text', defaultColor: '#4b5563' },
    ];
  }
  if (t === 'achievement') {
    return [
      { key: 'primary', label: 'Green', defaultColor: ACHIEVEMENT_GREEN },
      { key: 'secondary', label: 'Orange', defaultColor: ACHIEVEMENT_ORANGE },
      { key: 'accent', label: 'Gold frame', defaultColor: ACHIEVEMENT_GOLD },
      { key: 'background', label: 'Cream field', defaultColor: ACHIEVEMENT_CREAM },
      { key: 'text', label: 'Text', defaultColor: ACHIEVEMENT_INK },
    ];
  }
  const tc = CERTIFICATE_THEMES[t] || CERTIFICATE_THEMES.classic;
  const c = tc.colors;
  return [
    { key: 'primary', label: 'Primary', defaultColor: c.primary },
    { key: 'secondary', label: 'Secondary', defaultColor: c.secondary },
    { key: 'accent', label: 'Accent', defaultColor: c.accent },
    { key: 'background', label: 'Background', defaultColor: c.background },
    { key: 'text', label: 'Body text', defaultColor: tc.fonts.body.color },
  ];
}

/**
 * Draws watermark on certificate
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} text - Watermark text
 */
export const drawWatermark = (ctx, width, height, text = 'LEADWISE ACADEMY') => {
  ctx.save();
  ctx.globalAlpha = 0.05; // Much more subtle
  ctx.fillStyle = '#cccccc'; // Lighter color
  ctx.font = 'bold 32px Arial'; // Smaller font
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Rotate and position watermark
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6); // -30 degrees
  ctx.fillText(text, 0, 0);
  
  ctx.restore();
};

/**
 * Gets logo position based on position string
 * @param {string} position - Logo position (top-left, top-center, etc.)
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} logoWidth - Logo width
 * @param {number} logoHeight - Logo height
 * @returns {Object} Position coordinates
 */
export const getLogoPosition = (position, width, height, logoWidth, logoHeight) => {
  const margin = 40; // Margin from edges
  const maxLogoWidth = width * 0.2; // Max 20% of canvas width
  const maxLogoHeight = height * 0.15; // Max 15% of canvas height
  
  // Scale logo to fit within max dimensions
  const scale = Math.min(maxLogoWidth / logoWidth, maxLogoHeight / logoHeight, 1);
  const scaledWidth = logoWidth * scale;
  const scaledHeight = logoHeight * scale;

  switch (position) {
    case 'top-left':
      return { x: margin, y: margin, width: scaledWidth, height: scaledHeight };
    case 'top-center':
      return { x: (width - scaledWidth) / 2, y: margin, width: scaledWidth, height: scaledHeight };
    case 'top-right':
      return { x: width - scaledWidth - margin, y: margin, width: scaledWidth, height: scaledHeight };
    case 'bottom-left':
      return { x: margin, y: height - scaledHeight - margin, width: scaledWidth, height: scaledHeight };
    case 'bottom-center':
      return { x: (width - scaledWidth) / 2, y: height - scaledHeight - margin, width: scaledWidth, height: scaledHeight };
    case 'bottom-right':
      return { x: width - scaledWidth - margin, y: height - scaledHeight - margin, width: scaledWidth, height: scaledHeight };
    default:
      return { x: margin, y: margin, width: scaledWidth, height: scaledHeight };
  }
};

/**
 * Draws logo on certificate
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement} logoImg - Logo image element
 * @param {string} position - Logo position
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export const drawLogo = (ctx, logoImg, position, width, height) => {
  if (!logoImg) return;

  const logoPos = getLogoPosition(position, width, height, logoImg.width, logoImg.height);
  
  ctx.save();
  ctx.drawImage(logoImg, logoPos.x, logoPos.y, logoPos.width, logoPos.height);
  ctx.restore();
};

/**
 * Certificate styling themes and configurations
 */
export const CERTIFICATE_THEMES = {
  classic: {
    name: 'Classic',
    description: 'Traditional certificate design with serif fonts',
    fonts: {
      title: { family: 'Times New Roman, serif', size: 28, weight: 'bold', color: '#2c3e50' },
      subtitle: { family: 'Times New Roman, serif', size: 18, weight: 'normal', color: '#34495e' },
      body: { family: 'Times New Roman, serif', size: 14, weight: 'normal', color: '#2c3e50' },
      small: { family: 'Times New Roman, serif', size: 11, weight: 'normal', color: '#7f8c8d' }
    },
    colors: {
      primary: '#2c3e50',
      secondary: '#34495e',
      accent: '#e74c3c',
      background: '#ffffff'
    },
    decorations: {
      border: { width: 3, color: '#2c3e50', style: 'solid' },
      corner: { size: 20, color: '#e74c3c' }
    }
  },
  modern: {
    name: 'Modern',
    description: 'Clean, contemporary design with sans-serif fonts',
    fonts: {
      title: { family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', size: 24, weight: '600', color: '#1a202c' },
      subtitle: { family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', size: 16, weight: '500', color: '#4a5568' },
      body: { family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', size: 14, weight: '400', color: '#2d3748' },
      small: { family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', size: 11, weight: '400', color: '#718096' }
    },
    colors: {
      primary: '#1a202c',
      secondary: '#4a5568',
      accent: '#3182ce',
      background: '#ffffff'
    },
    decorations: {
      border: { width: 2, color: '#e2e8f0', style: 'solid' },
      corner: { size: 16, color: '#3182ce' }
    }
  },
  elegant: {
    name: 'Elegant',
    description: 'Sophisticated design with script and serif fonts',
    fonts: {
      title: { family: 'Playfair Display, serif', size: 30, weight: '600', color: '#1a365d' },
      subtitle: { family: 'Source Sans Pro, sans-serif', size: 16, weight: '300', color: '#4a5568' },
      body: { family: 'Source Sans Pro, sans-serif', size: 14, weight: '400', color: '#2d3748' },
      small: { family: 'Source Sans Pro, sans-serif', size: 11, weight: '400', color: '#718096' }
    },
    colors: {
      primary: '#1a365d',
      secondary: '#4a5568',
      accent: '#d69e2e',
      background: '#fefefe'
    },
    decorations: {
      border: { width: 4, color: '#1a365d', style: 'double' },
      corner: { size: 24, color: '#d69e2e' }
    }
  },
  corporate: {
    name: 'Corporate',
    description: 'Professional business design',
    fonts: {
      title: { family: 'Roboto, sans-serif', size: 22, weight: '500', color: '#1e3a8a' },
      subtitle: { family: 'Roboto, sans-serif', size: 14, weight: '400', color: '#374151' },
      body: { family: 'Roboto, sans-serif', size: 13, weight: '400', color: '#374151' },
      small: { family: 'Roboto, sans-serif', size: 10, weight: '400', color: '#6b7280' }
    },
    colors: {
      primary: '#1e3a8a',
      secondary: '#374151',
      accent: '#059669',
      background: '#ffffff'
    },
    decorations: {
      border: { width: 1, color: '#e5e7eb', style: 'solid' },
      corner: { size: 12, color: '#059669' }
    }
  },
  gallery: {
    name: 'Gallery',
    description: 'Matches learner certificates page—Leadwise navy frame, white panel, brand-orange accent',
    fonts: {
      title: { family: 'Inter, system-ui, sans-serif', size: 22, weight: 'bold', color: '#111827' },
      subtitle: { family: 'Inter, system-ui, sans-serif', size: 14, weight: '600', color: '#6b7280' },
      body: { family: 'Inter, system-ui, sans-serif', size: 14, weight: '400', color: '#374151' },
      small: { family: 'Inter, system-ui, sans-serif', size: 10, weight: '500', color: '#6b7280' }
    },
    colors: {
      primary: LEADWISE_BRAND_NAVY,
      secondary: '#111827',
      accent: LEADWISE_BRAND_ORANGE,
      background: '#ffffff'
    },
    decorations: {
      border: { width: 12, color: LEADWISE_BRAND_NAVY, style: 'solid' },
      corner: { size: 36, color: LEADWISE_BRAND_ORANGE }
    }
  },
  formal: {
    name: 'Formal',
    description: 'Landscape layout with navy & teal geometry, serif title, script recipient name',
    fonts: {
      title: { family: 'Times New Roman, Times, Georgia, serif', size: 24, weight: 'bold', color: '#0c2844' },
      subtitle: { family: 'Inter, system-ui, sans-serif', size: 13, weight: '400', color: '#4b5563' },
      body: { family: 'Inter, system-ui, sans-serif', size: 14, weight: '400', color: '#4b5563' },
      small: { family: 'Inter, system-ui, sans-serif', size: 11, weight: '400', color: '#9ca3af' }
    },
    colors: {
      primary: '#0c2844',
      secondary: '#4b5563',
      accent: '#0d9488',
      background: '#f3f4f2'
    },
    decorations: {
      border: { width: 2, color: '#0d9488', style: 'solid' },
      corner: { size: 24, color: '#0c2844' }
    }
  },
  achievement: {
    name: 'Achievement',
    description: 'Cream layout with green and orange waves, gold frame, and award seal',
    fonts: {
      title: { family: 'Inter, system-ui, sans-serif', size: 28, weight: 'bold', color: ACHIEVEMENT_INK },
      subtitle: { family: 'Inter, system-ui, sans-serif', size: 13, weight: '700', color: ACHIEVEMENT_INK },
      body: { family: 'Inter, system-ui, sans-serif', size: 13, weight: '400', color: ACHIEVEMENT_INK },
      small: { family: 'Inter, system-ui, sans-serif', size: 10, weight: '500', color: ACHIEVEMENT_INK }
    },
    colors: {
      primary: ACHIEVEMENT_GREEN,
      secondary: ACHIEVEMENT_ORANGE,
      accent: ACHIEVEMENT_GOLD,
      background: ACHIEVEMENT_CREAM
    },
    decorations: {
      border: { width: 4, color: ACHIEVEMENT_GOLD, style: 'solid' },
      corner: { size: 28, color: ACHIEVEMENT_ORANGE }
    }
  }
};

/**
 * Gets default font styles for certificate text
 * @param {string} theme - Theme name
 * @param {string} textType - Type of text (title, subtitle, body, small)
 * @param {{ theme_colors?: Record<string, string> }} [template]
 * @returns {Object} - Font styles
 */
export const getFontStyles = (theme = 'classic', textType = 'body', template = {}) => {
  const themeConfig = CERTIFICATE_THEMES[theme] || CERTIFICATE_THEMES.classic;
  const fontConfig = themeConfig.fonts[textType] || themeConfig.fonts.body;
  const custom = normalizeThemeColorsPartial(template.theme_colors);
  let color = fontConfig.color;
  if (textType === 'title' && custom.primary) color = custom.primary;
  else if (textType === 'subtitle' && custom.secondary) color = custom.secondary;
  else if ((textType === 'body' || textType === 'small') && custom.text) color = custom.text;

  return {
    fillStyle: color,
    textAlign: 'center',
    font: `${fontConfig.weight} ${fontConfig.size}px ${fontConfig.family}`
  };
};

/**
 * Gets default font styles for certificate text (backward compatibility)
 * @returns {Object} - Font styles
 */
export const getDefaultFontStyles = () => getFontStyles('classic', 'body');

/**
 * Validates file for certificate template upload
 * @param {File} file - File to validate
 * @returns {Object} - Validation result
 */
export const validateTemplateFile = (file) => {
  const errors = [];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];

  if (!file) {
    errors.push('No file selected');
    return { isValid: false, errors };
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push('File must be an image (JPEG, PNG, or SVG)');
  }

  if (file.size > maxSize) {
    errors.push('File size must be less than 5MB');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Creates a download link for a blob
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for download
 */
export const downloadBlob = (blob, filename) => {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
};

/**
 * Safely revokes an object URL
 * @param {string} url - The URL to revoke
 */
export const revokeObjectURL = (url) => {
  try {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error revoking object URL:', error);
  }
};

/**
 * Default certificate template placeholders
 */
export const DEFAULT_PLACEHOLDERS = [
  { key: '{{user_name}}', description: 'Full name of the certificate recipient' },
  { key: '{{course_title}}', description: 'Title of the completed course' },
  { key: '{{completion_date}}', description: 'Date when the course was completed' },
  { key: '{{issue_date}}', description: 'Date when the certificate was issued' },
  { key: '{{instructor_name}}', description: 'Name of the course instructor' },
  { key: '{{certificate_id}}', description: 'Unique certificate identifier' },
  { key: '{{organization_name}}', description: 'Name of the organization (if applicable)' }
];

/**
 * Error messages for common certificate operations
 */
export const CERTIFICATE_ERRORS = {
  TEMPLATE_NOT_FOUND: 'Certificate template not found',
  GENERATION_FAILED: 'Failed to generate certificate',
  UPLOAD_FAILED: 'Failed to upload certificate template',
  INVALID_DATA: 'Invalid certificate data provided',
  PERMISSION_DENIED: 'You do not have permission to perform this action',
  NETWORK_ERROR: 'Network error occurred. Please try again.',
  TIMEOUT: 'Operation timed out. Please try again.'
};

/**
 * Handles certificate-related errors with user-friendly messages
 * @param {Error} error - The error object
 * @param {string} operation - The operation that failed
 * @returns {string} - User-friendly error message
 */
export const handleCertificateError = (error, operation = 'operation') => {
  const raw =
    error?.message ||
    error?.details ||
    error?.hint ||
    (typeof error === 'string' ? error : '');
  const clipped = raw.length > 320 ? `${raw.slice(0, 320)}…` : raw;

  if (raw.includes('new row violates row-level security policy')) {
    return 'Permission denied. Please ensure you have the necessary permissions.';
  }
  if (/does not exist/i.test(raw) && /relation|table/i.test(raw)) {
    return 'Database setup incomplete. Please contact your administrator.';
  }
  if (raw.includes('Unauthorized')) {
    return 'Storage access denied. Please ensure proper configuration.';
  }
  if (raw.includes('network') || error?.name === 'NetworkError') {
    return CERTIFICATE_ERRORS.NETWORK_ERROR;
  }
  if (raw.includes('timeout') || error?.name === 'TimeoutError') {
    return CERTIFICATE_ERRORS.TIMEOUT;
  }
  if (clipped) {
    return operation ? `${operation}: ${clipped}` : clipped;
  }

  return `Failed to ${operation}. Please try again.`;
};

/**
 * PostgREST / Postgres error when optional columns are missing from DB (migration not applied).
 * @param {object | null | undefined} error
 * @returns {boolean}
 */
export function isMissingSchemaColumnError(error) {
  const text = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');
  if (!text) return false;
  return (
    /could not find.*column/i.test(text) ||
    /column .* does not exist/i.test(text) ||
    /schema cache/i.test(text) ||
    error?.code === '42703'
  );
}

/**
 * Validates if a user has permission to manage certificates
 * @param {Object} user - User object with role information
 * @returns {boolean} - Whether user can manage certificates
 */
export const canManageCertificates = (user) => {
  if (!user) return false;

  const allowedRoles = ['system_admin', 'instructor', 'admin'];
  return allowedRoles.includes(user.role) || user.permissions?.includes('manage_certificates');
};

/**
 * Creates a safe filename for certificate downloads
 * @param {string} courseName - Name of the course
 * @param {string} userName - Name of the user
 * @returns {string} - Safe filename
 */
export const createCertificateFilename = (courseName, userName) => {
  const safeCourse = courseName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Course';
  const safeUser = userName?.replace(/[^a-zA-Z0-9]/g, '_') || 'User';
  const timestamp = new Date().toISOString().split('T')[0];

  return `Certificate_${safeCourse}_${safeUser}_${timestamp}.png`;
};

/**
 * Sentinel value returned by sanitizeTemplateUrl when no valid image URL exists.
 * Components should check for this and render a placeholder UI instead of an <img>.
 */
export const DEFAULT_CERTIFICATE_SVG = null;

/**
 * Checks if a URL is a problematic external placeholder and provides fallback
 * @param {string} url - The URL to check
 * @returns {string} - Original URL or fallback SVG
 */
export const sanitizeTemplateUrl = (url) => {
  if (!url) return DEFAULT_CERTIFICATE_SVG;

  // Check for problematic placeholder services
  const problematicDomains = [
    'via.placeholder.com',
    'placeholder.com',
    'placehold.it'
  ];

  const isDomainProblematic = problematicDomains.some(domain =>
    url.includes(domain)
  );

  if (isDomainProblematic) {
    return DEFAULT_CERTIFICATE_SVG;
  }

  return url;
};