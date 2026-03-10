import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchReports, flattenRecord } from '../utils/supabase.js';
import { FORM_SECTIONS } from '../utils/formData.js';

const CATEGORY_MAP = FORM_SECTIONS.map((sec, i) => ({ id: `cat${i}`, label: sec.icon + ' ' + sec.title }));
import {
  computeKPIs, buildCompFreq, buildAvailList,
  buildAreaCounts, buildRepCounts, buildPriceTableEntries,
  getModelDetail, getModelCols, getUnique,
  getField, isYes, buildCompPrices
} from '../utils/dataUtils.js';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import logoLight from "../assets/logo-light.svg";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
  ArcElement, PointElement, LineElement, Filler
);

const C = {
  navy:   '#0d1b2e',
  navyL:  '#142338',
  navyLL: '#1a2d46',
  gold:   '#c9a84c',
  goldL:  '#e0be6e',
  red:    '#c0291c',
  green:  '#1db37c',
  blue:   '#2e7cf6',
  purple: '#7c52e8',
  orange: '#e8812e',
  teal:   '#1ab8be',
  muted:  '#8ea4c0',
  border: 'rgba(255,255,255,0.08)',
};

const COMP_COLORS = ['#2e7cf6','#e8812e','#1db37c','#7c52e8','#1ab8be','#c9a84c','#c0291c','#e84f8c','#4fc0e8','#a0c44e'];

function pctColor(p) {
  if (p >= 70) return C.green;
  if (p >= 40) return C.gold;
  return C.red;
}


