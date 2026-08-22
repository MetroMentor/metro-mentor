'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function PublicMentorProfile() {
  const router = useRouter();
  const params = useParams();

  const [mentor, setMentor] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);

  // Edit Profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [mySubjects, setMySubjects] = useState([]);
  const [myDays, setMyDays] = useState([]);
  const [bio, setBio] = useState('');
  const [accoladeInput, setAccoladeInput] = useState('');
  const [accolades, setAccolades] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    load();
  }, [params.id]);

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      setViewer(profile);
    }

    const { data: subjectRows } = await supabase.from('subjects').select('name');
    setAllSubjects((subjectRows || []).map(s => s.name));

    const nameFromUrl = decodeURIComponent(params.id).replace(/-/g, ' ');

    const { data: mentorRow, error } = await supabase
      .from('profiles')
      .select('id, name, grade, period, mentor_profiles(subjects, days, hours_certified, accolades, bio)')
      .ilike('name', nameFromUrl)
      .eq('role', 'mentor')
      .limit(1)
      .single();

    if (error || !mentorRow) {
      setMentor('NOT_FOUND');
    } else {
      setMentor(mentorRow);
    }
  }

  function openEditModal() {
    const mp = mentor?.mentor_profiles || {};
    setMySubjects(mp.subjects || []);
    setMyDays(mp.days || []);
    setBio(mp.bio || '');
    setAccolades(mp.accolades || []);
    setIsEditOpen(true);
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
    }).eq('id', viewer.id);
    
    setSavingProfile(false);
    setIsEditOpen(false);
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (mentor === 'NOT_FOUND') return <div className="container" style={{ marginTop: '2rem' }}>Mentor not found.</div>;
  if (!mentor) return <div className="container">Loading…</div>;

  const mp = mentor.mentor_profiles || {};

  return (
    <div>
      {/* Topbar */}
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800 }}>METRO MENTOR</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {viewer && (
            <div>
              {viewer.name} <span className="pill" style={{ background: 'var(--gold)', color: '#fff', marginLeft: 8 }}>{viewer.role === 'mentor' ? `Mentor · P${viewer.period}` : `Student · P${viewer.period}`}</span>
            </div>
          )}

          <button 
            className="btn" 
            style={{ background: 'transparent', border: '1px solid #fff' }} 
            onClick={() => router.back()}
          >
            Back
          </button>

          <button className="btn" style={{ background: 'transparent', border: '1px solid #fff' }} onClick={logout}>Log out</button>
        </div>
      </div>

      {/* Main Profile View */}
      <div className="container" style={{ marginTop: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h2>{mentor.name}</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Prominent Edit Profile Button in Profile Header */}
              {viewer && viewer.id === mentor.id && (
                <button 
                  className="btn" 
                  style={{ background: 'var(--gold)', border: 'none', color: '#fff', fontWeight: 600 }} 
                  onClick={openEditModal}
                >
                  Edit Profile
                </button>
              )}
              <span className="pill" style={{ background: 'var(--gold)', color: '#fff' }}>Period {mentor.period}</span>
            </div>
          </div>

          <p style={{ marginTop: 12 }}>{mp.bio || 'No bio provided yet.'}</p>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Subjects</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(mp.subjects || []).map(s => (
                <span key={s} className="pill" style={{ background: 'var(--chalk)', color: '#fff' }}>{s}</span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Available Days</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(mp.days || []).map(d => (
                <span key={d} className="pill" style={{ background: 'var(--kraft-dark)', color: 'var(--ink-soft)' }}>{d}</span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Accolades</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(mp.accolades || []).map((a, i) => (
                <span key={i} className="pill" style={{ background: 'var(--gold)', color: '#fff' }}>{a}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal Popup */}
      {isEditOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
        }}>
          <div className="card" style={{ maxWidth: 550, width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Edit Profile</h2>
              <button className="btn" style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer' }} onClick={() => setIsEditOpen(false)}>✕</button>
            </div>

            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Subjects you tutor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {allSubjects.map(s => (
                <button 
                  key={s} 
                  type="button" 
                  className="btn" 
                  style={{ background: mySubjects.includes(s) ? 'var(--chalk)' : 'var(--kraft-dark)', color: mySubjects.includes(s) ? '#fff' : 'var(--ink-soft)' }} 
                  onClick={() => toggleSubject(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Days you're available (during your study hall)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {['Mon','Tue','Wed','Thu','Fri'].map(d => (
                <button 
                  key={d} 
                  type="button" 
                  className="btn" 
                  style={{ background: myDays.includes(d) ? 'var(--chalk)' : 'var(--kraft-dark)', color: myDays.includes(d) ? '#fff' : 'var(--ink-soft)' }} 
                  onClick={() => toggleDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Short bio</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              placeholder="A sentence or two about how you tutor, what you're strong in, etc." 
              style={{ width: '100%', minHeight: 70, marginBottom: 16 }} 
            />

            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>Accolades</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input 
                placeholder="e.g. AP Scholar, Math Team Captain" 
                value={accoladeInput} 
                onChange={e => setAccoladeInput(e.target.value)} 
                style={{ flex: 1 }} 
              />
              <button type="button" className="btn" onClick={addAccolade}>Add</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {accolades.map((a, i) => (
                <span key={i} className="pill" style={{ background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {a} <span style={{ cursor: 'pointer' }} onClick={() => removeAccolade(i)}>✕</span>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: 'transparent', border: '1px solid #ccc' }} onClick={() => setIsEditOpen(false)}>Cancel</button>
              <button className="btn gold" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
