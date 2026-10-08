import { TimelineBar } from '../components/TimelineBar';

export function RoomCard({ room, onBook }) {
  return (
    <article className="room-card card">
      <div className="room-image">
        <span>[ภาพห้อง]</span>
      </div>
      <div className="room-body">
        <div className="room-title">
          <h3>{room.room_name}</h3>
          <span className={`pill ${room.statusColor || 'green'}`}>
            {room.displayStatus || 'ว่าง'}
          </span>
        </div>
        <p className="room-meta">{room.meta}</p>
        <p className="room-tools muted">{room.tools}</p>
        
        <TimelineBar slots={room.slots} />

        <button
          className="btn-primary"
          onClick={() => onBook(room)}
          disabled={room.displayStatus === 'ไม่ว่าง'}
        >
          {room.displayStatus === 'ไม่ว่าง' ? 'ไม่ว่างในช่วงเวลานี้' : 'จองห้องนี้'}
        </button>
      </div>
    </article>
  );
}
