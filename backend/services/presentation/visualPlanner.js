'use strict';
/**
 * visualPlanner.js
 * Layout rules:
 *  - Charts MEDIUM size (not full-bleed) with room for insight text/boxes
 *  - Chart slides ALWAYS pair with bullets or KPI strip when possible
 *  - Table slides = table only
 *  - Full-width chart only when ≥5 categories
 */

const { DESIGN, kpiColor, chartColor, kpiCardLayout } = require('./designConstitution');

function selectChartType(chartSpec) {
  if (!chartSpec) return null;
  const requested = (chartSpec.chartType || '').toLowerCase().replace(/[_\s-]/g, '');
  const seriesCount = (chartSpec.series || []).length;
  const catCount = (chartSpec.categories || []).length;

  if (['bar', 'line', 'pie', 'donut', 'doughnut'].includes(requested)) {
    return requested === 'doughnut' ? 'donut' : requested;
  }
  if (requested === 'stackedbar' || requested === 'stacked') return 'stackedBar';
  if (requested === 'horizontalbar' || requested === 'horizontal') return 'horizontalBar';
  if (requested === 'area') return 'line';

  if (seriesCount === 1 && catCount <= 5 && catCount >= 2) return 'donut';
  if (seriesCount >= 2 && catCount <= 14) return 'bar';
  if (catCount > 14) return 'line';
  return 'bar';
}

function prepareChartData(chartSpec) {
  if (!chartSpec) return null;
  const chartType = selectChartType(chartSpec);
  const series = (chartSpec.series || []).map((s, i) => ({
    name: s.name || `Series ${i + 1}`,
    labels: chartSpec.categories || [],
    values: (s.values || []).map(v => (typeof v === 'number' ? v : parseFloat(v) || 0)),
  }));
  return {
    type: chartType,
    data: series,
    insight: chartSpec.insight || '',
    unit: chartSpec.unit || '',
    title: chartSpec.title || '',
    categoryCount: (chartSpec.categories || []).length,
  };
}

function prepareKpiCards(kpiCards, startY = null) {
  if (!kpiCards || !kpiCards.length) return [];
  const count = Math.min(kpiCards.length, 5); // max 5 so cards stay readable
  const cards = kpiCards.slice(0, count);
  const positions = kpiCardLayout(count);
  const y = startY ?? DESIGN.content.y;
  return cards.map((card, i) => ({
    ...card,
    ...positions[i],
    y,
    color: kpiColor(card.label, card.value, card.trend),
    displayValue: card.value || '—',
    displayUnit: card.unit || '',
    displayLabel: (card.label || '').toUpperCase(),
    displayContext: card.context || '',
  }));
}

