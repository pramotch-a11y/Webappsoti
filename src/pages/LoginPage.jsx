import { useState } from 'react';
import { api } from '../services/api';
import { isSupabaseConfigured } from '../lib/supabase';
import { supabaseApi } from '../services/supabaseApi';

export function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [roleLevel, setRoleLevel] = useState('STUDENT');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || (isSupabaseConfigured && !loginPassword)) {
      setError(isSupabaseConfigured ? 'กรุณากรอกอีเมลและรหัสผ่าน' : 'กรุณากรอกอีเมล');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isSupabaseConfigured) {
        await supabaseApi.signIn(loginEmail.trim(), loginPassword);
        const profile = await supabaseApi.currentProfile();
        if (!profile) throw new Error('ไม่พบข้อมูลผู้ใช้ใน public.users');
        onLoginSuccess(profile);
      } else {
        const res = await api.login(loginEmail.trim());
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !regEmail.trim() || (isSupabaseConfigured && regPassword.length < 6)) {
      setError(isSupabaseConfigured ? 'กรุณากรอกข้อมูลและรหัสผ่านอย่างน้อย 6 ตัวอักษร' : 'กรุณากรอกชื่อ-นามสกุล และอีเมล');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = isSupabaseConfigured
        ? await supabaseApi.signUp({
            fullName: fullName.trim(),
            email: regEmail.trim(),
            phone: phone.trim(),
            roleLevel,
            password: regPassword
          })
        : await api.register({
            fullName: fullName.trim(),
            email: regEmail.trim(),
            phone: phone.trim(),
            roleLevel
          });

      setSuccess(isSupabaseConfigured ? 'ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ' : 'ลงทะเบียนสำเร็จ กำลังเข้าสู่ระบบ...');
      setTimeout(() => {
        if (!isSupabaseConfigured) onLoginSuccess(res.user);
        else setMode('login');
      }, 1000);
    } catch (err) {
      setError(err.message || 'ลงทะเบียนไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card card">
        <div className="login-header">
          <div className="login-brand">ระบบจองห้อง</div>
          <p className="login-subtitle">ระบบจองห้องประชุม ห้องติว และห้องสัมมนา</p>
        </div>

        {/* Tab switch between Login and Register */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
              setSuccess('');
            }}
          >
            ลงทะเบียนผู้ใช้ใหม่
          </button>
        </div>

        {error && <div className="alert-box error-alert">{error}</div>}
        {success && <div className="alert-box success-alert">{success}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="login-form">
            <label>
              อีเมล
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="เช่น somchai@example.edu"
                required
              />
            </label>

            {isSupabaseConfigured && (
              <label>
                รหัสผ่าน
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน Supabase Auth"
                  required
                />
              </label>
            )}

            <button
              type="submit"
              className="btn-primary login-btn"
              disabled={loading}
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="login-form">
            <label>
              ชื่อ - นามสกุล
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                required
              />
            </label>

            <label>
              อีเมล
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="เช่น name@example.edu"
                required
              />
            </label>

            <label>
              เบอร์โทรศัพท์
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
              />
            </label>

            {isSupabaseConfigured && (
              <label>
                รหัสผ่าน
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  minLength="6"
                  required
                />
              </label>
            )}

            <label>
              ประเภทผู้ใช้งาน
              <select
                value={roleLevel}
                onChange={e => setRoleLevel(e.target.value)}
              >
                <option value="STUDENT">นักศึกษา (STUDENT)</option>
                <option value="TEACHER">อาจารย์ / บุคลากร (TEACHER)</option>
                <option value="STAFF">เจ้าหน้าที่ดูแลห้อง (STAFF)</option>
              </select>
            </label>

            <button
              type="submit"
              className="btn-primary login-btn"
              disabled={loading}
            >
              {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
