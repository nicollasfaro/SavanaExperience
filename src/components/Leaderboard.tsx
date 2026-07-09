/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LeaderboardUser, Badge } from '../types';
import { ALL_BADGES } from '../data';
import { 
  Trophy, Award, Zap, BookOpen, MessageSquareText, GraduationCap, 
  ChevronLeft, ChevronRight, UserPlus, UserMinus, UserCheck, Eye, Shield 
} from 'lucide-react';
import { localDB } from '../firebase';
import { UserProfileModal } from './UserProfileModal';

interface LeaderboardProps {
  currentUserId: string;
  users: LeaderboardUser[];
}

export function Leaderboard({ currentUserId, users }: LeaderboardProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Track dynamic real-time users state
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    setLeaderboardUsers(localDB.getLeaderboard());
    const unsub = localDB.onChange('leaderboard', () => {
      setLeaderboardUsers(localDB.getLeaderboard());
    });
    return () => unsub();
  }, []);

  // Filter out instructors/professors, only students/monitors should appear on the ranking page
  const studentsOnly = leaderboardUsers.length > 0 
    ? leaderboardUsers.filter((u) => u.role === 'student' || u.role === 'monitor') 
    : users.filter((u) => u.role === 'student' || u.role === 'monitor');

  // Sort student users by XP descending
  const sortedUsers = [...studentsOnly].sort((a, b) => b.xp - a.xp);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

  // Helper to map string icon inside Lucide
  const renderBadgeIcon = (iconName: string, size = 18) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen size={size} />;
      case 'Award': return <Award size={size} />;
      case 'Zap': return <Zap size={size} />;
      case 'MessageSquareText': return <MessageSquareText size={size} />;
      case 'GraduationCap': return <GraduationCap size={size} />;
      default: return <Award size={size} />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Leaderboard Ranking Column (Takes 2 blocks on desktop) */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-100 flex items-center gap-2">
              <Trophy className="text-amber-400 animate-bounce" size={20} />
              Ranking de Alunos Savana Experience
            </h3>
            <p className="text-xs text-slate-400">XP acumulado através de aulas completas e acertos em questionários.</p>
          </div>
        </div>

        <div className="space-y-3">
          {paginatedUsers.map((user, index) => {
            const isMe = user.userId === currentUserId;
            const rank = startIndex + index + 1;
            const currentUserProfile = leaderboardUsers.find(u => u.userId === currentUserId);
            const isFollowingUser = currentUserProfile?.following?.includes(user.userId) || false;

            return (
              <div
                key={user.userId}
                className={`flex items-center justify-between p-4 rounded-xl transition ${
                  isMe 
                    ? 'bg-emerald-500/10 border border-emerald-500/20' 
                    : 'bg-slate-950/45 border border-slate-900 hover:border-slate-800'
                }`}
              >
                {/* Clicking Name/Avatar opens profile modal */}
                <div 
                  className="flex items-center gap-4 cursor-pointer group flex-1"
                  onClick={() => {
                    setSelectedProfileUserId(user.userId);
                    setIsProfileOpen(true);
                  }}
                  title="Visualizar Perfil Completo"
                >
                  {/* Position Badge */}
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none shrink-0 ${
                    rank === 1 ? 'bg-amber-400 text-slate-950' :
                    rank === 2 ? 'bg-slate-300 text-slate-950' :
                    rank === 3 ? 'bg-amber-700 text-slate-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {rank}
                  </span>

                  {/* Avatar & Name */}
                  <img
                    src={user.avatar}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-slate-800 shadow-sm shrink-0 group-hover:ring-2 group-hover:ring-emerald-500/40 transition-all duration-300"
                  />

                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm text-slate-100 flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
                      <span className="truncate">{user.name}</span>
                      {user.role === 'monitor' && (
                        <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/25 font-bold px-1.5 py-0.5 rounded uppercase shrink-0 flex items-center gap-1">
                          <Shield size={9} className="fill-purple-500/10" /> Monitor
                        </span>
                      )}
                      {isMe && <span className="text-[9px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded uppercase shrink-0">Eu</span>}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block truncate">
                      Nível {user.level} • {user.badges.length} insignias • Clique p/ ver perfil
                    </span>
                  </div>
                </div>

                {/* Follow Button & Score wrapper */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  {!isMe && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation(); // Stop row click propagation!
                        await localDB.toggleFollowUser(currentUserId, user.userId);
                      }}
                      className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                        isFollowingUser
                          ? 'bg-slate-900 border-slate-800/80 text-emerald-400 hover:text-red-400 hover:border-red-950'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
                      }`}
                      title={isFollowingUser ? "Deixar de seguir" : "Seguir Aluno"}
                    >
                      {isFollowingUser ? <UserMinus size={13} /> : <UserPlus size={13} />}
                      <span className="hidden sm:inline">{isFollowingUser ? "Seguindo" : "Seguir"}</span>
                    </button>
                  )}
                  
                  {/* Score */}
                  <div className="text-right min-w-[50px]">
                    <span className="text-sm font-bold text-emerald-400 font-mono">{user.xp} XP</span>
                    <span className="block text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">Pontuação</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/60 pt-4 mt-5 gap-3">
            <span className="text-xs text-slate-400">
              Mostrando <strong className="text-slate-200">{startIndex + 1}</strong> a{' '}
              <strong className="text-slate-200">
                {Math.min(startIndex + itemsPerPage, sortedUsers.length)}
              </strong>{' '}
              de <strong className="text-slate-200">{sortedUsers.length}</strong> alunos
            </span>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition text-xs flex items-center gap-1"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center ${
                      currentPage === pg
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none transition text-xs flex items-center gap-1"
              >
                Próximo
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Badge Dictionary / Medalhas Column (1 block) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-100">Insignias & Selos</h3>
          <p className="text-xs text-slate-400">Complete atividades para ganhar selos exclusivos em seu perfil.</p>
        </div>

        <div className="mt-5 space-y-4">
          {ALL_BADGES.map((badge) => {
            const myUser = users.find(u => u.userId === currentUserId);
            const isUnlocked = myUser?.badges.includes(badge.id);

            return (
              <div 
                key={badge.id}
                className={`flex gap-3.5 p-3 rounded-xl border transition ${
                  isUnlocked 
                    ? 'bg-slate-950/70 border-slate-800/80' 
                    : 'bg-slate-950/20 border-slate-900/40 opacity-55'
                }`}
              >
                {/* Visual Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-tr ${
                  isUnlocked ? badge.color : 'from-slate-800 to-slate-900 text-slate-600'
                }`}>
                  {renderBadgeIcon(badge.iconName, 18)}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-200 block">
                      {badge.name}
                    </span>
                    {isUnlocked ? (
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded font-mono font-bold uppercase">
                        Conquistado
                      </span>
                    ) : (
                      <span className="text-[8px] bg-slate-800 text-slate-500 px-1 py-0.5 rounded font-mono uppercase">
                        Bloqueado
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {badge.description}
                  </p>
                  
                  <span className="text-[9px] font-mono text-slate-500 mt-2 block italic">
                    Requisito: {badge.criteria}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isProfileOpen && selectedProfileUserId && (
        <UserProfileModal
          userId={selectedProfileUserId}
          isOpen={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            setSelectedProfileUserId(null);
          }}
          currentUserId={currentUserId}
        />
      )}

    </div>
  );
}
