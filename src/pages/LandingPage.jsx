export default function LandingPage({ onSelect }) {
  return (
    <div className="landing-root">
      <div className="landing-grid-bg" />

      <div className="landing-logo-wrap">
        <div className="landing-logo-badge">DADA GROUP</div>
        <h1 className="landing-title">
          مجموعة <span>الدادا</span>
        </h1>
        <div className="landing-divider" />
        <p className="landing-subtitle">منصة تحليل الحصة السوقية — الأردن</p>
      </div>

      <div className="landing-cards">
        <button className="role-card" onClick={() => onSelect('rep')}>
          <span className="role-card-icon">📋</span>
          <div className="role-card-title">مندوب المبيعات</div>
          <div className="role-card-sub">
            تعبئة تقرير الزيارة الشهري<br />وأسعار المنافسين في المحل
          </div>
          <div className="role-card-arrow">←</div>
        </button>

        <button className="role-card" onClick={() => onSelect('manager')}>
          <span className="role-card-icon">📊</span>
          <div className="role-card-title">المدير</div>
          <div className="role-card-sub">
            لوحة تحكم شاملة لعرض<br />نتائج جميع التقارير
          </div>
          <div className="role-card-arrow">←</div>
        </button>
      </div>

      <div className="landing-footer">
        © {new Date().getFullYear()} مجموعة الدادا — beko &amp; Ariston Jordan
      </div>
    </div>
  );
}