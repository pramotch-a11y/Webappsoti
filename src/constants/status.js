// Status mappings matching Oracle constraint values in SAfordata_fixes.sql
export const BOOKING_STATUS = {
  PENDING: {
    label: 'รออนุมัติ',
    className: 's-pending',
    bg: '#ffedbf',
    color: '#94660a'
  },
  APPROVED: {
    label: 'อนุมัติแล้ว',
    className: 's-approved',
    bg: '#d5f2e6',
    color: '#287f6c'
  },
  CHECKED_IN: {
    label: 'กำลังใช้งาน',
    className: 's-checked-in',
    bg: '#dce8fb',
    color: '#446aa6'
  },
  REJECTED: {
    label: 'ไม่อนุมัติ',
    className: 's-rejected',
    bg: '#f9dcd6',
    color: '#b14a3d'
  },
  CANCELLED: {
    label: 'ยกเลิก',
    className: 's-cancelled',
    bg: '#f1f3f5',
    color: '#6c757d'
  },
  COMPLETED: {
    label: 'เสร็จสิ้น',
    className: 's-completed',
    bg: '#e4e8eb',
    color: '#62707a'
  },
  NO_SHOW: {
    label: 'ไม่เข้าใช้ (No-show)',
    className: 's-noshow',
    bg: '#fee2e2',
    color: '#991b1b'
  }
};

export const PARTICIPATION_STATUS = {
  INVITED: { label: 'รอตอบรับ', className: 'tag-yellow' },
  ACCEPTED: { label: 'เข้าร่วมแล้ว', className: 'tag-green' },
  DECLINED: { label: 'ปฏิเสธ', className: 'tag-gray' },
  ATTENDED: { label: 'เช็กชื่อแล้ว', className: 'tag-blue' }
};

export const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function formatThaiDate(dateStr, includeYear = true) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;
  return includeYear ? `${day} ${month} ${thaiYear}` : `${day} ${month}`;
}

export function formatTimeRange(startStr, endStr) {
  if (!startStr || !endStr) return '';
  const s = new Date(startStr.replace(' ', 'T'));
  const e = new Date(endStr.replace(' ', 'T'));
  const sHours = String(s.getHours()).padStart(2, '0');
  const sMins = String(s.getMinutes()).padStart(2, '0');
  const eHours = String(e.getHours()).padStart(2, '0');
  const eMins = String(e.getMinutes()).padStart(2, '0');
  return `${sHours}:${sMins}–${eHours}:${eMins}`;
}
