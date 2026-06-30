/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { 
  Video, VideoOff, Mic, MicOff, Hand, MessageSquare, Settings, Users, 
  Tv, Sparkles, Share2, Smile, Volume2, Plus, Trash2, Shield, Play, Square,
  Check, X, ChevronRight, Send, AlertCircle, RefreshCw, PenTool, Eraser,
  BookOpen, Calendar, Compass, Lock, Upload, FileText, ZoomIn, ZoomOut, MousePointer, ExternalLink
} from 'lucide-react';
import { localDB, db, cleanUndefined } from '../firebase';
import { sendLiveClassPushAlert } from '../lib/pushService';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { Course, CourseModule, Turma } from '../types';

// Shared Interface definitions for classroom session
export interface ClassroomParticipant {
  userId: string;
  name: string;
  avatar: string;
  role: 'instructor' | 'student';
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  speakingAllowed: boolean;
  isSimulated?: boolean;
}

export interface ClassroomChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'instructor' | 'student';
  message: string;
  createdAt: string;
}

export interface ClassroomSession {
  classTitle: string;
  classDescription: string;
  isRecording: boolean;
  chatMuted: boolean;
  allowStudentCam: boolean;
  recordingStartTime: string | null;
  activeSpotlightId: string | null;
  whiteboardActive: boolean;
  participants: ClassroomParticipant[];
  messages: ClassroomChatMsg[];
  whiteboardData: string | null; // Base64 png data of drawing
  screenShareActive?: boolean;
  screenShareUserId?: string | null;
  screenShareSlideIndex?: number;
  screenShareType?: 'video' | 'file' | 'canva';
  uploadedFileName?: string;
  uploadedFileType?: string;
  uploadedFileUrl?: string;
  uploadedFileSlides?: Array<{
    title: string;
    subtitle: string;
    content: string[];
    visualType?: 'chart' | 'anatomy' | 'table' | 'bullets' | 'custom_image';
    customImage?: string;
  }>;
  drawOnSlides?: boolean;
  canvaUrl?: string;
  canvaEmbedUrl?: string;
  materialZoom?: number;
  pointerX?: number;
  pointerY?: number;
  pointerActive?: boolean;
  pointerUserName?: string;
}

// Initial mockup data
const DEFAULT_PARTICIPANTS: ClassroomParticipant[] = [
  {
    userId: 'prof-lucas',
    name: 'Dr. Lucas Brandão (M.V.)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'instructor',
    micOn: true,
    camOn: true,
    handRaised: false,
    speakingAllowed: true
  },
  {
    userId: 'student-ana',
    name: 'Ana Souza (Residente)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'student',
    micOn: false,
    camOn: false,
    handRaised: false,
    speakingAllowed: false,
    isSimulated: true
  },
  {
    userId: 'student-bruno',
    name: 'Bruno Lima',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'student',
    micOn: true,
    camOn: true,
    handRaised: true,
    speakingAllowed: true,
    isSimulated: true
  },
  {
    userId: 'student-carla',
    name: 'Carla Pereira (Vet. Exóticos)',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    role: 'student',
    micOn: false,
    camOn: false,
    handRaised: false,
    speakingAllowed: false,
    isSimulated: true
  }
];

const INITIAL_MESSAGES: ClassroomChatMsg[] = [
  {
    id: 'msg-1',
    senderId: 'student-ana',
    senderName: 'Ana Souza (Residente)',
    senderRole: 'student',
    message: 'Boa noite professor! Excelente tema de aula.',
    createdAt: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 'msg-2',
    senderId: 'prof-lucas',
    senderName: 'Dr. Lucas Brandão (M.V.)',
    senderRole: 'instructor',
    message: 'Olá pessoal, sejam muito bem-vindos! Se preparem pois teremos práticas e discussão de casos complexos hoje.',
    createdAt: new Date(Date.now() - 240000).toISOString()
  }
];

export interface ClassroomProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'student' | 'instructor';
  myRegistrations?: string[];
}

export const getSimulatedVideoUrl = (p: ClassroomParticipant) => {
  if (p.role === 'instructor') {
    return 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  }
  const nameLower = p.name.toLowerCase();
  if (nameLower.includes('ana')) {
    return 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
  }
  if (nameLower.includes('carla')) {
    return 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
  }
  if (nameLower.includes('bruno') || nameLower.includes('pedro') || nameLower.includes('thiago') || nameLower.includes('joão') || nameLower.includes('faro')) {
    return 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
  }
  return 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
};

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
}

export function VideoPlayer({ stream, muted = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-full object-contain bg-slate-950 rounded-xl"
    />
  );
}

interface ParticipantVideoFeedProps {
  participant: ClassroomParticipant;
  mediaStream: MediaStream | null;
  activeTesterId: string;
  remoteStream?: MediaStream | null;
}

export function ParticipantVideoFeed({ participant, mediaStream, activeTesterId, remoteStream }: ParticipantVideoFeedProps) {
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (participant.userId === activeTesterId && mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    } else if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [mediaStream, remoteStream, participant.userId, activeTesterId]);

  if (participant.userId === activeTesterId && mediaStream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100"
      />
    );
  }

  if (remoteStream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
    );
  }

  // Fallback for when camera is ON but stream hasn't arrived yet or no simulation wanted
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-3">
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/25 via-slate-950 to-indigo-950/25 animate-pulse duration-[4s]"></div>
      
      <div className="relative flex items-center justify-center mb-2">
        <div className="absolute w-14 h-14 rounded-full border border-emerald-500/20 animate-ping duration-[3s]"></div>
        <div className="absolute w-16 h-16 rounded-full border border-teal-500/10 animate-pulse"></div>
        <img 
          src={participant.avatar} 
          alt={participant.name} 
          className="relative w-10 h-10 rounded-full border border-emerald-400 filter brightness-105 shadow-lg shadow-emerald-500/10" 
        />
      </div>

      <div className="absolute inset-x-0 bottom-3 text-center z-10 flex flex-col items-center">
        <span className="text-[7px] tracking-wider font-mono text-emerald-400 uppercase font-black bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
          Conectando...
        </span>
      </div>
    </div>
  );
}

interface SpotlightVideoFeedProps {
  spotlightUser: ClassroomParticipant;
  mediaStream: MediaStream | null;
  activeTesterId: string;
  remoteStream?: MediaStream | null;
}

export function SpotlightVideoFeed({ spotlightUser, mediaStream, activeTesterId, remoteStream }: SpotlightVideoFeedProps) {
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (spotlightUser.userId === activeTesterId && mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    } else if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [mediaStream, remoteStream, spotlightUser.userId, activeTesterId]);

  if (spotlightUser.userId === activeTesterId && mediaStream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100"
      />
    );
  }

  if (remoteStream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
    );
  }

  // Fallback placeholder when real steam is missing
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/10 via-slate-950 to-indigo-950/10 animate-pulse duration-[5s]"></div>
      
      <div className="relative flex items-center justify-center mb-4">
        <div className="absolute w-32 h-32 rounded-full border border-emerald-500/20 animate-ping duration-[4s]"></div>
        <div className="absolute w-40 h-40 rounded-full border border-teal-500/10 animate-pulse"></div>
        <img 
          src={spotlightUser.avatar} 
          alt={spotlightUser.name} 
          className="relative w-24 h-24 rounded-full border-4 border-emerald-400 filter brightness-105 shadow-2xl shadow-emerald-500/15" 
        />
      </div>

      <span className="text-[10px] tracking-widest font-mono text-emerald-400 uppercase font-bold bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Conectando Transmissão... • {spotlightUser.name}
      </span>
    </div>
  );
}

interface ScreenShareVideoFeedProps {
  stream: MediaStream;
}

export function ScreenShareVideoFeed({ stream }: ScreenShareVideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    console.log('[ScreenShareVideoFeed] stream changed:', stream ? `tracks: ${stream.getTracks().length}` : 'null');
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn('[ScreenShareVideoFeed] autoplay blocked or error playing stream, retrying muted...', err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(e => console.error('[ScreenShareVideoFeed] final play failed', e));
        }
      });
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain bg-slate-950"
    />
  );
}

const getCanvaEmbedUrl = (url: string) => {
  if (!url) return '';
  // Convert standard Canva design/presentation link to its embed equivalent
  // Example: https://www.canva.com/design/DAF8E3zG5oM/view?utm_content=...
  // Should become: https://www.canva.com/design/DAF8E3zG5oM/view?embed
  if (url.includes('/view')) {
    const base = url.split('/view')[0];
    return `${base}/view?embed`;
  }
  return url;
};

