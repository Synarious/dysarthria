import { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Award, 
  Target,
  CircleDot,
  Volume2,
  Mic
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import useLocalStats from '../hooks/useLocalStats';
import './StatsPage.css';

function StatsPage() {
  const { stats, isLoaded } = useLocalStats();

  // Process breath hold data for chart
  const breathChartData = useMemo(() => {
    if (!stats.breath_hold_records || stats.breath_hold_records.length === 0) {
      return [];
    }
    
    return stats.breath_hold_records.slice(-20).map((record, index) => ({
      name: `#${index + 1}`,
      duration: record.duration,
      date: new Date(record.date).toLocaleDateString()
    }));
  }, [stats.breath_hold_records]);

  // Process syllable time data for chart
  const syllableChartData = useMemo(() => {
    if (!stats.syllable_times || stats.syllable_times.length === 0) {
      return [];
    }
    
    return stats.syllable_times.slice(-20).map((record, index) => ({
      name: `#${index + 1}`,
      avg: record.avg,
      date: new Date(record.date).toLocaleDateString()
    }));
  }, [stats.syllable_times]);

  // Process daily activity data
  const activityData = useMemo(() => {
    if (!stats.daily_logs || stats.daily_logs.length === 0) {
      return [];
    }

    // Group by date
    const grouped = stats.daily_logs.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = { date, pacing: 0, loudness: 0, articulation: 0, total: 0 };
      }
      if (log.tool === 'pacing') acc[date].pacing++;
      if (log.tool === 'loudness') acc[date].loudness++;
      if (log.tool === 'articulation') acc[date].articulation++;
      acc[date].total++;
      return acc;
    }, {});

    return Object.values(grouped).slice(-14);
  }, [stats.daily_logs]);

  // Calculate best breath hold
  const bestBreathHold = useMemo(() => {
    if (!stats.breath_hold_records || stats.breath_hold_records.length === 0) {
      return 0;
    }
    return Math.max(...stats.breath_hold_records.map(r => r.duration));
  }, [stats.breath_hold_records]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name.includes('duration') ? 's' : 'ms'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!isLoaded) {
    return (
      <div className="stats-page">
        <div className="loading">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <header className="page-header">
        <h1 className="page-title">Your Progress</h1>
        <p className="page-subtitle">
          Track your improvement over time
        </p>
      </header>

      {/* Overview Stats */}
      <div className="stats-overview">
        <div className="overview-card">
          <div className="overview-icon">
            <Calendar size={24} />
          </div>
          <div className="overview-content">
            <span className="overview-value">{stats.streak_days || 0}</span>
            <span className="overview-label">Day Streak</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">
            <Target size={24} />
          </div>
          <div className="overview-content">
            <span className="overview-value">{stats.sessions_completed || 0}</span>
            <span className="overview-label">Total Sessions</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">
            <Clock size={24} />
          </div>
          <div className="overview-content">
            <span className="overview-value">
              {Math.round(stats.total_practice_minutes || 0)}
            </span>
            <span className="overview-label">Minutes Practiced</span>
          </div>
        </div>

        <div className="overview-card highlight">
          <div className="overview-icon">
            <Award size={24} />
          </div>
          <div className="overview-content">
            <span className="overview-value">{bestBreathHold.toFixed(1)}s</span>
            <span className="overview-label">Best Breath Hold</span>
          </div>
        </div>
      </div>

      {/* Tool Breakdown */}
      <div className="tool-breakdown">
        <h3>Sessions by Tool</h3>
        <div className="tool-stats">
          <div className="tool-stat">
            <CircleDot size={20} className="pacing-icon" />
            <span className="tool-name">Pacing Board</span>
            <span className="tool-count">{stats.pacing_sessions || 0}</span>
          </div>
          <div className="tool-stat">
            <Volume2 size={20} className="loudness-icon" />
            <span className="tool-name">Loudness Meter</span>
            <span className="tool-count">{stats.loudness_sessions || 0}</span>
          </div>
          <div className="tool-stat">
            <Mic size={20} className="articulation-icon" />
            <span className="tool-name">Articulation Mirror</span>
            <span className="tool-count">{stats.articulation_sessions || 0}</span>
          </div>
        </div>
      </div>

      {/* Breath Hold Progress Chart */}
      {breathChartData.length > 0 && (
        <div className="chart-card">
          <h3>
            <TrendingUp size={20} />
            Breath Hold Progress
          </h3>
          <p className="chart-description">
            Your sustained phonation times (in seconds)
          </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={breathChartData}>
                <defs>
                  <linearGradient id="breathGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  stroke="#808080" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="#808080" 
                  fontSize={12}
                  unit="s"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="#00ff88" 
                  strokeWidth={2}
                  fill="url(#breathGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Syllable Timing Chart */}
      {syllableChartData.length > 0 && (
        <div className="chart-card">
          <h3>
            <BarChart3 size={20} />
            Pacing Consistency
          </h3>
          <p className="chart-description">
            Average milliseconds between syllable taps (lower = faster)
          </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={syllableChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  stroke="#808080" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="#808080" 
                  fontSize={12}
                  unit="ms"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="avg" 
                  fill="#00d9ff" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activity Chart */}
      {activityData.length > 0 && (
        <div className="chart-card">
          <h3>
            <Calendar size={20} />
            Daily Activity (Last 14 Days)
          </h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  stroke="#808080" 
                  fontSize={10}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis 
                  stroke="#808080" 
                  fontSize={12}
                />
                <Tooltip />
                <Bar dataKey="pacing" stackId="a" fill="#00d9ff" name="Pacing" />
                <Bar dataKey="loudness" stackId="a" fill="#00ff88" name="Loudness" />
                <Bar dataKey="articulation" stackId="a" fill="#ffaa00" name="Articulation" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <span className="legend-item pacing">Pacing</span>
            <span className="legend-item loudness">Loudness</span>
            <span className="legend-item articulation">Articulation</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.sessions_completed === 0 && (
        <div className="empty-state">
          <BarChart3 size={48} />
          <h3>No data yet</h3>
          <p>Complete some practice sessions to see your progress here!</p>
        </div>
      )}

      {/* Last Practice */}
      {stats.last_practice && (
        <div className="last-practice">
          <span>Last practice: </span>
          <strong>{new Date(stats.last_practice).toLocaleDateString()}</strong>
        </div>
      )}
    </div>
  );
}

export default StatsPage;
