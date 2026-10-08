import { useState } from 'react';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminDashboard } from './AdminDashboard';
import { AdminBookingsPage } from './AdminBookingsPage';

export function AdminLayout({ currentUser, onLogout, onSwitchToUserView }) {
  const [currentSection, setCurrentSection] = useState('overview');
  const [searchHeader, setSearchHeader] = useState('');

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <AdminSidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
      />

      {/* Main Admin Area */}
      <div className="admin-main">
        {/* Admin Top Navbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <input
              type="text"
              placeholder="ค้นหาห้อง ผู้ใช้ หรือรหัสการจอง"
              value={searchHeader}
              onChange={e => setSearchHeader(e.target.value)}
              className="admin-top-search"
            />
          </div>

          <div className="admin-topbar-right">
            <button
              className="btn-outline mini"
              onClick={onSwitchToUserView}
              title="สลับไปมุมมองผู้ใช้งาน"
            >
              มุมมองผู้ใช้งาน
            </button>
            <span className="admin-noti-badge">การแจ้งเตือน 3</span>
            <div className="admin-user-profile">
              <div className="admin-avatar">ผ</div>
              <div className="admin-user-info">
                <span className="admin-name">{currentUser?.full_name || 'ผู้ดูแลระบบ'}</span>
                <span className="admin-role-tag">ADMIN</span>
              </div>
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

        {/* Content Body */}
        <div className="admin-body">
          {currentSection === 'overview' && (
            <AdminDashboard
              currentUser={currentUser}
              onNavigateToBookings={() => setCurrentSection('bookings')}
            />
          )}

          {currentSection === 'bookings' && (
            <AdminBookingsPage
              currentUser={currentUser}
            />
          )}

          {['rooms', 'equipment', 'users', 'holiday', 'penalty', 'reports', 'logs'].includes(currentSection) && (
            <div className="admin-content">
              <div className="admin-page-header">
                <div className="admin-breadcrumb muted">หน้าแรก / {currentSection}</div>
                <h1>การจัดการ {currentSection}</h1>
              </div>
              <div className="empty-box">
                หน้านี้พร้อมสำหรับข้อมูลตาราง {currentSection.toUpperCase()} จากสคีมาฐานข้อมูล
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
