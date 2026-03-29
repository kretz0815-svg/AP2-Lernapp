import { supabase } from '../../supabaseClient';

const ROOM_META_MARKER = '||CATS:';
const ROOM_CFG_MARKER = '||CFG:';
export const DEFAULT_SLF_CATEGORIES = ['stadt', 'land', 'fluss', 'tier', 'beruf'];
const CATEGORY_ALIASES = {
  stufe: 'tier',
  animal: 'tier',
  job: 'beruf',
  profession: 'beruf',
  city: 'stadt',
  country: 'land',
  river: 'fluss'
};

const normalizeCategoryKey = (value) => (
  CATEGORY_ALIASES[
    String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  ] || String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
);

export const parseCategoryInput = (raw) => {
  const base = Array.isArray(raw)
    ? raw
    : String(raw || '')
      .split(',');

  const seen = new Set();
  const normalized = [];
  base.forEach((entry) => {
    const key = normalizeCategoryKey(entry);
    if (!key || seen.has(key)) return;
    seen.add(key);
    normalized.push(key);
  });

  return normalized.length ? normalized.slice(0, 8) : [...DEFAULT_SLF_CATEGORIES];
};

export const serializeRoomNameWithCategories = (
  roomName,
  categories = DEFAULT_SLF_CATEGORIES,
  options = {}
) => {
  const cleanName = String(roomName || '').trim() || 'SLF Raum';
  const cleanCategories = parseCategoryInput(categories);
  const timerSeconds = Math.max(0, Number(options?.timerSeconds || 0));
  return `${cleanName}${ROOM_META_MARKER}${cleanCategories.join(',')}${ROOM_CFG_MARKER}timer=${timerSeconds}`;
};

export const parseRoomMeta = (roomNameRaw) => {
  const roomName = String(roomNameRaw || '').trim();
  const markerIndex = roomName.indexOf(ROOM_META_MARKER);
  if (markerIndex < 0) {
    return {
      displayName: roomName,
      categories: [...DEFAULT_SLF_CATEGORIES],
      timerSeconds: 0
    };
  }
  const displayName = roomName.slice(0, markerIndex).trim() || 'SLF Raum';
  const afterCats = roomName.slice(markerIndex + ROOM_META_MARKER.length);
  const cfgIndex = afterCats.indexOf(ROOM_CFG_MARKER);
  const rawCategories = cfgIndex >= 0 ? afterCats.slice(0, cfgIndex) : afterCats;
  const rawCfg = cfgIndex >= 0 ? afterCats.slice(cfgIndex + ROOM_CFG_MARKER.length) : '';
  const timerMatch = rawCfg.match(/timer=(\d+)/i);
  const timerSeconds = timerMatch ? Math.max(0, Number(timerMatch[1])) : 0;
  return {
    displayName,
    categories: parseCategoryInput(rawCategories.split(',')),
    timerSeconds
  };
};

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
    const normalized = String(searchString || '').trim();
    const upperCode = normalized.toUpperCase();
    const { data, error } = await supabase
      .from('slf_rooms')
      .select('*')
      .or(`room_code.eq."${upperCode}",room_name.ilike."${normalized}%",room_name.eq."${normalized}"`)
      .limit(20);
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Room not found');

    const exactCode = data.find((r) => (r.room_code || '').toUpperCase() === upperCode);
    if (exactCode) return exactCode;

    const exactName = data.find((r) => {
      const { displayName } = parseRoomMeta(r.room_name);
      return displayName.toLowerCase() === normalized.toLowerCase();
    });
    if (exactName) return exactName;

    return data[0];
  },

  async setGamePhase(roomId, phase, extraUpdates = {}) {
    const { error } = await supabase
      .from('slf_rooms')
      .update({ game_phase: phase, ...extraUpdates, updated_at: new Date().toISOString() })
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

  async resetPlayerForNewMatch(playerId) {
    const { error } = await supabase
      .from('slf_players')
      .update({ dice_roll: 0, score: 0 })
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
    // Keep exactly one response per player for the current room/round snapshot.
    const { error: deleteError } = await supabase
      .from('slf_responses')
      .delete()
      .eq('room_id', roomId)
      .eq('player_id', playerId);
    if (deleteError) throw deleteError;

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

  async clearResponses(roomId) {
    const { error } = await supabase
      .from('slf_responses')
      .delete()
      .eq('room_id', roomId);
    if (error) throw error;
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
