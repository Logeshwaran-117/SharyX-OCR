'use strict';
const PptxGenJS = require('pptxgenjs');
const { DESIGN, applyTheme } = require('./designConstitution');

let META = null;

function drawSeal(slide, x, y, size = 0.8) {
  const img = (META && META.watermarkImage) || (global.__PPT_META && global.__PPT_META.watermarkImage) || null;
  if (img && typeof img === 'string' && img.length > 30) {
    try {
      if (img.startsWith('data:')) {
        slide.addImage({ data: img, x, y, w: size, h: size });
      } else {
        slide.addImage({ data: 'data:image/png;base64,' + img, x, y, w: size, h: size });
      }
      return;
    } catch (e) {
      console.warn('[RenderEngine] Title logo failed:', e.message);
    }
  }

  // Fallback: draw an elegant vector health department / surveillance seal
  slide.addShape('ellipse', {
    x, y, w: size, h: size,
    fill: { color: DESIGN.colors.coverAccent },
    line: { color: DESIGN.colors.darkBg, pt: 1.5 }
  });
  slide.addShape('ellipse', {
    x: x + 0.08 * size, y: y + 0.08 * size, w: size - 0.16 * size, h: size - 0.16 * size,
    fill: { color: DESIGN.colors.darkBg },
    line: { color: DESIGN.colors.coverAccent, pt: 1 }
  });
  // Inner cross symbol
  const barW = 0.12 * size;
  const barL = size - 0.44 * size;
  slide.addShape('rect', {
    x: x + size/2 - barW/2, y: y + 0.22 * size, w: barW, h: barL,
    fill: { color: DESIGN.colors.coverAccent }, line: { type: 'none' }
  });
  slide.addShape('rect', {
    x: x + 0.22 * size, y: y + size/2 - barW/2, w: barL, h: barW,
    fill: { color: DESIGN.colors.coverAccent }, line: { type: 'none' }
  });
}

function getBulletAccentColor(bulletText, index) {
  const t = String(bulletText).toLowerCase();
  const colors = DESIGN.colors.chart;
  if (/fully|2 doses|both doses|double dose|two doses/.test(t)) return colors[0]; // Blue
  if (/partially|1 dose|one dose|partial/.test(t)) return colors[1]; // Orange
  if (/unvaccinated|no dose|zero doses|un-vaccinated/.test(t)) return colors[2]; // Green
  if (/unknown|history not known|undocumented|not known|unrecorded/.test(t)) return colors[3]; // Red
  
  return colors[index % colors.length] || DESIGN.colors.bulletAccent;
}

function addProcessFlow(slide, bullets, region) {
  if (!bullets || !bullets.length) return;
  const items = bullets.slice(0, 4); // max 4 steps horizontally
  const n = items.length;
  const cardW = (region.w - (n - 1) * 0.40) / n;
  const cardH = region.h;

  items.forEach((item, i) => {
    const x = region.x + i * (cardW + 0.40);
    // Draw card box
    slide.addShape('rect', {
      x: x, y: region.y, w: cardW, h: cardH,
      fill: { color: DESIGN.colors.bulletCardBg },
      line: { color: DESIGN.colors.kpiCardBorder, pt: 1 },
      rectRadius: 0.06
    });

    // Step Number badge
    slide.addShape('rect', {
      x: x + 0.12, y: region.y + 0.12, w: 0.46, h: 0.28,
      fill: { color: i % 2 === 0 ? DESIGN.colors.coverAccent : DESIGN.colors.bulletAccent },
      line: { type: 'none' }, rectRadius: 0.04
    });
    slide.addText(String(i + 1).padStart(2, '0'), {
      x: x + 0.12, y: region.y + 0.12, w: 0.46, h: 0.28,
      fontSize: 10, bold: true, color: DESIGN.colors.headerText,
      fontFace: DESIGN.fonts.face, align: 'center', valign: 'middle', margin: 0
    });

    // Step Text
    slide.addText(truncate(item, 100), {
      x: x + 0.12, y: region.y + 0.50, w: cardW - 0.24, h: cardH - 0.65,
      fontSize: 11, color: DESIGN.colors.bodyText, fontFace: DESIGN.fonts.face,
      valign: 'top', margin: 0, wrap: true
    });

    // Draw connecting arrow to the next step
    if (i < n - 1) {
      slide.addText('\u279E', { // Rightwards arrow symbol
        x: x + cardW + 0.05, y: region.y + cardH/2 - 0.20, w: 0.30, h: 0.40,
        fontSize: 20, color: DESIGN.colors.coverAccent, fontFace: DESIGN.fonts.face,
        align: 'center', valign: 'middle', margin: 0
      });
    }
  });
}

/**
 * Recommendations / Summary & Next Steps — executive format matching sample decks:
 * dark navy background, gold section label, large title, numbered 01–04 actions
 * with bold title + descriptive body. Always placed before Thank You.
 */
