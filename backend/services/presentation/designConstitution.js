'use strict';
/**
 * designConstitution.js — Layout templates × Color palettes
 *
 * TEMPLATES (4) — structural DNA: spacing, cover style, fonts, density
 *   1. sharyx     — modern SaaS, geometric sans, balanced
 *   2. executive  — institutional boardroom, Calibri, spacious
 *   3. aurora     — clean light editorial, Georgia headings, airy
 *   4. carbon     — dark tech, dense data, high-contrast
 *
 * COLOR PALETTES (10) — independent accent systems applied on any template
 *   violet | navygold | sky | cyan | emerald | rose | amber | teal | indigo | slate
 *
 * Theme id formats accepted by applyTheme / getDesign:
 *   "sharyx"              → template sharyx + its default palette (violet)
 *   "sharyx:emerald"      → template sharyx + emerald palette
 *   "executive_rose"      → template executive + rose palette
 *   "emerald"             → default template (sharyx) + emerald palette
 */

const FONT_PACKS = {
  sharyx:    { face: 'Arial',   heading: 'Arial',         mono: 'Consolas' },
  executive: { face: 'Calibri', heading: 'Calibri',       mono: 'Consolas' },
  aurora:    { face: 'Calibri', heading: 'Georgia',       mono: 'Courier New' },
  carbon:    { face: 'Arial',   heading: 'Arial',         mono: 'Consolas' },
};

const LAYOUT_PACKS = {
  sharyx: {
    coverStyle: 'split-left',
    headerStyle: 'band',
    contentAlign: 'left',
    cardRadius: 0.08,
    chartBarGap: 28,
    chartGrouping: 'clustered',
    density: 'balanced',
    kpiStyle: 'rounded-cards',
    tableStyle: 'modern',
    fonts: {
      coverTitle: 32, sectionTitle: 24, slideTitle: 18, slideSubtitle: 12,
      kpiValue: 26, kpiLabel: 11, bodyText: 13, bulletText: 12.5,
      tableHeader: 11, tableBody: 10.5, footer: 8, slideNum: 9, chartLabel: 9.5,
    },
  },
  executive: {
    coverStyle: 'centered-seal',
    headerStyle: 'thin-gold-line',
    contentAlign: 'left',
    cardRadius: 0.04,
    chartBarGap: 40,
    chartGrouping: 'clustered',
    density: 'spacious',
    kpiStyle: 'metric-strip',
    tableStyle: 'classic',
    fonts: {
      coverTitle: 36, sectionTitle: 26, slideTitle: 17, slideSubtitle: 11,
      kpiValue: 28, kpiLabel: 10, bodyText: 12.5, bulletText: 12,
      tableHeader: 10.5, tableBody: 10, footer: 8, slideNum: 9, chartLabel: 9,
    },
  },
  aurora: {
    coverStyle: 'top-hero',
    headerStyle: 'minimal-text',
    contentAlign: 'left',
    cardRadius: 0.12,
    chartBarGap: 48,
    chartGrouping: 'clustered',
    density: 'airy',
    kpiStyle: 'soft-tiles',
    tableStyle: 'open',
    fonts: {
      coverTitle: 38, sectionTitle: 28, slideTitle: 20, slideSubtitle: 13,
      kpiValue: 30, kpiLabel: 11, bodyText: 14, bulletText: 13,
      tableHeader: 11, tableBody: 11, footer: 9, slideNum: 10, chartLabel: 10,
    },
  },
  carbon: {
    coverStyle: 'full-dark',
    headerStyle: 'neon-edge',
    contentAlign: 'left',
    cardRadius: 0.06,
    chartBarGap: 20,
    chartGrouping: 'clustered',
    density: 'dense',
    kpiStyle: 'glow-cards',
    tableStyle: 'grid-dense',
    fonts: {
      coverTitle: 34, sectionTitle: 22, slideTitle: 16, slideSubtitle: 11,
      kpiValue: 24, kpiLabel: 10, bodyText: 12, bulletText: 11.5,
      tableHeader: 10, tableBody: 9.5, footer: 7.5, slideNum: 8, chartLabel: 8.5,
    },
  },
};

