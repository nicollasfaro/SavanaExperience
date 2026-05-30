/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LeaderboardUser, Badge } from '../types';
import { ALL_BADGES } from '../data';
import { Trophy, Award, Zap, BookOpen, MessageSquareText, GraduationCap } from 'lucide-react';

interface LeaderboardProps {
  currentUserId: string;
  users: LeaderboardUser[];
}

export function Leaderboard({ currentUserId, users }: LeaderboardProps) {
  // Sort users by XP descending
  const sortedUsers = [...users].sort((a, b) => b.xp - a.xp);

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
          {sortedUsers.map((user, index) => {
            const isMe = user.userId === currentUserId;
            const rank = index + 1;

            return (
              <div
                key={user.userId}
                className={`flex items-center justify-between p-4 rounded-xl transition ${
                  isMe 
                    ? 'bg-emerald-500/10 border border-emerald-500/20' 
                    : 'bg-slate-950/45 border border-slate-900 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Position Badge */}
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none ${
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
                    className="w-10 h-10 rounded-full object-cover border border-slate-800 shadow-sm"
                  />

                  <div>
                    <span className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                      {user.name}
                      {isMe && <span className="text-[9px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded uppercase">Eu</span>}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Nível {user.level} • {user.badges.length} insignias desbloqueadas
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-400 font-mono">{user.xp} XP</span>
                  <span className="block text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">Pontuação</span>
                </div>
              </div>
            );
          })}
        </div>
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

    </div>
  );
}
