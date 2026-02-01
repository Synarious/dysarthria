import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'dysarthria_app_stats';

const defaultStats = {
  sessions_completed: 0,
  streak_days: 0,
  last_practice: null,
  total_practice_minutes: 0,
  
  // Pacing Board Stats
  pacing_sessions: 0,
  avg_syllable_time: 0,
  syllable_times: [],
  
  // Loudness Meter Stats
  loudness_sessions: 0,
  breath_hold_records: [],
  volume_targets_hit: 0,
  
  // Reading Stats
  reading_sessions: 0,
  reading_records: [],
  
  // Articulation Mirror Stats
  articulation_sessions: 0,
  recordings_made: 0,
  
  // Daily tracking
  daily_logs: []
};

// Helper to get current stats from localStorage
const getStoredStats = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultStats, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Error reading stats:', error);
  }
  return defaultStats;
};

export const useLocalStats = () => {
  const [stats, setStats] = useState(() => getStoredStats());
  const [isLoaded, setIsLoaded] = useState(false);
  const statsRef = useRef(stats);

  // Keep ref in sync
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Load stats from localStorage on mount
  useEffect(() => {
    const stored = getStoredStats();
    setStats(stored);
    statsRef.current = stored;
    setIsLoaded(true);
  }, []);

  // Save stats to localStorage
  const saveStats = useCallback((newStats) => {
    try {
      const current = getStoredStats();
      const updated = { ...current, ...newStats };
      setStats(updated);
      statsRef.current = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Error saving stats:', error);
      return statsRef.current;
    }
  }, []);

  // Increment a specific stat
  const incrementStat = useCallback((key, amount = 1) => {
    const current = getStoredStats();
    const updated = { ...current, [key]: (current[key] || 0) + amount };
    setStats(updated);
    statsRef.current = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }, []);

  // Add a record to an array stat (like breath_hold_records)
  const addRecord = useCallback((key, record) => {
    const current = getStoredStats();
    const currentArray = current[key] || [];
    // Keep only last 100 records to prevent storage overflow
    const trimmedArray = currentArray.slice(-99);
    const updated = { 
      ...current, 
      [key]: [...trimmedArray, { ...record, date: new Date().toISOString() }] 
    };
    setStats(updated);
    statsRef.current = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }, []);

  // Log a practice session
  const logSession = useCallback((toolName, duration) => {
    const current = getStoredStats();
    const today = new Date().toISOString().split('T')[0];
    const lastPractice = current.last_practice;
    
    let newStreak = current.streak_days;
    
    if (lastPractice) {
      const lastDate = new Date(lastPractice);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Same day, streak unchanged
      } else if (diffDays === 1) {
        // Consecutive day, increment streak
        newStreak += 1;
      } else {
        // Gap in practice, reset streak
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const dailyLog = {
      date: today,
      tool: toolName,
      duration: duration,
      timestamp: new Date().toISOString()
    };

    const updated = {
      ...current,
      sessions_completed: current.sessions_completed + 1,
      streak_days: newStreak,
      last_practice: today,
      total_practice_minutes: current.total_practice_minutes + (duration / 60),
      daily_logs: [...(current.daily_logs || []).slice(-199), dailyLog]
    };

    setStats(updated);
    statsRef.current = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }, []);

  // Add a reading session record
  const addReadingSession = useCallback((sessionData) => {
    const current = getStoredStats();
    const readingRecords = current.reading_records || [];
    // Keep only last 100 records
    const trimmedRecords = readingRecords.slice(-99);
    const updated = {
      ...current,
      reading_sessions: (current.reading_sessions || 0) + 1,
      reading_records: [...trimmedRecords, { ...sessionData, date: new Date().toISOString() }]
    };
    setStats(updated);
    statsRef.current = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }, []);

  // Reset all stats
  const resetStats = useCallback(() => {
    setStats(defaultStats);
    statsRef.current = defaultStats;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Export stats as JSON
  const exportStats = useCallback(() => {
    const current = getStoredStats();
    const dataStr = JSON.stringify(current, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dysarthria-stats-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Import stats from JSON
  const importStats = useCallback((jsonString) => {
    try {
      const imported = JSON.parse(jsonString);
      const merged = { ...defaultStats, ...imported };
      setStats(merged);
      statsRef.current = merged;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return true;
    } catch (error) {
      console.error('Error importing stats:', error);
      return false;
    }
  }, []);

  return {
    stats,
    isLoaded,
    saveStats,
    incrementStat,
    addRecord,
    addReadingSession,
    logSession,
    resetStats,
    exportStats,
    importStats
  };
};

export default useLocalStats;