function renderRecommendationsSlide(pres, slide) {
  const s = pres.addSlide();
  const W = DESIGN.slide.w;
  const H = DESIGN.slide.h;
  const accent = DESIGN.colors.coverAccent || DESIGN.colors.kpiAmber || 'F59E0B';
  const darkBg = DESIGN.colors.darkBg || '0B1B33';
  const bodyMuted = DESIGN.colors.mutedText || '94A3B8';
  const white = 'FFFFFF';

  s.addShape('rect', {
    x: 0, y: 0, w: W, h: H,
    fill: { color: darkBg }, line: { type: 'none' },
  });

  const bannerText =
    slide.subtitle ||
    slide.insightHeadline ||
    slide.callout ||
    'Summary of priority actions derived from the source document.';
  s.addText(truncate(String(bannerText), 160), {
    x: 0.55, y: 0.28, w: W - 1.5, h: 0.55,
    fontSize: 12, color: bodyMuted, fontFace: DESIGN.fonts.face,
    valign: 'middle', margin: 0, wrap: true,
  });

  s.addShape('rect', {
    x: 0, y: 0.95, w: W, h: 0.045,
    fill: { color: accent }, line: { type: 'none' },
  });

  s.addText('SUMMARY  &  NEXT  STEPS', {
    x: 0.55, y: 1.15, w: W - 1.2, h: 0.28,
    fontSize: 11, bold: true, charSpacing: 3,
    color: accent, fontFace: DESIGN.fonts.face, margin: 0,
  });

  const mainTitle = slide.title && !/^recommend/i.test(slide.title)
    ? slide.title
    : 'Recommendations';
  s.addText(truncate(mainTitle, 48), {
    x: 0.55, y: 1.48, w: W - 1.4, h: 0.55,
    fontSize: 32, bold: true, color: white,
    fontFace: DESIGN.fonts.face, margin: 0,
  });
  s.addShape('rect', {
    x: 0.55, y: 2.05, w: 1.6, h: 0.035,
    fill: { color: white }, line: { type: 'none' },
  });

  let items = [];
  if (Array.isArray(slide.processSteps) && slide.processSteps.length) {
    items = slide.processSteps.slice(0, 6).map((p, i) => ({
      title: p.title || ('Action ' + (i + 1)),
      body: p.description || p.detail || '',
    }));
  } else if (Array.isArray(slide.bullets) && slide.bullets.length) {
    items = slide.bullets.slice(0, 6).map((b) => {
      const text = String(b || '').trim();
      const split = text.match(/^(.{8,70}?)(?:\s*[:—–-]\s+|\.\s+)(.+)$/);
      if (split) {
        return { title: split[1].replace(/^\*\*|\*\*$/g, '').trim(), body: split[2].trim() };
      }
      const md = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (md) return { title: md[1].trim(), body: md[2].trim() };
      const words = text.split(/\s+/);
      if (words.length > 10) {
        return { title: words.slice(0, 6).join(' '), body: words.slice(6).join(' ') };
      }
      return { title: text, body: '' };
    });
  }

  if (!items.length) {
    items = [
      { title: 'Review key findings', body: 'Validate metrics and gaps highlighted in this deck with the source data.' },
      { title: 'Prioritise highest-impact actions', body: 'Focus resources on the largest shortfalls and time-sensitive items.' },
      { title: 'Assign ownership and timelines', body: 'Name accountable leads and target completion dates for each action.' },
      { title: 'Monitor and report progress', body: 'Track completion against the baseline figures presented in this report.' },
    ];
  }

  const startY = 2.25;
  const availH = H - startY - 0.45;
  const itemH = Math.min(0.95, availH / items.length);

  items.forEach((item, i) => {
    const y = startY + i * itemH;
    const num = String(i + 1).padStart(2, '0');

    s.addText(num, {
      x: 0.55, y: y, w: 0.70, h: 0.36,
      fontSize: 22, bold: true, color: accent,
      fontFace: DESIGN.fonts.face, margin: 0, valign: 'middle',
    });

    s.addText(truncate(item.title, 70), {
      x: 1.35, y: y, w: W - 2.0, h: 0.34,
      fontSize: 16, bold: true, color: white,
      fontFace: DESIGN.fonts.face, margin: 0, valign: 'middle',
    });

    if (item.body) {
      s.addText(truncate(item.body, 220), {
        x: 1.35, y: y + 0.34, w: W - 2.0, h: Math.max(itemH - 0.40, 0.28),
        fontSize: 12, color: bodyMuted,
        fontFace: DESIGN.fonts.face, margin: 0, valign: 'top', wrap: true,
      });
    }
  });

  if (slide.slideIndex != null) {
    s.addText(String(slide.slideIndex), {
      x: W - 0.85, y: H - 0.40, w: 0.55, h: 0.25,
      fontSize: 11, color: bodyMuted, fontFace: DESIGN.fonts.face,
      align: 'right', margin: 0,
    });
  }
}

function renderConclusionSlide(pres, slide) {
  const s = pres.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: DESIGN.slide.w, h: DESIGN.slide.h, fill: { color: DESIGN.colors.darkBg }, line: { type: 'none' } });
  s.addShape('rect', { x: 0, y: 0, w: 5.5, h: DESIGN.slide.h, fill: { color: DESIGN.colors.coverAccent }, line: { type: 'none' } });

  s.addText('CONCLUSION', { x: 0.50, y: 0.75, w: 4.5, h: 0.30, fontSize: 10, bold: true, charSpacing: 2, color: DESIGN.colors.darkBg, fontFace: DESIGN.fonts.face, margin: 0 });
  
  s.addText(truncate(slide.title || 'Thank You', 65), { x: 0.50, y: 1.75, w: 4.5, h: 1.5, fontSize: 36, bold: true, color: DESIGN.colors.darkBg, fontFace: DESIGN.fonts.face, valign: 'top', margin: 0, wrap: true });
  
  if (slide.subtitle) {
    s.addText(truncate(slide.subtitle, 90), { x: 0.50, y: 3.40, w: 4.5, h: 1.2, fontSize: 13, italic: true, color: DESIGN.colors.darkBg, fontFace: DESIGN.fonts.face, valign: 'top', margin: 0, wrap: true });
  }

  drawSeal(s, 0.50, 4.80, 0.9);

  const rightX = 6.0;
  const rightY = 1.0;
  const rightW = DESIGN.slide.w - rightX - 0.50;
  const rightH = DESIGN.slide.h - 2.0;

  s.addText(slide.insightHeadline || 'Next Steps & Contact Information', {
    x: rightX, y: rightY, w: rightW, h: 0.40,
    fontSize: 18, bold: true, color: DESIGN.colors.coverAccent, fontFace: DESIGN.fonts.face,
    margin: 0
  });

  if (slide.bullets && slide.bullets.length) {
    const items = slide.bullets.slice(0, 5);
    const itemH = rightH / items.length;
    items.forEach((item, i) => {
      const y = rightY + 0.60 + i * itemH;
      const boxH = Math.max(itemH - 0.10, 0.40);
      s.addShape('rect', {
        x: rightX, y: y, w: rightW, h: boxH,
        fill: { color: DESIGN.colors.bulletCardBg },
        line: { color: DESIGN.colors.kpiCardBorder, pt: 1 },
        rectRadius: 0.05
      });
      s.addShape('rect', {
        x: rightX + 0.10, y: y + 0.08, w: 0.07, h: Math.max(boxH - 0.16, 0.12),
        fill: { color: DESIGN.colors.coverAccent }, line: { type: 'none' }
      });
      s.addText(item, {
        x: rightX + 0.28, y: y + 0.04, w: rightW - 0.40, h: boxH - 0.08,
        fontSize: 13, color: DESIGN.colors.bodyText, fontFace: DESIGN.fonts.face,
        valign: 'middle', margin: 0, wrap: true
      });
    });
  }
}