function EmptyState({ text }) {
  return (
    <div style={{ padding: '36px 16px', textAlign: 'center', color: C.muted }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
      <div style={{ fontSize: 12 }}>{text}</div>
    </div>
  );
}

function BrandPill({ brand }) {
  const b = (brand || '').toLowerCase();
  return <span className={`brand-pill${b === 'ariston' ? ' ar' : ''}`}>{brand}</span>;
}

function buildMarketShareData(data) {
  const brandCount = {};
  data.forEach(r => {
    Object.keys(r).forEach(k => {
      if (k.endsWith('_price') || /_price\d+$/.test(k)) {
        const val = parseFloat(r[k]);
        if (!isNaN(val) && val > 0) {
          const brand = k.replace(/_price\d*$/, '').split(' ')[0];
          brandCount[brand] = (brandCount[brand] || 0) + 1;
        }
      }
    });
    Object.keys(r).forEach(k => {
      if (k.endsWith('_exists')) {
        const brand = k.replace(/_exists$/, '').split(' ')[0];
        if ((brand === 'beko' || brand === 'Ariston') && isYes(r[k])) {
          brandCount[brand] = (brandCount[brand] || 0) + 1;
        }
      }
    });
  });
  const total = Object.values(brandCount).reduce((a, b) => a + b, 0);
  return Object.entries(brandCount)
    .map(([brand, count]) => ({ brand, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count).slice(0, 12);
}

function buildMissingShops(data, existsCol) {
  if (!existsCol) return [];
  return data.filter(r => {
    const v = r[existsCol] || '';
    return v && !isYes(v);
  }).map(r => ({
    shop: getField(r, 'shop_name') || '—',
    area: getField(r, 'area') || '—',
    rep: getField(r, 'rep_name') || '—',
  }));
}

function buildNotesList(data) {
  return data.filter(r => getField(r, 'notes') || getField(r, 'ملاحظات')).map(r => ({
    shop: getField(r, 'shop_name') || '—',
    area: getField(r, 'area') || '—',
    rep: getField(r, 'rep_name') || '—',
    notes: getField(r, 'notes') || getField(r, 'ملاحظات') || '',
    display: getField(r, 'display') || getField(r, 'العرض') || '',
    date: r.created_at,
  }));
}

function buildCatCompLabels() {
  const map = {};
  FORM_SECTIONS.forEach((section, i) => {
    const catId = `cat${i}`;
    const labels = new Set();
    section.products.forEach(product => {
      product.competitors.forEach(comp => {
        const cleanModel = comp.model.trim().replace(/\s+/g, ' ');
        labels.add(`${comp.brand} ${cleanModel}_price`);
      });
    });
    map[catId] = labels;
  });
  return map;
}

const CAT_COMP_LABELS = buildCatCompLabels();

function buildCompFreqByCat(data, catId) {
  const freq = {};
  const allowedLabels = catId ? CAT_COMP_LABELS[catId] : null;

  data.forEach(r => {
    Object.keys(r).forEach(k => {
      if (!/_price\d*$/.test(k)) return;
      const baseKey = k.replace(/_price\d+$/, '_price');
      if (allowedLabels && !allowedLabels.has(baseKey)) return;
      const v = parseFloat(r[k]);
      if (!isNaN(v) && v > 0) {
        const label = k.replace(/_price\d*$/, '');
        freq[label] = (freq[label] || 0) + 1;
      }
    });
  });
  return freq;
}

function OverviewSection({ data, kpis }) {
  const [selCat, setSelCat] = useState('');
  const compFreq = useMemo(() => buildCompFreqByCat(data, selCat), [data, selCat]);
  const availList = useMemo(() => buildAvailList(data), [data]);
  const topComps = Object.entries(compFreq).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxComp = topComps[0]?.[1] || 1;

  const lineData = useMemo(() => {
    const items = availList.slice(0, 8);
    return {
      labels: items.map(i => (i.label || '').substring(0, 14) + ((i.label || '').length > 14 ? '…' : '')),
      datasets: [{
        label: 'توافر %',
        data: items.map(i => i.pct),
        borderColor: C.gold,
        backgroundColor: 'rgba(201,168,76,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: C.gold,
        pointRadius: 4,
      }]
    };
  }, [availList]);

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: C.muted, font: { family: 'Cairo', size: 10 } } },
      y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: C.muted, font: { family: 'Cairo', size: 10 }, callback: v => `${v}%` } },
    },
  };

  return (
    <>
      <div className="kpi-grid">
        {[
          { icon: '🏪', val: kpis.shops, lbl: 'محل تمت زيارته', accent: C.blue },
          { icon: '📋', val: kpis.total, lbl: 'تقرير مُرسل', accent: C.gold },
          { icon: '📦', val: kpis.models, lbl: 'موديل مرصود', accent: C.purple },
          { icon: '✅', val: `${kpis.availPct}%`, lbl: 'متوسط التوافر', accent: pctColor(kpis.availPct) },
          { icon: '👥', val: kpis.reps, lbl: 'مندوب نشط', accent: C.teal },
          { icon: '🏆', val: kpis.topComp, lbl: 'أقوى منافس', accent: C.orange },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ '--accent': k.accent, animationDelay: `${i * 50}ms` }}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-lbl">{k.lbl}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon">📈</div>
            <div>
              <div className="db-card-title">منحنى توافر المنتجات</div>
              <div className="db-card-sub">نسبة حضور أبرز الموديلات في السوق</div>
            </div>
          </div>
          <div className="db-card-body">
            <div className="chart-wrap"><Line data={lineData} options={lineOpts} /></div>
          </div>
        </div>
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon">🏆</div>
            <div>
              <div className="db-card-title">أبرز المنافسين في السوق</div>
              <div className="db-card-sub">{selCat ? `نسبة الحضور في فئة: ${CATEGORY_MAP.find(c => c.id === selCat)?.label}` : 'الأكثر حضوراً في المحلات المزارة'}</div>
            </div>
          </div>
          <div className="db-card-body">
            <select
              className="model-sel"
              value={selCat}
              onChange={e => setSelCat(e.target.value)}
              style={{ marginBottom: 12 }}
            >
              <option value="">🗂️ جميع الفئات</option>
              {CATEGORY_MAP.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            {topComps.length === 0
              ? <EmptyState text="لا توجد بيانات منافسين لهذه الفئة" />
              : topComps.map(([comp, count], i) => (
              <div key={comp} className="comp-row">
                <div className="comp-rank">{i + 1}</div>
                <div className="comp-name">{comp.split(' ').slice(0, 2).join(' ')}</div>
                <div className="comp-bar-wrap">
                  <div className="comp-bar-track">
                    <div className="comp-bar-fill" style={{ width: `${Math.round((count / maxComp) * 100)}%`, background: COMP_COLORS[i] }} />
                  </div>
                  <div className="comp-count">{count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AvailSection({ data }) {
  const [selModel, setSelModel] = useState('');
  const availList = useMemo(() => buildAvailList(data), [data]);
  const modelCols = useMemo(() => getModelCols(data), [data]);
//   const missingShops = useMemo(() => buildMissingShops(data, selModel), [data, selModel]);

    const shopList = useMemo(() => {
        const shops = [...new Set(data.map(r => getField(r, 'shop_name')).filter(Boolean))].sort();
        return shops;
    }, [data]);
    const missingModels = useMemo(() => {
    if (!selShop) return [];
    const shopRecords = data.filter(r => getField(r, 'shop_name') === selShop);
    if (!shopRecords.length) return [];

    const missing = [];
    modelCols.forEach(col => {
      shopRecords.forEach(r => {
        if (r[col] !== undefined && r[col] !== null && r[col] !== '') {
          if (!isYes(r[col])) {
            const shopArea = getField(r, 'area') || '—';
            const shopRep  = getField(r, 'rep_name') || '—';
            // avoid duplicates
            if (!missing.find(m => m.col === col)) {
              missing.push({
                col,
                model: col.replace('_exists', ''),
                area: shopArea,
                rep: shopRep,
              });
            }
          }
        }
      });
    });
    return missing;
  }, [data, selShop, modelCols]);
    

  const bekoItems = availList.filter(i => (i.brand || '').toLowerCase() === 'beko');
  const aristonItems = availList.filter(i => (i.brand || '').toLowerCase() === 'ariston');

  const renderGroup = (items, color) => (
    <div>
      {items.map(r => (
        <div key={r.col} className="avail-item">
          <div className="avail-dot" style={{ background: color }} />
          <div className="avail-info">
            <div className="avail-model" title={r.label}>{r.label}</div>
            <div className="avail-brand">{r.brand}</div>
          </div>
          <div className="avail-meter">
            <div className="avail-track">
              <div className="avail-fill" style={{ width: `${r.pct}%`, background: pctColor(r.pct) }} />
            </div>
            <div className="avail-pct" style={{ color: pctColor(r.pct) }}>{r.pct}%</div>
          </div>
          <div className="avail-counts">{r.yes}/{r.total}</div>
        </div>
      ))}
    </div>
  );

  return (
    <>
    <div className="kpi-grid" style={{ marginBottom: 14 }}>
        {availList.slice(0, 5).map((item, i) => (
          <div key={item.col} className="kpi-card" style={{ '--accent': pctColor(item.pct), animationDelay: `${i * 60}ms` }}>
            <div className="kpi-icon">{(item.brand || '').toLowerCase() === 'ariston' ? '🔵' : '🟡'}</div>
            <div className="kpi-val" style={{ color: pctColor(item.pct) }}>{item.pct}%</div>
            <div className="kpi-lbl" title={item.label}>{(item.label || '').substring(0, 20)}{(item.label || '').length > 20 ? '…' : ''}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon">🟡</div>
            <div>
              <div className="db-card-title">توافر منتجات beko</div>
              <div className="db-card-sub">المعادلة: محلات تحتوي المنتج ÷ إجمالي المحلات × 100</div>
            </div>
          </div>
          <div className="db-card-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {bekoItems.length ? renderGroup(bekoItems, C.gold) : <EmptyState text="لا توجد بيانات" />}
          </div>
        </div>
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon">🔵</div>
            <div>
              <div className="db-card-title">توافر منتجات Ariston</div>
              <div className="db-card-sub">نسبة الحضور في المحلات المزارة</div>
            </div>
          </div>
          <div className="db-card-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {aristonItems.length ? renderGroup(aristonItems, C.blue) : <EmptyState text="لا توجد بيانات" />}
          </div>
        </div>
      </div>

      {/* <div className="db-card grid-1">
        <div className="db-card-header">
          <div className="db-card-icon">🎯</div>
          <div>
            <div className="db-card-title">نقاط البيع الفائتة — فرص إعادة البيع</div>
            <div className="db-card-sub">المحلات التي لا يتوفر فيها المنتج = فرصة بيع محتملة</div>
          </div>
        </div>
        <div className="db-card-body">
          <select className="model-sel" value={selModel} onChange={e => setSelModel(e.target.value)}>
            <option value="">-- اختر موديل لعرض المحلات الفائتة --</option>
            {modelCols.map(col => <option key={col} value={col}>{col.replace('_exists', '')}</option>)}
          </select>
          {selModel && (
            <div className="table-scroll">
              {missingShops.length === 0
                ? <div style={{ padding: 20, textAlign: 'center', color: C.green }}>✅ المنتج متوفر في جميع المحلات المزارة</div>
                : (
                  <table className="miss-table">
                    <thead><tr><th>#</th><th>اسم المعرض</th><th>المنطقة</th><th>المندوب</th><th>الفرصة</th></tr></thead>
                    <tbody>
                      {missingShops.map((s, i) => (
                        <tr key={i}>
                          <td style={{ color: C.muted }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{s.shop}</td>
                          <td style={{ color: C.muted }}>{s.area}</td>
                          <td>{s.rep}</td>
                          <td><span className="opp-badge">🎯 فرصة بيع</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          )}
        </div>
      </div> */}
      <div className="db-card grid-1">
  <div className="db-card-header">
    <div className="db-card-icon">🎯</div>
    <div>
      <div className="db-card-title">نقاط البيع الفائتة — فرص إعادة البيع</div>
      <div className="db-card-sub">اختر معرض لعرض الموديلات الغائبة = فرص بيع محتملة</div>
    </div>
  </div>
  <div className="db-card-body">
    <select className="model-sel" value={selShop} onChange={e => setSelShop(e.target.value)}>
      <option value="">-- اختر معرض --</option>
      {shopList.map(shop => (
        <option key={shop} value={shop}>{shop}</option>
      ))}
    </select>

    {selShop && (
      <div className="table-scroll">
        {missingModels.length === 0
          ? (
            <div style={{ padding: 20, textAlign: 'center', color: C.green }}>
              ✅ جميع الموديلات متوفرة في هذا المعرض
            </div>
          )
          : (
            <>
              <div style={{ padding: '8px 4px 12px', color: C.gold, fontSize: 13 }}>
                🎯 {missingModels.length} موديل غير متوفر في <strong>{selShop}</strong>
              </div>
              <table className="miss-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الموديل المفقود</th>
                    <th>المنطقة</th>
                    <th>المندوب</th>
                    <th>الفرصة</th>
                  </tr>
                </thead>
                <tbody>
                  {missingModels.map((m, i) => (
                    <tr key={m.col}>
                      <td style={{ color: C.muted }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{m.model}</td>
                      <td style={{ color: C.muted }}>{m.area}</td>
                      <td>{m.rep}</td>
                      <td><span className="opp-badge">🎯 فرصة بيع</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        }
      </div>
    )}
  </div>
</div>
    </>
  );
}

function PricesSection({ data }) {
  const [selModel, setSelModel] = useState('');
  const priceEntries = useMemo(() => buildPriceTableEntries(data), [data]);
  const modelCols = useMemo(() => getModelCols(data), [data]);
  const modelDetail = useMemo(() => selModel ? getModelDetail(data, selModel) : null, [data, selModel]);

  const chartData = useMemo(() => {
    if (!modelDetail?.competitors?.length) return null;
    return {
      labels: modelDetail.competitors.map(c => c.name.split(' ').slice(0, 2).join(' ')),
      datasets: [{
        label: 'متوسط السعر JD',
        data: modelDetail.competitors.map(c => c.avg),
        backgroundColor: COMP_COLORS,
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
  }, [modelDetail]);

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} JD` } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: C.muted, font: { family: 'Cairo', size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: C.muted, font: { family: 'Cairo', size: 10 }, callback: v => `${v} JD` } },
    },
  };

  const getRec = () => {
    if (!modelDetail?.competitors?.length) return null;
    const c = modelDetail.competitors;
    const avg = Math.round(c.reduce((a, x) => a + x.avg, 0) / c.length);
    const mn = Math.min(...c.map(x => x.min));
    const mx = Math.max(...c.map(x => x.max));
    return { avg, mn, mx };
  };
  const rec = getRec();

  return (
    <>
      <div className="db-card" style={{ marginBottom: 14 }}>
        <div className="db-card-header">
          <div className="db-card-icon">💰</div>
          <div>
            <div className="db-card-title">أسعار المنافسين الفعلية في المحلات</div>
            <div className="db-card-sub">مجمّع من جميع زيارات المندوبين — مرتب حسب عدد الرصدات</div>
          </div>
        </div>
        <div className="table-scroll">
          <table className="price-table">
            <thead>
              <tr><th>#</th><th>الماركة</th><th>الموديل</th><th>متوسط</th><th>أدنى</th><th>أعلى</th><th>رصدات</th></tr>
            </thead>
            <tbody>
              {priceEntries.length ? priceEntries.map((e, i) => (
                <tr key={e.label}>
                  <td><span className={`rank-n${i===0?' rank-1':i===1?' rank-2':i===2?' rank-3':''}`}>{i + 1}</span></td>
                  <td><BrandPill brand={e.brand} /></td>
                  <td style={{ fontSize: 11, maxWidth: 200, color: '#fff' }}>{e.model}</td>
                  <td className="p-avg">{e.avg} JD</td>
                  <td className="p-min">{e.min} JD</td>
                  <td className="p-max">{e.max} JD</td>
                  <td style={{ color: C.muted }}>{e.count}</td>
                </tr>
              )) : <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: C.muted }}>لا توجد بيانات أسعار</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="db-card grid-1">
        <div className="db-card-header">
          <div className="db-card-icon">🔍</div>
          <div>
            <div className="db-card-title">مقارنة المنافسين لكل موديل beko / Ariston</div>
            <div className="db-card-sub">اختر موديل لعرض رسم بياني للأسعار مع توصية تسعير</div>
          </div>
        </div>
        <div className="db-card-body">
          <select className="model-sel" value={selModel} onChange={e => setSelModel(e.target.value)}>
            <option value="">-- اختر موديل --</option>
            {modelCols.map(col => <option key={col} value={col}>{col.replace('_exists', '')}</option>)}
          </select>
          {selModel && modelDetail && (
            <>
              <div className="kpi-grid" style={{ marginBottom: 14 }}>
                {[
                  { icon: '📦', val: `${modelDetail.avPct}%`, lbl: 'توافر الموديل', accent: pctColor(modelDetail.avPct), color: pctColor(modelDetail.avPct) },
                  { icon: '🏪', val: `${modelDetail.yes}/${modelDetail.total}`, lbl: 'محل من إجمالي', accent: C.blue },
                  { icon: '🏆', val: modelDetail.competitors.length, lbl: 'منافس مرصود', accent: C.orange },
                ].map((k, i) => (
                  <div key={i} className="kpi-card" style={{ '--accent': k.accent, animationDelay: `${i * 60}ms` }}>
                    <div className="kpi-icon">{k.icon}</div>
                    <div className="kpi-val" style={{ color: k.color }}>{k.val}</div>
                    <div className="kpi-lbl">{k.lbl}</div>
                  </div>
                ))}
              </div>
              {chartData && <div className="chart-wrap-lg" style={{ marginBottom: 14 }}><Bar data={chartData} options={chartOpts} /></div>}
              {modelDetail.competitors.map((c, i) => (
                <div key={c.name} className="mc-card">
                  <div className="mc-info">
                    <div className="mc-brand">{c.name.split(' ')[0]}</div>
                    <div className="mc-model">{c.name.split(' ').slice(1).join(' ')}</div>
                  </div>
                  <div className="mc-prices">
                    <div className="mc-price"><div className="mc-price-val p-avg">{c.avg}</div><div className="mc-price-lbl">متوسط JD</div></div>
                    <div className="mc-price"><div className="mc-price-val p-min">{c.min}</div><div className="mc-price-lbl">أدنى JD</div></div>
                    <div className="mc-price"><div className="mc-price-val p-max">{c.max}</div><div className="mc-price-lbl">أعلى JD</div></div>
                    <div className="mc-price"><div className="mc-price-val" style={{ color: C.muted }}>{c.count}</div><div className="mc-price-lbl">رصدات</div></div>
                  </div>
                </div>
              ))}
              {rec && (
                <div className="rec-box">
                  <div className="rec-icon">💡</div>
                  <div>
                    <div className="rec-title">توصية التسعير</div>
                    <div className="rec-text">
                      متوسط المنافسين: <strong>{rec.avg} JD</strong> — النطاق: <strong>{rec.mn}–{rec.mx} JD</strong>.
                      يُنصح بتسعير منتجك بين <strong>{rec.mn + Math.round((rec.mx - rec.mn) * 0.3)}–{rec.mn + Math.round((rec.mx - rec.mn) * 0.65)} JD</strong> لضمان تنافسية مع هامش ربح مناسب.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {selModel && !modelDetail && <EmptyState text="لا توجد بيانات أسعار لهذا الموديل" />}
        </div>
      </div>
    </>
  );
}

function MarketSection({ data }) {
  const compFreq = useMemo(() => buildCompFreq(data), [data]);
  const marketShare = useMemo(() => buildMarketShareData(data), [data]);
  const availList = useMemo(() => buildAvailList(data), [data]);

  const ourBrands = availList.reduce((acc, item) => {
    const b = (item.brand || '').toLowerCase();
    if (!acc[b]) acc[b] = { yes: 0, total: 0 };
    acc[b].yes += item.yes;
    acc[b].total += item.total;
    return acc;
  }, {});

  const bekoShare = ourBrands['beko']?.total > 0 ? Math.round((ourBrands['beko'].yes / ourBrands['beko'].total) * 100) : 0;
  const aristonShare = ourBrands['ariston']?.total > 0 ? Math.round((ourBrands['ariston'].yes / ourBrands['ariston'].total) * 100) : 0;
  const sortedComp = Object.entries(compFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxCompCount = sortedComp[0]?.[1] || 1;

  const doughnutData = {
    labels: marketShare.slice(0, 7).map(m => m.brand),
    datasets: [{
      data: marketShare.slice(0, 7).map(m => m.pct),
      backgroundColor: COMP_COLORS.slice(0, 7),
      borderWidth: 2,
      borderColor: C.navyL,
    }]
  };
  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: C.muted, font: { family: 'Cairo', size: 11 }, padding: 10 } },
      tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}%` } }
    },
    cutout: '62%',
  };

  return (
    <>
      <div className="kpi-grid">
        {[
          { icon: '🟡', val: `${bekoShare}%`, lbl: 'حصة beko بالتوافر', accent: C.gold, color: pctColor(bekoShare) },
          { icon: '🔵', val: `${aristonShare}%`, lbl: 'حصة Ariston بالتوافر', accent: C.blue, color: pctColor(aristonShare) },
          { icon: '🏆', val: sortedComp[0]?.[0]?.split(' ')[0] || '—', lbl: 'أكثر منافس حضوراً', accent: C.orange },
          { icon: '📊', val: Object.keys(compFreq).length, lbl: 'منافس مرصود', accent: C.purple },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ '--accent': k.accent, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-val" style={{ color: k.color }}>{k.val}</div>
            <div className="kpi-lbl">{k.lbl}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon">🥧</div>
            <div>
              <div className="db-card-title">حصص السوق حسب التوافر</div>
              <div className="db-card-sub">المعادلة: حضور الماركة ÷ إجمالي الحضور × 100</div>
            </div>
          </div>
          <div className="db-card-body">
            <div className="chart-wrap"><Doughnut data={doughnutData} options={doughnutOpts} /></div>
          </div>
        </div>
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon">🏆</div>
            <div>
              <div className="db-card-title">أكثر المنافسين تواجداً</div>
              <div className="db-card-sub">مرتب حسب عدد مرات الرصد</div>
            </div>
          </div>
          <div className="db-card-body">
            {sortedComp.map(([comp, count], i) => (
              <div key={comp} className="comp-row">
                <div className="comp-rank">{i + 1}</div>
                <div className="comp-name">{comp.split(' ').slice(0, 2).join(' ')}</div>
                <div className="comp-bar-wrap">
                  <div className="comp-bar-track">
                    <div className="comp-bar-fill" style={{ width: `${Math.round((count / maxCompCount) * 100)}%`, background: COMP_COLORS[i % COMP_COLORS.length] }} />
                  </div>
                  <div className="comp-count">{count}</div>
                </div>
              </div>
            ))}
            {!sortedComp.length && <EmptyState text="لا توجد بيانات" />}
          </div>
        </div>
      </div>

      <div className="db-card grid-1">
        <div className="db-card-header">
          <div className="db-card-icon">📐</div>
          <div>
            <div className="db-card-title">جدول الحصص السوقية الكاملة</div>
            <div className="db-card-sub">مقارنة beko/Ariston مع المنافسين بمعادلة الحصة السوقية</div>
          </div>
        </div>
        <div className="db-card-body">
          {marketShare.map((m, i) => (
            <div key={m.brand} className="ms-row">
              <div className="ms-brand" style={{ color: (m.brand === 'beko' || m.brand === 'Ariston') ? C.goldL : '#e8f0f8' }}>
                {m.brand}
              </div>
              <div className="ms-bar-wrap">
                <div className="ms-track">
                  <div className="ms-fill" style={{
                    width: `${m.pct}%`,
                    background: (m.brand === 'beko' || m.brand === 'Ariston') ? C.gold : COMP_COLORS[i % COMP_COLORS.length]
                  }} />
                </div>
                <div className="ms-pct" style={{ color: (m.brand === 'beko' || m.brand === 'Ariston') ? C.goldL : '#e8f0f8' }}>{m.pct}%</div>
                <div className="ms-cnt">{m.count} رصدة</div>
              </div>
            </div>
          ))}
          {!marketShare.length && <EmptyState text="لا توجد بيانات" />}
        </div>
      </div>
    </>
  );
}

function StaffSection({ data }) {
  const [selectedRep, setSelectedRep] = useState(null);
  const repCounts = useMemo(() => buildRepCounts(data), [data]);
  const areaCounts = useMemo(() => buildAreaCounts(data), [data]);

  const getRepData = (rep) => data.filter(r => getField(r, 'rep_name') === rep);

  return (
    <>
      <div className="grid-2">
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon">👥</div>
            <div>
              <div className="db-card-title">الموظفون — الأسماء والمناطق</div>
              <div className="db-card-sub">اضغط على مندوب لعرض تفاصيله</div>
            </div>
          </div>
          <div className="db-card-body">
            {repCounts.length === 0 ? <EmptyState text="لا توجد بيانات" /> : (
              <div className="rep-grid">
                {repCounts.map(([rep, count]) => {
                  const rd = getRepData(rep);
                  const areas = [...new Set(rd.map(r => getField(r, 'area')).filter(Boolean))];
                  const mc = getModelCols(rd);
                  let y = 0, t = 0;
                  mc.forEach(col => rd.forEach(r => { if (r[col]) { t++; if (isYes(r[col])) y++; } }));
                  const avPct = t > 0 ? Math.round((y / t) * 100) : 0;
                  return (
                    <div key={rep} className="rep-card" onClick={() => setSelectedRep(rep)}>
                      <div className="rep-avatar">{rep.charAt(0)}</div>
                      <div className="rep-name">{rep}</div>
                      <div className="rep-area">{areas.slice(0, 2).join('، ')}{areas.length > 2 ? ` +${areas.length - 2}` : ''}</div>
                      <div className="rep-stats">
                        <div className="rep-stat"><div className="rep-stat-val">{count}</div><div className="rep-stat-lbl">زيارة</div></div>
                        <div className="rep-stat"><div className="rep-stat-val">{new Set(rd.map(r => getField(r, 'shop_name'))).size}</div><div className="rep-stat-lbl">محل</div></div>
                        <div className="rep-stat"><div className="rep-stat-val" style={{ color: pctColor(avPct) }}>{avPct}%</div><div className="rep-stat-lbl">توافر</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon">📍</div>
            <div>
              <div className="db-card-title">التغطية الجغرافية</div>
              <div className="db-card-sub">توزيع الزيارات حسب المنطقة</div>
            </div>
          </div>
          <div className="db-card-body">
            {areaCounts.length === 0 ? <EmptyState text="لا توجد بيانات" /> : areaCounts.map(([area, count], i) => (
              <div key={area} className="ms-row">
                <div className="ms-brand">{area}</div>
                <div className="ms-bar-wrap">
                  <div className="ms-track">
                    <div className="ms-fill" style={{ width: `${Math.round((count / areaCounts[0][1]) * 100)}%`, background: COMP_COLORS[i % COMP_COLORS.length] }} />
                  </div>
                  <div className="ms-pct">{count}</div>
                  <div className="ms-cnt">زيارة</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedRep && (
        <div className="popup-overlay" onClick={e => e.target.classList.contains('popup-overlay') && setSelectedRep(null)}>
          <div className="popup-box">
            <div className="popup-head">
              <h2>👤 {selectedRep}</h2>
              <button className="popup-close" onClick={() => setSelectedRep(null)}>✕</button>
            </div>
            <div className="popup-body">
              {(() => {
                const rd = getRepData(selectedRep);
                const areas = [...new Set(rd.map(r => getField(r, 'area')).filter(Boolean))];
                const shops = [...new Set(rd.map(r => getField(r, 'shop_name')).filter(Boolean))];
                const mc = getModelCols(rd);
                let y = 0, t = 0;
                mc.forEach(col => rd.forEach(r => { if (r[col]) { t++; if (isYes(r[col])) y++; } }));
                const avPct = t > 0 ? Math.round((y / t) * 100) : 0;
                return (
                  <>
                    <div className="popup-stats">
                      {[
                        { val: rd.length, lbl: 'تقرير' },
                        { val: shops.length, lbl: 'محل' },
                        { val: `${avPct}%`, lbl: 'توافر', color: pctColor(avPct) },
                        { val: areas.length, lbl: 'منطقة' },
                      ].map((s, i) => (
                        <div key={i} className="popup-stat">
                          <div className="popup-stat-val" style={{ color: s.color || C.goldL }}>{s.val}</div>
                          <div className="popup-stat-lbl">{s.lbl}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div className="lbl">📍 المناطق</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {areas.map(a => <span key={a} className="inline-tag">{a}</span>)}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div className="lbl">🏪 المحلات ({shops.length})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {shops.slice(0, 12).map(s => <span key={s} className="inline-tag" style={{ fontSize: 10, color: C.muted }}>{s}</span>)}
                        {shops.length > 12 && <span style={{ fontSize: 11, color: C.muted }}>+{shops.length - 12} أخرى</span>}
                      </div>
                    </div>
                    <div>
                      <div className="lbl">📦 أداء الموديلات</div>
                      {mc.slice(0, 7).map(col => {
                        let cy = 0, ct = 0;
                        rd.forEach(r => { if (r[col]) { ct++; if (isYes(r[col])) cy++; } });
                        const p = ct > 0 ? Math.round((cy / ct) * 100) : 0;
                        return (
                          <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                            <div style={{ flex: 1, fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.replace('_exists', '')}</div>
                            <div style={{ width: 90, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${p}%`, background: pctColor(p), borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: pctColor(p), minWidth: 32 }}>{p}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NotesSection({ data }) {
  const notes = useMemo(() => buildNotesList(data), [data]);
  if (!notes.length) return <EmptyState text="لا توجد ملاحظات مسجّلة من المندوبين" />;
  return (
    <div className="notes-grid">
      {notes.map((n, i) => {
        const dispText = (n.display || '').toLowerCase();
        const isVisible = dispText.includes('نعم') || dispText.includes('yes') || dispText === '1' || dispText === 'true';
        return (
          <div key={i} className="note-card">
            <div className="note-header">
              <div>
                <div className="note-shop">{n.shop}</div>
                <div className="note-area">📍 {n.area}</div>
              </div>
              {n.display && (
                <span className={isVisible ? 'disp-yes' : 'disp-no'}>
                  {isVisible ? '✅ بارز' : '❌ غير بارز'}
                </span>
              )}
            </div>
            <div className="note-rep">👤 {n.rep}</div>
            {n.notes && <div className="note-text">{n.notes}</div>}
            {n.date && <div style={{ fontSize: 10, color: C.muted, marginTop: 7 }}>{new Date(n.date).toLocaleDateString('ar-JO')}</div>}
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage({ onBack }) {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ month: '', area: '', rep: '' });
  const [activeTab, setActiveTab] = useState('overview');

  const load = useCallback(async (showSpin = false) => {
    if (showSpin) setSpinning(true); else setLoading(true);
    setError(null);
    try {
      const records = await fetchReports();
      setRawData(records.map(flattenRecord));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setSpinning(false); }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const filtered = useMemo(() => rawData.filter(r => {
    const m = r.month || r['الشهر'] || '';
    const a = r.area || r['المنطقة'] || '';
    const n = r.rep_name || r['اسم المندوب'] || '';
    if (filters.month && m !== filters.month) return false;
    if (filters.area && a !== filters.area) return false;
    if (filters.rep && n !== filters.rep) return false;
    return true;
  }), [rawData, filters]);

  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);
  const monthOpts = useMemo(() => getUnique(rawData, 'month', 'الشهر'), [rawData]);
  const areaOpts = useMemo(() => getUnique(rawData, 'area', 'المنطقة'), [rawData]);
  const repOpts = useMemo(() => getUnique(rawData, 'rep_name', 'اسم المندوب'), [rawData]);

  const TABS = [
    { id: 'overview', icon: '📊', label: 'نظرة عامة' },
    { id: 'availability', icon: '✅', label: 'توافر المنتجات' },
    { id: 'prices', icon: '💰', label: 'أسعار المنافسين' },
    { id: 'market', icon: '🥧', label: 'حصة السوق' },
    { id: 'staff', icon: '👥', label: 'الموظفون' },
    { id: 'notes', icon: '📝', label: 'ملاحظات المندوبين' },
  ];

  return (
    <div className="db-root">
      <div className="db-topbar">
        <div className="db-logo">
          <img src={logoLight} alt="DADA GROUP" />
          <div className="db-logo-text">
            <h1>لوحة تحليل السوق</h1>
            <p>beko & Ariston — الأردن</p>
          </div>
        </div>
        <div className="db-topbar-right">
          {!loading && (
            <>
              <div className="db-badge"><div className="db-badge-val">{kpis.total}</div><div className="db-badge-lbl">تقرير</div></div>
              <div className="db-badge"><div className="db-badge-val">{kpis.shops}</div><div className="db-badge-lbl">محل</div></div>
              <div className="db-badge"><div className="db-badge-val" style={{ color: pctColor(kpis.availPct) }}>{kpis.availPct}%</div><div className="db-badge-lbl">توافر</div></div>
            </>
          )}
          <button className={`db-refresh-btn${spinning ? ' spin' : ''}`} onClick={() => load(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            تحديث
          </button>
          <button className="db-exit-btn" onClick={onBack}>← خروج</button>
        </div>
      </div>

      <div className="db-nav">
        {TABS.map(t => (
          <button key={t.id} className={`db-nav-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {!loading && !error && (
        <div className="db-filters">
          {[{ key: 'month', label: '📅 الشهر', opts: monthOpts }, { key: 'area', label: '📍 المنطقة', opts: areaOpts }, { key: 'rep', label: '👤 المندوب', opts: repOpts }]
            .map(({ key, label, opts }) => (
              <div key={key} className="db-filter-group">
                <label className="db-filter-label">{label}</label>
                <select className="db-filter-select" value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}>
                  <option value="">الكل</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          <span className="db-filter-count">{filtered.length} سجل</span>
        </div>
      )}

      <div className="db-body">
        {loading && (
          <div className="db-center">
            <div className="db-spinner" />
            <div className="db-loading-text">جاري تحميل البيانات</div>
          </div>
        )}
        {error && (
          <div className="db-center">
            <div style={{ background: 'rgba(192,41,28,0.1)', border: '1px solid rgba(192,41,28,0.3)', borderRadius: 12, padding: '24px 28px', textAlign: 'center', maxWidth: 380 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>❌</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>فشل تحميل البيانات</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>{error}</div>
              <button className="db-refresh-btn" onClick={() => load(false)}>🔄 إعادة المحاولة</button>
            </div>
          </div>
        )}
        {!loading && !error && rawData.length === 0 && (
          <div className="db-center">
            <div style={{ fontSize: 48 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>لا توجد تقارير بعد</div>
            <div style={{ fontSize: 13, color: C.muted }}>أرسل رابط الفورم للمندوبين لبدء جمع بيانات السوق</div>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && rawData.length > 0 && (
          <div className="db-center">
            <div style={{ fontSize: 48 }}>🔍</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>لا توجد نتائج</div>
            <div style={{ fontSize: 13, color: C.muted }}>جرّب تغيير الفلاتر</div>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            {activeTab === 'overview' && <OverviewSection data={filtered} kpis={kpis} />}
            {activeTab === 'availability' && <AvailSection data={filtered} />}
            {activeTab === 'prices' && <PricesSection data={filtered} />}
            {activeTab === 'market' && <MarketSection data={filtered} />}
            {activeTab === 'staff' && <StaffSection data={filtered} />}
            {activeTab === 'notes' && (
              <div className="db-card grid-1">
                <div className="db-card-header">
                  <div className="db-card-icon">📝</div>
                  <div>
                    <div className="db-card-title">ملاحظات المندوبين</div>
                    <div className="db-card-sub">مع مؤشر بروز المنتجات في المعارض</div>
                  </div>
                </div>
                <div className="db-card-body">
                  <NotesSection data={filtered} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}