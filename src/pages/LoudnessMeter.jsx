import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Play, Pause, Target, Clock, Award, Mic, MicOff, Settings } from 'lucide-react';
import { useMicrophone } from '../hooks/useAudio';
import useLocalStats from '../hooks/useLocalStats';
import './LoudnessMeter.css';

function LoudnessMeter() {
  const { stats, incrementStat, addRecord, logSession } = useLocalStats();
  
  // Sensitivity settings - higher boost = easier to reach target
  const [sensitivityBoost, setSensitivityBoost] = useState(() => {
    const saved = localStorage.getItem('micSensitivity');
    return saved ? parseFloat(saved) : 2.0;
  });
  const [showSettings, setShowSettings] = useState(false);
  
  const { 
    volume, 
    rawVolume,
    isListening, 
    error, 
    permission,
    startListening, 
    stopListening 
  } = useMicrophone({ smoothingFactor: 0.5, sensitivityBoost });

  const [targetVolume, setTargetVolume] = useState(40);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [breathHoldTime, setBreathHoldTime] = useState(0);
  const [isBreathExercise, setIsBreathExercise] = useState(false);
  const [breathStarted, setBreathStarted] = useState(false);
  const [bestBreathTime, setBestBreathTime] = useState(0);
  const [targetsHit, setTargetsHit] = useState(0);
  
  const timerRef = useRef(null);
  const breathTimerRef = useRef(null);
  const sessionStartRef = useRef(null);
  const targetHitRef = useRef(false);

  // Start practice session
  const startSession = useCallback(async () => {
    const success = await startListening();
    if (success) {
      setIsSessionActive(true);
      sessionStartRef.current = Date.now();
      setTargetsHit(0);
      
      timerRef.current = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      }, 1000);
    }
  }, [startListening]);

  // End practice session
  const endSession = useCallback(() => {
    stopListening();
    setIsSessionActive(false);
    setIsBreathExercise(false);
    setBreathStarted(false);
    setBreathHoldTime(0);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (breathTimerRef.current) {
      clearInterval(breathTimerRef.current);
    }

    // Log session
    if (sessionTime > 0) {
      incrementStat('loudness_sessions');
      logSession('loudness', sessionTime);
      
      if (targetsHit > 0) {
        incrementStat('volume_targets_hit', targetsHit);
      }
    }
  }, [stopListening, sessionTime, targetsHit, incrementStat, logSession]);

  // Start breath hold exercise
  const startBreathExercise = useCallback(() => {
    setIsBreathExercise(true);
    setBreathStarted(false);
    setBreathHoldTime(0);
    setBestBreathTime(0);
  }, []);

  // Track if volume is above target (for counting hits)
  useEffect(() => {
    if (isSessionActive && volume >= targetVolume && !targetHitRef.current) {
      targetHitRef.current = true;
      setTargetsHit(prev => prev + 1);
    } else if (volume < targetVolume - 10) {
      targetHitRef.current = false;
    }
  }, [volume, targetVolume, isSessionActive]);

  // Breath exercise: track sustained phonation
  useEffect(() => {
    if (isBreathExercise && isSessionActive) {
      // Start timer when volume exceeds target
      if (volume >= targetVolume && !breathStarted) {
        setBreathStarted(true);
        breathTimerRef.current = setInterval(() => {
          setBreathHoldTime(prev => {
            const newTime = prev + 0.1;
            if (newTime > bestBreathTime) {
              setBestBreathTime(newTime);
            }
            return newTime;
          });
        }, 100);
      }
      // Stop timer when volume drops
      else if (volume < targetVolume - 10 && breathStarted) {
        setBreathStarted(false);
        if (breathTimerRef.current) {
          clearInterval(breathTimerRef.current);
        }
        
        // Save breath record if significant
        if (breathHoldTime >= 1) {
          addRecord('breath_hold_records', {
            duration: parseFloat(breathHoldTime.toFixed(1))
          });
        }
        setBreathHoldTime(0);
      }
    }
  }, [volume, targetVolume, isBreathExercise, breathStarted, breathHoldTime, bestBreathTime, addRecord, isSessionActive]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('micSensitivity', sensitivityBoost.toString());
  }, [sensitivityBoost]);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get volume color based on target
  const getVolumeColor = () => {
    if (volume >= targetVolume) return 'var(--accent-success)';
    if (volume >= targetVolume * 0.7) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };

  // Get feedback text
  const getFeedback = () => {
    if (!isSessionActive) return 'Press Start to begin';
    if (volume >= targetVolume) return 'Great volume! Keep it up! 🎯';
    if (volume >= targetVolume * 0.7) return 'Almost there! Speak louder!';
    if (volume >= targetVolume * 0.3) return 'Try to be louder!';
    return 'Speak up! Think LOUD!';
  };

  return (
    <div className="loudness-page">
      <header className="page-header">
        <h1 className="page-title">Loudness Meter</h1>
        <p className="page-subtitle">
          Visual feedback to help you maintain proper volume and breath support
        </p>
      </header>

      <div className="instructions">
        <h4>LSVT Principle: Think LOUD</h4>
        <ol>
          <li>Set your target volume using the slider</li>
          <li>Press Start and begin speaking</li>
          <li>Watch the meter - keep it <strong>green</strong> above the target line</li>
          <li>Try the "Sustain Ahhh" exercise for breath support</li>
        </ol>
      </div>

      {/* Error/Permission Message */}
      {error && (
        <div className="error-message">
          <MicOff size={20} />
          {error}
        </div>
      )}

      {/* Session Controls */}
      <div className="session-controls">
        {!isSessionActive ? (
          <button className="btn btn-primary btn-large" onClick={startSession}>
            <Mic size={24} />
            Start Session
          </button>
        ) : (
          <>
            <button className="btn btn-danger btn-large" onClick={endSession}>
              <Pause size={24} />
              End Session
            </button>
            {!isBreathExercise ? (
              <button className="btn btn-success" onClick={startBreathExercise}>
                <Clock size={20} />
                Sustain "Ahhh"
              </button>
            ) : (
              <button className="btn" onClick={() => setIsBreathExercise(false)}>
                Exit Exercise
              </button>
            )}
          </>
        )}
      </div>

      {/* Session Stats */}
      <div className="session-stats">
        <div className="stat-item">
          <Clock size={20} />
          <span className="stat-value">{formatTime(sessionTime)}</span>
          <span className="stat-label">Time</span>
        </div>
        <div className="stat-item">
          <Target size={20} />
          <span className="stat-value">{targetsHit}</span>
          <span className="stat-label">Targets Hit</span>
        </div>
        {isBreathExercise && (
          <div className="stat-item highlight">
            <Award size={20} />
            <span className="stat-value">{bestBreathTime.toFixed(1)}s</span>
            <span className="stat-label">Best Hold</span>
          </div>
        )}
      </div>

      {/* Main Volume Meter */}
      <div className="meter-container">
        <div className="volume-meter">
          <div 
            className="volume-fill"
            style={{ 
              transform: `scaleY(${Math.max(0, Math.min(100, volume)) / 100})`,
              backgroundColor: getVolumeColor()
            }}
          />
          <div 
            className="target-line"
            style={{ bottom: `${targetVolume}%` }}
          >
            <span className="target-label">Target</span>
          </div>
          <div className="volume-value">
            {Math.round(volume)}
          </div>
        </div>

        {/* Breath Exercise Timer */}
        {isBreathExercise && (
          <div className="breath-timer">
            <div className={`breath-circle ${breathStarted ? 'active' : ''}`}>
              <span className="breath-time">{breathHoldTime.toFixed(1)}s</span>
              <span className="breath-label">
                {breathStarted ? 'Holding!' : 'Say "Ahhh"'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Text */}
      <div className="feedback-text" style={{ color: getVolumeColor() }}>
        {getFeedback()}
      </div>

      {/* Target Volume Control */}
      <div className="target-control">
        <label htmlFor="target-volume">
          Target Volume: <strong>{targetVolume}%</strong>
        </label>
        <input
          id="target-volume"
          type="range"
          min="10"
          max="80"
          step="5"
          value={targetVolume}
          onChange={(e) => setTargetVolume(Number(e.target.value))}
          className="volume-slider"
        />
        <div className="volume-labels">
          <span>Soft (10%)</span>
          <span>Loud (80%)</span>
        </div>
      </div>

      {/* Sensitivity Settings */}
      <div className="settings-section">
        <button 
          className="btn settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings size={18} />
          {showSettings ? 'Hide Settings' : 'Microphone Sensitivity'}
        </button>
        
        {showSettings && (
          <div className="sensitivity-control">
            <label htmlFor="sensitivity">
              Sensitivity: <strong>{sensitivityBoost.toFixed(1)}x</strong>
              <span className="sensitivity-hint">
                {sensitivityBoost < 1.5 ? '(Less sensitive)' : 
                 sensitivityBoost > 3 ? '(Very sensitive)' : '(Normal)'}
              </span>
            </label>
            <input
              id="sensitivity"
              type="range"
              min="0.5"
              max="4"
              step="0.5"
              value={sensitivityBoost}
              onChange={(e) => setSensitivityBoost(Number(e.target.value))}
              className="sensitivity-slider"
            />
            <div className="volume-labels">
              <span>Low (quiet mics)</span>
              <span>High (loud mics)</span>
            </div>
            <p className="settings-note">
              Increase sensitivity if the meter barely moves when you speak normally.
              Decrease if it maxes out too easily.
            </p>
          </div>
        )}
      </div>

      {/* Best Records */}
      {stats.breath_hold_records && stats.breath_hold_records.length > 0 && (
        <div className="records-card">
          <h4>
            <Award size={18} />
            Personal Best Breath Holds
          </h4>
          <div className="records-list">
            {stats.breath_hold_records
              .sort((a, b) => b.duration - a.duration)
              .slice(0, 5)
              .map((record, i) => (
                <div key={i} className="record-item">
                  <span className="record-rank">#{i + 1}</span>
                  <span className="record-duration">{record.duration}s</span>
                  <span className="record-date">
                    {new Date(record.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LoudnessMeter;
