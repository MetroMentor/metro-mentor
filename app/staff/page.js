'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function StaffDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [pending, setPending] = useState([]);
  const [disputed, setDisputed] = useState([]);
  const [certified, setCertified] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/'); return; }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (!profile || profile.role !== 'staff') { router.push('/'); return; }
    setUser(profile);

    const { data: pendingRows } = await supabase
      .from('sessions')
      .select('id, subject, hours, rating, feedback, mentor_id, student_id, mentor:mentor_id(name), student:student_id(name)')
      .eq('status', 'pending-certification');
    setPending(pendingRows || []); // <-- This is the missing piece!
  
    const { data: disputedRows } = await supabase
      .from('sessions')
      .select('id, subject, hours, mentor:mentor_id(name), student:student_id(name)')
      .eq('status', 'disputed');
    setDisputed(disputedRows || []);

    const { data: certifiedRows } = await supabase
      .from('sessions')
      .select('id, subject, hours, mentor:mentor_id(name), student:student_id(name)')
      .eq('status', 'certified')
      .order('created_at', { ascending: false })
      .limit(20);
    setCertified(certifiedRows || []);
  }

  async function certify(session) {
    await supabase.from('sessions').update({ status: 'certified' }).eq('id', session.id);

    // bump the mentor's certified hour total
    const { data: mp } = await supabase.from('mentor_profiles').select('hours_certified').eq('id', session.mentor_id).single();
    if (mp) {
      await supabase.from('mentor_profiles').update({ hours_certified: (mp.hours_certified || 0) + session.hours }).eq('id', session.mentor_id);
    }

    // save the full review — rating, written text, who left it, what subject
    if (session.rating) {
      await supabase.from('mentor_ratings').insert({
        mentor_id: session.mentor_id,
        student_id: session.student_id,
        subject: session.subject,
        rating: session.rating,
        review_text: session.feedback || null,
      });
    }
    load();
  }

  async function resendForConfirmation(id) {
    await supabase.from('sessions').update({ status: 'awaiting-confirmation' }).eq('id', id);
    load();
  }

  async function removeSession(id) {
    await supabase.from('sessions').delete().eq('id', id);
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
          {user.name} <span className="pill" style={{ background: 'var(--gold)', color: '#fff', marginLeft: 8 }}>Staff</span>
          <button className="btn" style={{ marginLeft: 12, background: 'transparent', border: '1px solid #fff' }} onClick={logout}>Log out</button>
        </div>
      </div>
      <div className="container">
        <h2>Pending certifications</h2>
        {pending.length === 0 && <div style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>Nothing waiting on certification.</div>}
        {pending.map(s => (
          <div className="card" key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div>{s.mentor?.name} → {s.student?.name} — {s.subject}, {s.hours} hrs {s.rating ? `· ${s.rating}★` : ''}</div>
              {s.feedback && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>"{s.feedback}"</div>}
            </div>
            <button className="btn gold" onClick={() => certify(s)}>Certify</button>
          </div>
        ))}

        <h2 style={{ marginTop: 32 }}>Disputed sessions</h2>
        {disputed.length === 0 && <div style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>No disputes right now.</div>}
        {disputed.map(s => (
          <div className="card" key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>{s.mentor?.name} & {s.student?.name} — {s.subject}, {s.hours} hrs</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => resendForConfirmation(s.id)}>Send back for confirmation</button>
              <button className="btn danger" onClick={() => removeSession(s.id)}>Remove</button>
            </div>
          </div>
        ))}

        <h2 style={{ marginTop: 32 }}>Recently certified</h2>
        {certified.map(s => (
          <div className="card" key={s.id}>{s.mentor?.name} → {s.student?.name} — {s.subject}, {s.hours} hrs</div>
        ))}
      </div>
    </div>
  );
}
