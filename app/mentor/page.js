'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function MentorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [mySessions, setMySessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('1');
  const [recurring, setRecurring] = useState(false);

  // My Profile tab state
  const [myProfile, setMyProfile] = useState(null);
  const [mySubjects, setMySubjects] = useState([]);
  const [myDays, setMyDays] = useState([]);
  const [bio, setBio] = useState('');
  const [accoladeInput, setAccoladeInput] = useState('');
  const [accolades, setAccolades] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/'); return; }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (!profile || profile.role !== 'mentor') { router.push('/'); return; }
    setUser(profile);

    const { data: subjectRows } = await supabase.from('subjects').select('name');
    setSubjects((subjectRows || []).map(s => s.name));
    if (subjectRows && subjectRows.length) setSubject(subjectRows[0].name);

    const { data: reqRows } = await supabase
      .from('requests')
      .select('id, subject, status, student:student_id(name)')
      .eq('mentor_id', authUser.id)
      .eq('status', 'pending');
    setRequests(reqRows || []);

    const { data: sessionRows } = await supabase
      .from('sessions')
      .select('id, subject, hours, status, feedback, rating, student:student_id(name)')
      .eq('mentor_id', authUser.id)
      .order('created_at', { ascending: false });
    setMySessions(sessionRows || []);

    const { data: mp } = await supabase.from('mentor_profiles').select('*').eq('id', authUser.id).single();
    setMyProfile(mp);
    setMySubjects(mp?.subjects || []);
    setMyDays(mp?.days || []);
    setBio(mp?.bio || '');
    setAccolades(mp?.accolades || []);
  }

  async function respond(requestId, status) {
    await supabase.from('requests').update({ status }).eq('id', requestId);
    load();
  }

  async function logSession(e) {
    e.preventDefault();
    const { data: studentRows } = await supabase
      .from('profiles')
      .select('id')
      .ilike('name', studentName)
      .eq('role', 'student')
      .limit(1);
    if (!studentRows || studentRows.length === 0) {
      alert('No student found with that exact name. Try matching their name exactly.');
      return;
    }
    await supabase.from('sessions').insert({
      mentor_id: user.id,
      student_id: studentRows[0].id,
      subject,
      hours: parseFloat(hours),
      recurring,
      status: 'awaiting-confirmation',
    });
    setStudentName('');
    load();
  }

  function toggleSubject(s) {
    setMySubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function toggleDay(d) {
    setMyDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function addAccolade() {
    if (!accoladeInput.trim()) return;
    setAccolades(prev => [...prev, accoladeInput.trim()]);
    setAccoladeInput('');
  }

  function removeAccolade(i) {
    setAccolades(prev => prev.filter((_, idx) => idx !== i));
  }

  async function saveProfile() {
    setSavingProfile(true);
    await supabase.from('mentor_profiles').update({
      subjects: mySubjects,
      days: myDays,
      bio,
      accolades,
    }).eq('id', user.id);
    setSavingProfile(false);
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (!user) return <div className="container">Loading…</div>;

  return (
    <div>
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800 }}>METRO MENTOR</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            {user.name} <span className="pill" style={{ background: 'var(--gold)', color: '#fff', marginLeft: 8 }}>Mentor · P{user.period}</span>
          </div>
          <button 
            className="btn" 
            style={{ background: 'var(--gold)', border: 'none', color: '#fff' }} 
            onClick={() => {
              const myUrlName = user.name.toLowerCase().replace(/ /g, '-');
              router.push(`/student/mentor/${myUrlName}`);
            }}
          >
            My Profile
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid #fff' }} onClick={logout}>Log out</button>
        </div>
      </div>
      <div className="container">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[['requests', 'Requests'], ['log', 'Log a session'], ['profile', 'Edit Profile']].map(([id, label]) => (
            <button key={id} className="btn" style={{ background: tab === id ? 'var(--chalk)' : 'var(--kraft-dark)', color: tab === id ? '#fff' : 'var(--ink-soft)' }} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === 'requests' && (
          <div>
            <h2>Incoming requests</h2>
            {requests.length === 0 && <div style={{ color: 'var(--ink-soft)' }}>No pending requests.</div>}
            {requests.map(r => (
              <div className="card" key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>{r.student?.name} — {r.subject}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => respond(r.id, 'accepted')}>Accept</button>
                  <button className="btn danger" onClick={() => respond(r.id, 'declined')}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'log' && (
          <div>
            <h2>Log a session</h2>
            <form onSubmit={logSession} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
              <input placeholder="Student's exact name" value={studentName} onChange={e => setStudentName(e.target.value)} required />
              <select value={subject} onChange={e => setSubject(e.target.value)}>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" min="0.5" step="0.5" value={hours} onChange={e => setHours(e.target.value)} style={{ width: 80 }} />
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
                Weekly standing session
              </label>
              <button className="btn" type="submit">Log session</button>
            </form>
            <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 12 }}>
              The student confirms this — with a rating and optional written review — before staff can certify the hours.
            </div>
            {mySessions.map(s => (
              <div className="card" key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>{s.student?.name} — {s.subject}, {s.hours} hrs {s.rating ? `· ${s.rating}★` : ''}</div>
                  <span className="pill">{s.status}</span>
                </div>
                {s.feedback && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6 }}>"{s.feedback}"</div>}
              </div>
            ))}
          </div>
        )}

        {tab === 'profile' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2>Edit Profile</h2>
              <button 
                className="btn" 
                style={{ background: 'var(--kraft-dark)', color: 'var(--ink-soft)' }}
                onClick={() => {
                  const myUrlName = user.name.toLowerCase().replace(/ /g, '-');
                  router.push(`/student/mentor/${myUrlName}`);
                }}
              >
                Preview Public Profile ↗
              </button>
            </div>
            <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 16 }}>
              This is what students see on your public profile page.
            </div>

            <div className="card">
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Subjects you tutor</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {subjects.map(s => (
                  <button key={s} type="button" className="btn" style={{ background: mySubjects.includes(s) ? 'var(--chalk)' : 'var(--kraft-dark)', color: mySubjects.includes(s) ? '#fff' : 'var(--ink-soft)' }} onClick={() => toggleSubject(s)}>{s}</button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Days you're available (during your study hall)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {['Mon','Tue','Wed','Thu','Fri'].map(d => (
                  <button key={d} type="button" className="btn" style={{ background: myDays.includes(d) ? 'var(--chalk)' : 'var(--kraft-dark)', color: myDays.includes(d) ? '#fff' : 'var(--ink-soft)' }} onClick={() => toggleDay(d)}>{d}</button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Short bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A sentence or two about how you tutor, what you're strong in, etc." style={{ width: '100%', minHeight: 70, marginBottom: 16 }} />

              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Accolades</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input placeholder="e.g. AP Scholar, Math Team Captain" value={accoladeInput} onChange={e => setAccoladeInput(e.target.value)} style={{ flex: 1 }} />
                <button type="button" className="btn" onClick={addAccolade}>Add</button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {accolades.map((a, i) => (
                  <span key={i} className="pill" style={{ background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {a} <span style={{ cursor: 'pointer' }} onClick={() => removeAccolade(i)}>✕</span>
                  </span>
                ))}
              </div>

              <button className="btn gold" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
