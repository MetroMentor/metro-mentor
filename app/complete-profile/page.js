'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function CompleteProfile() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [period, setPeriod] = useState('1');
  const [parentEmail, setParentEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [conduct, setConduct] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isStudentOrMentor = role === 'student' || role === 'mentor';
  const isStudent = role === 'student';

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      // If this person already has a profile (not their first time),
      // skip straight to their dashboard instead of asking again.
      const { data: existing } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (existing) { router.push('/' + existing.role); return; }

      setAuthUser(user);
      setName(user.user_metadata?.full_name || user.user_metadata?.name || '');
      setChecking(false);
    })();
  }, []);

  async function finishSignup(e) {
    e.preventDefault();
    setError('');
    if (isStudent && (!consent || !conduct)) {
      setError('Please agree to both checkboxes to continue.');
      return;
    }
    setLoading(true);
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.id,
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
      await supabase.from('mentor_profiles').insert({ id: authUser.id, subjects: [], days: [] });
    }
    setLoading(false);
    router.push('/' + role);
  }

  if (checking) return <div className="container">Loading…</div>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', borderTop: '5px solid var(--chalk)', boxShadow: '0 20px 45px rgba(20,49,92,0.14)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Merriweather', fontWeight: 900, fontSize: 20, color: 'var(--chalk)' }}>Almost there</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6 }}>Signed in with Microsoft as {authUser?.email}. Just a couple more details.</div>
        </div>

        <form onSubmit={finishSignup}>
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

          {error && <div style={{ color: 'var(--gold-dark)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button className="btn gold" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Please wait…' : 'Finish signing up'}
          </button>
        </form>
      </div>
    </div>
  );
}