function planSlideLayout(slide) {
  const type = slide.slideType || 'insights';
  const hasBullets = slide.bullets && slide.bullets.length > 0;
  const hasChart = !!slide.chart;
  const hasSecondary = !!slide.secondaryChart;
  const hasTable = !!slide.table;
  const hasKpi = slide.kpiCards && slide.kpiCards.length > 0;
  // Only treat as a real headline if it is substantive (not a generic placeholder)
  const rawHeadline = String(slide.insightHeadline || '').trim();
  const hasInsightHeadline = rawHeadline.length >= 20
    && !/key analytical finding|priority focus|see source|no additional/i.test(rawHeadline);
  const catCount = (slide.chart && slide.chart.categories) ? slide.chart.categories.length : 0;

  // Header height 0.78 with gold rule; tight breathing room under it
  const contentTop = DESIGN.headerBand.h + 0.12;
  const contentBottom = DESIGN.slide.h - DESIGN.margins.bottom - 0.14;
  const contentH = contentBottom - contentTop;
  const contentX = DESIGN.margins.left;
  const contentW = DESIGN.slide.w - DESIGN.margins.left - DESIGN.margins.right;

  let layout = { type, contentX, contentTop, contentH, contentW, regions: [] };

  switch (type) {
    case 'cover': {
      layout.regions = [
        { role: 'coverBg', x: 0, y: 0, w: DESIGN.slide.w, h: DESIGN.slide.h },
      ];
      break;
    }

    case 'kpi':
    case 'overview': {
      const cardCount = (slide.kpiCards || []).length;
      const insightH = hasInsightHeadline ? 0.36 : 0;
      // Few cards → sit cards higher and use remaining area for bullets/chart
      const kpiY = contentTop + insightH + 0.06;
      const kpiH = DESIGN.kpiCard.h;
      const remainY = kpiY + kpiH + 0.14;
      const remainH = Math.max(contentBottom - remainY, 1.2);

      layout.regions = [
        ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: insightH }] : []),
        { role: 'kpiRow', x: contentX, y: kpiY, w: contentW, h: kpiH },
      ];
      if (hasChart) {
        layout.regions.push({ role: 'chart', x: contentX, y: remainY, w: contentW, h: Math.min(remainH, 3.6) });
      } else if (hasBullets) {
        layout.regions.push({ role: 'bullets', x: contentX, y: remainY, w: contentW, h: remainH });
      } else if (cardCount > 0 && cardCount <= 3) {
        // Thin KPI-only page: expand card row slightly so it doesn't float in empty space
        layout.regions = [
          ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: insightH }] : []),
          { role: 'kpiRow', x: contentX, y: contentTop + insightH + (contentH - kpiH) * 0.28, w: contentW, h: kpiH },
        ];
      }
      break;
    }

    case 'chart': {
      // Prefer a large chart when there is no side text; avoid half-empty canvases
      const insightH = hasInsightHeadline ? 0.34 : 0;
      const chartY = contentTop + insightH + 0.04;
      const realBullets = hasBullets && (slide.bullets || []).filter((b) => String(b || '').trim().length >= 12).length > 0;

      if (realBullets && catCount >= 5) {
        const chartH = Math.min(3.6, contentH * 0.58);
        const bulletY = chartY + chartH + 0.12;
        layout.regions = [
          ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: insightH }] : []),
          { role: 'chart', x: contentX, y: chartY, w: contentW, h: chartH },
          { role: 'bullets', x: contentX, y: bulletY, w: contentW, h: Math.min(1.9, contentBottom - bulletY) },
        ];
      } else if (realBullets) {
        const bodyY = contentTop + insightH + 0.04;
        const bodyH = contentH - insightH - 0.04;
        const chartW = contentW * 0.60;
        layout.regions = [
          ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: insightH }] : []),
          { role: 'chart', x: contentX, y: bodyY, w: chartW, h: bodyH },
          { role: 'bullets', x: contentX + chartW + 0.16, y: bodyY, w: contentW - chartW - 0.16, h: bodyH },
        ];
      } else {
        // No useful bullets — fill most of the content area with the chart
        const chartH = Math.min(contentH - insightH - 0.08, 4.6);
        layout.regions = [
          ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: insightH }] : []),
          { role: 'chart', x: contentX, y: chartY, w: contentW, h: chartH },
        ];
      }
      break;
    }

    case 'dualChart': {
      const insightH = hasInsightHeadline ? 0.32 : 0;
      const chartY = contentTop + insightH + 0.04;
      const bulletReserve = hasBullets ? 1.50 : 0.10;
      const chartH = Math.min(3.2, contentH - insightH - bulletReserve - 0.08);
      const halfW = (contentW - 0.20) / 2;
      const bulletY = chartY + chartH + 0.10;

      layout.regions = [
        ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: insightH }] : []),
        { role: 'chart', x: contentX, y: chartY, w: halfW, h: chartH },
        { role: 'secondaryChart', x: contentX + halfW + 0.20, y: chartY, w: halfW, h: chartH },
        ...(hasBullets ? [{ role: 'bullets', x: contentX, y: bulletY, w: contentW, h: Math.min(1.40, contentBottom - bulletY) }] : []),
      ];
      break;
    }

    case 'table': {
      // Table only — full content area. No bullets under tables.
      const insightH = hasInsightHeadline ? 0.34 : 0;
      const tableY = contentTop + insightH + 0.04;
      layout.regions = [
        ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: insightH }] : []),
        { role: 'table', x: contentX, y: tableY, w: contentW, h: contentH - insightH - 0.06 },
      ];
      break;
    }

    case 'recommendations': {
      // Full-width action list — never a left callout panel
      const bodyY = contentTop + (hasInsightHeadline ? 0.36 : 0.04);
      const bodyH = contentH - (hasInsightHeadline ? 0.36 : 0.04);
      layout.regions = [
        ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: 0.30 }] : []),
        { role: 'bullets', x: contentX, y: bodyY, w: contentW, h: bodyH },
      ];
      break;
    }

    case 'insights': {
      if (hasChart && hasBullets) {
        const splitW = contentW * 0.55;
        const bodyY = contentTop + (hasInsightHeadline ? 0.40 : 0);
        const bodyH = contentH - (hasInsightHeadline ? 0.40 : 0);
        layout.regions = [
          ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: 0.34 }] : []),
          { role: 'chart', x: contentX, y: bodyY, w: splitW, h: bodyH },
          { role: 'bullets', x: contentX + splitW + 0.18, y: bodyY, w: contentW - splitW - 0.18, h: bodyH },
        ];
      } else if (hasKpi && hasBullets) {
        const kpiY = contentTop + (hasInsightHeadline ? 0.38 : 0.04);
        const kpiH = Math.min(DESIGN.kpiCard.h, 1.55);
        const remainY = kpiY + kpiH + 0.12;
        const hasCallout = !!slide.callout;
        const effectiveBottom = contentBottom - (hasCallout ? 0.40 : 0);
        layout.regions = [
          ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: 0.34 }] : []),
          { role: 'kpiRow', x: contentX, y: kpiY, w: contentW, h: kpiH },
          { role: 'bullets', x: contentX, y: remainY, w: contentW, h: Math.max(0.8, effectiveBottom - remainY) },
        ];
      } else if (hasBullets && (slide.bullets || []).length >= 4) {
        // Enough content: full-width cards, no left panel
        const bodyY = contentTop + (hasInsightHeadline ? 0.36 : 0.04);
        const bodyH = contentH - (hasInsightHeadline ? 0.36 : 0.04);
        layout.regions = [
          ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: 0.30 }] : []),
          { role: 'bullets', x: contentX, y: bodyY, w: contentW, h: bodyH },
        ];
      } else {
        // Sparse: soft callout (28%) + bullets (68%)
        // Full-width insight bullets — no left KEY FINDING callout (was overused / looked generic)
        const bodyY = contentTop + (hasInsightHeadline ? 0.36 : 0.04);
        const bodyH = contentH - (hasInsightHeadline ? 0.36 : 0.04);
        layout.regions = [
          ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: 0.30 }] : []),
          { role: 'bullets', x: contentX, y: bodyY, w: contentW, h: bodyH },
        ];
      }
      break;
    }

    case 'comparison': {
      const colW = (contentW - 0.24) / 2;
      layout.regions = [
        { role: 'compareLeft', x: contentX, y: contentTop, w: colW, h: contentH },
        { role: 'compareRight', x: contentX + colW + 0.24, y: contentTop, w: colW, h: contentH },
      ];
      break;
    }

    case 'summary': {
      layout.regions = [
        { role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: 0.32 },
        { role: 'kpiRow', x: contentX, y: contentTop + 0.38, w: contentW, h: DESIGN.kpiCard.h },
        { role: 'bullets', x: contentX, y: contentTop + 0.38 + DESIGN.kpiCard.h + 0.12, w: contentW, h: contentH - 0.38 - DESIGN.kpiCard.h - 0.16 },
      ];
      break;
    }

    case 'process':
    case 'framework': {
      const insightH = hasInsightHeadline ? 0.34 : 0;
      layout.regions = [
        ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: insightH }] : []),
        { role: 'process', x: contentX, y: contentTop + insightH + 0.08, w: contentW, h: Math.min(2.6, contentH - insightH - 0.20) },
        ...(hasBullets ? [{
          role: 'bullets',
          x: contentX,
          y: contentTop + insightH + 2.80,
          w: contentW,
          h: Math.max(1.2, contentBottom - (contentTop + insightH + 2.80)),
        }] : []),
      ];
      break;
    }

    case 'agenda':
    default: {
      const t = (slide.title || '').toLowerCase();
      if ((t.includes('efficac') || t.includes('paradox') || t.includes('cause') || t.includes('investigat')) && hasBullets) {
        layout.regions = [
          ...(hasInsightHeadline ? [{ role: 'insightHeadline', x: contentX, y: contentTop, w: contentW, h: 0.32 }] : []),
          { role: 'process', x: contentX, y: contentTop + 0.40, w: contentW, h: 2.4 },
          { role: 'bullets', x: contentX, y: contentTop + 2.95, w: contentW, h: contentH - 3.05 },
        ];
      } else {
        layout.regions = [
          { role: 'bullets', x: contentX, y: contentTop, w: contentW, h: contentH },
        ];
      }
    }
  }

  return layout;
}

