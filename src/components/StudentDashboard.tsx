import React, { useState } from 'react';
import { Course, LeaderboardUser, NotificationItem } from '../types';
import { BookOpen, Activity, Star, Calendar, Edit2, X, Camera, Loader2, Check, Award } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { updateUserProfile, localDB } from '../firebase';
import { CertificateModal } from './CertificateModal';

interface StudentDashboardProps {
  courses: Course[];
  enrolledCourseIds: string[];
  user: LeaderboardUser;
  notifications: NotificationItem[];
  onNavigateToCourse: (course: Course) => void;
}

export function StudentDashboard({ courses, enrolledCourseIds, user, notifications, onNavigateToCourse }: StudentDashboardProps) {
  const myCourses = courses.filter(c => enrolledCourseIds.includes(c.id));
  
  // Fake recent activity from notifications
  const recentActivity = notifications.slice(0, 5);
  
  const xpToNextLevel = user.level * 1000;
  const progressPercent = Math.min((user.xp / xpToNextLevel) * 100, 100);

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
              <span className="text-xs text-emerald-400 font-bold">{user.xp} / {xpToNextLevel} XP</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: My Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-6">
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
                const lessons = courseModules.flatMap(m => (m.isLiveClass || m.isLive) 
                  ? [{ 
                      id: `live-session-${m.id}`, 
                      moduleId: m.id, 
                      title: `Aula Ao Vivo: ${m.title}`, 
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
                    if (mod && (mod.isLiveClass || mod.isLive) && !mod.isLive) {
                      return true;
                    }
                  }
                  return prog?.completedLessons.includes(l.id);
                }).length;
                const totalLessonsCount = lessons.length;
                const isCourseCompleted = totalLessonsCount > 0 && completedCount === totalLessonsCount;
                const percent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

                return (
                  <div 
                    key={course.id} 
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-emerald-500/30 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div className="cursor-pointer flex-1" onClick={() => onNavigateToCourse(course)}>
                      <CourseCard 
                        course={course} 
                        isRegistered={true} 
                        onSelect={() => onNavigateToCourse(course)} 
                        onEnroll={() => {}} 
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCertCourse(course);
                          }}
                          className="mt-1 w-full py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 text-[10px] uppercase font-mono font-black tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.01]"
                        >
                          <Award size={12} />
                          Emitir Certificado
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigateToCourse(course)}
                          className="mt-1 w-full py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white text-[10px] uppercase font-mono font-bold tracking-wider rounded-lg transition-all border border-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Continuar Estudos →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-emerald-500" size={20} />
            <h3 className="font-display text-xl font-bold text-slate-100">Atividade Recente</h3>
          </div>
          
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Nenhuma atividade recente.</p>
            ) : (
              recentActivity.map(notif => (
                <div key={notif.id} className="flex gap-3 items-start border-b border-slate-850/50 last:border-0 pb-3 last:pb-0">
                  <div className="mt-1 p-1.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
                    {notif.type === 'progress' && <Star size={14} className="text-emerald-400" />}
                    {notif.type === 'course' && <BookOpen size={14} className="text-blue-400" />}
                    {notif.type === 'forum' && <Activity size={14} className="text-purple-400" />}
                    {(notif.type === 'badge' || notif.type === 'announcement') && <Calendar size={14} className="text-amber-400" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{notif.title}</h4>
                    <p className="text-[11px] text-slate-450 mt-0.5">{notif.message}</p>
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      {new Date(notif.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
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
    </div>
  );
}
