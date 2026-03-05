// import { useState, useEffect, useCallback } from 'react';
// import { fetchReports, flattenRecord } from '../utils/supabase.js';
// import {
//   computeKPIs, buildCompFreq, buildAvailList,
//   buildAreaCounts, buildRepCounts, buildPriceTableEntries,
//   getModelDetail, getModelCols, getUnique,
// } from '../utils/dataUtils.js';
// import {
//   Chart as ChartJS, CategoryScale, LinearScale,
//   BarElement, Tooltip, Legend,
// } from 'chart.js';
// import { Bar } from 'react-chartjs-2';

// ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// const PALETTE = ['#1a3a5c','#c9a84c','#c0291c','#27ae60','#2980b9','#8e44ad','#e67e22','#16a085'];

// function pctColor(p) { return p >= 60 ? 'var(--green)' : p >= 30 ? 'var(--gold)' : 'var(--red)'; }

// // ── Sub-components ──────────────────────────────────────────

// function KPICard({ icon, value, label, variant, delay }) {
//   return (
//     <div className={`kpi-card kpi-${variant}`} style={{ animationDelay: `${delay}ms` }}>
//       <div className="kpi-icon-wrap">{icon}</div>
//       <div className="kpi-value">{value}</div>
//       <div className="kpi-label">{label}</div>
//     </div>
//   );
// }

// function CompChart({ freq }) {
//   const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
//   if (!sorted.length) return <EmptyState text="لا توجد بيانات منافسين" />;
//   return (
//     <div className="chart-container">
//       <Bar
//         data={{
//           labels: sorted.map(([k]) => k.split(' ').slice(0, 2).join(' ')),
//           datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: PALETTE, borderRadius: 6, borderSkipped: false }],
//         }}
//         options={{
//           indexAxis: 'y', responsive: true, maintainAspectRatio: false,
//           plugins: { legend: { display: false } },
//           scales: {
//             x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 11 } } },
//             y: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 11 } } },
//           },
//         }}
//       />
//     </div>
//   );
// }

// function AvailList({ items }) {
//   if (!items.length) return <EmptyState text="لا توجد بيانات توافر" />;
//   return (
//     <div className="avail-list">
//       {items.map(r => {
//         const color = pctColor(r.pct);
//         return (
//           <div key={r.col} className="avail-row">
//             <div className="avail-info">
//               <div className="avail-model">{r.label}</div>
//               <div className="avail-brand">{r.brand}</div>
//             </div>
//             <div className="avail-meter">
//               <div className="avail-bar-track">
//                 <div className="avail-bar-fill" style={{ width: `${r.pct}%`, background: color }} />
//               </div>
//               <div className="avail-pct" style={{ color }}>{r.pct}%</div>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// function PriceTableRows({ entries }) {
//   if (!entries.length) return (
//     <tr><td colSpan={7} className="empty-state" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>لا توجد بيانات أسعار</td></tr>
//   );
//   const maxCount = entries[0]?.count || 1;
//   return entries.map((e, i) => {
//     const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
//     return (
//       <tr key={e.label}>
//         <td className="data-table td">
//           <span className={`rank-badge ${rankCls}`}>{i + 1}</span>
//         </td>
//         <td style={{ padding: '10px 14px' }}><span className="brand-tag">{e.brand}</span></td>
//         <td style={{ padding: '10px 14px', fontSize: 12 }}>{e.model}</td>
//         <td style={{ padding: '10px 14px' }} className="price-strong">{e.avg} JD</td>
//         <td style={{ padding: '10px 14px' }} className="price-green">{e.min} JD</td>
//         <td style={{ padding: '10px 14px' }} className="price-red">{e.max} JD</td>
//         <td style={{ padding: '10px 14px' }}>
//           <div className="count-bar-wrap">
//             <div className="count-bar" style={{ width: Math.round((e.count / maxCount) * 100) }} />
//             <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{e.count}</span>
//           </div>
//         </td>
//       </tr>
//     );
//   });
// }

