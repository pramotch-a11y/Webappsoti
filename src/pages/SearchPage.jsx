import { useState, useEffect } from 'react';
import { RoomCard } from '../components/RoomCard';
import { api } from '../services/api';

export function SearchPage({ onBook, searchParams, setSearchParams }) {
  const [rooms, setRooms] = useState([]);
  const [metadata, setMetadata] = useState({ buildings: [], roomTypes: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch buildings and room types lookup
  useEffect(() => {
    let isMounted = true;
    api.getFacilitiesMetadata()
      .then(data => {
        if (isMounted) {
          setMetadata({
            buildings: data.buildings || [],
            roomTypes: data.roomTypes || []
          });
        }
      })
      .catch(err => {
        console.error('Failed to load metadata', err);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchRooms = () => {
      api.searchRooms(searchParams)
        .then(data => {
          if (isMounted) {
            setRooms(data);
            setLoading(false);
          }
        })
        .catch(err => {
          if (isMounted) {
            setError(err.message || 'ไม่สามารถค้นหาห้องได้');
            setLoading(false);
          }
        });
    };

    fetchRooms();
    return () => { isMounted = false; };
  }, [searchParams]);

  const handleFilterChange = (field, val) => {
    setSearchParams(prev => ({ ...prev, [field]: val }));
  };

  const handleManualSearch = () => {
    setLoading(true);
    setError('');
    api.searchRooms(searchParams)
      .then(data => setRooms(data))
      .catch(err => setError(err.message || 'ไม่สามารถค้นหาห้องได้'))
      .finally(() => setLoading(false));
  };

  return (
    <main className="search-page">
      {/* Sidebar Filter */}
      <aside className="filter card">
        <h3>ค้นหาห้องว่าง</h3>
        
        <label>
          วันที่
          <input
            type="date"
            value={searchParams.date}
            onChange={e => handleFilterChange('date', e.target.value)}
          />
        </label>

        <div className="twocol">
          <label>
            เริ่ม
            <input
              type="time"
              value={searchParams.startTime}
              onChange={e => handleFilterChange('startTime', e.target.value)}
            />
          </label>
          <label>
            สิ้นสุด
            <input
              type="time"
              value={searchParams.endTime}
              onChange={e => handleFilterChange('endTime', e.target.value)}
            />
          </label>
        </div>

        <label>
          อาคาร
          <select
            value={searchParams.buildingId}
            onChange={e => handleFilterChange('buildingId', e.target.value)}
          >
            <option value="all">ทุกอาคาร</option>
            {metadata.buildings.map(b => (
              <option key={b.building_id} value={b.building_id}>
                {b.building_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          ประเภทห้อง
          <select
            value={searchParams.roomTypeId}
            onChange={e => handleFilterChange('roomTypeId', e.target.value)}
          >
            <option value="all">ทุกประเภท</option>
            {metadata.roomTypes.map(rt => (
              <option key={rt.room_type_id} value={rt.room_type_id}>
                {rt.type_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          ความจุขั้นต่ำ
          <input
            type="number"
            min="1"
            value={searchParams.minCapacity}
            onChange={e => handleFilterChange('minCapacity', e.target.value)}
          />
        </label>

        <button className="btn-primary" onClick={handleManualSearch} disabled={loading}>
          {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </aside>

      {/* Results Section */}
      <section className="results">
        <div className="results-head">
          <h1>พบ {rooms.length} ห้องว่าง</h1>
          <span className="results-legend">
            แถบสีเขียว = ว่าง · เทา = มีการจองแล้ว (09:00–17:00)
          </span>
        </div>

        {error && (
          <div className="alert-box error-alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-box">กำลังโหลดข้อมูลห้องว่าง...</div>
        ) : rooms.length === 0 ? (
          <div className="empty-box">ไม่พบห้องว่างตามเงื่อนไขที่ระบุ</div>
        ) : (
          <div className="room-grid">
            {rooms.map(room => (
              <RoomCard
                key={room.room_id}
                room={room}
                onBook={onBook}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
