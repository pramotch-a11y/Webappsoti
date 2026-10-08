import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatThaiDate } from '../constants/status';

export function BookingPage({ room, searchParams, currentUser, onBack, onSuccess }) {
  const [date, setDate] = useState(searchParams.date || '2026-10-12');
  const [startTime, setStartTime] = useState(searchParams.startTime || '09:00');
  const [endTime, setEndTime] = useState(searchParams.endTime || '11:00');
  const [purpose, setPurpose] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participants, setParticipants] = useState([
    { email: 'somying@example.edu', name: 'สมหญิง รักเรียน', status: 'รอตอบรับ' }
  ]);
  const [equipList, setEquipList] = useState([]);
  const [selectedEquips, setSelectedEquips] = useState({}); // { [id]: quantity }
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch available equipment
  useEffect(() => {
    api.getFacilitiesMetadata().then(data => {
      if (data.equipment) {
        setEquipList(data.equipment);
        // Default select first item if available
        if (data.equipment.length > 0) {
          setSelectedEquips({ [data.equipment[0].equipment_id]: 1 });
        }
      }
    });
  }, []);

  const handleAddParticipant = (e) => {
    e.preventDefault();
    if (!participantEmail.trim()) return;
    if (participants.some(p => p.email === participantEmail.trim())) {
      return;
    }
    setParticipants([...participants, { email: participantEmail.trim(), name: participantEmail.trim(), status: 'รอตอบรับ' }]);
    setParticipantEmail('');
  };

  const handleRemoveParticipant = (email) => {
    setParticipants(participants.filter(p => p.email !== email));
  };

  const toggleEquip = (equipId) => {
    setSelectedEquips(prev => {
      const copy = { ...prev };
      if (copy[equipId] !== undefined) {
        delete copy[equipId];
      } else {
        copy[equipId] = 1;
      }
      return copy;
    });
  };

  const changeEquipQty = (equipId, qty) => {
    const val = parseInt(qty, 10);
    if (isNaN(val) || val <= 0) return;
    setSelectedEquips(prev => ({ ...prev, [equipId]: val }));
  };

  // Duration in hours
  const calcHours = () => {
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return diff > 0 ? (diff / 60).toFixed(0) : '0';
    } catch {
      return '0';
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const eqPayload = Object.entries(selectedEquips).map(([equipmentId, quantity]) => ({
        equipmentId: Number(equipmentId),
        quantity: Number(quantity)
      }));

      const res = await api.createBooking({
        userId: currentUser?.user_id || 1,
        roomId: room?.room_id,
        bookingDate: date,
        startTime,
        endTime,
        purpose,
        participants,
        equipment: eqPayload
      });

      setSuccessMsg(res.message || 'ส่งคำขอจองห้องสำเร็จ');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'ไม่สามารถทำการจองได้');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEquipSummary = Object.entries(selectedEquips).map(([id, qty]) => {
    const eq = equipList.find(e => e.equipment_id === Number(id));
    return eq ? `${eq.equipment_name} × ${qty}` : '';
  }).filter(Boolean).join(', ') || 'ไม่มี';

  return (
    <main className="booking-page">
      <div className="booking-main">
        <button className="back-link" onClick={onBack}>
          ← กลับไปผลการค้นหา
        </button>

        <h1>จอง{room?.room_name || 'ห้องประชุม 301'}</h1>

        {errorMsg && (
          <div className="alert-box error-alert">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="alert-box success-alert">
            {successMsg}
          </div>
        )}

        {/* Section 1: Date & Time */}
        <section className="card form-card">
          <h2>วันและเวลา</h2>
          <div className="threecol">
            <label>
              วันที่
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </label>
            <label>
              เวลาเริ่ม
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </label>
            <label>
              เวลาสิ้นสุด
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </label>
          </div>

          <label>
            วัตถุประสงค์การใช้งาน
            <textarea
              placeholder="เช่น ประชุมกลุ่มโปรเจกต์"
              maxLength={500}
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
            />
          </label>
          <div className="counter">{purpose.length} / 500</div>
        </section>

        {/* Section 2: Participants */}
        <section className="card form-card">
          <h2>ผู้เข้าร่วม</h2>
          <div className="participant-tags">
            <span className="tag green">
              {currentUser?.full_name || 'สมชาย ใจดี'} (ผู้จอง)
            </span>
            {participants.map(p => (
              <span key={p.email} className="tag yellow">
                {p.name} · {p.status}
                <button
                  type="button"
                  className="tag-remove"
                  onClick={() => handleRemoveParticipant(p.email)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <label>
            เพิ่มผู้เข้าร่วมด้วยอีเมล
            <div className="add-participant-row">
              <input
                type="email"
                placeholder="name@example.edu"
                value={participantEmail}
                onChange={e => setParticipantEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddParticipant(e);
                  }
                }}
              />
              <button
                type="button"
                className="btn-outline add-part-btn"
                onClick={handleAddParticipant}
              >
                เพิ่ม
              </button>
            </div>
          </label>
        </section>

        {/* Section 3: Equipment */}
        <section className="card equipment-card">
          <h2>ยืมอุปกรณ์ (ไม่บังคับ)</h2>
          {equipList.map(eq => {
            const isChecked = selectedEquips[eq.equipment_id] !== undefined;
            return (
              <div className="equip-row" key={eq.equipment_id}>
                <label className="equip-check-label">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEquip(eq.equipment_id)}
                  />
                  <span>{eq.equipment_name}</span>
                </label>
                <span className="equip-remaining">
                  คงเหลือ {eq.remaining_qty}
                </span>
                <input
                  type="number"
                  min="1"
                  max={eq.remaining_qty}
                  disabled={!isChecked}
                  value={selectedEquips[eq.equipment_id] || 1}
                  onChange={e => changeEquipQty(eq.equipment_id, e.target.value)}
                  className="equip-qty-input"
                />
              </div>
            );
          })}
        </section>
      </div>

      {/* Summary Sidebar */}
      <aside className="summary card">
        <h2>สรุปคำขอจอง</h2>
        <dl>
          <dt>ห้อง</dt>
          <dd>
            {room?.room_name} · {room?.building_name} {room?.floor_number}
          </dd>
          <dt>วันที่</dt>
          <dd>{formatThaiDate(date)}</dd>
          <dt>เวลา</dt>
          <dd>
            {startTime}–{endTime} ({calcHours()} ชม.)
          </dd>
          <dt>ผู้เข้าร่วม</dt>
          <dd>
            {participants.length + 1} คน (ความจุ {room?.capacity || 10})
          </dd>
          <dt>อุปกรณ์</dt>
          <dd>{selectedEquipSummary}</dd>
        </dl>

        <div className="summary-status-box success">
          ช่วงเวลานี้ว่าง · ไม่ตรงวันหยุด · ไม่มีบทลงโทษค้างอยู่
        </div>

        <p className="summary-notice muted">
          หลังส่งคำขอ สถานะจะเป็น “รออนุมัติ” และคุณจะได้รับแจ้งเตือนทางอีเมลเมื่อเจ้าหน้าที่ตอบกลับ
        </p>

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอจอง'}
        </button>
        <button className="btn-link" onClick={onBack}>
          ยกเลิก
        </button>
      </aside>
    </main>
  );
}
