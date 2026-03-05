import { FORM_SECTIONS } from './formData.js';

export const SUPABASE_URL = 'https://nyyiqguedbvwiskrysba.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eWlxZ3VlZGJ2d2lza3J5c2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MTM1NzAsImV4cCI6MjA4ODE4OTU3MH0.PlnZINW8M90eY0_BV8QxMspGb8yC2tAOw-oeVTSQqMU';

const HEADERS = {
  'apikey': SUPABASE_URL ? SUPABASE_KEY : '',
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ── Build lookup maps from FORM_SECTIONS ────────────────────────────────────
// existsName (e.g. "cat0_0_exists") → readable key (e.g. "beko RDNG491M20SXB_exists")
// priceName  (e.g. "cat0_0_c0")     → readable key (e.g. "Samsung RT38CG6000S9JO_price")

function buildKeyMaps() {
  const existsMap = {};  // cat0_0_exists  → "beko RDNG491M20SXB_exists"
  const priceMap  = {};  // cat0_0_c0      → "Samsung RT38CG6000S9JO_price"
  const availMap  = {};  // cat0_0_c0_avail → (ignored — not needed by dashboard)

  FORM_SECTIONS.forEach(section => {
    section.products.forEach(product => {
      // Clean model name: collapse spaces, remove special chars except spaces
      const cleanModel = product.model.trim().replace(/\s+/g, ' ');
      const readableExists = `${product.brand} ${cleanModel}_exists`;
      existsMap[product.existsName] = readableExists;

      product.competitors.forEach((comp, ci) => {
        const cleanCompModel = comp.model.trim().replace(/\s+/g, ' ');
        // Use brand + model as the label, deduplicated with a counter if same brand+model appears
        const readablePrice = `${comp.brand} ${cleanCompModel}_price`;
        priceMap[comp.priceName] = readablePrice;
        if (comp.availName) availMap[comp.availName] = `${comp.brand} ${cleanCompModel}_avail`;
      });
    });
  });

  return { existsMap, priceMap, availMap };
}

const { existsMap, priceMap, availMap } = buildKeyMaps();

// ── Translate form_data keys from short IDs to readable names ───────────────
export function flattenRecord(r) {
  const fd = r.form_data || {};
  const translated = {};

  Object.entries(fd).forEach(([key, value]) => {
    if (existsMap[key]) {
      // e.g. cat0_0_exists → "beko RDNG491M20SXB_exists"
      translated[existsMap[key]] = value;
    } else if (priceMap[key]) {
      // e.g. cat0_0_c0 → "Samsung RT38CG6000S9JO_price"
      // Multiple products may share the same competitor model — aggregate by appending price
      const readableKey = priceMap[key];
      // If key already exists (same competitor appears in multiple products),
      // store separately so we don't lose data
      if (translated[readableKey] !== undefined) {
        // Find next available slot
        let i = 2;
        while (translated[`${readableKey}${i}`] !== undefined) i++;
        translated[`${readableKey}${i}`] = value;
      } else {
        translated[readableKey] = value;
      }
    } else if (availMap[key]) {
      // skip avail toggles from dashboard (not needed for analytics)
    } else {
      // pass through meta fields: rep_name, month, shop_name, area, display, recommendation, notes
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
