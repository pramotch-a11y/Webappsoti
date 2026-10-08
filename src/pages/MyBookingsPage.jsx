import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatThaiDate, formatTimeRange } from '../constants/status';

export function MyBookingsPage({ currentUser, onRebook }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const loadBookings = useCallback(() => {
    setLoading(true);
    api.getMyBookings(currentUser?.user_id || 1)
      .then(data => {
        setBookings(data);
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
    api.getMyBookings(currentUser?.user_id || 1)
      .then(data => {
        if (isMounted) setBookings(data);
      })
      .catch(err => {
        if (isMounted) setFeedback({ error: err.message, success: '' });
      });
    return () => { isMounted = false; };
  }, [currentUser]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองนี้?')) return;
    setActionLoadingId(bookingId);
    setFeedback({ error: '', success: '' });
    try {
      await api.cancelBooking(bookingId, currentUser?.user_id);
      setFeedback({ error: '', success: 'ยกเลิกการจองเรียบร้อยแล้ว' });
      loadBookings();
    } catch (err) {
      setFeedback({ error: err.message, success: '' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCheckin = async (bookingId) => {
    setActionLoadingId(bookingId);
    setFeedback({ error: '', success: '' });
    try {
      await api.checkinBooking(bookingId);
      setFeedback({ error: '', success: 'เช็กอินสำเร็จ เข้าใช้งานห้องได้ทันที' });
      loadBookings();
    } catch (err) {
      setFeedback({ error: err.message, success: '' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter tabs logic
  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return b.booking_status === 'PENDING';
    if (activeTab === 'APPROVED') return b.booking_status === 'APPROVED' || b.booking_status === 'CHECKED_IN';
    if (activeTab === 'COMPLETED') return b.booking_status === 'COMPLETED';
    if (activeTab === 'CANCELLED_REJECTED') {
      return ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(b.booking_status);
    }
    return true;
  });

  const countPending = bookings.filter(b => b.booking_status === 'PENDING').length;
  const countApproved = bookings.filter(b => ['APPROVED', 'CHECKED_IN'].includes(b.booking_status)).length;
  const countCompleted = bookings.filter(b => b.booking_status === 'COMPLETED').length;
  const countCancelledRejected = bookings.filter(b => ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(b.booking_status)).length;

  return (
    <main className="my-page">
      <h1>การจองของฉัน</h1>

      {feedback.error && <div className="alert-box error-alert">{feedback.error}</div>}
      {feedback.success && <div className="alert-box success-alert">{feedback.success}</div>}

      {/* Tabs matching mockup */}
      <div className="tabs">
        <button
          className={activeTab === 'ALL' ? 'selected' : ''}
          onClick={() => setActiveTab('ALL')}
        >
          ทั้งหมด {bookings.length}
        </button>
        <button
          className={activeTab === 'PENDING' ? 'selected' : ''}
          onClick={() => setActiveTab('PENDING')}
        >
          รออนุมัติ {countPending}
        </button>
        <button
          className={activeTab === 'APPROVED' ? 'selected' : ''}
          onClick={() => setActiveTab('APPROVED')}
        >
          อนุมัติแล้ว {countApproved}
        </button>
        <button
          className={activeTab === 'COMPLETED' ? 'selected' : ''}
          onClick={() => setActiveTab('COMPLETED')}
        >
          เสร็จสิ้น {countCompleted}
        </button>
        <button
          className={activeTab === 'CANCELLED_REJECTED' ? 'selected' : ''}
          onClick={() => setActiveTab('CANCELLED_REJECTED')}
        >
          ยกเลิก / ไม่อนุมัติ {countCancelledRejected}
        </button>
      </div>

      {/* Bookings Table */}
      <div className="table card">
        <div className="tr th">
          <span>ห้อง</span>
          <span>วันและเวลา</span>
          <span>วัตถุประสงค์</span>
          <span>อุปกรณ์ที่ยืม</span>
          <span>สถานะ</span>
          <span>การดำเนินการ</span>
        </div>

        {loading ? (
          <div className="empty-box">กำลังโหลดรายการการจอง...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="empty-box">ไม่พบรายการการจองในหมวดหมู่นี้</div>
        ) : (
          filteredBookings.map((b) => {
            const isActing = actionLoadingId === b.booking_id;
            const timeText = formatTimeRange(b.start_time, b.end_time);
            const dateText = formatThaiDate(b.booking_date, false);

            return (
              <div className="tr" key={b.booking_id}>
                {/* 1. Room info */}
                <span>
                  <b>{b.room_name}</b>
                  <small>{b.building_name} {b.floor_number}</small>
                </span>

                {/* 2. Date and Time */}
                <span>{dateText} · {timeText}</span>

                {/* 3. Purpose */}
                <span>{b.purpose || '—'}</span>

                {/* 4. Equipment */}
                <span>{b.equipmentText || '—'}</span>

                {/* 5. Status Badge with reject reason */}
                <StatusBadge
                  status={b.booking_status}
                  reason={b.reject_reason}
                />

                {/* 6. Action buttons matching mockup */}
                <span className="action-buttons">
                  {b.booking_status === 'PENDING' && (
                    <button
                      className="btn-outline mini"
                      disabled={isActing}
                      onClick={() => handleCancel(b.booking_id)}
                    >
                      {isActing ? '...' : 'ยกเลิก'}
                    </button>
                  )}

                  {b.booking_status === 'APPROVED' && (
                    <div className="action-group">
                      <button
                        className="btn-primary mini"
                        disabled={isActing}
                        onClick={() => handleCheckin(b.booking_id)}
                      >
                        {isActing ? '...' : 'เช็กอิน'}
                      </button>
                      <button
                        className="btn-outline mini"
                        disabled={isActing}
                        onClick={() => handleCancel(b.booking_id)}
                      >
                        {isActing ? '...' : 'ยกเลิก'}
                      </button>
                    </div>
                  )}

                  {b.booking_status === 'CHECKED_IN' && (
                    <span className="checked-in-label">
                      เช็กอินเมื่อ {b.actual_checkin_time ? b.actual_checkin_time.substring(11, 16) : 'เมื่อสักครู่'}
                    </span>
                  )}

                  {b.booking_status === 'REJECTED' && (
                    <button
                      className="btn-outline mini"
                      onClick={() => onRebook(b)}
                    >
                      จองใหม่
                    </button>
                  )}

                  {b.booking_status === 'COMPLETED' && (
                    <button
                      className="btn-outline mini"
                      onClick={() => onRebook(b)}
                    >
                      จองซ้ำ
                    </button>
                  )}

                  {b.booking_status === 'CANCELLED' && (
                    <button
                      className="btn-outline mini"
                      onClick={() => onRebook(b)}
                    >
                      จองใหม่
                    </button>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
