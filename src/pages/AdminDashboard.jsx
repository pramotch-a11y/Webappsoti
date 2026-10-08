import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatThaiDate, formatTimeRange } from '../constants/status';

export function AdminDashboard({ _currentUser, onNavigateToBookings }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    api.getAdminOverview()
      .then(res => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message || 'ไม่สามารถโหลดข้อมูลภาพรวมได้');
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="admin-content">
        <div className="empty-box">กำลังโหลดข้อมูลภาพรวมระบบ...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-content">
        <div className="alert-box error-alert">{error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'}</div>
      </div>
    );
  }

  const { kpis, trend, recentRequests } = data;

  return (
    <div className="admin-content">
      {/* Top Breadcrumb & Title */}
      <div className="admin-page-header">
        <div className="admin-breadcrumb muted">หน้าแรก / ภาพรวม</div>
        <div className="admin-title-row">
          <h1>ภาพรวมระบบ</h1>
          <button
            className="btn-primary mini"
            onClick={onNavigateToBookings}
          >
            ดูคำขอทั้งหมด
          </button>
        </div>
      </div>

      {/* 6 KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card card">
          <div className="kpi-icon-wrap blue-bg">📅</div>
          <div className="kpi-info">
            <span className="kpi-title muted">การจองวันนี้</span>
            <div className="kpi-val">{kpis.todayBookings}</div>
            <span className="kpi-sub green-text">เพิ่มขึ้น 3 จากเมื่อวาน</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrap yellow-bg">⏱️</div>
          <div className="kpi-info">
            <span className="kpi-title muted">คำขอรออนุมัติ</span>
            <div className="kpi-val">{kpis.pendingApprovals}</div>
            <span className="kpi-sub yellow-text">ต้องดำเนินการ</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrap teal-bg">🚪</div>
          <div className="kpi-info">
            <span className="kpi-title muted">ห้องที่กำลังใช้งาน</span>
            <div className="kpi-val">{kpis.roomsInUse}</div>
            <span className="kpi-sub muted">จากทั้งหมด {kpis.totalRooms} ห้อง</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrap green-bg">✓</div>
          <div className="kpi-info">
            <span className="kpi-title muted">ห้องว่างตอนนี้</span>
            <div className="kpi-val">{kpis.availableRoomsNow}</div>
            <span className="kpi-sub green-text">พร้อมให้จอง</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrap teal-bg">📊</div>
          <div className="kpi-info">
            <span className="kpi-title muted">การจองเดือนนี้</span>
            <div className="kpi-val">{kpis.monthBookings}</div>
            <span className="kpi-sub muted">ตุลาคม 2569</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-icon-wrap red-bg">⚠️</div>
          <div className="kpi-info">
            <span className="kpi-title muted">อุปกรณ์ใกล้หมด</span>
            <div className="kpi-val">{kpis.lowStockEquipment}</div>
            <span className="kpi-sub red-text">คงเหลือไม่เกิน 2 ชิ้น</span>
          </div>
        </div>
      </div>

      {/* Middle Charts & Stats Section */}
      <div className="admin-charts-grid">
        {/* Left: 7 Days Trend Chart */}
        <div className="card chart-card">
          <div className="chart-header">
            <h3>จำนวนการจอง 7 วันล่าสุด</h3>
            <div className="chart-pill-toggle">
              <span className="active">รายวัน</span>
              <span>รายเดือน</span>
            </div>
          </div>
          <div className="bar-chart-container">
            {trend.map((t, idx) => {
              const maxVal = 150;
              const heightPercent = Math.round((t.count / maxVal) * 100);
              return (
                <div className="bar-col" key={idx}>
                  <span className="bar-val-label">{t.count}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className="bar-day-label">{t.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Booking Status Proportion */}
        <div className="card chart-card">
          <div className="chart-header">
            <h3>สัดส่วนสถานะการจอง</h3>
          </div>
          <div className="proportion-bar">
            <span className="pb-seg s-completed" style={{ width: '45%' }} />
            <span className="pb-seg s-approved" style={{ width: '25%' }} />
            <span className="pb-seg s-pending" style={{ width: '10%' }} />
            <span className="pb-seg s-checked-in" style={{ width: '8%' }} />
            <span className="pb-seg s-rejected" style={{ width: '7%' }} />
            <span className="pb-seg s-cancelled" style={{ width: '5%' }} />
          </div>
          <div className="status-legend-list">
            <div className="legend-row">
              <span className="dot dot-completed" />
              <span>เสร็จสิ้น</span>
              <b className="legend-val">147</b>
            </div>
            <div className="legend-row">
              <span className="dot dot-approved" />
              <span>อนุมัติแล้ว</span>
              <b className="legend-val">77</b>
            </div>
            <div className="legend-row">
              <span className="dot dot-pending" />
              <span>รออนุมัติ</span>
              <b className="legend-val">12</b>
            </div>
            <div className="legend-row">
              <span className="dot dot-checked-in" />
              <span>กำลังใช้งาน</span>
              <b className="legend-val">7</b>
            </div>
            <div className="legend-row">
              <span className="dot dot-rejected" />
              <span>ไม่อนุมัติ</span>
              <b className="legend-val">31</b>
            </div>
            <div className="legend-row">
              <span className="dot dot-cancelled" />
              <span>ยกเลิก</span>
              <b className="legend-val">31</b>
            </div>
            <div className="legend-row">
              <span className="dot dot-noshow" />
              <span>ไม่มาใช้งาน</span>
              <b className="legend-val">15</b>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Recent Requests Table */}
      <div className="card admin-recent-card">
        <div className="table-header-row">
          <h3>คำขอจองล่าสุด</h3>
          <button className="btn-link" onClick={onNavigateToBookings}>
            ดูทั้งหมด
          </button>
        </div>

        <div className="admin-table">
          <div className="admin-tr admin-th">
            <span>ห้อง</span>
            <span>ผู้จอง</span>
            <span>วันและเวลา</span>
            <span>สถานะ</span>
            <span>การดำเนินการ</span>
          </div>

          {recentRequests.map(r => (
            <div className="admin-tr" key={r.booking_id}>
              <span><b>{r.room_name}</b></span>
              <span>{r.requester_name}</span>
              <span>{formatThaiDate(r.booking_date, false)} · {formatTimeRange(r.start_time, r.end_time)}</span>
              <span>
                <StatusBadge status={r.booking_status} reason={r.reject_reason} />
              </span>
              <span>
                <button
                  className="btn-primary mini"
                  onClick={onNavigateToBookings}
                >
                  ดูรายละเอียด
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
