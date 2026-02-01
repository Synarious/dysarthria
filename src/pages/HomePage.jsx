import { Link } from 'react-router-dom';
import { CircleDot, Volume2, Mic, BarChart3, ArrowRight, Heart, Brain, Target, BookOpen } from 'lucide-react';
import useLocalStats from '../hooks/useLocalStats';
import './HomePage.css';

function HomePage() {
  const { stats, isLoaded } = useLocalStats();

  const tools = [
    {
      path: '/pacing',
      icon: CircleDot,
      title: 'Pacing Board',
      description: 'Improve speech rate control by tapping syllables',
      color: '#00d9ff',
      theory: 'Rate Control Theory'
    },
    {
      path: '/loudness',
      icon: Volume2,
      title: 'Loudness Meter',
      description: 'Visual feedback for volume and breath support',
      color: '#00ff88',
      theory: 'LSVT Biofeedback'
    },
    {
      path: '/mirror',
      icon: Mic,
      title: 'Articulation Mirror',
      description: 'Record and replay to improve self-monitoring',
      color: '#ffaa00',
      theory: 'Motor Learning'
    },
    {
      path: '/reading',
      icon: BookOpen,
      title: 'Reading Practice',
      description: 'Read stories aloud and track volume consistency',
      color: '#ff66b2',
      theory: 'Volume Consistency'
    }
  ];

  const benefits = [
    { icon: Brain, title: 'Evidence-Based', text: 'Tools based on proven speech therapy approaches' },
    { icon: Target, title: 'Privacy First', text: 'Local storage and local recording. No data leaves your device.' },
    { icon: Heart, title: 'Accessible Design', text: 'Large buttons & high contrast for easy use' }
  ];

  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="home-title">
          <span className="title-accent">Dysarthria</span> Therapy
        </h1>
        <p className="home-subtitle">
          Evidence-based speech therapy tools to support your recovery journey
        </p>
      </header>

      {isLoaded && stats.sessions_completed > 0 && (
        <div className="welcome-back">
          <div className="streak-badge">
            <span className="streak-number">{stats.streak_days}</span>
            <span className="streak-label">day streak</span>
          </div>
          <div className="stats-summary">
            <p>Welcome back! You've completed <strong>{stats.sessions_completed}</strong> sessions.</p>
            <Link to="/stats" className="view-stats-link">
              View your progress <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      <section className="tools-section">
        <h2 className="section-title">Therapy Tools</h2>
        <div className="tools-grid">
          {tools.map(({ path, icon: Icon, title, description, color, theory }) => (
            <Link key={path} to={path} className="tool-link">
              <article className="home-tool-card" style={{ '--tool-color': color }}>
                <div className="tool-icon-wrapper">
                  <Icon size={32} />
                </div>
                <div className="tool-content">
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className="theory-badge">{theory}</span>
                </div>
                <ArrowRight className="tool-arrow" size={20} />
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="benefits-section">
        <h2 className="section-title">Why This App?</h2>
        <div className="benefits-grid">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="benefit-card">
              <Icon size={28} className="benefit-icon" />
              <h4>{title}</h4>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="info-section">
        <div className="info-card">
          <h3>About Dysarthria</h3>
          <p>
            Dysarthria is a motor speech disorder caused by muscle weakness, 
            affecting speech clarity, volume, and rate. Regular practice with 
            these tools can help retrain speech muscles and improve communication.
          </p>
          <p className="disclaimer">
            <strong>Note:</strong> This app is a supplement to professional speech therapy, 
            not a replacement. Always consult with a speech-language pathologist.
          </p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