function addWatermark(slide) {
  // Senior research decks: no branded OCR watermark on content slides.
  // Only render an explicit user-supplied watermarkImage (logo) at high transparency.
  // Never stamp "SharyX OCR" or similar product chrome on analytical slides.
  const img = (META && META.watermarkImage) || (global.__PPT_META && global.__PPT_META.watermarkImage) || null;
  const text = (META && META.watermarkText) || (global.__PPT_META && global.__PPT_META.watermarkText) || '';
  const design = DESIGN;
  if (!design) return;
  const w = design.slide.w;

  // Skip generic product watermarks that pollute research decks
  const banned = /sharyx|ocr|auto.?generat|ai.?present/i;
  if (text && banned.test(String(text))) return;

  if (img && typeof img === 'string' && img.length > 30) {
    try {
      const data = img.startsWith('data:') ? img : ('data:image/png;base64,' + img);
      slide.addImage({
        data,
        x: w - 1.05,
        y: 0.12,
        w: 0.72,
        h: 0.72,
        transparency: 78,
      });
    } catch (e) {
      console.warn('[RenderEngine] watermark image failed:', e.message);
    }
  }

  if (text && String(text).trim()) {
    slide.addText(String(text).trim().slice(0, 48), {
      x: w - 3.4,
      y: 0.10,
      w: 2.9,
      h: 0.28,
      fontSize: 9,
      fontFace: design.fonts.face,
      color: design.isLight ? '94A3B8' : '475569',
      align: 'right',
      valign: 'middle',
      margin: 0,
      transparency: 70,
      italic: true,
    });
  }
}


// Moved import to the top

function truncate(str, max) {
  const s = String(str || '');
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '\u2026';
}

function addHeaderBand(slide, title, subtitle, slideNumber) {
  const hh = DESIGN.headerBand.h;
  // Solid header band
  slide.addShape('rect', {
    x: 0, y: 0, w: DESIGN.slide.w, h: hh,
    fill: { color: DESIGN.colors.headerBand }, line: { type: 'none' },
  });
  // Thin gold accent rule under header (institutional research look)
  slide.addShape('rect', {
    x: 0, y: hh - 0.03, w: DESIGN.slide.w, h: 0.03,
    fill: { color: DESIGN.colors.accentLine || DESIGN.colors.coverAccent },
    line: { type: 'none' },
  });

  const titleH = 0.34;
  const subH = 0.24;
  const blockH = subtitle ? (titleH + subH + 0.02) : titleH;
  const titleY = Math.max(0.08, (hh - blockH) / 2 - 0.02);

  slide.addText(truncate(title || '', 68), {
    x: 0.48, y: titleY, w: DESIGN.slide.w - 1.55, h: titleH,
    fontSize: DESIGN.fonts.slideTitle, bold: true, color: DESIGN.colors.headerText,
    fontFace: DESIGN.fonts.face, valign: 'middle', margin: 0,
  });
  if (subtitle) {
    slide.addText(truncate(subtitle, 95), {
      x: 0.48, y: titleY + titleH, w: DESIGN.slide.w - 1.55, h: subH,
      fontSize: DESIGN.fonts.slideSubtitle, italic: false, color: DESIGN.colors.headerSub,
      fontFace: DESIGN.fonts.face, valign: 'top', margin: 0,
    });
  }

  // Page number — bottom-right only (not in header)
  slide.addShape('rect', {
    x: DESIGN.slideNum.x, y: DESIGN.slideNum.y,
    w: DESIGN.slideNum.w, h: DESIGN.slideNum.h,
    fill: { color: DESIGN.colors.slideNumBg }, line: { type: 'none' }, rectRadius: 0.03,
  });
  slide.addText(String(slideNumber).padStart(2, '0'), {
    x: DESIGN.slideNum.x, y: DESIGN.slideNum.y,
    w: DESIGN.slideNum.w, h: DESIGN.slideNum.h,
    fontSize: DESIGN.fonts.slideNum, bold: true, color: DESIGN.colors.slideNumText,
    fontFace: DESIGN.fonts.face, align: 'center', valign: 'middle', margin: 0,
  });
}

function resolveBriefingLabel() {
  // Domain-aware footer — never stamp health/surveillance on finance decks
  const purpose = String((META && META.purpose) || '').toLowerCase();
  const dept = String((META && (META.department || META.organization)) || '').toLowerCase();
  const fn = String((META && META.filename) || '').toLowerCase();
  const blob = `${purpose} ${dept} ${fn}`;
  if (/profit|loss|p\s*&\s*l|income|expense|revenue|financ|budget|ledger|balance/.test(blob)) {
    return 'Financial Briefing';
  }
  if (/measles|immun|surveil|epidem|phc|vpd|health|vaccine|rbs/.test(blob)) {
    return 'Surveillance Briefing';
  }
  if (/bank|loan|credit|npa|portfolio/.test(blob)) {
    return 'Banking Briefing';
  }
  return 'Executive Briefing';
}

