/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { localDB, db } from '../firebase';
import { LeaderboardUser, Badge, ForumThread, Course, CourseModule, StudentProgress } from '../types';
import { ALL_BADGES } from '../data';
import { 
  X, Award, Zap, BookOpen, MessageSquareText, GraduationCap, 
  UserPlus, UserMinus, Flame, Sparkles, Calendar, Heart, MessageSquare,
  CheckCircle2, Shield
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface UserProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function UserProfileModal({ userId, isOpen, onClose, currentUserId }: UserProfileModalProps) {
  const [allUsers, setAllUsers] = useState<LeaderboardUser[]>([]);
  const [socialFeed, setSocialFeed] = useState<ForumThread[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [userProgressList, setUserProgressList] = useState<StudentProgress[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Load and sync database real-time updates
  useEffect(() => {
    if (!isOpen) return;
    
    const syncData = async () => {
      setAllUsers(localDB.getLeaderboard());
      setSocialFeed(localDB.getForumThreads());
      
      const loadedCourses = localDB.getCourses();
      const loadedModules = localDB.getModules();
      setCourses(loadedCourses);
      setModules(loadedModules);

      setLoadingCourses(true);
      try {
        // Query progress for this user from Firestore
        const progressSnap = await getDocs(query(collection(db, 'progress'), where('userId', '==', userId)));
        const fetchedProgress: StudentProgress[] = [];
        progressSnap.forEach((d) => {
          fetchedProgress.push(d.data() as StudentProgress);
        });

        // Query payments for this user from Firestore to get enrolled course IDs
        const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', userId)));
        const fetchedPaymentsCourseIds: string[] = [];
        paymentsSnap.forEach((d) => {
          const p = d.data();
          if (p.courseId) {
            fetchedPaymentsCourseIds.push(p.courseId);
          }
        });

        // Combine with Turmas where user is student
        const turmasEnrolledIds = localDB.getTurmas()
          .filter(t => t.studentIds?.includes(userId))
          .map(t => t.courseId);

        // Fallback for self profile
        let localRegs: string[] = [];
        let localProgs: StudentProgress[] = [];
        if (userId === currentUserId) {
          localRegs = localDB.getRegistrations();
          localProgs = localDB.getProgress(currentUserId);
        }

        const combinedCourseIds = Array.from(new Set([
          ...fetchedPaymentsCourseIds,
          ...turmasEnrolledIds,
          ...localRegs,
          ...fetchedProgress.map(p => p.courseId)
        ]));

        const combinedProgress = [
          ...fetchedProgress
        ];
        // Merge with localProgs if self and not already in combinedProgress
        localProgs.forEach(lp => {
          if (!combinedProgress.some(cp => cp.courseId === lp.courseId)) {
            combinedProgress.push(lp);
          }
        });

        setUserProgressList(combinedProgress);
        setEnrolledCourseIds(combinedCourseIds);
      } catch (err) {
        console.error("Error loading user profile details from Firestore:", err);
        // Fallback to local if something goes wrong
        const turmasEnrolledIds = localDB.getTurmas()
          .filter(t => t.studentIds?.includes(userId))
          .map(t => t.courseId);
        
        let localRegs: string[] = [];
        let localProgs: StudentProgress[] = [];
        if (userId === currentUserId) {
          localRegs = localDB.getRegistrations();
          localProgs = localDB.getProgress(currentUserId);
        } else {
          localProgs = localDB.getProgress(userId);
        }

        const combinedCourseIds = Array.from(new Set([
          ...turmasEnrolledIds,
          ...localRegs,
          ...localProgs.map(p => p.courseId)
        ]));

        setUserProgressList(localProgs);
        setEnrolledCourseIds(combinedCourseIds);
      } finally {
        setLoadingCourses(false);
      }
    };

    syncData();

    const unsubLeaderboard = localDB.onChange('leaderboard', syncData);
    const unsubThreads = localDB.onChange('threads', syncData);

    return () => {
      unsubLeaderboard();
      unsubThreads();
    };
  }, [isOpen, userId, currentUserId]);

  if (!isOpen) return null;

  // Find users
  const user = allUsers.find(u => u.userId === userId);
  const currentUser = allUsers.find(u => u.userId === currentUserId);

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center max-w-sm w-full mx-auto">
          <p className="text-slate-300">Usuário não encontrado.</p>
          <button 
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Calculate social stats
  const followingCount = user.following?.length || 0;
  const followers = allUsers.filter(u => u.following?.includes(userId));
  const followersCount = followers.length;
  const isFollowing = currentUser?.following?.includes(userId) || false;
  const isSelf = userId === currentUserId;

  // XP Progress Calculations (1000 XP per level)
  const currentLevelXp = user.xp % 1000;
  const progressPercent = Math.min((currentLevelXp / 1000) * 100, 100);

  // User posts inside the social feed
  const userPosts = socialFeed
    .filter(p => p.authorId === userId && p.category === 'social')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Render icons helper
  const renderBadgeIcon = (iconName: string, size = 20) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen size={size} />;
      case 'Award': return <Award size={size} />;
      case 'Zap': return <Zap size={size} />;
      case 'MessageSquareText': return <MessageSquareText size={size} />;
      case 'GraduationCap': return <GraduationCap size={size} />;
      default: return <Award size={size} />;
    }
  };

  const handleFollowToggle = async () => {
    await localDB.toggleFollowUser(currentUserId, userId);
  };

  const handleLikePost = async (post: ForumThread) => {
    const isLiked = post.likes > 0; // Simple simulation toggle
    const updatedPost: ForumThread = {
      ...post,
      likes: isLiked ? post.likes - 1 : post.likes + 1
    };
    await localDB.saveForumThread(updatedPost);
  };

  const getCourseCompletionStats = (courseId: string) => {
    const courseModules = modules.filter(m => m.courseId === courseId);
    const lessons = courseModules.flatMap(m => 
      m.lessons.length === 0 
        ? [{ 
            id: `live-session-${m.id}`, 
            title: m.title, 
            description: m.description, 
            order: 1, 
            duration: '1h', 
            type: 'video' as const
          }] 
        : (m.lessons || [])
    );
    
    const prog = userProgressList.find(p => p.courseId === courseId);
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
    const percent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;
    const isCompleted = totalLessonsCount > 0 && completedCount === totalLessonsCount;
    
    return {
      completedCount,
      totalLessonsCount,
      percent,
      isCompleted
    };
  };

  const enrolledCoursesList = courses.filter(c => enrolledCourseIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      {/* Backdrop close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col animate-scale-up">
        
        {/* Fixed Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-950/80 z-20 text-slate-400 hover:text-slate-100 rounded-full border border-slate-800/85 transition cursor-pointer"
          id="close-profile-modal"
        >
          <X size={16} />
        </button>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Cover Header */}
          <div className="h-28 bg-gradient-to-r from-emerald-600/30 via-slate-850 to-indigo-600/20 relative">
            <div className="absolute top-4 left-6 flex items-center gap-1.5 bg-slate-950/60 px-3 py-1 rounded-full border border-slate-800">
              <Sparkles className="text-emerald-400" size={13} />
              <span className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-wider">
                Perfil Savana Social
              </span>
            </div>
          </div>

          {/* Content Body */}
          <div className="px-6 pb-6">
          
          {/* Cover Avatar Row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10 mb-6 pb-6 border-b border-slate-800/60 relative">
            <div className="relative shrink-0">
              <img 
                src={user.avatar} 
                alt={user.name} 
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-slate-900 shadow-xl"
              />
              <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 font-mono font-black text-xs px-2.5 py-1 rounded-lg border-2 border-slate-950 shadow-md">
                Lvl {user.level}
              </span>
            </div>

            {/* Profile Info / Controls */}
            <div className="flex-1 text-center sm:text-left mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-display font-bold text-slate-100 flex items-center justify-center sm:justify-start gap-2">
                    {user.name}
                    {user.role === 'monitor' && (
                      <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/25 font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1 font-mono">
                        <Shield size={9} className="fill-purple-500/10" /> Monitor
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 capitalize p-0 font-mono flex items-center justify-center sm:justify-start gap-1">
                    <span className={`w-2 h-2 rounded-full inline-block ${user.role === 'instructor' ? 'bg-amber-400' : user.role === 'monitor' ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                    {user.role === 'instructor' 
                      ? 'Medic(a) Veterinario(a) - Palestrante' 
                      : user.role === 'monitor' 
                        ? 'Monitor Savana Experience' 
                        : 'Membro Savana'}
                  </p>
                </div>

                {/* Follow Button */}
                {!isSelf && (
                  <button
                    onClick={handleFollowToggle}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 shadow-md ${
                      isFollowing
                        ? 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-red-400 hover:border-red-950'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/10'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus size={15} />
                        Seguindo
                      </>
                    ) : (
                      <>
                        <UserPlus size={15} />
                        Seguir
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Social and Level Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Level XP Card */}
            <div className="md:col-span-2 bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold font-mono uppercase tracking-wider">
                  <Flame className="text-orange-500" size={14} />
                  Experiência Geral
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">{user.xp} XP</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-2 font-mono">
                Progresso de nível atual: {currentLevelXp} / 1000 XP
              </span>
            </div>

            {/* Social Stats Card */}
            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-850/40">
                <span className="block text-lg font-mono font-bold text-slate-100">{followersCount}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">Seguidores</span>
              </div>
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-850/40">
                <span className="block text-lg font-mono font-bold text-slate-100">{followingCount}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-widest">Seguindo</span>
              </div>
            </div>
          </div>

          {/* Tabs Sections: Conquistas & Publicações */}
          <div className="space-y-6">
            {/* 0. Cursos Matriculados */}
            <div>
              <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                <GraduationCap className="text-emerald-400" size={15} />
                Cursos e Progresso ({enrolledCoursesList.length})
              </h3>

              {loadingCourses ? (
                <div className="text-center py-6 border border-slate-850 rounded-2xl bg-slate-950/40">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent mb-2"></div>
                  <p className="text-xs text-slate-500 font-mono">Carregando cursos...</p>
                </div>
              ) : enrolledCoursesList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enrolledCoursesList.map((course) => {
                    const stats = getCourseCompletionStats(course.id);
                    return (
                      <div 
                        key={course.id}
                        className="flex flex-col p-3.5 rounded-2xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition duration-300"
                      >
                        <div className="flex gap-3">
                          <img 
                            src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&auto=format&fit=crop&q=80'} 
                            alt={course.title}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 line-clamp-2 leading-snug">{course.title}</h4>
                            <p className="text-[9px] font-mono text-slate-500 mt-1 capitalize">{course.format || 'online'}</p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-slate-500">Progresso</span>
                            <span className={stats.isCompleted ? "text-emerald-400 font-bold flex items-center gap-1" : "text-slate-350 font-bold"}>
                              {stats.isCompleted ? (
                                <>
                                  <CheckCircle2 size={10} className="text-emerald-400" />
                                  Concluído
                                </>
                              ) : (
                                `${stats.percent}% (${stats.completedCount}/${stats.totalLessonsCount})`
                              )}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${stats.isCompleted ? "bg-emerald-500" : "bg-emerald-400"}`}
                              style={{ width: `${stats.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                  <p className="text-xs text-slate-500 font-mono">Nenhum curso matriculado ainda.</p>
                </div>
              )}
            </div>

            {/* 1. Medals/Badges */}
            <div>
              <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                <Award className="text-emerald-400" size={15} />
                Emblemas Unificados ({user.badges.length})
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_BADGES.map((badge) => {
                  const hasBadge = user.badges.includes(badge.id);
                  return (
                    <div 
                      key={badge.id}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300 ${
                        hasBadge 
                          ? 'bg-slate-950/70 border-slate-800' 
                          : 'bg-slate-950/20 border-slate-900/40 opacity-30 select-none'
                      }`}
                    >
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${hasBadge ? badge.color : 'from-slate-800 to-slate-900'} text-slate-950 shrink-0`}>
                        {renderBadgeIcon(badge.iconName, 18)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{badge.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{badge.description}</p>
                        {hasBadge ? (
                          <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase mt-1 inline-block">Conquistado</span>
                        ) : (
                          <span className="text-[8px] font-mono text-slate-600 mt-1 inline-block">Bloqueado</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Publicações/Atividades (Social feed of this user) */}
            <div>
              <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                <MessageSquareText className="text-indigo-400" size={15} />
                Atividade Recente no Feed ({userPosts.length})
              </h3>

              {userPosts.length > 0 ? (
                <div className="space-y-3">
                  {userPosts.map((post) => (
                    <div key={post.id} className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-500">
                          {new Date(post.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handleLikePost(post)}
                            className="text-[9px] hover:text-red-400 font-mono flex items-center gap-1 text-slate-400 transition"
                          >
                            <Heart size={11} className={`${post.likes > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                            {post.likes}
                          </button>
                          <span className="text-slate-700 font-mono text-[9px]">•</span>
                          <span className="text-[9px] font-mono flex items-center gap-1 text-slate-400">
                            <MessageSquare size={11} />
                            {post.replies?.length || 0}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-500 font-mono">Nenhuma atividade recente no feed ainda.</p>
                </div>
              )}
            </div>

          </div>

          {/* Closes Content Body */}
          </div>

        {/* Closes Scrollable Container */}
        </div>

      {/* Closes Modal Card */}
      </div>
    </div>
  );
}
