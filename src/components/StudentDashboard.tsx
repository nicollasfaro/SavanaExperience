import React from 'react';
import { Course, LeaderboardUser, NotificationItem } from '../types';
import { BookOpen, Activity, Star, Calendar } from 'lucide-react';
import { CourseCard } from './CourseCard';

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

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Profile Summary */}
      <div className="bg-slate-950 border border-slate-850 p-6 md:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Activity size={200} />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-3xl font-bold text-emerald-950">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-100 mb-1">{user.name}</h2>
            <p className="text-sm text-slate-400 font-mono">Bem-vindo(a) de volta ao seu painel principal.</p>
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
              {myCourses.map(course => (
                <div key={course.id} className="cursor-pointer">
                  <CourseCard 
                    course={course} 
                    isRegistered={true} 
                    onSelect={() => onNavigateToCourse(course)} 
                    onEnroll={() => {}} 
                  />
                </div>
              ))}
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
    </div>
  );
}
