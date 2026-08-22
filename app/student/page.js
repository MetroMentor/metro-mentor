'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('find');
  const [subjects, setSubjects] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [toConfirm, setToConfirm] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [overridePeriod, setOverridePeriod] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState({}); // { [sessionId]: { rating, text } }
  const [successIds, setSuccessIds] = useState([]);
  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/'); return; }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (!profile || profile.role !== 'student') { router.push('/'); return; }
    setUser(profile);

    const { data: subjectRows } = await supabase.from('subjects').select('name');
    setSubjects((subjectRows || []).map(s => s.name));

    const { data: mentorRows } = await supabase
      .from('profiles')
      .select('id, name, grade, period, mentor_profiles(subjects, days, hours_certified, accolades)')
      .eq('role', 'mentor');
    setMentors(mentorRows || []);

    const { data: reqRows } = await supabase
      .from('requests')
      .select('id, subject, status, mentor:mentor_id(name)')
      .eq('student_id', authUser.id);
    setMyRequests(reqRows || []);

    const { data: sessionRows } = await supabase
      .from('sessions')
      .select('id, subject, hours, mentor:mentor_id(name)')
      .eq('student_id', authUser.id)
      .eq('status', 'pending-certification');
    setToConfirm(sessionRows || []);
  }

  async function sendRequest(mentorId, subject) {
    await supabase.from('requests').insert({ student_id: user.id, mentor_id: mentorId, subject, status: 'pending' });
    setTab('myrequests');
    load();
  }

  function setDraft(sessionId, field, value) {
    setReviewDrafts(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], [field]: value } }));
  }

  async function confirmSession(sessionId) {
    const draft = reviewDrafts[sessionId] || {};
    const rating = draft.rating || 5;
    const feedback = draft.text || '';
    const student_name = draft.includeName ? user.name : ''; // Updated line
    await supabase.from('sessions').update({ status: 'pending-certification', rating, feedback, student_name }).eq('id', sessionId);
    
    setSuccessIds(prev => [...prev, sessionId]);
    setTimeout(() => {
      load();
    }, 1200);
  }

  async function disputeSession(sessionId) {
    await supabase.from('sessions').update({ status: 'disputed' }).eq('id', sessionId);
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (!user) return <div className="container">Loading…</div>;

  const filteredMentors = mentors.filter(m => {
    const subjectsList = m.mentor_profiles?.[0]?.subjects || m.mentor_profiles?.subjects || [];
    const subjectOk = subjectFilter === 'all' || subjectsList.includes(subjectFilter);
    const periodOk = overridePeriod || m.period === user.period;
    return subjectOk && periodOk;
  });

  return (
    <div>
      <div className="topbar">
        <div style={{ fontWeight: 800 }}>METRO MENTOR</div>
        <div>
          {user.name} <span className="pill" style={{ background: 'var(--gold)', color: '#fff', marginLeft: 8 }}>Student · P{user.period}</span>
          <button className="btn" style={{ marginLeft: 12, background: 'transparent', border: '1px solid #fff' }} onClick={logout}>Log out</button>
        </div>
      </div>
      <div className="container">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            ['find', 'Find a mentor'],
            ['myrequests', 'My requests'],
            ['confirm', 'Confirm sessions'],
          ].map(([id, label]) => (
            <button key={id} className="btn" style={{ background: tab === id ? 'var(--chalk)' : 'var(--kraft-dark)', color: tab === id ? '#fff' : 'var(--ink-soft)' }} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === 'find' && (
          <div>
            <h2>Find a mentor</h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
                <option value="all">All subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={overridePeriod} onChange={e => setOverridePeriod(e.target.checked)} />
                Show mentors outside my study hall (Period {user.period})
              </label>
            </div>
            {filteredMentors.length === 0 && <div style={{ color: 'var(--ink-soft)' }}>No mentors match right now.</div>}
            {filteredMentors.map(m => {
              const mp = m.mentor_profiles?.[0] || m.mentor_profiles || {};
              return (
                <div className="card" key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      <Link href={`/student/mentor/${m.name.toLowerCase().replace(/ /g, '-')}`} style={{ color: 'var(--chalk)', textDecoration: 'underline' }}>{m.name}</Link>
                      <span style={{ fontWeight: 400, fontSize: 12.5, color: 'var(--ink-soft)' }}> — {m.grade}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{(mp.subjects || []).join(' · ')} · Period {m.period} · {(mp.days || []).join(', ')}</div>
                    {(mp.accolades || []).length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--gold-dark)', marginTop: 3 }}>{(mp.accolades || []).join(' · ')}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/student/mentor/${m.name.toLowerCase().replace(/ /g, '-')}`} className="btn" style={{ background: 'var(--kraft-dark)', color: 'var(--ink-soft)', textDecoration: 'none' }}>View profile</Link>
                    <button className="btn" onClick={() => sendRequest(m.id, (mp.subjects || [])[0] || subjects[0])}>Request</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'myrequests' && (
          <div>
            <h2>My requests</h2>
            {myRequests.length === 0 && <div style={{ color: 'var(--ink-soft)' }}>No requests yet.</div>}
            {myRequests.map(r => (
              <div className="card" key={r.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>{r.mentor?.name} — {r.subject}</div>
                <span className="pill">{r.status}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'confirm' && (
          <div>
            <h2>Confirm sessions</h2>
            {toConfirm.length === 0 && <div style={{ color: 'var(--ink-soft)' }}>Nothing waiting on your confirmation.</div>}
            {toConfirm.map(s => {
              const draft = reviewDrafts[s.id] || {};
              const isSuccess = successIds.includes(s.id);
              return (
                <div className="card" key={s.id}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{s.mentor?.name} — {s.subject}, {s.hours} hrs</div>
                  {isSuccess ? (
                    <div style={{ color: 'var(--gold)', fontWeight: 600, padding: '10px 0' }}>
                      ✓ Review sent! Forwarded to staff for certification.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        {[1,2,3,4,5].map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setDraft(s.id, 'rating', r)}
                            className="btn"
                            style={{
                              background: (draft.rating || 5) >= r ? 'var(--gold)' : 'var(--kraft-dark)',
                              color: (draft.rating || 5) >= r ? '#fff' : 'var(--ink-soft)',
                              padding: '6px 10px',
                            }}
                          >★</button>
                        ))}
                      </div>
                    <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, cursor: 'pointer', fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={draft.includeName || false}
                        onChange={e => setDraft(s.id, 'includeName', e.target.checked)}
                      />
                      Include my name (<span style={{ fontWeight: 700, textDecoration: 'underline' }}>{user.name}</span>) publicly on this mentor's profile
                    </label>

                    <textarea
                      placeholder="Write a short review (optional) — what did this session help with?"
                      value={draft.text || ''}
                      onChange={e => setDraft(s.id, 'text', e.target.value)}
                      style={{ width: '100%', minHeight: 60, marginBottom: 10 }}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn gold" onClick={() => confirmSession(s.id)}>Confirm session</button>
                      <button className="btn danger" onClick={() => disputeSession(s.id)}>Dispute</button>
                    </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
