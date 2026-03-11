import { FORM_SECTIONS } from './formData.js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const HEADERS = {
  'apikey': SUPABASE_URL ? SUPABASE_KEY : '',
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const SECTION_COL = {
  'Refrigerators':    'refrigerators',
  'Washing Machines': 'washing_machines',
  'Dryers':           'dryers',
  'Washer & Dryer':   'washer_dryer',
  'Dishwashers':      'dishwashers',
  'Upright Freezers': 'upright_freezers',
};

function buildKeyMaps() {
  const existsMap    = {};
  const priceMap     = {};
  const availMap     = {};
  const keyToSection = {};

  FORM_SECTIONS.forEach(section => {
    const col = SECTION_COL[section.sub]
      || section.sub.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    section.products.forEach(product => {
      const cleanModel     = product.model.trim().replace(/\s+/g, ' ');
      const readableExists = `${product.brand} ${cleanModel}_exists`;
      existsMap[product.existsName]    = readableExists;
      keyToSection[product.existsName] = col;

      product.competitors.forEach(comp => {
        const cleanComp    = comp.model.trim().replace(/\s+/g, ' ');
        const readablePrice = `${comp.brand} ${cleanComp}_price`;
        priceMap[comp.priceName]       = readablePrice;
        keyToSection[comp.priceName]   = col;
        if (comp.availName) {
          availMap[comp.availName]     = `${comp.brand} ${cleanComp}_avail`;
          keyToSection[comp.availName] = col;
        }
      });
    });
  });

  return { existsMap, priceMap, availMap, keyToSection };
}

const { existsMap, priceMap, availMap, keyToSection } = buildKeyMaps();

function splitBySection(formData) {
  const buckets = {};
  Object.values(SECTION_COL).forEach(col => { buckets[col] = {}; });

  Object.entries(formData).forEach(([key, value]) => {
    const col = keyToSection[key];
    if (!col) return;

    let rk = key;
    if (existsMap[key]) {
      rk = existsMap[key];
    } else if (priceMap[key]) {
      rk = priceMap[key];
      if (buckets[col][rk] !== undefined) {
        let i = 2;
        while (buckets[col][`${rk}_${i}`] !== undefined) i++;
        rk = `${rk}_${i}`;
      }
    } else if (availMap[key]) {
      rk = availMap[key];
    }

    buckets[col][rk] = value;
  });

  Object.keys(buckets).forEach(col => {
    if (Object.keys(buckets[col]).length === 0) buckets[col] = null;
  });

  return buckets;
}

export function flattenRecord(r) {
  const legacyFd = r.form_data || {};
  const legacyTranslated = {};
  Object.entries(legacyFd).forEach(([key, value]) => {
    if (existsMap[key]) {
      legacyTranslated[existsMap[key]] = value;
    } else if (priceMap[key]) {
      const rk = priceMap[key];
      if (legacyTranslated[rk] !== undefined) {
        let i = 2;
        while (legacyTranslated[`${rk}_${i}`] !== undefined) i++;
        legacyTranslated[`${rk}_${i}`] = value;
      } else {
        legacyTranslated[rk] = value;
      }
    }
  });

  const sectionData = {};
  Object.values(SECTION_COL).forEach(col => {
    const bucket = r[col];
    if (bucket && typeof bucket === 'object') {
      Object.assign(sectionData, bucket);
    }
  });

  return {
    ...legacyTranslated,
    ...sectionData,
    rep_name:       r.rep_name       || legacyFd.rep_name       || '',
    month:          r.month          || legacyFd.month           || '',
    shop_name:      r.shop_name      || legacyFd.shop_name       || '',
    area:           r.area           || legacyFd.area            || '',
    display:        r.display        || legacyFd.display         || '',
    recommendation: r.recommendation || legacyFd.recommendation  || '',
    notes:          r.notes          || legacyFd.notes           || '',
    created_at:     r.created_at     || '',
  };
}

export async function fetchReports() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/market_reports?select=*&order=created_at.desc&limit=2000`,
    { headers: HEADERS }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitReport(record) {
  const { form_data, ...topLevel } = record;

  const payload = {
    ...topLevel,
    form_data,
    ...splitBySection(form_data || {}),
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/market_reports`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}