const COLOR_PALETTES = {
  violet: {
    id: 'violet',
    label: 'Violet',
    description: 'Brand purple · modern product',
    isLight: false,
    swatches: ['#7C3AED', '#0B0F1A', '#06B6D4', '#A78BFA'],
    colors: {
      slideBg: '0B0F1A', darkBg: '070B14', coverAccent: '7C3AED',
      headerBand: '0B0F1A', headerText: 'F8FAFC', headerSub: 'A78BFA',
      kpiGreen: '22C55E', kpiAmber: 'F59E0B', kpiRed: 'EF4444', kpiBlue: '6366F1', kpiNavy: '818CF8',
      kpiCardBg: '13182B', kpiCardBorder: '2A3352',
      tableHeaderBg: '1E1B4B', tableHeaderText: 'F8FAFC', tableAltRow: '12162A', tableBorder: '2A3352', tableBodyBg: '13182B',
      chart: ['7C3AED', '06B6D4', '22C55E', 'F59E0B', 'EC4899', '3B82F6', 'A78BFA'],
      titleText: 'F8FAFC', bodyText: 'CBD5E1', subtitleText: '94A3B8', mutedText: '64748B',
      slideNumBg: '7C3AED', slideNumText: 'FFFFFF', bulletAccent: 'A78BFA', bulletCardBg: '13182B',
      footerText: '64748B', footerLine: '2A3352', processStep: '7C3AED', accentLine: '7C3AED',
    },
  },
  navygold: {
    id: 'navygold',
    label: 'Navy Gold',
    description: 'Deep navy · restrained gold · formal',
    isLight: false,
    swatches: ['#C9A227', '#071018', '#3B82F6', '#152536'],
    colors: {
      slideBg: '0F1A27', darkBg: '071018', coverAccent: 'C9A227',
      headerBand: '071018', headerText: 'F8FAFC', headerSub: 'C9A227',
      kpiGreen: '22C55E', kpiAmber: 'C9A227', kpiRed: 'EF4444', kpiBlue: '3B82F6', kpiNavy: '60A5FA',
      kpiCardBg: '152536', kpiCardBorder: '2A3F55',
      tableHeaderBg: '0C1622', tableHeaderText: 'F8FAFC', tableAltRow: '121E2C', tableBorder: '2A3F55', tableBodyBg: '152536',
      chart: ['C9A227', '3B82F6', '22C55E', 'EF4444', '94A3B8', '60A5FA', 'D4AF37'],
      titleText: 'F8FAFC', bodyText: 'CBD5E1', subtitleText: '94A3B8', mutedText: '64748B',
      slideNumBg: 'C9A227', slideNumText: '071018', bulletAccent: 'C9A227', bulletCardBg: '152536',
      footerText: '64748B', footerLine: '2A3F55', processStep: 'C9A227', accentLine: 'C9A227',
    },
  },
  sky: {
    id: 'sky',
    label: 'Sky Blue',
    description: 'White canvas · sky blue · airy',
    isLight: true,
    swatches: ['#0284C7', '#F8FAFC', '#0F2744', '#0EA5E9'],
    colors: {
      slideBg: 'F8FAFC', darkBg: '0F2744', coverAccent: '0284C7',
      headerBand: 'FFFFFF', headerText: '0F172A', headerSub: '0284C7',
      kpiGreen: '16A34A', kpiAmber: 'D97706', kpiRed: 'DC2626', kpiBlue: '0284C7', kpiNavy: '0F2744',
      kpiCardBg: 'FFFFFF', kpiCardBorder: 'E2E8F0',
      tableHeaderBg: '0F2744', tableHeaderText: 'FFFFFF', tableAltRow: 'F1F5F9', tableBorder: 'E2E8F0', tableBodyBg: 'FFFFFF',
      chart: ['0284C7', '0EA5E9', '16A34A', 'D97706', '7C3AED', 'DC2626', '64748B'],
      titleText: '0F172A', bodyText: '1E293B', subtitleText: '475569', mutedText: '94A3B8',
      slideNumBg: '0F2744', slideNumText: 'FFFFFF', bulletAccent: '0284C7', bulletCardBg: 'FFFFFF',
      footerText: '94A3B8', footerLine: 'E2E8F0', processStep: '0284C7', accentLine: '0EA5E9',
      coverLeftText: 'F8FAFC', coverLeftMuted: '94A3B8', coverRightAccent: '38BDF8',
    },
  },
  cyan: {
    id: 'cyan',
    label: 'Cyan Neon',
    description: 'Near-black · cyan neon · high contrast',
    isLight: false,
    swatches: ['#22D3EE', '#05070D', '#A78BFA', '#4ADE80'],
    colors: {
      slideBg: '05070D', darkBg: '02040A', coverAccent: '22D3EE',
      headerBand: '02040A', headerText: 'F0FDFA', headerSub: '22D3EE',
      kpiGreen: '4ADE80', kpiAmber: 'FBBF24', kpiRed: 'F87171', kpiBlue: '22D3EE', kpiNavy: '67E8F9',
      kpiCardBg: '0A1219', kpiCardBorder: '164E63',
      tableHeaderBg: '083344', tableHeaderText: 'ECFEFF', tableAltRow: '071018', tableBorder: '164E63', tableBodyBg: '0A1219',
      chart: ['22D3EE', 'A78BFA', '4ADE80', 'F472B6', 'FBBF24', '60A5FA', '2DD4BF'],
      titleText: 'F0FDFA', bodyText: 'CBD5E1', subtitleText: '94A3B8', mutedText: '64748B',
      slideNumBg: '22D3EE', slideNumText: '02040A', bulletAccent: '22D3EE', bulletCardBg: '0A1219',
      footerText: '64748B', footerLine: '164E63', processStep: '22D3EE', accentLine: '22D3EE',
    },
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald',
    description: 'Forest green · growth · trust',
    isLight: false,
    swatches: ['#10B981', '#0A1F1A', '#34D399', '#059669'],
    colors: {
      slideBg: '0A1410', darkBg: '06100C', coverAccent: '10B981',
      headerBand: '06100C', headerText: 'F0FDF4', headerSub: '34D399',
      kpiGreen: '22C55E', kpiAmber: 'F59E0B', kpiRed: 'EF4444', kpiBlue: '14B8A6', kpiNavy: '6EE7B7',
      kpiCardBg: '0F1F1A', kpiCardBorder: '14532D',
      tableHeaderBg: '064E3B', tableHeaderText: 'ECFDF5', tableAltRow: '0C1A15', tableBorder: '14532D', tableBodyBg: '0F1F1A',
      chart: ['10B981', '34D399', 'F59E0B', '3B82F6', 'A78BFA', 'F472B6', '2DD4BF'],
      titleText: 'F0FDF4', bodyText: 'D1FAE5', subtitleText: 'A7F3D0', mutedText: '6B7280',
      slideNumBg: '10B981', slideNumText: '06100C', bulletAccent: '34D399', bulletCardBg: '0F1F1A',
      footerText: '6B7280', footerLine: '14532D', processStep: '10B981', accentLine: '10B981',
    },
  },
  rose: {
    id: 'rose',
    label: 'Rose',
    description: 'Magenta rose · bold creative',
    isLight: false,
    swatches: ['#E11D48', '#1A0A10', '#FB7185', '#F43F5E'],
    colors: {
      slideBg: '140A0F', darkBg: '0C0609', coverAccent: 'E11D48',
      headerBand: '0C0609', headerText: 'FFF1F2', headerSub: 'FB7185',
      kpiGreen: '22C55E', kpiAmber: 'F59E0B', kpiRed: 'F87171', kpiBlue: 'F472B6', kpiNavy: 'FDA4AF',
      kpiCardBg: '1F1015', kpiCardBorder: '4C0519',
      tableHeaderBg: '881337', tableHeaderText: 'FFF1F2', tableAltRow: '180C11', tableBorder: '4C0519', tableBodyBg: '1F1015',
      chart: ['E11D48', 'F472B6', 'A78BFA', 'F59E0B', '22C55E', '38BDF8', 'FB7185'],
      titleText: 'FFF1F2', bodyText: 'FECDD3', subtitleText: 'FDA4AF', mutedText: '9CA3AF',
      slideNumBg: 'E11D48', slideNumText: 'FFFFFF', bulletAccent: 'FB7185', bulletCardBg: '1F1015',
      footerText: '9CA3AF', footerLine: '4C0519', processStep: 'E11D48', accentLine: 'E11D48',
    },
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    description: 'Warm amber · energy · finance',
    isLight: false,
    swatches: ['#F59E0B', '#1A1206', '#FBBF24', '#D97706'],
    colors: {
      slideBg: '14100A', darkBg: '0C0905', coverAccent: 'F59E0B',
      headerBand: '0C0905', headerText: 'FFFBEB', headerSub: 'FBBF24',
      kpiGreen: '22C55E', kpiAmber: 'FBBF24', kpiRed: 'EF4444', kpiBlue: 'F97316', kpiNavy: 'FCD34D',
      kpiCardBg: '1F180C', kpiCardBorder: '78350F',
      tableHeaderBg: '92400E', tableHeaderText: 'FFFBEB', tableAltRow: '18120A', tableBorder: '78350F', tableBodyBg: '1F180C',
      chart: ['F59E0B', 'F97316', '22C55E', '3B82F6', 'A78BFA', 'EF4444', 'FBBF24'],
      titleText: 'FFFBEB', bodyText: 'FDE68A', subtitleText: 'FCD34D', mutedText: '9CA3AF',
      slideNumBg: 'F59E0B', slideNumText: '0C0905', bulletAccent: 'FBBF24', bulletCardBg: '1F180C',
      footerText: '9CA3AF', footerLine: '78350F', processStep: 'F59E0B', accentLine: 'F59E0B',
    },
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    description: 'Teal · calm professional · healthcare',
    isLight: false,
    swatches: ['#14B8A6', '#0A1614', '#2DD4BF', '#0D9488'],
    colors: {
      slideBg: '0A1412', darkBg: '06100E', coverAccent: '14B8A6',
      headerBand: '06100E', headerText: 'F0FDFA', headerSub: '5EEAD4',
      kpiGreen: '22C55E', kpiAmber: 'F59E0B', kpiRed: 'EF4444', kpiBlue: '14B8A6', kpiNavy: '5EEAD4',
      kpiCardBg: '0F1F1C', kpiCardBorder: '115E59',
      tableHeaderBg: '134E4A', tableHeaderText: 'CCFBF1', tableAltRow: '0C1A17', tableBorder: '115E59', tableBodyBg: '0F1F1C',
      chart: ['14B8A6', '2DD4BF', '3B82F6', 'F59E0B', 'A78BFA', 'F472B6', '22C55E'],
      titleText: 'F0FDFA', bodyText: 'CCFBF1', subtitleText: '99F6E4', mutedText: '6B7280',
      slideNumBg: '14B8A6', slideNumText: '06100E', bulletAccent: '2DD4BF', bulletCardBg: '0F1F1C',
      footerText: '6B7280', footerLine: '115E59', processStep: '14B8A6', accentLine: '14B8A6',
    },
  },
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    description: 'Deep indigo · corporate · strategy',
    isLight: false,
    swatches: ['#4F46E5', '#0B0A1A', '#818CF8', '#6366F1'],
    colors: {
      slideBg: '0B0A1A', darkBg: '070614', coverAccent: '4F46E5',
      headerBand: '070614', headerText: 'EEF2FF', headerSub: 'A5B4FC',
      kpiGreen: '22C55E', kpiAmber: 'F59E0B', kpiRed: 'EF4444', kpiBlue: '6366F1', kpiNavy: '818CF8',
      kpiCardBg: '13122B', kpiCardBorder: '312E81',
      tableHeaderBg: '1E1B4B', tableHeaderText: 'EEF2FF', tableAltRow: '100F22', tableBorder: '312E81', tableBodyBg: '13122B',
      chart: ['4F46E5', '818CF8', '22C55E', 'F59E0B', 'EC4899', '06B6D4', 'A5B4FC'],
      titleText: 'EEF2FF', bodyText: 'C7D2FE', subtitleText: 'A5B4FC', mutedText: '64748B',
      slideNumBg: '4F46E5', slideNumText: 'FFFFFF', bulletAccent: '818CF8', bulletCardBg: '13122B',
      footerText: '64748B', footerLine: '312E81', processStep: '4F46E5', accentLine: '4F46E5',
    },
  },
  slate: {
    id: 'slate',
    label: 'Slate',
    description: 'Neutral slate · minimal · consulting',
    isLight: false,
    swatches: ['#64748B', '#0F172A', '#94A3B8', '#38BDF8'],
    colors: {
      slideBg: '0F172A', darkBg: '020617', coverAccent: '64748B',
      headerBand: '020617', headerText: 'F8FAFC', headerSub: '94A3B8',
      kpiGreen: '22C55E', kpiAmber: 'F59E0B', kpiRed: 'EF4444', kpiBlue: '38BDF8', kpiNavy: '94A3B8',
      kpiCardBg: '1E293B', kpiCardBorder: '334155',
      tableHeaderBg: '1E293B', tableHeaderText: 'F8FAFC', tableAltRow: '152033', tableBorder: '334155', tableBodyBg: '1E293B',
      chart: ['64748B', '38BDF8', '22C55E', 'F59E0B', 'A78BFA', 'F472B6', '94A3B8'],
      titleText: 'F8FAFC', bodyText: 'CBD5E1', subtitleText: '94A3B8', mutedText: '64748B',
      slideNumBg: '64748B', slideNumText: 'F8FAFC', bulletAccent: '94A3B8', bulletCardBg: '1E293B',
      footerText: '64748B', footerLine: '334155', processStep: '64748B', accentLine: '38BDF8',
    },
  },
};

