import { useState, useEffect } from 'react';
import './App.css';
import { Header } from './components/Header';
import { SearchPage } from './pages/SearchPage';
import { BookingPage } from './pages/BookingPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { StaffApprovalPage } from './pages/StaffApprovalPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/AdminLayout';
import { api } from './services/api';

export default function App() {
  const [tab, setTab] = useState('search');
  const [adminMode, setAdminMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('safordata_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Search parameters persisted across navigation
  const [searchParams, setSearchParams] = useState({
    date: '2026-10-12',
    startTime: '09:00',
    endTime: '11:00',
    buildingId: 'all',
    roomTypeId: 'all',
    minCapacity: '6'
  });

  // Load available users for switcher
  useEffect(() => {
    api.getUsers()
      .then(userList => {
        setUsers(userList);
      })
      .catch(err => {
        console.error('Failed to load users', err);
      });
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('safordata_user', JSON.stringify(user));
    if (user.role_level === 'ADMIN' || user.role_level === 'STAFF') {
      setAdminMode(true);
    } else {
      setAdminMode(false);
      setTab('search');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAdminMode(false);
    localStorage.removeItem('safordata_user');
  };


  const handleSelectUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('safordata_user', JSON.stringify(user));
  };

  const handleStartBooking = (room) => {
    setSelectedRoom(room);
    setTab('book');
  };

  const handleRebook = (booking) => {
    setSelectedRoom({
      room_id: booking.room_id,
      room_name: booking.room_name,
      building_name: booking.building_name,
      floor_number: booking.floor_number,
      capacity: 10
    });
    setTab('book');
  };

  // If not logged in, show Login page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If Admin / Staff Dashboard mode
  if (adminMode && (currentUser.role_level === 'ADMIN' || currentUser.role_level === 'STAFF')) {
    return (
      <AdminLayout
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchToUserView={() => setAdminMode(false)}
      />
    );
  }

  return (
    <div className="app-container">

      <Header
        tab={tab}
        setTab={setTab}
        currentUser={currentUser}
        users={users}
        onSelectUser={handleSelectUser}
        onLogout={handleLogout}
        onSwitchToAdminView={() => setAdminMode(true)}
      />


      {tab === 'search' && (
        <SearchPage
          onBook={handleStartBooking}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
      )}

      {tab === 'book' && (
        <BookingPage
          room={selectedRoom}
          searchParams={searchParams}
          currentUser={currentUser}
          onBack={() => setTab('search')}
          onSuccess={() => setTab('bookings')}
        />
      )}

      {tab === 'bookings' && (
        <MyBookingsPage
          currentUser={currentUser}
          onRebook={handleRebook}
        />
      )}

      {tab === 'staff' && (
        <StaffApprovalPage
          currentUser={currentUser}
        />
      )}

      {tab === 'alerts' && (
        <NotificationsPage
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