export function Classroom({ currentUserId, currentUserName, currentUserRole, myRegistrations = [] }: ClassroomProps) {
  // Sync state key
  const STATE_KEY = 'savanaxp_classroom_sync_v1';

  // Create or load session from sessionStorage
  const loadInitialSession = (): ClassroomSession => {
    const data = sessionStorage.getItem(STATE_KEY);
    let parsed: ClassroomSession | null = null;
    if (data) {
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        console.warn("Classroom session restore failed. Seeding default.", e);
      }
    }
    const baseSession = parsed || {
      classTitle: 'Técnicas de Anestesia e Analgesia em Psitacídeos',
      classDescription: 'Módulo Prático Remoto - Protocolos integrados, monitorização multiparamétrica e reversão anestésica segura.',
      isRecording: false,
      chatMuted: false,
      allowStudentCam: true,
      recordingStartTime: null,
      activeSpotlightId: 'prof-lucas',
      whiteboardActive: false,
      participants: DEFAULT_PARTICIPANTS,
      messages: INITIAL_MESSAGES,
      whiteboardData: null,
      screenShareActive: false,
      screenShareUserId: null,
      screenShareSlideIndex: 0
    };

    // Protect against duplicate participants upon loading
    if (baseSession.participants) {
      const uniqueParticipantsMap = new Map();
      baseSession.participants.forEach(p => {
        if (p && p.userId) {
          uniqueParticipantsMap.set(p.userId, p);
        }
      });
      baseSession.participants = Array.from(uniqueParticipantsMap.values());
    }
    return baseSession;
  };

  const [session, setSession] = useState<ClassroomSession>(loadInitialSession);

  // Synchronized classroom databases
  const [courses, setCourses] = useState(() => localDB.getCourses());
  const [modules, setModules] = useState(() => localDB.getModules());
  const [turmas, setTurmas] = useState(() => localDB.getTurmas());

  // Lobby management states
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [selectedModuleForRoom, setSelectedModuleForRoom] = useState<any | null>(null);
  const [localSpotlightId, setLocalSpotlightId] = useState<string | null>(null);
  const [showTerminateLiveConfirm, setShowTerminateLiveConfirm] = useState(false);

  // Synchronize dynamic databases in real-time
  useEffect(() => {
    const unsubCourses = localDB.onChange('courses', () => setCourses(localDB.getCourses()));
    const unsubModules = localDB.onChange('modules', () => setModules(localDB.getModules()));
    const unsubTurmas = localDB.onChange('turmas', () => setTurmas(localDB.getTurmas()));
    return () => {
      unsubCourses();
      unsubModules();
      unsubTurmas();
    };
  }, []);

  // Synchronic helper for direct redirect from the curriculum sidebar
  useEffect(() => {
    const autoJoinData = sessionStorage.getItem('savanaxp_classroom_auto_join');
    if (autoJoinData) {
      try {
        const { moduleId, roomId } = JSON.parse(autoJoinData);
        sessionStorage.removeItem('savanaxp_classroom_auto_join');
        
        const mod = modules.find(m => m.id === moduleId);
        if (mod) {
          setSelectedModuleForRoom(mod);
          setActiveRoomId(roomId);
          triggerToast(`Acessando canal seguro de transmissão: ${mod.title}`);
        }
      } catch (e) {
        console.warn("Failed auto-joining live room:", e);
      }
    }
  }, [modules]);

  // Monitor if the active room is closed by another teacher or moderator
  useEffect(() => {
    if (!activeRoomId || !selectedModuleForRoom) return;

    const unsubModulesCheck = localDB.onChange('modules', () => {
      const currentModules = localDB.getModules();
      const currentMod = currentModules.find(m => m.id === selectedModuleForRoom.id);
      
      if (currentMod && !currentMod.isLive) {
        setActiveRoomId(null);
        setSelectedModuleForRoom(null);
        alert("A transmissão síncrona foi encerrada pelo professor docente principal.");
      }
    });

    return () => unsubModulesCheck();
  }, [activeRoomId, selectedModuleForRoom]);

  // Adjust active room session on component load/change with Realtime Firestore sync
  useEffect(() => {
    if (!activeRoomId) return;

    const docRef = doc(db, 'classroomSessions', activeRoomId);
    let isMounted = true;

    const initSync = async () => {
      try {
        const snap = await getDoc(docRef);
        let currentSession: ClassroomSession;

        if (snap.exists()) {
          currentSession = snap.data() as ClassroomSession;
        } else {
          const titleOverride = selectedModuleForRoom?.title || 'Aula Ao Vivo';
          const descOverride = selectedModuleForRoom?.description || 'Módulo Prático Síncrono';
          
          currentSession = {
            classTitle: titleOverride,
            classDescription: descOverride,
            isRecording: false,
            chatMuted: false,
            allowStudentCam: true,
            recordingStartTime: null,
            activeSpotlightId: currentUserId,
            whiteboardActive: false,
            participants: [
              {
                userId: currentUserId,
                name: currentUserName,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                role: currentUserRole,
                micOn: currentUserRole === 'instructor',
                camOn: currentUserRole === 'instructor',
                handRaised: false,
                speakingAllowed: currentUserRole === 'instructor'
              }
            ],
            messages: [
              {
                id: 'msg-welcome',
                senderId: 'system',
                senderName: 'Savana Bot',
                senderRole: 'instructor',
                message: `Bem-vindos à transmissão da aula: ${titleOverride}! Por favor, fiquem à vontade para interagir no chat.`,
                createdAt: new Date().toISOString()
              }
            ],
            whiteboardData: null,
            screenShareActive: false,
            screenShareUserId: null,
            screenShareSlideIndex: 0
          };
        }

        // Ensure current user is in participants list
        if (!currentSession.participants.some(p => p.userId === currentUserId)) {
          currentSession.participants.push({
            userId: currentUserId,
            name: currentUserName,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            role: currentUserRole,
            micOn: false,
            camOn: false,
            handRaised: false,
            speakingAllowed: currentUserRole === 'instructor'
          });
        }

        if (isMounted) {
          setSession(currentSession);
          sessionStorage.setItem(`savanaxp_classroom_sync_room_${activeRoomId}`, JSON.stringify(currentSession));
        }

        // Save back to Firestore so others can see us
        await setDoc(docRef, cleanUndefined(currentSession));
      } catch (err) {
        console.error("Erro ao inicializar sessão do Firestore:", err);
      }
    };

    initSync();

    // Sincronização em tempo real via Firestore onSnapshot
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (!isMounted) return;
      if (snapshot.exists()) {
        const data = snapshot.data() as ClassroomSession;
        
        // Se de alguma forma fomos removidos ou entramos recentemente e não estamos cadastrados no doc, enviamos um update
        if (!data.participants.some(p => p.userId === currentUserId)) {
          const updatedParticipants = [...data.participants, {
            userId: currentUserId,
            name: currentUserName,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            role: currentUserRole,
            micOn: false,
            camOn: false,
            handRaised: false,
            speakingAllowed: currentUserRole === 'instructor'
          }];
          setDoc(docRef, cleanUndefined({ ...data, participants: updatedParticipants })).catch(err => {
            console.warn("Erro silencioso ao ingressar participante:", err);
          });
        } else {
          setSession(data);
          sessionStorage.setItem(`savanaxp_classroom_sync_room_${activeRoomId}`, JSON.stringify(data));
        }
      }
    }, (err) => {
      console.error("Erro onSnapshot do Firestore para a sala:", err);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [activeRoomId, selectedModuleForRoom, currentUserId, currentUserName, currentUserRole]);

  const handleTerminateLiveRoom = async () => {
    if (!selectedModuleForRoom) return;
    setShowTerminateLiveConfirm(true);
  };

  const handleTerminateLiveRoomConfirm = async () => {
    if (!selectedModuleForRoom) return;

    // Auto-complete this live module's lesson for all present students in the room
    const presentStudents = session?.participants?.filter(p => p.role === 'student') || [];
    const liveSessionLessonId = `live-session-${selectedModuleForRoom.id}`;

    for (const student of presentStudents) {
      try {
        await localDB.completeLessonForUser(
          student.userId,
          selectedModuleForRoom.courseId,
          liveSessionLessonId,
          200 // 200 XP reward for attending the live class
        );
        console.log(`Auto-completed live lesson ${liveSessionLessonId} for student ${student.userId}`);
      } catch (err) {
        console.warn(`Failed to auto-complete live lesson for student ${student.userId}:`, err);
      }
    }

    const updatedModule = {
      ...selectedModuleForRoom,
      isLive: false,
      isLiveClass: true,
      liveRoomId: undefined,
      liveTeacherId: undefined
    };
    await localDB.saveModule(updatedModule);
    
    setActiveRoomId(null);
    setSelectedModuleForRoom(null);
    setLocalSpotlightId(null);
    setShowTerminateLiveConfirm(false);
    triggerToast("Aula ao vivo finalizada e presença de todos os alunos registrada!");
  };

  const handleLeaveRoom = async () => {
    if (activeRoomId) {
      try {
        const docRef = doc(db, 'classroomSessions', activeRoomId);
        const updatedParticipants = session.participants.filter(p => p.userId !== currentUserId);
        await setDoc(docRef, cleanUndefined({ ...session, participants: updatedParticipants }));
      } catch (err) {
        console.warn("Erro ao retirar participante ao sair:", err);
      }
    }
    setActiveRoomId(null);
    setSelectedModuleForRoom(null);
    setLocalSpotlightId(null);
    triggerToast("Você se desconectou da transmissão síncrona.");
  };
  
  // Simulation / Testing Deck Role override (uses real user by default, allows simulation overrides in debug mode)
  const [activeTesterId, setActiveTesterId] = useState<string>(() => {
    const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
    return isDebug ? 'prof-lucas' : currentUserId;
  });

  // Dynamically append the real signed-in user into classroom participant pool if missing, keeping list unique
  useEffect(() => {
    if (!session.participants) return;
    const hasUser = session.participants.some(p => p.userId === currentUserId);
    if (!hasUser) {
      const realUser: ClassroomParticipant = {
        userId: currentUserId,
        name: currentUserName,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: currentUserRole,
        micOn: false,
        camOn: false,
        handRaised: false,
        speakingAllowed: currentUserRole === 'instructor'
      };
      setSession(prev => {
        // Double-check inside state update block to prevent asynchronous batching duplicates
        if (prev.participants.some(p => p.userId === currentUserId)) {
          const uniqueMap = new Map();
          prev.participants.forEach(p => uniqueMap.set(p.userId, p));
          return {
            ...prev,
            participants: Array.from(uniqueMap.values())
          };
        }
        const updatedList = [...prev.participants, realUser];
        const uniqueMap = new Map();
        updatedList.forEach(p => uniqueMap.set(p.userId, p));
        return {
          ...prev,
          participants: Array.from(uniqueMap.values())
        };
      });
    } else {
      // Even if user list has user, check if we accidentally have duplicate records saved or batched
      const uniqueMap = new Map();
      let hasDuplicates = false;
      session.participants.forEach(p => {
        if (uniqueMap.has(p.userId)) {
          hasDuplicates = true;
        } else {
          uniqueMap.set(p.userId, p);
        }
      });
      if (hasDuplicates) {
        setSession(prev => {
          const innerUnique = new Map();
          prev.participants.forEach(p => innerUnique.set(p.userId, p));
          return {
            ...prev,
            participants: Array.from(innerUnique.values())
          };
        });
      }
    }
  }, [currentUserId, currentUserName, currentUserRole, session.participants]);

  const currentTestUser = session.participants.find(p => p.userId === activeTesterId) || {
    userId: currentUserId,
    name: currentUserName,
    role: currentUserRole,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    micOn: false,
    camOn: false,
    handRaised: false,
    speakingAllowed: currentUserRole === 'instructor'
  };

  const isTesterInstructor = currentTestUser.role === 'instructor';

  // UI state
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'settings'>('chat');
  const [showToast, setShowToast] = useState<string | null>(null);

  // Drawing whiteboard ref state
  const [brushColor, setBrushColor] = useState('#10b981');
  const [brushWidth, setBrushWidth] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPointerSyncRef = useRef<number>(0);

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // PeerJS WebRTC States for real multiplayer classroom
  const [myPeer, setMyPeer] = useState<Peer | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);

  // Keep ref up to date to answer calls with the latest media Stream
  useEffect(() => {
    mediaStreamRef.current = mediaStream;
  }, [mediaStream]);

  useEffect(() => {
    if (!activeRoomId || !activeTesterId) return;

    // We prefix peer ID to avoid public peerjs server clashes
    const peerId = `SAVANA_${activeRoomId}_${activeTesterId}`;
    const peer = new Peer(peerId);

    peer.on('open', (id) => {
      console.log('Peer connected to WebRTC signaling server with ID:', id);
    });

    peer.on('call', (call) => {
      console.log('Receiving WebRTC call from', call.peer);
      
      const isScreenCall = call.peer.startsWith(`SAVANA_SCREEN_${activeRoomId}_`);
      
      // Answer with our media stream if available to establish a stable bidirectional media connection
      call.answer(mediaStreamRef.current || undefined);
      
      call.on('stream', (remoteStream) => {
        if (isScreenCall) {
          console.log('Received screenshare stream via incoming call on main peer');
          setRemoteScreenStream(remoteStream);
        } else {
          // Extract the original user ID from the peer ID string
          const callerId = call.peer.replace(`SAVANA_${activeRoomId}_`, '');
          setRemoteStreams(prev => ({ ...prev, [callerId]: remoteStream }));
        }
      });

      call.on('close', () => {
        if (isScreenCall) {
          setRemoteScreenStream(null);
        } else {
          const callerId = call.peer.replace(`SAVANA_${activeRoomId}_`, '');
          setRemoteStreams(prev => {
            const copy = { ...prev };
            delete copy[callerId];
            return copy;
          });
        }
      });

      call.on('error', () => {
        if (isScreenCall) {
          setRemoteScreenStream(null);
        }
      });
    });

    setMyPeer(peer);

    return () => {
      peer.destroy();
    };
  }, [activeRoomId, activeTesterId]);

  // Call others when my stream or session participants change
  useEffect(() => {
    if (!myPeer || !activeRoomId || !activeTesterId || !session.participants) return;

    session.participants.forEach(p => {
      if (p.userId !== activeTesterId) {
        const remotePeerId = `SAVANA_${activeRoomId}_${p.userId}`;
        // Only call if we don't already have their stream? 
        // PeerJS handles duplicate calls well, but we can do it always 
        // to re-sync if they drop.
        const call = myPeer.call(remotePeerId, mediaStreamRef.current || undefined);
        if (call) {
          call.on('stream', (remoteStream) => {
            setRemoteStreams(prev => ({ ...prev, [p.userId]: remoteStream }));
          });
        }
      }
    });
  }, [myPeer, session.participants, activeRoomId, activeTesterId, mediaStream]);

  // Screen sharing states and streams
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [myScreenPeer, setMyScreenPeer] = useState<Peer | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const virtualScreenTimerRef = useRef<number | null>(null);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // Clean remote screen stream state if screenshare is disabled globally
  useEffect(() => {
    if (!session.screenShareActive) {
      setRemoteScreenStream(null);
    }
  }, [session.screenShareActive]);

  // Screen sharing peer initialization and listener (for screen sharer)
  useEffect(() => {
    if (!screenStream || !activeRoomId || !activeTesterId) {
      if (myScreenPeer) {
        myScreenPeer.destroy();
        setMyScreenPeer(null);
      }
      return;
    }

    const screenPeerId = `SAVANA_SCREEN_${activeRoomId}_${activeTesterId}`;
    console.log('[Screenshare] Registering screenshare peer:', screenPeerId);
    const screenPeer = new Peer(screenPeerId);

    screenPeer.on('open', () => {
      console.log('[Screenshare] Screen sharing Peer connected with ID:', screenPeerId);
    });

    screenPeer.on('call', (call) => {
      console.log('[Screenshare] Received incoming call on screenshare peer from:', call.peer);
      // Answer the incoming call from a participant with our real screenshare media stream
      call.answer(screenStreamRef.current || undefined);
    });

    setMyScreenPeer(screenPeer);

    return () => {
      screenPeer.destroy();
    };
  }, [screenStream, activeRoomId, activeTesterId]);

  // Screen sharer's screenPeer actively calls all other participants to push the screen stream (dual-direction signaling)
  useEffect(() => {
    if (!myScreenPeer || !screenStream || !session.participants) return;

    const activeCalls: any[] = [];

    const callParticipants = () => {
      session.participants.forEach(p => {
        if (p.userId !== activeTesterId) {
          const targetParticipantPeerId = `SAVANA_${activeRoomId}_${p.userId}`;
          console.log('[Screenshare] Screen peer actively calling participant main peer:', targetParticipantPeerId);
          try {
            const call = myScreenPeer.call(targetParticipantPeerId, screenStream);
            if (call) {
              activeCalls.push(call);
              call.on('error', (err) => {
                console.error('[Screenshare] Error calling participant:', p.userId, err);
              });
            }
          } catch (e) {
            console.error('[Screenshare] Exception calling participant:', p.userId, e);
          }
        }
      });
    };

    // Delay slightly to let others' peers open/register
    const timer = setTimeout(callParticipants, 1500);

    return () => {
      clearTimeout(timer);
      activeCalls.forEach(call => {
        try {
          call.close();
        } catch (e) {}
      });
    };
  }, [myScreenPeer, screenStream, session.participants, activeRoomId, activeTesterId]);

  // Participant calls the screenshare peer when screenshare is active and we are not the sharer
  useEffect(() => {
    if (!myPeer || !session.screenShareActive || !session.screenShareUserId || session.screenShareUserId === activeTesterId) {
      setRemoteScreenStream(null);
      return;
    }

    let activeCall: any = null;

    // Delay slightly to let the screenshare peer initialize and register on the other side
    const timer = setTimeout(() => {
      const targetScreenPeerId = `SAVANA_SCREEN_${activeRoomId}_${session.screenShareUserId}`;
      console.log('[Screenshare] Initiating connection call to screenshare peer:', targetScreenPeerId);
      
      // Call with our local stream if available to establish a stable bidirectional media connection
      const call = myPeer.call(targetScreenPeerId, mediaStreamRef.current || undefined as any, {
        constraints: {
          offerToReceiveVideo: true,
          offerToReceiveAudio: false
        } as any
      });
      
      if (call) {
        activeCall = call;
        call.on('stream', (stream) => {
          console.log('[Screenshare] Successfully received remote screenshare stream from call!');
          setRemoteScreenStream(stream);
        });
        
        call.on('close', () => {
          console.log('[Screenshare] Remote screenshare stream connection closed.');
          setRemoteScreenStream(null);
        });

        call.on('error', (err: any) => {
          console.error('[Screenshare] Screenshare call error:', err);
          setRemoteScreenStream(null);
        });
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (activeCall) {
        try {
          activeCall.close();
        } catch (e) {}
      }
    };
  }, [myPeer, session.screenShareActive, session.screenShareUserId, activeRoomId, activeTesterId]);

  const DEFAULT_SLIDES = [
    {
      title: 'Anatomia e Fisiologia de Sacos Aéreos em Psitacídeos',
      subtitle: 'Anatomia de Sacos Aéreos - Anatomia Respi-Aviária',
      content: [
        'Volume Sacal: Ocupa cerca de 10x o volume pulmonar clássico.',
        'Intubação: Anéis traqueais completos nas aves dificultam balonetes insuflados.',
        'Temperatura: Monitoração térmica por sonda esofágica.'
      ],
      visualType: 'anatomy' as const
    },
    {
      title: 'Protocolos de Indução de Isoflurano por Máscara',
      subtitle: 'Indução & Dose - Concentração Alveolar Mínima',
      content: [
        'Pre-oxigenação: 100% O2 a 1.5 L/min por 3 minutos.',
        'Faixa de Indução: 3.0% a 4.0% de Isoflurano gradualmente.',
        'Manutenção Anestésica: 1.5% a 2.5% de acordo com reflexos.'
      ],
      visualType: 'chart' as const
    },
    {
      title: 'Sinais Vitais de Segurança & Reversão Aviária',
      subtitle: 'Monitoramento Crítico - Limites de Alarme de Sobrevida',
      content: [
        'Desligar o Isoflurano mantendo O2 a 100% por 3 minutos.',
        'A recuperação é rápida nas aves pelo seu metabolismo elevado.',
        'Monitoração do batimento por doppler colocado sobre a artéria ulnar profunda.'
      ],
      visualType: 'table' as const
    }
  ];

  const compressAndSyncImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_width = 800;
        const max_height = 600;
        let width = img.width;
        let height = img.height;
        
        if (width > max_width) {
          height *= max_width / width;
          width = max_width;
        }
        if (height > max_height) {
          width *= max_height / height;
          height = max_height;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          
          saveSessionState({
            ...session,
            screenShareSlideIndex: 0,
            uploadedFileName: file.name,
            uploadedFileType: 'image',
            uploadedFileSlides: [
              {
                title: file.name,
                subtitle: 'Slide de Imagem Carregado',
                content: ['Apresentação de arquivo local em tempo real.'],
                visualType: 'custom_image',
                customImage: dataUrl
              }
            ],
            screenShareType: 'file'
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (file: File) => {
    if (file.type.startsWith('image/')) {
      compressAndSyncImage(file);
      triggerToast(`Imagem "${file.name}" carregada com sucesso!`);
    } else {
      const fileName = file.name;
      const nameLower = fileName.toLowerCase();
      let slides: Array<{ title: string; subtitle: string; content: string[]; visualType: 'chart' | 'anatomy' | 'table' | 'bullets' }> = [];
      
      if (nameLower.includes('gato') || nameLower.includes('felin')) {
        slides = [
          {
            title: 'Anestesia Felina: Particularidades Clínicas',
            subtitle: 'Sensibilidade a Fármacos e Cardiomiopatia Hipertrófica (CMH)',
            content: [
              'Metabolismo hepático limitado (glicuronidação lenta de fenois).',
              'Cardiomiopatia Hipertrófica Silenciosa: Risco extremo de sobrecarga hídrica.',
              'Uso cuidadoso de Alfa-2 agonistas (Dexmedetomidina) para evitar bradicardia severa.'
            ],
            visualType: 'anatomy'
          },
          {
            title: 'Controle de Via Aérea e Espasmo Laríngeo',
            subtitle: 'Protocolo de Intubação Sem Trauma em Gatos',
            content: [
              'Aplicação de Lidocaína spray (0.1ml) sobre as aritenoides 30s antes de intubar.',
              'Sondas traqueais sem balonete (tamanho 2.0 a 3.5 mm) para evitar estenose.',
              'Monitoração obrigatória por Capnografia em tempo real (risco de hipoventilação).'
            ],
            visualType: 'chart'
          },
          {
            title: 'Tabela de Doses e Protocolos Combinados',
            subtitle: 'Tranquilização e Sedação Pré-Anestésica (MPA)',
            content: [
              'Alfaxalona (1-2 mg/kg IM) + Butorfanol (0.2 mg/kg IM) para gatos cardiopatas.',
              'Associação Quetamina + Midazolam + Metadona para procedimentos ortopédicos.',
              'Recuperação térmica ativa obrigatória (Gatos perdem calor extremamente rápido).'
            ],
            visualType: 'table'
          }
        ];
      } else if (nameLower.includes('equin') || nameLower.includes('cavalo')) {
        slides = [
          {
            title: 'Anestesia em Grandes Animais: Equinos',
            subtitle: 'Particularidades do Posicionamento e Miopatia de Decúbito',
            content: [
              'Miopatias e Neuropatias por decúbito: Almofadamento espesso obrigatório.',
              'Posicionamento de membros: Membro inferior puxado para frente.',
              'Pressão arterial média (PAM) ideal mantida acima de 70 mmHg para perfusão muscular.'
            ],
            visualType: 'anatomy'
          },
          {
            title: 'Indução e Manutenção com Anestésicos Voláteis',
            subtitle: 'Sistemas com Reinalação de Gases (Valvular)',
            content: [
              'Indução rápida com Quetamina + Diazepam pós-sedação profunda com Xilazina.',
              'Manutenção com Isoflurano ou Sevoflurano em circuito ventilatório assistido.',
              'Infusão Contínua (Lidocaína/Quetamina) para redução da CAM de voláteis.'
            ],
            visualType: 'chart'
          },
          {
            title: 'Monitoramento Cardiorrespiratório',
            subtitle: 'Parâmetros Clínicos e Emergências',
            content: [
              'Frequência cardíaca típica anestesiada: 25 a 45 bpm.',
              'Ventilação controlada por volume (IPPV) para prevenir hipercapnia.',
              'Fase de recuperação assistida em baia acolchoada (risco de fraturas no despertar).'
            ],
            visualType: 'table'
          }
        ];
      } else if (nameLower.includes('rept') || nameLower.includes('serpente') || nameLower.includes('jabuti')) {
        slides = [
          {
            title: 'Anestesia em Répteis e Animais Exóticos',
            subtitle: 'Ectotermia e Dependência Metabólica de Temperatura',
            content: [
              'Metabolismo dependente da temperatura ambiente ideal (zona térmica preferencial).',
              'Shunt intracardíaco (direita-esquerda) que altera a velocidade de anestésicos inalatórios.',
              'Induções muito longas se a temperatura estiver abaixo do ideal.'
            ],
            visualType: 'anatomy'
          },
          {
            title: 'Via Aérea, Ventilação e Intubação',
            subtitle: 'Particularidades Respiratórias de Répteis',
            content: [
              'Glote localizada na base da língua: Intubação extremamente fácil.',
              'Ausência de diafragma: Respiração auxiliada por musculatura intercostal/abdominal.',
              'Estímulo respiratório regulado por hipóxia (baixo O2), não por hipercapnia.'
            ],
            visualType: 'chart'
          },
          {
            title: 'Anestesia Injetável e Recuperação',
            subtitle: 'Fármacos e reversão em répteis',
            content: [
              'Uso de Alfaxalona ou Propofol via veia coccígea ou seio maxilar.',
              'Recuperação extremamente lenta (pode durar até 12-24 horas).',
              'Manter o paciente em aquecimento controlado durante toda a fase de despertar.'
            ],
            visualType: 'table'
          }
        ];
      } else {
        const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        slides = [
          {
            title: `Apresentação: ${cleanName}`,
            subtitle: 'Material carregado via contingência de aula',
            content: [
              `Arquivo: ${fileName}`,
              `Tipo: ${fileName.split('.').pop()?.toUpperCase() || 'Documento'}`,
              'Este material foi compartilhado de forma síncrona pelo Professor para toda a turma.'
            ],
            visualType: 'bullets'
          },
          {
            title: 'Conteúdo Científico Estruturado',
            subtitle: 'Análise de Casos Clínicos Relacionados',
            content: [
              'Análise de parâmetros fisiológicos e condutas anestésicas sugeridas.',
              'Revisão bibliográfica e protocolos de dose recomendados.',
              'Metodologias de triagem e preparo de pacientes críticos em medicina veterinária.'
            ],
            visualType: 'chart'
          },
          {
            title: 'Discussão de Condutas Clínicas',
            subtitle: 'Interação e Perguntas Frequentes',
            content: [
              'Uso de quadros e anotações para discussões específicas em tempo real.',
              'Comparação de eficácia de fármacos e curvas de recuperação anestésica.',
              'Encerramento do módulo prático com feedback dos residentes e mentores.'
            ],
            visualType: 'table'
          }
        ];
      }

      saveSessionState({
        ...session,
        screenShareSlideIndex: 0,
        uploadedFileName: fileName,
        uploadedFileType: fileName.endsWith('.pptx') || fileName.endsWith('.ppt') ? 'ppt' : 'pdf',
        uploadedFileSlides: slides,
        screenShareType: 'file'
      });
      
      triggerToast(`Documento "${fileName}" processado e slides gerados!`);
    }
  };

  const presentImportedMaterial = (lesson: any) => {
    const fileName = lesson.fileName || lesson.title || 'Material de Apoio.pdf';
    const slides = [
      {
        title: lesson.title,
        subtitle: 'Material de Apoio Importado',
        content: [
          lesson.description || 'Este material de apoio foi anexado a este módulo prático para acompanhamento.',
          `Arquivo: ${fileName}`,
          'O material está compartilhado de forma síncrona com toda a turma.'
        ],
        visualType: 'anatomy' as const
      },
      {
        title: 'Visualização do Documento e Download',
        subtitle: 'Acesso Síncrono ao Anexo',
        content: [
          'Clique no botão de visualização direta para abrir o material em outra guia.',
          'Os alunos podem visualizar e fazer download síncrono deste anexo.',
          'Utilize as anotações e rabiscos em tempo real sobre esta tela.'
        ],
        visualType: 'table' as const
      }
    ];

    saveSessionState({
      ...session,
      screenShareSlideIndex: 0,
      uploadedFileName: fileName,
      uploadedFileType: lesson.fileType || 'pdf',
      uploadedFileSlides: slides,
      uploadedFileUrl: lesson.fileUrl || '',
      screenShareType: 'file'
    });

    triggerToast(`Material "${lesson.title}" carregado com sucesso!`);
  };

  const startVirtualPatientMonitorStream = (): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new MediaStream();

    let ecgX = 0;
    let points: number[] = [];
    const maxPoints = 200;
    for (let i = 0; i < maxPoints; i++) points.push(280);

    let hr = 92;
    let spo2 = 98;
    let rr = 16;
    let temp = 38.5;

    let frameCount = 0;

    const animate = () => {
      frameCount++;
      
      // Clear background
      ctx.fillStyle = '#020617'; // slate-950
      ctx.fillRect(0, 0, 1280, 720);

      // Grid background
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)'; // slate-800 with transparency
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < 1280; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 0; y < 720; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }

      // Header Bar
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, 1280, 80);
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.lineTo(1280, 80);
      ctx.stroke();

      // Header Text
      ctx.fillStyle = '#e2e8f0'; // slate-200
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('🏥 SAVANA XP - MONITOR CLÍNICO VIRTUAL (SÍNCRONO)', 40, 48);

      ctx.fillStyle = '#f59e0b'; // amber-500
      ctx.font = 'bold 12px monospace';
      ctx.fillText('🔴 TRANSMISSÃO DE VÍDEO COMPARTILHADO LIVE', 900, 46);

      // Left Column: ECG wave and Anesthesia Parameters
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(40, 120, 800, 320);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(40, 120, 800, 320);

      ctx.fillStyle = '#10b981'; // emerald-500
      ctx.font = 'bold 14px monospace';
      ctx.fillText('ECG - DERIVAÇÃO II (M.V. SELEÇÃO)', 60, 150);

      // Dynamic heartbeat wave calculation
      let targetValue = 280;
      if (frameCount % 45 === 0) {
        hr = 88 + Math.floor(Math.random() * 8);
        spo2 = Math.random() > 0.9 ? 97 : 98;
        rr = 15 + Math.floor(Math.random() * 3);
        temp = +(38.4 + Math.random() * 0.3).toFixed(1);
      }

      const cycle = frameCount % 45;
      if (cycle === 0) targetValue = 280;
      else if (cycle === 1) targetValue = 265;
      else if (cycle === 2) targetValue = 280;
      else if (cycle === 5) targetValue = 290;
      else if (cycle === 6) targetValue = 180;
      else if (cycle === 7) targetValue = 340;
      else if (cycle === 8) targetValue = 280;
      else if (cycle === 12) targetValue = 250;
      else if (cycle === 15) targetValue = 280;

      points.push(targetValue);
      if (points.length > 720) {
        points.shift();
      }

      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      for (let i = 0; i < points.length; i++) {
        const xCoord = 60 + i;
        if (xCoord > 820) break;
        if (i === 0) {
          ctx.moveTo(xCoord, points[i]);
        } else {
          ctx.lineTo(xCoord, points[i]);
        }
      }
      ctx.stroke();

      // Respiratory wave below ECG
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(40, 460, 800, 220);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(40, 460, 800, 220);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('RESP - CAPNOGRAFIA E MONITOR RESPINATÓRIO', 60, 490);

      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < points.length; i++) {
        const xCoord = 60 + i;
        if (xCoord > 820) break;
        const respY = 580 + Math.sin((frameCount + i) * 0.08) * 25 + Math.sin((frameCount + i) * 0.02) * 5;
        if (i === 0) {
          ctx.moveTo(xCoord, respY);
        } else {
          ctx.lineTo(xCoord, respY);
        }
      }
      ctx.stroke();

      // Right Column: Vital signs readouts
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(880, 120, 360, 120);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(880, 120, 360, 120);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('FC / HEART RATE (bpm)', 900, 145);
      ctx.font = 'bold 56px monospace';
      ctx.fillText(hr.toString(), 900, 205);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(880, 260, 360, 120);
      ctx.strokeStyle = '#06b6d4';
      ctx.strokeRect(880, 260, 360, 120);
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('SpO2 (%)', 900, 285);
      ctx.font = 'bold 56px monospace';
      ctx.fillText(`${spo2}%`, 900, 345);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(880, 400, 360, 120);
      ctx.strokeStyle = '#a855f7';
      ctx.strokeRect(880, 400, 360, 120);
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('FR / RESP RATE (rpm)', 900, 425);
      ctx.font = 'bold 56px monospace';
      ctx.fillText(rr.toString(), 900, 485);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(880, 540, 360, 120);
      ctx.strokeStyle = '#3b82f6';
      ctx.strokeRect(880, 540, 360, 120);
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('TEMP / COMP (°C)', 900, 565);
      ctx.font = 'bold 56px monospace';
      ctx.fillText(`${temp}°C`, 900, 625);

      virtualScreenTimerRef.current = requestAnimationFrame(animate);
    };

    animate();

    const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
    return stream || new MediaStream();
  };

  const startRealScreenShare = async () => {
    try {
      setShowShareMenu(false);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false
      });

      setScreenStream(stream);
      screenStreamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        handleStopScreenShareNative();
      };

      saveSessionState({
        ...session,
        screenShareActive: true,
        screenShareUserId: activeTesterId,
        screenShareType: 'video',
        whiteboardActive: false,
        drawOnSlides: false,
        materialZoom: 1,
        pointerActive: false
      });

      triggerToast("Compartilhamento de tela real iniciado!");
    } catch (err: any) {
      console.error("Error starting real screen share:", err);
      if (err.name === 'NotAllowedError') {
        triggerToast("Permissão de compartilhamento negada.");
      } else {
        triggerToast("O iframe impediu o compartilhamento de tela. Abrindo em nova aba você tem acesso total!");
      }
    }
  };

  const startVirtualScreenShare = () => {
    try {
      setShowShareMenu(false);
      const stream = startVirtualPatientMonitorStream();

      setScreenStream(stream);
      screenStreamRef.current = stream;

      saveSessionState({
        ...session,
        screenShareActive: true,
        screenShareUserId: activeTesterId,
        screenShareType: 'video',
        whiteboardActive: false,
        drawOnSlides: false,
        materialZoom: 1,
        pointerActive: false
      });

      triggerToast("Monitor Clínico Virtual ativado e compartilhado com os participantes!");
    } catch (err) {
      console.error("Error starting virtual monitor:", err);
      triggerToast("Erro ao iniciar o simulador.");
    }
  };

  const handleStopScreenShareNative = () => {
    stopScreenShare();
    saveSessionState({
      ...session,
      screenShareActive: false,
      screenShareUserId: null,
      pointerActive: false
    });
    triggerToast("Compartilhamento encerrado.");
  };

  const handleToggleScreenShare = async () => {
    if (session.screenShareActive) {
      handleStopScreenShareNative();
    } else {
      if (!isTesterInstructor) {
        triggerToast("Apenas o professor/moderador pode iniciar o compartilhamento de tela.");
        return;
      }
      setShowShareMenu(prev => !prev);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    if (virtualScreenTimerRef.current) {
      cancelAnimationFrame(virtualScreenTimerRef.current);
      virtualScreenTimerRef.current = null;
    }
  };

  // Screen share unmount cleanup
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (virtualScreenTimerRef.current) {
        cancelAnimationFrame(virtualScreenTimerRef.current);
      }
    };
  }, []);

  // Scroll messages to bottom
  const msgsEndRef = useRef<HTMLDivElement | null>(null);

  // Request both camera and microphone permission on mount so they are granted and ready for active feeds
  useEffect(() => {
    let isMounted = true;
    const requestInitialPermissions = async () => {
      try {
        triggerToast("Solicitando permissão para Câmera e Microfone...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (isMounted) {
          // Immediately release the tracks to avoid leaving camera light or mic active until toggled on
          stream.getTracks().forEach(track => track.stop());
          triggerToast("Permissões de Câmera e Microfone ativadas com sucesso!");
        }
      } catch (err: any) {
        console.warn("Initial permissions request failed or denied:", err);
        if (isMounted) {
          triggerToast("Por favor, garanta que as permissões de Câmera e Microfone estejam liberadas no seu navegador.");
        }
      }
    };
    requestInitialPermissions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Web Audio API Microphone testing state and refs
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 0 to 100
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnimationRef = useRef<number | null>(null);

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      micAudioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      micAnalyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setIsMicTesting(true);
      setMicLevel(0);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Scale and normalize voice level to percentage (maxing out around 120-140)
        let levelPct = Math.min(100, Math.round((average / 110) * 100));
        // Give some extra visual bounce for speech
        if (levelPct > 0 && levelPct < 15) levelPct += 5;
        setMicLevel(levelPct);
        
        micAnimationRef.current = requestAnimationFrame(checkVolume);
      };
      
      micAnimationRef.current = requestAnimationFrame(checkVolume);
      triggerToast("Capturando som do microfone. Fale para ver a agulha/barra verde mexer!");
    } catch (err: any) {
      console.error("Erro ao acessar microfone para teste:", err);
      triggerToast("Erro ao iniciar teste do microfone. Conceda a permissão no navegador.");
    }
  };

  const stopMicTest = () => {
    if (micAnimationRef.current) {
      cancelAnimationFrame(micAnimationRef.current);
      micAnimationRef.current = null;
    }
    if (micAudioContextRef.current) {
      micAudioContextRef.current.close().catch(() => {});
      micAudioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    setIsMicTesting(false);
    setMicLevel(0);
    triggerToast("Teste do microfone finalizado.");
  };

  // Clean up mic test on component unmount
  useEffect(() => {
    return () => {
      if (micAnimationRef.current) {
        cancelAnimationFrame(micAnimationRef.current);
      }
      if (micAudioContextRef.current) {
        micAudioContextRef.current.close().catch(() => {});
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Sync state helper to persist on sessionStorage and Firebase Firestore in Realtime
  const saveSessionState = (updatedSession: ClassroomSession) => {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(updatedSession));
    setSession(updatedSession);

    if (activeRoomId) {
      const docRef = doc(db, 'classroomSessions', activeRoomId);
      setDoc(docRef, cleanUndefined(updatedSession)).catch(err => {
        console.error("Erro ao atualizar sessão do Firestore:", err);
      });
    }
  };

  // Cross-tab Synchronization listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STATE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSession(parsed);
        } catch (err) {
          console.error("Parsed stored session error:", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync whiteboard if state updates remotely and tab isn't drawing
  useEffect(() => {
    if (session.whiteboardActive && canvasRef.current && session.whiteboardData) {
      const img = new Image();
      img.src = session.whiteboardData;
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
        }
      };
    }
  }, [session.whiteboardData, session.whiteboardActive]);

  // Keep track of the active stream via a ref so we can safely stop it during cleanups or role switches without closure staleness
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Handle local webcam loop based on webcam button state for current testing role
  useEffect(() => {
    let isCurrent = true;

    const enableCamera = async () => {
      // Clean up previous stream
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }

      if (currentTestUser.camOn || currentTestUser.micOn) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: currentTestUser.camOn ? { width: 1280, height: 720, facingMode: "user" } : false, 
            audio: currentTestUser.micOn 
          });
          
          if (!isCurrent) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          activeStreamRef.current = stream;
          setMediaStream(stream);
          setPermissionsError(null);
        } catch (err: any) {
          console.warn("Webcam access denied or unavailable. Fallback simulated avatar active", err);
          if (isCurrent) {
            setPermissionsError(err.message || 'Sem acesso à webcam');
            setMediaStream(null);
          }
        }
      } else {
        stopMediaStream();
      }
    };

    enableCamera();
    return () => {
      isCurrent = false;
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
    };
  }, [currentTestUser.camOn, currentTestUser.micOn, activeTesterId]);

  const stopMediaStream = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
  };

  // Trigger Toast Notification Alert
  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast(null);
    }, 4000);
  };

  // Auto scroll messages
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  // Recording Timer simulation
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (session.isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session.isRecording]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Toggle Camera
  const toggleCamera = () => {
    const updatedParticipants = session.participants.map(p => {
      if (p.userId === activeTesterId) {
        if (!p.camOn && !session.allowStudentCam && p.role === 'student') {
          triggerToast("O professor bloqueou o uso de webcam para estudantes.");
          return p;
        }
        return { ...p, camOn: !p.camOn };
      }
      return p;
    });
    saveSessionState({ ...session, participants: updatedParticipants });
  };

  // Toggle Microphone
  const toggleMicrophone = () => {
    const updatedParticipants = session.participants.map(p => {
      if (p.userId === activeTesterId) {
        if (!p.micOn && p.role === 'student' && !p.speakingAllowed) {
          triggerToast("Você não tem permissão para falar de forma aberta. Peça a palavra levantando a mão.");
          return p;
        }
        return { ...p, micOn: !p.micOn };
      }
      return p;
    });
    saveSessionState({ ...session, participants: updatedParticipants });
  };

  // Student Raise Hand Action
  const toggleHandRaise = () => {
    const updatedParticipants = session.participants.map(p => {
      if (p.userId === activeTesterId) {
        const nextState = !p.handRaised;
        if (nextState) {
          // Notify in chat dynamically
          triggerToast("Você levantou a sua mão. O professor foi alertado!");
        }
        return { ...p, handRaised: nextState };
      }
      return p;
    });
    
    // Add auto simulated message or highlight
    saveSessionState({ ...session, participants: updatedParticipants });
  };

  // Send Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (session.chatMuted && !isTesterInstructor) {
      triggerToast("O chat da sala foi silenciado pelo moderador.");
      return;
    }

    const newMsg: ClassroomChatMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentTestUser.userId,
      senderName: currentTestUser.name,
      senderRole: currentTestUser.role,
      message: inputText.trim(),
      createdAt: new Date().toISOString()
    };

    saveSessionState({
      ...session,
      messages: [...session.messages, newMsg]
    });
    setInputText('');
  };

  // DRAWING WHITEBOARD EVENT HANDLERS
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = tool === 'eraser' ? '#0f172a' : brushColor; // matches canvas bg Slate
    ctx.lineWidth = tool === 'eraser' ? 30 : brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawingAndSync = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    syncWhiteboardData();
  };

  const syncWhiteboardData = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const base64Png = canvas.toDataURL('image/png');
    saveSessionState({
      ...session,
      whiteboardData: base64Png
    });
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveSessionState({
        ...session,
        whiteboardData: null
      });
    }
  };

  const handleMouseMoveOnMaterial = (e: React.MouseEvent<HTMLDivElement>) => {
    // Laser pointer is removed per user request
  };

  const handleMouseLeaveMaterial = () => {
    // Laser pointer is removed per user request
  };

  // MODERATOR / PROFESSOR COMMANDS
  const handleLowerAllHands = () => {
    const updated = session.participants.map(p => ({ ...p, handRaised: false }));
    saveSessionState({ ...session, participants: updated });
    triggerToast("Todas as mãos levantadas foram abaixadas.");
  };

  const handleMuteAllStudents = () => {
    const updated = session.participants.map(p => {
      if (p.role === 'student') {
        return { ...p, micOn: false, speakingAllowed: false };
      }
      return p;
    });
    saveSessionState({ ...session, participants: updated });
    triggerToast("Todos os microfones dos alunos foram silenciados.");
  };

  const handleToggleChatMute = () => {
    saveSessionState({ ...session, chatMuted: !session.chatMuted });
    triggerToast(`O chat foi ${!session.chatMuted ? 'Muted' : 'Unmuted'} para alunos.`);
  };

  const handleToggleAllowStudentCamera = () => {
    const state = !session.allowStudentCam;
    const updated = session.participants.map(p => {
      if (p.role === 'student' && !state) {
        return { ...p, camOn: false };
      }
      return p;
    });
    saveSessionState({ ...session, allowStudentCam: state, participants: updated });
    triggerToast(`Câmeras de alunos estão agora ${state ? 'Permitidas' : 'Bloqueadas'}.`);
  };

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const handleToggleRecording = () => {
    const isRec = !session.isRecording;
    
    if (isRec) {
      const streamToRecord = screenStream || mediaStream;
      if (streamToRecord) {
        try {
          // Verify browser support for mimeType, use default if not supported
          let mimeType = 'video/webm;codecs=vp9,opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm'; // Fallback
          }
          
          recordedChunksRef.current = [];
          const recorder = new MediaRecorder(streamToRecord, { mimeType });
          
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          
          recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = url;
            a.download = `gravação_aula_${new Date().getTime()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
          };
          
          recorder.start(1000); // Collect chunks every second
          setMediaRecorder(recorder);
        } catch (err) {
          console.error("Error starting MediaRecorder:", err);
          triggerToast("Erro ao iniciar gravação. Formato de mídia não suportado.");
          return;
        }
      } else {
        triggerToast("Ative a câmera ou compartilhamento de tela para gravar.");
        return;
      }
    } else {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        setMediaRecorder(null);
      }
    }

    saveSessionState({
      ...session,
      isRecording: isRec,
      recordingStartTime: isRec ? new Date().toISOString() : null
    });
    triggerToast(isRec ? "Gravação da aula iniciada com sucesso!" : "Gravação finalizada e arquivo baixado.");
  };

  const handleToggleWhiteboard = () => {
    saveSessionState({ ...session, whiteboardActive: !session.whiteboardActive });
  };

  const handleGrantVoice = (userId: string, allow: boolean) => {
    const updated = session.participants.map(p => {
      if (p.userId === userId) {
        return { 
          ...p, 
          speakingAllowed: allow, 
          micOn: allow ? true : p.micOn,
          handRaised: allow ? false : p.handRaised // lower hand when active
        };
      }
      return p;
    });
    saveSessionState({ ...session, participants: updated });
    
    const pName = session.participants.find(p => p.userId === userId)?.name;
    triggerToast(allow ? `Permissão de áudio concedida para ${pName}.` : `Audiência revogada de ${pName}.`);
  };

  const handleSpotlight = (userId: string) => {
    if (!isTesterInstructor) {
      triggerToast("Apenas o professor pode alterar o destaque principal da aula.");
      return;
    }
    saveSessionState({ ...session, activeSpotlightId: userId });
    triggerToast("Você alterou o destaque principal da transmissão para todos os alunos.");
  };

  const handleClearChatLogs = () => {
    saveSessionState({ ...session, messages: [] });
    triggerToast("O histórico do chat da sala de aula foi limpo.");
  };

  // SIMULATOR PANEL TRIGGERS (Inject interaction immediately)
  const triggerSimulationEvent = (type: 'ana-hand' | 'carla-text' | 'bruno-join') => {
    if (type === 'ana-hand') {
      const updated = session.participants.map(p => {
        if (p.userId === 'student-ana') {
          return { ...p, handRaised: true };
        }
        return p;
      });
      saveSessionState({ ...session, participants: updated });
      triggerToast("Simulador: Ana Souza levantou a mão física por dúvidas!");
    } else if (type === 'carla-text') {
      const messages = [
        "Professor, qual o monitor térmico mais recomendado para calopsitas?",
        "Consigo usar o anestésico isoflurano com máscara adaptada?",
        "Quais as melhores práticas para monitorar a frequência em psitacídeos de pequeno porte?",
        "Entendi perfeita a colocação! Anotando aqui!"
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      const newMsg: ClassroomChatMsg = {
        id: `msg-${Date.now()}`,
        senderId: 'student-carla',
        senderName: 'Carla Pereira (Vet. Exóticos)',
        senderRole: 'student',
        message: randomMsg,
        createdAt: new Date().toISOString()
      };
      saveSessionState({ ...session, messages: [...session.messages, newMsg] });
      triggerToast("Simulador: Carla enviou uma dúvida no chat.");
    } else if (type === 'bruno-join') {
      const updated = session.participants.map(p => {
        if (p.userId === 'student-bruno') {
          return { ...p, camOn: !p.camOn, micOn: !p.micOn };
        }
        return p;
      });
      saveSessionState({ ...session, participants: updated });
      triggerToast("Simulador: Bruno alterou o status da sua câmera/microfone.");
    }
  };

  if (!activeRoomId) {
    const studentCourses = courses.filter(c => (myRegistrations || []).includes(c.id));

    return (
      <div className="w-full max-w-7xl mx-auto space-y-6" id="classroom-lobby-root">
        {/* Toast alert overlays */}
        {showToast && (
          <div className="fixed top-24 right-6 z-50 bg-slate-900 border-2 border-emerald-500 text-white shadow-2xl px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce">
            <Sparkles className="text-emerald-400 w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{showToast}</span>
          </div>
        )}

        {currentUserRole === 'instructor' ? (
          <div className="space-y-6">
            {/* Header Docente */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/50 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl" id="instructor-lobby-header">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-3 mb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-extrabold bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/20">
                  Painel do Docente
                </span>
                <span className="text-xs text-slate-400 font-mono">Real-Time Cloud Integrado</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-100 uppercase tracking-tight">
                Espaço Tecnológico de Transmissão Ao Vivo
              </h1>
              <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                Bem-vindo ao centro multimídia do professor. Aqui você pode visualizar suas turmas ativas, iniciar sessões de vídeo, gerenciar a lousa compartilhada e conduzir interações simultâneas de áudio e tela com seus alunos.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-display font-bold text-slate-200 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                  Suas Turmas e Módulos Ativos de Ensino
                </h2>
                <span className="text-xs font-mono text-slate-500">Conexão Segura Ativa ({turmas.length} turmas)</span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {turmas.map(turma => {
                  const course = courses.find(c => c.id === turma.courseId);
                  const courseModules = modules.filter(m => m.courseId === turma.courseId);

                  return (
                    <div key={turma.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition duration-350 relative overflow-hidden" id={`turma-card-${turma.id}`}>
                      {/* Course reference header */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-850 pb-4 mb-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase bg-indigo-950 text-indigo-400 border border-indigo-900 px-2.5 py-0.5 rounded-md font-bold">
                            TURMA: {turma.name}
                          </span>
                          <h3 className="text-base font-bold text-slate-200 line-clamp-1">{turma.courseTitle}</h3>
                          <p className="text-xs text-slate-500">Início: {turma.startDate} • Docente Responsável: {turma.instructorName}</p>
                        </div>
                      </div>

                      {/* Modules selection under this courses */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-mono uppercase text-slate-400 font-extrabold tracking-wider">Módulos desta Grade Curricular</h4>
                        {courseModules.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Nenhum módulo cadastrado para a grade deste curso.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {courseModules.map(mod => {
                              const isModLive = mod.isLive === true;
                              return (
                                <div key={mod.id} className={`p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-4 ${
                                  isModLive 
                                  ? 'bg-emerald-950/15 border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
                                  : 'bg-slate-950/45 border-slate-850 hover:bg-slate-950 hover:border-slate-800'
                                }`}>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      {isModLive ? (
                                        <span className="flex items-center gap-1.5 text-[9px] uppercase font-mono bg-red-950 text-red-500 border border-red-900 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                          <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
                                          Transmitindo Ao Vivo
                                        </span>
                                      ) : (
                                        <span className="text-[9px] uppercase font-mono bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
                                          Aula Gravada / Lobby Offline
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="text-sm font-semibold text-slate-205 line-clamp-2">{mod.title}</h5>
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-normal">{mod.description}</p>
                                  </div>

                                  <div className="pt-2 border-t border-slate-850/50 flex items-center justify-end">
                                    {isModLive ? (
                                      <button
                                        onClick={async () => {
                                          setSelectedModuleForRoom(mod);
                                          setActiveRoomId(mod.liveRoomId || `room-${mod.id}`);
                                          triggerToast(`Ingressando na transmissão ao vivo ativa: ${mod.title}`);
                                        }}
                                        className="w-full text-center py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] cursor-pointer"
                                      >
                                        <Video className="w-4 h-4" />
                                        <span>Entrar na Sala como Docente</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          const roomId = `room-${mod.id}-${Date.now().toString().slice(-4)}`;
                                          const updated = {
                                            ...mod,
                                            isLive: true,
                                            isLiveClass: true,
                                            liveRoomId: roomId,
                                            liveTeacherId: currentUserId
                                          };
                                          await localDB.saveModule(updated);
                                          setSelectedModuleForRoom(updated);
                                          setActiveRoomId(roomId);
                                          triggerToast(`Sua nova sala de transmissão ao vivo foi iniciada!`);
                                           try {
                                             const parentCourse = courses.find(c => c.id === mod.courseId);
                                             const courseTitle = parentCourse?.title || 'Savana Experience';
                                             sendLiveClassPushAlert({
                                               courseId: mod.courseId,
                                               courseTitle: courseTitle,
                                               moduleTitle: mod.title,
                                               roomId: roomId,
                                               studentIds: []
                                             });
                                           } catch (pushErr) {
                                             console.warn("Falha ao disparar Web Push:", pushErr);
                                           }
                                        }}
                                        className="w-full text-center py-2 bg-indigo-650 hover:bg-indigo-600 border border-indigo-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 hover:scale-[1.02] cursor-pointer"
                                      >
                                        <Play className="w-4 h-4 text-emerald-400" />
                                        <span>Iniciar Aula ao Vivo</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* FOR STUDENTS */
          <div className="space-y-6">
            {/* Header Aluno */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-slate-700/50 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl" id="student-lobby-header">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-3 mb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-extrabold bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/20">
                  Espaço do Aluno
                </span>
                <span className="text-xs text-slate-400 font-mono">Conexão Remota Ativa</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-100 uppercase tracking-tight">
                Salas de Aula e Laboratórios Práticos Ao Vivo
              </h1>
              <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                Bem-vindo ao espaço síncrono. Assista a demonstrações de procedimentos médicos, confira as cirurgias transmitidas por mentores especialistas, participe de lousas interativas e tire dúvidas por vídeo e microfone realistas em tempo real.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-display font-bold text-slate-200 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Cursos em seu Cronograma Educacional
                </h2>
                <span className="text-xs font-mono text-slate-500">Persistência Local e Firestore Ativos</span>
              </div>

              {studentCourses.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
                  <div className="p-3 bg-slate-950 rounded-full w-14 h-14 flex items-center justify-center mx-auto border border-slate-800">
                    <BookOpen className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-305">Você não possui matrículas ativas</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Nenhum curso adquirido ou matriculado foi encontrado em sua conta. Vá até a aba principal <strong>Explorar Cursos</strong>, selecione um material de pós-graduação e complete a inscrição para liberar o cronograma prático!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {studentCourses.map(course => {
                    const courseModules = modules.filter(m => m.courseId === course.id);

                    return (
                      <div key={course.id} className="bg-slate-900 border border-slate-850 rounded-2xl p-5 hover:border-slate-800 transition duration-300 relative overflow-hidden" id={`student-course-${course.id}`}>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-850 pb-4 mb-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase bg-slate-850 text-slate-400 border border-slate-750 px-2.5 py-0.5 rounded font-bold">
                              MATRICULADO
                            </span>
                            <h3 className="text-base font-bold text-slate-200">{course.title}</h3>
                            <p className="text-xs text-slate-500">Ministrante: {course.instructorName}</p>
                          </div>
                        </div>

                        {/* Direct module transmissions */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase text-slate-400 font-extrabold tracking-wider">Aulas Práticas e Transmissões Síncronas</h4>
                          {courseModules.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">Este curso não possui cronograma de aulas síncronas programadas no momento.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {courseModules.map(mod => {
                                const isModLive = mod.isLive === true;
                                const now = new Date();
                                const liveDateObj = mod.liveDate ? new Date(mod.liveDate) : null;
                                const isSameDay = liveDateObj ? (
                                  now.getFullYear() === liveDateObj.getFullYear() &&
                                  now.getMonth() === liveDateObj.getMonth() &&
                                  now.getDate() === liveDateObj.getDate()
                                ) : false;
                                const isAtLeast15MinBefore = liveDateObj ? (
                                  now.getTime() >= liveDateObj.getTime() - (15 * 60 * 1000)
                                ) : false;
                                const canEnterLive = isSameDay && isAtLeast15MinBefore;

                                const openTime = liveDateObj ? new Date(liveDateObj.getTime() - 15 * 60 * 1000) : null;
                                const openTimeStr = openTime ? openTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                                const liveDateStr = liveDateObj ? liveDateObj.toLocaleDateString('pt-BR') : '';
                                const liveTimeStr = liveDateObj ? liveDateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

                                return (
                                  <div key={mod.id} className={`p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-4 ${
                                    isModLive 
                                      ? canEnterLive 
                                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                                        : 'bg-slate-900 border-slate-800'
                                      : 'bg-slate-950/40 border-slate-850'
                                  }`}>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        {isModLive ? (
                                          canEnterLive ? (
                                            <span className="flex items-center gap-1.5 text-[9px] uppercase font-mono bg-red-950 text-red-500 border border-red-900 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                              <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
                                              TRANSMISSÃO AO VIVO ATIVA
                                            </span>
                                          ) : (
                                            <span className="text-[9px] uppercase font-mono bg-slate-900 text-amber-500 border border-slate-800 px-2 py-0.5 rounded-full font-bold">
                                              📅 AGENDADO: {liveDateStr} {liveTimeStr}
                                            </span>
                                          )
                                        ) : (
                                          <span className="text-[9px] uppercase font-mono bg-slate-900 text-slate-500 border border-slate-850 px-2 py-0.5 rounded-full">
                                            Indisponível / Aguardando Diretor
                                          </span>
                                        )}
                                      </div>
                                      <h5 className="text-sm font-semibold text-slate-200 line-clamp-2">{mod.title}</h5>
                                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{mod.description}</p>
                                    </div>

                                    <div className="pt-2 border-t border-slate-850/30 flex items-center justify-end">
                                      {isModLive ? (
                                        canEnterLive ? (
                                          <button
                                            onClick={() => {
                                              setSelectedModuleForRoom(mod);
                                              setActiveRoomId(mod.liveRoomId || `room-${mod.id}`);
                                              triggerToast(`Acessando canal seguro de transmissão: ${mod.title}`);
                                            }}
                                            className="w-full text-center py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] cursor-pointer"
                                          >
                                            <Video className="w-4 h-4" />
                                            <span>Ingressar na Sala ao Vivo</span>
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              if (!isSameDay) {
                                                alert(`A sala virtual está agendada para o dia ${liveDateStr} às ${liveTimeStr}.\nO acesso é liberado apenas no dia da aula, a partir de 15 minutos antes (às ${openTimeStr}).`);
                                              } else {
                                                alert(`A aula será hoje às ${liveTimeStr}.\nO acesso estará disponível a partir das ${openTimeStr} (15 minutos de antecedência).`);
                                              }
                                            }}
                                            className="w-full text-center py-2.5 bg-slate-800 hover:bg-slate-755 border border-slate-700 text-slate-400 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                          >
                                            <Lock className="w-3.5 h-3.5 text-rose-500" />
                                            <span>Acesso em {liveDateStr} às {openTimeStr}</span>
                                          </button>
                                        )
                                      ) : (
                                        <div className="w-full px-2 py-2 text-center text-[10px] text-slate-500 bg-slate-900/50 border border-slate-850/50 rounded-md font-medium">
                                          Nenhuma transmissão ativa. O professor precisa iniciar a aula.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4" id="classroom-main-root">
      
      {/* Toast alert overlays */}
      {showToast && (
        <div className="fixed top-24 right-6 z-50 bg-slate-900 border-2 border-emerald-500 text-white shadow-2xl px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce">
          <Sparkles className="text-emerald-400 w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{showToast}</span>
        </div>
      )}

      {/* Web Audio API Microphone testing modal overlay */}
      {isMicTesting && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in" id="audio-test-modal-overlay">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 relative">
            <button 
              onClick={stopMicTest} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              id="close-mic-test-modal"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <Volume2 className="w-5 h-5 animate-pulse" />
                <h4 className="text-base font-display font-bold">Teste do seu Microfone</h4>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Fale próximo ao seu aparelho ou dê batidinhas leves para ver a oscilação de volume abaixo:
              </p>
            </div>

            {/* Level indicator meter */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>INTENSIDADE DE CAPTAÇÃO</span>
                <span className={micLevel > 0 ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  {micLevel}%
                </span>
              </div>
              
              <div className="h-5 w-full bg-slate-850 rounded-full overflow-hidden p-0.5 flex">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 rounded-full transition-all duration-[50ms]"
                  style={{ width: `${Math.max(3, micLevel)}%` }}
                ></div>
              </div>

              {/* Real-time description messages */}
              <div className="flex justify-center text-[10px] h-4">
                {micLevel === 0 ? (
                  <span className="text-slate-550 animate-pulse">
                    Fale algo... aguardando nível de entrada
                  </span>
                ) : micLevel > 40 ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    🟢 Excelente captação! Hardware funcional.
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    🟡 Captando áudio de baixo ganho ou som ambiente.
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={stopMicTest}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Concluir Teste de Áudio
            </button>
          </div>
        </div>
      )}

      {/* 1. SANDBOX TESTING DECK */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug') && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-2xl p-4 shadow-xl" id="sandbox-testing-deck">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <h3 className="text-sm font-display font-semibold text-emerald-400 uppercase tracking-widest">
                  Módulo Integrado de Simulação e Testes
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Simule a experiência de múltiplos usuários no mesmo navegador! Troque seu papel abaixo para experimentar tanto o ponto de vista do Professor quanto de Alunos, ou injete eventos simulados.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Ver como:</span>
              {session.participants.map(p => (
                <button
                  key={p.userId}
                  onClick={() => {
                    setActiveTesterId(p.userId);
                    triggerToast(`Você mudou de perspectiva e agora está controlando: ${p.name}`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                    activeTesterId === p.userId 
                    ? 'bg-emerald-500 text-slate-950 font-bold scale-105 shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-650'
                  }`}
                  id={`btn-tester-${p.userId}`}
                >
                  {p.role === 'instructor' ? '👨‍🏫' : '🎓'} {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Simulator injection keys */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-550 flex items-center gap-1 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Injetores de Eventos:
            </span>
            <button
              onClick={() => triggerSimulationEvent('ana-hand')}
              className="text-xs bg-indigo-950/45 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-805 px-2.5 py-1 rounded"
              id="inject-ana-hand"
            >
              ✋ Forçar Ana a levantar mão
            </button>
            <button
              onClick={() => triggerSimulationEvent('carla-text')}
              className="text-xs bg-indigo-950/45 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-805 px-2.5 py-1 rounded"
              id="inject-carla-chat"
            >
              💬 Forçar Carla a enviar dúvida
            </button>
            <button
              onClick={() => triggerSimulationEvent('bruno-join')}
              className="text-xs bg-indigo-950/45 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-805 px-2.5 py-1 rounded"
              id="inject-bruno-cam"
            >
              📹 Alternar Câmera de Bruno
            </button>
          </div>
        </div>
      )}

      {/* CLASS HEADER INFO PANEL */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" id="class-header-panel">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
              Sessão Síncrona Ao Vivo
            </span>
            {session.isRecording && (
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                <span className="h-1.5 w-1.5 bg-slate-950 rounded-full"></span>
                Gravando ({formatTime(recordingSeconds)})
              </span>
            )}
          </div>
          <h2 className="text-xl font-display font-bold text-slate-100 tracking-tight">
            {session.classTitle}
          </h2>
          <p className="text-xs text-slate-400">
            {session.classDescription}
          </p>
        </div>

        {/* Action badges */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="bg-slate-800 border border-slate-750 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-200">{session.participants.length} Presentes</span>
          </div>
          {session.participants.some(p => p.handRaised) && (
            <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2 animate-pulse">
              <Hand className="w-4 h-4" />
              <span className="text-xs font-display font-medium">Mãos Levantadas</span>
            </div>
          )}
        </div>
      </div>

      {/* CLASSROOM INTERACTIVE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" id="classroom-layout-grid">
        
        {/* LEFT / CENTER: STREAM FEED MODULE (takes 3 execution columns) */}
        <div className="lg:col-span-3 space-y-4 flex flex-col">
          
          {/* STAGE CONTAINER (Spotlight or Whiteboard) */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl aspect-video overflow-hidden shadow-2xl flex flex-col items-center justify-center" id="main-stage-viewport">
            
            {session.whiteboardActive ? (
              /* WHITEBOARD STAGE */
              <div className="absolute inset-0 flex flex-col bg-slate-900" id="whiteboard-stage">
                <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold font-display text-slate-200">Lousa Digital Compartilhada</span>
                  </div>
                  
                  {/* Drawing toolbar - visible to user if moderator/instructor or if authorized */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTool('pen')}
                      className={`p-1.5 rounded transition ${tool === 'pen' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-850 hover:bg-slate-800 text-slate-300'}`}
                      title="Caneta"
                    >
                      <PenTool className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTool('eraser')}
                      className={`p-1.5 rounded transition ${tool === 'eraser' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-850 hover:bg-slate-800 text-slate-300'}`}
                      title="Borracha"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                    <div className="h-6 w-[1px] bg-slate-800"></div>
                    {/* Brush Colors */}
                    {['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ffffff'].map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          setBrushColor(c);
                          setTool('pen');
                        }}
                        style={{ backgroundColor: c }}
                        className={`h-4 w-4 rounded-full border transition ${brushColor === c && tool === 'pen' ? 'scale-125 border-white ring-1 ring-emerald-500' : 'border-slate-800'}`}
                      ></button>
                    ))}
                    <div className="h-6 w-[1px] bg-slate-800 font-mono text-[10px]"></div>
                    {/* Size controls */}
                    <input
                      type="range"
                      min="2"
                      max="15"
                      value={brushWidth}
                      onChange={(e) => setBrushWidth(Number(e.target.value))}
                      className="w-16 h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                      title="Espessura do pincel"
                    />

                    {isTesterInstructor && (
                      <>
                        <div className="h-6 w-[1px] bg-slate-800"></div>
                        <button
                          onClick={clearWhiteboard}
                          className="px-2 py-1 bg-red-650 hover:bg-red-600 text-white rounded text-[10px] uppercase font-display font-medium flex items-center gap-1 cursor-pointer"
                          title="Limpar quadro"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Limpar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Draw Canvas */}
                <div className="relative flex-1 bg-slate-900 overflow-hidden cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={450}
                    className="w-full h-full block"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawingAndSync}
                    onMouseLeave={stopDrawingAndSync}
                  />
                  {!isTesterInstructor && (
                    <div className="absolute top-2 left-2 bg-slate-950/70 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded backdrop-blur">
                      Vizualizando lousa em tempo real (Somente leitura para estudantes)
                    </div>
                  )}
                </div>
              </div>
            ) : session.screenShareActive ? (
              /* INTERACTIVE MATERIAL SHARING STAGE */
              <div className="absolute inset-0 flex flex-col bg-slate-950 animate-fade-in" id="material-sharing-stage">
                {/* Header bar */}
                <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between z-10 w-full gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-xs font-bold font-display text-slate-200 uppercase tracking-wide">
                      {session.screenShareUserId === activeTesterId 
                        ? '📺 VOCÊ ESTÁ COMPARTILHANDO A TELA' 
                        : `📺 TELA COMPARTILHADA POR ${session.participants.find(p => p.userId === session.screenShareUserId)?.name || 'Professor'}`}
                    </span>
                  </div>
                </div>
                
                {/* Content body */}
                <div className="relative flex-1 flex flex-col items-center overflow-hidden bg-slate-950 w-full p-3 justify-start">
                  
                  {/* Instructor Controls Panel */}
                  {isTesterInstructor && (
                    <div className="mb-3 w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 z-25 text-left animate-fade-in">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono text-amber-500 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                            📶 LIVE STREAM ACTIVE
                          </span>
                          <span className="text-xs font-bold text-slate-200">Painel de Controle de Transmissão</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Zoom buttons */}
                          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1.5">
                            <button
                              onClick={() => {
                                const currentZoom = session.materialZoom || 1;
                                const nextZoom = Math.max(0.6, currentZoom - 0.1);
                                saveSessionState({ ...session, materialZoom: Number(nextZoom.toFixed(1)) });
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition"
                              title="Afastar Zoom"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono text-slate-300 min-w-[36px] text-center">
                              Zoom {Math.round((session.materialZoom || 1) * 100)}%
                            </span>
                            <button
                              onClick={() => {
                                const currentZoom = session.materialZoom || 1;
                                const nextZoom = Math.min(2.0, currentZoom + 0.1);
                                saveSessionState({ ...session, materialZoom: Number(nextZoom.toFixed(1)) });
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 transition"
                              title="Aproximar Zoom"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Draw Toggle button */}
                          <button
                            onClick={() => {
                              const active = !session.drawOnSlides;
                              saveSessionState({
                                ...session,
                                drawOnSlides: active,
                                whiteboardData: active ? session.whiteboardData : null
                              });
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition ${session.drawOnSlides ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>{session.drawOnSlides ? 'Desativar Rabisco' : '✍️ Rabiscar Tela'}</span>
                          </button>

                          {session.drawOnSlides && (
                            <button
                              onClick={clearWhiteboard}
                              className="px-2.5 py-1.5 bg-red-650 hover:bg-red-600 text-white rounded-lg text-xs border border-red-700 transition"
                              title="Limpar rabiscos"
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/60">
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Origem ativa: <span className="text-slate-200 font-semibold">Vídeo Síncrono de Alta Qualidade (WebRTC)</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowShareMenu(true)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] rounded-lg border border-slate-700 transition"
                          >
                            🔄 Mudar Origem de Vídeo
                          </button>
                          <button
                            onClick={handleStopScreenShareNative}
                            className="px-3 py-1 bg-red-650/20 hover:bg-red-650 text-red-400 hover:text-white text-[11px] rounded-lg border border-red-500/30 transition"
                          >
                            Parar Transmissão
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MAIN MATERIAL STAGE DISPLAY WINDOW */}
                  <div className="w-full h-full max-w-4xl mx-auto flex flex-col justify-between" id="material-display-container">
                    
                    {/* View Stage Wrapper with mouse laser pointer tracking */}
                    <div 
                      className="relative w-full aspect-[16/10] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-2xl overflow-hidden min-h-[380px]"
                      onMouseMove={handleMouseMoveOnMaterial}
                      onMouseLeave={handleMouseLeaveMaterial}
                    >
                      {/* Scale zoom applied wrapper container */}
                      <div 
                        className="absolute inset-0 transition-all duration-300 ease-out flex flex-col justify-between"
                        style={{
                          transform: `scale(${session.materialZoom || 1})`,
                          transformOrigin: 'center'
                        }}
                      >
                        {/* OS Sim Topbar header of the material */}
                        <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 font-sans select-none z-10 w-full">
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-amber-400 flex items-center gap-1">
                              <Tv className="w-3.5 h-3.5 text-amber-400" /> TELA COMPARTILHADA SÍNCRONA
                            </span>
                            <span className="opacity-70 font-mono text-slate-300 truncate max-w-[200px]">
                              {session.screenShareUserId === activeTesterId ? 'Sua Tela / Janela' : 'Tela do Professor'}
                            </span>
                            <span className="text-amber-400 font-mono text-[9px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded animate-pulse">
                              TRANSMISSÃO LIVE
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 font-mono text-[10px]">
                            {session.drawOnSlides && (
                              <span className="text-emerald-400 font-bold animate-pulse">✍️ DESENHO ATIVO</span>
                            )}
                            <span>📶 100%</span>
                            <span className="text-slate-300">19:30</span>
                          </div>
                        </div>

                        {/* Interactive Whiteboard/Drawing Canvas Overlay */}
                        {session.drawOnSlides && isTesterInstructor ? (
                          <canvas
                            ref={canvasRef}
                            width={800}
                            height={450}
                            className="absolute inset-0 w-full h-full block z-20 cursor-crosshair"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawingAndSync}
                            onMouseLeave={stopDrawingAndSync}
                          />
                        ) : (
                          session.drawOnSlides && session.whiteboardData && (
                            <img
                              src={session.whiteboardData}
                              alt="Whiteboard annotations"
                              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
                            />
                          )
                        )}



                        {/* Central Presentation Frame */}
                        <div className="flex-1 flex flex-col justify-center relative bg-slate-950/20 w-full h-full overflow-hidden">
                          {session.screenShareUserId === activeTesterId ? (
                            screenStream ? (
                              <VideoPlayer stream={screenStream} muted={true} />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center animate-fade-in z-25">
                                <AlertCircle className="w-12 h-12 text-amber-500 mb-4 animate-pulse" />
                                <h3 className="text-sm font-bold text-slate-100">Compartilhamento de Tela Ativado</h3>
                                <p className="text-[11px] text-slate-400 max-w-sm mt-1 mb-4">
                                  Nenhum fluxo de vídeo ativo. Reinicie o compartilhamento de tela ou ative o Monitor Clínico Virtual.
                                </p>
                                <button
                                  onClick={() => setShowShareMenu(true)}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase rounded-lg transition"
                                >
                                  Iniciar Compartilhamento
                                </button>
                              </div>
                            )
                          ) : (
                            remoteScreenStream ? (
                              <VideoPlayer stream={remoteScreenStream} muted={false} />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center animate-fade-in z-25">
                                <RefreshCw className="w-12 h-12 text-amber-500 mb-4 animate-spin" />
                                <h3 className="text-sm font-bold text-slate-150 font-display">Conectando ao fluxo de vídeo...</h3>
                                <p className="text-[11px] text-slate-450 max-w-sm mt-1">
                                  Aguardando o sinal de vídeo da tela compartilhada do apresentador via WebRTC.
                                </p>
                                <div className="mt-4 text-[10px] text-slate-550 bg-slate-900 border border-slate-800 p-2.5 rounded-lg max-w-xs text-left leading-normal">
                                  💡 <span className="font-semibold text-slate-300">Dica:</span> Se a conexão falhar devido a restrições de rede ou iframe, o apresentador pode usar o <span className="font-semibold text-amber-400">Monitor Clínico Virtual</span>, que oferece transmissão sincronizada garantida!
                                </div>
                              </div>
                            )
                          )}
                        </div>

                        {/* Footer Information */}
                        <div className="flex items-center justify-between border-t border-slate-800/65 bg-slate-950/40 px-4 py-1.5 text-[10px] text-slate-550 font-mono w-full">
                          <span>SAVANA XP • FLUXO DE VÍDEO WEBRTC SÍNCRONO</span>
                          <span>COMPARTILHAMENTO DE TELA EM ALTA DEFINIÇÃO</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* SPOTLIGHT FEEDS STAGE (renders main active speaker webcam) */
              (() => {
                const targetSpotlightId = isTesterInstructor 
                  ? session.activeSpotlightId 
                  : (localSpotlightId || session.activeSpotlightId);
                const spotlightUser = session.participants.find(p => p.userId === targetSpotlightId) || session.participants[0];
                return (
                  <div className="w-full h-full relative" id="spotlight-stage">
                    {/* Live Stream Render box */}
                    {spotlightUser?.camOn ? (
                      <SpotlightVideoFeed 
                        spotlightUser={spotlightUser}
                        mediaStream={mediaStream}
                        activeTesterId={activeTesterId}
                        remoteStream={remoteStreams[spotlightUser.userId]}
                      />
                    ) : (
                      /* Audio/Camera Off Slate display card */
                      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                          <img 
                            src={spotlightUser.avatar} 
                            alt={spotlightUser.name} 
                            className="w-24 h-24 rounded-full border-4 border-slate-700 filter grayscale" 
                          />
                          <div className="absolute -bottom-1 -right-1 bg-slate-950 p-1.5 rounded-full border border-slate-800">
                            <VideoOff className="w-5 h-5 text-red-400" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-200">{spotlightUser?.name}</p>
                          <p className="text-xs text-slate-500 mt-1">Câmera desligada</p>
                        </div>
                      </div>
                    )}

                    {/* Microphone active indicator widget */}
                    <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-slate-800 text-white text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-2 backdrop-blur-md">
                      {spotlightUser?.micOn ? (
                        <div className="flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                        </div>
                      ) : (
                        <MicOff className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className="font-medium">{spotlightUser?.name}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        {spotlightUser?.role === 'instructor' ? 'Professor' : 'Orador'}
                      </span>
                    </div>

                    {/* Physical Screen Stream / Record overlay identifier */}
                    <div className="absolute top-4 left-4 bg-red-500/80 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-lg">
                      <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                      Destaque Principal
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* LOWER CONTROLS PANEL FOR SELF STREAMING AND ROLE ACTIONS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4" id="classroom-controls-bar">
            
            {/* Control Keys Left: Mic, Cam, Hand toggle */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center gap-1">
                <button
                  onClick={toggleMicrophone}
                  className={`p-3.5 rounded-2xl transition duration-200 flex items-center gap-2 cursor-pointer ${
                    currentTestUser.micOn 
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20' 
                    : 'bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400'
                  }`}
                  id="btn-self-mic"
                  title={currentTestUser.micOn ? 'Mutar Microfone' : 'Ativar Microfone'}
                >
                  {currentTestUser.micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  <span className="text-xs font-semibold uppercase tracking-wider hidden md:inline">
                    {currentTestUser.micOn ? 'Ligado' : 'Mutado'}
                  </span>
                </button>

                <button
                  onClick={startMicTest}
                  className="p-1 px-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-[10px] text-indigo-400 border border-indigo-805 transition flex items-center gap-0.5"
                  title="Testar sensor de volume do microfone"
                  id="btn-test-mic-waveform"
                >
                  <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Testar</span>
                </button>
              </div>

              <button
                onClick={toggleCamera}
                className={`p-3.5 rounded-2xl transition duration-200 flex items-center gap-2 cursor-pointer ${
                  currentTestUser.camOn 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20' 
                  : 'bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400'
                }`}
                id="btn-self-cam"
                title={currentTestUser.camOn ? 'Desligar Câmera' : 'Ligar Câmera'}
              >
                {currentTestUser.camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                <span className="text-xs font-semibold uppercase tracking-wider hidden md:inline">
                  {currentTestUser.camOn ? 'Câmera Ativa' : 'Câmera Desligada'}
                </span>
              </button>

              {currentTestUser.role === 'student' && (
                <button
                  onClick={toggleHandRaise}
                  className={`p-3.5 rounded-2xl transition duration-200 flex items-center gap-2 cursor-pointer ${
                    currentTestUser.handRaised 
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 animate-pulse' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  id="btn-self-hand"
                  title="Levantar Mão para tirar dúvida"
                >
                  <Hand className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase tracking-wider hidden md:inline">
                    {currentTestUser.handRaised ? 'Mão Levantada ✋' : 'Pedir Palavra'}
                  </span>
                </button>
              )}
            </div>

            {/* Middle panel switcher: Whiteboard Toggle & Screen Share */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleWhiteboard}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition duration-200 flex items-center gap-2 cursor-pointer ${
                  session.whiteboardActive
                  ? 'bg-emerald-500 text-slate-950 shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                id="toggle-whiteboard-session"
              >
                <PenTool className="w-4 h-4" />
                <span>{session.whiteboardActive ? 'Fechar Lousa' : 'Lousa Digital'}</span>
              </button>

              <div className="relative">
                <button
                  onClick={handleToggleScreenShare}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition duration-200 flex items-center gap-2 cursor-pointer ${
                    session.screenShareActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  id="btn-toggle-screen-share"
                >
                  <Tv className="w-4 h-4" />
                  <span>{session.screenShareActive ? 'Parar Tela' : 'Compartilhar Tela'}</span>
                </button>

                {showShareMenu && isTesterInstructor && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-2xl z-50 flex flex-col gap-1.5 w-[280px]">
                    <div className="text-[10px] text-slate-500 font-mono font-semibold uppercase px-2 pb-1 border-b border-slate-800/60">
                      Origem do Compartilhamento
                    </div>
                    
                    <button
                      onClick={startRealScreenShare}
                      className="w-full text-left px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 flex items-center gap-2.5 transition"
                    >
                      <Tv className="w-4 h-4 text-amber-500" />
                      <div className="flex flex-col">
                        <span>Compartilhar Tela Real</span>
                        <span className="text-[9px] text-slate-500 font-normal font-sans">Aba, janela ou monitor (Requer HTTPS)</span>
                      </div>
                    </button>

                    <button
                      onClick={startVirtualScreenShare}
                      className="w-full text-left px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 flex items-center gap-2.5 transition"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <div className="flex flex-col">
                        <span>Monitor Clínico (Simulador)</span>
                        <span className="text-[9px] text-slate-500 font-normal font-sans">ECG interativo garantido no iframe</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowShareMenu(false)}
                      className="w-full text-center py-1.5 hover:bg-slate-850 text-slate-500 hover:text-slate-400 text-[10px] font-semibold transition mt-1"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Command keys: Instructor/Professor exclusive Moderation Panel trigger */}
            {isTesterInstructor ? (
              <div className="flex flex-wrap items-center gap-2 border-l border-slate-850 pl-4">
                <button
                  onClick={handleToggleRecording}
                  className={`p-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                    session.isRecording 
                    ? 'bg-red-500 hover:bg-red-650 text-white animate-pulse' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  id="btn-instructor-recording"
                >
                  {session.isRecording ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 text-red-500" />}
                  <span>{session.isRecording ? 'Parar Gravação' : 'Gravar Aula'}</span>
                </button>
                <button
                  onClick={handleTerminateLiveRoom}
                  className="p-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition duration-200 flex items-center gap-1 cursor-pointer"
                  id="btn-terminate-active-classroom"
                >
                  <X className="w-4 h-4 font-black" />
                  <span>Finalizar Aula</span>
                </button>
                <button
                  onClick={handleLeaveRoom}
                  className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white border border-slate-700 text-xs font-semibold uppercase rounded-xl transition cursor-pointer"
                  id="btn-leave-active-teacher"
                >
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 border-l border-slate-850 pl-4">
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Espaço Estudante</p>
                  <p className="text-xs font-medium text-slate-300 mt-0.5">{currentTestUser.name}</p>
                </div>
                <button
                  onClick={handleLeaveRoom}
                  className="px-3.5 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 text-xs font-bold uppercase rounded-xl transition cursor-pointer"
                  id="btn-leave-active-student"
                >
                  <span>Sair da Sala</span>
                </button>
              </div>
            )}
          </div>

          {/* PARTICIPANTS WEBCAMS CAROUSEL ROWS */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3" id="participants-webcam-panel">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-display font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                Webcams de Alunos & Mestres ({session.participants.length})
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {isTesterInstructor 
                  ? "Clique no feed de um usuário para destacá-lo no centro" 
                  : "Destaque principal controlado pelo professor"}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {session.participants.map(p => {
                const isActiveSpotlight = session.activeSpotlightId === p.userId;
                return (
                  <div
                    key={p.userId}
                    onClick={() => {
                      if (isTesterInstructor) {
                        handleSpotlight(p.userId);
                      }
                    }}
                    className={`relative bg-slate-950 border rounded-xl overflow-hidden aspect-video transition-all duration-200 group ${
                      isTesterInstructor ? 'cursor-pointer hover:border-emerald-500' : 'cursor-default'
                    } ${
                      isActiveSpotlight 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.03]' 
                      : p.handRaised 
                      ? 'border-amber-500 ring-2 ring-amber-500/40 animate-pulse' 
                      : 'border-slate-800'
                    }`}
                    id={`feed-card-${p.userId}`}
                  >
                    {/* Render video / visual indicator */}
                    {p.camOn ? (
                      <ParticipantVideoFeed 
                        participant={p}
                        mediaStream={mediaStream}
                        activeTesterId={activeTesterId}
                        remoteStream={remoteStreams[p.userId]}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                        <img 
                          src={p.avatar} 
                          alt={p.name} 
                          className="w-10 h-10 rounded-full border-2 border-slate-800 filter grayscale" 
                        />
                        <div className="absolute top-1 right-1 bg-slate-950 p-1 rounded-full border border-slate-800">
                          <VideoOff className="w-3 h-3 text-red-500" />
                        </div>
                      </div>
                    )}

                    {/* Raised hand indicator overlay */}
                    {p.handRaised && (
                      <div className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md">
                        <Hand className="w-2.5 h-2.5" /> ✋ Dúvida
                      </div>
                    )}

                    {/* Participant bottom bar labels */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent p-1.5 text-[10px] flex items-center justify-between text-slate-300">
                      <span className="font-semibold truncate max-w-[80%]">{p.name.split(' ')[0]} {p.userId === activeTesterId ? '(Você)' : ''}</span>
                      <div className="flex items-center gap-1.5">
                        {p.micOn ? (
                          <Mic className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <MicOff className="w-2.5 h-2.5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN SIDEBAR: CHAT, PARTICIPANTS, INTEGRATIONS (takes 1 column) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-[650px] shadow-2xl overflow-hidden" id="classroom-sidebar">
          
          {/* TAB HEADERS NAVIGATION */}
          <div className="bg-slate-950 border-b border-slate-800 p-2 flex items-center justify-around">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'chat' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              id="sidebar-chat-tab"
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'participants' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              id="sidebar-users-tab"
            >
              <Users className="w-4 h-4" /> Alunos
              {session.participants.some(p => p.handRaised) && (
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'settings' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              id="sidebar-settings-tab"
            >
              <Settings className="w-4 h-4" /> Config
            </button>
          </div>

          {/* TAB CONTENT VIEWS */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            
            {/* 1. CHAT MESSAGE INTERFACE */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0">
                {session.chatMuted && (
                  <div className="mb-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-2.5 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>O chat da aula foi silenciado para alunos. Apenas instrutores podem publicar.</span>
                  </div>
                )}
                
                {/* Scroll messages stream */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-slate-200">
                  {session.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-550 py-10 space-y-2">
                      <MessageSquare className="w-10 h-10 text-slate-700" />
                      <p className="text-xs">O chat está livre de mensagens.</p>
                    </div>
                  ) : (
                    session.messages.map((m) => {
                      const isMe = m.senderId === currentTestUser.userId;
                      const isTeacher = m.senderRole === 'instructor';
                      return (
                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {m.senderName}
                            </span>
                            {isTeacher && (
                              <span className="text-[8px] bg-emerald-500 text-slate-950 px-1 rounded-full font-bold uppercase tracking-wider">
                                Prof
                              </span>
                            )}
                          </div>
                          <div className={`p-2.5 rounded-2xl max-w-[90%] text-xs shadow ${
                            isMe 
                            ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none' 
                            : isTeacher 
                            ? 'bg-slate-800 text-emerald-400 border border-emerald-500/25 rounded-tl-none' 
                            : 'bg-slate-850 text-slate-200 rounded-tl-none'
                          }`}>
                            <p>{m.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={msgsEndRef} />
                </div>

                {/* Sender textbox form */}
                <form onSubmit={handleSendMessage} className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={session.chatMuted && !isTesterInstructor}
                    placeholder={
                      session.chatMuted && !isTesterInstructor 
                      ? "O chat foi silenciado..."
                      : "Escreva sua dúvida no chat..."
                    }
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={(session.chatMuted && !isTesterInstructor) || !inputText.trim()}
                    className="p-2 bg-emerald-500 disabled:bg-slate-800 hover:bg-emerald-400 text-slate-950 disabled:text-slate-500 rounded-xl cursor-pointer transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* 2. PARTICIPANTS LIST & MODERATION CONTROL ACTIONS */}
            {activeTab === 'participants' && (
              <div className="flex-1 space-y-4">
                
                {/* Instructor actions block */}
                {isTesterInstructor && (
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Moderar Todos</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleLowerAllHands}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-[10px] font-semibold uppercase rounded-lg cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Hand className="w-3.5 h-3.5" /> Abaixar Mãos
                      </button>
                      <button
                        onClick={handleMuteAllStudents}
                        className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-semibold uppercase rounded-lg cursor-pointer flex items-center justify-center gap-1"
                      >
                        <MicOff className="w-3.5 h-3.5" /> Silenciar Alunos
                      </button>
                    </div>
                  </div>
                )}

                {/* Render full roster scroll */}
                <div className="space-y-2.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Aulas em tempo real ({session.participants.length})</p>
                  
                  {session.participants.map(p => {
                    return (
                      <div key={p.userId} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                        <div className="flex items-center gap-2">
                          <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full border border-slate-800" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">{p.name.split(' ')[0]}</p>
                            <p className="text-[9px] text-slate-500 capitalize">{p.role}</p>
                          </div>
                        </div>

                        {/* Interactive state indicators / Moderation toggles */}
                        <div className="flex items-center gap-1.5">
                          {p.handRaised && (
                            <span className="bg-amber-500 text-slate-950 p-1 rounded-lg text-[9px] font-bold flex items-center gap-0.5 shadow animate-pulse">
                              ✋
                            </span>
                          )}

                          {isTesterInstructor && p.role === 'student' ? (
                            <div className="flex items-center gap-1">
                              {p.speakingAllowed ? (
                                <button
                                  onClick={() => handleGrantVoice(p.userId, false)}
                                  className="p-1 hover:bg-red-500/10 text-red-400 rounded-md"
                                  title="Revogar voz"
                                >
                                  <Mic className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleGrantVoice(p.userId, true)}
                                  className={`p-1 rounded-md ${p.handRaised ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'hover:bg-emerald-500/20 text-slate-400'}`}
                                  title="Permitir voz"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleSpotlight(p.userId)}
                                className={`p-1 rounded-md ${(isTesterInstructor ? session.activeSpotlightId : (localSpotlightId || session.activeSpotlightId)) === p.userId ? 'text-emerald-400 bg-slate-850' : 'text-slate-400 hover:bg-slate-800'}`}
                                title="Destacar feed"
                              >
                                <Tv className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              {p.micOn ? (
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                              ) : (
                                <div className="h-1.5 w-1.5 rounded-full bg-slate-750"></div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. SETTINGS & SYNC PREFERENCES */}
            {activeTab === 'settings' && (
              <div className="flex-1 space-y-4">
                
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 space-y-3 text-slate-300">
                  <p className="text-xs font-semibold text-slate-200">Definições da Sala Live</p>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-mono">Título do Tópico</label>
                    <input
                      type="text"
                      value={session.classTitle}
                      disabled={!isTesterInstructor}
                      onChange={(e) => saveSessionState({ ...session, classTitle: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-mono">Descrição do Módulo</label>
                    <textarea
                      value={session.classDescription}
                      disabled={!isTesterInstructor}
                      onChange={(e) => saveSessionState({ ...session, classDescription: e.target.value })}
                      className="w-full h-16 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>

                {isTesterInstructor && (
                  <div className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 space-y-3">
                    <p className="text-[10px] text-emerald-400 font-semibold tracking-widest font-mono">Configurações de Privilégios</p>
                    
                    <div className="flex items-center justify-between py-1">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-slate-200">Silenciar Chat Geral</p>
                        <p className="text-[9px] text-slate-500">Impedir envio de dúvidas</p>
                      </div>
                      <button
                        onClick={handleToggleChatMute}
                        className={`w-10 h-6 rounded-full transition duration-200 relative p-1 cursor-pointer ${
                          session.chatMuted ? 'bg-red-500' : 'bg-slate-800'
                        }`}
                      >
                        <span className={`block h-4 w-4 rounded-full bg-white transition transform ${session.chatMuted ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-slate-100">Permitir Webcam de Alunos</p>
                        <p className="text-[9px] text-slate-500">Membros podem usar vídeo</p>
                      </div>
                      <button
                        onClick={handleToggleAllowStudentCamera}
                        className={`w-10 h-6 rounded-full transition duration-200 relative p-1 cursor-pointer ${
                          session.allowStudentCam ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <span className={`block h-4 w-4 rounded-full bg-white transition transform ${session.allowStudentCam ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-850">
                      <button
                        onClick={handleClearChatLogs}
                        className="w-full bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-display py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" /> Limpar Chat Geral
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 text-center">
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Este software de live streaming usa barramento reativo de estado. Ambas as telas sincronizam automaticamente em múltiplos dispositivos logados.
                  </p>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* Modal de confirmação para encerrar live */}
      {showTerminateLiveConfirm && (
        <div id="terminate-live-confirmation-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle size={20} />
                <h3 className="font-display font-bold text-slate-100 text-base">Encerrar Transmissão</h3>
              </div>
              <button 
                onClick={() => setShowTerminateLiveConfirm(false)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 animate-pulse">
                <Tv size={24} />
              </div>
              
              <div className="space-y-1">
                <h4 className="text-slate-100 font-bold text-base">Deseja mesmo finalizar a aula?</h4>
                <p className="text-[11px] text-slate-400 font-mono">Esta ação fechará a transmissão síncrona</p>
              </div>

              <p className="text-xs text-slate-350 leading-relaxed max-w-sm mx-auto">
                Deseja realmente encerrar esta transmissão ao vivo e fechar a sala para todos os alunos conectados? Eles perderão a conexão síncrona e a sala será dada como encerrada.
              </p>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/50">
              <button
                type="button"
                onClick={() => setShowTerminateLiveConfirm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTerminateLiveRoomConfirm}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-500 hover:bg-red-450 text-slate-950 transition cursor-pointer"
              >
                Encerrar Transmissão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
