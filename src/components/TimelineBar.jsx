export function TimelineBar({ slots }) {
  // slots is an array of 8 elements representing 09:00 - 17:00
  // 'FREE' -> green (#63caa3), 'BUSY' -> gray (#c7d1d7)
  const safeSlots = slots && slots.length === 8 ? slots : Array(8).fill('FREE');

  return (
    <div className="availability-bar" title="ช่วงเวลา 09:00 - 17:00">
      {safeSlots.map((slot, index) => (
        <i
          key={index}
          className={`slot-block ${slot === 'BUSY' ? 'off' : ''}`}
        />
      ))}
    </div>
  );
}
