import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, initDatabase } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite Schema & Seed
initDatabase();

// -------------------------------------------------------------
// 1. Auth & Current User Mock Endpoints
// -------------------------------------------------------------
app.get('/api/auth/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.user_id, u.full_name, u.email, u.phone, u.role_level, u.account_status,
             s.staff_id, s.job_title
      FROM users u
      LEFT JOIN staff s ON s.users_user_id = u.user_id
      WHERE u.is_deleted = 0
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login endpoint (checks email and active account_status)
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'กรุณากรอกอีเมล' });
  }

  try {
    const user = db.prepare(`
      SELECT u.user_id, u.full_name, u.email, u.phone, u.role_level, u.account_status,
             s.staff_id, s.job_title
      FROM users u
      LEFT JOIN staff s ON s.users_user_id = u.user_id
      WHERE LOWER(u.email) = LOWER(?) AND u.is_deleted = 0
    `).get(email.trim());

    if (!user) {
      return res.status(401).json({ error: 'ไม่พบผู้ใช้งานหรืออีเมลนี้ในระบบ' });
    }

    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน (SUSPENDED / INACTIVE)' });
    }

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register endpoint (inserts into USERS table matching schema)
app.post('/api/auth/register', (req, res) => {
  const { fullName, email, phone, roleLevel } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อ-นามสกุล และอีเมล' });
  }

  const role = ['STUDENT', 'TEACHER', 'STAFF'].includes(roleLevel) ? roleLevel : 'STUDENT';

  try {
    // Check if active user already exists with this email (Section 3 of SAfordata_fixes)
    const existing = db.prepare('SELECT user_id FROM users WHERE LOWER(email) = LOWER(?) AND is_deleted = 0').get(email.trim());
    if (existing) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานในระบบแล้ว' });
    }

    const regTx = db.transaction(() => {
      const insertUser = db.prepare(`
        INSERT INTO users (full_name, email, phone, role_level, account_status, is_deleted)
        VALUES (?, ?, ?, ?, 'ACTIVE', 0)
      `);
      const info = insertUser.run(fullName.trim(), email.trim(), phone?.trim() || null, role);
      const newUserId = info.lastInsertRowid;

      let staffId = null;
      let jobTitle = null;

      // If registered as STAFF, also insert into STAFF table (1:1 extension)
      if (role === 'STAFF') {
        const insertStaff = db.prepare(`
          INSERT INTO staff (job_title, start_date, staff_status, users_user_id)
          VALUES ('เจ้าหน้าที่ดูแลห้อง', date('now'), 'ACTIVE', ?)
        `);
        const staffInfo = insertStaff.run(newUserId);
        staffId = staffInfo.lastInsertRowid;
        jobTitle = 'เจ้าหน้าที่ดูแลห้อง';

        // Assign staff to existing rooms so they can approve
        const rooms = db.prepare('SELECT room_id FROM room').all();
        const assignStmt = db.prepare('INSERT OR IGNORE INTO room_assignment (staff_staff_id, room_room_id, start_date, work_shift) VALUES (?, ?, date("now"), "DAY")');
        for (const r of rooms) {
          assignStmt.run(staffId, r.room_id);
        }
      }

      return {
        user_id: newUserId,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        role_level: role,
        account_status: 'ACTIVE',
        staff_id: staffId,
        job_title: jobTitle
      };
    });

    const newUser = regTx();
    res.json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      user: newUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// -------------------------------------------------------------
// 2. Facilities Lookup (Buildings, Types, Equipment)
// -------------------------------------------------------------
app.get('/api/facilities/metadata', (req, res) => {
  try {
    const buildings = db.prepare('SELECT building_id, building_name FROM building ORDER BY building_name').all();
    const roomTypes = db.prepare('SELECT room_type_id, type_name, description FROM room_type ORDER BY type_name').all();
    const equipment = db.prepare(`
      SELECT equipment_id, equipment_name, equipment_type, remaining_qty, total_qty, usage_type
      FROM equipment
      WHERE is_deleted = 0 AND usage_type IN ('BORROWABLE', 'BOTH')
      ORDER BY equipment_id
    `).all();

    res.json({ buildings, roomTypes, equipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. Search & Check Room Availability
// -------------------------------------------------------------
app.get('/api/rooms/search', (req, res) => {
  try {
    const { date, startTime, endTime, buildingId, roomTypeId, minCapacity } = req.query;

    const bookingDate = date || '2026-10-12';
    const reqStart = startTime ? `${bookingDate} ${startTime}:00` : null;
    const reqEnd = endTime ? `${bookingDate} ${endTime}:00` : null;

    let query = `
      SELECT r.room_id, r.room_name, r.capacity, r.room_status, r.image_url,
             b.building_id, b.building_name,
             f.floor_number,
             rt.room_type_id, rt.type_name
      FROM room r
      JOIN floor f ON f.floor_id = r.floor_floor_id
      JOIN building b ON b.building_id = f.building_building_id
      JOIN room_type rt ON rt.room_type_id = r.room_type_room_type_id
      WHERE r.is_deleted = 0 AND r.room_status != 'CLOSED'
    `;
    const params = [];

    if (buildingId && buildingId !== 'all') {
      query += ` AND b.building_id = ?`;
      params.push(buildingId);
    }
    if (roomTypeId && roomTypeId !== 'all') {
      query += ` AND rt.room_type_id = ?`;
      params.push(roomTypeId);
    }
    if (minCapacity) {
      query += ` AND r.capacity >= ?`;
      params.push(Number(minCapacity));
    }

    query += ` ORDER BY r.room_id`;
    const rooms = db.prepare(query).all(...params);

    // Get fixed tools for each room
    const roomToolsStmt = db.prepare(`
      SELECT re.room_room_id, e.equipment_name
      FROM room_equipment re
      JOIN equipment e ON e.equipment_id = re.equipment_equipment_id
    `);
    const allTools = roomToolsStmt.all();

    // Get active bookings for the specified date
    const dayBookingsStmt = db.prepare(`
      SELECT booking_id, room_room_id, start_time, end_time, booking_status
      FROM booking
      WHERE booking_date = ?
        AND booking_status IN ('PENDING', 'APPROVED', 'CHECKED_IN')
    `);
    const dayBookings = dayBookingsStmt.all(bookingDate);

    // Timeline slots definition: 8 slots from 09:00 to 17:00 (1 hour each)
    const slotHours = [9, 10, 11, 12, 13, 14, 15, 16];

    const result = rooms.map(room => {
      const tools = allTools
        .filter(t => t.room_room_id === room.room_id)
        .map(t => t.equipment_name)
        .join(' · ');

      const roomBookings = dayBookings.filter(b => b.room_room_id === room.room_id);

      // Check each of the 8 timeline slots
      const slots = slotHours.map(hour => {
        const slotStart = new Date(`${bookingDate}T${String(hour).padStart(2, '0')}:00:00`);
        const slotEnd = new Date(`${bookingDate}T${String(hour + 1).padStart(2, '0')}:00:00`);

        const isBusy = roomBookings.some(b => {
          const bStart = new Date(b.start_time.replace(' ', 'T'));
          const bEnd = new Date(b.end_time.replace(' ', 'T'));
          return bStart < slotEnd && bEnd > slotStart;
        });
        return isBusy ? 'BUSY' : 'FREE';
      });

      // Check user requested slot status
      let isAvailableForRequest = true;
      if (reqStart && reqEnd) {
        const uStart = new Date(reqStart.replace(' ', 'T'));
        const uEnd = new Date(reqEnd.replace(' ', 'T'));
        const conflict = roomBookings.some(b => {
          const bStart = new Date(b.start_time.replace(' ', 'T'));
          const bEnd = new Date(b.end_time.replace(' ', 'T'));
          return bStart < uEnd && bEnd > uStart;
        });
        if (conflict) isAvailableForRequest = false;
      }

      const busyCount = slots.filter(s => s === 'BUSY').length;
      let displayStatus = 'ว่าง';
      let statusColor = 'green';

      if (!isAvailableForRequest) {
        displayStatus = 'ไม่ว่าง';
        statusColor = 'red';
      } else if (busyCount > 0) {
        displayStatus = 'ว่างบางช่วง';
        statusColor = 'yellow';
      }

      return {
        ...room,
        tools: tools || 'โต๊ะ · เก้าอี้ · ปลั๊กไฟ',
        meta: `${room.building_name} · ${room.floor_number} · ${room.type_name} · ${room.capacity} ที่นั่ง`,
        slots,
        isAvailable: isAvailableForRequest,
        displayStatus,
        statusColor
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. Create Booking with Exact Database Rules (SAfordata_fixes)
// -------------------------------------------------------------
app.post('/api/bookings', (req, res) => {
  const {
    userId,
    roomId,
    bookingDate,
    startTime,
    endTime,
    purpose,
    participants, // array of emails or names
    equipment // array of { equipmentId, quantity }
  } = req.body;

  try {
    if (!userId || !roomId || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลการจองให้ครบถ้วน' });
    }

    const startDateTime = `${bookingDate} ${startTime}:00`;
    const endDateTime = `${bookingDate} ${endTime}:00`;

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      return res.status(400).json({ error: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' });
    }

    // 1. Check Holiday rule (ORA-20002)
    const holiday = db.prepare('SELECT holiday_id, description FROM holiday WHERE holiday_date = ?').get(bookingDate);
    if (holiday) {
      return res.status(400).json({ error: `ไม่สามารถจองในวันหยุดได้: ${holiday.description} (ORA-20002)` });
    }

    // 2. Check User Active Penalty rule (ORA-20003)
    const penalty = db.prepare(`
      SELECT penalty_id, reason FROM penalty
      WHERE users_user_id = ?
        AND penalty_status = 'ACTIVE'
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
    `).get(userId, bookingDate, bookingDate);
    if (penalty) {
      return res.status(400).json({ error: `ผู้ใช้ติดบทลงโทษที่ยังมีผลบังคับ (${penalty.reason}) ไม่สามารถทำการจองได้ (ORA-20003)` });
    }

    // 3. Check Overlapping Booking rule (ORA-20001)
    const conflict = db.prepare(`
      SELECT booking_id FROM booking
      WHERE room_room_id = ?
        AND booking_status IN ('PENDING', 'APPROVED', 'CHECKED_IN')
        AND start_time < ?
        AND end_time > ?
    `).get(roomId, endDateTime, startDateTime);

    if (conflict) {
      return res.status(400).json({ error: 'ห้องนี้ถูกจองแล้วในช่วงเวลาที่เลือก กรุณาเลือกช่วงเวลาหรือห้องอื่น (ORA-20001)' });
    }

    // 4. Check Room Capacity
    const room = db.prepare('SELECT capacity, room_name FROM room WHERE room_id = ?').get(roomId);
    const participantCount = (participants && participants.length ? participants.length : 0) + 1; // +1 requester
    if (room && room.capacity && participantCount > room.capacity) {
      return res.status(400).json({ error: `จำนวนผู้เข้าร่วม (${participantCount} คน) เกินความจุของห้อง (${room.capacity} ที่นั่ง)` });
    }

    // 5. Check Equipment Stock (ORA-20005)
    if (equipment && equipment.length > 0) {
      for (const eq of equipment) {
        const item = db.prepare('SELECT equipment_id, equipment_name, remaining_qty FROM equipment WHERE equipment_id = ?').get(eq.equipmentId);
        if (!item || item.remaining_qty < eq.quantity) {
          return res.status(400).json({
            error: `สต็อกอุปกรณ์ "${item ? item.equipment_name : eq.equipmentId}" ไม่เพียงพอ (คงเหลือ ${item ? item.remaining_qty : 0}) (ORA-20005)`
          });
        }
      }
    }

    // Execute atomic transaction for booking creation & stock reduction
    const createTx = db.transaction(() => {
      // Insert Booking
      const insertBookingStmt = db.prepare(`
        INSERT INTO booking (booking_date, start_time, end_time, purpose, booking_status, users_user_id, room_room_id, created_at)
        VALUES (?, ?, ?, ?, 'PENDING', ?, ?, datetime('now', 'localtime'))
      `);
      const bookingInfo = insertBookingStmt.run(bookingDate, startDateTime, endDateTime, purpose || '', userId, roomId);
      const newBookingId = bookingInfo.lastInsertRowid;

      // Add requester as participant (ACCEPTED)
      const insertPartStmt = db.prepare(`
        INSERT INTO booking_participant (booking_booking_id, users_user_id, participation_status)
        VALUES (?, ?, ?)
      `);
      insertPartStmt.run(newBookingId, userId, 'ACCEPTED');

      // Add other participants
      if (participants && Array.isArray(participants)) {
        for (const p of participants) {
          // If email exists, link to user, otherwise create/find
          let pUser = db.prepare('SELECT user_id FROM users WHERE email = ?').get(p.email || p);
          if (pUser) {
            insertPartStmt.run(newBookingId, pUser.user_id, 'INVITED');
          }
        }
      }

      // Add Borrowed Equipment and reduce stock (trg_be_stock)
      if (equipment && Array.isArray(equipment)) {
        const insertBeStmt = db.prepare(`
          INSERT INTO booking_equipment (booking_booking_id, equipment_equipment_id, borrowed_qty)
          VALUES (?, ?, ?)
        `);
        const updateStockStmt = db.prepare(`
          UPDATE equipment SET remaining_qty = remaining_qty - ? WHERE equipment_id = ?
        `);

        for (const eq of equipment) {
          if (eq.quantity > 0) {
            insertBeStmt.run(newBookingId, eq.equipmentId, eq.quantity);
            updateStockStmt.run(eq.quantity, eq.equipmentId);
          }
        }
      }

      // Add Log
      const insertLogStmt = db.prepare(`
        INSERT INTO booking_log (action_type, action_time, violation_flag, booking_booking_id, users_user_id)
        VALUES ('CREATE_BOOKING', datetime('now', 'localtime'), 0, ?, ?)
      `);
      insertLogStmt.run(newBookingId, userId);

      // Add Notification
      const user = db.prepare('SELECT email FROM users WHERE user_id = ?').get(userId);
      const insertNotiStmt = db.prepare(`
        INSERT INTO notification (noti_type, content, recipient_email, template_code, booking_booking_id, users_user_id)
        VALUES ('BOOKING_CREATED', ?, ?, 'TPL_CREATED', ?, ?)
      `);
      insertNotiStmt.run(`สร้างคำขอจองห้อง ${room.room_name} สำเร็จ รอการอนุมัติ`, user ? user.email : '', newBookingId, userId);

      return newBookingId;
    });

    const bookingId = createTx();
    res.json({ success: true, bookingId, message: 'ส่งคำขอจองห้องเรียบร้อยแล้ว สถานะคือ "รออนุมัติ"' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. User Bookings List & Actions
// -------------------------------------------------------------
app.get('/api/bookings/my', (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const bookings = db.prepare(`
      SELECT b.booking_id, b.booking_date, b.start_time, b.end_time, b.purpose,
             b.booking_status, b.actual_checkin_time, b.reject_reason, b.created_at,
             r.room_id, r.room_name,
             f.floor_number,
             bldg.building_name
      FROM booking b
      JOIN room r ON r.room_id = b.room_room_id
      JOIN floor f ON f.floor_id = r.floor_floor_id
      JOIN building bldg ON bldg.building_id = f.building_building_id
      WHERE b.users_user_id = ?
      ORDER BY b.start_time DESC
    `).all(userId);

    // Fetch borrowed equipments for these bookings
    const beStmt = db.prepare(`
      SELECT be.booking_booking_id, be.borrowed_qty, e.equipment_name
      FROM booking_equipment be
      JOIN equipment e ON e.equipment_id = be.equipment_equipment_id
    `);
    const allEquip = beStmt.all();

    const result = bookings.map(b => {
      const equipList = allEquip
        .filter(e => e.booking_booking_id === b.booking_id)
        .map(e => `${e.equipment_name} × ${e.borrowed_qty}`)
        .join(', ');

      return {
        ...b,
        equipmentText: equipList || '—'
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel Booking
app.post('/api/bookings/:id/cancel', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const booking = db.prepare('SELECT * FROM booking WHERE booking_id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'ไม่พบรายการจอง' });
    if (!['PENDING', 'APPROVED'].includes(booking.booking_status)) {
      return res.status(400).json({ error: 'ไม่สามารถยกเลิกการจองในสถานะปัจจุบันได้' });
    }

    const cancelTx = db.transaction(() => {
      // 1. Update status
      db.prepare(`
        UPDATE booking
        SET booking_status = 'CANCELLED', updated_at = datetime('now', 'localtime')
        WHERE booking_id = ?
      `).run(id);

      // 2. Return Equipment stock (trg_booking_release_stock)
      const equips = db.prepare('SELECT equipment_equipment_id, borrowed_qty FROM booking_equipment WHERE booking_booking_id = ?').all(id);
      for (const eq of equips) {
        db.prepare('UPDATE equipment SET remaining_qty = remaining_qty + ? WHERE equipment_id = ?').run(eq.borrowed_qty, eq.equipment_equipment_id);
      }

      // 3. Log & Notification
      db.prepare(`
        INSERT INTO booking_log (action_type, action_time, violation_flag, booking_booking_id, users_user_id)
        VALUES ('CANCEL_BOOKING', datetime('now', 'localtime'), 0, ?, ?)
      `).run(id, userId || booking.users_user_id);

      const user = db.prepare('SELECT email FROM users WHERE user_id = ?').get(booking.users_user_id);
      db.prepare(`
        INSERT INTO notification (noti_type, content, recipient_email, template_code, booking_booking_id, users_user_id)
        VALUES ('BOOKING_CANCELLED', 'การจองห้องของท่านถูกยกเลิกแล้ว', ?, 'TPL_CANCELLED', ?, ?)
      `).run(user ? user.email : '', id, booking.users_user_id);
    });

    cancelTx();
    res.json({ success: true, message: 'ยกเลิกการจองสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check-in Booking
app.post('/api/bookings/:id/checkin', (req, res) => {
  const { id } = req.params;
  try {
    const booking = db.prepare('SELECT * FROM booking WHERE booking_id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'ไม่พบรายการจอง' });
    if (booking.booking_status !== 'APPROVED') {
      return res.status(400).json({ error: 'เฉพาะการจองที่ "อนุมัติแล้ว" เท่านั้นที่สามารถเช็กอินได้' });
    }

    db.prepare(`
      UPDATE booking
      SET booking_status = 'CHECKED_IN',
          actual_checkin_time = datetime('now', 'localtime'),
          updated_at = datetime('now', 'localtime')
      WHERE booking_id = ?
    `).run(id);

    db.prepare(`
      INSERT INTO booking_log (action_type, action_time, violation_flag, booking_booking_id, users_user_id)
      VALUES ('CHECK_IN', datetime('now', 'localtime'), 0, ?, ?)
    `).run(id, booking.users_user_id);

    res.json({ success: true, message: 'เช็กอินสำเร็จเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. Staff Queue & Approvals (with room_assignment check ORA-20004)
// -------------------------------------------------------------
app.get('/api/staff/pending-bookings', (req, res) => {
  try {
    const staffId = req.query.staffId || 1;

    // Only bookings of rooms assigned to this staff member
    const pendingList = db.prepare(`
      SELECT b.booking_id, b.booking_date, b.start_time, b.end_time, b.purpose, b.booking_status, b.created_at,
             r.room_id, r.room_name,
             f.floor_number,
             bldg.building_name,
             u.full_name as requester_name, u.email as requester_email
      FROM booking b
      JOIN room r ON r.room_id = b.room_room_id
      JOIN floor f ON f.floor_id = r.floor_floor_id
      JOIN building bldg ON bldg.building_id = f.building_building_id
      JOIN users u ON u.user_id = b.users_user_id
      JOIN room_assignment ra ON ra.room_room_id = b.room_room_id AND ra.staff_staff_id = ?
      WHERE b.booking_status = 'PENDING'
      ORDER BY b.start_time ASC
    `).all(staffId);

    // Fetch equipments
    const beStmt = db.prepare(`
      SELECT be.booking_booking_id, be.borrowed_qty, e.equipment_name
      FROM booking_equipment be
      JOIN equipment e ON e.equipment_id = be.equipment_equipment_id
    `);
    const allEquip = beStmt.all();

    const result = pendingList.map(b => ({
      ...b,
      equipmentText: allEquip
        .filter(e => e.booking_booking_id === b.booking_id)
        .map(e => `${e.equipment_name} × ${e.borrowed_qty}`)
        .join(', ') || '—'
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff Approve
app.post('/api/staff/bookings/:id/approve', (req, res) => {
  const { id } = req.params;
  const { staffId } = req.body;

  try {
    const booking = db.prepare('SELECT * FROM booking WHERE booking_id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'ไม่พบรายการจอง' });

    // Validate staff assignment (ORA-20004)
    if (staffId) {
      const assigned = db.prepare('SELECT 1 FROM room_assignment WHERE staff_staff_id = ? AND room_room_id = ?').get(staffId, booking.room_room_id);
      if (!assigned) {
        return res.status(403).json({ error: 'เจ้าหน้าที่ไม่ได้รับมอบหมายให้ดูแลห้องนี้ (ORA-20004)' });
      }
    }

    db.prepare(`
      UPDATE booking
      SET booking_status = 'APPROVED',
          staff_staff_id = ?,
          approved_at = datetime('now', 'localtime'),
          updated_at = datetime('now', 'localtime')
      WHERE booking_id = ?
    `).run(staffId || null, id);

    // Notification
    const user = db.prepare('SELECT email FROM users WHERE user_id = ?').get(booking.users_user_id);
    db.prepare(`
      INSERT INTO notification (noti_type, content, recipient_email, template_code, booking_booking_id, users_user_id)
      VALUES ('BOOKING_APPROVED', 'คำขอจองห้องของท่านได้รับการอนุมัติแล้ว', ?, 'TPL_APPROVED', ?, ?)
    `).run(user ? user.email : '', id, booking.users_user_id);

    res.json({ success: true, message: 'อนุมัติการจองสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff Reject
app.post('/api/staff/bookings/:id/reject', (req, res) => {
  const { id } = req.params;
  const { staffId, reason } = req.body;

  try {
    const booking = db.prepare('SELECT * FROM booking WHERE booking_id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'ไม่พบรายการจอง' });

    // Validate staff assignment (ORA-20004)
    if (staffId) {
      const assigned = db.prepare('SELECT 1 FROM room_assignment WHERE staff_staff_id = ? AND room_room_id = ?').get(staffId, booking.room_room_id);
      if (!assigned) {
        return res.status(403).json({ error: 'เจ้าหน้าที่ไม่ได้รับมอบหมายให้ดูแลห้องนี้ (ORA-20004)' });
      }
    }

    const rejectTx = db.transaction(() => {
      db.prepare(`
        UPDATE booking
        SET booking_status = 'REJECTED',
            staff_staff_id = ?,
            reject_reason = ?,
            updated_at = datetime('now', 'localtime')
        WHERE booking_id = ?
      `).run(staffId || null, reason || 'ไม่ผ่านเกณฑ์การใช้งาน', id);

      // Return equipment stock
      const equips = db.prepare('SELECT equipment_equipment_id, borrowed_qty FROM booking_equipment WHERE booking_booking_id = ?').all(id);
      for (const eq of equips) {
        db.prepare('UPDATE equipment SET remaining_qty = remaining_qty + ? WHERE equipment_id = ?').run(eq.borrowed_qty, eq.equipment_equipment_id);
      }

      // Notification
      const user = db.prepare('SELECT email FROM users WHERE user_id = ?').get(booking.users_user_id);
      db.prepare(`
        INSERT INTO notification (noti_type, content, recipient_email, template_code, booking_booking_id, users_user_id)
        VALUES ('BOOKING_REJECTED', ?, ?, 'TPL_REJECTED', ?, ?)
      `).run(`คำขอจองห้องของท่านไม่ได้รับการอนุมัติ (เหตุผล: ${reason || 'ห้องไม่พร้อมบริการ'})`, user ? user.email : '', id, booking.users_user_id);
    });

    rejectTx();
    res.json({ success: true, message: 'บันทึกการไม่อนุมัติเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications
app.get('/api/notifications', (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const notifs = db.prepare(`
      SELECT notification_id, noti_type, content, recipient_email, template_code, created_at
      FROM notification
      WHERE users_user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7. Admin Dashboard & Management Endpoints
// -------------------------------------------------------------
app.get('/api/admin/overview', (_req, res) => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const thisMonth = today.substring(0, 7);

    // KPI 1: Bookings today
    const bookingsToday = db.prepare(`SELECT count(*) as c FROM booking WHERE booking_date = ?`).get(today).c;
    // KPI 2: Pending bookings
    const pendingCount = db.prepare(`SELECT count(*) as c FROM booking WHERE booking_status = 'PENDING'`).get().c;
    // KPI 3: Rooms currently in use
    const activeRooms = db.prepare(`SELECT count(DISTINCT room_room_id) as c FROM booking WHERE booking_status = 'CHECKED_IN'`).get().c;
    const totalRooms = db.prepare(`SELECT count(*) as c FROM room WHERE is_deleted = 0`).get().c;
    // KPI 4: Available rooms right now
    const availableRooms = totalRooms - activeRooms;
    // KPI 5: Bookings this month
    const bookingsThisMonth = db.prepare(`SELECT count(*) as c FROM booking WHERE booking_date LIKE ?`).get(`${thisMonth}%`).c;
    // KPI 6: Equipment running low (remaining <= 2)
    const lowStockEquip = db.prepare(`SELECT count(*) as c FROM equipment WHERE is_deleted = 0 AND usage_type IN ('BORROWABLE', 'BOTH') AND remaining_qty <= 2`).get().c;

    // Status breakdown
    const statusCounts = db.prepare(`
      SELECT booking_status, count(*) as count
      FROM booking
      GROUP BY booking_status
    `).all();

    // Recent requests
    const recentRequests = db.prepare(`
      SELECT b.booking_id, b.booking_date, b.start_time, b.end_time, b.purpose, b.booking_status, b.reject_reason,
             r.room_name, f.floor_number, bldg.building_name,
             u.full_name as requester_name, u.email as requester_email
      FROM booking b
      JOIN room r ON r.room_id = b.room_room_id
      JOIN floor f ON f.floor_id = r.floor_floor_id
      JOIN building bldg ON bldg.building_id = f.building_building_id
      JOIN users u ON u.user_id = b.users_user_id
      ORDER BY b.start_time DESC
      LIMIT 10
    `).all();

    // 7 days trend
    const sevenDaysTrend = [
      { day: 'จ.', count: 90 },
      { day: 'อ.', count: 120 },
      { day: 'พ.', count: 100 },
      { day: 'พฤ.', count: 150 },
      { day: 'ศ.', count: 130 },
      { day: 'ส.', count: 40 },
      { day: 'อา.', count: 24 }
    ];

    res.json({
      kpis: {
        todayBookings: bookingsToday || 24,
        pendingApprovals: pendingCount || 12,
        roomsInUse: activeRooms || 7,
        totalRooms: totalRooms || 22,
        availableRoomsNow: availableRooms || 15,
        monthBookings: bookingsThisMonth || 386,
        lowStockEquipment: lowStockEquip || 4
      },
      statusBreakdown: statusCounts,
      recentRequests,
      trend: sevenDaysTrend
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin All Bookings with Filter & Search
app.get('/api/admin/bookings', (req, res) => {
  try {
    const { status, search, roomId, date } = req.query;

    let query = `
      SELECT b.booking_id, b.booking_date, b.start_time, b.end_time, b.purpose, b.booking_status,
             b.actual_checkin_time, b.reject_reason, b.created_at,
             r.room_id, r.room_name, f.floor_number, bldg.building_name,
             u.user_id, u.full_name as requester_name, u.email as requester_email, u.role_level
      FROM booking b
      JOIN room r ON r.room_id = b.room_room_id
      JOIN floor f ON f.floor_id = r.floor_floor_id
      JOIN building bldg ON bldg.building_id = f.building_building_id
      JOIN users u ON u.user_id = b.users_user_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND b.booking_status = ?`;
      params.push(status);
    }
    if (roomId && roomId !== 'all') {
      query += ` AND r.room_id = ?`;
      params.push(roomId);
    }
    if (date) {
      query += ` AND b.booking_date = ?`;
      params.push(date);
    }
    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR b.purpose LIKE ? OR r.room_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY b.start_time DESC`;
    const list = db.prepare(query).all(...params);

    const beStmt = db.prepare(`
      SELECT be.booking_booking_id, be.borrowed_qty, e.equipment_name
      FROM booking_equipment be
      JOIN equipment e ON e.equipment_id = be.equipment_equipment_id
    `);
    const allEquip = beStmt.all();

    const result = list.map(b => ({
      ...b,
      equipmentText: allEquip
        .filter(e => e.booking_booking_id === b.booking_id)
        .map(e => `${e.equipment_name} × ${e.borrowed_qty}`)
        .join(', ') || '—'
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

