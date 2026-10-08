import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatThaiDate, formatTimeRange } from '../constants/status';

export function AdminBookingsPage({ currentUser }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rooms, setRooms] = useState([]);
  const [roomIdFilter, setRoomIdFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Reject modal state
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectBookingInfo, setRejectBookingInfo] = useState(null);
  const [rejectReason, setRejectReason] = useState('ห้องปิดซ่อมบำรุงในช่วงเวลานี้');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const loadData = () => {
    setLoading(true);
    return api.getAdminBookings({
      status: statusFilter,
      search,
      roomId: roomIdFilter,
      date: dateFilter
    }).then(data => setBookings(data)).catch(() => setBookings([])).finally(() => setLoading(false));
  };

  // Fetch facilities for room filter
  useEffect(() => {
    api.searchRooms({ date: '2026-10-12' })
      .then(res => setRooms(res))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.getAdminBookings({ status: statusFilter, search, roomId: roomIdFilter, date: dateFilter })
      .then(data => { if (isMounted) { setBookings(data); setLoading(false); } })
      .catch(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [statusFilter, roomIdFilter, dateFilter, search]);


  const handleApprove = async (bookingId, requesterName) => {
    setActionLoading(true);
    try {
      await api.approveBooking(bookingId, currentUser?.staff_id || 1);
      setToastMsg(`อนุมัติคำขอของ ${requesterName} เรียบร้อยแล้ว`);
      setTimeout(() => setToastMsg(''), 4000);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (booking) => {
    setRejectBookingInfo(booking);
    setRejectModalId(booking.booking_id);
    setRejectReason('ห้องปิดซ่อมบำรุงในช่วงเวลานี้');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalId) return;
    setActionLoading(true);
    try {
      await api.rejectBooking(rejectModalId, currentUser?.staff_id || 1, rejectReason);
      setToastMsg(`ไม่อนุมัติคำขอของ ${rejectBookingInfo?.requester_name} เรียบร้อยแล้ว`);
      setTimeout(() => setToastMsg(''), 4000);
      setRejectModalId(null);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-content">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="admin-toast-success">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-breadcrumb muted">หน้าแรก / คำขอจอง</div>
        <div className="admin-title-row">
          <h1>จัดการคำขอจอง</h1>
          <button className="btn-primary mini add-booking-btn">
            + สร้างการจอง
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card admin-filter-bar">
        <div className="admin-search-input-wrap">
          <input
            type="text"
            placeholder="ค้นหาผู้จอง วัตถุประสงค์ หรือรหัสการจอง"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') loadData();
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="admin-select"
        >
          <option value="ALL">ทุกสถานะ</option>
          <option value="PENDING">รออนุมัติ</option>
          <option value="APPROVED">อนุมัติแล้ว</option>
          <option value="CHECKED_IN">กำลังใช้งาน</option>
          <option value="REJECTED">ไม่อนุมัติ</option>
          <option value="CANCELLED">ยกเลิก</option>
          <option value="COMPLETED">เสร็จสิ้น</option>
          <option value="NO_SHOW">ไม่มาใช้งาน</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="admin-date-input"
        />

        <select
          value={roomIdFilter}
          onChange={e => setRoomIdFilter(e.target.value)}
          className="admin-select"
        >
          <option value="all">ทุกห้อง</option>
          {rooms.map(r => (
            <option key={r.room_id} value={r.room_id}>
              {r.room_name}
            </option>
          ))}
        </select>
      </div>

      {/* Bookings Table */}
      <div className="card admin-table-card">
        <div className="admin-tr admin-th admin-grid-full">
          <span>ห้อง</span>
          <span>ผู้จอง</span>
          <span>วันและเวลา</span>
          <span>วัตถุประสงค์</span>
          <span>อุปกรณ์ที่ยืม</span>
          <span>สถานะ</span>
          <span>การดำเนินการ</span>
        </div>

        {loading ? (
          <div className="empty-box">กำลังโหลดรายการคำขอจอง...</div>
        ) : bookings.length === 0 ? (
          <div className="empty-box">
            ยังไม่มีคำขอจองที่ตรงกับตัวกรอง
            <div style={{ marginTop: '10px' }}>
              <button
                className="btn-outline mini"
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearch('');
                  setRoomIdFilter('all');
                  setDateFilter('');
                }}
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        ) : (
          bookings.map(b => (
            <div className="admin-tr admin-grid-full" key={b.booking_id}>
              {/* ห้อง */}
              <span>
                <b>{b.room_name}</b>
                <small className="muted">{b.building_name} {b.floor_number}</small>
              </span>

              {/* ผู้จอง */}
              <span>
                <div>{b.requester_name}</div>
                <small className="muted">{b.role_level}</small>
              </span>

              {/* วันและเวลา */}
              <span>
                <div>{formatThaiDate(b.booking_date, false)}</div>
                <small className="muted">{formatTimeRange(b.start_time, b.end_time)}</small>
              </span>

              {/* วัตถุประสงค์ */}
              <span className="truncate-text" title={b.purpose}>
                {b.purpose || '—'}
              </span>

              {/* อุปกรณ์ที่ยืม */}
              <span>{b.equipmentText}</span>

              {/* สถานะ */}
              <span>
                <StatusBadge status={b.booking_status} reason={b.reject_reason} />
              </span>

              {/* การดำเนินการ */}
              <span className="admin-action-col">
                {b.booking_status === 'PENDING' && (
                  <div className="action-group">
                    <button
                      className="btn-primary mini"
                      disabled={actionLoading}
                      onClick={() => handleApprove(b.booking_id, b.requester_name)}
                    >
                      อนุมัติ
                    </button>
                    <button
                      className="btn-outline-danger mini"
                      disabled={actionLoading}
                      onClick={() => handleOpenReject(b)}
                    >
                      ไม่อนุมัติ
                    </button>
                  </div>
                )}

                {b.booking_status === 'APPROVED' && (
                  <div className="action-group">
                    <button
                      className="btn-teal mini"
                      onClick={() => api.checkinBooking(b.booking_id).then(loadData)}
                    >
                      เช็กอิน
                    </button>
                    <button
                      className="btn-outline mini"
                      onClick={() => api.cancelBooking(b.booking_id).then(loadData)}
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}

                {['CHECKED_IN', 'REJECTED', 'COMPLETED', 'CANCELLED'].includes(b.booking_status) && (
                  <button className="btn-outline mini">
                    ดูรายละเอียด
                  </button>
                )}

                {b.booking_status === 'NO_SHOW' && (
                  <button className="btn-outline mini">
                    ดู Penalty
                  </button>
                )}
              </span>
            </div>
          ))
        )}

        {/* Pagination Footer matching screenshot */}
        <div className="admin-pagination-row">
          <span className="muted">แสดง 1–{bookings.length} จาก {bookings.length} รายการ</span>
          <div className="page-btns">
            <button className="page-btn disabled" disabled>ก่อนหน้า</button>
            <button className="page-btn active">1</button>
            <button className="page-btn">ถัดไป</button>
          </div>
        </div>
      </div>

      {/* Reject Modal matching media_1791453804584_59d46d99.png */}
      {rejectModalId && rejectBookingInfo && (
        <div className="modal-overlay">
          <div className="admin-modal-card card">
            <h2>ไม่อนุมัติคำขอจอง</h2>
            <p className="admin-modal-sub">
              {rejectBookingInfo.room_name} · {rejectBookingInfo.requester_name} · {formatThaiDate(rejectBookingInfo.booking_date, false)} {formatTimeRange(rejectBookingInfo.start_time, rejectBookingInfo.end_time)}
            </p>

            <label className="modal-label">
              เหตุผลที่ไม่รับอนุมัติ (จำเป็น)
              <textarea
                rows={4}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="เช่น ห้องปิดซ่อมบำรุงในช่วงเวลานี้"
              />
            </label>

            <small className="muted modal-notice">
              ผู้จองจะได้รับแจ้งเตือนทางอีเมลพร้อมเหตุผลนี้
            </small>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setRejectModalId(null)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn-danger-confirm"
                onClick={handleConfirmReject}
                disabled={actionLoading}
              >
                ยืนยันไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