function addFooter(slide, orgName) {
  const org = (orgName || (META && META.organization) || (META && META.department) || '').toString().trim();
  const label = resolveBriefingLabel();
  const left = org ? `${truncate(org, 42)}  ·  ${label}` : label;
  slide.addText(left, {
    x: 0.48, y: DESIGN.footer.y, w: 10.5, h: 0.22,
    fontSize: DESIGN.fonts.footer, color: DESIGN.colors.footerText,
    fontFace: DESIGN.fonts.face, margin: 0, valign: 'middle',
  });
  slide.addShape('rect', {
    x: 0.48, y: DESIGN.footer.y - 0.06, w: DESIGN.slide.w - 1.2, h: 0.01,
    fill: { color: DESIGN.colors.footerLine }, line: { type: 'none' },
  });
}

function isFillerBullet(b) {
  const s = String(b || '').trim();
  if (!s || s.length < 8) return true;
  if (/^---\s*Sheet:/i.test(s)) return true;
  if (/^\d+\s*rows?\s*[×x]\s*\d+\s*columns?/i.test(s)) return true;
  return /see (source|related)|refer to (the )?(source|data|neighbouring|neighboring)|no additional metrics|content not available|supporting detail|drawn from selected|expanded to meet target|added to (reach|meet)|review neighbouring|cross-check figures|see source document for supporting|priority focus area requiring management|validate data gaps and discrepancies for|cross-check population denominators/i.test(s);
}

function addBullets(slide, bullets, region) {
  if (!bullets || !bullets.length) return;
  // Cap at 5; strip filler / placeholder lines so slides stay substantive
  const items = bullets
    .map(b => String(b || '').trim())
    .filter(b => b && !isFillerBullet(b))
    .slice(0, 5)
    .map(b => truncate(b, 160));
  if (!items.length) return;
  const n = items.length;
  const lineH = Math.max(0.48, Math.min(region.h / Math.max(n, 1), n <= 3 ? 0.95 : n <= 4 ? 0.78 : 0.64));
  const textSize = n <= 3 ? 14 : n <= 4 ? 13 : 12;
  const topPad = Math.max(0.04, Math.min((region.h - lineH * n) * 0.15, 0.14));
  const gap = 0.10;
  items.forEach((bullet, i) => {
    const y = region.y + topPad + i * lineH;
    const boxH = Math.max(lineH - gap, 0.40);
    if (y + boxH > region.y + region.h + 0.02) return;
    slide.addShape('rect', {
      x: region.x, y: y, w: region.w, h: boxH,
      fill: { color: DESIGN.colors.bulletCardBg },
      line: { color: DESIGN.colors.kpiCardBorder, pt: 0.75 }, rectRadius: 0.06,
    });
    slide.addShape('rect', {
      x: region.x + 0.12, y: y + 0.10, w: 0.07, h: Math.max(boxH - 0.20, 0.18),
      fill: { color: getBulletAccentColor(bullet, i) }, line: { type: 'none' },
    });
    slide.addText(bullet, {
      x: region.x + 0.32, y: y + 0.06, w: region.w - 0.48, h: boxH - 0.12,
      fontSize: textSize, color: DESIGN.colors.bodyText, fontFace: DESIGN.fonts.face,
      valign: 'middle', margin: 0, wrap: true,
    });
  });
}

function addKpiCards(slide, kpiCards) {
  if (!kpiCards || !kpiCards.length) return;
  kpiCards.forEach(card => {
    // Card shell
    slide.addShape('rect', {
      x: card.x, y: card.y, w: card.w, h: card.h,
      fill: { color: DESIGN.colors.kpiCardBg },
      line: { color: DESIGN.colors.kpiCardBorder, pt: 1 },
      rectRadius: 0.05,
    });
    // Accent top bar (metric signal color)
    slide.addShape('rect', {
      x: card.x, y: card.y, w: card.w, h: 0.07,
      fill: { color: card.color || DESIGN.colors.kpiBlue },
      line: { type: 'none' },
    });

    let rawVal = String(card.displayValue || card.value || '—').trim();
    let rawUnit = String(card.displayUnit || card.unit || '').trim();
    if (rawUnit && rawVal.toLowerCase().endsWith(rawUnit.toLowerCase())) rawUnit = '';
    const valStr = rawVal + (rawUnit ? ' ' + rawUnit : '');

    let valFontSize = DESIGN.fonts.kpiValue || 26;
    if (valStr.length > 14) valFontSize = 14;
    else if (valStr.length > 11) valFontSize = 16;
    else if (valStr.length > 8) valFontSize = 19;
    else if (valStr.length > 6) valFontSize = 22;

    // Value — dominant number
    slide.addText(truncate(valStr, 20), {
      x: card.x + 0.14, y: card.y + 0.16, w: card.w - 0.28, h: 0.42,
      fontSize: valFontSize, bold: true,
      color: card.color || DESIGN.colors.titleText,
      fontFace: DESIGN.fonts.face,
      align: 'left', valign: 'middle', margin: 0, wrap: false,
    });

    // Label — allow 2 lines; prefer full short label over aggressive ellipsis
    const labelText = String(card.displayLabel || card.label || '').trim();
    const labelMax = card.w < 2.2 ? 26 : 36;
    slide.addText(truncate(labelText, labelMax), {
      x: card.x + 0.12, y: card.y + 0.58, w: card.w - 0.24, h: 0.42,
      fontSize: DESIGN.fonts.kpiLabel || 11, bold: true,
      color: DESIGN.colors.subtitleText,
      fontFace: DESIGN.fonts.face,
      margin: 0, wrap: true, valign: 'top',
    });

    // Context / supporting note
    if (card.displayContext || card.context) {
      slide.addText(truncate(String(card.displayContext || card.context), 48), {
        x: card.x + 0.12, y: card.y + 1.02, w: card.w - 0.24, h: 0.32,
        fontSize: 9, color: DESIGN.colors.mutedText,
        fontFace: DESIGN.fonts.face,
        margin: 0, wrap: true, valign: 'top',
      });
    }
  });
}

