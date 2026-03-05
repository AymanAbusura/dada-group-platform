export function isYes(v) {
  if (!v) return false;
  const s = String(v).toLowerCase().trim();
  return s === 'yes' || s === 'نعم';
}

export function getField(row, ...keys) {
  for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k];
  return '';
}

export function getModelCols(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter(c => c.endsWith('_exists'));
}

export function getPriceCols(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter(c => c.includes('_price'));
}

export function getUnique(data, ...keys) {
  const s = new Set();
  data.forEach(r => { const v = getField(r, ...keys); if (v) s.add(v); });
  return [...s].sort();
}

export function computeKPIs(data) {
  if (!data.length) return { total: 0, shops: 0, reps: 0, models: 0, availPct: 0, topComp: '—' };
  const shops     = new Set(data.map(r => getField(r, 'shop_name', 'اسم المحل')));
  const reps      = new Set(data.map(r => getField(r, 'rep_name',  'اسم المندوب')));
  const modelCols = getModelCols(data);

  let yes = 0, total = 0;
  modelCols.forEach(col => {
    data.forEach(r => {
      const v = r[col] || '';
      if (v) { total++; if (isYes(v)) yes++; }
    });
  });

  const compFreq  = buildCompFreq(data);
  const topEntry  = Object.entries(compFreq).sort((a, b) => b[1] - a[1])[0];

  return {
    total:    data.length,
    shops:    shops.size,
    reps:     reps.size,
    models:   modelCols.length,
    availPct: total > 0 ? Math.round((yes / total) * 100) : 0,
    topComp:  topEntry ? topEntry[0].split(' ')[0] : '—',
  };
}

export function buildCompFreq(data) {
  const freq = {};
  getPriceCols(data).forEach(col => {
    const label = col.replace(/_price\d*$/, '').replace(/_/g, ' ');
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
    const label = col.replace(/_price\d*$/, '').replace(/_/g, ' ');
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

export function buildAvailList(data) {
  return getModelCols(data).map(col => {
    const model = col.replace('_exists', '');
    let yes = 0, total = 0;
    data.forEach(r => { const v = r[col] || ''; if (v) { total++; if (isYes(v)) yes++; } });
    const pct    = total > 0 ? Math.round((yes / total) * 100) : 0;
    const parts  = model.split(' ');
    return { col, model, brand: parts[0], label: parts.slice(1).join(' ') || model, pct, yes, total };
  }).sort((a, b) => b.pct - a.pct);
}

export function buildAreaCounts(data) {
  const c = {};
  data.forEach(r => { const a = getField(r, 'area', 'المنطقة') || 'غير محدد'; c[a] = (c[a] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

export function buildRepCounts(data) {
  const c = {};
  data.forEach(r => { const n = getField(r, 'rep_name', 'اسم المندوب') || 'غير محدد'; c[n] = (c[n] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

export function buildPriceTableEntries(data) {
  return Object.entries(buildCompPrices(data))
    .map(([label, arr]) => {
      const parts = label.split(' ');
      return {
        label, brand: parts[0], model: parts.slice(1).join(' '),
        avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        min: Math.min(...arr), max: Math.max(...arr), count: arr.length,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function getModelDetail(data, existsCol) {
  if (!existsCol || !data.length) return null;
  const cols    = Object.keys(data[0]);
  const colIdx  = cols.indexOf(existsCol);
  const pcols   = [];
  for (let i = colIdx + 1; i < cols.length; i++) {
    if (cols[i].endsWith('_exists')) break;
    if (cols[i].includes('_price')) pcols.push(cols[i]);
  }
  let yes = 0, total = 0;
  data.forEach(r => { const v = r[existsCol] || ''; if (v) { total++; if (isYes(v)) yes++; } });

  const competitors = pcols.map(col => {
    const name   = col.replace(/_price\d*$/, '').replace(/_/g, ' ');
    const arr    = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v) && v > 0);
    if (!arr.length) return null;
    return { name, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), min: Math.min(...arr), max: Math.max(...arr), count: arr.length };
  }).filter(Boolean);

  return { avPct: total > 0 ? Math.round((yes / total) * 100) : 0, yes, total, competitors };
}