function applyVisualPlanningAndLayout(blueprint) {
  return blueprint.map(slide => {
    const enhanced = { ...slide };

    // Prefer clean chart slides (no auto-injected bullets / percentage side panels).
    // Keep existing bullets only if strategy already set unique non-% insights.
    if (slide.chart) {
      if (Array.isArray(slide.bullets) && slide.bullets.length) {
        slide.bullets = slide.bullets.filter(b => {
          const s = String(b || '');
          if (/%/.test(s) && /preterm|birth weight|elbw|lbw|of the register|recorded birth/i.test(s)) return false;
          if (/figures taken from the source|leading categories:/i.test(s)) return false;
          return true;
        }).slice(0, 2);
      }
      enhanced._chartData = prepareChartData(slide.chart);
    }
    if (slide.secondaryChart) enhanced._secondaryChartData = prepareChartData(slide.secondaryChart);

    enhanced._layout = planSlideLayout(enhanced);

    if (slide.kpiCards && slide.kpiCards.length) {
      const kpiRegion = (enhanced._layout.regions || []).find(r => r.role === 'kpiRow');
      enhanced._kpiCards = prepareKpiCards(slide.kpiCards, kpiRegion ? kpiRegion.y : null);
    }

    return enhanced;
  });
}

module.exports = { applyVisualPlanningAndLayout, prepareChartData, prepareKpiCards, planSlideLayout };
