import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { formatThaiDate, formatTimeRange } from '../constants/status';

export function StaffApprovalPage({ currentUser }) {
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const loadPending = useCallback(() => {
    setLoading(true);
    api.getPendingBookings(currentUser?.staff_id || 1)
      .then(data => {
        setPendingList(data);
      })
      .catch(err => {
        setFeedback({ error: err.message, success: '' });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;
    api.getPendingBookings(currentUser?.staff_id || 1)
      .then(data => {
        if (isMounted) setPendingList(data);
      })
      .catch(err => {
        if (isMounted) setFeedback({ error: err.message, success: '' });
      });
    return () => { isMounted = false; };
  }, [currentUser]);

  const handleApprove = async (bookingId) => {
    setActionId(bookingId);
    setFeedback({ error: '', success: '' });
    try {
      await api.approveBooking(bookingId, currentUser?.staff_id || 1);
      setFeedback({ error: '', success: 'อนุมัติการจองห้องสำเร็จ' });
      loadPending();
    } catch (err) {
      setFeedback({ error: err.message, success: '' });
    } finally {
      setActionId(null);
    }
  };

  const handleOpenRejectModal = (bookingId) => {
    setRejectTargetId(bookingId);
    setRejectReason('ห้องปิดซ่อมบำรุง');
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetId) return;
    setActionId(rejectTargetId);
    setFeedback({ error: '', success: '' });
    try {
      await api.rejectBooking(rejectTargetId, currentUser?.staff_id || 1, rejectReason);
      setFeedback({ error: '', success: 'ไม่อนุมัติการจองสำเร็จ' });
      setRejectTargetId(null);
      loadPending();
    } catch (err) {
      setFeedback({ error: err.message, success: '' });
    } finally {
      setActionId(null);
    }
  };

  return (
    <main className="staff-page my-page">
      <div className="staff-header">
        <h1>คิวรออนุมัติการจองห้อง (สำหรับเจ้าหน้าที่)</h1>
        <p className="muted">
          เจ้าหน้าที่: <b>{currentUser?.full_name}</b> ({currentUser?.job_title || 'ผู้ดูแลอาคาร'}) · กฎ: เฉพาะห้องที่ได้รับมอบหมาย (room_assignment)
        </p>
      </div>

      {feedback.error && <div className="alert-box error-alert">{feedback.error}</div>}
      {feedback.success && <div className="alert-box success-alert">{feedback.success}</div>}

      <div className="table card">
        <div className="tr th staff-tr">
          <span>ผู้ขอจอง</span>
          <span>ห้องและสถานที่</span>
          <span>วันและเวลา</span>
          <span>วัตถุประสงค์</span>
          <span>อุปกรณ์ที่ยืม</span>
          <span>การอนุมัติ</span>
        </div>

        {loading ? (
          <div className="empty-box">กำลังโหลดรายการคำขอจอง...</div>
        ) : pendingList.length === 0 ? (
          <div className="empty-box">ไม่มีรายการคำขอจองที่รออนุมัติในห้องที่คุณดูแล</div>
        ) : (
          pendingList.map((b) => {
            const isActing = actionId === b.booking_id;
            const dateText = formatThaiDate(b.booking_date, true);
            const timeText = formatTimeRange(b.start_time, b.end_time);

            return (
              <div className="tr staff-tr" key={b.booking_id}>
                <span>
                  <b>{b.requester_name}</b>
                  <small>{b.requester_email}</small>
                </span>

                <span>
                  <b>{b.room_name}</b>
                  <small>{b.building_name} {b.floor_number}</small>
                </span>

                <span>
                  {dateText}
                  <small>{timeText}</small>
                </span>

                <span>{b.purpose || '—'}</span>

                <span>{b.equipmentText}</span>

                <span className="action-buttons">
                  <button
                    className="btn-primary mini"
                    disabled={isActing}
                    onClick={() => handleApprove(b.booking_id)}
                  >
                    อนุมัติ
                  </button>
                  <button
                    className="btn-outline-danger mini"
                    disabled={isActing}
                    onClick={() => handleOpenRejectModal(b.booking_id)}
                  >
                    ไม่อนุมัติ
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectTargetId && (
        <div className="modal-overlay">
          <div className="modal-card card">
            <h3>ระบุเหตุผลที่ไม่อนุมัติ</h3>
            <p className="muted">ข้อความนี้จะแสดงในหน้ารายการจองของผู้ใช้และส่งแจ้งเตือน</p>
            <label>
              เหตุผล:
              <input
                type="text"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="เช่น ห้องปิดซ่อมบำรุง หรือ ติดกิจกรรมสำคัญ"
              />
            </label>
            <div className="modal-actions">
              <button
                className="btn-outline"
                onClick={() => setRejectTargetId(null)}
              >
                ยกเลิก
              </button>
              <button
                className="btn-danger"
                onClick={handleConfirmReject}
                disabled={actionId === rejectTargetId}
              >
                ยืนยันไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