// function AreaGrid({ items }) {
//   if (!items.length) return <EmptyState text="لا توجد بيانات" />;
//   return (
//     <div className="area-grid">
//       {items.map(([area, count]) => (
//         <div key={area} className="area-chip">
//           <div className="area-chip-name">{area}</div>
//           <div className="area-chip-count">{count}</div>
//           <div className="area-chip-sub">زيارة</div>
//         </div>
//       ))}
//     </div>
//   );
// }

// function RepList({ items }) {
//   if (!items.length) return <EmptyState text="لا توجد بيانات" />;
//   return (
//     <div>
//       {items.map(([rep, count]) => (
//         <div key={rep} className="rep-row">
//           <div className="rep-avatar">{rep.charAt(0)}</div>
//           <div className="rep-info">
//             <div className="rep-name">{rep}</div>
//             <div className="rep-meta">{count} زيارة</div>
//           </div>
//           <div className="rep-badge">{count}</div>
//         </div>
//       ))}
//     </div>
//   );
// }

// function ModelDetail({ data, existsCol }) {
//   if (!existsCol || !data.length) return null;
//   const detail = getModelDetail(data, existsCol);
//   if (!detail) return null;
//   const { avPct, yes, total, competitors } = detail;
//   const color = pctColor(avPct);
//   return (
//     <div>
//       <div className="model-detail-header">
//         <div className="model-detail-item">
//           <div className="model-detail-lbl">الموديل</div>
//           <div className="model-detail-val">{existsCol.replace('_exists', '')}</div>
//         </div>
//         <div className="model-detail-item">
//           <div className="model-detail-lbl">التوافر</div>
//           <div className="model-detail-val" style={{ color }}>{avPct}% ({yes}/{total})</div>
//         </div>
//       </div>
//       {competitors.length === 0
//         ? <EmptyState text="لا توجد بيانات أسعار لهذا الموديل" />
//         : competitors.map(c => (
//           <div key={c.name} className="comp-price-row">
//             <div className="comp-price-name">
//               <span className="brand-tag">{c.name.split(' ')[0]}</span>{' '}
//               {c.name.split(' ').slice(1).join(' ')}
//             </div>
//             <div className="comp-price-tags">
//               <div className="price-tag"><span className="pt-lbl">متوسط: </span><span className="pt-val">{c.avg} JD</span></div>
//               <div className="price-tag tag-green"><span className="pt-lbl">أدنى: </span><span className="pt-val">{c.min} JD</span></div>
//               <div className="price-tag tag-red"><span className="pt-lbl">أعلى: </span><span className="pt-val">{c.max} JD</span></div>
//               <div className="price-tag"><span className="pt-lbl">رصدات: </span><span className="pt-val">{c.count}</span></div>
//             </div>
//           </div>
//         ))
//       }
//     </div>
//   );
// }

// function EmptyState({ text }) {
//   return (
//     <div className="empty-state">
//       <div className="empty-state-icon">📭</div>
//       <div className="empty-state-text">{text}</div>
//     </div>
//   );
// }

// function CardSection({ icon, title, subtitle, children, style }) {
//   return (
//     <div className="card" style={style}>
//       <div className="card-header">
//         <div className="card-header-icon">{icon}</div>
//         <div>
//           <div className="card-title">{title}</div>
//           {subtitle && <div className="card-subtitle">{subtitle}</div>}
//         </div>
//       </div>
//       {children}
//     </div>
//   );
// }

// // ── Main Dashboard ──────────────────────────────────────────

// export default function DashboardPage({ onBack }) {
//   const [rawData, setRawData]   = useState([]);
//   const [loading, setLoading]   = useState(true);
//   const [spinning, setSpinning] = useState(false);
//   const [error, setError]       = useState(null);
//   const [filters, setFilters]   = useState({ month: '', area: '', rep: '' });
//   const [selModel, setSelModel] = useState('');

//   const load = useCallback(async (showSpin = false) => {
//     if (showSpin) setSpinning(true);
//     else setLoading(true);
//     setError(null);
//     try {
//       const records = await fetchReports();
//       setRawData(records.map(flattenRecord));
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//       setSpinning(false);
//     }
//   }, []);

