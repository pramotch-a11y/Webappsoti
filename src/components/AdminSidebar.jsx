export function AdminSidebar({ currentSection, onSelectSection }) {
  const menuItems = [
    { id: 'overview', label: 'ภาพรวม', icon: '⊞' },
    { id: 'bookings', label: 'คำขอจอง', icon: '📅', badge: '12' },
    { id: 'rooms', label: 'ห้อง', icon: '🚪' },
    { id: 'equipment', label: 'อุปกรณ์', icon: '📦' },
    { id: 'users', label: 'ผู้ใช้งาน', icon: '👥' },
    { id: 'holiday', label: 'วันหยุด', icon: '🚩' },
    { id: 'penalty', label: 'Penalty', icon: '⚠️' },
    { id: 'reports', label: 'รายงาน', icon: '📊' },
    { id: 'logs', label: 'Audit Log', icon: '📋' }
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        ระบบจองห้อง
      </div>
      <nav className="admin-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`admin-nav-item ${currentSection === item.id ? 'active' : ''}`}
            onClick={() => onSelectSection(item.id)}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            <span className="admin-nav-label">{item.label}</span>
            {item.badge && (
              <span className="admin-nav-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
