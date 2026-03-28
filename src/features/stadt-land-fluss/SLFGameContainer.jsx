import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { slfService, parseRoomMeta } from './slfSupabaseService';
import Confetti from '../../components/Confetti';
import { askGemini } from '../../geminiClient';

/**
 * SLFGameContainer: The State-Machine managing 6 game phases.
 * 1. Lobby
 * 2. Dice Initiative
 * 3. Letter Roulette (for the winner)
 * 4. Playing
 * 5. Buzzer Lock
 * 6. AI Evaluation
 */
const SLFGameContainer = ({ room, player, onClose, authUser = null }) => {
  const MIN_FILLED_FIELDS = 3;
  const EASY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'Z', 'J'];
  const KNOWN_COUNTRIES = new Set([
    'deutschland', 'oesterreich', 'schweiz', 'frankreich', 'spanien', 'italien', 'portugal', 'niederlande',
    'belgien', 'polen', 'daenemark', 'schweden', 'norwegen', 'finnland', 'island', 'irland',
    'uk', 'grossbritannien', 'england', 'wales', 'schottland', 'usa', 'vereinigte_staaten', 'kanada', 'mexiko',
    'brasilien', 'argentinien', 'chile', 'kolumbien', 'peru',
    'china', 'japan', 'suedkorea', 'indien', 'thailand', 'vietnam', 'indonesien', 'malaysia', 'philippinen',
    'australien', 'neuseeland',
    'aegypten', 'marokko', 'suedafrika', 'kenia', 'nigeria', 'tunesien',
    'tuerkei', 'griechenland', 'kroatien', 'tschechien', 'slowakei', 'ungarn', 'rumaenien', 'bulgarien', 'ukraine'
  ]);
  const getCategoryKeys = (roomName) => parseRoomMeta(roomName).categories;
  const buildEmptyAnswers = (keys) => keys.reduce((acc, key) => ({ ...acc, [key]: '' }), {});
  const toCategoryLabel = (key) => key.replace(/_/g, ' ').toUpperCase();
  const normalizeText = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const [roomData, setRoomData] = useState(room);
  const [players, setPlayers] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Round Specific State
  const [localRoll, setLocalRoll] = useState(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [visualRoll, setVisualRoll] = useState('?');
  const categories = useMemo(() => getCategoryKeys(roomData.room_name), [roomData.room_name]);
  const [answers, setAnswers] = useState(() => buildEmptyAnswers(getCategoryKeys(room.room_name)));
  const [aiResults, setAiResults] = useState(null);
  const [rouletteLetter, setRouletteLetter] = useState('A');
  const [calculatedPoints, setCalculatedPoints] = useState(0);
  const [isScoring, setIsScoring] = useState(false);
  const [roundScored, setRoundScored] = useState(false);
  const [roundBreakdown, setRoundBreakdown] = useState(null);
  const [timeLeftMs, setTimeLeftMs] = useState(null);
  const [roundHistory, setRoundHistory] = useState([]);
  const [nextRoundLoading, setNextRoundLoading] = useState(false);
  const [roomRecord, setRoomRecord] = useState(null);
  const submittedRoundKeyRef = useRef('');
  const scoredRoundKeyRef = useRef('');
  const roundHistoryRef = useRef({});
  const timeoutHandledRoundRef = useRef('');
  const evaluationRetryRef = useRef(null);
  const gameOverPersistedRef = useRef(false);

  const roomMeta = useMemo(() => parseRoomMeta(roomData.room_name), [roomData.room_name]);
  const rawCurrentRound = Number(roomData.current_round_num ?? room.current_round_num ?? 1);
  const rawTotalRounds = Number(roomData.total_rounds ?? room.total_rounds ?? 5);
  const currentRoundNum = Number.isFinite(rawCurrentRound) && rawCurrentRound > 0 ? rawCurrentRound : 1;
  const totalRounds = Number.isFinite(rawTotalRounds) && rawTotalRounds > 0 ? rawTotalRounds : 5;
  const timerSeconds = Math.max(0, Number(roomMeta.timerSeconds || 0));
  const roundKey = `${room.id}:${currentRoundNum}:${player.id}`;
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => {
      const aCreated = new Date(a.created_at || 0).getTime();
      const bCreated = new Date(b.created_at || 0).getTime();
      if (aCreated !== bCreated) return aCreated - bCreated;
      return String(a.id).localeCompare(String(b.id));
    }),
    [players]
  );
  const hostPlayerId = sortedPlayers[0]?.id || player.id;
  const isHost = player.id === hostPlayerId;
  const effectiveMinFilled = Math.min(MIN_FILLED_FIELDS, categories.length);

  const stringToSeed = (str) => {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  const createRng = (seed) => {
    let value = seed >>> 0;
    return () => {
      value = (value + 0x6D2B79F5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const letterPool = useMemo(() => {
    const seed = stringToSeed(`${roomData.id || ''}_${roomData.room_code || ''}`);
    const rng = createRng(seed);
    const shuffled = [...EASY_LETTERS];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    return shuffled;
  }, [roomData.id, roomData.room_code]);

  const getLetterForRound = useCallback((roundNum) => {
    if (!letterPool.length) return 'A';
    const idx = Math.max(0, Number(roundNum || 1) - 1) % letterPool.length;
    return letterPool[idx];
  }, [letterPool]);

  useEffect(() => {
    setAnswers((prev) => {
      const next = {};
      categories.forEach((cat) => {
        next[cat] = prev[cat] || '';
      });
      return next;
    });
  }, [categories]);

  const refreshPlayers = useCallback(async () => {
    try {
      const data = await slfService.fetchPlayers(room.id);
      if (data && data.length > 0) {
        setPlayers(data);
        // Sync local roll if DB already has it
        const me = data.find(p => p.id === player.id);
        if (me && me.dice_roll > 0 && !localRoll) {
          setLocalRoll(me.dice_roll);
        }
      }
    } catch (err) {
      console.error('refreshPlayers error:', err);
    }
  }, [room.id, player.id, localRoll]);

  useEffect(() => {
    refreshPlayers();
    const sub = slfService.subscribeToRoom(room.id, 
      (newRoom) => {
        if (newRoom && newRoom.id) {
          setRoomData((prev) => ({ ...prev, ...newRoom }));
          refreshPlayers(); // Re-sync players when phase changes
        }
      }, 
      () => refreshPlayers()
    );
    return () => sub.unsubscribe();
  }, [room.id, refreshPlayers]);

  const loadRoomRecord = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('progress_data')
        .eq('user_id', authUser.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;

      const records = data?.progress_data?.slf_room_records || {};
      setRoomRecord(records?.[roomData.room_code] || null);
    } catch (err) {
      console.error('Failed to load SLF room record:', err);
      setRoomRecord(null);
    }
  }, [authUser?.id, roomData.room_code]);

  useEffect(() => {
    loadRoomRecord();
  }, [loadRoomRecord]);

  /**
   * AI Validation Placeholder
   */
  const calculatePoints = useCallback(async (results, myAnswers, responsesForRound = null) => {
    try {
      if (scoredRoundKeyRef.current === roundKey) {
        setIsScoring(false);
        setRoundScored(true);
        return;
      }

      // Get all responses to compare
      const allResponses = responsesForRound || await slfService.fetchResponses(room.id);
      let roundTotal = 0;
      const breakdown = {};
      const currentLetter = String(roomData.current_letter || '').toLowerCase();

      categories.forEach(cat => {
        const myVal = String(myAnswers[cat] || '').trim().toLowerCase();
        if (!myVal) {
          breakdown[cat] = { status: 'wrong', label: '❌ Ungültig', reason: 'Leer gelassen.', points: 0 };
          return;
        }

        if (results[cat] !== 'Richtig') {
          const startsWithLetter = !!currentLetter && myVal.startsWith(currentLetter);
          breakdown[cat] = startsWithLetter
            ? { status: 'partial', label: '⚠️ Teilpunkt', reason: `Buchstabe passt (${roomData.current_letter}), aber KI konnte den Begriff nicht sicher bestätigen.`, points: 0 }
            : { status: 'wrong', label: '❌ Ungültig', reason: `Beginnt nicht mit ${roomData.current_letter}.`, points: 0 };
          return;
        }

        const otherVals = allResponses
          .filter(r => r.player_id !== player.id)
          .map(r => r.data[cat]?.trim().toLowerCase() || '');

        const hasOthers = otherVals.some(v => v !== '');
        const hasSame = otherVals.some(v => v === myVal);

        if (!hasOthers) {
           roundTotal += 20;
           breakdown[cat] = { status: 'correct', label: '✅ Gültig', reason: 'Einziger gültiger Begriff in dieser Kategorie.', points: 20 };
        } else if (hasSame) {
           roundTotal += 0;
           breakdown[cat] = { status: 'wrong', label: '❌ Ungültig', reason: 'Doppelte Antwort mit Mitspieler: 0 Punkte.', points: 0 };
        } else {
           roundTotal += 10;
           breakdown[cat] = { status: 'correct', label: '✅ Gültig', reason: 'Gültig und nicht doppelt vergeben.', points: 10 };
        }
      });

      setRoundBreakdown(breakdown);
      setCalculatedPoints(roundTotal);
      try {
        await slfService.addPlayerScore(player.id, roundTotal);
      } catch (scoreErr) {
        // Keep UI progression responsive even if score write retries are needed.
        console.error('Score write error:', scoreErr);
      }
      scoredRoundKeyRef.current = roundKey;
      setRoundScored(true);
      refreshPlayers();
      setIsScoring(false);
    } catch (err) {
      console.error('Score calculation error:', err);
      setIsScoring(false);
    }
  }, [roundKey, room.id, player.id, refreshPlayers, categories, roomData.current_letter]);

  const localFallbackValidation = useCallback((answersObj) => {
    const currentLetter = String(roomData.current_letter || '').toLowerCase();
    const fallback = {};
    categories.forEach((cat) => {
      const val = String(answersObj?.[cat] || '').trim().toLowerCase();
      const isCorrect = !!val && !!currentLetter && val.startsWith(currentLetter);
      fallback[cat] = isCorrect ? 'Richtig' : 'Falsch';
    });
    return fallback;
  }, [categories, roomData.current_letter]);

  const validateAnswersWithAI = useCallback(async (answersObj) => {
    try {
      const lines = categories
        .map((cat) => `${toCategoryLabel(cat)}: ${answersObj[cat] || '-'}`)
        .join(', ');
      const keyList = categories.map((cat) => `"${cat}"`).join(', ');
      const prompt = `Validiere Stadt Land Fluss für Buchstabe '${roomData.current_letter}': ${lines}.
      Antworte nur als JSON mit exakt diesen Keys: { ${keyList} }.
      Werte pro Key sind NUR "correct" oder "wrong". Sei streng und prüfe den Anfangsbuchstaben.`;
      const response = await askGemini(prompt);
      const jsonMatch = response.match(/\{.*\}/s);
      if (!jsonMatch) {
        const fallback = localFallbackValidation(answersObj);
        setAiResults(fallback);
        return fallback;
      }

      const raw = JSON.parse(jsonMatch[0]);
      const translated = {};
      categories.forEach((cat) => {
        const aiCorrect = String(raw?.[cat] || '').toLowerCase() === 'correct';
        const answerVal = normalizeText(answersObj?.[cat] || '');
        const startsWithLetter = answerVal.startsWith(String(roomData.current_letter || '').toLowerCase());
        const isCountryCategory = /land|country/i.test(cat);
        const knownCountryHit = isCountryCategory && KNOWN_COUNTRIES.has(answerVal);
        translated[cat] = (aiCorrect || (startsWithLetter && knownCountryHit)) ? 'Richtig' : 'Falsch';
      });
      setAiResults(translated);
      return translated;
    } catch (err) {
      console.error('AI Eval error:', err);
      const fallback = localFallbackValidation(answersObj);
      setAiResults(fallback);
      return fallback;
    }
  }, [categories, roomData.current_letter, localFallbackValidation]);

  const startNextRoundOrFinish = async () => {
    setNextRoundLoading(true);
    try {
      if (currentRoundNum >= totalRounds) {
         await slfService.setGamePhase(room.id, 'game_over');
      } else {
         // Reset for next round
         await slfService.setGamePhase(room.id, 'dice', { 
           current_round_num: currentRoundNum + 1,
           current_letter: null,
           dice_winner_id: null
         });
         // Reset players state (dice_roll) in DB
         for (const p of players) {
           await slfService.updateDiceRoll(p.id, 0);
         }
         await slfService.clearResponses(room.id);
         // Local resets
         setLocalRoll(null);
         setAiResults(null);
         setAnswers(buildEmptyAnswers(categories));
      }
    } catch (err) { alert(err.message); }
    finally { setNextRoundLoading(false); }
  };

  useEffect(() => {
    // Reset local states for a new round
    setLocalRoll(null);
    setVisualRoll('?');
    setAiResults(null);
    setCalculatedPoints(0);
    setRoundScored(false);
    setRoundBreakdown(null);
    setIsScoring(false);
    setTimeLeftMs(null);
    timeoutHandledRoundRef.current = '';
    setAnswers(buildEmptyAnswers(categories));
    submittedRoundKeyRef.current = '';
    scoredRoundKeyRef.current = '';
    if (evaluationRetryRef.current) {
      clearTimeout(evaluationRetryRef.current);
      evaluationRetryRef.current = null;
    }
    gameOverPersistedRef.current = false;
  }, [currentRoundNum, categories]);

  useEffect(() => {
    if (roomData.game_phase !== 'evaluating') return;
    setIsScoring(true);

    const ensureSubmissionAndScore = async () => {
      try {
        if (scoredRoundKeyRef.current === roundKey) {
          setIsScoring(false);
          setRoundScored(true);
          return;
        }

        if (submittedRoundKeyRef.current !== roundKey) {
          await slfService.submitAnswers(room.id, player.id, {
            ...answers,
            _round: currentRoundNum
          });
          submittedRoundKeyRef.current = roundKey;
        }

        const allResponses = await slfService.fetchResponses(room.id);
        const roundResponses = allResponses.filter(
          (r) => Number(r?.data?._round || currentRoundNum) === currentRoundNum
        );
        if (roundResponses.length < players.length) {
          evaluationRetryRef.current = setTimeout(ensureSubmissionAndScore, 600);
          return;
        }

        const myRow = roundResponses.find((r) => r.player_id === player.id);
        const myRoundAnswers = myRow?.data ? { ...myRow.data } : { ...answers };
        delete myRoundAnswers._round;

        const roundNum = currentRoundNum;
        if (!roundHistoryRef.current[roundNum]) {
          const snapshot = {
            round: roundNum,
            letter: roomData.current_letter,
            responses: roundResponses.map((r) => {
              const playerInfo = players.find((p) => p.id === r.player_id);
              const data = { ...(r.data || {}) };
              delete data._round;
              return {
                playerId: r.player_id,
                playerName: playerInfo?.name || r?.slf_players?.name || 'Unbekannt',
                data
              };
            })
          };
          roundHistoryRef.current[roundNum] = true;
          setRoundHistory((prev) => [...prev, snapshot].sort((a, b) => a.round - b.round));
        }

        const resolvedResults = aiResults || await validateAnswersWithAI(myRoundAnswers);
        await calculatePoints(resolvedResults, myRoundAnswers, roundResponses);
      } catch (err) {
        console.error('Submission/evaluation sync error:', err);
        setIsScoring(false);
      }
    };

    ensureSubmissionAndScore();
    return () => {
      if (evaluationRetryRef.current) {
        clearTimeout(evaluationRetryRef.current);
        evaluationRetryRef.current = null;
      }
    };
  }, [roomData.game_phase, room.id, player.id, currentRoundNum, roundKey, aiResults, answers, validateAnswersWithAI, calculatePoints, players.length]);

  useEffect(() => {
    if (roomData.game_phase !== 'roulette') return undefined;
    if (roomData.dice_winner_id === player.id) {
      setRouletteLetter(getLetterForRound(currentRoundNum));
      return undefined;
    }
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * letterPool.length);
      setRouletteLetter(letterPool[randomIdx] || 'A');
    }, 90);
    return () => clearInterval(interval);
  }, [roomData.game_phase, roomData.dice_winner_id, currentRoundNum, player.id, letterPool, getLetterForRound]);

  useEffect(() => {
    if (roomData.game_phase !== 'playing' || timerSeconds <= 0) {
      setTimeLeftMs(null);
      return undefined;
    }

    const phaseStartedAt = new Date(roomData.updated_at || Date.now()).getTime();
    const totalMs = timerSeconds * 1000;
    const tick = () => {
      const elapsed = Math.max(0, Date.now() - phaseStartedAt);
      const remaining = Math.max(0, totalMs - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0 && timeoutHandledRoundRef.current !== roundKey) {
        timeoutHandledRoundRef.current = roundKey;
        submitGame({ forced: true });
      }
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [roomData.game_phase, roomData.updated_at, timerSeconds, roundKey]);

  useEffect(() => {
    if (roomData.game_phase !== 'game_over' || !authUser?.id || players.length === 0) return;
    if (gameOverPersistedRef.current) return;

    const persistRoomResult = async () => {
      try {
        const ranking = [...players]
          .sort((a, b) => b.score - a.score)
          .map((p, idx) => ({ rank: idx + 1, name: p.name, score: p.score }));
        const top = ranking[0] || { name: 'Unbekannt', score: 0 };

        const { data, error } = await supabase
          .from('user_data')
          .select('progress_data')
          .eq('user_id', authUser.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error;

        const progressData = data?.progress_data ? { ...data.progress_data } : {};
        const roomCode = roomData.room_code;
        const displayName = parseRoomMeta(roomData.room_name).displayName;
        const previousRecords = progressData.slf_room_records || {};
        const currentRecord = previousRecords[roomCode] || {};
        const previousMatches = Array.isArray(currentRecord.matches) ? currentRecord.matches : [];
        const nextMatches = [
          {
            played_at: new Date().toISOString(),
            rounds: totalRounds,
            ranking
          },
          ...previousMatches
        ].slice(0, 20);
        const bestScore = Math.max(Number(currentRecord.best_score || 0), Number(top.score || 0));
        const bestPlayer = Number(top.score || 0) >= Number(currentRecord.best_score || 0)
          ? top.name
          : (currentRecord.best_player || top.name);
        const nextRoomRecord = {
          room_code: roomCode,
          room_name: displayName,
          best_score: bestScore,
          best_player: bestPlayer,
          matches: nextMatches
        };

        progressData.slf_room_records = {
          ...previousRecords,
          [roomCode]: nextRoomRecord
        };

        const savedRooms = Array.isArray(progressData.slf_saved_rooms) ? progressData.slf_saved_rooms : [];
        progressData.slf_saved_rooms = savedRooms.map((entry) => (
          String(entry?.room_code || '') === String(roomCode)
            ? {
                ...entry,
                room_name: displayName,
                best_score: bestScore,
                best_player: bestPlayer,
                updated_at: new Date().toISOString()
              }
            : entry
        ));

        await supabase
          .from('user_data')
          .upsert(
            [{
              user_id: authUser.id,
              device_id: authUser.id,
              progress_data: progressData,
              updated_at: new Date().toISOString()
            }],
            { onConflict: 'user_id' }
          );

        setRoomRecord(nextRoomRecord);
        gameOverPersistedRef.current = true;
      } catch (err) {
        console.error('Failed to persist SLF game over record:', err);
      }
    };

    persistRoomResult();
  }, [roomData.game_phase, roomData.room_code, roomData.room_name, totalRounds, authUser?.id, players]);

  /** ───────── Phase Logic ───────── **/

  const startDicePhase = () => slfService.setGamePhase(room.id, 'dice');

  const restartMatch = async () => {
    setNextRoundLoading(true);
    try {
      await slfService.clearResponses(room.id);
      for (const p of players) {
        await slfService.resetPlayerForNewMatch(p.id);
      }
      await slfService.setGamePhase(room.id, 'dice', {
        current_round_num: 1,
        current_letter: null,
        dice_winner_id: null,
        buzzer_player_id: null
      });
      setLocalRoll(null);
      setAiResults(null);
      setCalculatedPoints(0);
      setRoundHistory([]);
      roundHistoryRef.current = {};
      timeoutHandledRoundRef.current = '';
      setAnswers(buildEmptyAnswers(categories));
      submittedRoundKeyRef.current = '';
      scoredRoundKeyRef.current = '';
      gameOverPersistedRef.current = false;
    } catch (err) {
      console.error('Restart match error:', err);
      alert('Neue Partie konnte nicht gestartet werden.');
    } finally {
      setNextRoundLoading(false);
    }
  };

  const rollDice = async () => {
    if (isRollingDice) return;
    setIsRollingDice(true);
    
    // Dice Animation
    let count = 0;
    const interval = setInterval(() => {
      setVisualRoll(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 15) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setVisualRoll(finalVal);
        setLocalRoll(finalVal);
        setIsRollingDice(false);
        finalizeRoll(finalVal);
      }
    }, 80);
  };

  const finalizeRoll = async (val) => {
    try {
      await slfService.updateDiceRoll(player.id, val);
      
      // Let's re-fetch to see the current state of everyone
      const updatedPlayers = await slfService.fetchPlayers(room.id);
      setPlayers(updatedPlayers);
      
      const allRolled = updatedPlayers.length > 0 && updatedPlayers.every(p => p.dice_roll > 0);
      
      if (allRolled) {
        const sorted = [...updatedPlayers].sort((a, b) => {
          const rollDiff = (b.dice_roll || 0) - (a.dice_roll || 0);
          if (rollDiff !== 0) return rollDiff;
          const aCreated = new Date(a.created_at || 0).getTime();
          const bCreated = new Date(b.created_at || 0).getTime();
          if (aCreated !== bCreated) return aCreated - bCreated;
          return String(a.id).localeCompare(String(b.id));
        });
        const winnerId = sorted[0]?.id;
        if (!winnerId) return;
        // The last player to roll triggers the advance for everyone
        await advanceToLetterRoulette(winnerId);
      }
    } catch (err) {
      console.error('Finalize roll error:', err);
    }
  };

  const advanceToLetterRoulette = (winnerId) => {
    slfService.setGamePhase(room.id, 'roulette', { dice_winner_id: winnerId });
  };

  const spinRoulette = () => {
    const targetLetter = getLetterForRound(currentRoundNum);
    setRouletteLetter(targetLetter);
    slfService.setGamePhase(room.id, 'playing', { current_letter: targetLetter });
  };

  const submitGame = async ({ forced = false } = {}) => {
    const filledCount = categories.filter((cat) => String(answers[cat] || '').trim()).length;
    if (!forced && filledCount < effectiveMinFilled) return;
    setShowConfetti(true);
      await slfService.submitAnswers(room.id, player.id, {
        ...answers,
      _round: currentRoundNum
    });
    submittedRoundKeyRef.current = roundKey;
    await slfService.triggerBuzzer(room.id, player.id);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const renderScoreboard = () => {
    const ranked = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    return (
      <div className="slf-scoreboard">
        {ranked.map((p) => (
          <div key={p.id} className={`slf-score-chip ${p.id === player.id ? 'me' : ''}`}>
            <span>{p.name}{p.id === player.id ? ' (Du)' : ''}</span>
            <strong>{p.score || 0} Pkt.</strong>
          </div>
        ))}
      </div>
    );
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(String(roomData.room_code || ''));
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  /** ───────── PHASE VIEWS ───────── **/

  const renderLobby = () => (
    <div className="slf-section">
      <h3>🚀 Lobby: {parseRoomMeta(roomData.room_name).displayName}</h3>
      <p className="slf-highlight-code">Beitritts-Code: <span>{roomData.room_code}</span></p>
      <button className="slf-prime-btn slf-copy-btn" onClick={copyRoomCode}>Code kopieren 📋</button>
      
      <div className="slf-p-list">
        {players.map((p) => (
          <div key={p.id} className="slf-p-tag">
            👤 {p.name} {p.id === player.id ? '(Du)' : ''} {p.id === hostPlayerId ? '(Host)' : ''}
          </div>
        ))}
      </div>
      <button className="slf-prime-btn" onClick={startDicePhase}>Engagement starten! (Würfeln)</button>
      <p className="slf-hint" style={{ marginTop: '0.6rem' }}>
        Timer: {timerSeconds > 0 ? `${timerSeconds}s` : 'Aus'}
      </p>
      <p className="slf-hint" style={{ marginTop: '1rem' }}>Sende den Code oben an deine Freunde, damit sie beitreten können.</p>
    </div>
  );

  const renderDice = () => {
    const sorted = [...players].sort((a, b) => b.dice_roll - a.dice_roll);
    const winner = sorted[0]?.dice_roll > 0 ? sorted[0] : null;
    const allReady = players.every(p => p.dice_roll > 0);
    const myPlayer = players.find((p) => p.id === player.id);
    const myRolled = (myPlayer?.dice_roll || 0) > 0;

    return (
      <div className="slf-section">
        <h3>🎲 Würfel für Initiative</h3>
        <p className="slf-hint">Alle müssen würfeln. Wer am höchsten wirft, beginnt!</p>
        
        <div className="slf-dice-grid">
           {players.length > 0 ? players.map(p => {
             const isMe = p.id === player.id;
             return (
               <div key={p.id} className={`slf-dice-card ${isMe ? 'active' : ''}`}>
                  <span>{p.name} {isMe && '(Du)'}</span>
                  <div className={`slf-die ${isRollingDice && isMe ? 'rolling' : ''}`}>
                    {isMe && isRollingDice ? visualRoll : (p.dice_roll || '?')}
                  </div>
               </div>
             );
           }) : <p className="slf-hint">Lade Spieler...</p>}
        </div>
        {!allReady && (
          <button onClick={rollDice} disabled={isRollingDice} className="slf-prime-btn slf-dice-btn" style={{ marginTop: '2rem' }}>
            {myRolled ? '🎲 ERNEUT WÜRFELN' : '🎲 JETZT WÜRFELN!'}
          </button>
        )}
        
        {myRolled && !allReady && <div className="slf-waiting-box">Warten auf Mitspieler... ⏳</div>}
        
        {winner && winner.dice_roll > 0 && allReady && (
           <div className="slf-winner-announcement">
             🏆 {winner.name} hat gewonnen!
             <p>Warte auf Start durch Gewinner...</p>
           </div>
        )}
      </div>
    );
  };

  const renderRoulette = () => (
    <div className="slf-section">
      <h3>🎰 Buchstaben-Roulette</h3>
      <div className="slf-slot-display">{rouletteLetter}</div>
      {roomData.dice_winner_id === player.id ? (
        <button onClick={spinRoulette} className="slf-prime-btn slf-spin-btn">🛑 STOPP!</button>
      ) : <p className="slf-hint">Warte auf {players.find(p => p.id === roomData.dice_winner_id)?.name || 'Gewinner'}...</p>}
    </div>
  );

  const renderPlaying = () => (
    <div className="slf-section">
      <div className="slf-game-header">
        Buchstabe: <span key={`${currentRoundNum}-${roomData.current_letter}`}>{roomData.current_letter}</span>
      </div>
      {timerSeconds > 0 && (
        <div className="slf-timer-box">
          ⏱️ {Math.ceil((timeLeftMs || 0) / 1000)}s
        </div>
      )}
      <div className="slf-inputs">
        {categories.map(cat => (
          <div key={cat} className="slf-field">
            <label>{toCategoryLabel(cat)}</label>
            <input 
              value={answers[cat]} 
              onChange={e => setAnswers({ ...answers, [cat]: e.target.value })} 
              disabled={roomData.game_phase === 'evaluating'}
              placeholder="..."
            />
          </div>
        ))}
      </div>
      {roomData.game_phase !== 'evaluating' && (() => {
        const filledCount = categories.filter((cat) => String(answers[cat] || '').trim()).length;
        const canFinish = filledCount >= effectiveMinFilled;
        return (
          <>
            <button className="slf-buzzer" onClick={() => submitGame()} disabled={!canFinish}>
              FERTIG! 🚨
            </button>
            {!canFinish && (
              <p className="slf-hint" style={{ marginTop: '0.8rem' }}>
                Mindestens {effectiveMinFilled} von {categories.length} Feldern ausfüllen.
              </p>
            )}
          </>
        );
      })()}
    </div>
  );

  const renderResults = () => (
    <div className="slf-section">
      <h3>🤖 KI Auswertung</h3>
      <p className="slf-points-info">
        Diese Runde:{' '}
        {isScoring ? (
          <span className="slf-points-pending">Punkte werden berechnet...</span>
        ) : (
          <span>+{calculatedPoints} Punkte</span>
        )}
      </p>
      
      <div className="slf-results-grid">
         {categories.map(cat => (
           <div key={cat} className="slf-res-row">
             <div className="slf-res-left">
                <span className="slf-cat-label">{toCategoryLabel(cat)}</span>
                <span className="slf-val-text">{answers[cat] || '—'}</span>
                {roundBreakdown?.[cat]?.reason ? (
                  <span className="slf-eval-reason">{roundBreakdown[cat].reason}</span>
                ) : null}
             </div>
             {aiResults ? (
               <span className={`slf-badge ${roundBreakdown?.[cat]?.status === 'correct' ? 'correct' : roundBreakdown?.[cat]?.status === 'partial' ? 'partial' : 'wrong'}`}>
                 {roundBreakdown?.[cat]?.label || (aiResults[cat] === 'Richtig' ? '✅ Gültig' : '❌ Ungültig')}
               </span>
             ) : <div className="slf-loader-mini">Analysiere...</div>}
           </div>
         ))}
      </div>
      
      {!isScoring && (roundScored || !!roundBreakdown) && (
        <button onClick={startNextRoundOrFinish} disabled={nextRoundLoading} className="slf-prime-btn">
          {currentRoundNum < totalRounds ? 'Nächste Runde' : 'Zum Endergebnis'}
        </button>
      )}
    </div>
  );

  const renderGameOver = () => {
    const finalRanking = [...players].sort((a, b) => b.score - a.score);
    const topHistory = Array.isArray(roomRecord?.matches) ? roomRecord.matches.slice(0, 5) : [];

    return (
      <div className="slf-section">
        <h2 className="slf-win-title">🏆 Spiel Beendet!</h2>
        <div className="slf-final-rank">
           {finalRanking.map((p, idx) => (
             <div key={p.id} className={`slf-rank-row ${idx === 0 ? 'top' : ''}`}>
                <span className="slf-rank-num">#{idx+1}</span>
                <span className="slf-player-name">{p.name}</span>
                <span className="slf-player-score">{p.score} Pkt.</span>
             </div>
           ))}
        </div>

        {roomRecord?.best_score ? (
          <div className="slf-record-box">
            <p>Rekord im Raum: <strong>{roomRecord.best_player}</strong> mit <strong>{roomRecord.best_score} Punkten</strong></p>
          </div>
        ) : null}

        {topHistory.length > 0 ? (
          <div className="slf-toplist">
            <h4>Letzte Ergebnisse</h4>
            {topHistory.map((match, idx) => (
              <div key={`${match.played_at || idx}`} className="slf-top-row">
                <span>#{idx + 1}</span>
                <span>{match?.ranking?.[0]?.name || 'Unbekannt'} ({match?.ranking?.[0]?.score || 0} Pkt.)</span>
              </div>
            ))}
          </div>
        ) : null}

        {roundHistory.length > 0 ? (
          <details className="slf-protocol">
            <summary>Rundenprotokoll anzeigen</summary>
            {roundHistory.map((entry) => (
              <div key={`round_${entry.round}`} className="slf-protocol-round">
                <h5>Runde {entry.round} · Buchstabe {entry.letter || '-'}</h5>
                <div className="slf-protocol-grid">
                  {entry.responses.map((res) => (
                    <div key={`${entry.round}_${res.playerId}`} className="slf-protocol-player">
                      <strong>{res.playerName}</strong>
                      {categories.map((cat) => (
                        <div key={`${res.playerId}_${cat}`} className="slf-protocol-row">
                          <span>{toCategoryLabel(cat)}</span>
                          <span>{res.data?.[cat] || '—'}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </details>
        ) : null}

        <button onClick={restartMatch} disabled={nextRoundLoading} className="slf-prime-btn" style={{ marginTop: '1.2rem' }}>
          {nextRoundLoading ? 'Starte...' : (isHost ? 'Neue Partie starten' : 'Neue Partie vorschlagen')}
        </button>

        <button onClick={onClose} className="slf-prime-btn slf-secondary-btn" style={{ marginTop: '0.8rem' }}>Dashboard</button>
      </div>
    );
  };

  return (
    <div className="slf-container">
      {showConfetti && <Confetti />}
      {renderScoreboard()}
      
      {/* State Machine Switch */}
      {roomData.game_phase === 'lobby' && renderLobby()}
      {roomData.game_phase === 'dice' && renderDice()}
      {roomData.game_phase === 'roulette' && renderRoulette()}
      {roomData.game_phase === 'playing' && renderPlaying()}
      {roomData.game_phase === 'evaluating' && renderResults()}
      {roomData.game_phase === 'game_over' && renderGameOver()}

      <div className="slf-game-meta">
         <span>Runde {currentRoundNum} / {totalRounds} · Timer {timerSeconds > 0 ? `${timerSeconds}s` : 'Aus'}</span>
      </div>

      <style>{`
        .slf-container { color: white; width: 100%; max-width: 600px; padding-bottom: 2rem; }
        .slf-game-meta { text-align: center; margin-top: 2rem; opacity: 0.5; font-size: 0.8rem; }
        .slf-section { animation: fadeIn 0.4s ease; display: flex; flex-direction: column; align-items: center; }
        .slf-hint { opacity: 0.6; font-size: 0.9rem; text-align: center; }
        .slf-highlight-code { background: rgba(168, 85, 247, 0.1); border: 2px dashed #a855f7; padding: 1rem 2rem; border-radius: 12px; font-size: 1.1rem; margin-bottom: 2rem; }
        .slf-highlight-code span { font-weight: 900; font-family: monospace; font-size: 2rem; color: #a855f7; display: block; margin-top: 0.2rem; }
        .slf-copy-btn { max-width: 260px; margin: -1.2rem auto 1.2rem; padding: 0.75rem 1rem; font-size: 0.95rem; }
        .slf-scoreboard { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-bottom: 1rem; }
        .slf-score-chip { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; padding: 0.35rem 0.75rem; display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.82rem; }
        .slf-score-chip.me { border-color: #a855f7; background: rgba(168,85,247,0.2); }
        
        /* Lobby */
        .slf-p-list { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 2rem; justify-content: center; }
        .slf-p-tag { background: rgba(168, 85, 247, 0.2); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #a855f7; }
        
        /* Buttons */
        .slf-prime-btn { background: #a855f7; border: none; padding: 1rem 2rem; color: white; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .slf-prime-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(168, 85, 247, 0.4); }
        .slf-secondary-btn { background: rgba(255,255,255,0.15); }

        /* Dice Phase */
        .slf-dice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; width: 100%; margin: 2rem 0; }
        .slf-dice-card { background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 20px; text-align: center; border: 2px solid transparent; }
        .slf-dice-card.active { border-color: #a855f7; background: rgba(168, 85, 247, 0.1); }
        .slf-die { font-size: 3.5rem; font-weight: 900; color: #a855f7; margin-top: 1rem; text-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
        .slf-die.rolling { animation: dieRoll 0.1s infinite alternate; color: #fff; }
        .slf-dice-btn, .slf-spin-btn { max-width: 300px; margin: 0 auto; transform: scale(1.1); }
        
        @keyframes dieRoll { 
          from { transform: rotate(-10deg) scale(1.1); filter: brightness(1.5); } 
          to { transform: rotate(10deg) scale(0.9); filter: brightness(1); } 
        }
        
        /* Roulette */
        .slf-slot-display { font-size: 8rem; font-weight: 900; color: #a855f7; margin: 2rem 0; text-shadow: 0 0 30px rgba(168, 85, 247, 0.6); animation: bounce 0.5s infinite alternate; }

        /* Playing */
        .slf-game-header { font-size: 1.5rem; margin-bottom: 2rem; }
        .slf-game-header span { font-size: 3rem; color: #a855f7; font-weight: 900; display: inline-block; animation: letterPop 450ms ease-out; }
        .slf-timer-box { margin: -1rem 0 1.2rem; font-weight: 900; font-size: 1.1rem; color: #fbbf24; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.35); border-radius: 10px; padding: 0.45rem 0.8rem; }
        .slf-inputs { display: grid; gap: 1rem; width: 100%; }
        .slf-field { display: flex; flex-direction: column; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
        .slf-field label { font-size: 0.7rem; font-weight: 800; color: #a855f7; margin-bottom: 0.5rem; }
        .slf-field input { background: transparent; border: none; color: white; font-size: 1.4rem; padding: 0; outline: none; }
        .slf-buzzer { margin-top: 2rem; width: 120px; height: 120px; border-radius: 50%; background: #ef4444; border: 4px solid #991b1b; color: white; font-weight: 900; box-shadow: 0 8px 0 #991b1b, 0 15px 30px rgba(239, 68, 68, 0.3); transition: 0.1s; cursor: pointer; }
        .slf-buzzer:active { transform: translateY(6px); box-shadow: 0 2px 0 #991b1b; }
        .slf-buzzer:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; border-color: #5f5f5f; }

        /* Results */
        .slf-results-grid { width: 100%; margin: 2rem 0; display: grid; gap: 0.8rem; }
        .slf-res-row { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 1.2rem; border-radius: 12px; }
        .slf-res-left { display: flex; flex-direction: column; }
        .slf-cat-label { font-size: 0.6rem; opacity: 0.5; font-weight: 900; }
        .slf-val-text { font-size: 1.2rem; font-weight: 700; }
        .slf-eval-reason { margin-top: 0.2rem; font-size: 0.72rem; opacity: 0.8; }
        .slf-badge { font-size: 0.8rem; padding: 0.3rem 0.8rem; border-radius: 6px; font-weight: 900; text-transform: uppercase; }
        .slf-badge.correct { background: #22c55e; box-shadow: 0 0 15px rgba(34, 197, 94, 0.4); }
        .slf-badge.partial { background: #f59e0b; color: #2b1700; }
        .slf-badge.wrong { background: #ef4444; opacity: 0.8; }
        .slf-points-info { margin-bottom: 1rem; font-size: 1.1rem; }
        .slf-points-info span { color: #22c55e; font-weight: 800; font-size: 1.5rem; }
        .slf-points-pending { color: #fbbf24 !important; font-size: 1rem !important; }

        /* Game Over */
        .slf-win-title { font-size: 2.5rem; margin-bottom: 2rem; color: #fbbf24; }
        .slf-final-rank { width: 100%; display: grid; gap: 0.8rem; }
        .slf-rank-row { display: flex; align-items: center; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 12px; }
        .slf-rank-row.top { background: linear-gradient(90deg, rgba(251, 191, 36, 0.2), transparent); border: 1px solid rgba(251, 191, 36, 0.3); }
        .slf-rank-num { font-size: 1.5rem; font-weight: 900; margin-right: 1.5rem; opacity: 0.5; }
        .slf-player-name { flex: 1; font-weight: 600; }
        .slf-player-score { font-weight: 900; color: #a855f7; }
        .slf-record-box { margin-top: 1.2rem; width: 100%; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.45); border-radius: 12px; padding: 0.9rem 1rem; text-align: center; }
        .slf-toplist { width: 100%; margin-top: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0.8rem 1rem; }
        .slf-toplist h4 { margin: 0 0 0.6rem 0; font-size: 0.95rem; opacity: 0.85; }
        .slf-top-row { display: flex; justify-content: space-between; gap: 0.8rem; font-size: 0.86rem; opacity: 0.9; padding: 0.22rem 0; }
        .slf-protocol { width: 100%; margin-top: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 0.85rem 1rem; }
        .slf-protocol summary { cursor: pointer; font-weight: 700; margin-bottom: 0.8rem; }
        .slf-protocol-round { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.7rem; margin-top: 0.7rem; }
        .slf-protocol-round h5 { margin: 0 0 0.6rem; opacity: 0.9; }
        .slf-protocol-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.7rem; }
        .slf-protocol-player { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; padding: 0.6rem 0.7rem; }
        .slf-protocol-row { display: flex; justify-content: space-between; gap: 0.6rem; font-size: 0.8rem; padding: 0.12rem 0; opacity: 0.9; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { from { transform: scale(1); } to { transform: scale(1.1); } }
        @keyframes letterPop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default SLFGameContainer;
