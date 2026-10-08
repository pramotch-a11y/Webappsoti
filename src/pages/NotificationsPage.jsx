import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatThaiDate } from '../constants/status';

export function NotificationsPage({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.getNotifications(currentUser?.user_id || 1)
      .then(data => {
        if (isMounted) setNotifications(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [currentUser]);

  return (
    <main className="my-page">
      <h1>การแจ้งเตือน</h1>

      <div className="card notifications-card">
        {loading ? (
          <div className="empty-box">กำลังโหลดการแจ้งเตือน...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-box">ยังไม่มีการแจ้งเตือนใหม่</div>
        ) : (
          <div className="notifications-list">
            {notifications.map(n => (
              <div className="notification-item" key={n.notification_id}>
                <div className="noti-icon">🔔</div>
                <div className="noti-content">
                  <p className="noti-text">{n.content}</p>
                  <small className="muted">
                    ประเภท: {n.noti_type} · ส่งถึง: {n.recipient_email} · {formatThaiDate(n.created_at, true)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
