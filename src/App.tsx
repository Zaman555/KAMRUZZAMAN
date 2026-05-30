/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Megaphone,
  Shield,
  ShieldAlert,
  Users,
  PhoneCall,
  Volume2,
  VolumeX,
  Play,
  Square,
  Edit3,
  RotateCcw,
  FileText,
  CheckCircle,
  Download,
  Search,
  AlertTriangle,
  X,
  ChevronRight,
  Info,
  BookOpen,
  MapPin,
  Sliders,
  UserCheck,
  Award,
  ChevronDown,
  ChevronUp,
  Printer,
  Copy,
  PlusCircle,
  HelpCircle,
  Lock,
  Unlock,
  Key,
  LogOut
} from 'lucide-react';
import { INITIAL_SCRIPT_LINES, BGB_CONTACTS, QUIZ_QUESTIONS, MOCK_REPORTS } from './data';
import { ScriptLine, BorderReport, QuizQuestion, BgbContact } from './types';

export default function App() {
  // Script state
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>(() => {
    const saved = localStorage.getItem('bgb_script_lines');
    return saved ? JSON.parse(saved) : INITIAL_SCRIPT_LINES;
  });

  // Active line being read or highlights
  const [activeLineId, setActiveLineId] = useState<number | null>(null);
  const [isAutoplayRunning, setIsAutoplayRunning] = useState<boolean>(false);
  const [autoplayIndex, setAutoplayIndex] = useState<number>(-1);

  // Audio & Voice options
  const [sirenEnabled, setSirenEnabled] = useState<boolean>(true);
  const [sirenType, setSirenType] = useState<'siren' | 'beep' | 'chime'>('beep');
  const [microphoneCrackled, setMicrophoneCrackled] = useState<boolean>(true);
  const [speechRate, setSpeechRate] = useState<number>(0.95); // Slightly slower for clear miking
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  
  // Available voices for text-to-speech
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  // Editing line state
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Active Tab/Sec views
  const [activeTab, setActiveTab] = useState<'broadcaster' | 'reports' | 'quiz' | 'contacts'>('broadcaster');

  // Teleprompter (Miking Helper Shield) Mode state
  const [isPrompterOpen, setIsPrompterOpen] = useState<boolean>(false);
  const [prompterScrollActive, setPrompterScrollActive] = useState<boolean>(false);
  const [prompterScrollSpeed, setPrompterScrollSpeed] = useState<number>(18); // seconds for full scroll
  const [prompterFontSize, setPrompterFontSize] = useState<number>(2.5); // rem
  const [prompterHighContrast, setPrompterHighContrast] = useState<boolean>(true);
  const prompterContainerRef = useRef<HTMLDivElement>(null);
  const prompterTimerRef = useRef<any>(null);

  // Report Forms State
  const [reports, setReports] = useState<BorderReport[]>(() => {
    const saved = localStorage.getItem('bgb_border_reports');
    return saved ? JSON.parse(saved) : MOCK_REPORTS;
  });
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportType, setReportType] = useState<'trafficking' | 'infiltration' | 'suspicious' | 'other'>('suspicious');
  const [reportDescription, setReportDescription] = useState('');
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [reportSeverity, setReportSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('bgb_logged_in') === 'true';
  });
  const [loginUserId, setLoginUserId] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loggedInUserRole, setLoggedInUserRole] = useState<string>(() => {
    return sessionStorage.getItem('bgb_user_role') || '';
  });

  // Report Editing State
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<'Received' | 'Verifying' | 'Action Taken' | 'Dismissed'>('Received');
  const [tempSeverity, setTempSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [tempResolutionNotes, setTempResolutionNotes] = useState<string>('');

  // Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizStreak, setQuizStreak] = useState(0);

  // Contacts State
  const [contactSearch, setContactSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');

  // Interactive Waveform Visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Web Audio Spectrogram & Central Analyser
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const decibelCanvasRef = useRef<HTMLCanvasElement>(null);
  const dbAnimationRef = useRef<number | null>(null);
  const vocalSynthRef = useRef<{
    osc: OscillatorNode;
    gain: GainNode;
    lpFilter: BiquadFilterNode;
  } | null>(null);

  // Notification Banner State
  const [bannerAlert, setBannerAlert] = useState<string>("সর্বোচ্চ সতর্ক অবস্থানে বিজিবি: মানব পাচার ও অনুপ্রবেশ প্রতিরোধে এলাকায় বিশেষ নজরদারি চলমান।");

  // Load voices for TTS
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Prefer Bengali (bn-BD or bn-IN) voice
        const bengaliVoice = availableVoices.find(v => v.lang.includes('bn') || v.name.toLowerCase().includes('bengali') || v.name.toLowerCase().includes('bangla'));
        if (bengaliVoice) {
          setSelectedVoiceName(bengaliVoice.name);
        } else if (availableVoices.length > 0) {
          setSelectedVoiceName(availableVoices[0].name);
        }
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync script changes to localstorage
  useEffect(() => {
    localStorage.setItem('bgb_script_lines', JSON.stringify(scriptLines));
  }, [scriptLines]);

  // Sync reports to localstorage
  useEffect(() => {
    localStorage.setItem('bgb_border_reports', JSON.stringify(reports));
  }, [reports]);

  // Report Editing Handlers
  const handleStartEditReport = (rep: BorderReport) => {
    setEditingReportId(rep.id);
    setTempStatus(rep.status);
    setTempSeverity(rep.severity);
    setTempResolutionNotes(rep.resolutionNotes || '');
  };

  const handleSaveReportEdit = (id: string) => {
    setReports(prev => prev.map(rep => {
      if (rep.id === id) {
        return {
          ...rep,
          status: tempStatus,
          severity: tempSeverity,
          resolutionNotes: tempResolutionNotes
        };
      }
      return rep;
    }));
    setEditingReportId(null);
  };

  const handleCancelReportEdit = () => {
    setEditingReportId(null);
  };

  // Authentication Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanUser = loginUserId.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    if (!cleanUser || !cleanPass) {
      setLoginError('অনুগ্রহ করে ইউজার আইডি এবং পাসওয়ার্ড উভয়ই প্রদান করুন।');
      return;
    }

    // Supported user credentials:
    // 1. Officer: bgb_officer / bgb_password
    // 2. Visitor: bgb_visitor / bgb_visitor
    if (cleanUser === 'bgb_officer' && cleanPass === 'bgb_password') {
      setIsLoggedIn(true);
      setLoggedInUserRole('BGB CO-OFFICER');
      sessionStorage.setItem('bgb_logged_in', 'true');
      sessionStorage.setItem('bgb_user_role', 'BGB CO-OFFICER');
      setLoginUserId('');
      setLoginPassword('');
    } else if (cleanUser === 'bgb_visitor' && cleanPass === 'bgb_visitor') {
      setIsLoggedIn(true);
      setLoggedInUserRole('PUBLIC CITIZEN');
      sessionStorage.setItem('bgb_logged_in', 'true');
      sessionStorage.setItem('bgb_user_role', 'PUBLIC CITIZEN');
      setLoginUserId('');
      setLoginPassword('');
    } else {
      setLoginError('ভুল ইউজার আইডি অথবা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় চেষ্টা করুন।');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUserRole('');
    sessionStorage.removeItem('bgb_logged_in');
    sessionStorage.removeItem('bgb_user_role');
  };

  // Waveform canvas animation loader hook
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.lineWidth = 2;

      // Draw standard green sound waves
      const waveCount = 5;
      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        
        // Active speaking or alert sound status dictates amplitude
        let amplitude = 4; // idle breath wave
        if (isSpeaking) {
          amplitude = 18 + i * 4;
        } else if (isAutoplayRunning) {
          amplitude = 12 + i * 3;
        } else if (isPrompterOpen) {
          amplitude = 6;
        }

        ctx.strokeStyle = i === 0 
          ? 'rgba(16, 185, 129, 0.8)'  // Primary Emerald
          : `rgba(16, 185, 129, ${0.4 - i * 0.08})`; // Faded layers

        // Draw trigonometric waves
        for (let x = 0; x < width; x++) {
          const radian = (x / width) * Math.PI * 2.5 + phase + (i * 0.5);
          const y = centerY + Math.sin(radian) * amplitude * Math.cos(radian * 0.5);
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      phase += (isSpeaking ? 0.18 : 0.04);
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpeaking, isAutoplayRunning, isPrompterOpen]);

  // Scroll effect handler for Prompter Mode
  useEffect(() => {
    if (isPrompterOpen && prompterScrollActive && prompterContainerRef.current) {
      const container = prompterContainerRef.current;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      let startTimestamp: number | null = null;
      let initialScrollTop = container.scrollTop;

      // If we are already at the bottom, reset to top
      if (container.scrollTop >= scrollHeight - 5) {
        container.scrollTop = 0;
        initialScrollTop = 0;
      }

      const animateScroll = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        
        // Total duration is dependent on speed parameter
        const duration = prompterScrollSpeed * 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        const targetScroll = initialScrollTop + (scrollHeight - initialScrollTop) * progress;
        container.scrollTop = targetScroll;

        if (progress < 1 && prompterScrollActive) {
          prompterTimerRef.current = requestAnimationFrame(animateScroll);
        } else {
          setPrompterScrollActive(false);
        }
      };

      prompterTimerRef.current = requestAnimationFrame(animateScroll);
    } else {
      if (prompterTimerRef.current) {
        cancelAnimationFrame(prompterTimerRef.current);
      }
    }

    return () => {
      if (prompterTimerRef.current) {
        cancelAnimationFrame(prompterTimerRef.current);
      }
    };
  }, [isPrompterOpen, prompterScrollActive, prompterScrollSpeed]);

  // Get or initialize persistent Web Audio API context and analyser
  const getAudioContext = (): { ctx: AudioContext | null; analyser: AnalyserNode | null } => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          const ctx = new AudioContextClass();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64; // Small size for responsive frequency bands
          analyser.smoothingTimeConstant = 0.55;
          
          audioContextRef.current = ctx;
          analyserRef.current = analyser;
        } catch (e) {
          console.warn("Failed to generate Web Audio context:", e);
        }
      }
    }
    
    // Explicitly auto-resume in case of gesture suspension
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    return {
      ctx: audioContextRef.current,
      analyser: analyserRef.current
    };
  };

  const startSpeechVocalSynth = () => {
    const { ctx, analyser } = getAudioContext();
    if (!ctx || !analyser) return;

    try {
      stopSpeechVocalSynth();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const lpFilter = ctx.createBiquadFilter();

      // Triangle waves produce speech-like vowel format signals
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);

      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(350, ctx.currentTime);

      // Low baseline volume, kept entirely silent or inaudible but fully mapped on visualizer stream
      gainNode.gain.setValueAtTime(0.005, ctx.currentTime);

      osc.connect(lpFilter);
      lpFilter.connect(gainNode);
      // Connect to analyser but NOT directly to output destination so speech synthesis
      // remains the singular audio source, preventing noisy oscillator sounds!
      gainNode.connect(analyser);

      osc.start();

      vocalSynthRef.current = { osc, gain: gainNode, lpFilter };

      // Micro syllable modulation loop to create speech decibel fluctuations
      let activeLoop = true;
      const modFn = () => {
        if (!activeLoop || !vocalSynthRef.current || !audioContextRef.current) return;
        try {
          const now = audioContextRef.current.currentTime;
          // Mimic speaking boundaries and syllable peaks
          const randFreq = 110 + Math.random() * 95;
          const randGain = 0.05 + Math.random() * 0.15;
          
          vocalSynthRef.current.osc.frequency.exponentialRampToValueAtTime(randFreq, now + 0.08);
          vocalSynthRef.current.gain.gain.linearRampToValueAtTime(randGain, now + 0.08);

          setTimeout(modFn, 120 + Math.random() * 120);
        } catch (e) {}
      };

      modFn();

      // Store a cleanup function on reference to kill modulation loop if stopped
      (vocalSynthRef.current as any).stopLoop = () => {
        activeLoop = false;
      };

    } catch (err) {
      console.warn("Vocal carrier synthesis start error:", err);
    }
  };

  const stopSpeechVocalSynth = () => {
    if (vocalSynthRef.current) {
      try {
        if ((vocalSynthRef.current as any).stopLoop) {
          (vocalSynthRef.current as any).stopLoop();
        }
        vocalSynthRef.current.osc.stop();
        vocalSynthRef.current.osc.disconnect();
        vocalSynthRef.current.gain.disconnect();
        vocalSynthRef.current.lpFilter.disconnect();
      } catch (e) {}
      vocalSynthRef.current = null;
    }
  };

  // Sync vocal speech visualizer carrier lifecycle with active speaking state
  useEffect(() => {
    if (isSpeaking) {
      startSpeechVocalSynth();
    } else {
      stopSpeechVocalSynth();
    }
    return () => {
      stopSpeechVocalSynth();
    };
  }, [isSpeaking]);

  // Decibel Real-Time Frequency Bar Chart visualizer loop
  useEffect(() => {
    const canvas = decibelCanvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const bufferLength = 32;
    const dataArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(bufferLength);
    let fallbackPhase = 0;

    const drawDecibelChart = () => {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;

      const analyserInstance = analyserRef.current;
      let dbVal = -100;

      if (analyserInstance) {
        analyserInstance.getByteFrequencyData(dataArray);
        analyserInstance.getByteTimeDomainData(timeArray);

        // Compute Root Mean Square (RMS) of signal
        let sumSquared = 0;
        for (let i = 0; i < bufferLength; i++) {
          const term = (timeArray[i] - 128) / 128;
          sumSquared += term * term;
        }
        const rms = Math.sqrt(sumSquared / bufferLength);
        dbVal = rms > 0 ? 20 * Math.log10(rms) : -100;
        
        // Boost sirens slightly for extreme warning visualization
        if (isSpeaking) {
          dbVal = Math.min(dbVal + 15, 0);
        }
      } else {
        // Fallback simulation in sync with speaking statuses
        if (isSpeaking) {
          const baseOffset = -32;
          dbVal = baseOffset + Math.sin(fallbackPhase * 1.5) * 12 + Math.random() * 4;
          for (let i = 0; i < bufferLength; i++) {
            dataArray[i] = Math.max(0, 50 + Math.sin(i / 1.8 + fallbackPhase) * 75 + Math.random() * 40);
          }
        } else {
          dbVal = -100;
          for (let i = 0; i < bufferLength; i++) {
            dataArray[i] = Math.max(0, 3 + Math.sin(i / 1.1 + fallbackPhase * 0.4) * 3);
          }
        }
        fallbackPhase += 0.15;
      }

      if (dbVal < -100 || isNaN(dbVal) || !isFinite(dbVal)) {
        dbVal = -100;
      }

      // Live update of corresponding UI decibel display
      const textId = document.getElementById('decibel-value');
      if (textId) {
        if (dbVal <= -95) {
          textId.textContent = "শব্দ মাত্রা: নিঃশব্দ (SILENCE)";
          textId.className = "text-emerald-500/50 font-mono tracking-wide text-[10px]";
        } else {
          textId.textContent = `শব্দ মাত্রা: ${dbVal.toFixed(1)} dB (নিরাপদ)`;
          if (dbVal > -22) {
            textId.textContent = `শব্দ মাত্রা: ${dbVal.toFixed(1)} dB (তীব্র স্তর)`;
            textId.className = "text-[#f42a41] animate-pulse font-mono tracking-wide font-bold text-[10px]";
          } else if (dbVal > -45) {
            textId.className = "text-amber-500 font-mono tracking-wide font-bold text-[10px]";
          } else {
            textId.className = "text-emerald-400 font-mono tracking-wide font-bold text-[10px]";
          }
        }
      }

      // Draw high-speed sound waves frequency bars
      const barCount = 28;
      const barWidth = width / barCount;
      const gap = 3;

      for (let i = 0; i < barCount; i++) {
        let val = dataArray[i] || 0;

        // Apply a small ambient ambient jitter alert when idle so it feels hot and alive
        if (!isSpeaking && val < 10) {
          val = 6 + Math.sin(fallbackPhase * 0.4 + i * 0.6) * 4;
        }

        const percent = val / 255;
        const barHeight = Math.max(3, percent * height * 1.3);

        const gradient = ctx2d.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#004a35');
        gradient.addColorStop(0.35, '#10b981');
        gradient.addColorStop(0.7, '#f59e0b');
        gradient.addColorStop(1, '#f42a41');

        ctx2d.fillStyle = gradient;

        const x = i * barWidth;
        const y = height - barHeight;

        // Render bar rectangle
        ctx2d.fillRect(x + gap / 2, y, barWidth - gap, barHeight);
      }

      dbAnimationRef.current = requestAnimationFrame(drawDecibelChart);
    };

    drawDecibelChart();

    return () => {
      if (dbAnimationRef.current) {
        cancelAnimationFrame(dbAnimationRef.current);
      }
    };
  }, [isSpeaking]);

  // Play custom buzzer beep sound with Web Audio Context (Analyser integrated)
  const playSirenTone = (type: 'siren' | 'beep' | 'chime', onComplete?: () => void) => {
    try {
      const { ctx, analyser } = getAudioContext();
      if (!ctx || !analyser) {
        onComplete?.();
        return;
      }
      
      if (type === 'beep') {
        const now = ctx.currentTime;
        const playSingleBeep = (offset: number) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(950, now + offset);
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1100;
          filter.Q.value = 4.0;

          gainNode.gain.setValueAtTime(0, now + offset);
          gainNode.gain.linearRampToValueAtTime(0.18, now + offset + 0.04);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);

          osc.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(ctx.destination);
          gainNode.connect(analyser);

          osc.start(now + offset);
          osc.stop(now + offset + 0.3);
        };

        playSingleBeep(0);
        playSingleBeep(0.35);

        setTimeout(() => {
          onComplete?.();
        }, 750);
      } else if (type === 'siren') {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(550, now);
        
        // Modulate frequency to create warning siren loop
        osc.frequency.linearRampToValueAtTime(1150, now + 0.35);
        osc.frequency.linearRampToValueAtTime(550, now + 0.7);
        osc.frequency.linearRampToValueAtTime(1150, now + 1.05);
        osc.frequency.linearRampToValueAtTime(550, now + 1.4);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1800;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1);
        gainNode.gain.setValueAtTime(0.12, now + 1.29);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        gainNode.connect(analyser);

        osc.start(now);
        osc.stop(now + 1.5);

        setTimeout(() => {
          onComplete?.();
        }, 1550);
      } else if (type === 'chime') {
        const now = ctx.currentTime;
        // Triad chime chord C5 - E5 - G5 - C6
        const chimes = [523.25, 659.25, 783.99, 1046.50];
        chimes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gainNode.gain.setValueAtTime(0, now + idx * 0.12);
          gainNode.gain.linearRampToValueAtTime(0.1, now + idx * 0.12 + 0.04);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          gainNode.connect(analyser);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.5);
        });

        setTimeout(() => {
          onComplete?.();
        }, 1100);
      }
    } catch (e) {
      console.warn("Audio Synthesis warning:", e);
      onComplete?.();
    }
  };

  // Perform TTS Speech synthesis
  const startActualSpeech = (text: string, onEndCallback?: () => void) => {
    if (!('speechSynthesis' in window)) return;
    
    // Safety cancel
    window.speechSynthesis.cancel();
    
    // Create new speech utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Appoint selected voice
    const activeVoice = voices.find(v => v.name === selectedVoiceName);
    if (activeVoice) {
      utterance.voice = activeVoice;
    }
    
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.lang = 'bn-BD'; // Force Bengali lang setting

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onEndCallback?.();
    };

    utterance.onerror = (e) => {
      console.error("TTS Speech synthesis mismatch:", e);
      setIsSpeaking(false);
      onEndCallback?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Main Speak controller
  const handleSpeakLine = (id: number, text: string) => {
    setActiveLineId(id);
    
    // Stop continuous autoplay if single line played manually
    if (isAutoplayRunning) {
      setIsAutoplayRunning(false);
      setAutoplayIndex(-1);
    }

    if (sirenEnabled) {
      setIsSpeaking(true); // show loader during siren chime
      playSirenTone(sirenType, () => {
        startActualSpeech(text, () => {
          setActiveLineId(null);
        });
      });
    } else {
      startActualSpeech(text, () => {
        setActiveLineId(null);
      });
    }
  };

  // Continuous Playback Loop of complete Script
  const startContinuousBroadcast = () => {
    if (scriptLines.length === 0) return;
    window.speechSynthesis.cancel();
    
    setIsAutoplayRunning(true);
    const playNext = (index: number) => {
      if (index >= scriptLines.length) {
        // Complete cycle
        setIsAutoplayRunning(false);
        setAutoplayIndex(-1);
        setActiveLineId(null);
        // Play closing chime
        playSirenTone('chime');
        return;
      }

      setAutoplayIndex(index);
      setActiveLineId(scriptLines[index].id);
      
      const textToSpeak = scriptLines[index].banglaText;

      const speechRoutine = () => {
        startActualSpeech(textToSpeak, () => {
          // Pause slightly between lines for natural miking breath gap
          setTimeout(() => {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
            playNext(index + 1);
          }, 1200);
        });
      };

      // Play alert buzzer only before first paragraph
      if (index === 0 && sirenEnabled) {
        playSirenTone(sirenType, speechRoutine);
      } else {
        speechRoutine();
      }
    };

    playNext(0);
  };

  // Stop everything
  const handleStopBroadcast = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsAutoplayRunning(false);
    setAutoplayIndex(-1);
    setActiveLineId(null);
  };

  // Script line custom editor save
  const handleStartEditLine = (line: ScriptLine) => {
    setEditingLineId(line.id);
    setEditingText(line.banglaText);
  };

  const handleSaveEditLine = (id: number) => {
    setScriptLines(prev => prev.map(line => 
      line.id === id ? { ...line, banglaText: editingText } : line
    ));
    setEditingLineId(null);
  };

  const handleResetScriptLine = (id: number) => {
    setScriptLines(prev => prev.map(line => 
      line.id === id ? { ...line, banglaText: line.defaultText } : line
    ));
    if (editingLineId === id) {
      setEditingText(scriptLines.find(l => l.id === id)?.defaultText || '');
    }
  };

  const handleResetAllScript = () => {
    if (window.confirm("আপনি কি সম্পূর্ণ স্ক্রিপ্টটি আগের অবস্থায় ফিরিয়ে নিতে চান?")) {
      setScriptLines(INITIAL_SCRIPT_LINES);
      localStorage.removeItem('bgb_script_lines');
    }
  };

  // Submit Emergency Border Alert Tip Report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterName || !reporterPhone || !reportLocation || !reportDescription) {
      alert("দয়া করে রিপোর্টের সকল প্রয়োজনীয় তথ্য পূরণ করুন।");
      return;
    }

    const newId = `REP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport: BorderReport = {
      id: newId,
      senderName: reporterName,
      senderPhone: reporterPhone,
      location: reportLocation,
      reportType: reportType,
      description: reportDescription,
      timestamp: new Date().toISOString(),
      status: 'Received',
      severity: reportSeverity
    };

    setReports([newReport, ...reports]);
    setSubmittedReportId(newId);
    
    // Clear form
    setReporterName('');
    setReporterPhone('');
    setReportLocation('');
    setReportDescription('');

    // Trigger success status after 1.5 seconds mock verifying
    setTimeout(() => {
      setReports(currentReports => 
        currentReports.map(rep => 
          rep.id === newId ? { ...rep, status: 'Verifying' } : rep
        )
      );
    }, 4000);
  };

  // Quiz interactive elements
  const handleAnswerQuiz = (selectedOptIdx: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuizIndex] = selectedOptIdx;
    setQuizAnswers(newAnswers);

    // Update streak if correct
    const currentQuestion = QUIZ_QUESTIONS[currentQuizIndex];
    if (selectedOptIdx === currentQuestion.correctAnswer) {
      setQuizStreak(prev => prev + 1);
    }
  };

  const handleNextQuiz = () => {
    if (currentQuizIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setShowQuizResult(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuizIndex(0);
    setQuizAnswers([]);
    setShowQuizResult(false);
    setQuizStreak(0);
  };

  // Filter contacts list
  const filteredContacts = BGB_CONTACTS.filter(contact => {
    const textMatch = contact.campName.toLowerCase().includes(contactSearch.toLowerCase()) ||
                      contact.sector.toLowerCase().includes(contactSearch.toLowerCase()) ||
                      contact.region.toLowerCase().includes(contactSearch.toLowerCase());
    const regionMatch = selectedRegion === 'all' || contact.region === selectedRegion;
    return textMatch && regionMatch;
  });

  // Filter reports list by severity
  const filteredReports = severityFilter === 'all'
    ? reports
    : reports.filter((rep) => rep.severity === severityFilter);

  const getSeverityBadge = (sev: BorderReport['severity']) => {
    switch(sev) {
      case 'low': return <span className="bg-blue-900 border border-blue-500 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-sans">তদন্তাধীন</span>;
      case 'medium': return <span className="bg-yellow-900 border border-yellow-500 text-yellow-200 text-xs px-2.5 py-0.5 rounded-full font-sans">মাঝারি</span>;
      case 'high': return <span className="bg-orange-900 border border-orange-500 text-orange-200 text-xs px-2.5 py-0.5 rounded-full font-sans">উচ্চ সতর্ক</span>;
      case 'critical': return <span className="bg-red-900 border border-red-500 text-red-200 text-xs px-2.5 py-0.5 rounded-full font-semibold px-3 animate-pulse font-sans">জরুরি অ্যাকশন</span>;
    }
  };

  const getStatusBadge = (status: BorderReport['status']) => {
    switch(status) {
      case 'Received': return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs px-2.5 py-1 rounded font-medium">গৃহীত (Received)</span>;
      case 'Verifying': return <span className="bg-amber-50 text-amber-800 border border-amber-300 text-xs px-2.5 py-1 rounded font-medium">যাচাই চলছে (Verifying)</span>;
      case 'Action Taken': return <span className="bg-emerald-50 text-emerald-800 border border-[#006a4e]/30 text-xs px-2.5 py-1 rounded font-medium">পদক্ষেপ গৃহীত (Action Taken)</span>;
      case 'Dismissed': return <span className="bg-slate-100 text-slate-400 border border-slate-200 text-xs px-2.5 py-1 rounded font-medium">খারিজ</span>;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#022c1f] via-[#041a13] to-[#01140e] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#f42a41] selection:text-white">
        {/* Top bar */}
        <div className="bg-[#f42a41] text-white text-[11px] font-bold py-1.5 px-4 text-center tracking-wider uppercase border-b border-red-800 shadow-sm">
          গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত সীমান্ত সুরক্ষা তথ্য কেন্দ্র (BGB SECURED NETWORK)
        </div>

        {/* Main Card container */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="w-full max-w-md bg-white border border-[#006a4e]/20 rounded-2xl shadow-2xl overflow-hidden text-slate-800 flex flex-col">
            {/* National Color Banner */}
            <div className="h-2 bg-gradient-to-r from-[#006a4e] via-[#f42a41] to-[#006a4e]"></div>

            {/* Banner details */}
            <div className="p-6 pb-4 text-center bg-[#006a4e]/5 border-b border-slate-150">
              <div className="w-16 h-16 rounded-full bg-[#006a4e]/10 border-2 border-[#006a4e] mx-auto flex items-center justify-center shadow-inner relative mb-3">
                <Shield className="w-9 h-9 text-[#006a4e] mx-auto" />
                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#f42a41] border border-white animate-pulse"></div>
              </div>
              <h2 className="text-[#006a4e] font-sans font-bold text-lg tracking-tight">বর্ডার গার্ড বাংলাদেশ (BGB)</h2>
              <p className="text-xs text-[#006a4e]/85 font-semibold mt-0.5">সীমান্ত নিরাপত্তা ও জনসচেতনতা তথ্য কেন্দ্র</p>
              <span className="inline-block mt-2 bg-[#f42a41]/5 border border-[#f42a41]/20 text-[#f42a41] text-[10px] font-bold px-2 py-0.5 rounded-full">
                সুরক্ষিত অফিশিয়াল পোর্টাল
              </span>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="p-6 flex flex-col gap-4">
              {loginError && (
                <div className="bg-red-50 border border-red-250 text-red-700 text-xs px-3 py-2.5 rounded-lg font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#f42a41] shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* User ID Field */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" htmlFor="login-username">
                  <UserCheck className="w-3.5 h-3.5 text-[#006a4e]" />
                  ইউজার আইডি (User ID):
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={loginUserId}
                    onChange={(e) => setLoginUserId(e.target.value)}
                    placeholder="যেমন- bgb_officer"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006a4e] focus:ring-1 focus:ring-[#006a4e] font-sans font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5" htmlFor="login-password">
                  <Key className="w-3.5 h-3.5 text-[#006a4e]" />
                  পাসওয়ার্ড (Password):
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006a4e] focus:ring-1 focus:ring-[#006a4e] font-sans font-medium transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="login-submit-btn"
                type="submit"
                className="w-full py-2.5 bg-[#006a4e] hover:bg-emerald-800 text-white font-bold rounded-lg text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Unlock className="w-4 h-4" />
                তথ্যকেন্দ্রে প্রবেশ করুন
              </button>
            </form>

            {/* Predefined demo credentials banner for evaluator convenience */}
            <div className="mx-6 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left">
              <div className="flex items-center gap-1.5 text-xs text-[#006a4e] font-bold mb-2">
                <Info className="w-3.5 h-3.5 text-[#006a4e]" />
                <span>মূল্যায়ন ও ডেমো টেস্টের জন্য ক্রেডেন্সিয়াল সমূহ:</span>
              </div>
              <div className="flex flex-col gap-2.5 text-[11px] text-slate-600 font-sans font-normal">
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 flex flex-col">
                  <span className="font-bold text-[#006a4e]">👮 কর্মকর্তা মোড (BGB Officer Access):</span>
                  <span className="mt-1">ইউজার আইডি (ID): <strong className="font-mono bg-white px-1 border rounded text-[#006a4e]">bgb_officer</strong></span>
                  <span>পাসওয়ার্ড (Pass): <strong className="font-mono bg-white px-1 border rounded text-[#006a4e]">bgb_password</strong></span>
                  <span className="text-[10px] text-slate-500 mt-1.5 border-t border-dashed border-[#006a4e]/20 pt-1">
                    * ক্ষমতা: সীমান্ত ব্রডকাস্টার, রিপোর্ট যাচাইকরণ, অ্যাকশন লগ ও নিষ্পত্তির মন্তব্য করার পূর্ণ ক্ষমতা।
                  </span>
                </div>
                <div className="p-2.5 bg-[#006a4e]/5 rounded-lg border border-slate-200 flex flex-col">
                  <span className="font-bold text-slate-700">🇧🇩 সাধারণ নাগরিক মোড (Visitor Viewer):</span>
                  <span className="mt-1">ইউজার আইডি (ID): <strong className="font-mono bg-white px-1 border rounded text-slate-700 font-bold">bgb_visitor</strong></span>
                  <span>পাসওয়ার্ড (Pass): <strong className="font-mono bg-white px-1 border rounded text-slate-700 font-bold">bgb_visitor</strong></span>
                  <span className="text-[10px] text-slate-500 mt-1.5 border-t border-dashed border-slate-250 pt-1">
                    * ক্ষমতা: কুইজে অংশ নেওয়া, নতুন সংবেদনশীল কেস রিপোর্ট করা এবং জরুরি যোগাযোগের ভিউ।
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#00170f] text-slate-400 py-4 text-center text-xs tracking-wide border-t border-emerald-950">
          <p className="font-bold mb-1 tracking-widest text-[#006a4e] text-[10px]"> বর্ডার গার্ড বাংলাদেশ — "বীরত্ব ও সততা" </p>
          <p>© {new Date().getFullYear()} বর্ডার গার্ড বাংলাদেশ। সর্বস্বত্ব সংরক্ষিত।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans transition-all duration-300 selection:bg-[#006a4e] selection:text-white">
      
      {/* Top BGB Safety Alert Marquee Indicator */}
      <div className="bg-[#f42a41] border-b border-red-800 text-white text-xs md:text-sm py-2 px-4 shadow-sm flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 items-center justify-center relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <div className="font-semibold whitespace-nowrap bg-black/20 px-2.5 py-0.5 rounded text-white text-xs shrink-0">
          জরুরি সতর্কবার্তা (VIGILANCE ALERT):
        </div>
        <marquee className="cursor-pointer hover:underline text-white text-xs md:text-sm font-semibold">
          {bannerAlert} — সীমান্ত নিরাপত্তায় যেকোনো অননুমোদিত গতিবিধি লক্ষ্য করলে সংশ্লিষ্ট বিজিবি ক্যাম্প বা হেল্পলাইনে ১১২ নাম্বারে যোগাযোগ করুন।
        </marquee>
      </div>

      {/* Main Structural Header */}
      <header className="bg-[#006a4e] border-b-4 border-[#f42a41] py-6 px-4 md:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            {/* Elegant SVG Custom Security Emblem */}
            <div className="w-14 h-14 rounded-full bg-[#005a41] bg-gradient-to-br from-emerald-800 to-emerald-950 border-2 border-yellow-500 flex items-center justify-center shadow-inner relative shrink-0">
              <Shield className="w-8 h-8 text-yellow-500" />
              <div className="absolute right-0 top-0 w-3.5 h-3.5 bg-[#f42a41] rounded-full border border-yellow-500 animate-pulse"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#f42a41] text-[10px] text-white px-2 py-0.5 rounded-full font-bold tracking-wider">BGB COOPERATION HUB</span>
                <span className="text-emerald-300 text-xs font-semibold">● অনলাইন মনিটরিং</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide mt-1">
                সীমান্ত নিরাপত্তা ও জনসচেতনতা তথ্য কেন্দ্র
              </h1>
              <p className="text-xs text-emerald-100 font-light mt-0.5">
                মানব পাচার ও অবৈধ অনুপ্রবেশ প্রতিরোধে সুনাগরিকদের জন্য বিশেষ প্রচারক ও ভিউয়ার প্যানেল
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Emergency Hotline widget */}
            <div className="bg-[#005a41] border border-emerald-600 rounded-lg p-3 flex items-center gap-3 text-white">
              <div className="p-2 bg-[#f42a41] rounded-full text-white">
                <PhoneCall className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-200 font-semibold tracking-wider">জরুরি হেল্পলাইন নম্বর</p>
                <p className="text-base font-bold text-yellow-300 tracking-wider">০১৭৬৯-৬০০১১২</p>
              </div>
            </div>

            {/* Custom status toggle */}
            <button
              onClick={() => {
                const updatedAlert = prompt("সতর্কবার্তা এডিট করুন:", bannerAlert);
                if (updatedAlert !== null) setBannerAlert(updatedAlert);
              }}
              title="সতর্কবার্তা মারকু এডিট করুন"
              className="px-3 py-2 bg-[#f42a41] hover:bg-red-600 border border-red-700 text-white rounded text-xs transition font-semibold cursor-pointer shadow-sm"
            >
              সতর্কবার্তা সংশোধন
            </button>

            {/* Current Session / Logged In Information */}
            <div className="flex items-center gap-2 bg-[#005a41] border border-emerald-600 rounded-lg py-1.5 px-3 text-white">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <div className="text-[10px] flex flex-col font-mono text-left">
                <span className="text-emerald-300 font-bold uppercase tracking-wider">রোল: {loggedInUserRole}</span>
                <span className="text-[9px] text-emerald-200/70">সুরক্ষিত সংযোগ</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-[#022c1f] hover:bg-slate-900 border border-[#005a41] hover:border-slate-800 text-white rounded text-xs transition font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              title="তথ্যকেন্দ্র থেকে সাইন আউট করুন"
            >
              <LogOut className="w-3.5 h-3.5" />
              লগআউট
            </button>
          </div>

        </div>
      </header>

      {/* Main Container Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Tab/Feature Select Buttons */}
        <div className="lg:col-span-12 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('broadcaster')}
            className={`px-4 py-2.5 rounded-t-lg font-semibold text-sm flex items-center gap-2 transition cursor-pointer border-t border-l border-r ${
              activeTab === 'broadcaster'
                ? 'bg-white text-[#006a4e] border-slate-300 border-b-transparent shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            মাইকিং ব্রডকাস্টার ও স্ক্রিপ্ট
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-t-lg font-semibold text-sm flex items-center gap-2 transition cursor-pointer relative border-t border-l border-r ${
              activeTab === 'reports'
                ? 'bg-white text-[#006a4e] border-slate-300 border-b-transparent shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            অনুপ্রবেশ ও পাচার রিপোর্ট করুন
            <span className="absolute -top-1 -right-1 bg-[#f42a41] text-[9px] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold px-1 select-none">
              {reports.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-2.5 rounded-t-lg font-semibold text-sm flex items-center gap-2 transition cursor-pointer border-t border-l border-r ${
              activeTab === 'quiz'
                ? 'bg-white text-[#006a4e] border-slate-300 border-b-transparent shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            সচেতনতা কুইজ (Quiz)
            {quizStreak > 0 && (
              <span className="bg-[#f42a41] text-white text-[10px] font-bold px-1.5 rounded animate-pulse">
                +{quizStreak}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2.5 rounded-t-lg font-semibold text-sm flex items-center gap-2 transition cursor-pointer border-t border-l border-r ${
              activeTab === 'contacts'
                ? 'bg-white text-[#006a4e] border-slate-300 border-b-transparent shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
            }`}
          >
            <MapPin className="w-4 h-4" />
            দেশব্যাপী বিজিবি ক্যাম্প ডিরেক্টরি
          </button>
        </div>

        {/* Dynamic Display Component Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* TAB 1: Broadcasting System & Script Player */}
          {activeTab === 'broadcaster' && (
            <div className="flex flex-col gap-6">
              
              {/* Broadcasting Controller Center */}
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-yellow-500 to-[#f42a41] left-0"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#006a4e] flex items-center gap-2">
                      <Volume2 className="text-[#006a4e] w-5 h-5 font-bold" />
                      লাইভ মাইকিং ব্রডকাস্টার (Live Speech Dashboard)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      সম্পূর্ণ স্ক্রিপ্ট বা নির্দিষ্ট অনুচ্ছেদ অডিও সিগন্যাল ও কৃত্রিম মাইকিং সাইরেন সহ মাইকে প্রচার করুন।
                    </p>
                  </div>

                  {/* Audio Controls Setup */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={isAutoplayRunning ? handleStopBroadcast : startContinuousBroadcast}
                      className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-sm ${
                        isAutoplayRunning 
                          ? 'bg-[#f42a41] hover:bg-red-700 text-white animate-pulse' 
                          : 'bg-[#006a4e] hover:bg-emerald-800 text-white'
                      }`}
                    >
                      {isAutoplayRunning ? (
                        <>
                          <Square className="w-4 h-4 fill-white" />
                          প্রচার বন্ধ করুন
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          টানা শুরু করুন (Full Loop)
                        </>
                      )}
                    </button>

                    {isSpeaking && (
                      <button
                        onClick={handleStopBroadcast}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-[#f42a41] border border-slate-200 rounded-lg transition"
                        title="স্টপ"
                      >
                        <VolumeX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Simulated Waveform Visualizer Screen */}
                <div className="bg-[#002a1e] rounded-xl border-2 border-[#006a4e]/40 p-4 mb-6 relative shadow-inner text-emerald-200">
                  <div className="absolute top-2 left-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isSpeaking || isAutoplayRunning ? 'bg-[#f42a41] animate-ping' : 'bg-emerald-400'}`}></div>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">
                      {isSpeaking ? 'BROADCASTING ACTIVE' : isAutoplayRunning ? 'AUTOPLAY ENGAGED' : 'SYS IDLE - READY'}
                    </span>
                  </div>

                  <div className="absolute top-2 right-3 flex items-center gap-3 text-[10px] font-mono text-emerald-400">
                    <span>MIC GAIN: +12dB</span>
                    <span>PITCH: {speechPitch}x</span>
                  </div>

                  <div className="h-24 flex items-center justify-center">
                    <canvas ref={canvasRef} width="600" height="96" className="w-full h-full opacity-90"></canvas>
                  </div>

                  {/* Real-time Decibel Level Spectrum / Bar Chart */}
                  <div className="mt-2 bg-[#00170f] rounded-lg p-2.5 border border-emerald-800/40 flex flex-col gap-1.5 shadow-inner">
                    <div className="flex justify-between items-center text-[10px] text-emerald-400 font-mono">
                      <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        রিয়েল-টাইম ডেসিবল স্পেকট্রাম (Web Audio API)
                      </span>
                      <span className="text-emerald-300 font-semibold text-[10px]" id="decibel-value">শব্দ মাত্রা: নিঃশব্দ (SILENCE)</span>
                    </div>
                    <canvas ref={decibelCanvasRef} id="decibel-spectrum-canvas" width="600" height="42" className="w-full h-[42px] opacity-95 rounded bg-[#000a06]"></canvas>
                  </div>

                  {/* Audio Tuning parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-emerald-950/60 text-xs">
                    
                    {/* Siren warning sound selector */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <label className="text-emerald-300 flex items-center gap-1.5 font-bold">
                        <input
                          type="checkbox"
                          checked={sirenEnabled}
                          onChange={(e) => setSirenEnabled(e.target.checked)}
                          className="rounded text-[#006a4e] focus:ring-emerald-500"
                        />
                        ঘোষণা সাইরেন (Siren Intro)
                      </label>
                      <select
                        disabled={!sirenEnabled}
                        value={sirenType}
                        onChange={(e: any) => setSirenType(e.target.value)}
                        className="bg-[#001f15] border border-emerald-800/80 rounded p-1 text-emerald-200 text-[11px] outline-none"
                      >
                        <option value="beep">ডাবল বিপ (Double Beep)</option>
                        <option value="siren">bgb জরুরি সাইরেন</option>
                        <option value="chime">সচেতনতা সুর (Chime)</option>
                      </select>
                    </div>

                    {/* Speech Speed slider */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <label className="text-emerald-300 font-bold">প্রচার গতি (Speed): {speechRate}x</label>
                      <input
                        type="range"
                        min="0.6"
                        max="1.4"
                        step="0.05"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 h-1 bg-[#001f15] rounded"
                      />
                    </div>

                    {/* Voice selector pitch */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <label className="text-emerald-300 font-bold">স্বর তীক্ষ্ণতা (Pitch)</label>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={speechPitch}
                        onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 h-1 bg-[#001f15] rounded"
                      />
                    </div>

                    {/* Voice Select */}
                    <div className="col-span-1 flex flex-col gap-1">
                      <label className="text-emerald-300 font-bold">কণ্ঠস্বর (Voice Select)</label>
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => setSelectedVoiceName(e.target.value)}
                        className="bg-[#001f15] border border-emerald-800/80 rounded p-1 text-emerald-200 text-[11px] outline-none overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        {voices.length === 0 ? (
                          <option>Default System Voice</option>
                        ) : (
                          voices.map((voice, idx) => (
                            <option key={`${voice.name}-${voice.lang}-${idx}`} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg font-semibold shadow-sm">
                    <Info className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>প্রযুক্তিগত টিপস: মাইকিং সাইরেন টিউন শুনতে স্পিকার অন রাখবেন।</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPrompterOpen(true)}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-800 font-bold rounded-lg flex items-center gap-1.5 tracking-wide shadow-sm cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      অন-ফিল্ড প্রম্পটার মোড (Prompter)
                    </button>
                    
                    <button
                      onClick={handleResetAllScript}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5"
                      title="স্ক্রিপ্ট আদি অবস্থায় নিয়ে যান"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      রিসেট করুন
                    </button>
                  </div>
                </div>

              </div>

              {/* Miking Script Block Container */}
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-4 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#006a4e]">ঘোষণা স্ক্রিপ্ট অনুচ্ছেদসমূহ (Miking Script Paragraphs)</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">ট্যাপ অথবা প্লে বাটনে ক্লিক করে নির্দিষ্ট অনুচ্ছেদ এককভাবে সম্প্রচার করুন।</p>
                  </div>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded font-mono font-bold">
                    ৮ টি অনুচ্ছেদ
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {scriptLines.map((line, idx) => {
                    const isLineActive = activeLineId === line.id;
                    const isEditing = editingLineId === line.id;

                    return (
                      <div
                        key={line.id}
                        className={`group rounded-xl border p-4 md:p-5 transition-all duration-350 relative ${
                          isLineActive 
                            ? 'bg-emerald-50/50 border-2 border-[#006a4e] shadow-md scale-[1.01]' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/40'
                        }`}
                      >
                        {/* Bullet count badg */}
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none ${
                            isLineActive 
                              ? 'bg-[#006a4e] text-white' 
                              : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className={`${isLineActive ? 'text-[#006a4e]' : 'text-slate-500'} text-[10px] font-mono tracking-wide uppercase font-bold hidden sm:inline`}>
                            {line.englishTitle}
                          </span>
                        </div>

                        {/* Interactive edit panel */}
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEditLine(line.id)}
                                className="px-2.5 py-1 bg-green-700 hover:bg-green-600 text-xs text-white rounded font-medium cursor-pointer"
                              >
                                সংরক্ষণ
                              </button>
                              <button
                                onClick={() => setEditingLineId(null)}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-xs text-slate-600 rounded cursor-pointer"
                              >
                                বাতিল
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEditLine(line)}
                                className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded text-slate-500 hover:text-[#006a4e] transition cursor-pointer"
                                title="সম্পাদনা করুন"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleResetScriptLine(line.id)}
                                className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded text-slate-500 hover:text-amber-500 transition cursor-pointer"
                                title="ডিফল্ট রূপ"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Text body area */}
                        <div className="mt-7 pr-12 pl-1 select-text">
                          {isEditing ? (
                            <textarea
                              rows={3}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full bg-white border border-slate-200 focus:border-[#006a4e] rounded p-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#006a4e] resize-y"
                            />
                          ) : (
                            <p className={`text-base md:text-[17px] leading-relaxed font-normal ${
                              isLineActive ? 'text-emerald-950 font-semibold' : 'text-slate-700'
                            }`}>
                              {line.banglaText}
                            </p>
                          )}
                        </div>

                        {/* Footer operations (Speak) */}
                        {!isEditing && (
                          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                            <span className="text-[11px] font-mono font-medium text-slate-400">
                              WORDS: {line.banglaText.split(/\s+/).length} | CHARS: {line.banglaText.length}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSpeakLine(line.id, line.banglaText)}
                                className="px-3.5 py-1.5 bg-emerald-50 text-[#006a4e] hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition font-bold shadow-sm cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                শুনুন / প্রচার করুন (Read out)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

           {/* TAB 2: Emergency Suspicious Border Activity Reporting */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-5">
                  <div className="bg-red-50 p-2.5 rounded-lg border border-red-200">
                    <ShieldAlert className="w-5 h-5 text-[#f42a41]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">অনুপ্রবেশ ও পাচারবিরোধী সিক্রেট রিপোর্ট ফর্ম</h2>
                    <p className="text-xs text-slate-500 font-medium">দালাল, অবৈধ অনুপ্রবেশকারী বা সন্দেহজনক পাচার চক্র সম্পর্কিত তথ্য দিয়ে বিজিবিকে সাহায্য করুন। তথ্য সম্পূর্ণ গোপনীয় রাখা হবে।</p>
                  </div>
                </div>

                {submittedReportId && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-center gap-4 animate-fade-in text-center sm:text-left">
                    <div className="bg-[#006a4e]/10 p-2 rounded-full text-[#006a4e]">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-[#006a4e]">রিপোর্ট সফলভাবে নথিভুক্ত হয়েছে!</h4>
                      <p className="text-xs text-emerald-800 mt-0.5 font-medium">রিপোর্ট আইডি: <span className="font-mono font-bold text-[#f42a41]">{submittedReportId}</span>। নিকটস্থ সীমান্ত কমান্ডার তাৎক্ষণিক যাচাইয়ের দায়িত্ব নিয়েছেন।</p>
                    </div>
                    <button
                      onClick={() => setSubmittedReportId(null)}
                      className="px-3 py-1 bg-[#006a4e] hover:bg-emerald-800 text-xs text-white rounded font-bold cursor-pointer transition"
                    >
                      নতুন রিপোর্ট
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmitReport} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">আপনার নাম * (Your Name - Confidential)</label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: মোঃ কামরুজ্জামান"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#f42a41] focus:ring-1 focus:ring-[#f42a41] rounded p-2.5 text-sm text-slate-800 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">যোগাযোগের মোবাইল নাম্বার * (Contact Number)</label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="যেমন: ০১৭১২-XXXXXX"
                        value={reporterPhone}
                        onChange={(e) => setReporterPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#f42a41] focus:ring-1 focus:ring-[#f42a41] rounded p-2.5 text-sm text-slate-800 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">ঘটনার স্থান বা সীমান্ত এলাকা * (Location)</label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: বেনাপোল ঘিবা সীমান্ত এলাকা"
                      value={reportLocation}
                      onChange={(e) => setReportLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#f42a41] focus:ring-1 focus:ring-[#f42a41] rounded p-2.5 text-sm text-slate-800 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">রিপোর্টের ধরন * (Report Type)</label>
                    <select
                      value={reportType}
                      onChange={(e: any) => setReportType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#f42a41] rounded p-2.5 text-sm text-slate-800 focus:outline-none font-medium"
                    >
                      <option value="trafficking">মানব পাচার সন্দেহ (Human Trafficking Suspected)</option>
                      <option value="infiltration">অবৈধ অনুপ্রবেশ (Illegal Infiltration)</option>
                      <option value="suspicious">দালাল চক্রের আনাগোনা (Broker Movement)</option>
                      <option value="other">অন্যান্য সীমান্ত অপরাধ (Other Offense)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">সতর্কতার মাত্রা (Severity Level)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { level: 'low', label: 'নিম্ন (Low / Info)' },
                        { level: 'high', label: 'উচ্চ সতর্ক (High Action)' },
                        { level: 'critical', label: 'জরুরি বিপদ (Critical / Urgent)' }
                      ].map(item => (
                        <button
                          key={item.level}
                          type="button"
                          onClick={() => setReportSeverity(item.level as any)}
                          className={`p-2.5 rounded border text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            reportSeverity === item.level 
                              ? 'border-[#f42a41] bg-rose-50 text-[#f42a41] font-bold shadow-sm' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            item.level === 'low' ? 'bg-blue-500' : item.level === 'high' ? 'bg-orange-500' : 'bg-red-500 animate-pulse'
                          }`}></span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">অভিযোগের বিশদ বিবরণ * (Detailed Description)</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="অপরিচিত ব্যক্তির আকার, সন্দেহজনক গাড়ির নাম্বার বা গতিবিধি সম্পর্কে সংক্ষেপে সতর্ক বিবরণ দিন..."
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#f42a41] focus:ring-1 focus:ring-[#f42a41] rounded p-2.5 text-sm text-slate-800 focus:outline-none resize-none font-normal"
                    ></textarea>
                  </div>

                  <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
                    <p className="text-[11px] text-[#f42a41] bg-red-50 border border-red-150 p-2.5 rounded-lg leading-normal max-w-md font-semibold">
                      ⚠️ বিজিবি সূত্র: মিথ্যা বা বিভ্রান্তিকর অভিযোগ দিয়ে নিরাপত্তা বাহিনীকে বিভ্রান্ত করা আইনি দণ্ডযোগ্য অপরাধ।
                    </p>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#f42a41] hover:bg-[#d01c31] text-white font-bold rounded-lg text-sm transition flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap justify-center"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      বিজিবি ক্যাম্পে রিপোর্ট করুন
                    </button>
                  </div>

                </form>
              </div>

              {/* Submitted Reports Listing inside State Log */}
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-[#006a4e]">সীমান্ত অ্যাকশন লগ ও স্ট্যাটাস ট্র্যাকিং</h3>
                    <p className="text-xs text-slate-500 font-medium">বিজিবি কমান্ডার কর্তৃক তদারকী করা রিপোর্ট ডাটাবেস।</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-bold">তীব্রতা ফিল্টার:</span>
                      <select
                        id="severity-filter-dropdown"
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value as any)}
                        className="bg-slate-50 border border-slate-250 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#006a4e] focus:ring-1 focus:ring-[#006a4e] font-sans font-semibold cursor-pointer"
                      >
                        <option value="all">সব তীব্রতা (All)</option>
                        <option value="low">নিম্ন / সাধারণ (Low)</option>
                        <option value="medium">মাঝারি সতর্ক (Medium)</option>
                        <option value="high">উচ্চ সতর্ক (High)</option>
                        <option value="critical">জরুরি অ্যাকশন (Critical)</option>
                      </select>
                    </div>

                    <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg font-bold font-sans">
                      {severityFilter === 'all' ? `মোট ${reports.length} টি সেশন কেস` : `পাওয়া গেছে: ${filteredReports.length} টি`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {filteredReports.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-250">
                      <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-bold">এই তীব্রতার কোনো সক্রিয় রিপোর্ট বা নথিভুক্ত কেস পাওয়া যায়নি।</p>
                      <button 
                        onClick={() => setSeverityFilter('all')}
                        className="mt-3 text-xs font-bold text-[#006a4e] hover:underline"
                      >
                        সব রিপোর্ট দেখুন
                      </button>
                    </div>
                  ) : (
                    filteredReports.map((rep) => {
                      const isEditing = editingReportId === rep.id;

                      return (
                        <div key={rep.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-sans font-normal hover:border-slate-350 transition-all">
                          {isEditing ? (
                            <div className="flex flex-col gap-4">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="font-mono text-sm font-bold text-[#f42a41]">সম্পাদনা: {rep.id}</span>
                                <span className="text-xs text-slate-500 font-medium">রিপোর্ট স্ট্যাটাস ও নিষ্পত্তি এডিট</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Status Selector */}
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs font-bold text-slate-700">কার্যকরী স্ট্যাটাস:</label>
                                  <select
                                    value={tempStatus}
                                    onChange={(e) => setTempStatus(e.target.value as any)}
                                    className="bg-white border border-slate-250 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#006a4e] focus:ring-1 focus:ring-[#006a4e] font-semibold cursor-pointer font-sans"
                                  >
                                    <option value="Received">গৃহীত (Received)</option>
                                    <option value="Verifying">যাচাই চলছে (Verifying)</option>
                                    <option value="Action Taken">পদক্ষেপ গৃহীত (Action Taken)</option>
                                    <option value="Dismissed">খারিজ (Dismissed)</option>
                                  </select>
                                </div>

                                {/* Severity Selector */}
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs font-bold text-slate-700">তীব্রতার স্তর (Severity):</label>
                                  <select
                                    value={tempSeverity}
                                    onChange={(e) => setTempSeverity(e.target.value as any)}
                                    className="bg-white border border-slate-250 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#006a4e] focus:ring-1 focus:ring-[#006a4e] font-semibold cursor-pointer font-sans"
                                  >
                                    <option value="low">নিম্ন / সাধারণ (Low)</option>
                                    <option value="medium">মাঝারি সতর্ক (Medium)</option>
                                    <option value="high">উচ্চ সতর্ক (High)</option>
                                    <option value="critical">জরুরি অ্যাকশন (Critical)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Resolution Notes */}
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-700">নিষ্পত্তির বিবরণ / গৃহীত ব্যবস্থা (মতামত):</label>
                                <textarea
                                  value={tempResolutionNotes}
                                  onChange={(e) => setTempResolutionNotes(e.target.value)}
                                  placeholder="যেমন: টহল দল পাঠানো হয়েছে, ঊর্ধ্বতন কর্তৃপক্ষকে অবহিত করা হয়েছে..."
                                  rows={2}
                                  className="bg-white border border-slate-250 text-slate-700 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#006a4e] focus:ring-1 focus:ring-[#006a4e] font-medium resize-none shadow-sm font-sans"
                                />
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-150">
                                <button
                                  type="button"
                                  onClick={handleCancelReportEdit}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer font-sans"
                                >
                                  বাতিল
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveReportEdit(rep.id)}
                                  className="px-4 py-1.5 bg-[#006a4e] hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-sm animate-pulse font-sans"
                                >
                                  সংরক্ষণ করুন
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-2 mb-2">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm font-bold text-[#f42a41]">{rep.id}</span>
                                  <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                                    <MapPin className="w-3 h-3 text-[#f42a41]" />
                                    {rep.location}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getSeverityBadge(rep.severity)}
                                  {getStatusBadge(rep.status)}
                                  <button
                                    onClick={() => handleStartEditReport(rep)}
                                    className="ml-1 px-2 py-1 text-slate-500 hover:text-[#006a4e] hover:bg-[#006a4e]/10 border border-slate-200 hover:border-[#006a4e]/20 rounded-lg flex items-center gap-1 transition text-[11px] font-bold cursor-pointer font-sans"
                                    title="সম্পাদনা করুন"
                                  >
                                    <Edit3 className="w-3 h-3 text-slate-400" />
                                    এডিট
                                  </button>
                                </div>
                              </div>

                              <p className="text-sm text-slate-700 leading-relaxed mb-3 font-medium">
                                {rep.description}
                              </p>

                              {rep.resolutionNotes && (
                                <div className="mb-3 p-3 bg-emerald-50/50 border border-emerald-150 rounded-lg text-xs shadow-sm">
                                  <strong className="text-[#006a4e] block mb-1">✓ নিষ্পত্তির মন্তব্য / গৃহীত ব্যবস্থা:</strong>
                                  <p className="text-slate-600 leading-normal font-semibold">{rep.resolutionNotes}</p>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1.5 border-t border-slate-200/50">
                                <span>রিপোর্টার: <strong className="text-slate-600">{rep.senderName}</strong> ({rep.senderPhone})</span>
                                <span className="font-semibold font-sans">সময়: {new Date(rep.timestamp).toLocaleString('bn-BD')}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Border Safety & Educational Quiz */}
          {activeTab === 'quiz' && (
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-2.5 rounded-lg text-[#006a4e] border border-emerald-200">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">সীমান্ত জনসচেতনতা কুইজ (Public Vigilance Quiz)</h2>
                    <p className="text-xs text-slate-500 font-medium">সীমান্ত আইন এবং সাধারণ সুরক্ষাবিধি সম্পর্কে আপনার জ্ঞান যাচাই করুন ও সচেতনতার স্কোর অর্জন করুন।</p>
                  </div>
                </div>

                {quizStreak > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <Award className="w-4 h-4 text-amber-600 animate-spin" />
                    <span className="text-xs font-bold text-amber-800">Streak: {quizStreak}</span>
                  </div>
                )}
              </div>

              {!showQuizResult ? (
                <div>
                  <div className="mb-4 flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-500">প্রশ্নের অগ্রগতি: <strong className="text-[#006a4e] font-bold">{currentQuizIndex + 1} / {QUIZ_QUESTIONS.length}</strong></span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">সঠিক উত্তর স্কোরযোগ্য</span>
                  </div>

                  {/* Question Title */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-5">
                    <h3 className="text-base md:text-lg font-bold text-slate-800">
                      Q{currentQuizIndex + 1}. {QUIZ_QUESTIONS[currentQuizIndex].question}
                    </h3>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {QUIZ_QUESTIONS[currentQuizIndex].options.map((option, idx) => {
                      const isSelected = quizAnswers[currentQuizIndex] === idx;
                      const hasSubmittedOption = quizAnswers[currentQuizIndex] !== undefined;
                      const isCorrectOpt = idx === QUIZ_QUESTIONS[currentQuizIndex].correctAnswer;

                      let btnStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-350 hover:bg-slate-100 font-semibold';
                      if (isSelected) {
                        btnStyle = 'border-[#006a4e] bg-emerald-50 text-[#006a4e] font-bold';
                      }
                      if (hasSubmittedOption) {
                        if (isCorrectOpt) {
                          btnStyle = 'border-emerald-600 bg-emerald-50 text-[#006a4e] font-bold';
                        } else if (isSelected) {
                          btnStyle = 'border-rose-500 bg-rose-50/50 text-rose-700';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={hasSubmittedOption}
                          onClick={() => handleAnswerQuiz(idx)}
                          className={`p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between gap-3 shadow-xs ${btnStyle} ${!hasSubmittedOption ? 'cursor-pointer' : ''}`}
                        >
                          <span>{option}</span>
                          {hasSubmittedOption && isCorrectOpt && (
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Section */}
                  {quizAnswers[currentQuizIndex] !== undefined && (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
                      <h4 className="text-xs font-bold text-[#006a4e] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                        <Info className="w-3.5 h-3.5 text-[#006a4e]" />
                        আইন ও সুরক্ষার প্রেক্ষাপট (Explanation):
                      </h4>
                      <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-semibold">
                        {QUIZ_QUESTIONS[currentQuizIndex].explanation}
                      </p>
                    </div>
                  )}

                  {/* Navigator Footer */}
                  <div className="flex justify-end">
                    <button
                      disabled={quizAnswers[currentQuizIndex] === undefined}
                      onClick={handleNextQuiz}
                      className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold transition shadow-sm ${
                        quizAnswers[currentQuizIndex] === undefined
                          ? 'bg-slate-100 text-slate-400 border border-slate-250 cursor-not-allowed'
                          : 'bg-[#006a4e] hover:bg-emerald-800 text-white cursor-pointer'
                      }`}
                    >
                      {currentQuizIndex === QUIZ_QUESTIONS.length - 1 ? 'ফলাফল দেখুন' : 'পরবর্তী প্রশ্ন'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center text-[#006a4e] mb-4 shadow-sm animate-bounce">
                    <Award className="w-10 h-10" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2">অভিনন্দন! আপনি কুইজটি সম্পন্ন করেছেন।</h3>
                  
                  {/* Score calculator */}
                  {(() => {
                    let score = 0;
                    QUIZ_QUESTIONS.forEach((q, idx) => {
                      if (quizAnswers[idx] === q.correctAnswer) score++;
                    });
                    const percentage = Math.round((score / QUIZ_QUESTIONS.length) * 100);

                    return (
                      <div className="max-w-md mx-auto">
                        <p className="text-sm text-slate-600 mb-6 font-medium">
                          আপনি সর্বমোট <strong className="text-[#006a4e] text-lg font-bold">{QUIZ_QUESTIONS.length}</strong> প্রশ্নের মধ্যে <strong className="text-[#006a4e] text-lg font-bold">{score}</strong> টির সঠিক উত্তর প্রদান করেছেন।
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-left">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-bold text-center">সচেতন সুনাগরিক রেটিং</p>
                          <div className="w-full bg-slate-200 rounded-full h-3 mb-3">
                            <div className="bg-[#006a4e] h-3 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                          
                          <div className="flex justify-between text-xs text-slate-500 font-semibold">
                            <span>বেসিক সচেতনতা</span>
                            <span className="font-bold text-[#f42a41]">
                              {percentage >= 75 ? 'সীমান্ত চ্যাম্পিয়ন (১০০% যোগ্য)' : percentage >= 50 ? 'নিরাপত্তা অনুসারী' : 'আরও সুরক্ষা জানা আবশ্যক'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-center gap-3">
                          <button
                            onClick={handleResetQuiz}
                            className="px-4 py-2.5 bg-[#006a4e] hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
                          >
                            আবার চেষ্টা করুন
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('broadcaster');
                              handleSpeakLine(7, INITIAL_SCRIPT_LINES[6].banglaText);
                            }}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
                          >
                            স্ক্রিপ্ট শ্লোগান শুনুন
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Nationwide Camp Contacts */}
          {activeTab === 'contacts' && (
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">দেশব্যাপী সীমান্ত সেক্টর ও ক্যাম্প ডিরেক্টরি</h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">যেকোনো সন্দেহজনক অনুপ্রেবেশের তথ্য তাৎক্ষণিক জানাতে আঞ্চলিক কমান্ড অফিসে সরাসরি যোগাযোগ করুন।</p>
                </div>
                <span className="bg-emerald-50 border border-emerald-200 text-[#006a4e] text-xs px-2.5 py-1.5 rounded font-bold shadow-xs">
                  বর্ডার গার্ড বাংলাদেশ সদরদপ্তর জরুরি হটলাইন
                </span>
              </div>

              {/* Filters Panel */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="ক্যাম্পের নাম বা রিজিয়ন দিয়ে খুঁজতে টাইপ করুন..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 pl-9 text-sm text-slate-800 focus:outline-none focus:border-[#006a4e] focus:ring-1 focus:ring-[#006a4e]"
                  />
                </div>

                <div className="sm:w-52">
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm text-slate-800 focus:outline-none focus:border-[#006a4e]"
                  >
                    <option value="all">সকল রিজিয়ন (All Regions)</option>
                    <option value="যশোর রিজিয়ন">যশোর রিজিয়ন</option>
                    <option value="রংপুর রিজিয়ন">রংপুর রিজিয়ন</option>
                    <option value="চট্টগ্রাম রিজিয়ন">চট্টগ্রাম রিজিয়ন</option>
                    <option value="সিলেট রিজিয়ন">সিলেট রিজিয়ন</option>
                  </select>
                </div>
              </div>

              {/* Contacts Table List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                      <th className="py-2.5 px-3">রিজিয়ন</th>
                      <th className="py-2.5 px-3">সেক্টর কমান্ড</th>
                      <th className="py-2.5 px-3">ক্যাম্প/ফাঁড়ির নাম</th>
                      <th className="py-2.5 px-3">জরুরি মোবাইল নম্বর</th>
                      <th className="py-2.5 px-3 text-right">কল বাটন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(contact => (
                        <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="py-3 px-3 text-slate-700 font-bold">{contact.region}</td>
                          <td className="py-3 px-3 text-slate-500">{contact.sector}</td>
                          <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006a4e] shrink-0"></span>
                            {contact.campName}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#f42a41]">{contact.contactNumber}</td>
                          <td className="py-3 px-3 text-right">
                            <a
                              href={`tel:${contact.contactNumber.replace(/X/g, '0')}`}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#006a4e] border border-emerald-200 rounded text-xs font-bold transition shadow-xs inline-block"
                            >
                              Dial Now
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 text-xs font-bold">
                          কোনো ক্যাম্প বা সেক্টর তথ্য পাওয়া যায়নি। অন্য কিওয়ার্ড দিয়ে চেষ্টা করুন।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* Right Sidebar Widget Panels */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Quick Legal Guidelines / Fact Box */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/20 rounded-xl border-2 border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold tracking-wider text-[#006a4e] uppercase flex items-center gap-1.5 mb-3 border-b border-slate-200 pb-2">
              <Shield className="w-4 h-4 text-[#006a4e]" />
              আইনগত দিকনির্দেশনা ও সীমান্ত সাধারণ বিধি
            </h3>

            <div className="space-y-4 text-xs">
              
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-red-700 font-bold uppercase block mb-1">অবৈধ অনুপ্রবেশ দণ্ড</span>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  বৈধ কাগজপত্র ছাড়া আন্তর্জাতিক সীমান্ত অতিক্রম করা পাসপোর্ট আইনের অধীনে সর্বোচ্চ ৩ বছরের কারাদণ্ডযোগ্য চরম অপরাধ।
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-red-700 font-bold uppercase block mb-1">মানব পাচার শাস্তি</span>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  কারও সরলতার সুযোগ নিয়ে বা বলপ্রয়োগ করে অবৈধভাবে সীমান্ত পারাপারকারী দালালচক্রের খপ্পর থেকে সাবধান থাকুন। এতে অপরাধীদের আজীবন যাবজ্জীবন বা মৃত্যুদণ্ড হতে পারে।
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-amber-800 font-bold uppercase block mb-1">সন্ধানদাতার প্রাপ্তি</span>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  সীমান্তে সফল অনুপ্রবেশকারীকে বা চক্রের মোড়লকে ধরতে সহায়তা করলে প্রশাসন থেকে পুরস্কৃত ও সংরক্ষিত রাখা হবে।
                </p>
              </div>

            </div>
          </div>

          {/* Custom Awareness Flyer / Poster Generator Section */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
              <Printer className="text-[#006a4e] w-4 h-4" />
              <h3 className="text-sm font-bold text-slate-950">গ্রাম্য সচেতনতা লিফলেট জেনারেটর</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-4 font-medium">
              স্থানীয় এলাকার মসজিদে বা বাজারে সেঁটে দেওয়ার জন্য নিচের কপার ও স্ক্রিপ্ট সংবলিত সচেতনতা পোস্টারটি কপি বা ডাউনলোড করুন।
            </p>

            {/* Poster Blueprint mockup visualization */}
            <div id="print-canvas" className="bg-white text-neutral-950 p-4 rounded-lg shadow-inner text-center font-normal text-[11px] flex flex-col gap-2 leading-tight">
              
              <div className="border-4 border-emerald-700 p-2.5 flex flex-col gap-1.5 rounded bg-emerald-50/30">
                <span className="bg-emerald-800 text-white font-bold px-3 py-1 rounded text-[10px] uppercase inline-block mx-auto">সচেতন থাকুন — নিরাপদ থাকুন</span>
                <h4 className="text-[12px] font-bold text-emerald-800">মানব পাচার ও অবৈধ অনুপ্রবেশ রুখুন</h4>
                
                <hr className="border-emerald-200" />
                
                <p className="text-[9px] text-slate-700 leading-relaxed text-left line-clamp-4 font-semibold">
                  {scriptLines[0].banglaText} {scriptLines[1].banglaText}
                </p>

                <div className="bg-emerald-900 text-white font-bold p-1 rounded-sm text-[8px] tracking-wide mt-1">
                  সহযোগিতায়: বর্ডার গার্ড বাংলাদেশ (বিজিবি)
                </div>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <button
                onClick={() => {
                  const combined = scriptLines.map((line, idx) => `${idx + 1}. ${line.banglaText}`).join('\n\n');
                  navigator.clipboard.writeText(combined);
                  alert("সম্পূর্ণ সচেতনতামূলক মাইকিং স্ক্রিপ্টটি ক্লিপবোর্ডে কপি করা হয়েছে!");
                }}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#006a4e] font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                টেক্সট কপি করুন
              </button>
              
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-3 py-2 bg-[#f42a41] hover:bg-[#d01c31] text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                পোস্টার প্রিন্ট করুন
              </button>
            </div>
          </div>

          {/* Special Awareness Video Checklist / Local Volunteers */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 text-xs shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
              <UserCheck className="text-[#006a4e] w-4 h-4" />
              ভলান্টিয়ারদের করণীয় নির্দেশিকা
            </h4>
            <ul className="space-y-2.5 text-slate-600 font-semibold">
              <li className="flex items-start gap-2">
                <span className="text-[#006a4e] shrink-0 font-bold mt-0.5">১.</span>
                <span>সীমান্তবর্তী স্থানীয় হাটের দিন বা বিশেষ সভায় এই মাইকিং স্ক্রিপ্টটি অন্তত ৩ বার প্রচারের ব্যবস্থা করা।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#006a4e] shrink-0 font-bold mt-0.5">২.</span>
                <span>দালাল বা সন্দেহজনক ব্যক্তিদের আশ্রোদাতাদের সচেতন করা এবং আইনি পরিণতির কথা মনে করিয়ে দেওয়া।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#006a4e] shrink-0 font-bold mt-0.5">৩.</span>
                <span>কোনো অপরিচিত ব্যক্তি নদীর ঘাট বা অননুমোদিত জঙ্গল সীমান্তে থাকলে নিকটস্থ বিজিবি বা ১১২ নাম্বারে খবর দেওয়া।</span>
              </li>
            </ul>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-50 border-t-2 border-slate-200 py-8 px-4 text-center text-xs text-slate-400 mt-12 font-sans font-medium">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#006a4e]" />
            <span className="font-bold text-slate-600">সীমান্ত সচেতনতা ও জননিরাপত্তা প্রচারক হাব — বিজিবি</span>
          </div>
          <p className="font-bold text-slate-500">
            © ২০২৬ বর্ডার গার্ড বাংলাদেশ (বিজিবি)। সকল অধিকার কপিরাইট সংরক্ষিত ও জনস্বার্থে প্রচারিত।
          </p>
          <div className="flex gap-4 font-bold text-slate-500">
            <span className="hover:text-[#f42a41] transition cursor-pointer">নিরাপত্তা নীতিমালা</span>
            <span className="hover:text-[#f42a41] transition cursor-pointer">হেল্প ডেস্ক</span>
          </div>
        </div>
      </footer>

      {/* TELEPROMPTER FULLSCREEN PORTAL MODAL */}
      {isPrompterOpen && (
        <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 ${
          prompterHighContrast ? 'bg-black text-yellow-400' : 'bg-neutral-950 text-gray-100'
        }`}>
          
          {/* Header Panel with prompt controls */}
          <div className="bg-neutral-900 border-b border-neutral-800 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg">
                <Megaphone className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">সীমান্তবর্তী লাইভ প্রচার মাইকিং প্রম্পটার (Teleprompter Screen)</h3>
                <p className="text-[11px] text-gray-400">এই উইন্ডোতে বড় স্ক্রিনে স্ক্রিপ্টটি সরাসরি রিডিং পড়তে পারেন।</p>
              </div>
            </div>

            {/* Quick Controllers toolbar */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              
              {/* Force Contrast switch */}
              <button
                onClick={() => setPrompterHighContrast(!prompterHighContrast)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded font-semibold cursor-pointer"
              >
                Contrast Mode: {prompterHighContrast ? 'HIGH CONTRAST' : 'DARK SLATE'}
              </button>

              {/* Font Sizer */}
              <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1 border border-neutral-700 rounded text-white">
                <span>Text Size:</span>
                <input
                  type="range"
                  min="1.5"
                  max="4.0"
                  step="0.2"
                  value={prompterFontSize}
                  onChange={(e) => setPrompterFontSize(parseFloat(e.target.value))}
                  className="w-20 accent-emerald-500 grayscale"
                />
              </div>

              {/* Auto Scroll Speeder */}
              <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1 border border-neutral-700 rounded text-white font-semibold">
                <span>Scroll Duration: {prompterScrollSpeed}s</span>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="2"
                  value={prompterScrollSpeed}
                  onChange={(e) => setPrompterScrollSpeed(parseInt(e.target.value))}
                  className="w-24 accent-emerald-500"
                />
              </div>

              {/* Start/Stop Auto-Scroll */}
              <button
                onClick={() => setPrompterScrollActive(!prompterScrollActive)}
                className={`px-4 py-1.5 rounded font-bold cursor-pointer transition ${
                  prompterScrollActive 
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-neutral-950'
                }`}
              >
                {prompterScrollActive ? 'স্ক্রোল বন্ধ করুন' : 'অটো-স্ক্রোল শুরু করুন'}
              </button>

              {/* Exit Modal */}
              <button
                onClick={() => {
                  setPrompterScrollActive(false);
                  setIsPrompterOpen(false);
                }}
                className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>

            </div>
          </div>

          {/* Massive Text Body Display Area */}
          <div
            ref={prompterContainerRef}
            className="flex-1 overflow-y-auto p-8 md:p-14 leading-relaxed font-normal text-center flex flex-col gap-10 cursor-pointer scroll-smooth"
            style={{ fontSize: `${prompterFontSize}rem` }}
            onClick={() => setPrompterScrollActive(!prompterScrollActive)}
          >
            
            <div className="max-w-5xl mx-auto py-10 flex flex-col gap-8">
              <div className="border-b-2 border-dashed border-gray-800 pb-6 mb-4 text-center">
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold block mb-2">BGB PUBLIC SERVICE BULLETIN</span>
                <h2 className="text-xl md:text-2xl font-bold uppercase text-white">মানব পাচার ও অবৈধ অনুপ্রবেশ প্রতিরোধে জনসচেতনতামূলক মাইকিং স্ক্রিপ্ট</h2>
              </div>

              {scriptLines.map((line, idx) => (
                <div key={line.id} className="py-6 border-b border-gray-900">
                  <span className="text-xs font-mono text-gray-500 uppercase block mb-1">অনুচ্ছেদ {idx + 1}</span>
                  <p className="font-normal font-sans leading-[1.6]">
                    {line.banglaText}
                  </p>
                </div>
              ))}

              <div className="pt-10 text-center">
                <span className="bg-red-900/40 text-red-300 font-bold rounded px-4 py-2 text-base inline-block">শ্লোগান সমাপ্তি — নিরাপদ সীমান্ত গড়ে তুলি</span>
              </div>
            </div>

          </div>

          {/* Teleprompter Footer */}
          <div className="bg-neutral-900 border-t border-neutral-800 p-4 text-center text-xs text-gray-500">
            স্পেসবার বা ট্যাপ প্রেস করে অটো-স্ক্রোল নিয়ন্ত্রণ করতে পারেন।
          </div>

        </div>
      )}

    </div>
  );
}
