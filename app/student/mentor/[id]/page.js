'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function MentorProfile() {
  const router = useRouter();
  const params = useParams();
  const [viewer, setViewer] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/'); return; }
    const { data: viewerProfile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    setViewer(viewerProfile);

    const { data: mentorRow } = await supabase
      .from('profiles')
      .select('id, name, grade, period, mentor_profiles(subjects, days, hours_certified, accolades, bio)')
      .eq('id', params.id)
      .single();
    setMentor(mentorRow);

    const { data: reviewRows } = await supabase
      .from('mentor_ratings')
      .select('rating, review_text, subject, created_at, student:student_id(name)')
      .eq('mentor_id', params.id)
      .order('created_at', { ascending: false });
    setReviews(reviewRows || []);
  }

  async function sendRequest(subject) {
    await supabase.from('requests').insert({ student_id: viewer.id, mentor_id: mentor.id, subject, status: 'pending' });
    router.push('/student');
  }

  if (!mentor) return <div className="container">Loading…</div>;

  const mp = mentor.mentor_profiles?.[0] || mentor.mentor_profiles || {};
  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div>
      <div className="topbar">
        <div style={{ fontWeight: 800 }}>METRO MENTOR</div>
        <button className="btn" style={{ background: 'transparent', border: '1px solid #fff' }} onClick={() => router.push('/student')}>Back</button>
      </div>
      <div className="container">
        <div className="card" style={{ borderLeft: '3px solid var(--chalk)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>{mentor.name}</h2>
              <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{mentor.grade} · Period {mentor.period}</div>
              {mp.bio && <p style={{ marginTop: 12, fontSize: 14, maxWidth: 480 }}>{mp.bio}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Merriweather', fontSize: 30, fontWeight: 900, color: 'var(--chalk)' }}>
                {avgRating ? `★ ${avgRating}` : 'No ratings yet'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{reviews.length} review{reviews.length === 1 ? '' : 's'}</div>
              <div style={{ fontFamily: 'Merriweather', fontSize: 22, fontWeight: 900, color: 'var(--gold-dark)', marginTop: 10 }}>
                {(mp.hours_certified || 0).toFixed(1)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>hours certified</div>
            </div>
          </div>

          {(mp.accolades || []).length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {mp.accolades.map((a, i) => (
                <span key={i} className="pill" style={{ background: 'var(--gold)', color: '#fff' }}>{a}</span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 6 }}>Good at</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(mp.subjects || []).map(s => (
                <button key={s} className="btn" onClick={() => sendRequest(s)}>{s} — Request</button>
              ))}
            </div>
          </div>
        </div>

        <h2>Reviews</h2>
        {reviews.length === 0 && <div style={{ color: 'var(--ink-soft)' }}>No reviews yet — be the first to leave one after a session.</div>}
        {reviews.map((r, i) => (
          <div className="card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} <span style={{ fontWeight: 400, fontSize: 12.5, color: 'var(--ink-soft)' }}>— {r.subject}</span></div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{r.student?.name}</div>
            </div>
            {r.review_text && <p style={{ fontSize: 13.5, marginTop: 6 }}>{r.review_text}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
