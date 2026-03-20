/**
 * useLiveWordsEngine
 * Core game logic for StreamVibe Live Words.
 *
 * chatMode: 'command' — viewers must type "!word <answer>"
 *           'any'     — any chat message is treated as a word guess
 * autoNextRound: when true, auto-advances to next round after finished phase
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  generateLetterSet, isValidWord, canFormWord, scoreWord,
} from '@/lib/wordList';

const DEFAULT_ROUND_SECS = 60;
const DEFAULT_AUTO_DELAY = 10; // seconds to show word reveal before auto-next

export function useLiveWordsEngine() {
  const [roundDuration, setRoundDuration] = useState(DEFAULT_ROUND_SECS);
  const [chatCommand,   setChatCommand]   = useState('!word');
  const [chatMode,      setChatMode]      = useState('command');
  const [minWordLength, setMinWordLength] = useState(3);
  const [allowDupes,    setAllowDupes]    = useState(false);
  const [overlayTheme,  setOverlayTheme]  = useState('purple');
  const [maxRounds,     setMaxRounds]     = useState(0);
  const [autoNextRound, setAutoNextRound] = useState(false);
  const [autoNextDelay, setAutoNextDelay] = useState(DEFAULT_AUTO_DELAY);
  const [autoNextCountdown, setAutoNextCountdown] = useState(0); // counts down visibly

  const [phase,         setPhase]         = useState('idle');
  const [remaining,     setRemaining]     = useState(DEFAULT_ROUND_SECS);
  const [letters,       setLetters]       = useState([]);
  const [possibleWords, setPossibleWords] = useState([]);
  const [foundWords,    setFoundWords]    = useState([]);
  const [rejectedFeed,  setRejectedFeed]  = useState([]);
  const [roundNum,      setRoundNum]      = useState(0);
  const [sessionHistory,setSessionHistory]= useState([]);
  const [scores,        setScores]        = useState({});

  const phaseRef        = useRef('idle');
  const remainRef       = useRef(DEFAULT_ROUND_SECS);
  const lettersRef      = useRef([]);
  const foundSetRef     = useRef(new Set());
  const timerRef        = useRef(null);
  const autoNextRef     = useRef(false);
  const autoNextDelayRef= useRef(DEFAULT_AUTO_DELAY);
  const autoNextTimerRef= useRef(null);
  const autoCountdownRef= useRef(null);

  // Settings refs (stale-closure-free)
  const chatModeRef    = useRef('command');
  const chatCommandRef = useRef('!word');
  const minWordRef     = useRef(3);
  const allowDupesRef  = useRef(false);

  useEffect(() => { phaseRef.current       = phase;         }, [phase]);
  useEffect(() => { remainRef.current      = remaining;     }, [remaining]);
  useEffect(() => { lettersRef.current     = letters;       }, [letters]);
  useEffect(() => { chatModeRef.current    = chatMode;      }, [chatMode]);
  useEffect(() => { chatCommandRef.current = chatCommand;   }, [chatCommand]);
  useEffect(() => { minWordRef.current     = minWordLength; }, [minWordLength]);
  useEffect(() => { allowDupesRef.current  = allowDupes;   }, [allowDupes]);
  useEffect(() => { autoNextRef.current    = autoNextRound; }, [autoNextRound]);
  useEffect(() => { autoNextDelayRef.current = autoNextDelay; }, [autoNextDelay]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopAutoNext = useCallback(() => {
    if (autoNextTimerRef.current)  { clearTimeout(autoNextTimerRef.current);  autoNextTimerRef.current  = null; }
    if (autoCountdownRef.current)  { clearInterval(autoCountdownRef.current); autoCountdownRef.current  = null; }
    setAutoNextCountdown(0);
  }, []);

  // forward-declared via ref so finishRound can call it
  const nextRoundRef = useRef(null);

  const finishRound = useCallback(() => {
    stopTimer();
    setPhase('finished'); phaseRef.current = 'finished';

    // Auto-next: start countdown then fire nextRound
    if (autoNextRef.current) {
      const delay = autoNextDelayRef.current;
      setAutoNextCountdown(delay);
      autoCountdownRef.current = setInterval(() => {
        setAutoNextCountdown(prev => {
          if (prev <= 1) {
            clearInterval(autoCountdownRef.current);
            autoCountdownRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      autoNextTimerRef.current = setTimeout(() => {
        nextRoundRef.current?.();
      }, delay * 1000);
    }
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

  const startRound = useCallback(() => {
    stopAutoNext(); // cancel any pending auto-next from previous round
    const { letters: lts, possibleWords: pw } = generateLetterSet();
    foundSetRef.current = new Set();
    setLetters(lts); lettersRef.current = lts;
    setPossibleWords(pw);
    setFoundWords([]);    // ← clears overlay word feed
    setRejectedFeed([]);
    setRemaining(roundDuration); remainRef.current = roundDuration;
    setRoundNum(n => n + 1);
    setPhase('running'); phaseRef.current = 'running';
    startTimer();
  }, [roundDuration, startTimer, stopAutoNext]);

  const fullReset = useCallback(() => {
    stopTimer(); stopAutoNext();
    setPhase('idle'); phaseRef.current = 'idle';
    setLetters([]); setFoundWords([]); setRejectedFeed([]);
    setScores({}); setRoundNum(0); setSessionHistory([]);
    setPossibleWords([]);
    foundSetRef.current = new Set();
  }, [stopTimer, stopAutoNext]);

  const nextRound = useCallback(() => {
    stopAutoNext();
    setSessionHistory(h => [
      { roundNum, foundWords, scores: { ...scores }, ts: new Date().toLocaleTimeString() },
      ...h,
    ].slice(0, 20));
    startRound();
  }, [roundNum, foundWords, scores, startRound, stopAutoNext]);

  // Keep nextRoundRef current so finishRound timeout can call it
  useEffect(() => { nextRoundRef.current = nextRound; }, [nextRound]);

  const processChatMessage = useCallback((user, text) => {
    if (phaseRef.current !== 'running') return { accepted: false, reason: 'no_game' };

    const mode = chatModeRef.current;
    let word = '';

    if (mode === 'command') {
      const parts = text.trim().split(/\s+/);
      const cmd   = parts[0]?.toLowerCase();
      if (cmd !== chatCommandRef.current.toLowerCase()) return { accepted: false };
      const raw = parts[1]?.toLowerCase() ?? '';
      word = raw.replace(/[^a-z]/g, '');
    } else {
      const trimmed = text.trim();
      if (trimmed.startsWith('!')) return { accepted: false };
      word = trimmed.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
    }

    if (!word) return { accepted: false, reason: 'empty' };

    const minLen = minWordRef.current;
    if (word.length < minLen) {
      addRejected(user, word, `Too short (min ${minLen})`);
      return { accepted: false, reason: 'too_short' };
    }
    if (!isValidWord(word)) {
      addRejected(user, word, 'Not a real word');
      return { accepted: false, reason: 'not_word' };
    }
    if (!canFormWord(word, lettersRef.current)) {
      addRejected(user, word, 'Letters not available');
      return { accepted: false, reason: 'bad_letters' };
    }
    if (!allowDupesRef.current && foundSetRef.current.has(word)) {
      addRejected(user, word, 'Already found');
      return { accepted: false, reason: 'dupe' };
    }

    const pts = scoreWord(word);
    foundSetRef.current.add(word);
    const entry = { word, user, score: pts, ts: Date.now() };
    setFoundWords(prev => [entry, ...prev]);
    setScores(prev => {
      const existing = prev[user] ?? { score: 0, words: [] };
      return { ...prev, [user]: { score: existing.score + pts, words: [word, ...existing.words].slice(0, 50) } };
    });
    return { accepted: true, word, score: pts };
  }, []);

  function addRejected(user, text, reason) {
    setRejectedFeed(prev => [{ user, text, reason, ts: Date.now() }, ...prev].slice(0, 30));
  }

  const leaderboard = Object.entries(scores)
    .map(([user, data]) => ({ user, ...data }))
    .sort((a, b) => b.score - a.score).slice(0, 20);

  useEffect(() => () => { stopTimer(); stopAutoNext(); }, [stopTimer, stopAutoNext]);

  return {
    phase, remaining, letters, possibleWords, foundWords, rejectedFeed,
    scores, leaderboard, roundNum, sessionHistory,
    roundDuration, chatCommand, chatMode, minWordLength, allowDupes, maxRounds, overlayTheme,
    autoNextRound, autoNextDelay, autoNextCountdown,
    setRoundDuration, setChatCommand, setChatMode, setMinWordLength, setAllowDupes,
    setMaxRounds, setOverlayTheme, setAutoNextRound, setAutoNextDelay,
    startRound, finishRound, nextRound, fullReset, processChatMessage,
  };
}
