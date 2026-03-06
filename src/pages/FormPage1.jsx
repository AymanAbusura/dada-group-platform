import { useState, useRef, useCallback } from 'react';
import { FORM_SECTIONS } from '../utils/formData.js';
import { submitReport } from '../utils/supabase.js';
import logoLight from "../assets/logo-light.svg";

// ── Product Card ────────────────────────────────────────────
function ProductCard({ product, formState, onChange }) {
  const { id, brand, model, existsName, competitors } = product;
  const existsVal = formState[existsName] || 'no';

  function setExists(val) {
    onChange(existsName, val);
  }

  function setPrice(name, val) {
    onChange(name, val);
  }

  function setAvail(name, checked) {
    onChange(name, checked ? '1' : '');
  }

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
        {/* Availability radio */}
        <div className="avail-radio-row">
          <span className="avail-radio-label">هل الموديل متوفر في المحل؟</span>
          <div className="radio-group">
            <label className={`radio-option${existsVal === 'yes' ? ' is-yes' : ''}`}>
              <input type="radio" value="yes" checked={existsVal === 'yes'} onChange={() => setExists('yes')} />
              <span className="radio-dot" />
              نعم ✓
            </label>
            <label className={`radio-option${existsVal === 'no' ? ' is-no' : ''}`}>
              <input type="radio" value="no" checked={existsVal === 'no'} onChange={() => setExists('no')} />
              <span className="radio-dot" />
              لا ✗
            </label>
          </div>
        </div>

        {/* Competitor table */}
        {competitors.length > 0 && (
          <>
            <div className="comp-table-header">المنافسون من السوق — أدخل سعر البيع الفعلي</div>
            <div className="comp-scroll">
              <table className="comp-table">
                <thead>
                  <tr>
                    <th>الماركة</th>
                    <th>الموديل</th>
                    <th>السعر المرجعي</th>
                    <th>سعر البيع الفعلي بالمحل</th>
                    <th>متوفر؟</th>
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
                          <input
                            type="number"
                            className="price-input"
                            name={c.priceName}
                            placeholder="—"
                            min="0"
                            step="0.5"
                            value={formState[c.priceName] || ''}
                            onChange={e => setPrice(c.priceName, e.target.value)}
                          />
                          <span className="price-jd">JD</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="avail-toggle-wrap">
                          <input
                            type="checkbox"
                            name={c.availName}
                            checked={formState[c.availName] === '1'}
                            onChange={e => setAvail(c.availName, e.target.checked)}
                          />
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
export default function FormPage({ onBack }) {
  const [meta, setMeta]         = useState({ rep_name: '', month: '', shop_name: '', area: '' });
  const [formState, setFormState] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress]   = useState(0);
  const formRef = useRef(null);

  // Compute progress based on meta fields filled
  function updateProgress(newMeta) {
    const fields = Object.values(newMeta);
    const filled = fields.filter(v => v && v !== '').length;
    setProgress(Math.round((filled / fields.length) * 100));
  }

  function handleMetaChange(field, val) {
    const updated = { ...meta, [field]: val };
    setMeta(updated);
    updateProgress(updated);
  }

  function handleFieldChange(name, val) {
    setFormState(s => ({ ...s, [name]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!meta.rep_name || !meta.month || !meta.shop_name || !meta.area) {
      alert('يرجى تعبئة جميع الحقول الأساسية: اسم المندوب، الشهر، اسم المحل، المنطقة');
      return;
    }

    setSubmitting(true);
    const allData = { ...meta, ...formState };

    const record = {
      rep_name:   meta.rep_name,
      month:      meta.month,
      shop_name:  meta.shop_name,
      area:       meta.area,
      display:        formState['display']         || '',
      recommendation: formState['recommendation']  || '',
      notes:          formState['notes']           || '',
      form_data:  allData,
    };

    try {
      await submitReport(record);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('❌ حدث خطأ أثناء الإرسال:\n' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setMeta({ rep_name: '', month: '', shop_name: '', area: '' });
    setFormState({});
    setSubmitted(false);
    setProgress(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (submitted) {
    return (
      <div>
        <div className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <div className="landing-logo">
                <img 
                  src={logoLight}
                  alt="DADA GROUP Logo"
                  className="landing-logo-image"
                />
              </div>
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
    <div>
      {/* Topbar with progress */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <div className="landing-logo">
              <img 
                src={logoLight}
                alt="DADA GROUP Logo"
                className="landing-logo-image"
              />
            </div>
            <div className="topbar-title">
              <h1>📊 تحليل الحصة السوقية الشهري</h1>
              <p>لكل موديل beko / Ariston — سعر المنافس الفعلي في المحل</p>
            </div>
          </div>
          <button className="topbar-btn" onClick={onBack}>← الرئيسية</button>
        </div>
        <div className="topbar-progress">
          <div className="topbar-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Sticky info bar */}
      <div className="form-info-bar">
        <div className="form-info-field">
          <label>👤 اسم المندوب *</label>
          <input
            type="text"
            placeholder="اكتب اسمك"
            value={meta.rep_name}
            onChange={e => handleMetaChange('rep_name', e.target.value)}
            required
          />
        </div>
        <div className="form-info-field">
          <label>📅 الشهر *</label>
          <select value={meta.month} onChange={e => handleMetaChange('month', e.target.value)} required>
            <option value="">-- الشهر --</option>
            {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="form-info-field">
          <label>🏪 اسم المحل *</label>
          <input
            type="text"
            placeholder="اسم المحل"
            value={meta.shop_name}
            onChange={e => handleMetaChange('shop_name', e.target.value)}
            required
          />
        </div>
        <div className="form-info-field">
          <label>📍 المنطقة *</label>
          <select value={meta.area} onChange={e => handleMetaChange('area', e.target.value)} required>
            <option value="">-- المنطقة --</option>
            {['عمان','اربد','الزرقاء','السلط','مادبا','جرش','عجلون','المفرق','الرمثا','الكرك','الطفيلة','معان','غور الأردن'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Form body */}
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="form-body">

          {FORM_SECTIONS.map((section, si) => (
            <div key={si} className="form-section" style={{ animationDelay: `${si * 60}ms` }}>
              <div className="form-section-header">
                <span className="section-icon">{section.icon}</span>
                <div>
                  <div className="section-title">{section.title}</div>
                  <div className="section-sub">{section.sub}</div>
                </div>
                <div className="section-count">{section.products.length} منتج</div>
              </div>
              <div className="form-section-body">
                {section.products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    formState={formState}
                    onChange={handleFieldChange}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div className="notes-card">
            <div className="notes-title">📝 ملاحظات عامة</div>
            <div className="notes-grid">
              <div className="form-field">
                <label>هل المحل يعرض beko/Ariston بشكل واضح؟</label>
                <select
                  value={formState['display'] || ''}
                  onChange={e => handleFieldChange('display', e.target.value)}
                >
                  <option value="">-- اختر --</option>
                  <option>نعم، بمكان بارز</option>
                  <option>عادي</option>
                  <option>لا، مخفي</option>
                  <option>غير معروض</option>
                </select>
              </div>
              <div className="form-field">
                <label>هل البائع يوصي بـ beko/Ariston؟</label>
                <select
                  value={formState['recommendation'] || ''}
                  onChange={e => handleFieldChange('recommendation', e.target.value)}
                >
                  <option value="">-- اختر --</option>
                  <option>دائماً</option>
                  <option>أحياناً</option>
                  <option>نادراً</option>
                  <option>لا</option>
                </select>
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 12 }}>
              <label>ملاحظات إضافية</label>
              <textarea
                placeholder="أي معلومات مفيدة عن المحل أو السوق..."
                value={formState['notes'] || ''}
                onChange={e => handleFieldChange('notes', e.target.value)}
              />
            </div>
          </div>

          <div className="submit-area">
            <button type="submit" className="btn-submit-main" disabled={submitting}>
              {submitting ? '⏳ جاري الإرسال...' : '✅ إرسال التقرير الشهري'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}