const TEMPLATE_DEFAULT_PALETTE = {
  sharyx: 'violet',
  executive: 'navygold',
  aurora: 'sky',
  carbon: 'cyan',
};

const TEMPLATES = {
  sharyx: {
    id: 'sharyx',
    label: 'SharyX Brand',
    description: 'Purple brand system · modern SaaS · geometric sans',
    fonts: FONT_PACKS.sharyx,
    layout: LAYOUT_PACKS.sharyx,
    defaultPalette: 'violet',
  },
  executive: {
    id: 'executive',
    label: 'Executive Boardroom',
    description: 'Deep navy · restrained gold · formal Calibri · spacious',
    fonts: FONT_PACKS.executive,
    layout: LAYOUT_PACKS.executive,
    defaultPalette: 'navygold',
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora Light',
    description: 'White canvas · sky blue · Georgia titles · airy whitespace',
    fonts: FONT_PACKS.aurora,
    layout: LAYOUT_PACKS.aurora,
    defaultPalette: 'sky',
  },
  carbon: {
    id: 'carbon',
    label: 'Carbon Tech',
    description: 'Near-black · cyan neon · dense charts · high contrast data',
    fonts: FONT_PACKS.carbon,
    layout: LAYOUT_PACKS.carbon,
    defaultPalette: 'cyan',
  },
};

