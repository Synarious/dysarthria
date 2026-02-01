# Dysarthria Therapy App

A web-based application to aid in Dysarthria recovery through evidence-based speech therapy tools.

![Dark Mode Interface](https://img.shields.io/badge/Theme-Dark%20Mode-121212?style=flat-square)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite)

## 🎯 Features

### Three Evidence-Based Therapy Tools

1. **Digital Pacing Board** - Rate Control Therapy
   - 5-button syllable tapping interface
   - Real-time pace feedback
   - Adjustable target speed
   - Session tracking with average timing

2. **Loudness Meter** - LSVT Biofeedback
   - Real-time volume visualization
   - Adjustable target volume threshold
   - "Sustain Ahhh" breath exercise
   - Personal best tracking

3. **Articulation Mirror** - Motor Learning / Self-Monitoring
   - Press-and-hold recording
   - Automatic playback for self-assessment
   - Practice phrases library
   - Session history

### Additional Features

- 📊 **Progress Dashboard** - Charts showing improvement over time
- 💾 **Local Storage** - All data stored in your browser (no server required)
- 🌙 **Dark Mode** - High-contrast dark theme for accessibility
- ♿ **Accessible Design** - Large buttons, clear labels, keyboard navigation
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- 🔄 **Import/Export** - Backup and restore your data

## 🧠 Therapeutic Theory

This app is based on three gold-standard approaches to Dysarthria management:

| Approach | Tool | Principle |
|----------|------|-----------|
| **Rate Control** | Pacing Board | Slowing speech allows articulators time to reach correct positions |
| **LSVT Biofeedback** | Loudness Meter | Visual feedback recalibrates volume perception |
| **Motor Learning** | Articulation Mirror | Immediate auditory feedback enables self-correction |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dysarthria-therapy-app.git

# Navigate to the project directory
cd dysarthria-therapy-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Build for Production

```bash
npm run build
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

## 🛠️ Tech Stack

- **Framework**: React 18 with Vite
- **Routing**: React Router (HashRouter for GitHub Pages)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Audio**: Web Audio API, MediaRecorder API
- **Storage**: LocalStorage
- **Styling**: CSS Variables, Custom Properties

## 📁 Project Structure

```
src/
├── main.jsx          # App entry point
├── App.jsx           # Main app with routing
├── hooks/
│   ├── useLocalStats.js    # LocalStorage stats management
│   └── useAudio.js         # Microphone & recording hooks
├── pages/
│   ├── HomePage.jsx        # Landing page
│   ├── PacingBoard.jsx     # Syllable pacing tool
│   ├── LoudnessMeter.jsx   # Volume feedback tool
│   ├── ArticulationMirror.jsx  # Recording tool
│   ├── StatsPage.jsx       # Progress dashboard
│   └── SettingsPage.jsx    # Data management
└── styles/
    └── global.css          # Global styles & CSS variables
```

## 🔒 Privacy

- **No data leaves your device** - All statistics are stored locally in your browser
- **No accounts required** - Start using immediately
- **No tracking** - We don't collect any usage data
- **Export your data** - Full control over your information

## ⚠️ Disclaimer

This application is designed to **supplement, not replace**, professional speech therapy. Always consult with a qualified speech-language pathologist (SLP) for proper diagnosis and treatment of Dysarthria.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Based on research in motor speech disorders and speech therapy best practices
- Inspired by Lee Silverman Voice Treatment (LSVT) principles
- Built with accessibility and ease-of-use as primary goals