//   useEffect(() => { load(false); }, [load]);

//   const filtered = rawData.filter(r => {
//     const m = r.month     || r['الشهر']       || '';
//     const a = r.area      || r['المنطقة']      || '';
//     const n = r.rep_name  || r['اسم المندوب']  || '';
//     if (filters.month && m !== filters.month) return false;
//     if (filters.area  && a !== filters.area)  return false;
//     if (filters.rep   && n !== filters.rep)   return false;
//     return true;
//   });

//   const kpis         = computeKPIs(filtered);
//   const compFreq     = buildCompFreq(filtered);
//   const availList    = buildAvailList(filtered);
//   const areaCounts   = buildAreaCounts(filtered);
//   const repCounts    = buildRepCounts(filtered);
//   const priceEntries = buildPriceTableEntries(filtered);
//   const modelCols    = getModelCols(filtered);

//   const monthOpts = getUnique(rawData, 'month',    'الشهر');
//   const areaOpts  = getUnique(rawData, 'area',     'المنطقة');
//   const repOpts   = getUnique(rawData, 'rep_name', 'اسم المندوب');

//   return (
//     <div>
//       {/* Topbar */}
//       <div className="topbar">
//         <div className="topbar-inner">
//           <div className="topbar-left">
//             <span className="topbar-badge">DADA GROUP</span>
//             <div className="topbar-title">
//               <h1>لوحة تحليل السوق</h1>
//               <p>beko &amp; Ariston — الأردن</p>
//             </div>
//           </div>
//           <div className="topbar-right">
//             {!loading && (
//               <>
//                 <div className="topbar-meta-item">
//                   <div className="topbar-meta-val">{kpis.total}</div>
//                   <div className="topbar-meta-lbl">إجمالي التقارير</div>
//                 </div>
//                 <div className="topbar-meta-item">
//                   <div className="topbar-meta-val">{kpis.shops}</div>
//                   <div className="topbar-meta-lbl">محل</div>
//                 </div>
//                 <div className="topbar-meta-item">
//                   <div className="topbar-meta-val">{kpis.reps}</div>
//                   <div className="topbar-meta-lbl">مندوب</div>
//                 </div>
//               </>
//             )}
//             <button className="topbar-btn" onClick={onBack}>← خروج</button>
//           </div>
//         </div>
//       </div>

//       {/* Filters */}
//       {!loading && !error && (
//         <div className="filters-bar">
//           {[
//             { key: 'month', label: '📅 الشهر',   opts: monthOpts },
//             { key: 'area',  label: '📍 المنطقة', opts: areaOpts  },
//             { key: 'rep',   label: '👤 المندوب', opts: repOpts   },
//           ].map(({ key, label, opts }) => (
//             <div key={key} className="filter-group">
//               <label className="filter-label">{label}</label>
//               <select
//                 className="filter-select"
//                 value={filters[key]}
//                 onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
//               >
//                 <option value="">الكل</option>
//                 {opts.map(o => <option key={o} value={o}>{o}</option>)}
//               </select>
//             </div>
//           ))}
//           <div className="filters-spacer" />
//           <span className="filters-count">{filtered.length} سجل</span>
//           <button className={`btn-refresh${spinning ? ' spinning' : ''}`} onClick={() => load(true)}>
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//               <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
//             </svg>
//             تحديث
//           </button>
//         </div>
//       )}

//       <div className="dashboard-body">
//         {loading && (
//           <div className="loading-wrap">
//             <div className="spinner" />
//             <div className="loading-text">جاري تحميل البيانات من Supabase...</div>
//           </div>
//         )}

//         {error && (
//           <div className="error-card">
//             <div className="error-icon">❌</div>
//             <div className="error-title">فشل تحميل البيانات</div>
//             <div className="error-msg">{error}</div>
//             <button className="btn-refresh" onClick={() => load(false)}>🔄 إعادة المحاولة</button>
//           </div>
//         )}

