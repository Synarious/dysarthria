import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Play, Square, BookOpen, BarChart3, RefreshCw, Settings } from 'lucide-react';
import wowStories from '../data/wowStories';
import { useLocalStats } from '../hooks/useLocalStats';
import './ReadingExercise.css';

function ReadingExercise() {
  const [selectedStory, setSelectedStory] = useState(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [volumeReadings, setVolumeReadings] = useState([]);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [consistencyScore, setConsistencyScore] = useState(null);
  const [averageVolume, setAverageVolume] = useState(0);
  const [volumeHistory, setVolumeHistory] = useState([]);
  const [sensitivityBoost, setSensitivityBoost] = useState(() => {
    const saved = localStorage.getItem('micSensitivity');
    return saved ? parseFloat(saved) : 2.0;
  });
  const [showSettings, setShowSettings] = useState(false);
  
  const { addReadingSession } = useLocalStats();
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const sentenceVolumeRef = useRef([]);
  const sensitivityBoostRef = useRef(sensitivityBoost);

  // Keep ref in sync with state for use in animation loop
  useEffect(() => {
    sensitivityBoostRef.current = sensitivityBoost;
  }, [sensitivityBoost]);

  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate RMS for more accurate volume (same as useAudio hook)
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const normalizedVolume = Math.min(100, rms * 100 * sensitivityBoostRef.current);
        
        setCurrentVolume(normalizedVolume);
        
        // Record volume for current sentence
        sentenceVolumeRef.current.push(normalizedVolume);
        
        animationRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      return false;
    }
  }, []);

  const stopMicrophone = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    streamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  const startReading = async () => {
    const success = await startMicrophone();
    if (success) {
      setIsReading(true);
      setIsPaused(false);
      setCurrentSentenceIndex(0);
      setVolumeReadings([]);
      setVolumeHistory([]);
      setSessionComplete(false);
      sentenceVolumeRef.current = [];
    }
  };

  const nextSentence = () => {
    if (!selectedStory) return;
    
    // Calculate average volume for this sentence
    const readings = sentenceVolumeRef.current;
    if (readings.length > 0) {
      // Filter out silence (readings below 10)
      const voicedReadings = readings.filter(r => r > 10);
      if (voicedReadings.length > 0) {
        const avgVol = voicedReadings.reduce((a, b) => a + b, 0) / voicedReadings.length;
        setVolumeReadings(prev => [...prev, avgVol]);
        setVolumeHistory(prev => [...prev, { sentence: currentSentenceIndex + 1, volume: avgVol }]);
      }
    }
    
    sentenceVolumeRef.current = [];
    
    if (currentSentenceIndex < selectedStory.sentences.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
    } else {
      finishReading();
    }
  };

  const finishReading = () => {
    stopMicrophone();
    setIsReading(false);
    setSessionComplete(true);
    
    // Calculate consistency score
    const readings = volumeReadings;
    if (readings.length > 1) {
      const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
      const squaredDiffs = readings.map(r => Math.pow(r - mean, 2));
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
      const stdDev = Math.sqrt(avgSquaredDiff);
      
      // Coefficient of variation (lower = more consistent)
      const cv = (stdDev / mean) * 100;
      
      // Convert to a 0-100 score where 100 is perfect consistency
      // CV of 0 = 100%, CV of 50+ = 0%
      const score = Math.max(0, Math.min(100, 100 - (cv * 2)));
      
      setConsistencyScore(Math.round(score));
      setAverageVolume(Math.round(mean));
      
      // Save to stats
      addReadingSession({
        storyId: selectedStory.id,
        storyTitle: selectedStory.title,
        consistencyScore: Math.round(score),
        averageVolume: Math.round(mean),
        sentencesRead: readings.length,
        volumeHistory: volumeHistory
      });
    }
  };

  const stopReading = () => {
    stopMicrophone();
    setIsReading(false);
    setIsPaused(false);
    setSessionComplete(false);
  };

  const resetExercise = () => {
    setSelectedStory(null);
    setCurrentSentenceIndex(0);
    setIsReading(false);
    setIsPaused(false);
    setVolumeReadings([]);
    setVolumeHistory([]);
    setSessionComplete(false);
    setConsistencyScore(null);
    setAverageVolume(0);
  };

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, [stopMicrophone]);

  useEffect(() => {
    localStorage.setItem('micSensitivity', sensitivityBoost.toString());
  }, [sensitivityBoost]);

  const getVolumeColor = (volume) => {
    if (volume < 30) return 'var(--error)';
    if (volume < 50) return 'var(--warning)';
    return 'var(--success)';
  };

  const getConsistencyFeedback = (score) => {
    if (score >= 90) return { text: "Excellent! Your volume was very consistent!", emoji: "🌟" };
    if (score >= 75) return { text: "Great job! Your volume was mostly consistent.", emoji: "👍" };
    if (score >= 60) return { text: "Good effort! Try to keep your volume more steady.", emoji: "📈" };
    if (score >= 40) return { text: "Keep practicing! Focus on maintaining even volume.", emoji: "💪" };
    return { text: "Volume varied a lot. Practice speaking at a consistent level.", emoji: "🎯" };
  };

  // Story selection view
  if (!selectedStory) {
    return (
      <div className="reading-exercise">
        <header className="reading-header">
          <Link to="/" className="back-button">
            <ArrowLeft size={24} />
          </Link>
          <h1><BookOpen size={28} /> Reading Practice</h1>
        </header>

        <div className="story-selection">
          <h2>Choose a Story</h2>
          <p className="instructions">
            Select a World of Warcraft story to read aloud. Your microphone will track 
            your volume consistency as you read each sentence.
          </p>
          
          <div className="story-grid">
            {wowStories.map(story => (
              <button
                key={story.id}
                className="story-card"
                onClick={() => setSelectedStory(story)}
              >
                <h3>{story.title}</h3>
                <span className={`difficulty ${story.difficulty}`}>
                  {story.difficulty}
                </span>
                <p>{story.sentences.length} sentences</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Results view
  if (sessionComplete) {
    const feedback = getConsistencyFeedback(consistencyScore);
    
    return (
      <div className="reading-exercise">
        <header className="reading-header">
          <button className="back-button" onClick={resetExercise}>
            <ArrowLeft size={24} />
          </button>
          <h1><BarChart3 size={28} /> Results</h1>
        </header>

        <div className="results-container">
          <h2>{selectedStory.title}</h2>
          
          <div className="score-display">
            <div className="main-score">
              <span className="score-value">{consistencyScore}%</span>
              <span className="score-label">Consistency Score</span>
            </div>
            <div className="feedback-message">
              <span className="emoji">{feedback.emoji}</span>
              <p>{feedback.text}</p>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-value">{averageVolume}%</span>
              <span className="stat-label">Average Volume</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{volumeReadings.length}</span>
              <span className="stat-label">Sentences Read</span>
            </div>
          </div>

          <div className="volume-chart">
            <h3>Volume Throughout Reading</h3>
            <div className="chart-container">
              {volumeHistory.map((item, index) => (
                <div key={index} className="chart-bar-container">
                  <div 
                    className="chart-bar"
                    style={{ 
                      height: `${item.volume}%`,
                      backgroundColor: getVolumeColor(item.volume)
                    }}
                  />
                  <span className="chart-label">{item.sentence}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span className="legend-item"><span className="dot quiet"></span> Too Quiet</span>
              <span className="legend-item"><span className="dot medium"></span> Moderate</span>
              <span className="legend-item"><span className="dot loud"></span> Good</span>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn-secondary" onClick={resetExercise}>
              <BookOpen size={20} /> Choose Another Story
            </button>
            <button className="btn-primary" onClick={() => {
              setSessionComplete(false);
              setCurrentSentenceIndex(0);
              setVolumeReadings([]);
              setVolumeHistory([]);
            }}>
              <RefreshCw size={20} /> Read Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reading view
  return (
    <div className="reading-exercise">
      <header className="reading-header">
        <button className="back-button" onClick={stopReading}>
          <ArrowLeft size={24} />
        </button>
        <h1>{selectedStory.title}</h1>
      </header>

      <div className="reading-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentSentenceIndex + 1) / selectedStory.sentences.length) * 100}%` }}
          />
          <span className="progress-text">
            {currentSentenceIndex + 1} / {selectedStory.sentences.length}
          </span>
        </div>

        {!isReading ? (
          <div className="start-prompt">
            <p>Click the microphone to start reading</p>
            <button className="mic-button start" onClick={startReading}>
              <Mic size={48} />
            </button>
          </div>
        ) : (
          <>
            <div className="sentence-display">
              <p className="current-sentence">
                {selectedStory.sentences[currentSentenceIndex]}
              </p>
            </div>

            {/* Volume Meter - Same style as Loudness Meter */}
            <div className="volume-meter-container">
              <div className="volume-meter-vertical">
                <div 
                  className="volume-fill-vertical"
                  style={{ 
                    height: `${Math.min(100, currentVolume)}%`,
                    backgroundColor: getVolumeColor(currentVolume)
                  }}
                />
                <div className="target-line-reading" style={{ bottom: '40%' }}>
                  <span className="target-label-reading">Target</span>
                </div>
                <div className="volume-value-reading">
                  {Math.round(currentVolume)}
                </div>
              </div>
              <div className="volume-feedback">
                {currentVolume < 30 ? '🔈 Speak Louder!' : currentVolume < 50 ? '🔉 Good Volume' : '🔊 Great!'}
              </div>
            </div>

            <div className="reading-controls">
              <button className="btn-stop" onClick={stopReading}>
                <Square size={24} /> Stop
              </button>
              <button className="btn-next" onClick={nextSentence}>
                {currentSentenceIndex < selectedStory.sentences.length - 1 ? 'Next Sentence →' : 'Finish Reading'}
              </button>
            </div>

            <div className="mic-status">
              <Mic size={20} className="mic-active" />
              <span>Microphone Active</span>
            </div>

            {/* Sensitivity Settings */}
            <div className="reading-settings">
              <button 
                className="settings-toggle"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings size={18} />
                {showSettings ? 'Hide Settings' : 'Microphone Sensitivity'}
              </button>
              {showSettings && (
                <div className="sensitivity-control">
                  <label htmlFor="reading-sensitivity">
                    Sensitivity: <strong>{sensitivityBoost.toFixed(1)}x</strong>
                    <span className="sensitivity-hint">
                      {sensitivityBoost < 1.5 ? '(Less sensitive)' : 
                       sensitivityBoost > 3 ? '(Very sensitive)' : '(Normal)'}
                    </span>
                  </label>
                  <input
                    id="reading-sensitivity"
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.1"
                    value={sensitivityBoost}
                    onChange={(e) => setSensitivityBoost(Number(e.target.value))}
                    className="sensitivity-slider"
                  />
                  <div className="sensitivity-labels">
                    <span>Less Sensitive</span>
                    <span>More Sensitive</span>
                  </div>
                  <p className="settings-help">
                    Increase sensitivity if the meter barely moves when you speak normally.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReadingExercise;
