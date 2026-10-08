export function Header({ tab, setTab, currentUser, users, onSelectUser, onLogout, onSwitchToAdminView }) {
  const avatarLetter = currentUser?.full_name ? currentUser.full_name.charAt(0) : 'ส';

  return (
    <header className="header">
      <div className="header-left">
        <div className="brand" onClick={() => setTab('search')}>
          ระบบจองห้อง
        </div>
        <nav className="nav">
          <button
            className={`nav-btn ${tab === 'search' ? 'active' : ''}`}
            onClick={() => setTab('search')}
          >
            ค้นหาห้อง
          </button>
          <button
            className={`nav-btn ${tab === 'bookings' ? 'active' : ''}`}
            onClick={() => setTab('bookings')}
          >
            การจองของฉัน
          </button>
          <button
            className={`nav-btn ${tab === 'alerts' ? 'active' : ''}`}
            onClick={() => setTab('alerts')}
          >
            การแจ้งเตือน
          </button>
          {(currentUser?.role_level === 'ADMIN' || currentUser?.role_level === 'STAFF') && (
            <button
              className="nav-btn nav-btn-admin-switch"
              onClick={onSwitchToAdminView}
              title="สลับไป Dashboard ผู้ดูแลระบบ"
            >
              แดชบอร์ดแอดมิน ⚙️
            </button>
          )}
        </nav>
      </div>


      <div className="header-right">
        {users && users.length > 0 && (
          <div className="user-switcher">
            <span className="user-role-badge">
              {currentUser?.role_level === 'STAFF' ? 'เจ้าหน้าที่' : 'ผู้ใช้งาน'}
            </span>
            <select
              value={currentUser?.user_id || ''}
              onChange={(e) => {
                const found = users.find(u => u.user_id === Number(e.target.value));
                if (found) onSelectUser(found);
              }}
              className="user-select"
            >
              {users.map(u => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name} ({u.role_level})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="avatar" title={currentUser?.full_name || 'ผู้ใช้'}>
          {avatarLetter}
        </div>
        <button
          className="btn-outline logout-btn mini"
          onClick={onLogout}
          title="ออกจากระบบ"
        >
          ออกจากระบบ
        </button>
      </div>
    </header>
  );
}
