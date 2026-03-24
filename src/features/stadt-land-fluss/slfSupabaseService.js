import { supabase } from '../../supabaseClient';

/**
 * Service to handle the SLF gameplay flow using Supabase DB and Realtime.
 */
export const slfService = {
  /**
   * Room & Phase Sync
   */
  async createRoom(roomCode, roomName, totalRounds = 5) {
    const { data, error } = await supabase
      .from('slf_rooms')
      .insert([{ 
        room_code: roomCode, 
        room_name: roomName || roomCode, 
        game_phase: 'lobby',
        total_rounds: totalRounds,
        current_round_num: 1
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async joinRoom(searchString) {
    const { data, error } = await supabase
      .from('slf_rooms')
      .select('*')
      .or(`room_code.eq."${searchString.toUpperCase()}",room_name.eq."${searchString}"`)
      .single();
    if (error) throw error;
    return data;
  },

  async setGamePhase(roomId, phase, extraUpdates = {}) {
    const { error } = await supabase
      .from('slf_rooms')
      .update({ game_phase: phase, ...extraUpdates })
      .eq('id', roomId);
    if (error) throw error;
  },

  /**
   * Player & Interaction
   */
  async registerPlayer(roomId, deviceId, name) {
    const { data, error } = await supabase
      .from('slf_players')
      .insert([{ room_id: roomId, device_id: deviceId, name, is_ready: true }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateDiceRoll(playerId, diceRoll) {
    const { error } = await supabase
      .from('slf_players')
      .update({ dice_roll: diceRoll })
      .eq('id', playerId);
    if (error) throw error;
  },

  async fetchPlayers(roomId) {
    const { data, error } = await supabase
      .from('slf_players')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  /**
   * Submit logic
   */
  async submitAnswers(roomId, playerId, payload) {
    const { error } = await supabase
      .from('slf_responses')
      .insert([{ room_id: roomId, player_id: playerId, data: payload }]);
    if (error) throw error;
  },

  async addPlayerScore(playerId, points) {
    const { data: p } = await supabase.from('slf_players').select('score').eq('id', playerId).single();
    const { error } = await supabase
      .from('slf_players')
      .update({ score: (p?.score || 0) + points })
      .eq('id', playerId);
    if (error) throw error;
  },

  async fetchResponses(roomId) {
    const { data, error } = await supabase
      .from('slf_responses')
      .select('*, slf_players(name)')
      .eq('room_id', roomId);
    if (error) throw error;
    return data;
  },

  async triggerBuzzer(roomId, playerId) {
    const { error } = await supabase
       .from('slf_rooms')
       .update({ game_phase: 'evaluating', buzzer_player_id: playerId })
       .eq('id', roomId);
    if (error) throw error;
  },

  /**
   * Realtime Connection
   */
  subscribeToRoom(roomId, onRoomUpdate, onPlayerUpdate) {
    return supabase
      .channel(`slf_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slf_rooms', filter: `id=eq.${roomId}` }, 
          (p) => onRoomUpdate(p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slf_players', filter: `room_id=eq.${roomId}` }, 
          () => onPlayerUpdate()) 
      .subscribe();
  }
};
