import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Trash2, 
  Download, 
  Upload, 
  AlertTriangle,
  Check,
  Info,
  Heart
} from 'lucide-react';
import useLocalStats from '../hooks/useLocalStats';
import './SettingsPage.css';

function SettingsPage() {
  const { stats, resetStats, exportStats, importStats } = useLocalStats();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState('');

  // Handle reset confirmation
  const handleReset = () => {
    resetStats();
    setShowResetConfirm(false);
  };

  // Handle file import
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const success = importStats(e.target.result);
        if (success) {
          setImportSuccess(true);
          setImportError('');
          setTimeout(() => setImportSuccess(false), 3000);
        } else {
          setImportError('Invalid file format');
        }
      } catch (err) {
        setImportError('Failed to import data');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Manage your data and app preferences
        </p>
      </header>

      {/* Data Management */}
      <section className="settings-section">
        <h2 className="section-heading">
          <SettingsIcon size={20} />
          Data Management
        </h2>

        {/* Export Data */}
        <div className="settings-card">
          <div className="settings-info">
            <h3>Export Data</h3>
            <p>Download all your progress data as a JSON file for backup</p>
          </div>
          <button className="btn btn-primary" onClick={exportStats}>
            <Download size={18} />
            Export
          </button>
        </div>

        {/* Import Data */}
        <div className="settings-card">
          <div className="settings-info">
            <h3>Import Data</h3>
            <p>Restore your progress from a previously exported file</p>
          </div>
          <label className="btn file-input-btn">
            <Upload size={18} />
            Import
            <input 
              type="file" 
              accept=".json"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {importSuccess && (
          <div className="success-message">
            <Check size={18} />
            Data imported successfully!
          </div>
        )}

        {importError && (
          <div className="error-message">
            <AlertTriangle size={18} />
            {importError}
          </div>
        )}

        {/* Reset Data */}
        <div className="settings-card danger">
          <div className="settings-info">
            <h3>Reset All Data</h3>
            <p>Permanently delete all your progress and statistics</p>
          </div>
          {!showResetConfirm ? (
            <button 
              className="btn btn-danger" 
              onClick={() => setShowResetConfirm(true)}
            >
              <Trash2 size={18} />
              Reset
            </button>
          ) : (
            <div className="confirm-buttons">
              <button className="btn btn-danger" onClick={handleReset}>
                Confirm Delete
              </button>
              <button className="btn" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {showResetConfirm && (
          <div className="warning-message">
            <AlertTriangle size={18} />
            Warning: This action cannot be undone. All your progress will be lost.
          </div>
        )}
      </section>

      {/* Current Stats Summary */}
      <section className="settings-section">
        <h2 className="section-heading">
          <Info size={20} />
          Current Data Summary
        </h2>
        
        <div className="data-summary">
          <div className="summary-item">
            <span className="summary-label">Total Sessions</span>
            <span className="summary-value">{stats.sessions_completed || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Practice Minutes</span>
            <span className="summary-value">{Math.round(stats.total_practice_minutes || 0)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Breath Records</span>
            <span className="summary-value">{stats.breath_hold_records?.length || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Pacing Records</span>
            <span className="summary-value">{stats.syllable_times?.length || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Activity Logs</span>
            <span className="summary-value">{stats.daily_logs?.length || 0}</span>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="settings-section">
        <h2 className="section-heading">
          <Heart size={20} />
          About This App
        </h2>
        
        <div className="about-card">
          <h3>Dysarthria Therapy App</h3>
          <p>
            This application provides evidence-based speech therapy tools to aid in 
            the recovery from Dysarthria. The tools are based on proven therapeutic 
            approaches including:
          </p>
          <ul>
            <li><strong>Rate Control (Pacing)</strong> - Improving speech intelligibility through controlled pacing</li>
            <li><strong>LSVT Biofeedback</strong> - Visual feedback for volume and breath support</li>
            <li><strong>Motor Learning</strong> - Self-monitoring through recording and playback</li>
          </ul>
          
          <div className="disclaimer">
            <AlertTriangle size={16} />
            <p>
              <strong>Disclaimer:</strong> This app is designed to supplement, not replace, 
              professional speech therapy. Always consult with a qualified speech-language 
              pathologist for proper diagnosis and treatment.
            </p>
          </div>

          <div className="tech-info">
            <h4>Technical Information</h4>
            <p>
              • All data is stored locally in your browser<br />
              • No server or database required<br />
              • Works offline after initial load<br />
              • Compatible with Chrome and Safari
            </p>
          </div>
        </div>
      </section>

      {/* Version */}
      <div className="version-info">
        Version 1.0.0 • Made with ❤️ for speech therapy
      </div>
    </div>
  );
}

export default SettingsPage;