//         {!loading && !error && rawData.length === 0 && (
//           <div className="empty-full">
//             <div className="empty-full-icon">📭</div>
//             <div className="empty-full-title">لا توجد تقارير بعد</div>
//             <div className="empty-full-sub">أرسل رابط الفورم للمندوبين لبدء جمع بيانات السوق</div>
//           </div>
//         )}

//         {!loading && !error && filtered.length > 0 && (
//           <>
//             {/* KPIs */}
//             <div className="kpi-row">
//               <KPICard icon="🏪" value={kpis.shops}           label="محل تمت زيارته"        variant="navy"  delay={0}   />
//               <KPICard icon="📦" value={kpis.models || '—'}   label="موديل تم رصده"         variant="gold"  delay={60}  />
//               <KPICard icon="✅" value={`${kpis.availPct}%`} label="متوسط توافر موديلاتنا" variant="green" delay={120} />
//               <KPICard icon="🏆" value={kpis.topComp}         label="أقوى منافس"            variant="red"   delay={180} />
//               <KPICard icon="👥" value={kpis.reps}            label="مندوب نشط"             variant="navy"  delay={240} />
//             </div>

//             {/* Charts row */}
//             <div className="grid-2">
//               <CardSection icon="🏆" title="أكثر المنافسين تواجداً في المحلات" subtitle="مرتب حسب عدد الرصدات">
//                 <CompChart freq={compFreq} />
//               </CardSection>
//               <CardSection icon="✅" title="توافر موديلاتنا بالمحلات" subtitle="نسبة الحضور في المحلات المزارة">
//                 <AvailList items={availList} />
//               </CardSection>
//             </div>

