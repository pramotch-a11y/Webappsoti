import { supabase } from '../lib/supabase';

function requireClient() {
  if (!supabase) {
    throw new Error('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY');
  }
  return supabase;
}

export const supabaseApi = {
  async signUp({ email, password, fullName, phone, roleLevel }) {
    const client = requireClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, role_level: roleLevel } }
    });
    if (error) throw error;
    if (data.user) {
      const { error: profileError } = await client.from('users').insert({
        auth_user_id: data.user.id,
        full_name: fullName,
        email,
        phone: phone || null,
        role_level: roleLevel,
        account_status: 'ACTIVE',
        is_deleted: 0
      });
      if (profileError) throw profileError;
    }
    return data;
  },

  async signIn(email, password) {
    const client = requireClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const staff = Array.isArray(data.staff) ? data.staff[0] : data.staff;
    return { ...data, staff_id: staff?.staff_id, job_title: staff?.job_title };
  },

  async signOut() {
    const client = requireClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async currentProfile() {
    const client = requireClient();
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) return null;

    const { data: profiles, error } = await client
      .from('users')
      .select('*, staff(*)')
      .eq('auth_user_id', authData.user.id)
      .eq('is_deleted', 0)
      .limit(1);
    if (error) throw error;
    const data = profiles?.[0];
    if (!data) return null;
    return data;
  },

  async searchRooms({ date, startTime, endTime, buildingId = 'all', roomTypeId = 'all', minCapacity = 0 }) {
    const client = requireClient();
    let query = client
      .from('room')
      .select('*, floor(*, building(*)), room_type(*)')
      .eq('is_deleted', 0)
      .eq('room_status', 'AVAILABLE')
      .gte('capacity', Number(minCapacity) || 0);
    if (buildingId !== 'all') query = query.eq('floor.building_building_id', buildingId);
    if (roomTypeId !== 'all') query = query.eq('room_type_room_type_id', roomTypeId);
    const { data, error } = await query;
    if (error) throw error;

    const start = `${date}T${startTime}:00`;
    const end = `${date}T${endTime}:00`;
    const { data: conflicts, error: conflictError } = await client
      .from('booking')
      .select('room_room_id')
      .in('booking_status', ['PENDING', 'APPROVED', 'CHECKED_IN'])
      .lt('start_time', end)
      .gt('end_time', start);
    if (conflictError) throw conflictError;
    const blocked = new Set((conflicts || []).map(item => item.room_room_id));
    return (data || []).filter(room => !blocked.has(room.room_id));
  }
};
