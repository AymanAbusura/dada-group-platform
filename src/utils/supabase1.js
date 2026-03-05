export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

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

export function flattenRecord(r) {
  const fd = r.form_data || {};
  return {
    ...fd,
    rep_name:   r.rep_name   || fd.rep_name   || '',
    month:      r.month      || fd.month      || '',
    shop_name:  r.shop_name  || fd.shop_name  || '',
    area:       r.area       || fd.area       || '',
    created_at: r.created_at || '',
  };
}