//             {/* Price Table */}
//             <div className="card card-full">
//               <div className="card-header">
//                 <div className="card-header-icon">💰</div>
//                 <div>
//                   <div className="card-title">أسعار المنافسين الفعلية في المحلات</div>
//                   <div className="card-subtitle">مرتبة حسب عدد الرصدات</div>
//                 </div>
//               </div>
//               <div style={{ overflowX: 'auto' }}>
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       {['#','الماركة','الموديل','متوسط السعر','أدنى سعر','أعلى سعر','عدد الرصدات'].map(h => (
//                         <th key={h}>{h}</th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody><PriceTableRows entries={priceEntries} /></tbody>
//                 </table>
//               </div>
//             </div>

//             {/* Area + Rep */}
//             <div className="grid-2">
//               <CardSection icon="📍" title="الزيارات حسب المنطقة">
//                 <AreaGrid items={areaCounts} />
//               </CardSection>
//               <CardSection icon="👤" title="أداء المندوبين">
//                 <RepList items={repCounts} />
//               </CardSection>
//             </div>

//             {/* Model Detail */}
//             <div className="card card-full">
//               <div className="card-header">
//                 <div className="card-header-icon">🔍</div>
//                 <div>
//                   <div className="card-title">أسعار المنافسين لكل موديل beko/Ariston</div>
//                   <div className="card-subtitle">اختر موديل لعرض تفاصيل المقارنة</div>
//                 </div>
//               </div>
//               <select
//                 className="model-select"
//                 value={selModel}
//                 onChange={e => setSelModel(e.target.value)}
//                 style={{ marginBottom: 16 }}
//               >
//                 <option value="">-- اختر موديل --</option>
//                 {modelCols.map(col => (
//                   <option key={col} value={col}>{col.replace('_exists', '')}</option>
//                 ))}
//               </select>
//               <ModelDetail data={filtered} existsCol={selModel} />
//             </div>
//           </>
//         )}

//         {/* Edge case: filters result in 0 but rawData has records */}
//         {!loading && !error && rawData.length > 0 && filtered.length === 0 && (
//           <div className="empty-full">
//             <div className="empty-full-icon">🔍</div>
//             <div className="empty-full-title">لا توجد نتائج للفلاتر المحددة</div>
//             <div className="empty-full-sub">جرب تغيير الفلاتر لعرض بيانات مختلفة</div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// import { useState, useEffect, useCallback } from 'react';
// import { fetchReports, flattenRecord } from '../utils/supabase.js';
// import {
//   computeKPIs, buildCompFreq, buildAvailList,
//   buildAreaCounts, buildRepCounts, buildPriceTableEntries,
//   getModelDetail, getModelCols, getUnique,
// } from '../utils/dataUtils.js';
// import {
//   Chart as ChartJS, CategoryScale, LinearScale,
//   BarElement, Tooltip, Legend,
// } from 'chart.js';
// import { Bar } from 'react-chartjs-2';

// ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// const PALETTE = ['#1a3a5c','#c9a84c','#c0291c','#27ae60','#2980b9','#8e44ad','#e67e22','#16a085'];

// function pctColor(p) { return p >= 60 ? 'var(--green)' : p >= 30 ? 'var(--gold)' : 'var(--red)'; }

// // ── Sub-components ──────────────────────────────────────────

// function KPICard({ icon, value, label, variant, delay }) {
//   return (
//     <div className={`kpi-card kpi-${variant}`} style={{ animationDelay: `${delay}ms` }}>
//       <div className="kpi-icon-wrap">{icon}</div>
//       <div className="kpi-value">{value}</div>
//       <div className="kpi-label">{label}</div>
//     </div>
//   );
// }

// function CompChart({ freq }) {
//   const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
//   if (!sorted.length) return <EmptyState text="لا توجد بيانات منافسين" />;
//   return (
//     <div className="chart-container">
//       <Bar
//         data={{
//           labels: sorted.map(([k]) => k.split(' ').slice(0, 2).join(' ')),
//           datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: PALETTE, borderRadius: 6, borderSkipped: false }],
//         }}
//         options={{
//           indexAxis: 'y', responsive: true, maintainAspectRatio: false,
//           plugins: { legend: { display: false } },
//           scales: {
//             x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 11 } } },
//             y: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 11 } } },
//           },
//         }}
//       />
//     </div>
//   );
// }

// function AvailList({ items }) {
//   if (!items.length) return <EmptyState text="لا توجد بيانات توافر" />;
//   return (
//     <div className="avail-list">
//       {items.map(r => {
//         const color = pctColor(r.pct);
//         return (
//           <div key={r.col} className="avail-row">
//             <div className="avail-info">
//               <div className="avail-model">{r.label}</div>
//               <div className="avail-brand">{r.brand}</div>
//             </div>
//             <div className="avail-meter">
//               <div className="avail-bar-track">
//                 <div className="avail-bar-fill" style={{ width: `${r.pct}%`, background: color }} />
//               </div>
//               <div className="avail-pct" style={{ color }}>{r.pct}%</div>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// function PriceTableRows({ entries }) {
//   if (!entries.length) return (
//     <tr><td colSpan={7} className="empty-state" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>لا توجد بيانات أسعار</td></tr>
//   );
//   const maxCount = entries[0]?.count || 1;
//   return entries.map((e, i) => {
//     const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
//     return (
//       <tr key={e.label}>
//         <td className="data-table td">
//           <span className={`rank-badge ${rankCls}`}>{i + 1}</span>
//         </td>
//         <td style={{ padding: '10px 14px' }}><span className="brand-tag">{e.brand}</span></td>
//         <td style={{ padding: '10px 14px', fontSize: 12 }}>{e.model}</td>
//         <td style={{ padding: '10px 14px' }} className="price-strong">{e.avg} JD</td>
//         <td style={{ padding: '10px 14px' }} className="price-green">{e.min} JD</td>
//         <td style={{ padding: '10px 14px' }} className="price-red">{e.max} JD</td>
//         <td style={{ padding: '10px 14px' }}>
//           <div className="count-bar-wrap">
//             <div className="count-bar" style={{ width: Math.round((e.count / maxCount) * 100) }} />
//             <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{e.count}</span>
//           </div>
//         </td>
//       </tr>
//     );
//   });
// }

// function AreaGrid({ items }) {
//   if (!items.length) return <EmptyState text="لا توجد بيانات" />;
//   return (
//     <div className="area-grid">
//       {items.map(([area, count]) => (
//         <div key={area} className="area-chip">
//           <div className="area-chip-name">{area}</div>
//           <div className="area-chip-count">{count}</div>
//           <div className="area-chip-sub">زيارة</div>
//         </div>
//       ))}
//     </div>
//   );
// }

// function RepList({ items }) {
//   if (!items.length) return <EmptyState text="لا توجد بيانات" />;
//   return (
//     <div>
//       {items.map(([rep, count]) => (
//         <div key={rep} className="rep-row">
//           <div className="rep-avatar">{rep.charAt(0)}</div>
//           <div className="rep-info">
//             <div className="rep-name">{rep}</div>
//             <div className="rep-meta">{count} زيارة</div>
//           </div>
//           <div className="rep-badge">{count}</div>
//         </div>
//       ))}
//     </div>
//   );
// }

// function ModelDetail({ data, existsCol }) {
//   if (!existsCol || !data.length) return null;
//   const detail = getModelDetail(data, existsCol);
//   if (!detail) return null;
//   const { avPct, yes, total, competitors } = detail;
//   const color = pctColor(avPct);
//   return (
//     <div>
//       <div className="model-detail-header">
//         <div className="model-detail-item">
//           <div className="model-detail-lbl">الموديل</div>
//           <div className="model-detail-val">{existsCol.replace('_exists', '')}</div>
//         </div>
//         <div className="model-detail-item">
//           <div className="model-detail-lbl">التوافر</div>
//           <div className="model-detail-val" style={{ color }}>{avPct}% ({yes}/{total})</div>
//         </div>
//       </div>
//       {competitors.length === 0
//         ? <EmptyState text="لا توجد بيانات أسعار لهذا الموديل" />
//         : competitors.map(c => (
//           <div key={c.name} className="comp-price-row">
//             <div className="comp-price-name">
//               <span className="brand-tag">{c.name.split(' ')[0]}</span>{' '}
//               {c.name.split(' ').slice(1).join(' ')}
//             </div>
//             <div className="comp-price-tags">
//               <div className="price-tag"><span className="pt-lbl">متوسط: </span><span className="pt-val">{c.avg} JD</span></div>
//               <div className="price-tag tag-green"><span className="pt-lbl">أدنى: </span><span className="pt-val">{c.min} JD</span></div>
//               <div className="price-tag tag-red"><span className="pt-lbl">أعلى: </span><span className="pt-val">{c.max} JD</span></div>
//               <div className="price-tag"><span className="pt-lbl">رصدات: </span><span className="pt-val">{c.count}</span></div>
//             </div>
//           </div>
//         ))
//       }
//     </div>
//   );
// }

// function EmptyState({ text }) {
//   return (
//     <div className="empty-state">
//       <div className="empty-state-icon">📭</div>
//       <div className="empty-state-text">{text}</div>
//     </div>
//   );
// }

// function CardSection({ icon, title, subtitle, children, style }) {
//   return (
//     <div className="card" style={style}>
//       <div className="card-header">
//         <div className="card-header-icon">{icon}</div>
//         <div>
//           <div className="card-title">{title}</div>
//           {subtitle && <div className="card-subtitle">{subtitle}</div>}
//         </div>
//       </div>
//       {children}
//     </div>
//   );
// }

// // ── Main Dashboard ──────────────────────────────────────────

// export default function DashboardPage({ onBack }) {
//   const [rawData, setRawData]   = useState([]);
//   const [loading, setLoading]   = useState(true);
//   const [spinning, setSpinning] = useState(false);
//   const [error, setError]       = useState(null);
//   const [filters, setFilters]   = useState({ month: '', area: '', rep: '' });
//   const [selModel, setSelModel] = useState('');

//   const load = useCallback(async (showSpin = false) => {
//     if (showSpin) setSpinning(true);
//     else setLoading(true);
//     setError(null);
//     try {
//       const records = await fetchReports();
//       setRawData(records.map(flattenRecord));
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//       setSpinning(false);
//     }
//   }, []);

//   useEffect(() => { load(false); }, [load]);

//   const filtered = rawData.filter(r => {
//     const m = r.month     || r['الشهر']       || '';
//     const a = r.area      || r['المنطقة']      || '';
//     const n = r.rep_name  || r['اسم المندوب']  || '';
//     if (filters.month && m !== filters.month) return false;
//     if (filters.area  && a !== filters.area)  return false;
//     if (filters.rep   && n !== filters.rep)   return false;
//     return true;
//   });

//   const kpis         = computeKPIs(filtered);
//   const compFreq     = buildCompFreq(filtered);
//   const availList    = buildAvailList(filtered);
//   const areaCounts   = buildAreaCounts(filtered);
//   const repCounts    = buildRepCounts(filtered);
//   const priceEntries = buildPriceTableEntries(filtered);
//   const modelCols    = getModelCols(filtered);

//   const monthOpts = getUnique(rawData, 'month',    'الشهر');
//   const areaOpts  = getUnique(rawData, 'area',     'المنطقة');
//   const repOpts   = getUnique(rawData, 'rep_name', 'اسم المندوب');

//   return (
//     <div>
//       {/* Topbar */}
//       <div className="topbar">
//         <div className="topbar-inner">
//           <div className="topbar-left">
//             <span className="topbar-badge">DADA GROUP</span>
//             <div className="topbar-title">
//               <h1>لوحة تحليل السوق</h1>
//               <p>beko &amp; Ariston — الأردن</p>
//             </div>
//           </div>
//           <div className="topbar-right">
//             {!loading && (
//               <>
//                 <div className="topbar-meta-item">
//                   <div className="topbar-meta-val">{kpis.total}</div>
//                   <div className="topbar-meta-lbl">إجمالي التقارير</div>
//                 </div>
//                 <div className="topbar-meta-item">
//                   <div className="topbar-meta-val">{kpis.shops}</div>
//                   <div className="topbar-meta-lbl">محل</div>
//                 </div>
//                 <div className="topbar-meta-item">
//                   <div className="topbar-meta-val">{kpis.reps}</div>
//                   <div className="topbar-meta-lbl">مندوب</div>
//                 </div>
//               </>
//             )}
//             <button className="topbar-btn" onClick={onBack}>← خروج</button>
//           </div>
//         </div>
//       </div>

//       {/* Filters */}
//       {!loading && !error && (
//         <div className="filters-bar">
//           {[
//             { key: 'month', label: '📅 الشهر',   opts: monthOpts },
//             { key: 'area',  label: '📍 المنطقة', opts: areaOpts  },
//             { key: 'rep',   label: '👤 المندوب', opts: repOpts   },
//           ].map(({ key, label, opts }) => (
//             <div key={key} className="filter-group">
//               <label className="filter-label">{label}</label>
//               <select
//                 className="filter-select"
//                 value={filters[key]}
//                 onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
//               >
//                 <option value="">الكل</option>
//                 {opts.map(o => <option key={o} value={o}>{o}</option>)}
//               </select>
//             </div>
//           ))}
//           <div className="filters-spacer" />
//           <span className="filters-count">{filtered.length} سجل</span>
//           <button className={`btn-refresh${spinning ? ' spinning' : ''}`} onClick={() => load(true)}>
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//               <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
//             </svg>
//             تحديث
//           </button>
//         </div>
//       )}

//       <div className="dashboard-body">
//         {loading && (
//           <div className="loading-wrap">
//             <div className="spinner" />
//             <div className="loading-text">جاري تحميل البيانات من Supabase...</div>
//           </div>
//         )}

//         {error && (
//           <div className="error-card">
//             <div className="error-icon">❌</div>
//             <div className="error-title">فشل تحميل البيانات</div>
//             <div className="error-msg">{error}</div>
//             <button className="btn-refresh" onClick={() => load(false)}>🔄 إعادة المحاولة</button>
//           </div>
//         )}

//         {!loading && !error && rawData.length === 0 && (
//           <div className="empty-full">
//             <div className="empty-full-icon">📭</div>
//             <div className="empty-full-title">لا توجد تقارير بعد</div>
//             <div className="empty-full-sub">أرسل رابط الفورم للمندوبين لبدء جمع بيانات السوق</div>
//           </div>
//         )}

//         {!loading && !error && filtered.length > 0 && (
//           <>
//             {/* KPIs */}
//             <div className="kpi-row">
//               <KPICard icon="🏪" value={kpis.shops}           label="محل تمت زيارته"        variant="navy"  delay={0}   />
//               <KPICard icon="📦" value={kpis.models || '—'}   label="موديل تم رصده"         variant="gold"  delay={60}  />
//               <KPICard icon="✅" value={`${kpis.availPct}%`} label="متوسط توافر موديلاتنا" variant="green" delay={120} />
//               <KPICard icon="🏆" value={kpis.topComp}         label="أقوى منافس"            variant="red"   delay={180} />
//               <KPICard icon="👥" value={kpis.reps}            label="مندوب نشط"             variant="navy"  delay={240} />
//             </div>

//             {/* Charts row */}
//             <div className="grid-2">
//               <CardSection icon="🏆" title="أكثر المنافسين تواجداً في المحلات" subtitle="مرتب حسب عدد الرصدات">
//                 <CompChart freq={compFreq} />
//               </CardSection>
//               <CardSection icon="✅" title="توافر موديلاتنا بالمحلات" subtitle="نسبة الحضور في المحلات المزارة">
//                 <AvailList items={availList} />
//               </CardSection>
//             </div>

//             {/* Price Table */}
//             <div className="card card-full">
//               <div className="card-header">
//                 <div className="card-header-icon">💰</div>
//                 <div>
//                   <div className="card-title">أسعار المنافسين الفعلية في المحلات</div>
//                   <div className="card-subtitle">مرتبة حسب عدد الرصدات</div>
//                 </div>
//               </div>
//               <div style={{ overflowX: 'auto' }}>
//                 <table className="data-table">
//                   <thead>
//                     <tr>
//                       {['#','الماركة','الموديل','متوسط السعر','أدنى سعر','أعلى سعر','عدد الرصدات'].map(h => (
//                         <th key={h}>{h}</th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody><PriceTableRows entries={priceEntries} /></tbody>
//                 </table>
//               </div>
//             </div>

//             {/* Area + Rep */}
//             <div className="grid-2">
//               <CardSection icon="📍" title="الزيارات حسب المنطقة">
//                 <AreaGrid items={areaCounts} />
//               </CardSection>
//               <CardSection icon="👤" title="أداء المندوبين">
//                 <RepList items={repCounts} />
//               </CardSection>
//             </div>

//             {/* Model Detail */}
//             <div className="card card-full">
//               <div className="card-header">
//                 <div className="card-header-icon">🔍</div>
//                 <div>
//                   <div className="card-title">أسعار المنافسين لكل موديل beko/Ariston</div>
//                   <div className="card-subtitle">اختر موديل لعرض تفاصيل المقارنة</div>
//                 </div>
//               </div>
//               <select
//                 className="model-select"
//                 value={selModel}
//                 onChange={e => setSelModel(e.target.value)}
//                 style={{ marginBottom: 16 }}
//               >
//                 <option value="">-- اختر موديل --</option>
//                 {modelCols.map(col => (
//                   <option key={col} value={col}>{col.replace('_exists', '')}</option>
//                 ))}
//               </select>
//               <ModelDetail data={filtered} existsCol={selModel} />
//             </div>
//           </>
//         )}

//         {/* Edge case: filters result in 0 but rawData has records */}
//         {!loading && !error && rawData.length > 0 && filtered.length === 0 && (
//           <div className="empty-full">
//             <div className="empty-full-icon">🔍</div>
//             <div className="empty-full-title">لا توجد نتائج للفلاتر المحددة</div>
//             <div className="empty-full-sub">جرب تغيير الفلاتر لعرض بيانات مختلفة</div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }