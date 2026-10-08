const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Users & Auth
  getUsers: () => fetch(`${API_BASE}/auth/users`).then(handleResponse),
  login: (email) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).then(handleResponse),

  register: (payload) =>
    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(handleResponse),



  // Metadata
  getFacilitiesMetadata: () => fetch(`${API_BASE}/facilities/metadata`).then(handleResponse),

  // Search rooms with availability
  searchRooms: (params) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/rooms/search?${q}`).then(handleResponse);
  },

  // Create booking
  createBooking: (payload) =>
    fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(handleResponse),

  // My bookings
  getMyBookings: (userId) =>
    fetch(`${API_BASE}/bookings/my?userId=${userId}`).then(handleResponse),

  // Cancel booking
  cancelBooking: (id, userId) =>
    fetch(`${API_BASE}/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).then(handleResponse),

  // Check-in
  checkinBooking: (id) =>
    fetch(`${API_BASE}/bookings/${id}/checkin`, {
      method: 'POST'
    }).then(handleResponse),

  // Staff approvals
  getPendingBookings: (staffId) =>
    fetch(`${API_BASE}/staff/pending-bookings?staffId=${staffId}`).then(handleResponse),

  // Admin Dashboard & Manage requests
  getAdminOverview: () =>
    fetch(`${API_BASE}/admin/overview`).then(handleResponse),

  getAdminBookings: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/admin/bookings?${q}`).then(handleResponse);
  },


  approveBooking: (id, staffId) =>
    fetch(`${API_BASE}/staff/bookings/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId })
    }).then(handleResponse),

  rejectBooking: (id, staffId, reason) =>
    fetch(`${API_BASE}/staff/bookings/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, reason })
    }).then(handleResponse),

  // Notifications
  getNotifications: (userId) =>
    fetch(`${API_BASE}/notifications?userId=${userId}`).then(handleResponse)
};
