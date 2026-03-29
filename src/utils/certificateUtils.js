// src/utils/certificateUtils.js
// Certificate utility functions for better code organization

import leadwiseLogoUrl from '@/assets/images/leadwise.svg';

/** Matches dashboard certificate gallery card (navy frame, white panel, blue accent). */
export const GALLERY_CERT_COLORS = {
  frame: '#0C1C4F',
  accentBar: '#1565FF',
  recipient: '#0C1C4F',
};

/**
 * Loads an image for certificate rendering (logo). Resolves null on failure.
 * @param {string} src
 * @returns {Promise<HTMLImageElement | null>}
 */
export function loadCertificateImage(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    // crossOrigin breaks many data: and blob: URLs in canvas/logo loading (invalid URL / tainted canvas)
    if (!/^data:|^blob:/i.test(String(src).trim())) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Draws the Leadwise gallery-style certificate (canvas).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Record<string, string>} data - certificate_data fields
 * @param {{ logo_url?: string | null, logo_position?: string }} [template]
 */
export async function drawGalleryCertificate(ctx, width, height, data, template = {}) {
  const FRAME = GALLERY_CERT_COLORS.frame;
  const pad = 12;
  const innerPad = 16;
  const radii = [8, 8, 36, 8];

  ctx.fillStyle = FRAME;
  ctx.fillRect(0, 0, width, height);

  const ix = pad;
  const iy = pad;
  const iw = width - pad * 2;
  const ih = height - pad * 2;

  ctx.fillStyle = '#ffffff';
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
  ctx.fillStyle = '#111827';
  ctx.font = '600 10px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(data.organization_name || 'Leadwise Academy', cx, cy);
  cy += 16;

  ctx.fillStyle = '#6b7280';
  ctx.font = '600 11px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Verified certificate of course completion', cx, cy);
  cy += 22;

  ctx.fillStyle = '#111827';
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

  ctx.fillStyle = GALLERY_CERT_COLORS.recipient;
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
  ctx.fillStyle = GALLERY_CERT_COLORS.accentBar;
  ctx.fillRect(0, height - barH, width, barH);
}

/**
 * Renders a full certificate onto a 2D canvas (gallery or legacy theme).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {string} theme
 * @param {Record<string, string>} placeholderData
 * @param {{ logo_url?: string | null, logo_position?: string, showWatermark?: boolean }} [template]
 */
export async function renderCertificateCanvas(ctx, width, height, theme, placeholderData, template = {}) {
  const resolvedTheme = theme === 'gallery' ? 'gallery' : theme;
  const showWatermark = template.showWatermark !== false;

  if (resolvedTheme === 'gallery') {
    await drawGalleryCertificate(ctx, width, height, placeholderData, template);
    return;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  drawCertificateBorder(ctx, width, height, resolvedTheme);
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
  const orgStyles = getFontStyles(resolvedTheme, 'small');
  ctx.fillStyle = orgStyles.fillStyle;
  ctx.textAlign = 'center';
  const orgSizeMatch = orgStyles.font.match(/(\d+)px/);
  const orgSize = orgSizeMatch ? orgSizeMatch[1] : '11';
  const orgFamilyMatch = orgStyles.font.match(/px\s+(.+)$/);
  const orgFamily = orgFamilyMatch ? orgFamilyMatch[1] : 'sans-serif';
  ctx.font = `bold ${orgSize}px ${orgFamily}`;
  ctx.fillText(orgName, width / 2, height * 0.12);

  const titleStyles = getFontStyles(resolvedTheme, 'title');
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
      const fontStyles = getFontStyles(resolvedTheme, textType);
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
  const themeConfig = CERTIFICATE_THEMES[theme] || CERTIFICATE_THEMES.classic;

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
 */
export const drawCertificateBorder = (ctx, width, height, theme = 'classic') => {
  const themeConfig = CERTIFICATE_THEMES[theme] || CERTIFICATE_THEMES.classic;
  const border = themeConfig.decorations.border;
  
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
    const cornerColor = themeConfig.decorations.corner.color;
    
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
    description: 'Matches learner certificates page—navy frame, white panel, blue accent',
    fonts: {
      title: { family: 'Inter, system-ui, sans-serif', size: 22, weight: 'bold', color: '#111827' },
      subtitle: { family: 'Inter, system-ui, sans-serif', size: 14, weight: '600', color: '#6b7280' },
      body: { family: 'Inter, system-ui, sans-serif', size: 14, weight: '400', color: '#374151' },
      small: { family: 'Inter, system-ui, sans-serif', size: 10, weight: '500', color: '#6b7280' }
    },
    colors: {
      primary: '#0C1C4F',
      secondary: '#111827',
      accent: '#1565FF',
      background: '#ffffff'
    },
    decorations: {
      border: { width: 12, color: '#0C1C4F', style: 'solid' },
      corner: { size: 36, color: '#1565FF' }
    }
  }
};

/**
 * Gets default font styles for certificate text
 * @param {string} theme - Theme name
 * @param {string} textType - Type of text (title, subtitle, body, small)
 * @returns {Object} - Font styles
 */
export const getFontStyles = (theme = 'classic', textType = 'body') => {
  const themeConfig = CERTIFICATE_THEMES[theme] || CERTIFICATE_THEMES.classic;
  const fontConfig = themeConfig.fonts[textType] || themeConfig.fonts.body;
  
  return {
    fillStyle: fontConfig.color,
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
  console.error(`Certificate ${operation} error:`, error);

  if (error.message?.includes('new row violates row-level security policy')) {
    return 'Permission denied. Please ensure you have the necessary permissions.';
  } else if (error.message?.includes('does not exist')) {
    return 'Database setup incomplete. Please contact your administrator.';
  } else if (error.message?.includes('Unauthorized')) {
    return 'Storage access denied. Please ensure proper configuration.';
  } else if (error.message?.includes('network') || error.name === 'NetworkError') {
    return CERTIFICATE_ERRORS.NETWORK_ERROR;
  } else if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
    return CERTIFICATE_ERRORS.TIMEOUT;
  } else if (error.message) {
    return `Failed to ${operation}: ${error.message}`;
  }

  return `Failed to ${operation}. Please try again.`;
};

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