import { useState } from 'react';
import LandingPage   from './pages/LandingPage.jsx';
import LoginPage     from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import FormPage      from './pages/FormPage.jsx';

import './App.css'

export default function App() {
  const [screen, setScreen] = useState('landing');

  function handleRoleSelect(role) {
    if (role === 'rep')     setScreen('form');
    if (role === 'manager') setScreen('login');
  }

  function handleLogin() { setScreen('dashboard'); }
  function goHome()       { setScreen('landing'); }

  return (
    <>
      {screen === 'landing'   && <LandingPage   onSelect={handleRoleSelect} />}
      {screen === 'login'     && <LoginPage      onLogin={handleLogin} onBack={goHome} />}
      {screen === 'dashboard' && <DashboardPage  onBack={goHome} />}
      {screen === 'form'      && <FormPage        onBack={goHome} />}
    </>
  );
}