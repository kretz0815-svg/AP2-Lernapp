import { supabase } from '../../supabaseClient';

/**
 * Service to handle all Stadt, Land, Fluss interactions with Supabase Realtime and DB.
 */
export const slfService = {
  /**
   * Room Management
   */
  async createRoom(hostId, roomCode) {
    const { data, error } = await supabase
      .from('slf_rooms')
      .insert([{ host_id: hostId, room_code: roomCode, status: 'waiting' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async joinRoom(roomCode) {
    const { data, error } = await supabase
      .from('slf_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();
    if (error) throw error;
    return data;
  },

  async updateRoomStatus(roomId, status, extra = {}) {
    const { error } = await supabase
      .from('slf_rooms')
      .update({ status, ...extra })
      .eq('id', roomId);
    if (error) throw error;
  },

  /**
   * Player Management
   */
  async registerPlayer(roomId, deviceId, name) {
    const { data, error } = await supabase
      .from('slf_players')
      .insert([{ room_id: roomId, device_id: deviceId, name, score: 0, is_ready: true }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async fetchPlayers(roomId) {
    const { data, error } = await supabase
      .from('slf_players')
      .select('*')
      .eq('room_id', roomId);
    if (error) throw error;
    return data;
  },

  /**
   * Game State Management
   */
  async setBuzzer(roomId, playerName) {
    const { error } = await supabase
      .from('slf_rooms')
      .update({ 
        status: 'evaluating', 
        locked_by: playerName,
        locked_at: new Date().toISOString()
      })
      .eq('id', roomId);
    if (error) throw error;
  },

  async submitResponses(roomId, playerId, roundNumber, responseData) {
    const { data, error } = await supabase
      .from('slf_responses')
      .insert([{
        room_id: roomId,
        player_id: playerId,
        round_number: roundNumber,
        data: responseData
      }])
      .select();
    if (error) throw error;
    return data;
  },

  /**
   * Realtime Subscriptions
   */
  subscribeToRoom(roomId, onUpdate) {
    return supabase
      .channel(`slf_room_${roomId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'slf_rooms', 
        filter: `id=eq.${roomId}` 
      }, payload => onUpdate(payload.new))
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'slf_players', 
        filter: `room_id=eq.${roomId}` 
      }, () => onUpdate()) // Generic update to re-fetch players
      .subscribe();
  }
};
