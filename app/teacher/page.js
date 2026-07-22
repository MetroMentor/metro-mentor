'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function TeacherDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/'); return; }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (!profile || profile.role !== 'teacher') { router.push('/'); return; }
    setUser(profile);

    const { data: subjectRows } = await supabase.from('subjects').select('name');
    setSubjects((subjectRows || []).map(s => s.name));
    if (subjectRows && subjectRows.length) setSubject(subjectRows[0].name);

    const { data: materialRows } = await supabase.from('materials').select('*').eq('teacher_id', authUser.id).order('created_at', { ascending: false });
    setMaterials(materialRows || []);
  }

  async function upload(e) {
    e.preventDefault();
    if (!title.trim()) return;
    // NOTE: this stores the title/subject only. To actually store the
    // file, wire this up to Supabase Storage — ask Claude to add that
    // when you're ready.
    await supabase.from('materials').insert({ teacher_id: user.id, subject, title });
    setTitle('');
    load();
  }

  async function remove(id) {
    await supabase.from('materials').delete().eq('id', id);
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
          {user.name} <span className="pill" style={{ background: 'var(--gold)', color: '#fff', marginLeft: 8 }}>Teacher</span>
          <button className="btn" style={{ marginLeft: 12, background: 'transparent', border: '1px solid #fff' }} onClick={logout}>Log out</button>
        </div>
      </div>
      <div className="container">
        <h2>Study materials</h2>
        <form onSubmit={upload} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <select value={subject} onChange={e => setSubject(e.target.value)}>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn" type="submit">Post material</button>
        </form>
        {materials.map(m => (
          <div className="card" key={m.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>{m.title} <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>— {m.subject}</span></div>
            <button className="btn danger" onClick={() => remove(m.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