function addChart(slide, chartData, region) {
  if (!chartData || !chartData.data || !chartData.data.length) return;
  const typeMap = { bar: 'bar', line: 'line', pie: 'pie', donut: 'doughnut', doughnut: 'doughnut', area: 'line', stackedBar: 'bar', horizontalBar: 'bar' };
  const pptxType = typeMap[chartData.type] || 'bar';
  const titleText = chartData.insight || chartData.title || '';
  let chartY = region.y, chartH = region.h;
  if (titleText) {
    slide.addText(truncate(titleText, 85), { x: region.x + 0.08, y: region.y, w: region.w - 0.16, h: 0.26, fontSize: 10, bold: true, color: DESIGN.colors.titleText, fontFace: DESIGN.fonts.face, margin: 0 });
    chartY = region.y + 0.28; chartH = region.h - 0.28;
  }
  chartH = Math.max(Math.min(chartH, region.y + region.h - chartY - 0.24), 1.5);
  const seriesCount = (chartData.data || []).length;
  const categoryCount = chartData.categoryCount || 0;
  const showValue = categoryCount * seriesCount <= 10;

  const opts = {
    x: region.x + 0.05, y: chartY, w: region.w - 0.10, h: chartH,
    chartColors: DESIGN.colors.chart,
    showLegend: chartData.data.length > 1 || pptxType === 'pie' || pptxType === 'doughnut',
    legendPos: 'b', legendFontSize: 9, legendColor: DESIGN.colors.bodyText,
    showValue: showValue,
    dataLabelFontSize: 8,
    dataLabelColor: DESIGN.colors.titleText,
    dataLabelPosition: 'outEnd',
    catAxisLabelColor: DESIGN.colors.subtitleText,
    valAxisLabelColor: DESIGN.colors.subtitleText,
    catAxisLabelFontSize: 8,
    valAxisLabelFontSize: 8,
    valGridLine: { color: '2C4055', pt: 0.5 },
    catGridLine: { style: 'none' },
    showTitle: false,
    barDir: 'col',
    barGrouping: 'clustered',
    barGapWidthPct: 35,
    // Prevent labels overflowing the plot area
    chartArea: { shadow: false },
    
    // Axis titles — domain-neutral (never hardcode "Blocks" / "Cases")
    showCatAxisTitle: true,
    catAxisTitle: chartData.catAxisTitle || 'Category',
    showValAxisTitle: true,
    valAxisTitle: chartData.unit || chartData.valAxisTitle || 'Amount',
    catAxisTitleColor: DESIGN.colors.subtitleText,
    valAxisTitleColor: DESIGN.colors.subtitleText,
    catAxisTitleFontSize: 9,
    valAxisTitleFontSize: 9
  };

  if (showValue) {
    let maxVal = 0;
    (chartData.data || []).forEach(s => {
      (s.values || []).forEach(v => {
        if (v > maxVal) maxVal = v;
      });
    });
    if (maxVal > 0) {
      opts.valAxisMaxVal = Math.ceil(maxVal * 1.15);
    }
  }
  if (pptxType === 'pie' || pptxType === 'doughnut') {
    delete opts.catAxisLabelColor; delete opts.valAxisLabelColor; delete opts.valGridLine; delete opts.catGridLine;
    delete opts.showCatAxisTitle; delete opts.catAxisTitle; delete opts.showValAxisTitle; delete opts.valAxisTitle;
    opts.dataLabelPosition = 'bestFit'; opts.showPercent = true; opts.showValue = false; opts.showLegend = true; opts.legendPos = 'b';
  }
  if (chartData.type === 'stackedBar') { opts.barGrouping = 'stacked'; opts.dataLabelPosition = 'ctr'; }
  if (chartData.type === 'horizontalBar') { opts.barDir = 'bar'; opts.dataLabelPosition = 'outEnd'; }
  if (chartData.type === 'line' || chartData.type === 'area') { opts.showValue = false; opts.lineDataSymbol = 'circle'; opts.lineDataSymbolSize = 8; }
  
  try {
    slide.addChart(pptxType, chartData.data, opts);
  } catch (err) {
    console.warn('[RenderEngine] Chart failed:', err.message);
  }

  // Data source citation — only the actual uploaded filename (no hardcoded sample)
  const srcName = (META && META.filename) ? String(META.filename) : '';
  if (srcName) {
    slide.addText(`Source: ${truncate(srcName, 80)}`, {
      x: region.x + 0.08, y: chartY + chartH + 0.04, w: region.w - 0.16, h: 0.18,
      fontSize: 8, italic: true, color: DESIGN.colors.mutedText, fontFace: DESIGN.fonts.face, margin: 0
    });
  }
}

function addDataTable(slide, tableSpec, region) {
  if (!tableSpec || !tableSpec.headers || !tableSpec.rows) return;
  const headers = tableSpec.headers.slice(0, 8);
  const rows = tableSpec.rows.slice(0, DESIGN.table.maxRowsPerSlide);
  if (!headers.length) return;
  const colW = region.w / headers.length;
  const tableRows = [];
  tableRows.push(headers.map(h => ({ text: truncate(String(h).toUpperCase(), 22), options: { bold: true, fontSize: DESIGN.fonts.tableHeader, color: DESIGN.colors.tableHeaderText, fill: { color: DESIGN.colors.tableHeaderBg }, align: 'center', valign: 'middle' } })));
  rows.forEach((row, ri) => {
    const isLast = ri === rows.length - 1 && tableSpec.highlightLastRow;
    tableRows.push(headers.map((_, ci) => ({ text: truncate(String(row[ci] ?? ''), 28), options: { fontSize: DESIGN.fonts.tableBody, color: isLast ? DESIGN.colors.tableHeaderText : DESIGN.colors.bodyText, fill: { color: isLast ? DESIGN.colors.tableHeaderBg : ri % 2 === 1 ? DESIGN.colors.tableAltRow : DESIGN.colors.tableBodyBg }, bold: isLast, align: ci === 0 ? 'left' : 'center', valign: 'middle' } })));
  });
  const nRows = tableRows.length; const available = Math.max(region.h - 0.04, 1.5); let rowH = available / nRows; rowH = Math.max(0.38, Math.min(rowH, 0.58)); if (rowH * nRows > available + 0.02) rowH = available / nRows;
  slide.addTable(tableRows, { x: region.x, y: region.y, w: region.w, colW: headers.map(() => colW), rowH, border: { color: DESIGN.colors.tableBorder, pt: 0.5 } });
}