const THEMES = {};
for (const [tid, tmpl] of Object.entries(TEMPLATES)) {
  const defaultPal = COLOR_PALETTES[tmpl.defaultPalette];
  THEMES[tid] = {
    id: tid,
    label: tmpl.label,
    description: tmpl.description,
    fonts: tmpl.fonts,
    layout: tmpl.layout,
    isLight: !!defaultPal.isLight,
    colors: { ...defaultPal.colors },
    templateId: tid,
    paletteId: tmpl.defaultPalette,
  };
}

const GEOMETRY = {
  slide: { w: 13.33, h: 7.5 },
  margins: { left: 0.48, right: 0.48, top: 0.36, bottom: 0.42 },
  headerBand: { x: 0, y: 0, w: 13.33, h: 0.78 },
  content: { x: 0.48, y: 0.98, w: 12.37, h: 5.90 },
  slideNum: { x: 12.58, y: 7.12, w: 0.50, h: 0.24 },
  footer: { y: 7.08, h: 0.28 },
  kpiCard: { h: 1.55, gap: 0.12 },
  chart: {
    barGap: 36, barGrouping: 'clustered', showLegend: true, showValue: true,
    dataLabelPosition: 'outEnd',
  },
  table: {
    headerFontSize: 10.5, bodyFontSize: 10,
    rowHeight: 0.34, headerHeight: 0.38,
    autoPage: true, maxRowsPerSlide: 12,
  },
  fonts: {
    coverTitle: 34, sectionNum: 56, sectionTitle: 26,
    slideTitle: 18, slideSubtitle: 12,
    kpiValue: 26, kpiLabel: 11,
    bodyText: 13, bulletText: 12.5,
    tableHeader: 11, tableBody: 10.5,
    footer: 8, slideNum: 9, chartLabel: 9.5,
  },
};

