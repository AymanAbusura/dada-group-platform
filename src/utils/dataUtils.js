import { FORM_SECTIONS } from './formData.js';

// ── Build a lookup: readable existsKey → list of readable priceKeys ─────────
// e.g. "beko RDNG491M20SXB_exists" → ["Samsung RT38CG6000S9JO_price", ...]
function buildModelCompMap() {
  const map = {}; // existsKey → [{ compLabel, priceKey }]
  FORM_SECTIONS.forEach(section => {
    section.products.forEach(product => {
      const cleanModel  = product.model.trim().replace(/\s+/g, ' ');
      const existsKey   = `${product.brand} ${cleanModel}_exists`;
      map[existsKey] = product.competitors.map(comp => {
        const cleanComp = comp.model.trim().replace(/\s+/g, ' ');
        return {
          compLabel: `${comp.brand} ${cleanComp}`,
          priceKey:  `${comp.brand} ${cleanComp}_price`,
        };
      });
    });
  });
  return map;
}

export const MODEL_COMP_MAP = buildModelCompMap();

// ── Basic helpers ────────────────────────────────────────────────────────────

export function isYes(v) {
  if (!v) return false;
  const s = String(v).toLowerCase().trim();
  return s === 'yes' || s === 'نعم';
}

export function getField(row, ...keys) {
  for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k];
  return '';
}

// All keys ending with _exists
export function getModelCols(rows) {
  if (!rows.length) return [];
  // Collect all unique _exists keys across all rows (some may only appear in some rows)
  const keys = new Set();
  rows.forEach(r => Object.keys(r).forEach(k => { if (k.endsWith('_exists')) keys.add(k); }));
  return [...keys];
}

// All keys ending with _price or _price2, _price3, etc.
export function getPriceCols(rows) {
  if (!rows.length) return [];
  const keys = new Set();
  rows.forEach(r => Object.keys(r).forEach(k => { if (/_price\d*$/.test(k)) keys.add(k); }));
  return [...keys];
}

export function getUnique(data, ...keys) {
  const s = new Set();
  data.forEach(r => { const v = getField(r, ...keys); if (v) s.add(v); });
  return [...s].sort();
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

export function computeKPIs(data) {
  if (!data.length) return { total: 0, shops: 0, reps: 0, models: 0, availPct: 0, topComp: '—' };

  const shops     = new Set(data.map(r => getField(r, 'shop_name')));
  const reps      = new Set(data.map(r => getField(r, 'rep_name')));
  const modelCols = getModelCols(data);

  let yes = 0, total = 0;
  modelCols.forEach(col => {
    data.forEach(r => {
      const v = r[col] || '';
      if (v) { total++; if (isYes(v)) yes++; }
    });
  });

  const compFreq = buildCompFreq(data);
  const topEntry = Object.entries(compFreq).sort((a, b) => b[1] - a[1])[0];

  return {
    total:    data.length,
    shops:    shops.size,
    reps:     reps.size,
    models:   modelCols.length,
    availPct: total > 0 ? Math.round((yes / total) * 100) : 0,
    topComp:  topEntry ? topEntry[0].split(' ')[0] : '—',
  };
}

// ── Competitor frequency & prices ────────────────────────────────────────────

export function buildCompFreq(data) {
  const freq = {};
  getPriceCols(data).forEach(col => {
    // Strip trailing _price, _price2, _price3 etc → competitor label
    const label = col.replace(/_price\d*$/, '');
    data.forEach(r => {
      const v = parseFloat(r[col]);
      if (!isNaN(v) && v > 0) freq[label] = (freq[label] || 0) + 1;
    });
  });
  return freq;
}

export function buildCompPrices(data) {
  const prices = {};
  getPriceCols(data).forEach(col => {
    const label = col.replace(/_price\d*$/, '');
    data.forEach(r => {
      const v = parseFloat(r[col]);
      if (!isNaN(v) && v > 0) {
        if (!prices[label]) prices[label] = [];
        prices[label].push(v);
      }
    });
  });
  return prices;
}

// ── Availability list ────────────────────────────────────────────────────────

export function buildAvailList(data) {
  return getModelCols(data).map(col => {
    // col is like "beko RDNG491M20SXB_exists"
    const full  = col.replace('_exists', ''); // "beko RDNG491M20SXB"
    const parts = full.split(' ');
    const brand = parts[0];
    const label = parts.slice(1).join(' ') || full;

    let yes = 0, total = 0;
    data.forEach(r => {
      const v = r[col] || '';
      if (v) { total++; if (isYes(v)) yes++; }
    });
    const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
    return { col, model: full, brand, label, pct, yes, total };
  }).sort((a, b) => b.pct - a.pct);
}

// ── Area / Rep counts ────────────────────────────────────────────────────────

export function buildAreaCounts(data) {
  const c = {};
  data.forEach(r => { const a = getField(r, 'area') || 'غير محدد'; c[a] = (c[a] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

export function buildRepCounts(data) {
  const c = {};
  data.forEach(r => { const n = getField(r, 'rep_name') || 'غير محدد'; c[n] = (c[n] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

// ── Price table entries ──────────────────────────────────────────────────────

export function buildPriceTableEntries(data) {
  return Object.entries(buildCompPrices(data))
    .map(([label, arr]) => {
      const parts = label.split(' ');
      return {
        label,
        brand: parts[0],
        model: parts.slice(1).join(' '),
        avg:   Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        min:   Math.min(...arr),
        max:   Math.max(...arr),
        count: arr.length,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ── Model detail (uses FORM_SECTIONS map) ────────────────────────────────────

export function getModelDetail(data, existsCol) {
  if (!existsCol || !data.length) return null;

  // existsCol is like "beko RDNG491M20SXB_exists"
  let yes = 0, total = 0;
  data.forEach(r => {
    const v = r[existsCol] || '';
    if (v) { total++; if (isYes(v)) yes++; }
  });

  // Get the expected competitor price keys for this model from the map
  const compDefs = MODEL_COMP_MAP[existsCol] || [];

  const competitors = compDefs.map(({ compLabel, priceKey }) => {
    // Collect all price variants: Samsung X_price, Samsung X_price2, Samsung X_price3 ...
    const allPriceCols = Object.keys(data[0] || {}).filter(k =>
      k === priceKey || k.startsWith(priceKey.replace(/_price$/, '_price'))
    );

    const arr = [];
    allPriceCols.forEach(col => {
      data.forEach(r => {
        const v = parseFloat(r[col]);
        if (!isNaN(v) && v > 0) arr.push(v);
      });
    });

    if (!arr.length) return null;
    return {
      name:  compLabel,
      avg:   Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
      min:   Math.min(...arr),
      max:   Math.max(...arr),
      count: arr.length,
    };
  }).filter(Boolean);

  return {
    avPct: total > 0 ? Math.round((yes / total) * 100) : 0,
    yes,
    total,
    competitors,
  };
}