function renderCoverSlide(pres, slide) {
  const s = pres.addSlide();
  // Cover text colours: prefer dedicated coverLeftText when present (dark left panels)
  const leftText = DESIGN.colors.coverLeftText || DESIGN.colors.darkBg;
  const leftMuted = DESIGN.colors.coverLeftMuted || leftText;
  const rightAccent = DESIGN.colors.coverRightAccent || DESIGN.colors.coverAccent;

  // Full dark canvas (right panel base)
  s.addShape('rect', {
    x: 0, y: 0, w: DESIGN.slide.w, h: DESIGN.slide.h,
    fill: { color: DESIGN.colors.darkBg }, line: { type: 'none' },
  });
  // Left institutional panel
  s.addShape('rect', {
    x: 0, y: 0, w: 5.35, h: DESIGN.slide.h,
    fill: { color: DESIGN.colors.coverAccent }, line: { type: 'none' },
  });
  // Subtle vertical accent strip between panels
  s.addShape('rect', {
    x: 5.35, y: 0, w: 0.06, h: DESIGN.slide.h,
    fill: { color: rightAccent }, line: { type: 'none' },
  });

  // Classification strip
  s.addText('CONFIDENTIAL  ·  INTERNAL BRIEFING', {
    x: 0.48, y: 0.55, w: 4.4, h: 0.26,
    fontSize: 9, bold: true, charSpacing: 1.5,
    color: leftMuted, fontFace: DESIGN.fonts.face, margin: 0,
  });

  // Organization — allow full district / department name (wrap if needed)
  const orgLine = (slide.organization || META?.organization || META?.department || 'ORGANIZATION')
    .toString().trim().toUpperCase()
    .replace(/DEPARTMENT OF HEALTH\s*&\s*FAMILY WELFARE,?\s*/i, 'DEPT. OF HEALTH & FAMILY WELFARE, ');
  s.addText(truncate(orgLine, 64), {
    x: 0.48, y: 1.00, w: 4.4, h: 0.60,
    fontSize: 11, bold: true, color: rightAccent,
    fontFace: DESIGN.fonts.face, margin: 0, wrap: true,
  });

  // Main title — senior research style
  const mainTitle = (slide.title || 'Performance Report').toString().trim();
  s.addText(truncate(mainTitle, 72), {
    x: 0.48, y: 1.85, w: 4.4, h: 2.35,
    fontSize: DESIGN.fonts.coverTitle, bold: true, color: leftText,
    fontFace: DESIGN.fonts.face, valign: 'top', margin: 0, wrap: true,
  });

  // Period / reporting window
  const period = (slide.bodyText || slide.period || META?.period || '').toString().trim();
  if (period) {
    s.addText(truncate(period, 56), {
      x: 0.48, y: 4.45, w: 4.4, h: 0.40,
      fontSize: 13, color: leftMuted,
      fontFace: DESIGN.fonts.face, margin: 0, wrap: true,
    });
  }

  // Divider rule
  s.addShape('rect', {
    x: 0.48, y: 5.05, w: 2.6, h: 0.035,
    fill: { color: rightAccent }, line: { type: 'none' },
  });

  // Official seal
  drawSeal(s, 0.48, 5.35, 0.78);

  // Right panel: brief context box
  const rightX = 5.85;
  s.addText('RESEARCH BRIEFING', {
    x: rightX, y: 2.10, w: 6.8, h: 0.28,
    fontSize: 11, bold: true, charSpacing: 1.2,
    color: rightAccent, fontFace: DESIGN.fonts.face, margin: 0,
  });
  s.addText(truncate(slide.subtitle || slide.insightHeadline || 'Epidemiological analysis, field metrics, and programmatic recommendations.', 110), {
    x: rightX, y: 2.50, w: 6.8, h: 1.10,
    fontSize: 15, color: 'CBD5E1',
    fontFace: DESIGN.fonts.face, margin: 0, wrap: true,
  });

  // Audience / purpose chips
  const chips = [
    (META && META.audience) || 'Senior Management',
    (META && META.purpose) || 'Executive Briefing',
  ];
  chips.forEach((chip, i) => {
    const cx = rightX + i * 3.2;
    s.addShape('rect', {
      x: cx, y: 4.00, w: 3.0, h: 0.42,
      fill: { color: DESIGN.colors.kpiCardBg },
      line: { color: DESIGN.colors.kpiCardBorder, pt: 1 },
      rectRadius: 0.04,
    });
    s.addText(truncate(String(chip), 28), {
      x: cx + 0.12, y: 4.00, w: 2.76, h: 0.42,
      fontSize: 11, color: DESIGN.colors.bodyText,
      fontFace: DESIGN.fonts.face, align: 'center', valign: 'middle', margin: 0,
    });
  });

  s.addText('01', {
    x: 12.55, y: 7.12, w: 0.55, h: 0.28,
    fontSize: DESIGN.fonts.slideNum, bold: true,
    color: DESIGN.colors.slideNumText, fontFace: DESIGN.fonts.face,
    align: 'center', margin: 0,
  });
  if (s.addNotes) s.addNotes(slide.speakerNotes || '');
}

function renderSectionSlide(pres, slide) {
  const s = pres.addSlide();
  s.addShape('rect', {
    x: 0, y: 0, w: DESIGN.slide.w, h: DESIGN.slide.h,
    fill: { color: DESIGN.colors.slideBg }, line: { type: 'none' },
  });
  addHeaderBand(s, slide.title || 'Section', slide.subtitle, slide.slideIndex);
  if (slide.bullets && slide.bullets.length) {
    addBullets(s, slide.bullets, {
      x: DESIGN.content.x, y: DESIGN.content.y,
      w: DESIGN.content.w, h: DESIGN.content.h,
    });
  }
  addFooter(s, META?.organization || META?.department);
  if (s.addNotes) s.addNotes(slide.speakerNotes || '');
}

