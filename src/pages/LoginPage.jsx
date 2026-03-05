import { useState } from 'react';

const MANAGER_NAME = import.meta.env.VITE_MANAGER_NAME;
const MANAGER_PASS = import.meta.env.VITE_MANAGER_PASS;

export default function LoginPage({ onLogin, onBack }) {
  const [name, setName]   = useState('');
  const [pass, setPass]   = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      if (name.trim().toLowerCase() === MANAGER_NAME && pass === MANAGER_PASS) {
        onLogin();
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
      }
    }, 600);
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-badge">DADA GROUP</div>
          <h1 className="login-title">دخول المدير</h1>
          <p className="login-sub">لوحة تحليل السوق الشهري</p>
        </div>

        <div className="login-divider" />

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>اسم المستخدم</label>
            <input
              className="login-input"
              type="text"
              placeholder="أدخل اسم المستخدم"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label>كلمة المرور</label>
            <input
              className="login-input"
              type="password"
              placeholder="أدخل كلمة المرور"
              value={pass}
              onChange={e => setPass(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? '⏳ جاري التحقق...' : '🔐 دخول'}
          </button>
        </form>

        <div className="login-back">
          <button onClick={onBack}>← العودة للصفحة الرئيسية</button>
        </div>
      </div>
    </div>
  );
}