import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Home, Mic, Volume2, CircleDot, BarChart3, Settings, BookOpen } from 'lucide-react';
import HomePage from './pages/HomePage';
import PacingBoard from './pages/PacingBoard';
import LoudnessMeter from './pages/LoudnessMeter';
import ArticulationMirror from './pages/ArticulationMirror';
import ReadingExercise from './pages/ReadingExercise';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import './styles/App.css';

function App() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/pacing', icon: CircleDot, label: 'Pacing' },
    { path: '/loudness', icon: Volume2, label: 'Volume' },
    { path: '/mirror', icon: Mic, label: 'Record' },
    { path: '/reading', icon: BookOpen, label: 'Reading' },
    { path: '/stats', icon: BarChart3, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="app">
      <nav className="nav-bar">
        <div className="nav-container">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink 
              key={path}
              to={path} 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              aria-label={label}
            >
              <Icon size={24} />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pacing" element={<PacingBoard />} />
          <Route path="/loudness" element={<LoudnessMeter />} />
          <Route path="/mirror" element={<ArticulationMirror />} />
          <Route path="/reading" element={<ReadingExercise />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
