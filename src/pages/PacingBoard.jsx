import { useState, useEffect, useCallback, useRef } from 'react';
import { CircleDot, Play, Pause, RotateCcw, Clock, Target, RefreshCw } from 'lucide-react';
import useLocalStats from '../hooks/useLocalStats';
import { getRandomWords, countSyllables, getPhoneticSyllables } from '../data/pacingWords';
import './PacingBoard.css';

function PacingBoard() {
  const { stats, incrementStat, addRecord, logSession } = useLocalStats();
  
  const [isActive, setIsActive] = useState(false);
  const [tapTimes, setTapTimes] = useState([]);
  const [currentTap, setCurrentTap] = useState(0); // Current syllable count for this word
  const [sessionTime, setSessionTime] = useState(0);
  const [avgTime, setAvgTime] = useState(0);
  const [targetTime, setTargetTime] = useState(500); // ms per syllable
  const [practiceWords, setPracticeWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [syllableFilter, setSyllableFilter] = useState(null); // null = all
  const [wordComplete, setWordComplete] = useState(false);
  
  const timerRef = useRef(null);
  const lastTapRef = useRef(null);
  const sessionStartRef = useRef(null);

  // Load initial practice words
  useEffect(() => {
    loadNewWords();
  }, [syllableFilter]);

  const loadNewWords = () => {
    const words = getRandomWords(20, syllableFilter);
    setPracticeWords(words);
    setCurrentWordIndex(0);
  };

  const nextWord = () => {
    if (currentWordIndex < practiceWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setCurrentTap(0);
      setWordComplete(false);
      lastTapRef.current = null;
    } else {
      // Load more words
      loadNewWords();
    }
  };

  const getCurrentWord = () => {
    return practiceWords[currentWordIndex] || 'loading...';
  };

  const getCurrentSyllables = () => {
    const word = getCurrentWord();
    return countSyllables(word);
  };

  // Start session
  const startSession = useCallback(() => {
    setIsActive(true);
    setTapTimes([]);
    setCurrentTap(0);
    setWordComplete(false);
    setAvgTime(0);
    sessionStartRef.current = Date.now();
    lastTapRef.current = null;
    
    timerRef.current = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
  }, []);

  // End session
  const endSession = useCallback(() => {
    setIsActive(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Log the session
    if (tapTimes.length > 0) {
      const avgSyllableTime = tapTimes.reduce((a, b) => a + b, 0) / tapTimes.length;
      
      addRecord('syllable_times', {
        avg: Math.round(avgSyllableTime),
        count: tapTimes.length,
        duration: sessionTime
      });
      
      incrementStat('pacing_sessions');
      logSession('pacing', sessionTime);
    }
  }, [tapTimes, sessionTime, addRecord, incrementStat, logSession]);

  // Reset session
  const resetSession = useCallback(() => {
    setIsActive(false);
    setTapTimes([]);
    setCurrentTap(0);
    setWordComplete(false);
    setSessionTime(0);
    setAvgTime(0);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  // Handle single button tap - tracks syllables for current word
  const handleTap = useCallback(() => {
    if (!isActive || wordComplete) return;

    const now = Date.now();
    const syllableCount = getCurrentSyllables();
    
    // Calculate time since last tap
    if (lastTapRef.current !== null) {
      const interval = now - lastTapRef.current;
      setTapTimes(prev => {
        const newTimes = [...prev, interval];
        // Calculate rolling average
        const avg = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
        setAvgTime(Math.round(avg));
        return newTimes;
      });
    }

    lastTapRef.current = now;
    
    // Increment tap count
    const newTapCount = currentTap + 1;
    setCurrentTap(newTapCount);

    // Play click sound
    playClickSound();

    // Check if word is complete
    if (newTapCount >= syllableCount) {
      setWordComplete(true);
      // Auto-advance to next word after a brief delay
      setTimeout(() => {
        nextWord();
      }, 600);
    }
  }, [isActive, wordComplete, currentTap, getCurrentSyllables, nextWord]);

  // Play a subtle click sound
  const playClickSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Audio not supported, fail silently
    }
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine pace feedback
  const getPaceFeedback = () => {
    if (tapTimes.length < 2) return { text: 'Start tapping...', color: 'var(--text-muted)' };
    
    if (avgTime < targetTime - 100) {
      return { text: 'Too fast! Slow down', color: 'var(--accent-warning)' };
    } else if (avgTime > targetTime + 200) {
      return { text: 'Good pace!', color: 'var(--accent-success)' };
    } else {
      return { text: 'Great rhythm!', color: 'var(--accent-primary)' };
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const paceFeedback = getPaceFeedback();

  return (
    <div className="pacing-board-page">
      <header className="page-header">
        <h1 className="page-title">Pacing Board</h1>
        <p className="page-subtitle">
          Tap once for each syllable to control your speech rate
        </p>
      </header>

      <div className="instructions">
        <h4>How to Use</h4>
        <ol>
          <li>Press "Start Session" to begin</li>
          <li>Say the word, tapping the button for each <strong>syllable</strong></li>
          <li>The word auto-advances when all syllables are tapped</li>
        </ol>
      </div>

      {/* Session Controls */}
      <div className="session-controls">
        {!isActive ? (
          <button className="btn btn-primary btn-large" onClick={startSession}>
            <Play size={24} />
            Start Session
          </button>
        ) : (
          <>
            <button className="btn btn-danger btn-large" onClick={endSession}>
              <Pause size={24} />
              End Session
            </button>
            <button className="btn" onClick={resetSession}>
              <RotateCcw size={20} />
              Reset
            </button>
          </>
        )}
      </div>

      {/* Pace Feedback */}
      {isActive && (
        <div className="pace-feedback" style={{ color: paceFeedback.color }}>
          {paceFeedback.text}
        </div>
      )}

      {/* Word Suggestion */}
      <div className="word-suggestion">
        <div className="word-header">
          <h3>Practice Word</h3>
          <div className="word-controls">
            <select 
              className="syllable-filter"
              value={syllableFilter || 'all'}
              onChange={(e) => setSyllableFilter(e.target.value === 'all' ? null : Number(e.target.value))}
            >
              <option value="all">All Syllables</option>
              <option value="2">2 Syllables</option>
              <option value="3">3 Syllables</option>
              <option value="4">4 Syllables</option>
              <option value="5">5+ Syllables</option>
            </select>
            <button className="btn-icon" onClick={loadNewWords} title="Load new words">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
        <div className="current-word">
          <span className="word-text">{getCurrentWord()}</span>
          <span className="phonetic-text">{getPhoneticSyllables(getCurrentWord())}</span>
          <div className="syllable-progress">
            {Array.from({ length: getCurrentSyllables() }).map((_, i) => (
              <span 
                key={i} 
                className={`syllable-dot ${i < currentTap ? 'filled' : ''} ${wordComplete ? 'complete' : ''}`}
              />
            ))}
          </div>
          <span className="syllable-count">
            {currentTap} / {getCurrentSyllables()} syllables
          </span>
        </div>
      </div>

      {/* Single Tap Button */}
      <div className={`pacing-board ${isActive ? 'active' : 'inactive'}`}>
        <button
          className={`pace-button single ${wordComplete ? 'complete' : ''}`}
          onClick={handleTap}
          disabled={!isActive || wordComplete}
          aria-label="Tap for syllable"
        >
          <span className="pace-button-text">
            {wordComplete ? '✓' : 'TAP'}
          </span>
        </button>
        {!wordComplete && isActive && (
          <button className="btn btn-secondary skip-btn" onClick={nextWord}>
            Skip Word
          </button>
        )}
      </div>

      {/* Target Speed Control */}
      <div className="target-control">
        <label htmlFor="target-speed">
          Target pace: <strong>{targetTime}ms</strong> per syllable
        </label>
        <input
          id="target-speed"
          type="range"
          min="300"
          max="1000"
          step="50"
          value={targetTime}
          onChange={(e) => setTargetTime(Number(e.target.value))}
          className="speed-slider"
        />
        <div className="speed-labels">
          <span>Fast (300ms)</span>
          <span>Slow (1000ms)</span>
        </div>
      </div>

      {/* Timer & Stats - Compact at bottom */}
      <div className="session-stats-compact">
        <span className="mini-stat">
          <Clock size={14} /> {formatTime(sessionTime)}
        </span>
        <span className="mini-stat">
          <CircleDot size={14} /> {tapTimes.length} taps
        </span>
        <span className="mini-stat">
          <Target size={14} /> {avgTime || '---'}ms avg
        </span>
      </div>

      {/* Session History Preview */}
      {stats.syllable_times && stats.syllable_times.length > 0 && (
        <div className="history-preview">
          <h4>Recent Sessions</h4>
          <div className="history-list">
            {stats.syllable_times.slice(-5).reverse().map((record, i) => (
              <div key={i} className="history-item">
                <span>{new Date(record.date).toLocaleDateString()}</span>
                <span>{record.count} taps</span>
                <span>{record.avg}ms avg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PacingBoard;
