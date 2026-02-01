import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Play, RotateCcw, Square, Volume2, Shuffle } from 'lucide-react';
import useLocalStats from '../hooks/useLocalStats';
import { practicePhrases } from '../data/practicePhrases';
import './ArticulationMirror.css';

function ArticulationMirror() {
  const { incrementStat, logSession } = useLocalStats();

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioMimeType, setAudioMimeType] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [recordingsCount, setRecordingsCount] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState(0);
  const [shuffledPhrases, setShuffledPhrases] = useState(() => {
    // Fisher-Yates shuffle on initial load
    const shuffled = [...practicePhrases];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const durationTimerRef = useRef(null);
  const sessionStartRef = useRef(null);

  // Start session
  const startSession = useCallback(() => {
    setIsSessionActive(true);
    setRecordingsCount(0);
    sessionStartRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
  }, []);

  // End session
  const endSession = useCallback(() => {
    setIsSessionActive(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Log session
    if (recordingsCount > 0) {
      incrementStat('articulation_sessions');
      incrementStat('recordings_made', recordingsCount);
      logSession('articulation', sessionTime);
    }
  }, [recordingsCount, sessionTime, incrementStat, logSession]);

  // Start recording
  const handleRecordStart = useCallback(async () => {
    try {
      if (!isSessionActive) {
        startSession();
      }

      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      }

      // Clear previous recording
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      chunksRef.current = [];
      setDuration(0);
      setPlaybackProgress(0);
      setError(null);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      streamRef.current = stream;

      // Determine supported mime type (record + playback)
      const testAudio = document.createElement('audio');
      const candidateTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4'
      ];

      let mimeType = 'audio/webm';
      for (const type of candidateTypes) {
        const baseType = type.split(';')[0];
        const canRecord = MediaRecorder.isTypeSupported(type);
        const canPlay = testAudio.canPlayType(baseType) !== '';
        if (canRecord && canPlay) {
          mimeType = type;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setAudioMimeType(mimeType);
        }
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Duration timer
      const startTime = Date.now();
      durationTimerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 100);

    } catch (err) {
      console.error('Recording error:', err);
      setError(err.message || 'Failed to access microphone. Please allow microphone permissions.');
    }
  }, [isSessionActive, startSession, audioUrl]);

  // Stop recording
  const handleRecordStop = useCallback(() => {
    if (isRecording && mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (err) {
        console.error('Stop recording error:', err);
      }
      
      setIsRecording(false);
      setRecordingsCount(prev => prev + 1);
      
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    }
  }, [isRecording]);

  // Play recording
  const playRecording = useCallback(() => {
    if (audioUrl && audioRef.current) {
      const audio = audioRef.current;
      
      // Handler to play once loaded
      const handleCanPlay = () => {
        audio.removeEventListener('canplaythrough', handleCanPlay);
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Playback error:', err);
              setError('Failed to play recording. Try recording again.');
            }
          });
      };
      
      // Check if already loaded
      if (audio.readyState >= 3) {
        audio.currentTime = 0;
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Playback error:', err);
              setError('Failed to play recording. Try recording again.');
            }
          });
      } else {
        audio.addEventListener('canplaythrough', handleCanPlay);
        audio.load();
      }
    }
  }, [audioUrl]);

  // Auto-play after recording stops
  useEffect(() => {
    if (audioUrl && !isRecording) {
      const timer = setTimeout(() => {
        playRecording();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [audioUrl, isRecording, playRecording]);

  // Handle playback ended
  const handlePlaybackEnded = useCallback(() => {
    setIsPlaying(false);
    setPlaybackProgress(0);
  }, []);

  // Update playback progress
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && audioRef.current.duration) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setPlaybackProgress(progress);
    }
  }, []);

  // Clear recording
  const clearRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioMimeType(null);
    setIsPlaying(false);
    setPlaybackProgress(0);
    setDuration(0);
  }, [audioUrl]);

  // Random phrase
  const randomPhrase = useCallback(() => {
    const newIndex = Math.floor(Math.random() * shuffledPhrases.length);
    setSelectedPhrase(newIndex);
  }, [shuffledPhrases]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPhrase = shuffledPhrases[selectedPhrase];

  return (
    <div className="articulation-page">
      <header className="page-header">
        <h1 className="page-title">Articulation Mirror</h1>
        <p className="page-subtitle">
          Record your speech and immediately hear it back for self-monitoring
        </p>
      </header>

      <div className="instructions">
        <h4>Motor Learning: Self-Monitoring</h4>
        <ol>
          <li>Select a practice phrase below (or speak freely)</li>
          <li><strong>Press and hold</strong> the big button while speaking</li>
          <li>Release to stop - your speech will <strong>auto-replay</strong></li>
          <li>Listen carefully and try again to improve</li>
        </ol>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <Mic size={20} />
          {error}
        </div>
      )}

      {/* Session Info */}
      {isSessionActive && (
        <div className="session-info">
          <span className="session-time">
            Session: {formatTime(sessionTime)}
          </span>
          <span className="recordings-count">
            Recordings: {recordingsCount}
          </span>
          <button className="btn btn-danger" onClick={endSession}>
            <Square size={16} />
            End Session
          </button>
        </div>
      )}

      {/* Practice Phrase */}
      <div className="phrase-card">
        <div className="phrase-header">
          <span className="phrase-label">Practice Phrase ({selectedPhrase + 1}/{shuffledPhrases.length})</span>
          <div className="phrase-controls">
            <button className="btn btn-primary btn-large phrase-next" onClick={randomPhrase}>
              <Shuffle size={18} /> Next Random
            </button>
          </div>
        </div>
        <p className="phrase-text">"{currentPhrase.text}"</p>
        <span className="phrase-focus">Focus: {currentPhrase.focus}</span>
      </div>

      {/* Main Record Button */}
      <div className="record-section">
        <button
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onMouseDown={handleRecordStart}
          onMouseUp={handleRecordStop}
          onMouseLeave={handleRecordStop}
          onTouchStart={(e) => { e.preventDefault(); handleRecordStart(); }}
          onTouchEnd={(e) => { e.preventDefault(); handleRecordStop(); }}
          aria-label={isRecording ? 'Recording... Release to stop' : 'Press and hold to record'}
        >
          <div className="record-button-inner">
            <Mic size={48} />
            <span className="record-label">
              {isRecording ? `Recording... ${duration}s` : 'Hold to Record'}
            </span>
          </div>
          {isRecording && (
            <div className="recording-indicator">
              <span className="pulse-ring"></span>
              <span className="pulse-ring delay"></span>
            </div>
          )}
        </button>
        <p className="record-hint">
          {isRecording 
            ? 'Speak now! Release when done.' 
            : 'Press and hold the button, then speak clearly'
          }
        </p>
      </div>

      {/* Playback Section */}
      {audioUrl && (
        <div className="playback-section">
          <h4>
            <Volume2 size={18} />
            Your Recording
          </h4>
          
          <audio 
            ref={audioRef} 
            src={audioUrl}
            onEnded={handlePlaybackEnded}
            onTimeUpdate={handleTimeUpdate}
            onError={(e) => {
              console.error('Audio error:', e);
              setError('Failed to load recording');
            }}
            preload="auto"
          />
          
          <div className="playback-controls">
            <button 
              className={`play-button ${isPlaying ? 'playing' : ''}`}
              onClick={playRecording}
              disabled={isPlaying}
            >
              <Play size={24} />
              {isPlaying ? 'Playing...' : 'Play Again'}
            </button>
            
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${playbackProgress}%` }}
              />
            </div>
          </div>

          <button className="btn" onClick={clearRecording}>
            <RotateCcw size={16} />
            Clear Recording
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="tips-card">
        <h4>Tips for Better Articulation</h4>
        <ul>
          <li><strong>Slow down</strong> - Take your time with each syllable</li>
          <li><strong>Over-articulate</strong> - Exaggerate mouth movements</li>
          <li><strong>Listen critically</strong> - Compare to how it "should" sound</li>
          <li><strong>Repeat</strong> - Try the same phrase multiple times</li>
        </ul>
      </div>

      {/* Quick Phrases */}
      <div className="quick-phrases">
        <h4>Quick Practice Phrases</h4>
        <div className="phrases-grid">
          {shuffledPhrases.slice(0, 12).map((phrase, index) => (
            <button
              key={index}
              className={`phrase-btn ${selectedPhrase === index ? 'selected' : ''}`}
              onClick={() => setSelectedPhrase(index)}
            >
              {phrase.text}
            </button>
          ))}
        </div>
        <p className="phrases-note">
          {shuffledPhrases.length} phrases available. Use "Random" for variety!
        </p>
      </div>
    </div>
  );
}

export default ArticulationMirror;
