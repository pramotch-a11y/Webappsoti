import { BOOKING_STATUS } from '../constants/status';

export function StatusBadge({ status, reason }) {
  const conf = BOOKING_STATUS[status] || {
    label: status,
    bg: '#e4e8eb',
    color: '#62707a'
  };

  return (
    <div className="status-cell">
      <span
        className="status-pill"
        style={{ backgroundColor: conf.bg, color: conf.color }}
      >
        {conf.label}
      </span>
      {status === 'REJECTED' && reason && (
        <small className="status-reason">เหตุผล: {reason}</small>
      )}
    </div>
  );
}
