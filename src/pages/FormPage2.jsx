import { useState, useRef } from 'react';
import { FORM_SECTIONS } from '../utils/formData.js';
import { submitReport } from '../utils/supabase.js';
import logoLight from "../assets/logo-light.svg";

// ── Product Card ────────────────────────────────────────────
function ProductCard({ product, formState, onChange }) {
  const { brand, model, existsName, competitors } = product;
  const existsVal = formState[existsName] || 'no';

  return (
    <div className="product-card">
      <div className="product-card-header">
        <div className="product-name-wrap">
          <span className={`brand-badge ${brand.toLowerCase() === 'ariston' ? 'ariston' : 'beko'}`}>
            {brand}
          </span>
          <span className="product-model-name">{model}</span>
        </div>
      </div>
      <div className="product-card-body">
        <div className="avail-radio-row">
          <span className="avail-radio-label">هل الموديل متوفر في المحل؟</span>
          <div className="radio-group">
            <label className={`radio-option${existsVal === 'yes' ? ' is-yes' : ''}`}>
              <input type="radio" value="yes" checked={existsVal === 'yes'} onChange={() => onChange(existsName, 'yes')} />
              <span className="radio-dot" />نعم ✓
            </label>
            <label className={`radio-option${existsVal === 'no' ? ' is-no' : ''}`}>
              <input type="radio" value="no" checked={existsVal === 'no'} onChange={() => onChange(existsName, 'no')} />
              <span className="radio-dot" />لا ✗
            </label>
          </div>
        </div>
        {competitors.length > 0 && (
          <>
            <div className="comp-table-header">المنافسون من السوق — أدخل سعر البيع الفعلي</div>
            <div className="comp-scroll">
              <table className="comp-table">
                <thead>
                  <tr>
                    <th>الماركة</th><th>الموديل</th><th>السعر المرجعي</th>
                    <th>سعر البيع الفعلي بالمحل</th><th>متوفر؟</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map(c => (
                    <tr key={c.priceName}>
                      <td><span className="comp-brand-tag">{c.brand}</span></td>
                      <td className="comp-model-name">{c.model}</td>
                      <td className="comp-ref-price">{c.ref}</td>
                      <td>
                        <div className="price-input-wrap">
                          <input type="number" className="price-input" placeholder="—" min="0" step="0.5"
                            value={formState[c.priceName] || ''}
                            onChange={e => onChange(c.priceName, e.target.value)} />
                          <span className="price-jd">JD</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="avail-toggle-wrap">
                          <input type="checkbox" checked={formState[c.availName] === '1'}
                            onChange={e => onChange(c.availName, e.target.checked ? '1' : '')} />
                          <span className="toggle-track" />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main FormPage ───────────────────────────────────────────
const NOTES_STEP = FORM_SECTIONS.length + 1;

export default function FormPage({ onBack }) {
  const [step, setStep]         = useState(0);
  const [meta, setMeta]         = useState({ rep_name: '', month: '', shop_name: '', area: '' });
  const [formState, setFormState] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const topRef = useRef(null);

  function scrollTop() { topRef.current?.scrollIntoView({ behavior: 'smooth' }); }

  function goNext() {
    if (step === 0 && (!meta.rep_name || !meta.month || !meta.shop_name || !meta.area)) {
      alert('يرجى تعبئة جميع الحقول الأساسية: اسم المندوب، الشهر، اسم المحل، المنطقة');
      return;
    }
    setStep(s => Math.min(s + 1, NOTES_STEP));
    scrollTop();
  }

  function goPrev() { setStep(s => Math.max(s - 1, 0)); scrollTop(); }

  function goToStep(s) {
    if (s <= step + 1) { setStep(s); scrollTop(); }
  }

  async function handleSubmit() {
    setSubmitting(true);
    const allData = { ...meta, ...formState };
    const record = {
      rep_name: meta.rep_name, month: meta.month, shop_name: meta.shop_name, area: meta.area,
      display: formState['display'] || '', recommendation: formState['recommendation'] || '',
      notes: formState['notes'] || '', form_data: allData,
    };
    try {
      await submitReport(record);
      setSubmitted(true);
      scrollTop();
    } catch (err) {
      alert('❌ حدث خطأ أثناء الإرسال:\n' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setMeta({ rep_name: '', month: '', shop_name: '', area: '' });
    setFormState({}); setSubmitted(false); setStep(0); scrollTop();
  }

  const progressPct = Math.round((step / NOTES_STEP) * 100);

  if (submitted) {
    return (
      <div ref={topRef}>
        <div className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <img src={logoLight} alt="DADA GROUP" className="landing-logo-image" />
              <div className="topbar-title"><h1>تحليل الحصة السوقية</h1></div>
            </div>
            <button className="topbar-btn" onClick={onBack}>← الرئيسية</button>
          </div>
        </div>
        <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
          <div className="success-card">
            <div className="success-icon">🎉</div>
            <div className="success-title">تم الإرسال بنجاح!</div>
            <div className="success-sub">شكراً {meta.rep_name}! تم استلام تقرير {meta.shop_name} لشهر {meta.month}.</div>
            <button className="btn-reset" onClick={handleReset}>تعبئة محل آخر 🔄</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef}>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <img src={logoLight} alt="DADA GROUP" className="landing-logo-image" />
            <div className="topbar-title">
              <h1>📊 تحليل الحصة السوقية الشهري</h1>
              <p>beko / Ariston — سعر المنافس الفعلي في المحل</p>
            </div>
          </div>
          <button className="topbar-btn" onClick={onBack}>← الرئيسية</button>
        </div>
        <div className="topbar-progress">
          <div className="topbar-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Wizard tab bar */}
      <div className="wizard-nav">
        <div className="wizard-nav-inner">
          <button className={`wiz-tab${step === 0 ? ' active' : ''}${step > 0 ? ' done' : ''}`} onClick={() => goToStep(0)}>
            <span className="wiz-tab-icon">{step > 0 ? '✅' : '📋'}</span>
            <span className="wiz-tab-label">البيانات</span>
          </button>
          {FORM_SECTIONS.map((sec, i) => {
            const sIdx = i + 1;
            const isDone = step > sIdx;
            const isActive = step === sIdx;
            const isLocked = sIdx > step + 1;
            return (
              <button key={i}
                className={`wiz-tab${isActive ? ' active' : ''}${isDone ? ' done' : ''}${isLocked ? ' locked' : ''}`}
                onClick={() => goToStep(sIdx)} disabled={isLocked}>
                <span className="wiz-tab-icon">{isDone ? '✅' : sec.icon}</span>
                <span className="wiz-tab-label">{sec.title}</span>
                <span className="wiz-tab-count">{sec.products.length}</span>
              </button>
            );
          })}
          <button
            className={`wiz-tab${step === NOTES_STEP ? ' active' : ''}${step < NOTES_STEP ? ' locked' : ''}`}
            onClick={() => goToStep(NOTES_STEP)} disabled={step < NOTES_STEP}>
            <span className="wiz-tab-icon">📝</span>
            <span className="wiz-tab-label">الإرسال</span>
          </button>
        </div>
      </div>

      {/* Step body */}
      <div className="form-body" style={{ paddingBottom: 100 }}>

        {/* STEP 0 — meta */}
        {step === 0 && (
          <div className="wizard-step-card">
            <div className="wizard-step-header">
              <span className="wizard-step-icon">📋</span>
              <div>
                <div className="wizard-step-title">البيانات الأساسية</div>
                <div className="wizard-step-sub">أدخل معلومات المندوب والمحل قبل البدء</div>
              </div>
            </div>
            <div className="wizard-meta-grid">
              <div className="form-info-field" style={{ minWidth: 0 }}>
                <label>👤 اسم المندوب *</label>
                <input type="text" placeholder="اكتب اسمك" value={meta.rep_name}
                  onChange={e => setMeta(s => ({ ...s, rep_name: e.target.value }))} />
              </div>
              <div className="form-info-field" style={{ minWidth: 0 }}>
                <label>📅 الشهر *</label>
                <select value={meta.month} onChange={e => setMeta(s => ({ ...s, month: e.target.value }))}>
                  <option value="">-- الشهر --</option>
                  {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-info-field" style={{ minWidth: 0 }}>
                <label>🏪 اسم المحل *</label>
                <input type="text" placeholder="اسم المحل" value={meta.shop_name}
                  onChange={e => setMeta(s => ({ ...s, shop_name: e.target.value }))} />
              </div>
              <div className="form-info-field" style={{ minWidth: 0 }}>
                <label>📍 المنطقة *</label>
                <select value={meta.area} onChange={e => setMeta(s => ({ ...s, area: e.target.value }))}>
                  <option value="">-- المنطقة --</option>
                  {['عمان','اربد','الزرقاء','السلط','مادبا','جرش','عجلون','المفرق','الرمثا','الكرك','الطفيلة','معان','غور الأردن'].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SECTION STEPS */}
        {step >= 1 && step <= FORM_SECTIONS.length && (() => {
          const sec = FORM_SECTIONS[step - 1];
          return (
            <div className="wizard-step-card">
              <div className="wizard-step-header">
                <span className="wizard-step-icon">{sec.icon}</span>
                <div style={{ flex: 1 }}>
                  <div className="wizard-step-title">
                    {sec.title}
                    <span style={{ opacity: 0.55, fontWeight: 400, fontSize: 13, marginRight: 8 }}>{sec.sub}</span>
                  </div>
                  <div className="wizard-step-sub">{sec.products.length} منتج — تحقق من توفر الموديل وأسعار المنافسين</div>
                </div>
                <div className="section-count">{sec.products.length} منتج</div>
              </div>
              <div className="form-section-body">
                {sec.products.map(product => (
                  <ProductCard key={product.id} product={product} formState={formState} onChange={(n, v) => setFormState(s => ({ ...s, [n]: v }))} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* NOTES & SUBMIT */}
        {step === NOTES_STEP && (
          <div>
            <div className="wizard-summary-bar">
              <div className="wizard-summary-item"><span>👤</span><span>{meta.rep_name}</span></div>
              <div className="wizard-summary-sep">|</div>
              <div className="wizard-summary-item"><span>🏪</span><span>{meta.shop_name}</span></div>
              <div className="wizard-summary-sep">|</div>
              <div className="wizard-summary-item"><span>📍</span><span>{meta.area}</span></div>
              <div className="wizard-summary-sep">|</div>
              <div className="wizard-summary-item"><span>📅</span><span>{meta.month}</span></div>
            </div>
            <div className="notes-card">
              <div className="notes-title">📝 ملاحظات عامة</div>
              <div className="notes-grid">
                <div className="form-field">
                  <label>هل المحل يعرض beko/Ariston بشكل واضح؟</label>
                  <select value={formState['display'] || ''} onChange={e => setFormState(s => ({ ...s, display: e.target.value }))}>
                    <option value="">-- اختر --</option>
                    <option>نعم، بمكان بارز</option><option>عادي</option>
                    <option>لا، مخفي</option><option>غير معروض</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>هل البائع يوصي بـ beko/Ariston؟</label>
                  <select value={formState['recommendation'] || ''} onChange={e => setFormState(s => ({ ...s, recommendation: e.target.value }))}>
                    <option value="">-- اختر --</option>
                    <option>دائماً</option><option>أحياناً</option>
                    <option>نادراً</option><option>لا</option>
                  </select>
                </div>
              </div>
              <div className="form-field" style={{ marginTop: 12 }}>
                <label>ملاحظات إضافية</label>
                <textarea placeholder="أي معلومات مفيدة عن المحل أو السوق..."
                  value={formState['notes'] || ''} onChange={e => setFormState(s => ({ ...s, notes: e.target.value }))} />
              </div>
            </div>
            <div className="submit-area">
              <button className="btn-submit-main" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '⏳ جاري الإرسال...' : '✅ إرسال التقرير الشهري'}
              </button>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="wizard-nav-btns">
          {step > 0 && (
            <button className="wiz-btn-prev" onClick={goPrev}>→ السابق</button>
          )}
          {step < NOTES_STEP && (
            <button className="wiz-btn-next" onClick={goNext}>
              {step === 0 ? 'ابدأ التعبئة ←'
                : step === FORM_SECTIONS.length ? 'الملاحظات والإرسال ←'
                : `التالي: ${FORM_SECTIONS[step]?.title || ''} ←`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
