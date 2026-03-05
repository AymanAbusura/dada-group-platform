import { FORM_SECTIONS } from './formData.js';

export const SUPABASE_URL = 'https://nyyiqguedbvwiskrysba.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eWlxZ3VlZGJ2d2lza3J5c2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTM1NzAsImV4cCI6MjA4ODE4OTU3MH0.PlnZINW8M90eY0_BV8QxMspGb8yC2tAOw-oeVTSQqMU';

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