function parseThemeId(themeId) {
  const raw = String(themeId || 'sharyx').trim().toLowerCase();
  const sepMatch = raw.match(/^([a-z]+)[:_\-]([a-z]+)$/);
  if (sepMatch) {
    const a = sepMatch[1];
    const b = sepMatch[2];
    if (TEMPLATES[a] && COLOR_PALETTES[b]) return { templateId: a, paletteId: b };
    if (TEMPLATES[b] && COLOR_PALETTES[a]) return { templateId: b, paletteId: a };
  }

  const templateAliases = {
    sharyx: 'sharyx', brand: 'sharyx', purple: 'sharyx', voice: 'sharyx', default: 'sharyx',
    executive: 'executive', navy: 'executive', gold: 'executive', boardroom: 'executive',
    research: 'executive', epi: 'executive', health: 'executive', corporate: 'executive',
    aurora: 'aurora', light: 'aurora', clean: 'aurora', clean_light: 'aurora',
    minimal: 'aurora', white: 'aurora', editorial: 'aurora',
    carbon: 'carbon', dark: 'carbon', neon: 'carbon', tech: 'carbon',
    modern_dark: 'carbon', vibrant_tech: 'carbon', pitch_deck: 'carbon',
  };
  if (templateAliases[raw] || TEMPLATES[raw]) {
    const tid = templateAliases[raw] || raw;
    return { templateId: tid, paletteId: TEMPLATE_DEFAULT_PALETTE[tid] || 'violet' };
  }

  const paletteAliases = {
    violet: 'violet', purple: 'violet', brand: 'violet',
    navygold: 'navygold', navy_gold: 'navygold', gold: 'navygold',
    sky: 'sky', skyblue: 'sky', blue: 'sky',
    cyan: 'cyan', neon: 'cyan',
    emerald: 'emerald', green: 'emerald',
    rose: 'rose', magenta: 'rose', pink: 'rose',
    amber: 'amber', orange: 'amber', warm: 'amber',
    teal: 'teal',
    indigo: 'indigo',
    slate: 'slate', neutral: 'slate', gray: 'slate', grey: 'slate',
  };
  if (paletteAliases[raw] || COLOR_PALETTES[raw]) {
    const pid = paletteAliases[raw] || raw;
    return { templateId: 'sharyx', paletteId: pid };
  }

  return { templateId: 'sharyx', paletteId: 'violet' };
}

