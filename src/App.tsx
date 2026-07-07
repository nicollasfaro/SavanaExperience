/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Course, CourseModule, Lesson, StudentProgress, LeaderboardUser, NotificationItem, Turma, Redemption } from './types';
import { localDB, auth, signInWithGmail, logoutGmail, db, signUpUserWithEmailAndPassword, signInUserWithEmailAndPassword } from './firebase';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { CourseCard } from './components/CourseCard';
import { PushNotificationToggle } from './components/PushNotificationToggle';
import { Forum } from './components/Forum';
import { Leaderboard } from './components/Leaderboard';
import { InstructorPanel } from './components/InstructorPanel';
import { SupportChat } from './components/SupportChat';
import { AdminPanel } from './components/AdminPanel';
import { Classroom } from './components/Classroom';
import { Store } from './components/Store';
import { StudentDashboard } from './components/StudentDashboard';
import { CertificateModal } from './components/CertificateModal';
import { CertificateValidator } from './components/CertificateValidator';
import { 
  Trophy, BookOpen, Sun, Moon, Sparkles, MessageSquare, Play, CheckCircle2, 
  HelpCircle, CreditCard, ChevronRight, Download, Calendar, ShieldCheck, Clock, 
  Settings, Award, Wifi, WifiOff, Fingerprint, Lock, CheckSquare, Bell, Shield, Gift, Menu, X,
  Video
} from 'lucide-react';

