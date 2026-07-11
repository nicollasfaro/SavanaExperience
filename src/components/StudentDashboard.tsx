import React, { useState, useEffect } from 'react';
import { Course, LeaderboardUser, NotificationItem, ForumThread } from '../types';
import { 
  BookOpen, Activity, Star, Calendar, Edit2, X, Camera, Loader2, Check, Award,
  Heart, MessageSquare, Send, Users, UserPlus, UserMinus, Flame, RefreshCw, Trash2,
  Sparkles, Target, Trophy, Gift, Zap, CheckCircle2, Circle
} from 'lucide-react';
import { CourseCard } from './CourseCard';
import { updateUserProfile, localDB } from '../firebase';
import { CertificateModal } from './CertificateModal';
import { UserProfileModal } from './UserProfileModal';

interface StudentDashboardProps {
  courses: Course[];
  enrolledCourseIds: string[];
  user: LeaderboardUser;
  notifications: NotificationItem[];
  onNavigateToCourse: (course: Course) => void;
}

export function StudentDashboard({ courses, enrolledCourseIds, user, notifications, onNavigateToCourse }: StudentDashboardProps) {
  const myCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
  
  // Calculate upcoming Microsoft Teams live meetings (both course-level and module-level)
  const upcomingEvents = (() => {
    const events: Array<{
      id: string;
      title: string;
      courseName: string;
      link: string;
      date: Date;
    }> = [];

    // 1. Course-level events
    courses.forEach(c => {
      if (enrolledCourseIds.includes(c.id) && c.liveMeetLink && c.liveClassDate) {
        const dateObj = new Date(c.liveClassDate);
        events.push({
          id: `course-event-${c.id}`,
          title: `Aula Geral ao Vivo: ${c.title}`,
          courseName: c.title,
          link: c.liveMeetLink,
          date: dateObj,
        });
      }
    });

    // 2. Module-level events
    try {
      const allModules = localDB.getModules() || [];
      allModules.forEach(m => {
        if (enrolledCourseIds.includes(m.courseId) && m.isMeet && m.meetLink && m.meetDateTime) {
          const dateObj = new Date(m.meetDateTime);
          const course = courses.find(c => c.id === m.courseId);
          events.push({
            id: `module-event-${m.id}`,
            title: m.title,
            courseName: course?.title || 'Curso',
            link: m.meetLink,
            date: dateObj,
          });
        }
      });
    } catch (e) {
      console.warn("Could not retrieve modules for live events:", e);
    }

    // Filter events happening today or in the future
    const now = new Date();
    const limitTime = now.getTime() - (3 * 60 * 60 * 1000); // Keep ongoing events visible for up to 3 hours after start

    return events
      .filter(ev => ev.date.getTime() >= limitTime)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  })();

  // Fake recent activity from notifications
  const recentActivity = notifications.slice(0, 5);
  
  const totalXp = user.totalXp !== undefined ? user.totalXp : user.xp;
  const currentLevelXp = totalXp % 1000;
  const progressPercent = Math.min((currentLevelXp / 1000) * 100, 100);

  // States for Profile Editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editAvatarPreview, setEditAvatarPreview] = useState(user.avatar || '');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Certificate Modal State
  const [selectedCertCourse, setSelectedCertCourse] = useState<Course | null>(null);

  // Course Review/Evaluation States
  const [selectedReviewCourse, setSelectedReviewCourse] = useState<Course | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [confirmDeleteMyReview, setConfirmDeleteMyReview] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showLocalToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Initialize and reconcile Daily Quests on mount, when user changes, or when config changes
  useEffect(() => {
    localDB.getOrInitializeDailyQuests(user.userId);

    const unsubConfig = localDB.onChange('dailyQuestsConfig', () => {
      localDB.getOrInitializeDailyQuests(user.userId);
    });

    return () => {
      unsubConfig();
    };
  }, [user.userId]);

  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleClaimReward = async (questId: string) => {
    setClaimingQuestId(questId);
    try {
      const success = await localDB.claimDailyQuestReward(user.userId, questId);
      if (success) {
        showLocalToast("Parabéns! Recompensa resgatada com sucesso.", "success");
      } else {
        showLocalToast("Não foi possível resgatar a recompensa.", "error");
      }
    } catch (err) {
      console.error(err);
      showLocalToast("Erro ao resgatar recompensa.", "error");
    } finally {
      setClaimingQuestId(null);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await localDB.incrementDailyQuestProgress(user.userId, 'checkin', 1);
      showLocalToast("Presença Diária registrada! Missão concluída.", "success");
    } catch (err) {
      console.error(err);
      showLocalToast("Erro ao registrar presença.", "error");
    } finally {
      setCheckingIn(false);
    }
  };

  const dailyQuests = user.dailyQuests?.quests || [];
  const totalPossibleXP = dailyQuests.reduce((sum, q) => sum + (q.xpReward || 0), 0);

  // Synchronize previously saved rating and comment
  useEffect(() => {
    if (selectedReviewCourse) {
      setConfirmDeleteMyReview(false);
      const reviews = selectedReviewCourse.reviews || [];
      const existing = reviews.find(r => r.userId === user.userId && !r.deleted);
      if (existing) {
        if (existing.pendingEdit) {
          setReviewRating(existing.pendingEdit.rating);
          setReviewComment(existing.pendingEdit.comment || '');
        } else {
          setReviewRating(existing.rating);
          setReviewComment(existing.comment || '');
        }
      } else {
        setReviewRating(5);
        setReviewComment('');
      }
    }
  }, [selectedReviewCourse, user.userId]);

  const hasRated = (course: Course) => {
    return (course.reviews || []).some(r => r.userId === user.userId && !r.deleted);
  };

  const handleSaveReview = async () => {
    if (!selectedReviewCourse) return;
    
    // Check if evaluation was created more than 24h ago
    const reviews = selectedReviewCourse.reviews || [];
    const existingReview = reviews.find(r => r.userId === user.userId && !r.deleted);
    const isPast24Hours = existingReview && existingReview.createdAt 
      ? (Date.now() - new Date(existingReview.createdAt).getTime()) > 24 * 60 * 60 * 1000 
      : false;

    if (isPast24Hours) {
      showLocalToast("Esta avaliação foi criada há mais de 24 horas e não pode ser editada.", "error");
      setSelectedReviewCourse(null);
      return;
    }

    setSavingReview(true);
    try {
      // Clean up any previously deleted reviews for this user to avoid duplicates
      const activeReviews = reviews.filter(r => !(r.userId === user.userId && r.deleted));
      const existingIndex = activeReviews.findIndex(r => r.userId === user.userId);
      
      let updatedReviews = [...activeReviews];
      if (existingIndex >= 0) {
        const existingReview = activeReviews[existingIndex];
        if (existingReview.approved === true) {
          // If already approved, edit goes to pendingEdit so the old one remains active
          updatedReviews[existingIndex] = {
            ...existingReview,
            pendingEdit: {
              rating: reviewRating,
              comment: reviewComment,
              createdAt: new Date().toISOString()
            }
          };
        } else {
          // If not approved yet (pending), just overwrite it normally
          updatedReviews[existingIndex] = {
            ...existingReview,
            rating: reviewRating,
            comment: reviewComment,
            createdAt: new Date().toISOString(),
            approved: false
          };
        }
      } else {
        // Brand new review
        const newReview = {
          userId: user.userId,
          userName: user.name,
          userAvatar: user.avatar,
          rating: reviewRating,
          comment: reviewComment,
          createdAt: new Date().toISOString(),
          approved: false
        };
        updatedReviews.push(newReview);
      }
      
      const approvedReviews = updatedReviews.filter(r => r.approved === true && !r.deleted);
      const averageRating = approvedReviews.length > 0
        ? parseFloat((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
        : (selectedReviewCourse.rating || 4.8);
      
      const updatedCourse: Course = {
        ...selectedReviewCourse,
        reviews: updatedReviews,
        rating: averageRating
      };
      
      await localDB.saveCourse(updatedCourse);
      
      if (existingIndex < 0) {
        await localDB.updateLeaderboardXP(user.userId, 20);
        showLocalToast("Avaliação salva com sucesso! Você ganhou +20 XP! 🎉", "success");
      } else {
        const wasApproved = reviews[existingIndex]?.approved === true;
        if (wasApproved) {
          showLocalToast("Edição enviada para aprovação do administrador! A avaliação antiga continuará visível até lá.", "info");
        } else {
          showLocalToast("Avaliação atualizada com sucesso e enviada para aprovação!", "success");
        }
      }
      
      setSelectedReviewCourse(null);
    } catch (err) {
      console.error("Error saving course review:", err);
      showLocalToast("Erro ao salvar avaliação.", "error");
    } finally {
      setSavingReview(false);
    }
  };

  const handleDeleteMyReview = async () => {
    if (!selectedReviewCourse) return;

    const reviews = selectedReviewCourse.reviews || [];
    const existingReview = reviews.find(r => r.userId === user.userId && !r.deleted);
    const isPast24Hours = existingReview && existingReview.createdAt 
      ? (Date.now() - new Date(existingReview.createdAt).getTime()) > 24 * 60 * 60 * 1000 
      : false;

    if (isPast24Hours) {
      showLocalToast("Esta avaliação foi criada há mais de 24 horas e não pode ser excluída.", "error");
      setSelectedReviewCourse(null);
      return;
    }

    setSavingReview(true);
    try {
      const updatedReviews = reviews.map(r => {
        if (r.userId === user.userId && !r.deleted) {
          return { ...r, deleted: true, deletedAt: new Date().toISOString() };
        }
        return r;
      });

      const approvedReviews = updatedReviews.filter(r => r.approved === true && !r.deleted);
      const averageRating = approvedReviews.length > 0
        ? parseFloat((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
        : (selectedReviewCourse.rating || 4.8);

      const updatedCourse: Course = {
        ...selectedReviewCourse,
        reviews: updatedReviews,
        rating: averageRating
      };

      await localDB.saveCourse(updatedCourse);
      showLocalToast("Avaliação removida com sucesso e enviada para a lixeira!", "success");
      setSelectedReviewCourse(null);
    } catch (err) {
      console.error("Error deleting course review:", err);
      showLocalToast("Erro ao excluir avaliação.", "error");
    } finally {
      setSavingReview(false);
      setConfirmDeleteMyReview(false);
    }
  };

  // SAVANA SOCIAL NETWORKING STATES
  const [socialFeed, setSocialFeed] = useState<ForumThread[]>([]);
  const [allLeaderboardUsers, setAllLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [newPostText, setNewPostText] = useState('');
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'following'>('all');
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentTextState, setCommentTextState] = useState<Record<string, string>>({});
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);

  // Real-time synchronization
  useEffect(() => {
    const syncSocial = () => {
      setSocialFeed(localDB.getForumThreads());
      setAllLeaderboardUsers(localDB.getLeaderboard());
    };

    syncSocial();

    const unsubThreads = localDB.onChange('threads', syncSocial);
    const unsubLeaderboard = localDB.onChange('leaderboard', syncSocial);

    return () => {
      unsubThreads();
      unsubLeaderboard();
    };
  }, []);

  // Post social status update
  const handleCreateSocialPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    const newPost: ForumThread = {
      id: `social-${Date.now()}`,
      courseId: 'general',
      title: '', // Category 'social' posts don't need academic titles
      content: newPostText.trim(),
      authorId: user.userId,
      authorName: user.name,
      authorRole: user.role,
      createdAt: new Date().toISOString(),
      category: 'social',
      likes: 0,
      replies: []
    };

    await localDB.saveForumThread(newPost);
    setNewPostText('');
  };

  // Like a social post
  const handleLikePost = async (post: ForumThread) => {
    const isLiked = post.likes > 0;
    const updatedPost: ForumThread = {
      ...post,
      likes: isLiked ? post.likes - 1 : post.likes + 1
    };
    await localDB.saveForumThread(updatedPost);
  };

  // Add a reply comment to a social post
  const handleAddComment = async (postId: string) => {
    const text = commentTextState[postId] || '';
    if (!text.trim()) return;

    const post = socialFeed.find(p => p.id === postId);
    if (post) {
      const newReply = {
        id: `reply-${Date.now()}`,
        threadId: postId,
        content: text.trim(),
        authorId: user.userId,
        authorName: user.name,
        authorRole: user.role,
        createdAt: new Date().toISOString()
      };

      const updatedPost: ForumThread = {
        ...post,
        replies: [...(post.replies || []), newReply]
      };

      await localDB.saveForumThread(updatedPost);
      setCommentTextState(prev => ({ ...prev, [postId]: '' }));
    }
  };

  const handleDeletePost = async (postId: string) => {
    await localDB.deleteForumThread(postId);
    setConfirmDeletePostId(null);
  };

  const handleOpenModal = () => {
    setEditName(user.name);
    setEditAvatarPreview(user.avatar || '');
    setEditAvatarFile(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('O arquivo da foto de perfil deve ser menor que 5MB.');
        return;
      }
      setEditAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setEditAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setErrorMsg('O nome de perfil não pode estar vazio.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateUserProfile(user.userId, editName.trim(), editAvatarFile || editAvatarPreview);
      setSuccessMsg('Perfil atualizado com sucesso!');
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Não foi possível atualizar o perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Profile Summary */}
      <div className="bg-slate-950 border border-slate-850 p-6 md:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Activity size={200} />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0 overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-3xl font-bold text-emerald-950">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center md:justify-start">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-100">{user.name}</h2>
              <button 
                onClick={handleOpenModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-850 transition-all cursor-pointer self-center"
                id="btn-edit-profile-trigger"
              >
                <Edit2 size={11} />
                <span>Editar Perfil</span>
              </button>
            </div>
            <p className="text-sm text-slate-400 font-mono mt-1">Bem-vindo(a) de volta ao seu painel principal.</p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl w-full md:w-64">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Level {user.level}</span>
              <span className="text-xs text-emerald-400 font-bold">{currentLevelXp} / 1000 XP</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden mb-1.5">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>Total: {totalXp} XP</span>
              <span className="text-amber-400 font-bold">Saldo p/ Loja: {user.xp} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: My Courses */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Próximas Aulas ao Vivo Section */}
          {upcomingEvents.length > 0 && (
            <div className="bg-slate-950 border border-slate-850 p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Calendar className="text-emerald-400" size={20} />
                  <h3 className="font-display text-lg font-bold text-slate-100">Próximas Aulas ao Vivo (Teams)</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase">
                  {upcomingEvents.length} {upcomingEvents.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                Clique para acessar as transmissões ao vivo agendadas no Microsoft Teams. Não é necessário fazer login com e-mail no aplicativo do Teams para assistir!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {upcomingEvents.map(event => {
                  const dateStr = event.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const timeStr = event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div 
                      key={event.id}
                      className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300 group shadow-lg"
                    >
                      <div className="space-y-2">
                        <span className="inline-block text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded-lg border border-indigo-550/20 uppercase max-w-full truncate">
                          {event.courseName}
                        </span>
                        <h4 className="text-sm font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                          {event.title}
                        </h4>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 pt-1">
                          <span>📅 {dateStr} às {timeStr}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-1">
                        <a
                          href={event.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            alert("💡 IMPORTANTE:\nVocê NÃO precisa fazer login com e-mail no Microsoft Teams para entrar na aula ao vivo.\n\nBasta fechar qualquer aviso de login, escolher 'Entrar como convidado' (ou 'Entrar neste navegador') e digitar seu nome para acessar a sala!");
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition duration-300 shadow hover:shadow-lg text-center cursor-pointer hover:scale-[1.01]"
                        >
                          Entrar na Sala (Teams)
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cursos Matriculados block */}
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="text-emerald-500" size={20} />
            <h3 className="font-display text-xl font-bold text-slate-100">Cursos Matriculados</h3>
          </div>
          
          {myCourses.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/50 border border-slate-850 border-dashed rounded-2xl">
              <p className="text-slate-500 text-sm">Você ainda não está matriculado em nenhum curso.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCourses.map(course => {
                const progressList = localDB.getProgress(user.userId);
                const prog = progressList.find(p => p.courseId === course.id);
                const courseModules = localDB.getModules().filter(m => m.courseId === course.id);
                const lessons = courseModules.flatMap(m => (m.isLiveClass || m.isLive || m.isMeet) 
                  ? [{ 
                      id: `live-session-${m.id}`, 
                      moduleId: m.id, 
                      title: m.isMeet ? `Microsoft Teams: ${m.title}` : `Aula Ao Vivo: ${m.title}`, 
                      description: m.description, 
                      order: 1, 
                      duration: '1h', 
                      type: 'video' as const
                    }] 
                  : (m.lessons || [])
                );
                const completedCount = lessons.filter(l => {
                  if (l.id.startsWith('live-session-')) {
                    const modId = l.id.replace('live-session-', '');
                    const mod = courseModules.find(m => m.id === modId);
                    if (mod && (mod.isLiveClass || mod.isLive || mod.isMeet) && !mod.isLive) {
                      return true;
                    }
                  }
                  return prog?.completedLessons.includes(l.id);
                }).length;
                const totalLessonsCount = lessons.length;
                const isCourseCompleted = totalLessonsCount > 0 && completedCount === totalLessonsCount;
                const percent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

                const isPendingEvaluation = !hasRated(course);

                return (
                  <div 
                    key={course.id} 
                    className={`bg-slate-900 rounded-3xl overflow-hidden flex flex-col justify-between group transition-all duration-300 relative ${
                      isPendingEvaluation 
                        ? "border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/20" 
                        : "border border-slate-800 hover:border-emerald-500/30"
                    }`}
                  >
                    {isPendingEvaluation && (
                      <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[9px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1 animate-pulse">
                        <Star size={10} className="fill-slate-950 text-slate-950" />
                        <span>Avaliar (+20 XP)</span>
                      </div>
                    )}
                    <div className="cursor-pointer flex-1" onClick={() => onNavigateToCourse(course)}>
                      <CourseCard 
                        course={course} 
                        isRegistered={true} 
                        onSelect={() => onNavigateToCourse(course)} 
                        onEnroll={() => {}} 
                        currentUserId={user.userId}
                      />
                    </div>
                    
                    {/* Course completion status or action */}
                    <div className="p-4 border-t border-slate-850 bg-slate-950/20 flex flex-col gap-2 relative z-10">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400">Progresso de aulas:</span>
                        <span className={isCourseCompleted ? "text-emerald-400 font-bold" : "text-slate-350"}>
                          {isCourseCompleted ? "Completo 🎉" : `${percent}% (${completedCount}/${totalLessonsCount})`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isCourseCompleted ? "bg-gradient-to-r from-emerald-400 to-teal-500" : "bg-emerald-400"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      
                      {isCourseCompleted ? (
                        <div className="flex flex-col gap-1.5 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCertCourse(course);
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 text-[10px] uppercase font-mono font-black tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.01]"
                          >
                            <Award size={12} />
                            Emitir Certificado
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReviewCourse(course);
                            }}
                            className={`w-full py-2 text-[10px] uppercase font-mono font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                              isPendingEvaluation
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/35"
                                : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
                            }`}
                          >
                            <Star size={11} className="text-amber-400 fill-amber-400" />
                            {hasRated(course) ? "Sua Avaliação (Editar)" : "Avaliar Curso (+20 XP)"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 mt-1">
                          <button
                            onClick={() => onNavigateToCourse(course)}
                            className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white text-[10px] uppercase font-mono font-bold tracking-wider rounded-lg transition-all border border-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            Continuar Estudos →
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReviewCourse(course);
                            }}
                            className={`w-full py-2 text-[10px] uppercase font-mono font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                              isPendingEvaluation
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/35 animate-pulse"
                                : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
                            }`}
                          >
                            <Star size={11} className="text-amber-400 fill-amber-400" />
                            {hasRated(course) ? "Sua Avaliação (Editar)" : "Avaliar Curso (+20 XP)"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Feed Social Savana */}
        <div className="space-y-6">
          
          {/* Missões Diárias Section */}
          <div className="bg-slate-950 border border-slate-850 p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
            {/* Dynamic visual touch: background flare */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
                  <Target size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-100 flex items-center gap-1.5">
                    Missões Diárias
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {dailyQuests.filter(q => q.completed).length} de {dailyQuests.length || 3}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Complete hoje para ganhar XP extra!</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-center bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold text-slate-400 shrink-0">
                <Gift size={12} className="text-amber-400 animate-bounce" />
                <span>+{totalPossibleXP} XP Máx</span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            {dailyQuests.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${(dailyQuests.filter(q => q.completed).length / dailyQuests.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* List of Quests */}
            <div className="space-y-3 pt-1">
              {dailyQuests.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">
                  Carregando missões...
                </div>
              ) : (
                dailyQuests.map((quest) => {
                  const QuestIcon = (() => {
                    switch (quest.id) {
                      case 'checkin': return Zap;
                      case 'forum_reply': return MessageSquare;
                      case 'complete_lesson': return BookOpen;
                      default: return Target;
                    }
                  })();

                  const isCompleted = quest.completed;
                  const isClaimed = quest.claimed;

                  return (
                    <div 
                      key={quest.id}
                      className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 ${
                        isClaimed
                          ? 'bg-slate-950/40 border-slate-900/60 opacity-60'
                          : isCompleted
                          ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.04)]'
                          : 'bg-slate-900/60 border-slate-850/60 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon Wrapper */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isClaimed
                            ? 'bg-slate-900 text-slate-500 border-slate-850'
                            : isCompleted
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-950 text-slate-400 border-slate-850'
                        }`}>
                          <QuestIcon size={16} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-200 truncate">{quest.title}</h4>
                            <span className="text-[9px] font-mono font-extrabold text-amber-400 bg-amber-500/5 px-1.5 py-0.2 rounded border border-amber-500/10 shrink-0">
                              +{quest.xpReward} XP
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{quest.description}</p>
                          
                          {/* Mini Progress */}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-16 h-1 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-slate-500">
                              {quest.progress}/{quest.target}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action / Reward button */}
                      <div className="shrink-0">
                        {isClaimed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold text-slate-500 bg-slate-900 border border-slate-850 rounded-xl">
                            <Check size={10} className="text-slate-500" />
                            Resgatado
                          </span>
                        ) : isCompleted ? (
                          <button
                            type="button"
                            onClick={() => handleClaimReward(quest.id)}
                            disabled={claimingQuestId === quest.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl transition duration-300 shadow shadow-emerald-500/10 hover:scale-[1.02] cursor-pointer animate-pulse"
                          >
                            {claimingQuestId === quest.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Trophy size={10} />
                            )}
                            Resgatar
                          </button>
                        ) : (
                          <>
                            {quest.id === 'checkin' ? (
                              <button
                                type="button"
                                onClick={handleCheckIn}
                                disabled={checkingIn}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-mono font-bold bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl transition cursor-pointer"
                              >
                                {checkingIn ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Zap size={10} className="text-amber-400 animate-bounce" />
                                )}
                                Marcar
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono font-bold text-slate-500 bg-slate-950 border border-slate-900/60 rounded-xl">
                                Em progresso
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Extra visual motivation when all are completed */}
            {dailyQuests.length > 0 && dailyQuests.every(q => q.completed) && (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-2.5 mt-2">
                <Sparkles size={14} className="text-amber-400 shrink-0" />
                <p className="text-[10px] font-medium text-emerald-300 leading-relaxed">
                  Incrível! Você completou todos os objetivos de hoje. Continue brilhando! 🚀
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-emerald-400" size={20} />
              <h3 className="font-display text-xl font-bold text-slate-100">Feed Social Savana</h3>
            </div>
            
            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Conexões
            </span>
          </div>

          {/* Composer: Quick Status Update */}
          <form onSubmit={handleCreateSocialPost} className="bg-slate-950 border border-slate-850 p-4 rounded-3xl space-y-3">
            <div className="flex gap-3">
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-8 h-8 rounded-full object-cover border border-slate-800 shrink-0"
              />
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Compartilhe suas conquistas de estudo, casos clínicos ou pergunte aos colegas..."
                rows={2}
                maxLength={280}
                className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none resize-none border-0 focus:ring-0 p-1"
              />
            </div>
            
            <div className="flex justify-between items-center border-t border-slate-900/60 pt-2.5">
              <span className="text-[9px] text-slate-500 font-mono">
                {280 - newPostText.length} caracteres restando
              </span>
              <button
                type="submit"
                disabled={!newPostText.trim()}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:pointer-events-none text-slate-950 rounded-lg text-[10px] font-bold font-mono tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Send size={11} />
                Publicar
              </button>
            </div>
          </form>

          {/* Social Filters */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-850">
            <button
              onClick={() => setActiveFeedTab('all')}
              className={`flex-1 py-1.5 text-center text-[10px] uppercase tracking-wider font-mono font-black rounded-lg transition-all ${
                activeFeedTab === 'all'
                  ? 'bg-slate-900 text-emerald-400 font-bold border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({socialFeed.filter(p => p.category === 'social').length})
            </button>
            <button
              onClick={() => setActiveFeedTab('following')}
              className={`flex-1 py-1.5 text-center text-[10px] uppercase tracking-wider font-mono font-black rounded-lg transition-all ${
                activeFeedTab === 'following'
                  ? 'bg-slate-900 text-emerald-400 font-bold border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Seguindo
            </button>
          </div>

          {/* Posts Feed Timeline */}
          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
            {socialFeed.filter(post => {
              if (post.category !== 'social') return false;
              if (activeFeedTab === 'all') return true;
              
              // Filter following
              const myProfile = allLeaderboardUsers.find(u => u.userId === user.userId);
              const following = myProfile?.following || [];
              return following.includes(post.authorId);
            }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).length === 0 ? (
              <div className="border border-dashed border-slate-850 rounded-2xl py-8 text-center bg-slate-950/20">
                <p className="text-slate-500 text-xs font-mono">Nenhum status publicado.</p>
                {activeFeedTab === 'following' && (
                  <p className="text-[10px] text-slate-600 mt-1 px-3">Siga outros alunos no Ranking para ver as atualizações deles aqui!</p>
                )}
              </div>
            ) : (
              socialFeed.filter(post => {
                if (post.category !== 'social') return false;
                if (activeFeedTab === 'all') return true;
                
                // Filter following
                const myProfile = allLeaderboardUsers.find(u => u.userId === user.userId);
                const following = myProfile?.following || [];
                return following.includes(post.authorId);
              }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(post => {
                const authorUser = allLeaderboardUsers.find(u => u.userId === post.authorId);
                const isPostByMe = post.authorId === user.userId;
                
                return (
                  <div key={post.id} className="bg-slate-950 border border-slate-850/80 p-4 rounded-2xl space-y-3 shadow-md hover:border-slate-800/80 transition-all duration-300">
                    
                    {/* Post Author Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex gap-2.5 items-center cursor-pointer group"
                        onClick={() => {
                          setSelectedProfileId(post.authorId);
                          setIsProfileOpen(true);
                        }}
                        title="Ver Perfil do Aluno"
                      >
                        <img 
                          src={authorUser?.avatar || post.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150"} 
                          alt={post.authorName} 
                          className="w-8 h-8 rounded-xl object-cover border border-slate-800 group-hover:ring-2 group-hover:ring-emerald-500/40 transition-all"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                            <span className="truncate">{post.authorName}</span>
                            {isPostByMe && <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono font-black uppercase">Eu</span>}
                          </h4>
                          <span className="text-[9px] text-slate-500 font-mono block">
                            Lvl {authorUser?.level || 1} • {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {isPostByMe && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {confirmDeletePostId === post.id ? (
                            <div className="flex items-center gap-1 animate-fadeIn">
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="px-1.5 py-0.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-slate-950 border border-red-500/20 font-mono text-[9px] font-bold rounded uppercase cursor-pointer transition-all"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setConfirmDeletePostId(null)}
                                className="px-1.5 py-0.5 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800 font-mono text-[9px] font-bold rounded uppercase cursor-pointer transition-all"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeletePostId(post.id)}
                              className="text-slate-600 hover:text-red-400 hover:bg-red-500/5 p-1 rounded-lg transition-all cursor-pointer"
                              title="Excluir publicação"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Post Content */}
                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">{post.content}</p>

                    {/* Like / Comment Controls */}
                    <div className="flex items-center gap-4 pt-1 border-t border-slate-900/60 text-[10px] font-mono text-slate-500">
                      <button 
                        onClick={() => handleLikePost(post)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${post.likes > 0 ? 'text-red-400' : 'hover:text-slate-200'}`}
                        title="Curtir publicação"
                      >
                        <Heart size={13} className={post.likes > 0 ? "fill-red-400 text-red-400" : ""} />
                        <span>{post.likes}</span>
                      </button>

                      <button 
                        onClick={() => setCommentingPostId(commentingPostId === post.id ? null : post.id)}
                        className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer"
                        title="Comentários"
                      >
                        <MessageSquare size={13} />
                        <span>{post.replies?.length || 0}</span>
                      </button>
                    </div>

                    {/* Expanded commenting section */}
                    {commentingPostId === post.id && (
                      <div className="mt-2 space-y-3 bg-slate-900/40 border border-slate-900/60 p-3 rounded-xl text-left">
                        
                        {/* List of comments */}
                        {post.replies && post.replies.length > 0 && (
                          <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                            {post.replies.map((reply: any) => (
                              <div key={reply.id} className="text-[11px] border-b border-slate-950 last:border-0 pb-1.5 last:pb-0">
                                <div className="flex justify-between items-center text-[10px] mb-0.5">
                                  <span 
                                    className="font-bold text-slate-300 cursor-pointer hover:text-emerald-400 transition"
                                    onClick={() => {
                                      setSelectedProfileId(reply.authorId);
                                      setIsProfileOpen(true);
                                    }}
                                  >
                                    {reply.authorName}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-mono">
                                    {new Date(reply.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-slate-400">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add comment input form */}
                        <div className="flex gap-2 items-center">
                          <input 
                            type="text"
                            placeholder="Escreva um comentário..."
                            value={commentTextState[post.id] || ''}
                            onChange={(e) => setCommentTextState(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            className="flex-1 bg-slate-950 border border-slate-850 px-2.5 py-1.5 text-[11px] text-slate-200 rounded-lg outline-none placeholder-slate-600 focus:border-slate-800"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!(commentTextState[post.id] || '').trim()}
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-40 transition cursor-pointer"
                          >
                            <Send size={11} />
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* PROFILE EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => !loading && setIsEditModalOpen(false)}
          />
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md relative z-10 shadow-2xl animate-fade-in">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              disabled={loading}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 disabled:opacity-50 p-1.5 hover:bg-slate-850 rounded-xl transition-all cursor-pointer"
              id="btn-close-edit-profile"
            >
              <X size={18} />
            </button>
            
            <h3 className="font-display text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Edit2 className="text-emerald-500" size={18} />
              Editar Perfil
            </h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-6" id="form-edit-profile">
              <div className="flex flex-col items-center gap-3">
                <div className="relative group w-24 h-24 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
                  {editAvatarPreview ? (
                    <img 
                      src={editAvatarPreview} 
                      alt="Avatar Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-950">
                      <Camera size={28} />
                    </div>
                  )}
                  
                  <label 
                    htmlFor="avatar-modal-input"
                    className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-[10px] uppercase font-mono font-bold text-slate-200"
                  >
                    <Camera size={16} />
                    <span>Upload</span>
                  </label>
                </div>
                
                <input 
                  type="file"
                  id="avatar-modal-input"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <label 
                  htmlFor="avatar-modal-input" 
                  className="text-xs text-slate-300 hover:text-emerald-400 font-medium cursor-pointer transition-all underline decoration-dotted"
                  id="label-avatar-modal-input"
                >
                  Alterar foto de perfil
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400" id="label-name-input">
                  Nome Completo
                </label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome de exibição"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-medium text-sm transition-all focus:ring-1 focus:ring-emerald-500/20"
                  id="input-edit-profile-name"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-400 leading-relaxed font-mono" id="div-edit-profile-error">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 leading-relaxed font-mono flex items-center gap-2" id="div-edit-profile-success">
                  <Check size={14} className="shrink-0" />
                  {successMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-slate-100 hover:bg-slate-850 border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
                  id="btn-cancel-edit-profile"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-all cursor-pointer font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                  id="btn-submit-edit-profile"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Gravando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCertCourse && (
        <CertificateModal
          isOpen={!!selectedCertCourse}
          onClose={() => setSelectedCertCourse(null)}
          userId={user.userId}
          studentName={user.name}
          courseTitle={selectedCertCourse.title}
          instructorName={selectedCertCourse.instructorName || "Coordenador Docente"}
          courseId={selectedCertCourse.id}
          duration={selectedCertCourse.totalDuration || "40 horas"}
          xpReward={selectedCertCourse.xpReward || 500}
        />
      )}

      {isProfileOpen && selectedProfileId && (
        <UserProfileModal
          userId={selectedProfileId}
          isOpen={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            setSelectedProfileId(null);
          }}
          currentUserId={user.userId}
        />
      )}

      {/* Course Evaluation Modal */}
      {selectedReviewCourse && (() => {
        const reviews = selectedReviewCourse.reviews || [];
        const existingReview = reviews.find(r => r.userId === user.userId && !r.deleted);
        const isPast24Hours = existingReview && existingReview.createdAt 
          ? (Date.now() - new Date(existingReview.createdAt).getTime()) > 24 * 60 * 60 * 1000 
          : false;
        
        const timeRemainingText = existingReview && existingReview.createdAt && !isPast24Hours
          ? (() => {
              const createdTime = new Date(existingReview.createdAt).getTime();
              const elapsed = Date.now() - createdTime;
              const remainingMs = (24 * 60 * 60 * 1000) - elapsed;
              if (remainingMs <= 0) return "";
              const hours = Math.floor(remainingMs / (1000 * 60 * 60));
              const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
              if (hours > 0) return `Restam ${hours}h ${minutes}m para editar ou excluir esta avaliação.`;
              return `Restam ${minutes}m para editar ou excluir esta avaliação.`;
            })()
          : "";

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
            <div 
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleUp p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-100">
                    {isPast24Hours ? "Visualizar Avaliação" : "Avaliar Curso"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {selectedReviewCourse.title}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedReviewCourse(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                  id="btn-close-review-form-modal"
                >
                  <X size={18} />
                </button>
              </div>

              {isPast24Hours && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] text-red-400 font-mono leading-relaxed">
                  ⚠️ Esta avaliação foi realizada há mais de 24 horas. Por questões de integridade, edições e exclusões estão bloqueadas.
                </div>
              )}

              {timeRemainingText && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-400 font-mono leading-relaxed flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span>{timeRemainingText}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Star Selection Block */}
                <div className="text-center bg-slate-950/40 p-4 rounded-2xl border border-slate-850/60 space-y-2">
                  <span className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Sua Nota
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          if (!isPast24Hours) {
                            setReviewRating(star);
                          }
                        }}
                        disabled={isPast24Hours}
                        className={`p-1 hover:scale-110 transition ${isPast24Hours ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
                        id={`btn-star-rate-${star}`}
                      >
                        <Star 
                          size={32} 
                          className={`${
                            star <= reviewRating 
                              ? "text-amber-400 fill-amber-400" 
                              : "text-slate-700"
                          } transition-all`} 
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-amber-400">
                    {reviewRating === 5 && "Incrível! Excelente curso 🌟"}
                    {reviewRating === 4 && "Muito bom! Vale a pena 👍"}
                    {reviewRating === 3 && "Bom/Regular. Pode melhorar 😐"}
                    {reviewRating === 2 && "Ruim. Deixou a desejar 😕"}
                    {reviewRating === 1 && "Muito ruim. Não recomendo 😡"}
                  </span>
                </div>

                {/* Textarea comment block */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400" id="label-review-text">
                    Seu Comentário {isPast24Hours ? "" : "(Opcional)"}
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => {
                      if (!isPast24Hours) {
                        setReviewComment(e.target.value);
                      }
                    }}
                    disabled={isPast24Hours}
                    placeholder="Escreva aqui o que você achou do conteúdo, didática, materiais e do professor..."
                    rows={4}
                    className={`w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-medium text-xs leading-relaxed transition-all focus:ring-1 focus:ring-emerald-500/20 resize-none ${
                      isPast24Hours ? "opacity-65 cursor-not-allowed" : ""
                    }`}
                    id="textarea-review-comment"
                    maxLength={500}
                  />
                  {!isPast24Hours && (
                    <div className="text-right text-[10px] text-slate-500 font-mono">
                      {reviewComment.length}/500 caracteres
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/50">
                {existingReview && !isPast24Hours && (
                  <div className="w-full">
                    {confirmDeleteMyReview ? (
                      <div className="flex gap-2 w-full animate-fadeIn">
                        <button
                          type="button"
                          onClick={handleDeleteMyReview}
                          disabled={savingReview}
                          className="flex-1 py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-red-500 hover:bg-red-600 text-white transition cursor-pointer font-black flex items-center justify-center gap-2"
                        >
                          Confirmar Exclusão
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMyReview(false)}
                          disabled={savingReview}
                          className="py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-slate-850 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteMyReview(true)}
                        disabled={savingReview}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/25 transition cursor-pointer text-center font-bold"
                      >
                        Excluir Avaliação
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setSelectedReviewCourse(null)}
                    disabled={savingReview}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-slate-100 hover:bg-slate-850 border border-slate-800 transition cursor-pointer disabled:opacity-50"
                    id="btn-cancel-review"
                  >
                    {isPast24Hours ? "Voltar" : "Cancelar"}
                  </button>
                  
                  {!isPast24Hours && (
                    <button 
                      type="button"
                      onClick={handleSaveReview}
                      disabled={savingReview}
                      className="flex-1 py-3 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition cursor-pointer font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                      id="btn-submit-review"
                    >
                      {savingReview ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Salvar Avaliação'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Local Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[99999] max-w-md bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center gap-3.5 transition-all duration-300">
          <div className={`p-2 rounded-xl shrink-0 ${
            toast.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : toast.type === 'error'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {toast.type === 'success' ? (
              <Award size={18} className="stroke-[2.5px]" />
            ) : (
              <Activity size={18} />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-200 font-semibold leading-relaxed">
              {toast.message}
            </p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/50 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