function resolveTheme(themeId) {
  const { templateId, paletteId } = parseThemeId(themeId);
  const tmpl = TEMPLATES[templateId] || TEMPLATES.sharyx;
  const pal = COLOR_PALETTES[paletteId] || COLOR_PALETTES.violet;
  return {
    id: `${tmpl.id}:${pal.id}`,
    label: `${tmpl.label} · ${pal.label}`,
    description: `${tmpl.description} · ${pal.description}`,
    fonts: tmpl.fonts,
    layout: tmpl.layout,
    isLight: !!pal.isLight,
    colors: { ...pal.colors },
    templateId: tmpl.id,
    paletteId: pal.id,
  };
}

function getDesign(themeId) {
  const theme = resolveTheme(themeId);
  const layout = theme.layout || LAYOUT_PACKS.sharyx;
  return {
    ...GEOMETRY,
    themeId: theme.id,
    templateId: theme.templateId,
    paletteId: theme.paletteId,
    label: theme.label,
    description: theme.description || '',
    isLight: !!theme.isLight,
    layout: { ...layout },
    colors: { ...theme.colors },
    fonts: {
      ...GEOMETRY.fonts,
      ...(layout.fonts || {}),
      face: theme.fonts.face,
      heading: theme.fonts.heading,
      mono: theme.fonts.mono,
    },
    chart: {
      ...GEOMETRY.chart,
      barGap: layout.chartBarGap ?? GEOMETRY.chart.barGap,
      barGrouping: layout.chartGrouping || GEOMETRY.chart.barGrouping,
    },
  };
}

