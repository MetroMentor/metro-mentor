'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function Topbar() {
  const router = useRouter();
  const [viewer, setViewer] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setViewer(data);

        // Fetch notifications for the user
        const { data: notifRows } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setNotifications(notifRows || []);
      }
    }
    loadUser();
  }, []);

  async function toggleNotifications() {
    setShowNotifications(!showNotifications);
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }

  return (
    <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontWeight: 800 }}>METRO MENTOR</div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
        
        {/* Notification Bell */}
        {viewer && (
          <div style={{ position: 'relative' }}>
            <button 
              onClick={toggleNotifications}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, position: 'relative', padding: 4 }}
            >
              🔔
              {notifications.some(n => !n.read) && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  background: '#ff4d4d', color: '#fff', fontSize: 10,
                  width: 8, height: 8, borderRadius: '50%'
                }} />
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {showNotifications && (
              <div style={{
                position: 'absolute', right: 0, top: 35, width: 300,
                background: '#fff', color: '#333', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, padding: 12,
                maxHeight: 350, overflowY: 'auto', textAlign: 'left'
              }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, borderBottom: '1px solid #eee', paddingBottom: 6 }}>
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#777', padding: '8px 0' }}>No notifications yet.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ 
                      padding: '8px 6px', borderBottom: '1px solid #f5f5f5', 
                      background: n.read ? '#fff' : '#f9f9ff', borderRadius: 4, marginBottom: 4 
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{n.title}</div>
                      <div style={{ fontSize: 11.5, color: '#555' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* My Profile Button */}
        {viewer && (
          <button 
            className="btn" 
            style={{ background: '#d32f2f', border: 'none', color: '#fff' }} 
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
