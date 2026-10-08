import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(dbDir, 'safordata.db');

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // Schema strictly matching SAfordata.ddl & SAfordata_fixes.sql naming & rules
  db.exec(`
    CREATE TABLE IF NOT EXISTS affiliation (
      affiliation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      affiliation_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      role_level TEXT CHECK(role_level IN ('STUDENT','TEACHER','STAFF','ADMIN')),
      account_status TEXT CHECK(account_status IN ('ACTIVE','SUSPENDED','INACTIVE')) DEFAULT 'ACTIVE',
      affiliation_affiliation_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0,1)),
      deleted_at DATETIME,
      FOREIGN KEY (affiliation_affiliation_id) REFERENCES affiliation(affiliation_id)
    );

    CREATE TABLE IF NOT EXISTS staff (
      staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_title TEXT,
      start_date DATE,
      staff_status TEXT DEFAULT 'ACTIVE',
      users_user_id INTEGER UNIQUE NOT NULL,
      FOREIGN KEY (users_user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS building (
      building_id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_name TEXT NOT NULL,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS floor (
      floor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      floor_number TEXT NOT NULL,
      building_building_id INTEGER NOT NULL,
      FOREIGN KEY (building_building_id) REFERENCES building(building_id)
    );

    CREATE TABLE IF NOT EXISTS room_type (
      room_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS room (
      room_id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_name TEXT NOT NULL,
      capacity INTEGER,
      room_status TEXT CHECK(room_status IN ('AVAILABLE','MAINTENANCE','CLOSED')) DEFAULT 'AVAILABLE',
      image_url TEXT,
      floor_floor_id INTEGER,
      room_type_room_type_id INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0,1)),
      deleted_at DATETIME,
      FOREIGN KEY (floor_floor_id) REFERENCES floor(floor_id),
      FOREIGN KEY (room_type_room_type_id) REFERENCES room_type(room_type_id)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      equipment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_name TEXT NOT NULL,
      equipment_type TEXT,
      equipment_status TEXT CHECK(equipment_status IN ('AVAILABLE','IN_USE','MAINTENANCE','BROKEN')) DEFAULT 'AVAILABLE',
      total_qty INTEGER NOT NULL CHECK(total_qty >= 0),
      remaining_qty INTEGER NOT NULL DEFAULT 0 CHECK(remaining_qty >= 0 AND remaining_qty <= total_qty),
      usage_type TEXT CHECK(usage_type IN ('FIXED','BORROWABLE','BOTH')) DEFAULT 'BORROWABLE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by_user_id INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0,1)),
      deleted_at DATETIME,
      FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS room_equipment (
      room_room_id INTEGER NOT NULL,
      equipment_equipment_id INTEGER NOT NULL,
      quantity INTEGER CHECK(quantity > 0),
      equip_status TEXT DEFAULT 'AVAILABLE',
      PRIMARY KEY (room_room_id, equipment_equipment_id),
      FOREIGN KEY (room_room_id) REFERENCES room(room_id),
      FOREIGN KEY (equipment_equipment_id) REFERENCES equipment(equipment_id)
    );

    CREATE TABLE IF NOT EXISTS holiday (
      holiday_id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date DATE NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS penalty (
      penalty_id INTEGER PRIMARY KEY AUTOINCREMENT,
      penalty_type TEXT,
      start_date DATE,
      end_date DATE,
      reason TEXT,
      penalty_status TEXT CHECK(penalty_status IN ('ACTIVE','EXPIRED','REVOKED')) DEFAULT 'ACTIVE',
      users_user_id INTEGER NOT NULL,
      staff_staff_id INTEGER,
      booking_booking_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (users_user_id) REFERENCES users(user_id),
      FOREIGN KEY (staff_staff_id) REFERENCES staff(staff_id)
    );

    CREATE TABLE IF NOT EXISTS room_assignment (
      staff_staff_id INTEGER NOT NULL,
      room_room_id INTEGER NOT NULL,
      start_date DATE,
      work_shift TEXT,
      PRIMARY KEY (staff_staff_id, room_room_id),
      FOREIGN KEY (staff_staff_id) REFERENCES staff(staff_id),
      FOREIGN KEY (room_room_id) REFERENCES room(room_id)
    );

    CREATE TABLE IF NOT EXISTS booking (
      booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_date DATE NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      purpose TEXT,
      booking_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(booking_status IN ('PENDING','APPROVED','REJECTED','CANCELLED','CHECKED_IN','COMPLETED','NO_SHOW')),
      actual_checkin_time DATETIME,
      users_user_id INTEGER NOT NULL,
      room_room_id INTEGER NOT NULL,
      staff_staff_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      reject_reason TEXT,
      FOREIGN KEY (users_user_id) REFERENCES users(user_id),
      FOREIGN KEY (room_room_id) REFERENCES room(room_id),
      FOREIGN KEY (staff_staff_id) REFERENCES staff(staff_id)
    );

    CREATE TABLE IF NOT EXISTS booking_participant (
      booking_booking_id INTEGER NOT NULL,
      users_user_id INTEGER NOT NULL,
      participation_status TEXT CHECK(participation_status IN ('INVITED','ACCEPTED','DECLINED','ATTENDED')) DEFAULT 'INVITED',
      PRIMARY KEY (booking_booking_id, users_user_id),
      FOREIGN KEY (booking_booking_id) REFERENCES booking(booking_id),
      FOREIGN KEY (users_user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS booking_equipment (
      booking_booking_id INTEGER NOT NULL,
      equipment_equipment_id INTEGER NOT NULL,
      borrowed_qty INTEGER NOT NULL CHECK(borrowed_qty > 0),
      PRIMARY KEY (booking_booking_id, equipment_equipment_id),
      FOREIGN KEY (booking_booking_id) REFERENCES booking(booking_id),
      FOREIGN KEY (equipment_equipment_id) REFERENCES equipment(equipment_id)
    );

    CREATE TABLE IF NOT EXISTS booking_log (
      booking_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      action_time DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      violation_flag INTEGER NOT NULL DEFAULT 0 CHECK(violation_flag IN (0,1)),
      booking_booking_id INTEGER NOT NULL,
      users_user_id INTEGER NOT NULL,
      FOREIGN KEY (booking_booking_id) REFERENCES booking(booking_id),
      FOREIGN KEY (users_user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS notification (
      notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
      noti_type TEXT CHECK(noti_type IN ('BOOKING_CREATED','BOOKING_APPROVED','BOOKING_REJECTED','BOOKING_CANCELLED','REMINDER','PENALTY')),
      content TEXT,
      recipient_email TEXT,
      send_time DATETIME,
      template_code TEXT NOT NULL,
      params_json TEXT,
      booking_booking_id INTEGER,
      users_user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_booking_id) REFERENCES booking(booking_id),
      FOREIGN KEY (users_user_id) REFERENCES users(user_id)
    );
  `);

  // Seed initial data if affiliation table is empty
  const count = db.prepare('SELECT count(*) as count FROM affiliation').get();
  if (count.count === 0) {
    seedData();
  }
}