function addInsightHeadline(s, text, region) {
  if (!text) return;
  s.addText(truncate(text, 90), { x: region.x, y: region.y, w: region.w, h: region.h, fontSize: 14, bold: true, color: DESIGN.colors.kpiAmber, fontFace: DESIGN.fonts.face, valign: 'top', margin: 0, wrap: true });
}

function renderContentSlide(pres, slide) {
  const s = pres.addSlide();
  const layout = slide._layout;
  if (!layout) return;
  s.addShape('rect', {
    x: 0, y: 0, w: DESIGN.slide.w, h: DESIGN.slide.h,
    fill: { color: DESIGN.colors.slideBg }, line: { type: 'none' },
  });
  addHeaderBand(s, slide.title, slide.subtitle, slide.slideIndex);

  for (const region of layout.regions) {
    switch (region.role) {
      case 'insightHeadline':
        addInsightHeadline(s, slide.insightHeadline, region);
        break;
      case 'kpiRow':
        addKpiCards(s, slide._kpiCards || []);
        break;
      case 'chart':
        if (slide._chartData) addChart(s, slide._chartData, region);
        break;
      case 'secondaryChart':
        if (slide._secondaryChartData) addChart(s, slide._secondaryChartData, region);
        break;
      case 'table':
        if (slide.table) addDataTable(s, slide.table, region);
        break;
      case 'process':
        if (slide.processSteps && slide.processSteps.length) {
          addProcessSteps(s, slide.processSteps, region);
        } else if (slide.bullets) {
          addProcessFlow(s, slide.bullets, region);
        }
        break;
      case 'bullets': {
        const hasProcess = layout.regions.some(r => r.role === 'process');
        const bulletsToRender = hasProcess && slide.processSteps
          ? slide.bullets
          : (hasProcess ? (slide.bullets || []).slice(4) : slide.bullets);
        addBullets(s, bulletsToRender, region);
        break;
      }
      case 'highlightBlock': {
        // Light themes: soft white callout — never a heavy dark slab
        const isLight = !!DESIGN.isLight;
        const panelBg = isLight ? (DESIGN.colors.kpiCardBg || 'FFFFFF') : DESIGN.colors.tableHeaderBg;
        const panelBorder = isLight ? (DESIGN.colors.kpiCardBorder || 'E2E8F0') : (DESIGN.colors.coverAccent || DESIGN.colors.accentLine);
        const titleCol = isLight ? (DESIGN.colors.titleText || '0F172A') : DESIGN.colors.headerText;
        const bodyCol = isLight ? (DESIGN.colors.bodyText || '1E293B') : DESIGN.colors.bodyText;
        s.addShape('rect', {
          x: region.x, y: region.y, w: region.w, h: region.h,
          fill: { color: panelBg },
          line: { color: panelBorder, pt: isLight ? 1 : 1.25 },
          rectRadius: 0.06,
        });
        s.addShape('rect', {
          x: region.x, y: region.y, w: 0.08, h: region.h,
          fill: { color: DESIGN.colors.kpiAmber || DESIGN.colors.coverAccent },
          line: { type: 'none' },
        });
        s.addText('\u26A0  KEY FINDING', {
          x: region.x + 0.24, y: region.y + 0.22, w: region.w - 0.40, h: 0.32,
          fontSize: 11, bold: true, color: DESIGN.colors.kpiAmber || DESIGN.colors.coverAccent,
          fontFace: DESIGN.fonts.face, align: 'left', valign: 'middle', margin: 0,
        });
        s.addText(truncate(slide.insightHeadline || 'Key Analytical Finding', 55), {
          x: region.x + 0.24, y: region.y + 0.65, w: region.w - 0.42, h: 0.85,
          fontSize: 15, bold: true, color: titleCol,
          fontFace: DESIGN.fonts.face, valign: 'top', margin: 0, wrap: true,
        });
        s.addText(truncate(slide.subtitle || slide.callout || 'Priority focus area requiring management attention.', 160), {
          x: region.x + 0.24, y: region.y + 1.65, w: region.w - 0.42, h: Math.max(region.h - 1.90, 0.8),
          fontSize: 12.5, color: bodyCol,
          fontFace: DESIGN.fonts.face, valign: 'top', margin: 0, wrap: true,
        });
        break;
      }
      case 'compareLeft':
      case 'compareRight': {
        const isLeft = region.role === 'compareLeft';
        const compBullets = isLeft
          ? (slide.bullets || []).filter((_, i) => i % 2 === 0)
          : (slide.bullets || []).filter((_, i) => i % 2 === 1);
        s.addShape('rect', {
          x: region.x, y: region.y, w: region.w, h: region.h,
          fill: { color: DESIGN.colors.bulletCardBg },
          line: { color: DESIGN.colors.kpiCardBorder, pt: 1 },
          rectRadius: 0.05,
        });
        addBullets(s, compBullets, {
          x: region.x + 0.10, y: region.y + 0.10,
          w: region.w - 0.20, h: region.h - 0.20,
        });
        break;
      }
    }
  }

  if (slide.callout) {
    s.addText(truncate(slide.callout, 110), {
      x: DESIGN.margins.left, y: DESIGN.slide.h - 0.48,
      w: DESIGN.slide.w - 1.6, h: 0.22,
      fontSize: 9, italic: true, color: DESIGN.colors.mutedText,
      fontFace: DESIGN.fonts.face, margin: 0,
    });
  }

  addFooter(s, META?.organization || META?.department || slide.organization);
  addWatermark(s);
  if (s.addNotes) s.addNotes(slide.speakerNotes || '');
}

