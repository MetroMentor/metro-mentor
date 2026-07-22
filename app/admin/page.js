'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({ mentors: 0, hours: 0, pendingCert: 0, openRequests: 0 });
  const [mentors, setMentors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [reports, setReports] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/'); return; }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (!profile || profile.role !== 'admin') { router.push('/'); return; }
    setUser(profile);

    const { data: mentorRows } = await supabase
      .from('profiles')
      .select('id, name, grade, period, mentor_profiles(subjects, days, hours_certified)')
      .eq('role', 'mentor');
    setMentors(mentorRows || []);

    const { count: pendingCert } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'pending-certification');
    const { count: openRequests } = await supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const totalHours = (mentorRows || []).reduce((sum, m) => sum + ((m.mentor_profiles?.[0]?.hours_certified || m.mentor_profiles?.hours_certified) || 0), 0);
    setStats({ mentors: (mentorRows || []).length, hours: totalHours, pendingCert: pendingCert || 0, openRequests: openRequests || 0 });

    const { data: subjectRows } = await supabase.from('subjects').select('id, name');
    setSubjects(subjectRows || []);

    const { data: reportRows } = await supabase.from('reports').select('id, category, description, status, reporter:reporter_id(name)').order('created_at', { ascending: false });
    setReports(reportRows || []);
  }

  async function addSubject(e) {
    e.preventDefault();
    if (!newSubject.trim()) return;
    await supabase.from('subjects').insert({ name: newSubject.trim() });
    setNewSubject('');
    load();
  }

  async function removeSubject(id) {
    await supabase.from('subjects').delete().eq('id', id);
    load();
  }

  async function resolveReport(id) {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (!user) return <div className="container">Loading…</div>;

  return (
    <div>
      <div className="topbar">
        <div style={{ fontWeight: 800 }}>METRO MENTOR</div>
        <div>
          {user.name} <span className="pill" style={{ background: 'var(--gold)', color: '#fff', marginLeft: 8 }}>Admin</span>
          <button className="btn" style={{ marginLeft: 12, background: 'transparent', border: '1px solid #fff' }} onClick={logout}>Log out</button>
        </div>
      </div>
      <div className="container">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[['overview', 'Overview'], ['mentors', 'Mentors'], ['subjects', 'Subjects'], ['reports', 'Reports']].map(([id, label]) => (
            <button key={id} className="btn" style={{ background: tab === id ? 'var(--chalk)' : 'var(--kraft-dark)', color: tab === id ? '#fff' : 'var(--ink-soft)' }} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div>
            <h2>Overview</h2>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 16 }}>
              {[
                [stats.mentors, 'Mentors'],
                [stats.hours.toFixed(1), 'Total certified hours'],
                [stats.pendingCert, 'Sessions awaiting certification'],
                [stats.openRequests, 'Open requests'],
              ].map(([value, label]) => (
                <div key={label} className="card" style={{ minWidth: 140, borderTop: '3px solid var(--chalk)' }}>
                  <div style={{ fontFamily: 'Merriweather', fontSize: 26, fontWeight: 900, color: 'var(--chalk)' }}>{value}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'mentors' && (
          <div>
            <h2>Mentors</h2>
            <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 16 }}>
              Mentors set their own subjects and availability once they sign up. This view is read-only in this starter build —
              ask Claude to add editing here if you want admin to be able to change a mentor's profile directly.
            </div>
            {mentors.map(m => {
              const mp = m.mentor_profiles?.[0] || m.mentor_profiles || {};
              return (
                <div className="card" key={m.id}>
                  <div style={{ fontWeight: 700 }}>{m.name} — {m.grade}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    {(mp.subjects || []).join(' · ')} · Period {m.period} · {(mp.days || []).join(', ')} · {(mp.hours_certified || 0).toFixed(1)} hrs certified
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'subjects' && (
          <div>
            <h2>Subjects</h2>
            <form onSubmit={addSubject} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input placeholder="Subject name" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
              <button className="btn" type="submit">Add subject</button>
            </form>
            {subjects.map(s => (
              <div className="card" key={s.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>{s.name}</div>
                <button className="btn danger" onClick={() => removeSubject(s.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'reports' && (
          <div>
            <h2>Reports</h2>
            {reports.length === 0 && <div style={{ color: 'var(--ink-soft)' }}>No reports filed.</div>}
            {reports.map(r => (
              <div className="card" key={r.id}>
                <div style={{ fontWeight: 700 }}>{r.category} <span className="pill" style={{ marginLeft: 8 }}>{r.status}</span></div>
                <div style={{ fontSize: 13, margin: '6px 0' }}>{r.description}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filed by {r.reporter?.name}</div>
                {r.status === 'open' && <button className="btn gold" style={{ marginTop: 8 }} onClick={() => resolveReport(r.id)}>Mark resolved</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
