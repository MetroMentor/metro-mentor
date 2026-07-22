'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [period, setPeriod] = useState('1');
  const [parentEmail, setParentEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [conduct, setConduct] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isStudentOrMentor = role === 'student' || role === 'mentor';
  const isStudent = role === 'student';

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    setLoading(false);
    if (profile) router.push('/' + profile.role);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (isStudent && (!consent || !conduct)) {
      setError('Please agree to both checkboxes to continue.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      name,
      role,
      period: isStudentOrMentor ? parseInt(period) : null,
      parent_email: isStudent ? parentEmail : null,
      consent_given: isStudent ? consent : false,
      conduct_agreed: isStudent ? conduct : false,
    });
    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }
    if (role === 'mentor') {
      await supabase.from('mentor_profiles').insert({ id: data.user.id, subjects: [], days: [] });
    }
    setLoading(false);
    router.push('/' + role);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', borderTop: '5px solid var(--chalk)', boxShadow: '0 20px 45px rgba(20,49,92,0.14)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Merriweather', fontWeight: 900, fontSize: 24, color: 'var(--chalk)' }}>METRO MENTOR</div>
          <div style={{ fontSize: 12, color: 'var(--gold-dark)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Metro High School</div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <button className="btn" style={{ flex: 1, background: mode === 'login' ? 'var(--chalk)' : 'var(--kraft-dark)', color: mode === 'login' ? '#fff' : 'var(--ink-soft)' }} onClick={() => setMode('login')}>Log in</button>
          <button className="btn" style={{ flex: 1, background: mode === 'signup' ? 'var(--chalk)' : 'var(--kraft-dark)', color: mode === 'signup' ? '#fff' : 'var(--ink-soft)' }} onClick={() => setMode('signup')}>Sign up</button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
          {mode === 'signup' && (
            <>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>I am a</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', marginBottom: 12 }}>
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
              {isStudentOrMentor && (
                <>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Study hall period</label>
                  <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: '100%', marginBottom: 12 }}>
                    {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>Period {p}</option>)}
                  </select>
                </>
              )}
              {isStudent && (
                <>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Parent / guardian email</label>
                  <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
                  <div style={{ background: 'var(--kraft-dark)', borderRadius: 6, padding: 12, marginBottom: 12, fontSize: 12.5 }}>
                    <label style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                      My parent or guardian has consented to my participation.
                    </label>
                    <label style={{ display: 'flex', gap: 8 }}>
                      <input type="checkbox" checked={conduct} onChange={e => setConduct(e.target.checked)} />
                      I agree to the code of conduct.
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ width: '100%', marginBottom: 12 }} />

          {error && <div style={{ color: 'var(--gold-dark)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button className="btn gold" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
