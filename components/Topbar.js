'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchNotifications() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !isMounted) return;

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      if (profile && isMounted) setUser(profile);

      // Fetch latest notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (notifs && isMounted) {
        setNotifications(notifs);
      }
    }

    // Initial fetch
    fetchNotifications();

    // Poll every 3 seconds
    const interval = setInterval(fetchNotifications, 3000);

    // Close dropdown when clicking outside
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      isMounted = false;
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  async function markAsRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function deleteNotification(id, e) {
    e.stopPropagation(); // Prevent triggering markAsRead
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function clearAllRead() {
    const readIds = notifications.filter(n => n.read).map(n => n.id);
    if (readIds.length === 0) return;
    await supabase.from('notifications').delete().in('id', readIds);
    setNotifications(prev => prev.filter(n => !n.read));
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  // Time ago formatter
  function timeAgo(dateString) {
    if (!dateString) return '';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    return 'Just now';
  }

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
      <div style={{ fontWeight: 800, cursor: 'pointer' }} onClick={() => router.push(`/${user.role}`)}>
        METRO MENTOR
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          {user.name} <span className="pill" style={{ background: 'var(--gold)', color: '#fff', marginLeft: 8 }}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)} · P{user.period}</span>
        </div>

        {/* Notification Bell Icon container */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              position: 'relative',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              color: 'inherit'
            }}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 9,
                height: 9,
                background: '#ff4d4d',
                borderRadius: '50%',
                border: '2px solid var(--kraft-dark, #222)'
              }} />
            )}
          </button>

          {/* Dropdown Box */}
          {isOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              marginTop: 10,
              width: 320,
              maxHeight: 400,
              overflowY: 'auto',
              background: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 1000,
              padding: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid #333', paddingBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Notifications</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>{unreadCount} unread</span>
                  {notifications.some(n => n.read) && (
                    <button 
                      onClick={clearAllRead}
                      style={{ background: 'transparent', border: 'none', color: '#ff4d4d', fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      Clear read
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#888', fontSize: 13 }}>
                  No notifications yet.
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => markAsRead(n.id)}
                    style={{
                      padding: '10px',
                      borderRadius: 6,
                      background: n.read ? 'transparent' : 'rgba(212, 175, 55, 0.08)',
                      marginBottom: 6,
                      borderLeft: n.read ? '3px solid transparent' : '3px solid var(--gold)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{n.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: '#aaa' }}>{timeAgo(n.created_at)}</span>
                        <button 
                          onClick={(e) => deleteNotification(n.id, e)}
                          style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}
                          title="Delete notification"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.4 }}>{n.message}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {user.role === 'mentor' && (
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
        )}

        <button className="btn" style={{ background: 'transparent', border: '1px solid #fff' }} onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
