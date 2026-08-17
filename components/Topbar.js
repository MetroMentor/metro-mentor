'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function Topbar() {
  const router = useRouter();
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setViewer(data);
      }
    }
    loadUser();
  }, []);

  return (
    <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontWeight: 800 }}>METRO MENTOR</div>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* My Profile Button */}
        {viewer && (
          <button 
            className="btn" 
            style={{ background: '#d32f2f', border: 'none', color: '#fff' }} // Using the red color from your image
            onClick={() => {
              const myUrlName = viewer.name.toLowerCase().replace(/ /g, '-');
              router.push(`/student/mentor/${myUrlName}`);
            }}
          >
            My Profile
          </button>
        )}

        <button className="btn" style={{ background: 'transparent', border: '1px solid #fff' }} onClick={() => router.back()}>
          Back
        </button>
      </div>
    </div>
  );
}