function listThemes() {
  return Object.values(TEMPLATES).map((t) => {
    const pal = COLOR_PALETTES[t.defaultPalette];
    return {
      id: t.id,
      label: t.label,
      description: t.description || '',
      isLight: !!(pal && pal.isLight),
      defaultPalette: t.defaultPalette,
    };
  });
}

function listTemplates() {
  return Object.values(TEMPLATES).map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description || '',
    defaultPalette: t.defaultPalette,
  }));
}

function listPalettes() {
  return Object.values(COLOR_PALETTES).map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description || '',
    isLight: !!p.isLight,
    swatches: p.swatches || [],
  }));
}

const DESIGN = getDesign('sharyx');

function applyTheme(themeId) {
  const next = getDesign(themeId || 'sharyx');
  DESIGN.themeId = next.themeId;
  DESIGN.templateId = next.templateId;
  DESIGN.paletteId = next.paletteId;
  DESIGN.label = next.label;
  DESIGN.description = next.description || '';
  DESIGN.isLight = next.isLight;
  DESIGN.layout = next.layout ? { ...next.layout } : DESIGN.layout;
  Object.assign(DESIGN.colors, next.colors);
  Object.assign(DESIGN.fonts, next.fonts);
  if (next.chart) Object.assign(DESIGN.chart, next.chart);
  return DESIGN;
}

function kpiColor(label = '', value = '', trend = null, design = DESIGN) {
  const lbl = String(label).toLowerCase();
  const C = design.colors;
  if (/risk|gap|pending|defect|failure|unknown|dropout|unimmun|deplet|penalty|paradox|anomaly/.test(lbl))
    return C.kpiRed;
  if (/completion|success|confirmed|done|immunis|surveyed|credit|inflow|retain|coverage|reach/.test(lbl) || trend === 'up')
    return C.kpiGreen;
  if (/expected|target|screened|highest|debit|outflow|velocity|average|radius/.test(lbl))
    return C.kpiAmber;
  return C.kpiBlue;
}

function chartColor(index, design = DESIGN) {
  return design.colors.chart[index % design.colors.chart.length];
}

function kpiCardLayout(count, design = DESIGN) {
  const totalW = design.content.w;
  const gap = design.kpiCard.gap;
  const n = Math.max(Math.min(count, 5), 1);
  const cardW = (totalW - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({
    x: design.content.x + i * (cardW + gap),
    y: design.content.y,
    w: cardW,
    h: design.kpiCard.h,
  }));
}

module.exports = {
  DESIGN,
  THEMES,
  TEMPLATES,
  COLOR_PALETTES,
  FONT_PACKS,
  LAYOUT_PACKS,
  GEOMETRY,
  TEMPLATE_DEFAULT_PALETTE,
  resolveTheme,
  parseThemeId,
  getDesign,
  applyTheme,
  kpiColor,
  chartColor,
  kpiCardLayout,
  listThemes,
  listTemplates,
  listPalettes,
};
