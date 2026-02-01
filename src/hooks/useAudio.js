import { useState, useEffect, useRef, useCallback } from 'react';

// AudioContext with Safari compatibility
const AudioContextClass = window.AudioContext || window.webkitAudioContext;

export const useAudioContext = () => {
  const [audioContext, setAudioContext] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initAudio = useCallback(() => {
    if (!audioContext) {
      const ctx = new AudioContextClass();
      setAudioContext(ctx);
      setIsInitialized(true);
      return ctx;
    }
    
    // Resume if suspended (common Safari issue)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    return audioContext;
  }, [audioContext]);

  return { audioContext, initAudio, isInitialized };
};

export const useMicrophone = (options = {}) => {
  const { smoothingFactor = 0.5, sensitivityBoost = 2.4 } = options;
  
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [rawVolume, setRawVolume] = useState(0);
  const [permission, setPermission] = useState('prompt'); // 'prompt', 'granted', 'denied'
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const sourceRef = useRef(null);
  const smoothedVolumeRef = useRef(0);
  const volumeHistoryRef = useRef([]);
  const sensitivityBoostRef = useRef(sensitivityBoost);

  // Keep ref in sync with prop
  useEffect(() => {
    sensitivityBoostRef.current = sensitivityBoost;
  }, [sensitivityBoost]);

  const requestPermission = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        } 
      });
      setStream(mediaStream);
      setPermission('granted');
      setError(null);
      return mediaStream;
    } catch (err) {
      setPermission('denied');
      setError(err.message || 'Microphone access denied');
      return null;
    }
  }, []);

  const startListening = useCallback(async () => {
    let mediaStream = stream;
    
    if (!mediaStream) {
      mediaStream = await requestPermission();
      if (!mediaStream) return false;
    }

    try {
      // Create audio context with Safari compatibility
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Create analyser with higher smoothing
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;

      // Connect microphone to analyser
      sourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStream);
      sourceRef.current.connect(analyserRef.current);

      setIsListening(true);
      smoothedVolumeRef.current = 0;
      volumeHistoryRef.current = [];

      // Start volume analysis loop
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const analyze = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate RMS (Root Mean Square) for more accurate volume
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        
        // Apply sensitivity boost and normalize to 0-100
        const boostedVolume = Math.min(100, rms * 100 * sensitivityBoostRef.current);
        setRawVolume(boostedVolume);
        
        // Apply exponential smoothing for stable display
        smoothedVolumeRef.current = 
          smoothedVolumeRef.current * smoothingFactor + 
          boostedVolume * (1 - smoothingFactor);
        
        // Keep a rolling history for additional smoothing (~50ms at 60fps)
        volumeHistoryRef.current.push(smoothedVolumeRef.current);
        if (volumeHistoryRef.current.length > 3) {
          volumeHistoryRef.current.shift();
        }
        
        // Average the history for even smoother display
        const avgSmoothed = volumeHistoryRef.current.reduce((a, b) => a + b, 0) / 
                          volumeHistoryRef.current.length;
        
        setVolume(avgSmoothed);
        animationRef.current = requestAnimationFrame(analyze);
      };
      
      analyze();
      return true;
    } catch (err) {
      setError(err.message || 'Failed to start audio analysis');
      return false;
    }
  }, [stream, requestPermission, smoothingFactor]);

  const stopListening = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    smoothedVolumeRef.current = 0;
    volumeHistoryRef.current = [];
    setIsListening(false);
    setVolume(0);
    setRawVolume(0);
  }, []);

  const cleanup = useCallback(() => {
    stopListening();
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [stream, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    stream,
    error,
    isListening,
    volume,
    rawVolume,
    permission,
    requestPermission,
    startListening,
    stopListening,
    cleanup
  };
};

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      // Clear previous recording
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioBlob(null);
      chunksRef.current = [];
      setDuration(0);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      streamRef.current = stream;

      // Use webm for Chrome, mp4 for Safari
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/mp4';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Update duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

      setError(null);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to start recording');
      return false;
    }
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  const playRecording = useCallback(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
      return audio;
    }
    return null;
  }, [audioUrl]);

  const cleanup = useCallback(() => {
    stopRecording();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
  }, [audioUrl, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  return {
    isRecording,
    audioBlob,
    audioUrl,
    error,
    duration,
    startRecording,
    stopRecording,
    playRecording,
    cleanup
  };
};

export default useAudioContext;
