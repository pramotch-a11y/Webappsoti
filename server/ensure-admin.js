import { db } from './db.js';

const admin = db.prepare('SELECT user_id FROM users WHERE email = ?').get('admin@example.edu');
if (!admin) {
  const aff = db.prepare('SELECT affiliation_id FROM affiliation LIMIT 1').get().affiliation_id;
  const uid = db.prepare(`
    INSERT INTO users (full_name, email, phone, role_level, account_status, affiliation_affiliation_id)
    VALUES ('ผู้ดูแลระบบ', 'admin@example.edu', '089-999-9999', 'ADMIN', 'ACTIVE', ?)
  `).run(aff).lastInsertRowid;

  const sid = db.prepare(`
    INSERT INTO staff (job_title, start_date, staff_status, users_user_id)
    VALUES ('ผู้ดูแลระบบหลัก (ADMIN)', date('now'), 'ACTIVE', ?)
  `).run(uid).lastInsertRowid;

  const rooms = db.prepare('SELECT room_id FROM room').all();
  const assignStmt = db.prepare("INSERT OR IGNORE INTO room_assignment (staff_staff_id, room_room_id, start_date, work_shift) VALUES (?, ?, date('now'), 'DAY')");
  for (const r of rooms) {
    assignStmt.run(sid, r.room_id);
  }
  console.log('Admin user added successfully!');
} else {
  console.log('Admin already exists.');
}