function seedData() {
  const insertAffiliation = db.prepare('INSERT INTO affiliation (affiliation_name) VALUES (?)');
  const affEdu = insertAffiliation.run('คณะเทคโนโลยีสารสนเทศ').lastInsertRowid;
  const affStaff = insertAffiliation.run('สำนักงานบริหารอาคารสถานที่').lastInsertRowid;

  // Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, phone, role_level, account_status, affiliation_affiliation_id)
    VALUES (?, ?, ?, ?, 'ACTIVE', ?)
  `);

  const user1 = insertUser.run('สมชาย ใจดี', 'somchai@example.edu', '081-111-2222', 'STUDENT', affEdu).lastInsertRowid;
  const user2 = insertUser.run('สมหญิง รักเรียน', 'somying@example.edu', '082-222-3333', 'STUDENT', affEdu).lastInsertRowid;
  const _user3 = insertUser.run('อาจารย์กานต์ พิชาญ', 'karn@example.edu', '083-333-4444', 'TEACHER', affEdu).lastInsertRowid;
  const userStaff = insertUser.run('สมบัติ ดูแลดี (เจ้าหน้าที่)', 'sombat.staff@example.edu', '084-555-6666', 'STAFF', affStaff).lastInsertRowid;
  const userAdmin = insertUser.run('ผู้ดูแลระบบ', 'admin@example.edu', '089-999-9999', 'ADMIN', affStaff).lastInsertRowid;

  // Insert Staff
  const insertStaff = db.prepare('INSERT INTO staff (job_title, start_date, staff_status, users_user_id) VALUES (?, ?, ?, ?)');
  const staff1 = insertStaff.run('ผู้ดูแลอาคาร A และ B', '2025-01-01', 'ACTIVE', userStaff).lastInsertRowid;
  const staffAdmin = insertStaff.run('ผู้ดูแลระบบหลัก (ADMIN)', '2024-01-01', 'ACTIVE', userAdmin).lastInsertRowid;


  // Insert Buildings & Floors
  const insertBuilding = db.prepare('INSERT INTO building (building_name, address) VALUES (?, ?)');
  const bldgA = insertBuilding.run('อาคาร A', 'อาคารเรียนรวมและนวัตกรรม').lastInsertRowid;
  const bldgB = insertBuilding.run('อาคาร B', 'อาคารศูนย์การเรียนรู้').lastInsertRowid;

  const insertFloor = db.prepare('INSERT INTO floor (floor_number, building_building_id) VALUES (?, ?)');
  const floorA3 = insertFloor.run('ชั้น 3', bldgA).lastInsertRowid;
  const floorA5 = insertFloor.run('ชั้น 5', bldgA).lastInsertRowid;
  const floorB2 = insertFloor.run('ชั้น 2', bldgB).lastInsertRowid;

  // Room Types
  const insertRoomType = db.prepare('INSERT INTO room_type (type_name, description) VALUES (?, ?)');
  const typeMeeting = insertRoomType.run('ห้องประชุมกลุ่ม', 'สำหรับการประชุมและระดมความคิดเห็น').lastInsertRowid;
  const typeStudy = insertRoomType.run('ห้องติว', 'ห้องติวหนังสือกลุ่มย่อย').lastInsertRowid;
  const typeSeminar = insertRoomType.run('ห้องสัมมนา', 'ห้องสัมมนาและนำเสนอขนาดใหญ่').lastInsertRowid;

  // Rooms matching screenshots
  const insertRoom = db.prepare(`
    INSERT INTO room (room_name, capacity, room_status, image_url, floor_floor_id, room_type_room_type_id)
    VALUES (?, ?, 'AVAILABLE', ?, ?, ?)
  `);
  const room301 = insertRoom.run('ห้องประชุม 301', 10, null, floorA3, typeMeeting).lastInsertRowid;
  const room204 = insertRoom.run('ห้องติว 204', 6, null, floorB2, typeStudy).lastInsertRowid;
  const room502 = insertRoom.run('ห้องสัมมนา 502', 30, null, floorA5, typeSeminar).lastInsertRowid;

  // Room assignment to staff1
  const insertRoomAssign = db.prepare('INSERT INTO room_assignment (staff_staff_id, room_room_id, start_date, work_shift) VALUES (?, ?, ?, ?)');
  insertRoomAssign.run(staff1, room301, '2026-01-01', 'DAY');
  insertRoomAssign.run(staff1, room204, '2026-01-01', 'DAY');
  insertRoomAssign.run(staff1, room502, '2026-01-01', 'DAY');

  insertRoomAssign.run(staffAdmin, room301, '2026-01-01', 'DAY');
  insertRoomAssign.run(staffAdmin, room204, '2026-01-01', 'DAY');
  insertRoomAssign.run(staffAdmin, room502, '2026-01-01', 'DAY');


  // Equipment
  const insertEquip = db.prepare(`
    INSERT INTO equipment (equipment_name, equipment_type, equipment_status, total_qty, remaining_qty, usage_type, created_by_user_id)
    VALUES (?, ?, 'AVAILABLE', ?, ?, ?, ?)
  `);
  // Borrowable items
  const eqMic = insertEquip.run('ไมโครโฟนไร้สาย', 'AUDIO', 5, 4, 'BORROWABLE', userStaff).lastInsertRowid;
  const eqHdmi = insertEquip.run('สายต่อ HDMI', 'CABLE', 10, 9, 'BORROWABLE', userStaff).lastInsertRowid;
  const _eqPen = insertEquip.run('ปากกาไวท์บอร์ด (ชุด)', 'STATIONERY', 15, 12, 'BORROWABLE', userStaff).lastInsertRowid;

  // Fixed room equipment
  const eqProj = insertEquip.run('โปรเจคเตอร์', 'AV', 3, 0, 'FIXED', userStaff).lastInsertRowid;
  const eqWb = insertEquip.run('ไวท์บอร์ด', 'FURNITURE', 3, 0, 'FIXED', userStaff).lastInsertRowid;
  const eqPlug = insertEquip.run('ปลั๊กไฟ', 'ELECTRICAL', 3, 0, 'FIXED', userStaff).lastInsertRowid;
  const eqAudio = insertEquip.run('ระบบเสียง', 'AUDIO', 1, 0, 'FIXED', userStaff).lastInsertRowid;

  // Room equipment mapping
  const insertRoomEquip = db.prepare('INSERT INTO room_equipment (room_room_id, equipment_equipment_id, quantity) VALUES (?, ?, ?)');
  // Room 301: โปรเจคเตอร์ · ไวท์บอร์ด · ปลั๊กไฟ
  insertRoomEquip.run(room301, eqProj, 1);
  insertRoomEquip.run(room301, eqWb, 1);
  insertRoomEquip.run(room301, eqPlug, 1);

  // Room 204: ไวท์บอร์ด · ปลั๊กไฟ
  insertRoomEquip.run(room204, eqWb, 1);
  insertRoomEquip.run(room204, eqPlug, 1);

  // Room 502: โปรเจคเตอร์ · ระบบเสียง · ไมโครโฟน
  insertRoomEquip.run(room502, eqProj, 1);
  insertRoomEquip.run(room502, eqAudio, 1);
  insertRoomEquip.run(room502, eqMic, 1);

  // Holidays
  const insertHoliday = db.prepare('INSERT INTO holiday (holiday_date, description) VALUES (?, ?)');
  insertHoliday.run('2026-10-13', 'วันคล้ายวันสวรรคต ร.9');
  insertHoliday.run('2026-10-23', 'วันปิยมหาราช');
  insertHoliday.run('2026-12-05', 'วันพ่อแห่งชาติ');
  insertHoliday.run('2026-12-31', 'วันสิ้นปี');

  // Bookings corresponding to screenshots
  const insertBooking = db.prepare(`
    INSERT INTO booking (booking_date, start_time, end_time, purpose, booking_status, actual_checkin_time, users_user_id, room_room_id, staff_staff_id, reject_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. รออนุมัติ: 12 ต.ค. 2569 09:00 - 11:00 ห้อง 301
  const b1 = insertBooking.run('2026-10-12', '2026-10-12 09:00:00', '2026-10-12 11:00:00', 'ประชุมกลุ่มโปรเจกต์', 'PENDING', null, user1, room301, null, null, '2026-10-07 10:00:00').lastInsertRowid;
  // 2. อนุมัติแล้ว: 9 ต.ค. 2569 13:00 - 15:00 ห้อง 204
  const b2 = insertBooking.run('2026-10-09', '2026-10-09 13:00:00', '2026-10-09 15:00:00', 'ติวสอบกลางภาค', 'APPROVED', null, user1, room204, staff1, null, '2026-10-06 09:00:00').lastInsertRowid;
  // 3. กำลังใช้งาน (CHECKED_IN): 8 ต.ค. 2569 10:00 - 12:00 ห้อง 502 (เช็กอินเมื่อ 09:58)
  const b3 = insertBooking.run('2026-10-08', '2026-10-08 10:00:00', '2026-10-08 12:00:00', 'ซ้อมนำเสนอ', 'CHECKED_IN', '2026-10-08 09:58:00', user1, room502, staff1, null, '2026-10-05 14:00:00').lastInsertRowid;
  // 4. ไม่อนุมัติ: 3 ต.ค. 2569 14:00 - 16:00 ห้อง 204
  const b4 = insertBooking.run('2026-10-03', '2026-10-03 14:00:00', '2026-10-03 16:00:00', 'ทำรายงานกลุ่ม', 'REJECTED', null, user1, room204, staff1, 'ห้องปิดซ่อมบำรุง', '2026-10-01 11:00:00').lastInsertRowid;
  // 5. เสร็จสิ้น: 30 ก.ย. 2569 09:00 - 11:00 ห้อง 301
  const b5 = insertBooking.run('2026-09-30', '2026-09-30 09:00:00', '2026-09-30 11:00:00', 'ประชุมกลุ่มโปรเจกต์', 'COMPLETED', '2026-09-30 08:55:00', user1, room301, staff1, null, '2026-09-28 10:00:00').lastInsertRowid;

  // Booking Participants
  const insertParticipant = db.prepare('INSERT INTO booking_participant (booking_booking_id, users_user_id, participation_status) VALUES (?, ?, ?)');
  insertParticipant.run(b1, user1, 'ACCEPTED');
  insertParticipant.run(b1, user2, 'INVITED');

  // Booking Equipment
  const insertBookingEquip = db.prepare('INSERT INTO booking_equipment (booking_booking_id, equipment_equipment_id, borrowed_qty) VALUES (?, ?, ?)');
  insertBookingEquip.run(b1, eqMic, 1);
  insertBookingEquip.run(b3, eqHdmi, 1);
  insertBookingEquip.run(b5, eqMic, 1);

  // Notifications
  const insertNoti = db.prepare(`
    INSERT INTO notification (noti_type, content, recipient_email, template_code, booking_booking_id, users_user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertNoti.run('BOOKING_APPROVED', 'คำขอจองห้องติว 204 ในวันที่ 9 ต.ค. ได้รับการอนุมัติแล้ว', 'somchai@example.edu', 'TPL_APPROVED', b2, user1);
  insertNoti.run('BOOKING_REJECTED', 'คำขอจองห้องติว 204 ในวันที่ 3 ต.ค. ไม่ได้รับการอนุมัติ (เหตุผล: ห้องปิดซ่อมบำรุง)', 'somchai@example.edu', 'TPL_REJECTED', b4, user1);
  insertNoti.run('BOOKING_CREATED', 'สร้างคำขอจองห้องประชุม 301 เรียบร้อยแล้ว อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบ', 'somchai@example.edu', 'TPL_CREATED', b1, user1);

  console.log('Seeded database with initial SAfordata room booking data successfully.');
}
