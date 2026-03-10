import { FORM_SECTIONS } from './formData.js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const HEADERS = {
  'apikey': SUPABASE_URL ? SUPABASE_KEY : '',
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

function buildKeyMaps() {
  const existsMap = {}; 
  const priceMap  = {};
  const availMap  = {};

  FORM_SECTIONS.forEach(section => {
    section.products.forEach(product => {
      const cleanModel = product.model.trim().replace(/\s+/g, ' ');
      const readableExists = `${product.brand} ${cleanModel}_exists`;
      existsMap[product.existsName] = readableExists;

      product.competitors.forEach((comp, ci) => {
        const cleanCompModel = comp.model.trim().replace(/\s+/g, ' ');
        const readablePrice = `${comp.brand} ${cleanCompModel}_price`;
        priceMap[comp.priceName] = readablePrice;
        if (comp.availName) availMap[comp.availName] = `${comp.brand} ${cleanCompModel}_avail`;
      });
    });
  });

  return { existsMap, priceMap, availMap };
}

const { existsMap, priceMap, availMap } = buildKeyMaps();

export function flattenRecord(r) {
  const fd = r.form_data || {};
  const translated = {};

  Object.entries(fd).forEach(([key, value]) => {
    if (existsMap[key]) {
      translated[existsMap[key]] = value;
    } else if (priceMap[key]) {
      const readableKey = priceMap[key];
      if (translated[readableKey] !== undefined) {
        let i = 2;
        while (translated[`${readableKey}${i}`] !== undefined) i++;
        translated[`${readableKey}${i}`] = value;
      } else {
        translated[readableKey] = value;
      }
    } else if (availMap[key]) {
    } else {
      translated[key] = value;
    }
  });

  return {
    ...translated,
    rep_name:   r.rep_name   || fd.rep_name   || '',
    month:      r.month      || fd.month      || '',
    shop_name:  r.shop_name  || fd.shop_name  || '',
    area:       r.area       || fd.area       || '',
    created_at: r.created_at || '',
  };
}

// ── API calls ────────────────────────────────────────────────────────────────
export async function fetchReports() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/market_reports?select=*&order=created_at.desc&limit=2000`,
    { headers: HEADERS }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitReport(record) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/market_reports`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(await res.text());
}