export function SavanaLogo({ className = "w-10 h-10" }: { className?: string }) {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <img 
        src="/logo.png" 
        alt="Savana Experience Logo" 
        className={`${className} object-contain`}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className}>
      {/* Outer Circle with Warm Golden Accent Ring */}
      <circle cx="50" cy="50" r="46" fill="#0b1a13" stroke="#687342" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke="#253e2d" strokeWidth="0.5" />
      
      {/* Subtle background leaves/textures inside the ring */}
      <path d="M 28,76 C 18,65 24,53 38,62 C 30,68 28,72 28,76 Z" fill="#313f23" />
      
      {/* High-fidelity Lizard / Iguana Head profile */}
      {/* Crest spikes/scales on the back and neck */}
      <path d="M 25,52 Q 22,46 20,44 Q 23,43 25,44" fill="#586737" stroke="#687342" strokeWidth="0.5" />
      <path d="M 27,45 Q 24,38 23,34 Q 26,34 28,36" fill="#586737" stroke="#687342" strokeWidth="0.5" />
      <path d="M 30,37 Q 27,30 26,26 Q 29,26 32,29" fill="#586737" stroke="#687342" strokeWidth="0.5" />
      <path d="M 35,30 Q 32,22 32,18 Q 35,19 37,23" fill="#586737" stroke="#687342" strokeWidth="0.5" />
      <path d="M 42,24 Q 40,16 41,12 Q 44,14 45,18" fill="#586737" stroke="#687342" strokeWidth="0.5" />
      <path d="M 49,20 Q 48,13 50,9 A 1 1 0 0 1 54,15" fill="#586737" stroke="#687342" strokeWidth="0.5" />

      {/* Main Iguana Head structure */}
      <path 
        d="M 22,65 C 20,53 26,32 46,26 C 60,22 75,22 84,32 C 90,39 92,49 84,56 C 76,63 60,65 48,68 C 38,70 30,73 22,65 Z" 
        fill="#1e3826" 
        stroke="#42552e" 
        strokeWidth="1"
      />
      
      {/* Intricate detailed green/emerald scales highlight overlays */}
      <path d="M 38,42 C 34,42 34,48 38,48 C 42,48 42,42 38,42 Z" fill="#2d5236" />
      <path d="M 46,40 C 41,40 41,46 46,46 C 51,46 51,40 46,40 Z" fill="#2d5236" />
      <path d="M 54,38 C 49,38 49,44 54,44 C 59,44 59,38 54,38 Z" fill="#22422a" />
      
      {/* Lower jaw and snout scale texture patterns */}
      <ellipse cx="62" cy="51.5" rx="8" ry="6" fill="#356843" />
      <ellipse cx="49" cy="54" rx="7" ry="5.5" fill="#356843" />
      <ellipse cx="38" cy="56" rx="6" ry="5" fill="#2a5235" />
      
      <circle cx="71.5" cy="46" r="3.5" fill="#4d8c5c" />
      <circle cx="78" cy="42" r="3" fill="#4d8c5c" />
      <circle cx="81.5" cy="38" r="2.5" fill="#4d8c5c" />

      {/* Golden Reptilian Eye */}
      <circle cx="60.5" cy="31.5" r="7.5" fill="#44552b" stroke="#102010" strokeWidth="1" />
      <circle cx="60.5" cy="31.5" r="5.5" fill="#cca329" />
      {/* Slit vertical pupil */}
      <ellipse cx="60.5" cy="31.5" rx="1.5" ry="4" fill="#080e09" />
      {/* Eye light reflection gloss */}
      <circle cx="58.5" cy="29.5" r="1.3" fill="#ffffff" />
      <circle cx="61.5" cy="30" r="0.6" fill="#ffffff" />

      {/* Mouth seam line */}
      <path d="M 62,45 Q 70,47 78,43 Q 83,40 85,39" stroke="#0b170d" strokeWidth="2" strokeLinecap="round" fill="none" />
      
      {/* Beautiful white outline leaves at the bottom of the circle */}
      <path 
        d="M 12,50 C 14,70 38,82 48,82 C 34,78 22,64 12,50 Z" 
        fill="#394828" 
        stroke="#eff3e5" 
        strokeWidth="1.5" 
        strokeLinejoin="round"
      />
      <path 
        d="M 22,58 C 24,76 46,86 56,86 C 42,82 31,70 22,58 Z" 
        fill="#2e3c1d" 
        stroke="#eff3e5" 
        strokeWidth="1.5" 
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SafeVideoPlayer({ videoUrl, isEncrypted }: { videoUrl: string; isEncrypted?: boolean }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isEncrypted) {
      setBlobUrl(null);
      return;
    }

    const url = videoUrl.trim();
    let finalEmbedSrc = '';

    // 1. Is it a raw iframe embed code?
    if (url.toLowerCase().startsWith('<iframe') || url.toLowerCase().includes('<iframe')) {
      const srcMatch = url.match(/src="([^"]+)"/i);
      if (srcMatch) {
        finalEmbedSrc = srcMatch[1];
      } else {
        finalEmbedSrc = url;
      }
    } else {
      // 2. Is it a YouTube URL?
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
      const ytMatch = url.match(youtubeRegex);

      // 3. Is it a Vimeo URL?
      const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i;
      const vimeoMatch = url.match(vimeoRegex);

      if (ytMatch) {
        finalEmbedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
      } else if (vimeoMatch) {
        finalEmbedSrc = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      } else {
        finalEmbedSrc = url;
      }
    }

    // Convert src to Base64 to obfuscate it inside the Blob URL code
    const encodedSrc = btoa(finalEmbedSrc);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: #000;
            }
            iframe, video {
              width: 100%;
              height: 100%;
              border: 0;
            }
          </style>
        </head>
        <body>
          <div id="player-container"></div>
          <script>
            (function() {
              try {
                var decodedSrc = atob("${encodedSrc}");
                var container = document.getElementById("player-container");
                var lowerSrc = decodedSrc.toLowerCase();
                
                var isDirectVideo = lowerSrc.endsWith('.mp4') || 
                                    lowerSrc.includes('.mp4?') || 
                                    lowerSrc.endsWith('.m3u8') || 
                                    lowerSrc.includes('.m3u8?') || 
                                    lowerSrc.endsWith('.webm') || 
                                    lowerSrc.includes('.webm?');
                
                if (isDirectVideo) {
                  var video = document.createElement('video');
                  video.src = decodedSrc;
                  video.controls = true;
                  video.autoplay = false;
                  container.appendChild(video);
                } else {
                  var iframe = document.createElement('iframe');
                  iframe.src = decodedSrc;
                  iframe.frameBorder = "0";
                  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                  iframe.allowFullscreen = true;
                  container.appendChild(iframe);
                }
              } catch (e) {
                console.error("Secure video loader exception:", e);
              }
            })();
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const urlObject = URL.createObjectURL(blob);
    setBlobUrl(urlObject);

    return () => {
      URL.revokeObjectURL(urlObject);
    };
  }, [videoUrl, isEncrypted]);

  if (!isEncrypted || !blobUrl) {
    const url = videoUrl.trim();

    // 1. Is it a raw iframe embed code?
    if (url.toLowerCase().startsWith('<iframe') || url.toLowerCase().includes('<iframe')) {
      let cleanEmbed = url;
      if (cleanEmbed.includes('width=')) {
        cleanEmbed = cleanEmbed.replace(/width="[^"]*"/g, 'width="100%"');
      }
      if (cleanEmbed.includes('height=')) {
        cleanEmbed = cleanEmbed.replace(/height="[^"]*"/g, 'height="100%"');
      }
      return (
        <div 
          className="w-full h-full" 
          dangerouslySetInnerHTML={{ __html: cleanEmbed }} 
        />
      );
    }

    // 2. Is it a Bunny Stream URL?
    const isBunnyStream = /mediadelivery\.net|bunny\.net|b-cdn\.net/i.test(url);
    if (isBunnyStream) {
      return (
        <iframe
          src={url}
          title="Bunny Stream video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    // 3. Is it a YouTube URL?
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(youtubeRegex);
    if (ytMatch) {
      const videoId = ytMatch[1];
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    // 4. Is it a Vimeo URL?
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      return (
        <iframe
          src={`https://player.vimeo.com/video/${videoId}`}
          title="Vimeo video player"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      );
    }

    return (
      <video 
        src={url} 
        controls 
        className="w-full h-full object-contain" 
      />
    );
  }

  return (
    <div className="w-full h-full relative">
      <iframe
        src={blobUrl}
        title="Secure Video Player"
        className="w-full h-full border-0"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
      <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-emerald-500/30 text-[9px] font-mono text-emerald-450 font-bold uppercase tracking-wider flex items-center gap-1 pointer-events-none select-none shadow-lg">
        <Lock size={10} className="text-emerald-400 animate-pulse" />
        Reprodutor Criptografado Ativo
      </div>
    </div>
  );
}

export default function App() {
  // 1. Theme state (default dark, toggle to light)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Email/Password login and registration states
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [emailForm, setEmailForm] = useState('');
  const [passwordForm, setPasswordForm] = useState('');
  const [fullNameForm, setFullNameForm] = useState('');
  const [registerAvatar, setRegisterAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');
  const [registerAvatarFile, setRegisterAvatarFile] = useState<File | null>(null);
  const [authFormLoading, setAuthFormLoading] = useState(false);
  const [authFormError, setAuthFormError] = useState<string | null>(null);

  // Pre-registration dynamic checking states
  const [isPreRegistered, setIsPreRegistered] = useState(false);
  const [preRegisteredCourses, setPreRegisteredCourses] = useState<string[]>([]);

  useEffect(() => {
    if (!emailForm) {
      setIsPreRegistered(false);
      setPreRegisteredCourses([]);
      return;
    }
    const cleanMail = emailForm.trim().toLowerCase();
    const checkMail = async () => {
      try {
        const docSnap = await localDB.fetchPreRegistrationForEmail(cleanMail);
        if (docSnap && !docSnap.used) {
          setIsPreRegistered(true);
          setPreRegisteredCourses(docSnap.courseIds);
          // Auto-toggle to register form so that they set a password
          setShowRegisterForm(true);
        } else {
          setIsPreRegistered(false);
          setPreRegisteredCourses([]);
        }
      } catch (err) {
        console.warn("Pre-register check failed:", err);
      }
    };
    const timer = setTimeout(checkMail, 450);
    return () => clearTimeout(timer);
  }, [emailForm]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFormLoading(true);
    setAuthFormError(null);

    // Basic Validation
    if (!emailForm || !passwordForm) {
      setAuthFormError("Por favor, preencha todos os campos obrigatórios.");
      setAuthFormLoading(false);
      return;
    }

    if (showRegisterForm && !fullNameForm) {
      setAuthFormError("Por favor, informe seu nome completo para o cadastro.");
      setAuthFormLoading(false);
      return;
    }

    if (passwordForm.length < 6) {
      setAuthFormError("A senha precisa ter pelo menos 6 caracteres.");
      setAuthFormLoading(false);
      return;
    }

    try {
      if (showRegisterForm) {
        await signUpUserWithEmailAndPassword(fullNameForm, emailForm, passwordForm, registerAvatarFile || registerAvatar);
      } else {
        await signInUserWithEmailAndPassword(emailForm, passwordForm);
      }
    } catch (err: any) {
      console.error("Auth submit error:", err);
      let errMsg = err.message || String(err);
      if (err.code === 'auth/email-already-in-use') {
        errMsg = "Este e-mail já está sendo utilizado por outra conta.";
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errMsg = "E-mail ou senha incorretos. Por favor, verifique.";
      } else if (err.code === 'auth/invalid-email') {
        errMsg = "Por favor, insira um endereço de e-mail válido.";
      }
      setAuthFormError(errMsg);
    } finally {
      setAuthFormLoading(false);
    }
  };

  // Real Firebase Gmail login states
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isAdminRoleFromDB, setIsAdminRoleFromDB] = useState<boolean>(false);

  useEffect(() => {
    if (authUser?.uid) {
      const fetchAdminProfile = async () => {
         try {
           const docSnapshot = await getDoc(doc(db, 'admins', authUser.uid));
           setIsAdminRoleFromDB(docSnapshot.exists());
         } catch (err: any) {
           const isOffline = err?.message?.toLowerCase().includes('offline') || String(err).toLowerCase().includes('offline');
           if (isOffline) {
             console.warn("Checking admin access (offline): using offline / default states.", err);
           } else {
             console.error("Checking admin access", err);
           }
         }
      };
      fetchAdminProfile();
    }
  }, [authUser]);

  // 6. Registered course registrations tracker
  const [localRegistrations, setLocalRegistrations] = useState<string[]>(() => localDB.getRegistrations());
  const [userProgress, setUserProgress] = useState<StudentProgress[]>(() => localDB.getProgress(authUser?.uid || 'current-user-id'));
  const [allLeaderboard, setAllLeaderboard] = useState<LeaderboardUser[]>(() => localDB.getLeaderboard());

  // 2. Auth State and Dynamic Role (Toggled only in real-time by General Admin in database)
  const isSystemAdmin = authUser?.email === 'ciuldinciuldin@gmail.com' || isAdminRoleFromDB;
  const dbUser = authUser ? allLeaderboard.find(u => u.userId === authUser.uid) : null;
  const currentUserRole: 'student' | 'instructor' = dbUser?.role || (isSystemAdmin ? 'instructor' : 'student');
  const currentUserId = authUser?.uid || 'current-user-id';
  const currentUserName = authUser?.displayName || authUser?.email?.split('@')[0] || 'Mário Medeiros';
  const currentUserAvatar = dbUser?.avatar || authUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

  // 3. Navigation State
  const [activeTab, setActiveTab] = useState<'explore' | 'forum' | 'leaderboard' | 'instructor' | 'admin' | 'classroom' | 'store' | 'dashboard'>('explore');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [formatFilter, setFormatFilter] = useState<'all' | 'online' | 'recorded' | 'presencial'>('all');
  const [viewingCertificate, setViewingCertificate] = useState(false);
  const [showCertificateValidator, setShowCertificateValidator] = useState(false);

  // 4. Data states loading from localStorage localDB
  const [courses, setCourses] = useState<Course[]>(() => localDB.getCourses());
  const [modules, setModules] = useState<CourseModule[]>(() => localDB.getModules());
  const [turmas, setTurmas] = useState<Turma[]>(() => localDB.getTurmas());
  const [rewards, setRewards] = useState(() => localDB.getRewards());

  const myRegistrations = React.useMemo(() => {
    const fromTurmas = turmas.filter(t => t.studentIds?.includes(currentUserId)).map(t => t.courseId);
    return Array.from(new Set([...localRegistrations, ...fromTurmas]));
  }, [localRegistrations, turmas, currentUserId]);
  
  const computedCourses = React.useMemo(() => {
    let list = courses.filter(course => course.isPublished !== false);
    return list.map(course => {
      // 1. Calculate Real Duration
      const courseMods = modules.filter(m => m.courseId === course.id);
      let totalMinutes = 0;
      courseMods.forEach(mod => {
        mod.lessons.forEach(lesson => {
          const s = (lesson.duration || '0').toLowerCase().replace(/\s/g, '');
          if (s.includes('h')) {
            const parts = s.split('h');
            const h = parseInt(parts[0]) || 0;
            const m = parseInt(parts[1]?.replace('m', '').replace('in', '')) || 0;
            totalMinutes += (h * 60) + m;
          } else if (s.includes('m')) {
            totalMinutes += parseInt(s.replace('min', '').replace('m', '')) || 0;
          } else if (s.includes(':')) {
            const [m, sec] = s.split(':');
            totalMinutes += parseInt(m) || 0;
          } else {
            totalMinutes += parseInt(s) || 0;
          }
        });
      });
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const realDuration = totalMinutes > 0 ? (hours > 0 ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`) : `${mins}m`) : course.totalDuration;

      // 2. Calculate Real Enrolled Students
      const courseTurmas = turmas.filter(t => t.courseId === course.id);
      const uniqueStudents = new Set<string>();
      courseTurmas.forEach(t => {
        t.studentIds?.forEach(id => uniqueStudents.add(id));
      });
      const realEnrolled = uniqueStudents.size;

      // 3. Calculate Real Rating
      let realRating = course.rating;
      if (course.reviews && course.reviews.length > 0) {
        const sum = course.reviews.reduce((acc, rev) => acc + rev.rating, 0);
        realRating = sum / course.reviews.length;
      }

      return {
        ...course,
        totalDuration: totalMinutes > 0 ? realDuration : course.totalDuration,
        enrolledCount: realEnrolled,
        rating: realRating,
      };
    });
  }, [courses, modules, turmas, currentUserRole]);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const hasAccess = selectedCourse ? myRegistrations.includes(selectedCourse.id) : false;

  // 5. Checkout / Payment flow state
  const [checkoutCourse, setCheckoutCourse] = useState<Course | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Redemption | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'success'>('form');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  // Handle Stripe Success Callback Response
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const courseId = urlParams.get('course_id');
    const canceled = urlParams.get('canceled');

    if (success && courseId) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setCheckoutCourse(course);
        setCheckoutStep('success');
        
        // Register user and set notifications
        const updatedReg = [...localRegistrations, courseId];
        localDB.saveRegistrations(updatedReg);
        setLocalRegistrations(updatedReg);

        // Record payment in firestore
        try {
          addDoc(collection(db, 'payments'), {
            courseId: course.id,
            courseTitle: course.title,
            amount: course.price,
            userId: currentUserId,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.error("Error saving payment", e);
        }

        const newNotif: NotificationItem = {
          id: `n-${Date.now()}`,
          userId: currentUserId,
          title: 'Matrícula Aprovada com Sucesso!',
          message: `Você está devidamente matriculado no curso "${course.title}". Desejamos ótimos estudos!`,
          type: 'course',
          read: false,
          createdAt: new Date().toISOString()
        };
        setNotifications(prev => [newNotif, ...prev]);
        localDB.unlockBadge(currentUserId, 'badge-welcome');
        setAllLeaderboard(localDB.getLeaderboard());
      }
      
      // Remove query string safely
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (canceled) {
      alert('Sua compra foi cancelada. Você pode tentar novamente.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [courses, currentUserId]);

  // 7. Biometric Security Modal state
  const [biometricVerified, setBiometricVerified] = useState(true);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);



  // 9. Active Quiz state
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizSuccess, setQuizSuccess] = useState<boolean | null>(null);

  // 10. Interactive Local Notifications
  const [completionCountdown, setCompletionCountdown] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n-1',
      userId: 'current-user-id',
      title: 'Boas-vindas ao Savana Experience!',
      message: 'Comece a estudar hoje, acumule pontos de experiência (XP) e conquiste sua primeira medalha.',
      type: 'progress',
      read: false,
      createdAt: new Date().toISOString()
    }
  ]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Dynamic Notifications Effect
  useEffect(() => {
    const newDynamicNotifications: NotificationItem[] = [];
    const now = new Date();
    
    // Check for new courses (created within last 7 days)
    courses.forEach(c => {
      if (c.createdAt) {
        const createdDate = new Date(c.createdAt);
        const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7 && diffDays >= 0) {
          newDynamicNotifications.push({
            id: `dyn-course-${c.id}`,
            userId: currentUserId,
            title: `Novo Curso Disponível!`,
            message: `O curso "${c.title}" acabou de ser lançado. Confira agora!`,
            type: 'course',
            read: false,
            createdAt: c.createdAt
          });
        }
      }
    });

    // Check for Live classes coming up from Turmas
    turmas.forEach(t => {
      if (t.studentIds?.includes(currentUserId)) {
         if (t.startDate) {
           const classDate = new Date(t.startDate + 'T00:00:00Z'); // force proper interpretation if it's just a date
           const diffTime = classDate.getTime() - now.getTime();
           const diffDays = diffTime / (1000 * 60 * 60 * 24);
           if (diffDays >= -1 && diffDays <= 7) {
             const dateStr = classDate.toLocaleDateString('pt-BR');
             const isToday = Math.abs(diffDays) < 1 && now.getDate() === classDate.getDate();
             
             newDynamicNotifications.push({
               id: `dyn-live-${t.id}`,
               userId: currentUserId,
               title: isToday ? `AULA AO VIVO HOJE!` : `Aula ao vivo se aproximando!`,
               message: isToday 
                 ? `A turma "${t.name}" tem aula hoje ao vivo. Prepare-se!`
                 : `A turma "${t.name}" terá aula ao vivo em ${dateStr}.`,
               type: 'announcement',
               read: false,
               createdAt: new Date().toISOString()
             });
           }
         }
      }
    });

    // Check course live dates too
    courses.forEach(c => {
        if (c.liveClassDate && myRegistrations.includes(c.id)) {
           const classDate = new Date(c.liveClassDate);
           const diffTime = classDate.getTime() - now.getTime();
           const diffDays = diffTime / (1000 * 60 * 60 * 24);
           if (diffDays >= -1 && diffDays <= 7) {
             const isToday = Math.abs(diffDays) < 1 && now.getDate() === classDate.getDate();
             newDynamicNotifications.push({
               id: `dyn-course-live-${c.id}`,
               userId: currentUserId,
               title: isToday ? `AULA AO VIVO HOJE!` : `Aula ao vivo em breve!`,
               message: isToday
                 ? `O curso "${c.title}" tem aula hoje. Acesse a plataforma.`
                 : `O curso "${c.title}" tem aula marcada para ${classDate.toLocaleDateString('pt-BR')}.`,
               type: 'announcement',
               read: false,
               createdAt: new Date().toISOString()
             });
           }
        }
    });

    setNotifications(prev => {
      // filter out previous dynamic notifications to avoid duplicates or removed classes
      const persist = prev.filter(n => !n.id.startsWith('dyn-'));
      // combine and sort
      return [...newDynamicNotifications, ...persist].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }, [courses, turmas, currentUserId, myRegistrations]);

  // Handle updates made in the Instructor Panel
  const updateCoursesFromLocal = () => {
    setCourses(localDB.getCourses());
  };

  const handleUpdateRole = async (userId: string, role: 'student' | 'instructor' | 'admin') => {
    await localDB.updateUserRole(userId, role);
  };

  // Switch classes in html document
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen to Firebase Auth state & check mobile layout
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);

      const checkIsMobile = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      };
      const mob = checkIsMobile();
      setIsMobile(mob);

      if (user) {
        setShowBiometricModal(false);
        setBiometricVerified(true);
      } else {
        setShowBiometricModal(false);
        setBiometricVerified(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for real-time Firebase / StorageEngine changes
  useEffect(() => {
    const unsubCourses = localDB.onChange('courses', () => {
      setCourses(localDB.getCourses());
    });
    const unsubLeaderboard = localDB.onChange('leaderboard', () => {
      setAllLeaderboard(localDB.getLeaderboard());
    });
    const unsubModules = localDB.onChange('modules', () => {
      setModules(localDB.getModules());
    });
    const unsubTurmas = localDB.onChange('turmas', () => {
      setTurmas(localDB.getTurmas());
    });
    const unsubRewards = localDB.onChange('rewards', () => {
      setRewards(localDB.getRewards());
    });
    const unsubRegistrations = localDB.onChange('registrations', () => {
      setLocalRegistrations(localDB.getRegistrations());
    });
    return () => {
      unsubCourses();
      unsubLeaderboard();
      unsubModules();
      unsubTurmas();
      unsubRewards();
      unsubRegistrations();
    };
  }, []);

  // Auto-open Certificate Validator if a validation token is present in the URL query parameters (e.g. following QR code scan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const validateId = params.get('validate');
    if (validateId) {
      setShowCertificateValidator(true);
    }
  }, []);

  // Listen for progress, enrollment, & notifications changes when currentUserId changes
  useEffect(() => {
    if (!currentUserId) return;
    setUserProgress(localDB.getProgress(currentUserId));
    setLocalRegistrations(localDB.getRegistrations());
    
    // Set initial notifications for the switched user
    const initialNotifs = localDB.getNotifications(currentUserId);
    setNotifications(prev => {
      const currentDyn = prev.filter(n => n.id.startsWith('dyn-'));
      return [...currentDyn, ...initialNotifs].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    const unsubProgress = localDB.onChange(`progress_${currentUserId}`, () => {
      setUserProgress(localDB.getProgress(currentUserId));
    });

    const unsubNotifs = localDB.onChange(`notifications_${currentUserId}`, () => {
      const liveNotifs = localDB.getNotifications(currentUserId);
      setNotifications(prev => {
        const currentDyn = prev.filter(n => n.id.startsWith('dyn-'));
        const dynFiltered = currentDyn.filter(d => !liveNotifs.some(p => p.id === d.id));
        return [...dynFiltered, ...liveNotifs].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
    });

    return () => {
      unsubProgress();
      unsubNotifs();
    };
  }, [currentUserId]);

  // Biometrics scanner verification triggers
  const executeScan = () => {
    setBiometricScanning(true);
    setTimeout(() => {
      setBiometricScanning(false);
      setBiometricVerified(true);
      setShowBiometricModal(false);
      // Give initial Welcome Badge if registered
      localDB.unlockBadge(currentUserId, 'badge-welcome');
      setAllLeaderboard(localDB.getLeaderboard());
    }, 1500);
  };

  // Payment Confirmation
  const confirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutCourse) return;

    const discount = appliedCoupon ? (appliedCoupon.discountPercentage || 0) : 0;
    const finalPrice = checkoutCourse.price * (1 - discount / 100);

    if (finalPrice === 0) {
      // Simulate approval
      setCheckoutStep('success');
      
      // Add to registered list
      const updatedReg = [...localRegistrations, checkoutCourse.id];
      localDB.saveRegistrations(updatedReg);
      setLocalRegistrations(updatedReg);

      try {
        addDoc(collection(db, 'payments'), {
          courseId: checkoutCourse.id,
          courseTitle: checkoutCourse.title,
          amount: finalPrice,
          userId: currentUserId,
          timestamp: new Date().toISOString(),
          couponCode: appliedCoupon?.couponCode || undefined
        });
      } catch (e) {
        console.error("Error saving payment", e);
      }

      if (appliedCoupon) {
        await localDB.saveRedemption({ ...appliedCoupon, used: true });
        setAppliedCoupon(null);
      }

      // Dynamic push notifier
      const newNotif: NotificationItem = {
        id: `n-${Date.now()}`,
        userId: currentUserId,
        title: 'Matrícula Aprovada com Sucesso!',
        message: `Você está devidamente matriculado no curso "${checkoutCourse.title}". Desejamos ótimos estudos!`,
        type: 'course',
        read: false,
        createdAt: new Date().toISOString()
      };
      setNotifications([newNotif, ...notifications]);

      // Give first lesson study badge if student is active
      localDB.unlockBadge(currentUserId, 'badge-welcome');
      setAllLeaderboard(localDB.getLeaderboard());
      return;
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           courseId: checkoutCourse.id,
           courseTitle: checkoutCourse.title,
           coursePrice: finalPrice
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Erro ao processar pagamento: ${errorData.error}`);
        return;
      }

      if (appliedCoupon) {
        await localDB.saveRedemption({ ...appliedCoupon, used: true });
        setAppliedCoupon(null);
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível conectar ao provedor de pagamentos.');
    }
  };

  // Complete lesson check mark
  const handleMarkLessonComplete = async (lesson: Lesson) => {
    if (!selectedCourse) return;
    
    const progressList = localDB.getProgress(currentUserId);
    let prog = progressList.find(p => p.courseId === selectedCourse.id);
    
    if (!prog) {
      prog = {
        userId: currentUserId,
        courseId: selectedCourse.id,
        progressPercentage: 0,
        completedLessons: [],
        xp: 0,
        score: 0
      };
    }

    if (prog.completedLessons.includes(lesson.id)) {
      alert("Você já concluiu este material e recebeu a pontuação.");
      return;
    }

    // Add to completed lessons and add XP
    prog.completedLessons.push(lesson.id);
    prog.xp += 200;
    
    await localDB.saveProgress(currentUserId, prog);
    await localDB.updateLeaderboardXP(currentUserId, 200);

    setAllLeaderboard(localDB.getLeaderboard());

    // Give Active Student Badge
    const unlockedFirst = await localDB.unlockBadge(currentUserId, 'badge-first-lesson');
    if (unlockedFirst) {
      const bNotif: NotificationItem = {
        id: `n-${Date.now()}-badge`,
        userId: currentUserId,
        title: 'Medalha Desbloqueada!',
        message: 'Você acaba de conquistar o selo de "Estudante Ativo" por concluir sua primeira atividade programada.',
        type: 'badge',
        read: false,
        createdAt: new Date().toISOString()
      };
      setNotifications(prev => [bNotif, ...prev]);
    }

    // Push completion alert indicator
    const successNotif: NotificationItem = {
      id: `n-${Date.now()}-comp`,
      userId: currentUserId,
      title: 'Progresso Atualizado!',
      message: `Você concluiu com sucesso a atividade "${lesson.title}". +200 XP aplicados em sua carteira estudantil.`,
      type: 'progress',
      read: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [successNotif, ...prev]);

    setCompletionCountdown(5);
  };

  useEffect(() => {
    if (completionCountdown === null) return;
    
    if (completionCountdown === 0) {
      setCompletionCountdown(null);
      if (selectedCourse && selectedLesson) {
        const courseModules = modules.filter(m => m.courseId === selectedCourse.id);
        let foundCurrent = false;
        let nextLesson: Lesson | null = null;
        
        for (const mod of courseModules) {
          for (const les of mod.lessons) {
            if (foundCurrent) {
              nextLesson = les;
              break;
            }
            if (les.id === selectedLesson.id) {
              foundCurrent = true;
            }
          }
          if (nextLesson) break;
        }
        
        if (nextLesson) {
          setSelectedLesson(nextLesson);
          setQuizAnswers([]);
          setQuizSubmitted(false);
          setQuizSuccess(null);
        }
      }
      return;
    }
    
    const timer = setTimeout(() => {
      setCompletionCountdown(prev => prev! - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [completionCountdown, selectedLesson, selectedCourse, modules]);

  // Handle interactive quiz submission
  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson?.quiz) return;
    
    const questions = selectedLesson.quiz.questions;
    let allCorrect = true;

    questions.forEach((q, idx) => {
      if (quizAnswers[idx] !== q.correctAnswerIndex) {
        allCorrect = false;
      }
    });

    setQuizSubmitted(true);
    if (allCorrect) {
      setQuizSuccess(true);
      
      const progressList = localDB.getProgress(currentUserId);
      let prog = progressList.find(p => p.courseId === selectedCourse?.id);
      
      if (!prog && selectedCourse) {
        prog = {
          userId: currentUserId,
          courseId: selectedCourse.id,
          progressPercentage: 0,
          completedLessons: [],
          xp: 0,
          score: 0
        };
      }

      if (prog && !prog.completedLessons.includes(selectedLesson.id)) {
        prog.completedLessons.push(selectedLesson.id);
        prog.xp += selectedLesson.quiz.xpPoints;
        localDB.saveProgress(currentUserId, prog);
        localDB.updateLeaderboardXP(currentUserId, selectedLesson.quiz.xpPoints);
        
        // Award Quiz Champion Badge
        localDB.unlockBadge(currentUserId, 'badge-quiz-master').then(newBadge => {
          if (newBadge) {
             const bNotif: NotificationItem = {
               id: `n-${Date.now()}-badge`,
               userId: currentUserId,
               title: 'Medalha Desbloqueada!',
               message: 'Incrível! Você gabaritou o questionário e conquistou a medalha Mente Brilhante!',
               type: 'badge',
               read: false,
               createdAt: new Date().toISOString()
             };
             setNotifications(prev => [bNotif, ...prev]);
          }
        });

        const qNotif: NotificationItem = {
          id: `n-${Date.now()}-quiz`,
          userId: currentUserId,
          title: 'Nota máxima no Quiz!',
          message: `Parabéns! Você gabaritou o teste "${selectedLesson.quiz.title}" e obteve +${selectedLesson.quiz.xpPoints} XP.`,
          type: 'progress',
          read: false,
          createdAt: new Date().toISOString()
        };
        setNotifications(prev => [qNotif, ...prev]);
      }
      
      setAllLeaderboard(localDB.getLeaderboard());
      setCompletionCountdown(5);
    } else {
      setQuizSuccess(false);
    }
  };

  // Compile real .ICS Calendar schedules file download
  const handleExportICS = (course: Course) => {
    const calendarContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Savana Experience E-Learning App//PT',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:Estudos Savana Experience: ${course.title}`,
      `DESCRIPTION:Atividade de leitura e lição prática recomendada para o curso ${course.title}`,
      'DTSTART:20260525T190000Z', // UTC start
      'DTEND:20260525T210000Z',
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12', // Repeat three times per week
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([calendarContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedules_${course.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Arquivo .ics de cronograma de estudos gerado com sucesso! Agora você pode importá-lo no Google Calendar ou Outlook.');
  };



  const activeUserPoints = allLeaderboard.find(u => u.userId === currentUserId)?.xp || 0;
  const activeUserLevel = allLeaderboard.find(u => u.userId === currentUserId)?.level || 1;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="animate-pulse">
            <SavanaLogo className="w-16 h-16" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl tracking-[0.1em] text-slate-100 leading-none">SAVANA</h1>
              <span className="text-[10px] font-black italic tracking-wide text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded leading-none">EXPERIENCE</span>
            </div>
            <span className="block text-[9px] font-mono uppercase tracking-widest text-slate-500 mt-1">Iniciando Ambiente Seguro...</span>
          </div>
        </div>
        <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`${showRegisterForm ? 'max-w-lg' : 'max-w-md'} w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden transition-all duration-300`}>
          {/* Accent Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Banner decoration */}
          {!showRegisterForm && (
            <div className="mx-auto w-24 h-24 mb-6">
              <SavanaLogo className="w-full h-full animate-fade-in" />
            </div>
          )}

          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            {showRegisterForm ? 'Estudante Savana Experience' : 'Educação • Conexão • Conservação'}
          </span>

          <div className="flex flex-col items-center justify-center gap-1.5 mt-5 mb-2">
            <h2 className="font-display text-3xl font-black tracking-[0.15em] text-slate-100">
              SAVANA
            </h2>
            <span className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded">EXPERIENCE</span>
          </div>

          <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-xs mx-auto">
            {showRegisterForm 
              ? 'Insira seus dados para criar sua conta de estudante no Savana Experience.'
              : 'Faça acesso com seu Gmail ou utilize seu e-mail e senha cadastrados abaixo.'
            }
          </p>

          <div className="mt-8 space-y-4">
            {/* GOOGLE ACTION BUTTON */}
            {!showRegisterForm && (
              <>
                <button
                  type="button"
                  id="gmail-login-button"
                  onClick={async () => {
                    try {
                      await signInWithGmail();
                    } catch (err: any) {
                      alert("Houve um problema na autenticação do Gmail: " + (err?.message || err));
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-slate-100 hover:bg-white text-slate-950 font-bold py-3.5 px-4 rounded-xl transition duration-300 hover:shadow-lg hover:shadow-slate-100/10 cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.102 1.025 5.047 1.926l3.258-3.133C18.332 1.154 15.547 0 12.24 0 5.582 0 0 5.37 0 12s5.582 12 12.24 12c6.96 0 11.57-4.839 11.57-11.786 0-.795-.083-1.4-.185-1.929H12.24z"
                    />
                  </svg>
                  <span>Entrar com sua conta Gmail</span>
                </button>

                <div className="flex items-center my-4">
                  <div className="flex-1 border-t border-slate-800" />
                  <span className="px-3 text-[10px] text-slate-500 font-mono tracking-wider uppercase">OU ACESSE COM E-MAIL</span>
                  <div className="flex-1 border-t border-slate-800" />
                </div>
              </>
            )}

            {showRegisterForm && (
              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-slate-800" />
                <span className="px-3 text-[10px] text-slate-500 font-mono tracking-wider uppercase">REGISTRO DE CONTA</span>
                <div className="flex-1 border-t border-slate-800" />
              </div>
            )}

            {/* ERROR DISPLAY */}
            {authFormError && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-405 text-xs text-left p-3.5 rounded-xl flex items-start gap-2 animate-fade-in text-red-400">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{authFormError}</span>
              </div>
            )}

            {/* PRE-REGISTRATION WELCOME DISPLAY */}
            {isPreRegistered && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs text-left p-4 rounded-xl flex items-start gap-2.5 animate-fade-in">
                <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="space-y-1">
                  <p className="font-bold text-slate-100 leading-tight">Matrícula Pré-Registrada Encontrada!</p>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Seu e-mail foi pré-cadastrado na nossa base através do suporte WhatsApp.
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-400">
                    Defina seu nome e crie uma senha abaixo para ativar seu painel de estudos!
                  </p>
                </div>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
              {showRegisterForm && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome Completo</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-505 text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      required
                      value={fullNameForm}
                      onChange={(e) => setFullNameForm(e.target.value)}
                      placeholder="Ex: Mário Medeiros"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-505 text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    value={emailForm}
                    onChange={(e) => setEmailForm(e.target.value)}
                    placeholder="Ex: seuemail@provedor.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Senha</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-505 text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    required
                    value={passwordForm}
                    onChange={(e) => setPasswordForm(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              {/* PROFILE IMAGE UPLOAD PANEL (Cadastro Mode Only) */}
              {showRegisterForm && (
                <div className="bg-slate-950/60 border border-slate-805 border-slate-800 rounded-2xl p-4 mt-2 space-y-3">
                  <label className="text-[10px] font-bold text-slate-450 text-slate-450 uppercase tracking-widest block">Foto de Perfil</label>
                  
                  <div className="flex items-center gap-4">
                    {/* Circle Preview */}
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/40 bg-slate-900 flex-shrink-0 flex items-center justify-center">
                      <img 
                        src={registerAvatar} 
                        alt="Avatar Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 space-y-1 text-left">
                      <p className="text-[10px] text-slate-450 text-slate-400 leading-tight">Envie sua foto em formato JPG ou PNG</p>
                      
                      <label className="inline-flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Selecionar Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setRegisterAvatarFile(file);
                              const reader = new FileReader();
                              reader.onload = () => {
                                setRegisterAvatar(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTON */}
              <button
                type="submit"
                disabled={authFormLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-450 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition duration-300 transform hover:scale-[1.01] active:scale-100 flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-lg shadow-emerald-500/10"
              >
                {authFormLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <span>{showRegisterForm ? 'Finalizar Cadastro' : 'Entrar com E-mail'}</span>
                )}
              </button>
            </form>

            {/* TOGGLE OPTIONS */}
            <div className="pt-4 border-t border-slate-800 flex justify-center">
              {showRegisterForm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterForm(false);
                    setAuthFormError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition duration-200 flex items-center gap-1 cursor-pointer"
                >
                  Já possui login? <span className="text-emerald-400 font-bold hover:underline">Entre aqui</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterForm(true);
                    setAuthFormError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition duration-200 flex items-center gap-1 cursor-pointer"
                >
                  Novo no Savana Experience? <span className="text-emerald-400 font-bold hover:underline">Cadastre-se</span>
                </button>
              )}
            </div>
            
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              Autenticação Segura via Firebase Auth
            </p>
          </div>
        </div>

        {/* Guest Validation Access */}
        <button
          onClick={() => setShowCertificateValidator(true)}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 hover:text-white rounded-full text-xs font-semibold shadow-lg transition duration-205 cursor-pointer"
        >
          <Award size={14} className="text-emerald-450 text-emerald-400" />
          <span>Validar Autenticidade de Certificado</span>
        </button>

        {showCertificateValidator && (
          <CertificateValidator
            isOpen={showCertificateValidator}
            onClose={() => setShowCertificateValidator(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>
      
      {/* 1. BIOMETRIC VERIFICATION SECURITY INTERCEPTOR */}
      {showBiometricModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative">
            
            <div className="absolute top-4 right-4 text-emerald-400 font-mono text-[9px] uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              Secure Auth
            </div>

            <div className="mx-auto w-16 h-16 rounded-full bg-slate-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 relative overflow-hidden group">
              <Fingerprint size={32} className={`text-emerald-400 ${biometricScanning ? 'animate-pulse scale-110' : ''}`} />
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce" />
            </div>

            <h2 className="font-display text-lg font-bold text-slate-100 mb-2">
              Autenticação Biométrica Requerida
            </h2>
            
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Para maior privacidade e garantia de notas estudantis corporativas, verifique seu acesso utilizando TouchID/FaceID simulado.
            </p>

            <button
              onClick={executeScan}
              disabled={biometricScanning}
              className={`w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 ${
                biometricScanning 
                  ? 'bg-slate-800 text-slate-500' 
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20'
              }`}
            >
              {biometricScanning ? 'Escaneando Leitor...' : 'Escanear Biometria'}
            </button>

            <button
              onClick={() => {
                setBiometricVerified(true);
                setShowBiometricModal(false);
              }}
              className="text-[10px] text-slate-500 hover:text-slate-350 block underline mx-auto mt-4 font-mono uppercase"
            >
              Ignorar Encriptação (Teste Rápido)
            </button>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <header className={`sticky top-0 z-30 transition border-b ${
        theme === 'dark' 
          ? 'bg-slate-950/80 border-slate-900 backdrop-blur-md' 
          : 'bg-white/80 border-slate-200 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5">
            {biometricVerified && (
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 lg:hidden text-slate-350 hover:text-slate-100 transition"
              >
                <Menu size={20} />
              </button>
            )}
            <SavanaLogo className="w-9 h-9 hidden sm:block" />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-display font-black text-sm tracking-[0.08em] text-slate-100">
                  SAVANA
                </span>
                <span className="px-1.5 py-0.5 text-[8px] font-sans font-black italic tracking-wide text-emerald-400 border border-emerald-500/30 rounded bg-emerald-950/40">
                  EXPERIENCE
                </span>
              </div>
              <span className="block text-[7px] font-mono uppercase tracking-[0.18em] text-slate-400 mt-1">
                LMS Platform
              </span>
            </div>
          </div>

          {/* Center navigation */}
          {biometricVerified && (
            <nav className="hidden lg:flex items-center gap-1 bg-slate-900/50 p-1.5 rounded-xl border border-slate-850">
              <button
                onClick={() => { setActiveTab('dashboard'); setSelectedCourse(null); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'dashboard' 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dash
              </button>

              <button
                onClick={() => { setActiveTab('explore'); setSelectedCourse(null); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'explore' 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cursos
              </button>

              <button
                onClick={() => setActiveTab('forum')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'forum' 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fórum
              </button>

              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'leaderboard' 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ranks
              </button>

              <button
                onClick={() => setActiveTab('store')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  activeTab === 'store' 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gift size={14} className={activeTab === 'store' ? 'text-slate-950' : 'text-emerald-500'} />
                Loja
              </button>

              {currentUserRole === 'instructor' && (
                <button
                  onClick={() => setActiveTab('instructor')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'instructor' 
                      ? 'bg-emerald-500 text-slate-950' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Docente
                </button>
              )}

              {isSystemAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'admin' 
                      ? 'bg-blue-500 text-slate-950 font-bold' 
                      : 'text-blue-400 hover:text-blue-200'
                  }`}
                >
                  Admin
                </button>
              )}

              <button
                onClick={() => setActiveTab('classroom')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'classroom' 
                    ? 'bg-emerald-500 text-slate-950 font-bold' 
                    : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
                }`}
                id="btn-nav-classroom"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao Vivo
              </button>

              <button
                onClick={() => setShowCertificateValidator(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-350 hover:text-slate-100 bg-slate-950/60 border border-slate-850 hover:border-slate-750 transition flex items-center gap-1.5 cursor-pointer font-medium"
                title="Verificar validade de um Certificado de Conclusão"
                id="btn-nav-validate-certs"
              >
                <Award size={13} className="text-emerald-400" />
                <span>Validar</span>
              </button>
            </nav>
          )}

          {/* Right Control blocks */}
          <div className="flex items-center gap-3">
            
            {/* Real DB-Based user role badge indicator */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold flex items-center gap-1">
                {currentUserRole === 'instructor' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-400">Professor</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span className="text-slate-450">Aluno</span>
                  </>
                )}
              </span>
            </div>

            {/* Notification system widget */}
            <div className="relative">
              <button
                onClick={() => {
                  const nextState = !showNotificationDropdown;
                  setShowNotificationDropdown(nextState);
                  if (nextState && currentUserId) {
                    localDB.markAllNotificationsRead(currentUserId);
                  }
                }}
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl relative text-slate-350 transition flex items-center justify-center cursor-pointer"
                title="Notificações"
              >
                <Bell size={15} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold font-mono text-white ring-2 ring-slate-900 animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Dropdown Container */}
              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2.5 w-80 bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-4 z-40">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Notificações</span>
                    <button 
                      onClick={() => {
                        if (currentUserId) {
                          localDB.markAllNotificationsRead(currentUserId);
                        }
                      }}
                      className="text-[9px] font-mono text-emerald-400 hover:text-emerald-300 font-bold uppercase cursor-pointer"
                    >
                      Limpar Avisos
                    </button>
                  </div>

                  {currentUserId && (
                    <PushNotificationToggle currentUserId={currentUserId} />
                  )}
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-[10px] text-slate-500 font-mono text-center py-4">Nenhuma notificação por enquanto.</p>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`p-2.5 rounded-xl border transition-all ${
                            notif.read 
                              ? 'bg-slate-950/40 border-slate-850/40 opacity-70' 
                              : 'bg-emerald-500/5 border-emerald-500/20 shadow-sm shadow-emerald-500/2 font-medium'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[10px] font-bold block ${notif.read ? 'text-slate-300' : 'text-emerald-400'}`}>
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal mt-1">{notif.message}</p>
                          <span className="text-[8px] text-slate-500 font-mono block mt-1.5">
                            {new Date(notif.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>





            {/* User Profile / Logout Banner */}
            {authUser && (
              <div className="hidden md:flex items-center gap-2 border-l border-slate-800 pl-3">
                <img 
                  src={currentUserAvatar} 
                  alt="Profile" 
                  className="w-7 h-7 rounded-full border border-slate-800"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden lg:block text-left">
                  <span className="text-[10px] text-slate-300 font-bold block leading-none max-w-[80px] truncate">{currentUserName}</span>
                  <span className="text-[8px] text-slate-500 font-mono block tracking-tight max-w-[80px] truncate">{authUser.email}</span>
                </div>
                <button
                  onClick={async () => {
                    await logoutGmail();
                    alert("Acesso desconectado. Até breve!");
                  }}
                  className="text-[9px] uppercase tracking-wider font-mono font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded-md"
                  title="Sair da Conta"
                >
                  Sair
                </button>
              </div>
            )}

            {/* Student XP Badge Display */}
            {currentUserRole === 'student' && (
              <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                <Trophy size={14} className="text-emerald-400" />
                <div className="text-left font-mono">
                  <span className="text-[9px] text-emerald-400 block uppercase font-bold tracking-widest leading-none">Nível {activeUserLevel}</span>
                  <span className="text-xs font-bold font-mono text-slate-205">{activeUserPoints} XP</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* MOBILE SIDEBAR MENU */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative w-64 max-w-[80vw] bg-slate-950 border-r border-slate-800 flex flex-col pt-5 pb-4 shadow-2xl animate-fade-in-right">
            <div className="flex items-center justify-between px-4 mb-6">
              <div className="flex items-center gap-2">
                <SavanaLogo className="w-8 h-8" />
                <span className="font-display font-black text-sm tracking-[0.08em] text-slate-100">SAVANA</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              <button
                onClick={() => { setActiveTab('dashboard'); setSelectedCourse(null); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-3 text-sm font-semibold rounded-xl transition flex items-center gap-3 ${
                  activeTab === 'dashboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800 shrink-0">✨</span>
                Dashboard
              </button>
              
              <button
                onClick={() => { setActiveTab('explore'); setSelectedCourse(null); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-3 text-sm font-semibold rounded-xl transition flex items-center gap-3 ${
                  activeTab === 'explore' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800"><BookOpen size={14}/></span>
                Cursos
              </button>

              <button
                onClick={() => { setActiveTab('forum'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-3 text-sm font-semibold rounded-xl transition flex items-center gap-3 ${
                  activeTab === 'forum' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800"><MessageSquare size={14}/></span>
                Fórum de Turmas
              </button>

              <button
                onClick={() => { setActiveTab('leaderboard'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-3 text-sm font-semibold rounded-xl transition flex items-center gap-3 ${
                  activeTab === 'leaderboard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800"><Trophy size={14}/></span>
                Desafios & Ranks
              </button>

              <button
                onClick={() => { setActiveTab('store'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-3 text-sm font-semibold rounded-xl transition flex items-center gap-3 ${
                  activeTab === 'store' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800"><Gift size={14}/></span>
                Loja XP
              </button>
              
              {currentUserRole === 'instructor' && (
              <button
                onClick={() => { setActiveTab('instructor'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-3 text-sm font-semibold rounded-xl transition flex items-center gap-3 ${
                  activeTab === 'instructor' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800"><Award size={14}/></span>
                Área Docente
              </button>
              )}

              {isSystemAdmin && (
              <button
                onClick={() => { setActiveTab('admin'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-3 text-sm font-semibold rounded-xl transition flex items-center gap-3 ${
                  activeTab === 'admin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800"><ShieldCheck size={14}/></span>
                Painel Admin
              </button>
              )}

              <div className="pt-4 mt-4 border-t border-slate-800">
                <button
                  onClick={() => { setActiveTab('classroom'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-3 text-sm font-semibold rounded-xl transition flex items-center gap-3 ${
                    activeTab === 'classroom' 
                      ? 'bg-emerald-500 text-slate-950 font-bold' 
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center shrink-0">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </span>
                  Sala Ao Vivo
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => { setShowCertificateValidator(true); setIsMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-3 text-sm font-semibold rounded-xl bg-slate-950 border border-slate-900 text-slate-300 hover:text-white transition flex items-center gap-3 cursor-pointer"
                  id="btn-nav-mobile-validate-certs"
                >
                  <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">
                    <Award size={14} className="text-emerald-400" />
                  </span>
                  Validar Certificados
                </button>
              </div>
            </nav>
            
            {/* User Profile in Sidebar */}
            {authUser && (
              <div className="px-4 pt-4 border-t border-slate-800 mt-auto">
                <div className="flex items-center gap-3">
                  <img 
                    src={currentUserAvatar} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full border border-slate-800"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-300 font-bold block truncate">{currentUserName}</span>
                    <span className="text-[10px] text-slate-500 font-mono block truncate">{authUser.email}</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await logoutGmail();
                    alert("Acesso desconectado. Até breve!");
                  }}
                  className="w-full mt-4 text-[10px] uppercase tracking-wider font-mono font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg"
                >
                  Sair da Conta
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CORE WRAPPER BODY CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        


        {/* SCREEN SECTION CHANGER */}

        {/* DASHBOARD PAGE */}
        {activeTab === 'dashboard' && dbUser && (
          <StudentDashboard 
            courses={computedCourses}
            enrolledCourseIds={myRegistrations}
            user={dbUser}
            notifications={notifications}
            onNavigateToCourse={(course) => {
              setSelectedCourse(course);
              setActiveTab('explore');
            }}
          />
        )}

        {/* EXPLORE PAGE */}
        {activeTab === 'explore' && !selectedCourse && (
          <div className="space-y-8 animate-fade-in">
            {/* Hero promo block */}
            <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/10 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
              
              <div className="relative max-w-xl">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-2">
                   Educação • Conexão • Conservação
                </span>
                
                <h1 className="font-display text-2xl sm:text-4xl font-black text-slate-100 leading-tight">
                  Cursos em Medicina Veterinária, Biologia e Meio Ambiente.
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 mt-4 leading-relaxed">
                  Ganhe pontos de experiência (XP), resolva discussões de casos de patologia e diagnóstico funcional integrado, conquiste medalhas digitais e domine os cuidados sob rigorosa orientação científica de referência.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-6">
                  <span className="px-3.5 py-1.5 text-xs font-mono font-semibold bg-slate-950 text-slate-202 rounded-xl border border-slate-900">
                    🏆 +{activeUserPoints} XP Acumulados
                  </span>
                  <span className="px-3.5 py-1.5 text-xs font-mono font-semibold bg-emerald-400 text-slate-950 rounded-xl">
                    ⭐ Nível Estudantil {activeUserLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Courses Catalog listings */}
            <div>
              {/* Cursos Disponíveis */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-100">
                    Cursos Disponíveis
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Explore nossos treinamentos veterinários especializados nos 3 formatos oferecidos.</p>
                </div>

                {/* Format Filter Toggles */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-850 self-start sm:self-auto overflow-x-auto max-w-full scrollbar-none">
                  <button
                    id="filter-format-all"
                    onClick={() => setFormatFilter('all')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 ${
                      formatFilter === 'all' ? 'bg-emerald-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    id="filter-format-online"
                    onClick={() => setFormatFilter('online')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 ${
                      formatFilter === 'online' ? 'bg-rose-500 text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-450 animate-pulse" />
                    Ao Vivo
                  </button>
                  <button
                    id="filter-format-recorded"
                    onClick={() => setFormatFilter('recorded')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 flex items-center gap-1 ${
                      formatFilter === 'recorded' ? 'bg-indigo-600 text-indigo-150 font-extrabold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📼 Gravados
                  </button>
                  <button
                    id="filter-format-presencial"
                    onClick={() => setFormatFilter('presencial')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 flex items-center gap-1 ${
                      formatFilter === 'presencial' ? 'bg-amber-600 text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📍 Presenciais
                  </button>
                </div>
              </div>

              {computedCourses.filter(course => (formatFilter === 'all' || course.format === formatFilter) && course.type !== 'capsule').length === 0 ? (
                <div className="text-center py-12 bg-slate-900/40 border border-slate-850 rounded-2xl mb-12">
                  <p className="text-sm text-slate-400">Nenhum curso disponível neste formato no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {computedCourses
                    .filter(course => (formatFilter === 'all' || course.format === formatFilter) && course.type !== 'capsule')
                    .map(course => {
                      const isRegistered = myRegistrations.includes(course.id);

                      return (
                        <CourseCard
                          key={course.id}
                          course={course}
                          isRegistered={isRegistered}
                          onSelect={() => {
                            setSelectedCourse(course);
                            const mod = localDB.getModules().find(m => m.courseId === course.id);
                            if (mod && mod.lessons[0]) setSelectedLesson(mod.lessons[0]);
                          }}
                          onEnroll={(coupon) => {
                            setCheckoutCourse(course);
                            setAppliedCoupon(coupon || null);
                            setCheckoutStep('form');
                          }}
                          currentUserId={currentUserId}
                        />
                      );
                    })}
                </div>
              )}

              {/* Cápsulas de Conhecimento */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="text-blue-400" />
                    Cápsulas de Conhecimento
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Aprenda conteúdos rápidos, focados em tópicos essenciais e ganhe XP.</p>
                </div>
              </div>

              {computedCourses.filter(course => (formatFilter === 'all' || course.format === formatFilter) && course.type === 'capsule').length === 0 ? (
                <div className="text-center py-12 bg-slate-900/40 border border-slate-850 rounded-2xl">
                  <p className="text-sm text-slate-400">Nenhuma cápsula disponível neste formato no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {computedCourses
                    .filter(course => (formatFilter === 'all' || course.format === formatFilter) && course.type === 'capsule')
                    .map(course => {
                      const isRegistered = myRegistrations.includes(course.id);

                      return (
                        <CourseCard
                          key={course.id}
                          course={course}
                          isRegistered={isRegistered}
                          onSelect={() => {
                            setSelectedCourse(course);
                            const mod = localDB.getModules().find(m => m.courseId === course.id);
                            if (mod && mod.lessons[0]) setSelectedLesson(mod.lessons[0]);
                          }}
                          onEnroll={(coupon) => {
                            setCheckoutCourse(course);
                            setAppliedCoupon(coupon || null);
                            setCheckoutStep('form');
                          }}
                          currentUserId={currentUserId}
                        />
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PREMIUM COURSE LESSON CURRICULUM PLAYER */}
        {activeTab === 'explore' && selectedCourse && (
          <div className="space-y-6">
            <button 
              onClick={() => setSelectedCourse(null)}
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition"
            >
              ← Voltar para todos os cursos
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: Lesson presentation (Video / Article / Quiz) */}
              <div className="lg:col-span-2 space-y-4">
                
                {!hasAccess ? (
                  /* RENDER DETAILED SALES & LOCK SCREEN FOR UNPUBLISHED/UNREGISTERED USERS */
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left space-y-6">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-red-400 font-bold px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded">
                            Acesso Restrito
                          </span>
                          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                            Curso Premium
                          </span>
                        </div>
                        <h3 className="font-display text-2xl font-black text-slate-100">{selectedCourse.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{selectedCourse.description}</p>
                      </div>
                      <div className="bg-slate-950/85 border border-slate-800 px-5 py-3.5 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[140px] text-center shadow-lg">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Investimento</span>
                        <span className="text-xl font-bold text-emerald-400 font-display">{selectedCourse.price === 0 ? 'Gratuito' : selectedCourse.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="text-[9px] font-mono text-slate-450 mt-0.5 font-bold">Certificado Incluso</span>
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 ${selectedCourse.showBenefits ? 'md:grid-cols-2' : ''} gap-6 pt-2 font-sans`}>
                      {selectedCourse.showBenefits && (
                        <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                          <h4 className="font-display font-medium text-xs uppercase tracking-wider text-emerald-400 font-mono">✨ Benefícios Inclusos na Matrícula</h4>
                          <ul className="text-xs text-slate-350 space-y-3">
                            <li className="flex items-start gap-2.5">
                              <span className="text-emerald-500 text-sm mt-0.5">✔</span>
                              <div>
                                <strong className="text-slate-200 block">{selectedCourse.benefit1Title || 'Encontros Síncronos / Aulas ao Vivo'}</strong>
                                {selectedCourse.benefit1Desc || 'Aprenda em tempo real pelo painel interativo com câmeras e quadro negro do professor.'}
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="text-emerald-500 text-sm mt-0.5">✔</span>
                              <div>
                                <strong className="text-slate-200 block">{selectedCourse.benefit2Title || 'Grade Curricular Pedagógica'}</strong>
                                {selectedCourse.benefit2Desc || 'Selecione e assista aulas em vídeo, leia apostilas digitais e realize simulados.'}
                              </div>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <span className="text-emerald-500 text-sm mt-0.5">✔</span>
                              <div>
                                <strong className="text-slate-200 block">{selectedCourse.benefit3Title || 'Quizzes de Fixação com XP'}</strong>
                                {selectedCourse.benefit3Desc || 'Gabarite os testes práticos de cada módulo pedagógico para acumular pontos de XP.'}
                              </div>
                            </li>
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-col justify-between bg-slate-950/30 border border-slate-850/80 p-5 rounded-2xl">
                        <div className="space-y-3">
                          <h4 className="font-display font-medium text-xs uppercase tracking-wider text-slate-400 font-mono">Liberar agora</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {selectedCourse.saleType === 'whatsapp' 
                              ? 'Solicite sua vaga falando direto com nossos atendentes via WhatsApp e libere imediatamente suas matérias.'
                              : 'Realize a compra segura via Pix ou Cartão para liberar imediatamente todas as matérias gravadas e as agendas de transmissões online.'}
                          </p>
                        </div>

                        <div className="pt-6 space-y-3">
                          {selectedCourse.saleType === 'whatsapp' ? (
                            <a
                              href={`https://wa.me/${
                                selectedCourse.whatsappNumber 
                                  ? (selectedCourse.whatsappNumber.replace(/\D/g, '').length === 10 || selectedCourse.whatsappNumber.replace(/\D/g, '').length === 11)
                                    ? '55' + selectedCourse.whatsappNumber.replace(/\D/g, '')
                                    : selectedCourse.whatsappNumber.replace(/\D/g, '')
                                  : '5521971477755'
                              }?text=${encodeURIComponent(`Olá! Quero me matricular no curso "${selectedCourse.title}". Como procedo com a inscrição?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-emerald-500/10 transition flex items-center justify-center gap-2 cursor-pointer shadow-md text-center"
                            >
                              Falar no WhatsApp ({selectedCourse.price === 0 ? 'Gratuito' : selectedCourse.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                            </a>
                          ) : (
                            <button
                              onClick={() => {
                                setCheckoutCourse(selectedCourse);
                                setCheckoutStep('form');
                              }}
                              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-emerald-500/10 transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                            >
                              Matricular-se Agora ({selectedCourse.price === 0 ? 'Gratuito' : selectedCourse.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                            </button>
                          )}
                          <p className="text-[10px] text-center text-slate-500 font-mono">
                            {selectedCourse.saleType === 'whatsapp' 
                              ? '⚡ Atendimento imediato de segunda a sábado em horário comercial'
                              : '⚡ Compra aprovada instantaneamente via gateway criptografado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedLesson ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    
                    {/* Header info */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 block mb-1">AULA ATIVA</span>
                        <h3 className="font-display text-lg font-bold text-slate-100">{selectedLesson.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">{selectedLesson.description}</p>
                      </div>


                    </div>

                    {/* RENDER CONTENT BY LESSON TYPE */}

                    {selectedLesson.comingSoon ? (
                      <div className="space-y-4">
                        <div className="bg-slate-950/50 border border-slate-800/80 p-8 rounded-3xl flex flex-col items-center justify-center text-center animate-fade-in py-12">
                          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/20 animate-pulse">
                            <Clock size={28} className="text-amber-400" />
                          </div>
                          <h4 className="text-base font-bold text-slate-200 mb-2">Aula Gravada em Processamento 🎥</h4>
                          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                            Esta aula gravada ou material de apoio será disponibilizada em breve pelo professor. Fique atento(a), pois o conteúdo estará liberado nos próximos instantes para você assistir ou baixar!
                          </p>
                          <div className="mt-6 px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] text-slate-450 font-mono">
                            💡 Você pode continuar estudando outros módulos enquanto este conteúdo é finalizado.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {selectedLesson.type === 'video' && selectedLesson.videoUrl && (
                      <div className="space-y-4">
                        {/* Video Frame */}
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-inner border border-slate-805">
                          <SafeVideoPlayer videoUrl={selectedLesson.videoUrl} isEncrypted={selectedLesson.videoIsEncrypted} />
                        </div>

                        {/* Complete reward actions */}
                        <button
                          onClick={() => handleMarkLessonComplete(selectedLesson)}
                          disabled={completionCountdown !== null}
                          className={`w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                            completionCountdown !== null 
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          <CheckCircle2 size={16} />
                          {completionCountdown !== null 
                            ? `Avançando em ${completionCountdown}s...` 
                            : 'Marcar Aula como Concluída (+200 XP)'}
                        </button>
                      </div>
                    )}

                    {selectedLesson.type === 'article' && (
                      <div className="space-y-4">
                        <div className="bg-slate-950/50 border border-slate-850 p-5 rounded-2xl leading-relaxed text-xs text-slate-300 whitespace-pre-line prose max-w-none">
                          {selectedLesson.articleContent}
                        </div>

                        <button
                          onClick={() => handleMarkLessonComplete(selectedLesson)}
                          disabled={completionCountdown !== null}
                          className={`w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                            completionCountdown !== null 
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          <CheckCircle2 size={16} />
                          {completionCountdown !== null 
                            ? `Avançando em ${completionCountdown}s...` 
                            : 'Marcar Conclusão de Leitura (+200 XP)'}
                        </button>
                      </div>
                    )}

                    {selectedLesson.type === 'quiz' && selectedLesson.quiz && (
                      <div className="space-y-4">
                        <div className="bg-slate-950/40 p-4 border border-sand rounded-xl text-xs text-amber-300">
                          ⚠️ <strong>Teste de Módulo:</strong> Resolva todas as questões para conquistar +{selectedLesson.quiz.xpPoints} XP e liberar a medalha de Gabarito.
                        </div>

                        <form onSubmit={handleQuizSubmit} className="space-y-5 mt-4">
                          {selectedLesson.quiz.questions.map((q, qIndex) => (
                            <div key={q.id} className="p-4 bg-slate-950/50 rounded-xl border border-slate-850">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-450 block mb-1">Questão {qIndex + 1}</span>
                              <p className="text-xs font-semibold text-slate-200 mb-3">{q.text}</p>
                              
                              <div className="space-y-2">
                                {q.options.map((opt, optIndex) => (
                                  <label 
                                    key={optIndex} 
                                    className={`flex items-center gap-2 p-3 rounded-lg border text-xs cursor-pointer transition ${
                                      quizAnswers[qIndex] === optIndex 
                                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                                        : 'bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-850'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`q-${qIndex}`}
                                      checked={quizAnswers[qIndex] === optIndex}
                                      onChange={() => {
                                        const copy = [...quizAnswers];
                                        copy[qIndex] = optIndex;
                                        setQuizAnswers(copy);
                                      }}
                                      className="hidden"
                                    />
                                    <span className="w-5 h-5 rounded-full border border-slate-750 flex items-center justify-center text-[10px] font-mono shrink-0">
                                      {String.fromCharCode(65 + optIndex)}
                                    </span>
                                    {opt}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}

                          {quizSubmitted && quizSuccess === true && (
                            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs">
                              🏆 <strong>Fantástico!</strong> Você respondeu todas as questões perfeitamente. Pontos de experiência já foram creditados ao seu perfil.
                            </div>
                          )}

                          {quizSubmitted && quizSuccess === false && (
                            <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-xs">
                              ⚠️ Algumas respostas estão incorretas. Tente novamente para gabaritar e pontuar!
                            </div>
                          )}

                          <div className="flex gap-2">
                            {quizSubmitted && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuizAnswers([]);
                                  setQuizSubmitted(false);
                                  setQuizSuccess(null);
                                }}
                                className="px-4 py-3 bg-slate-850 hover:bg-slate-800 text-slate-210 text-xs font-semibold rounded-xl"
                              >
                                Refazer Teste
                              </button>
                            )}

                            <button
                              type="submit"
                              disabled={completionCountdown !== null}
                              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
                                completionCountdown !== null
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                              }`}
                            >
                              {completionCountdown !== null ? `Avançando em ${completionCountdown}s...` : 'Enviar Respostas do Quiz'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {selectedLesson.type === 'file' && (
                      <div className="space-y-4">
                        <div className="bg-slate-950/50 border border-slate-850 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                            <Download size={28} className="text-emerald-400" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-200 mb-2">{selectedLesson.fileName || 'Material Complementar'}</h4>
                          <p className="text-xs text-slate-400 mb-6 max-w-sm">
                            Este arquivo contém materiais de apoio para ampliar seus estudos. Clique abaixo para iniciar o download ou visualizá-lo em uma nova guia.
                          </p>
                          <a 
                            href={selectedLesson.fileUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={selectedLesson.fileName || 'Material Complementar'}
                            className="py-3 px-6 bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
                          >
                            <Download size={14} />
                            Fazer Download / Acessar Arquivo
                          </a>
                        </div>

                        <button
                          onClick={() => handleMarkLessonComplete(selectedLesson)}
                          disabled={completionCountdown !== null}
                          className={`w-full py-3.5 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                            completionCountdown !== null 
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          {completionCountdown !== null 
                            ? `Liberando próximo em ${completionCountdown}s...` 
                            : 'Marcar Material como Visto (+200 XP)'}
                        </button>
                      </div>
                    )}
                  </>
                )}

                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-850 rounded-3xl p-8 text-center text-slate-200">
                    {selectedCourse.format === 'online' ? (
                      <div className="max-w-md mx-auto space-y-5 py-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/15 animate-pulse">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-display font-rose font-bold text-sm text-slate-100 text-center">Curso Síncrono Ao Vivo Ativo</h4>
                          <p className="text-xs text-slate-400 leading-normal text-center">
                            Este treinamento é transmitido em tempo real pelo professor. Você pode interagir por chat, utilizar webcam e levantar a mão!
                          </p>
                        </div>

                        {selectedCourse.liveMeetLink && (
                          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-left space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
                            <div>
                              <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">TRANSMISSÃO COMPARTILHADA (MICROSOFT TEAMS)</span>
                              <p className="text-xs font-bold text-slate-200">
                                Próximo Encontro: {selectedCourse.liveClassDate ? new Date(selectedCourse.liveClassDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Horário não agendado'}
                              </p>
                            </div>
                            <a
                              href={selectedCourse.liveMeetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                alert("💡 IMPORTANTE:\nVocê NÃO precisa fazer login com e-mail no Microsoft Teams para entrar na aula ao vivo.\n\nBasta fechar qualquer aviso de login, escolher 'Entrar como convidado' (ou 'Entrar neste navegador') e digitar seu nome para acessar a sala!");
                              }}
                              className="w-full py-2.5 bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition text-center flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-lg"
                            >
                              Entrar pelo Microsoft Teams
                            </a>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 mt-2">
                          <button
                            onClick={() => setActiveTab('classroom')}
                            className="flex-1 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                          >
                            Entrar na Sala Interna
                          </button>
                        </div>
                        
                        <div className="text-[10px] text-slate-500 text-center font-mono uppercase">Ou selecione uma aula teórica gravada na barra lateral</div>
                      </div>
                    ) : (
                      <p className="text-slate-500">Selecione uma aula no cronograma lateral para começar seu aprendizado.</p>
                    )}
                  </div>
                )}

              </div>

              {/* Right Column: Instructor Profile & Lessons Index */}
              <div className="space-y-4">
                
                {/* Certificate Banner (if course concluded 100%) */}
                {(() => {
                  const courseModules = modules.filter(m => m.courseId === selectedCourse.id);
                  const lessons = courseModules.flatMap(m => (m.isLiveClass || m.isLive) 
                    ? [{ 
                        id: `live-session-${m.id}`, 
                        moduleId: m.id, 
                        title: `Aula Ao Vivo: ${m.title}`, 
                        description: m.description, 
                        order: 1, 
                        duration: '1h', 
                        type: 'video' 
                      } as any] 
                    : (m.lessons || [])
                  );
                  const prog = userProgress.find(p => p.courseId === selectedCourse.id);
                  const completedLessonsCount = lessons.filter(l => {
                    if (l.id.startsWith('live-session-')) {
                      const modId = l.id.replace('live-session-', '');
                      const mod = courseModules.find(m => m.id === modId);
                      if (mod && (mod.isLiveClass || mod.isLive) && !mod.isLive) {
                        return true;
                      }
                    }
                    return prog?.completedLessons.includes(l.id);
                  }).length;
                  const totalLessonsCount = lessons.length;
                  const isFinished = totalLessonsCount > 0 && completedLessonsCount === totalLessonsCount;

                  if (isFinished) {
                    return (
                      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden text-left mb-4">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
                        <div className="flex items-center gap-2 text-emerald-400 relative z-10">
                          <Award size={18} className="animate-bounce" />
                          <span className="text-[10px] tracking-widest font-mono uppercase font-black">Curso Concluído!</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-normal relative z-10">
                          Parabéns! Você completou toda a grade curricular de "{selectedCourse.title}". Seu Certificado de Especialista está pronto para emissão.
                        </p>
                        <button
                          onClick={() => setViewingCertificate(true)}
                          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] relative z-10 font-mono font-black shadow-md shadow-emerald-500/10"
                        >
                          <Award size={13} />
                          Emitir Certificado
                        </button>
                      </div>
                    );
                  }
                  
                  // If not finished, we can show a summary progress bar at the top of the sidebar
                  const percent = totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;
                  return (
                    <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 shadow-sm space-y-2 mb-4 text-left">
                      <div className="flex justify-between items-center text-[9px] font-mono">
                        <span className="text-slate-450 uppercase tracking-widest font-bold">SEU PROGRESSO</span>
                        <span className="text-emerald-400 font-bold">{percent}% ({completedLessonsCount}/{totalLessonsCount})</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Modules & Syllabus Index */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <h4 className="font-display font-medium text-xs text-slate-200 border-b border-slate-800 pb-3 mb-3.5 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-emerald-400" />
                    Grade Curricular
                  </h4>

                  <div className="space-y-4 text-left">
                    {localDB.getModules().filter(m => m.courseId === selectedCourse.id).map(mod => {
                      const prog = userProgress.find(p => p.courseId === selectedCourse.id);
                      const isLiveCompleted = (mod.isLiveClass || mod.isLive || mod.isMeet) && (prog?.completedLessons.includes(`live-session-${mod.id}`) || (!mod.isLive && !mod.isMeet));

                      return (
                        <div key={mod.id} className="space-y-2 border-b border-slate-900/60 pb-3 last:border-none">
                          <div className="space-y-1">
                            <span className="block text-[10px] uppercase font-mono tracking-wider font-semibold text-emerald-400">
                              {mod.title}
                            </span>
                            {(mod.isLiveClass || mod.isLive || mod.isMeet) && (
                              <div className="flex flex-col gap-0.5 mt-1">
                                {isLiveCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded font-mono uppercase w-fit">
                                    ✓ Presença Registrada & Aula Concluída
                                  </span>
                                ) : mod.isMeet ? (
                                  (() => {
                                    const now = new Date();
                                    const meetDateObj = mod.meetDateTime ? new Date(mod.meetDateTime) : null;
                                    const isSameDay = meetDateObj ? (
                                      now.getFullYear() === meetDateObj.getFullYear() &&
                                      now.getMonth() === meetDateObj.getMonth() &&
                                      now.getDate() === meetDateObj.getDate()
                                    ) : false;
                                    const isAtLeast15MinBefore = meetDateObj ? (
                                      now.getTime() >= meetDateObj.getTime() - (15 * 60 * 1000)
                                    ) : false;
                                    const canEnterMeet = isSameDay && isAtLeast15MinBefore;

                                    if (canEnterMeet) {
                                      return (
                                        <span className="inline-flex items-center gap-1 text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 font-bold px-2 py-0.5 rounded font-mono uppercase w-fit animate-pulse">
                                          🔴 AULA AO VIVO (TRANSMITINDO)
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="inline-flex items-center gap-1 text-[9px] bg-slate-500/15 text-slate-400 border border-slate-500/20 font-bold px-2 py-0.5 rounded font-mono uppercase w-fit">
                                          Aula no Microsoft Teams
                                        </span>
                                      );
                                    }
                                  })()
                                ) : mod.isLive ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 font-bold px-2 py-0.5 rounded font-mono uppercase w-fit animate-pulse">
                                    🔴 Aula Ao Vivo (Transmitindo)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-slate-500/15 text-slate-400 border border-slate-500/20 font-bold px-2 py-0.5 rounded font-mono uppercase w-fit">
                                    Aula Ao Vivo (Finalizada)
                                  </span>
                                )}
                                {(mod.liveDate || mod.meetDateTime) && (
                                  <span className="text-[10px] text-slate-400 font-mono font-medium block">
                                    📅 Começa em: {new Date(mod.liveDate || mod.meetDateTime!).toLocaleString('pt-BR')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        
                        <div className="space-y-2 pt-1.5">
                          {(mod.isLiveClass || mod.isLive || mod.isMeet) ? (
                            (() => {
                              const now = new Date();

                              if (mod.isMeet) {
                                const meetDateObj = mod.meetDateTime ? new Date(mod.meetDateTime) : null;
                                if (!meetDateObj) return null;

                                const isSameDay = now.getFullYear() === meetDateObj.getFullYear() &&
                                                  now.getMonth() === meetDateObj.getMonth() &&
                                                  now.getDate() === meetDateObj.getDate();
                                const isAtLeast15MinBefore = now.getTime() >= meetDateObj.getTime() - (15 * 60 * 1000);
                                const canEnterMeet = isSameDay && isAtLeast15MinBefore;

                                const openTime = new Date(meetDateObj.getTime() - 15 * 60 * 1000);
                                const openTimeStr = openTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                const meetDateStr = meetDateObj.toLocaleDateString('pt-BR');
                                const meetTimeStr = meetDateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                                if (isLiveCompleted) {
                                  return (
                                    <div className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-sans">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                        <div>
                                          <span className="font-bold text-[10px] block uppercase tracking-wider">Presença Confirmada</span>
                                          <span className="text-[9px] opacity-75 block">Parabéns por participar desta aula!</span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] bg-emerald-500/20 text-emerald-350 px-2 py-0.5 rounded font-mono font-bold">+200 XP</span>
                                    </div>
                                  );
                                }

                                return (
                                  <a
                                    href={canEnterMeet && hasAccess ? mod.meetLink : undefined}
                                    target={canEnterMeet && hasAccess ? "_blank" : undefined}
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      if (!hasAccess) return;
                                      if (!canEnterMeet) {
                                        e.preventDefault();
                                        if (!isSameDay) {
                                          alert(`A sala do Microsoft Teams está agendada para o dia ${meetDateStr} às ${meetTimeStr}.\nO acesso é liberado apenas no dia da aula, a partir de 15 minutos antes (às ${openTimeStr}).`);
                                        } else {
                                          alert(`A sala do Microsoft Teams será liberada hoje às ${openTimeStr} (15 minutos antes da aula marcada para as ${meetTimeStr}).\nPor favor, aguarde mais um momento.`);
                                        }
                                        return;
                                      }

                                      // Inform about how to enter Microsoft Teams
                                      alert("💡 IMPORTANTE:\nVocê NÃO precisa fazer login com e-mail no Microsoft Teams para entrar na aula ao vivo.\n\nBasta fechar qualquer aviso de login, escolher 'Entrar como convidado' (ou 'Entrar neste navegador') e digitar seu nome para acessar a sala!");

                                      // Log / claim completion XP for attendance on click
                                      if (currentUserRole === 'student') {
                                        const progId = `live-session-${mod.id}`;
                                        const prog = userProgress.find(p => p.courseId === selectedCourse.id);
                                        if (prog && !prog.completedLessons.includes(progId)) {
                                          const updatedCompleted = [...prog.completedLessons, progId];
                                          const updatedProg = {
                                            ...prog,
                                            completedLessons: updatedCompleted,
                                            xp: (prog.xp || 0) + 200
                                          };
                                          localDB.saveProgress(currentUserId, updatedProg);
                                          setUserProgress(prev => prev.map(p => p.id === prog.id ? updatedProg : p));
                                          setTimeout(() => {
                                            alert('✓ Presença registrada! Você ganhou +200 XP por participar da aula no Microsoft Teams.');
                                          }, 200);
                                        }
                                      }
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left font-sans select-none gap-2.5 ${
                                      canEnterMeet && hasAccess
                                        ? 'bg-rose-500 hover:bg-rose-400 border-rose-500 text-white shadow-lg shadow-rose-500/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                                        : !hasAccess
                                          ? 'opacity-65 cursor-not-allowed bg-slate-950/25 border-slate-800 text-slate-500'
                                          : 'bg-slate-950/40 border-slate-850 hover:bg-slate-955 hover:border-slate-800 text-slate-300 font-medium cursor-pointer'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Video className={`w-3.5 h-3.5 shrink-0 ${canEnterMeet ? 'text-white animate-pulse' : 'text-rose-500'}`} />
                                      <div className="truncate">
                                        <span className="font-bold text-xs block truncate uppercase tracking-wider">
                                          {canEnterMeet ? 'Acessar Sala Teams' : 'Aula no Microsoft Teams'}
                                        </span>
                                        <span className="text-[10px] opacity-75 block truncate">
                                          {canEnterMeet 
                                            ? 'Link liberado! Clique para entrar' 
                                            : `Permitido a partir das ${openTimeStr}`
                                          }
                                        </span>
                                      </div>
                                    </div>
                                    <ChevronRight size={14} className={canEnterMeet ? 'text-white/80' : 'text-slate-505'} />
                                  </a>
                                );
                              }

                              const liveDateObj = mod.liveDate ? new Date(mod.liveDate) : null;

                              if (isLiveCompleted) {
                                return (
                                  <div className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-sans">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                      <div>
                                        <span className="font-bold text-[10px] block uppercase tracking-wider">Presença Confirmada</span>
                                        <span className="text-[9px] opacity-75 block">Parabéns por participar desta aula!</span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-350 px-2 py-0.5 rounded font-mono font-bold">+200 XP</span>
                                  </div>
                                );
                              }

                              if (!mod.isLive) {
                                return (
                                  <div className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold text-center italic font-sans select-none flex items-center justify-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                                    Transmissão Off-line / Aula Encerrada
                                  </div>
                                );
                              }

                              if (!liveDateObj) return null;

                              const isSameDay = now.getFullYear() === liveDateObj.getFullYear() &&
                                                now.getMonth() === liveDateObj.getMonth() &&
                                                now.getDate() === liveDateObj.getDate();
                              const isAtLeast15MinBefore = now.getTime() >= liveDateObj.getTime() - (15 * 60 * 1000);
                              const canEnterLive = isSameDay && isAtLeast15MinBefore;

                              const openTime = new Date(liveDateObj.getTime() - 15 * 60 * 1000);
                              const openTimeStr = openTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                              const liveDateStr = liveDateObj.toLocaleDateString('pt-BR');
                              const liveTimeStr = liveDateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                              return (
                                <button
                                  disabled={!hasAccess}
                                  onClick={() => {
                                    if (!hasAccess) return;
                                    if (canEnterLive) {
                                      // Pre-fill auto-join data so Classroom immediately enters the room
                                      sessionStorage.setItem('savanaxp_classroom_auto_join', JSON.stringify({ 
                                        moduleId: mod.id, 
                                        roomId: mod.liveRoomId || `room-${mod.id}` 
                                      }));
                                      setActiveTab('classroom');
                                    } else {
                                      if (!isSameDay) {
                                        alert(`A sala virtual está agendada para o dia ${liveDateStr} às ${liveTimeStr}.\nO acesso é liberado apenas no dia da aula, a partir de 15 minutos antes (às ${openTimeStr}).`);
                                      } else {
                                        alert(`A aula será hoje às ${liveTimeStr}.\nO acesso estará disponível a partir das ${openTimeStr} (15 minutos de antecedência).`);
                                      }
                                    }
                                  }}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left font-sans select-none gap-2.5 ${
                                    canEnterLive && hasAccess
                                      ? 'bg-rose-500 hover:bg-rose-400 border-rose-500 text-white shadow-lg shadow-rose-500/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                                      : !hasAccess
                                        ? 'opacity-65 cursor-not-allowed bg-slate-950/25 border-slate-800 text-slate-500'
                                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-955 hover:border-slate-800 text-slate-300 font-medium cursor-pointer'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Video className={`w-3.5 h-3.5 shrink-0 ${canEnterLive ? 'text-white animate-pulse' : 'text-rose-500'}`} />
                                    <div className="truncate">
                                      <span className="font-bold text-xs block truncate uppercase tracking-wider">
                                        {canEnterLive ? 'Acessar Sala Virtual' : 'Aula ao Vivo'}
                                      </span>
                                      <span className="text-[10px] opacity-75 block truncate">
                                        {canEnterLive 
                                          ? 'Transmissão ativa! Clique para entrar' 
                                          : `Permitido a partir das ${openTimeStr}`
                                        }
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronRight size={14} className={canEnterLive ? 'text-white/80' : 'text-slate-505'} />
                                </button>
                              );
                            })()
                          ) : (
                            mod.lessons.map(less => {
                              const isActive = selectedLesson?.id === less.id;
                              const progressList = userProgress;
                              const currentUserProgress = progressList.find(p => p.courseId === selectedCourse?.id);
                              const isCompleted = currentUserProgress?.completedLessons.includes(less.id) || false;
                              
                              return (
                                <button
                                  key={less.id}
                                  disabled={!hasAccess}
                                  onClick={() => {
                                    setSelectedLesson(less);
                                    setQuizAnswers([]);
                                    setQuizSubmitted(false);
                                    setQuizSuccess(null);
                                  }}
                                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-left transition select-none ${
                                    isActive && hasAccess
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                      : !hasAccess
                                        ? 'opacity-65 cursor-not-allowed bg-slate-950/25 text-slate-500 hover:text-slate-500 border border-transparent'
                                        : 'hover:bg-slate-950 text-slate-400 border border-transparent'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate font-sans">
                                    {!hasAccess ? (
                                      <span className="text-slate-500 shrink-0 text-[10px]" title="Acesso bloqueado - Faça a matrícula">🔒</span>
                                    ) : isCompleted ? (
                                      <CheckCircle2 size={12} className="text-emerald-400" />
                                    ) : (
                                      <Play size={10} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
                                    )}
                                    {less.title}
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-500 shrink-0">
                                    {less.comingSoon ? (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-[8px] uppercase tracking-wider animate-pulse">Em Breve</span>
                                    ) : (
                                      less.duration
                                    )}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* FORUM SCREEN */}
        {activeTab === 'forum' && (
          <Forum 
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserRole={currentUserRole}
          />
        )}

        {/* GAMIFICATION/LEADERBOARD SCREEN */}
        {activeTab === 'leaderboard' && (
          <Leaderboard 
            currentUserId={currentUserId}
            users={allLeaderboard}
          />
        )}

        {/* STORE/REWARDS SCREEN */}
        {activeTab === 'store' && (
          <Store
            currentUserId={currentUserId}
            rewards={rewards}
            userXp={allLeaderboard.find(u => u.userId === currentUserId)?.xp || 0}
            onRedeem={() => {
              setAllLeaderboard(localDB.getLeaderboard());
            }}
          />
        )}

        {/* TEACHER INSTRUCTOR ADMIN PANEL */}
        {activeTab === 'instructor' && currentUserRole === 'instructor' && (
          <InstructorPanel 
            currentUserId={currentUserId}
            isSystemAdmin={isSystemAdmin}
            courses={courses}
            onUpdateCourses={updateCoursesFromLocal}
          />
        )}

        {/* GENERAL ADMINISTRATION PANEL */}
        {activeTab === 'admin' && isSystemAdmin && (
          <AdminPanel 
            allUsers={allLeaderboard}
            onUpdateRole={handleUpdateRole}
            currentUserId={currentUserId}
            courses={courses}
          />
        )}

        {/* ONLINE CLASSROOM SCREEN */}
        {activeTab === 'classroom' && (
          <Classroom 
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserRole={currentUserRole}
            myRegistrations={myRegistrations}
          />
        )}

      </main>

      {/* 2. PAYMENT GATEWAY CHECKOUT OVERLAY (SECURE CHANNELS) */}
      {checkoutCourse && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            
            {/* Design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />

            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-400 font-bold block mb-1">PROCESSO DE COMPRA</span>
                <h3 className="font-display text-lg font-extrabold text-slate-100">Checkout Seguro Savana Experience</h3>
              </div>
              
              <button
                onClick={() => setCheckoutCourse(null)}
                className="text-slate-400 hover:text-slate-100 p-1 bg-slate-950 rounded border border-slate-800"
              >
                Cancelar
              </button>
            </div>

            {checkoutStep === 'form' ? (
              <form onSubmit={confirmPayment} className="space-y-4">
                
                {/* Course preview badge inside invoice */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500">Produto</span>
                    <span className="block text-xs font-semibold text-slate-205 line-clamp-1">{checkoutCourse.title}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase">Preço</span>
                    {appliedCoupon ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 line-through leading-none mb-0.5">
                          {checkoutCourse.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-xs font-bold text-emerald-400 leading-none">
                          {(checkoutCourse.price * (1 - (appliedCoupon.discountPercentage || 0) / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-[9px] text-amber-400 font-mono mt-1">
                          🏷️ {appliedCoupon.couponCode} (-{appliedCoupon.discountPercentage}%)
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400">
                        {checkoutCourse.price === 0 ? 'Gratuito' : checkoutCourse.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-4 text-center">
                  {checkoutCourse.price === 0 ? (
                    <p className="text-[11px] text-slate-400">Excelente! Este é um curso gratuito mantido pela Savana Experience. Clique abaixo para garantir sua vaga imediatamente.</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Você será redirecionado para o nosso parceiro de pagamentos totalmente seguro para concluir a transação via cartão de crédito ou pix mantendo todos os seus dados criptografados.</p>
                  )}
                </div>

                <div className="text-center text-[10px] text-slate-500 font-mono">
                  🔒 Conexão garantida 100% segura por parceiro financeiro global.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/10"
                >
                  {(checkoutCourse.price === 0 || (appliedCoupon && (checkoutCourse.price * (1 - (appliedCoupon.discountPercentage || 0) / 100)) === 0)) ? 'Confirmar Matrícula' : 'Ir para Pagamento Seguro'}
                </button>
              </form>
            ) : (
              /* Payment approved success state */
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <ShieldCheck size={24} />
                </div>
                
                <div>
                  <h4 className="font-display font-black text-slate-100">Transação Aprovada!</h4>
                  <p className="text-xs text-slate-400 mt-2.5">O curso foi liberado em sua biblioteca de estudos. Prepare-se para seu próximo nível profissional!</p>
                </div>

                <button
                  onClick={() => {
                    setCheckoutCourse(null);
                    setCheckoutStep('form');
                    setCardNumber('');
                    setCardHolder('');
                    setCardCVV('');
                  }}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition"
                >
                  Começar a Estudar Agora
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* FLOAT SUPPORT CHAT MESSAGE INTERPRET */}
      {biometricVerified && (
        <SupportChat 
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
        />
      )}

      {viewingCertificate && selectedCourse && (
        <CertificateModal
          isOpen={viewingCertificate}
          onClose={() => setViewingCertificate(false)}
          userId={currentUserId}
          studentName={currentUserName}
          courseTitle={selectedCourse.title}
          instructorName={selectedCourse.instructorName || "Coordenador Docente"}
          courseId={selectedCourse.id}
          duration={selectedCourse.totalDuration || "40 horas"}
          xpReward={selectedCourse.xpReward || 500}
        />
      )}

      {showCertificateValidator && (
        <CertificateValidator
          isOpen={showCertificateValidator}
          onClose={() => setShowCertificateValidator(false)}
        />
      )}

    </div>
  );
}