function addProcessSteps(slide, steps, region) {
  if (!steps || !steps.length) return;
  const items = steps.slice(0, 5);
  const n = items.length;
  const cardW = (region.w - (n - 1) * 0.14) / n;
  const cardH = region.h;

  items.forEach((item, i) => {
    const x = region.x + i * (cardW + 0.14);
    slide.addShape('rect', {
      x, y: region.y, w: cardW, h: cardH,
      fill: { color: DESIGN.colors.bulletCardBg },
      line: { color: DESIGN.colors.kpiCardBorder, pt: 1 },
      rectRadius: 0.05,
    });
    slide.addShape('rect', {
      x: x + 0.12, y: region.y + 0.12, w: 0.40, h: 0.28,
      fill: { color: i % 2 === 0 ? DESIGN.colors.coverAccent : DESIGN.colors.bulletAccent },
      line: { type: 'none' }, rectRadius: 0.03,
    });
    slide.addText(String(i + 1).padStart(2, '0'), {
      x: x + 0.12, y: region.y + 0.12, w: 0.40, h: 0.28,
      fontSize: 10, bold: true, color: DESIGN.colors.darkBg || DESIGN.colors.headerText,
      fontFace: DESIGN.fonts.face, align: 'center', valign: 'middle', margin: 0,
    });
    const title = typeof item === 'object' ? (item.title || '') : String(item);
    const desc = typeof item === 'object' ? (item.description || '') : '';
    slide.addText(truncate(title, 48), {
      x: x + 0.12, y: region.y + 0.50, w: cardW - 0.24, h: 0.55,
      fontSize: 12, bold: true, color: DESIGN.colors.titleText,
      fontFace: DESIGN.fonts.face, valign: 'top', margin: 0, wrap: true,
    });
    if (desc) {
      slide.addText(truncate(desc, 90), {
        x: x + 0.12, y: region.y + 1.10, w: cardW - 0.24, h: cardH - 1.25,
        fontSize: 11, color: DESIGN.colors.bodyText,
        fontFace: DESIGN.fonts.face, valign: 'top', margin: 0, wrap: true,
      });
    }
    if (i < n - 1) {
      slide.addText('\u279E', {
        x: x + cardW + 0.01, y: region.y + cardH / 2 - 0.18, w: 0.12, h: 0.36,
        fontSize: 16, color: DESIGN.colors.coverAccent,
        fontFace: DESIGN.fonts.face, align: 'center', valign: 'middle', margin: 0,
      });
    }
  });
}

function renderAgendaSlide(pres, slide) {
  const s = pres.addSlide();
  s.addShape('rect', {
    x: 0, y: 0, w: DESIGN.slide.w, h: DESIGN.slide.h,
    fill: { color: DESIGN.colors.slideBg }, line: { type: 'none' },
  });
  addHeaderBand(s, slide.title || 'Strategic Agenda', slide.subtitle, slide.slideIndex);
  const items = (slide.bullets || []).slice(0, 8);
  const startY = DESIGN.content.y + 0.06;
  const itemH = Math.min(0.64, (DESIGN.content.h - 0.20) / Math.max(items.length, 1));
  items.forEach((item, i) => {
    const y = startY + i * itemH;
    // Number badge
    s.addShape('rect', {
      x: DESIGN.content.x, y: y + 0.06, w: 0.42, h: itemH - 0.14,
      fill: { color: i % 2 === 0 ? DESIGN.colors.coverAccent : DESIGN.colors.kpiCardBg },
      line: { color: DESIGN.colors.kpiCardBorder, pt: i % 2 === 0 ? 0 : 1 },
      rectRadius: 0.03,
    });
    s.addText(String(i + 1).padStart(2, '0'), {
      x: DESIGN.content.x, y: y + 0.06, w: 0.42, h: itemH - 0.14,
      fontSize: 12, bold: true,
      color: i % 2 === 0 ? DESIGN.colors.darkBg : DESIGN.colors.headerText,
      fontFace: DESIGN.fonts.face, align: 'center', valign: 'middle', margin: 0,
    });
    // Item card
    s.addShape('rect', {
      x: DESIGN.content.x + 0.52, y: y + 0.06, w: DESIGN.content.w - 0.52, h: itemH - 0.14,
      fill: { color: DESIGN.colors.bulletCardBg },
      line: { color: DESIGN.colors.kpiCardBorder, pt: 0.75 },
      rectRadius: 0.04,
    });
    s.addText(truncate(String(item), 90), {
      x: DESIGN.content.x + 0.68, y: y + 0.06, w: DESIGN.content.w - 0.78, h: itemH - 0.14,
      fontSize: 14.5, color: DESIGN.colors.bodyText,
      fontFace: DESIGN.fonts.face, valign: 'middle', margin: 0,
    });
  });
  addFooter(s, META?.organization || META?.department);
  if (s.addNotes) s.addNotes(slide.speakerNotes || '');
}

async function renderPresentation(blueprint, meta = {}) {
  META = meta;
  // Apply brand theme before any slide is drawn (default: SharyX purple)
  applyTheme((meta && meta.theme) || 'sharyx');
  console.log('[RenderEngine] Rendering ' + blueprint.length + ' slides (theme=' + DESIGN.themeId + ')...');
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'SharyX';
  pres.company = 'SharyX';
  pres.subject = (blueprint[0] && blueprint[0].title) || 'Presentation';
  pres.title = (blueprint[0] && blueprint[0].title) || 'Presentation';
  for (let i = 0; i < blueprint.length; i++) {
    const slide = blueprint[i];
    const type = slide.slideType || 'insights';
    try {
      if (type === 'cover') renderCoverSlide(pres, slide);
      else if (type === 'section') renderSectionSlide(pres, slide);
      else if (type === 'agenda') renderAgendaSlide(pres, slide);
      else if (type === 'recommendations' || type === 'actions') renderRecommendationsSlide(pres, slide);
      else if (type === 'conclusion' || type === 'thankyou' || type === 'closing') renderConclusionSlide(pres, slide);
      else renderContentSlide(pres, slide);
    } catch (err) {
      console.error('[RenderEngine] Slide ' + (i + 1) + ' error:', err.message);
    }
  }
  const buffer = await pres.write({ outputType: 'nodebuffer' });
  console.log('[RenderEngine] Done. ' + buffer.length + ' bytes');
  return buffer;
}

module.exports = { renderPresentation };
