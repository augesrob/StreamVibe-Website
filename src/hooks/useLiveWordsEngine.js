/**
 * useLiveWordsEngine
 * Core game logic for StreamVibe Live Words.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  generateLetterSet, isValidWord, canFormWord, scoreWord,
} from '@/lib/wordList';

const DEFAULT_ROUND_SECS = 60;

export function useLiveWordsEngine() {
  // ── Configurable settings ──────────────────────────────────────────────────
  const [roundDuration, setRoundDuration] = useState(DEFAULT_ROUND_SECS);
  const [chatCommand,   setChatCommand]   = useState('!word');
  const [minWordLength, setMinWordLength] = useState(3);
  const [allowDupes,    setAllowDupes]    = useState(false); // allow same word found by diff users?
  const [maxRounds,     setMaxRounds]     = useState(0); // 0 = unlimited

  // ── Round state ───────────────────────────────────────────────────────────
  const [phase,        setPhase]        = useState('idle');   // idle|running|finished
  const [remaining,    setRemaining]    = useState(DEFAULT_ROUND_SECS);
  const [letters,      setLetters]      = useState([]);
  const [possibleWords,setPossibleWords] = useState([]);
  const [foundWords,   setFoundWords]   = useState([]);       // [{word,user,score,ts}]
  const [rejectedFeed, setRejectedFeed] = useState([]);       // [{user,text,reason}]
  const [roundNum,     setRoundNum]     = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);   // past rounds

  // Leaderboard: { username -> { score, words[] } }
  const [scores, setScores] = useState({});

  const phaseRef   = useRef('idle');
  const remainRef  = useRef(DEFAULT_ROUND_SECS);
  const lettersRef = useRef([]);
  const foundSetRef = useRef(new Set()); // normalised words found this round
  const timerRef   = useRef(null);

  useEffect(() => { phaseRef.current   = phase;   }, [phase]);
  useEffect(() => { remainRef.current  = remaining; }, [remaining]);
  useEffect(() => { lettersRef.current = letters;  }, [letters]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const finishRound = useCallback(() => {
    stopTimer();
    setPhase('finished');
    phaseRef.current = 'finished';
  }, [stopTimer]);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      if (phaseRef.current !== 'running') return;
      setRemaining(prev => {
        const next = Math.max(0, prev - 1);
        remainRef.current = next;
        if (next === 0) finishRound();
        return next;
      });
    }, 1000);
  }, [stopTimer, finishRound]);

  /** Begin a fresh round */
  const startRound = useCallback(() => {
    const { letters: lts, possibleWords: pw } = generateLetterSet();
    foundSetRef.current = new Set();
    setLetters(lts);
    lettersRef.current = lts;
    setPossibleWords(pw);
    setFoundWords([]);
    setRejectedFeed([]);
    setRemaining(roundDuration);
    remainRef.current = roundDuration;
    setRoundNum(n => n + 1);
    setPhase('running');
    phaseRef.current = 'running';
    startTimer();
  }, [roundDuration, startTimer]);

  /** Reset completely (clears scores too) */
  const fullReset = useCallback(() => {
    stopTimer();
    setPhase('idle');
    phaseRef.current = 'idle';
    setLetters([]);
    setFoundWords([]);
    setRejectedFeed([]);
    setScores({});
    setRoundNum(0);
    setSessionHistory([]);
    foundSetRef.current = new Set();
  }, [stopTimer]);

  /** Save current round to history and start a new one */
  const nextRound = useCallback(() => {
    setSessionHistory(h => [
      { roundNum, foundWords, scores: { ...scores }, ts: new Date().toLocaleTimeString() },
      ...h,
    ].slice(0, 20));
    startRound();
  }, [roundNum, foundWords, scores, startRound]);

  /**
   * Called by TikTok connector when a chat message arrives.
   * Returns { accepted: bool, reason?: string }
   */
  const processChatMessage = useCallback((user, text) => {
    if (phaseRef.current !== 'running') return { accepted: false, reason: 'no_game' };

    const parts   = text.trim().split(/\s+/);
    const cmd     = parts[0]?.toLowerCase();

    // Must start with the configured command
    if (cmd !== chatCommand.toLowerCase()) return { accepted: false };

    const raw  = parts[1]?.toLowerCase() ?? '';
    const word = raw.replace(/[^a-z]/g, '');

    if (!word) return { accepted: false, reason: 'empty' };
    if (word.length < minWordLength) {
      addRejected(user, raw, `Too short (min ${minWordLength})`);
      return { accepted: false, reason: 'too_short' };
    }
    if (!isValidWord(word)) {
      addRejected(user, raw, 'Not a real word');
      return { accepted: false, reason: 'not_word' };
    }
    if (!canFormWord(word, lettersRef.current)) {
      addRejected(user, raw, 'Letters not available');
      return { accepted: false, reason: 'bad_letters' };
    }
    if (!allowDupes && foundSetRef.current.has(word)) {
      addRejected(user, raw, 'Already found');
      return { accepted: false, reason: 'dupe' };
    }

    // ✅ Valid!
    const pts = scoreWord(word);
    foundSetRef.current.add(word);
    const entry = { word, user, score: pts, ts: Date.now() };
    setFoundWords(prev => [entry, ...prev]);
    setScores(prev => {
      const existing = prev[user] ?? { score: 0, words: [] };
      return {
        ...prev,
        [user]: { score: existing.score + pts, words: [word, ...existing.words].slice(0, 50) },
      };
    });
    return { accepted: true, word, score: pts };
  }, [chatCommand, minWordLength, allowDupes]);

  function addRejected(user, text, reason) {
    setRejectedFeed(prev => [{ user, text, reason, ts: Date.now() }, ...prev].slice(0, 30));
  }

  // Build sorted leaderboard array
  const leaderboard = Object.entries(scores)
    .map(([user, data]) => ({ user, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  // Overlay-safe snapshot (written to localStorage)
  useEffect(() => {
    if (!letters.length) return;
    try {
      localStorage.setItem('sv_livewords_overlay', JSON.stringify({
        phase, remaining, letters, foundWords: foundWords.slice(0, 8),
        leaderboard: leaderboard.slice(0, 5), roundNum,
      }));
    } catch (_) {}
  }, [phase, remaining, letters, foundWords, leaderboard, roundNum]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  return {
    // state
    phase, remaining, letters, possibleWords, foundWords, rejectedFeed,
    scores, leaderboard, roundNum, sessionHistory,
    // settings
    roundDuration, chatCommand, minWordLength, allowDupes, maxRounds,
    // setting setters
    setRoundDuration, setChatCommand, setMinWordLength, setAllowDupes, setMaxRounds,
    // actions
    startRound, finishRound, nextRound, fullReset,
    processChatMessage,
  };
}
