/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Course } from '../types';
import { Star, GraduationCap, Clock, Award, MessageCircle, Share2, Twitter, Linkedin, Link, Check } from 'lucide-react';

interface CourseCardProps {
  key?: string;
  course: Course;
  isRegistered: boolean;
  onSelect: () => void;
  onEnroll: () => void;
}

export function CourseCard({ course, isRegistered, onSelect, onEnroll }: CourseCardProps) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.origin + `?course=${course.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getWhatsappLink = () => {
    const defaultNumber = '5521971477755';
    let rawPhone = course.whatsappNumber ? course.whatsappNumber.replace(/\D/g, '') : '';
    if (!rawPhone) {
      rawPhone = defaultNumber;
    } else if (rawPhone.length === 10 || rawPhone.length === 11) {
      rawPhone = '55' + rawPhone;
    }
    return `https://wa.me/${rawPhone}?text=${encodeURIComponent(`Olá! Tenho interesse em me matricular no curso "${course.title}". Como procedo com a inscrição?`)}`;
  };

  return (
    <div id={`course-card-${course.id}`} className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-emerald-500/50 transition-all duration-300 group">
      {/* Thumbnail Block */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={course.thumbnail}
          alt={course.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        
        {/* Category Badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-950/85 text-emerald-400 border border-emerald-500/20 shadow-lg">
          {course.category}
        </span>

        {/* Format Badge */}
        <span className={`absolute top-3 right-3 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide rounded-full border shadow-lg ${
          course.format === 'online' 
            ? 'bg-rose-500 text-white border-rose-400 animate-pulse' 
            : course.format === 'recorded' 
            ? 'bg-indigo-600 text-indigo-100 border-indigo-400' 
            : 'bg-amber-600 text-white border-amber-500'
        }`}>
          {course.format === 'online' && '● Online (Ao Vivo)'}
          {course.format === 'recorded' && '📼 Gravado'}
          {course.format === 'presencial' && '📍 Presencial'}
        </span>

        {/* XP Reward Badge */}
        <span className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500 text-slate-950 shadow-md">
          <Award size={13} className="fill-slate-950" />
          +{course.xpReward} XP
        </span>
      </div>

      {/* Content Block */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-display text-lg font-bold text-slate-100 line-clamp-1 group-hover:text-emerald-400 transition-colors duration-200">
          {course.title}
        </h3>
        
        <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
          {course.description}
        </p>

        {/* Course Statistics */}
        <div className="flex items-center justify-between text-xs text-slate-500 mt-4 border-t border-slate-800/60 pt-3">
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {course.totalDuration}
          </span>
          {course.showStudentsCount !== false && (
            <span className="flex items-center gap-1">
              <GraduationCap size={13} />
              {course.enrolledCount} alunos
            </span>
          )}
          <span className="flex items-center gap-0.5 text-amber-400 font-medium">
            <Star size={13} className="fill-amber-400" />
            {course.rating.toFixed(1)}
          </span>
        </div>

        {/* Real Dynamic course format description banner */}
        <div className="mt-3.5 p-2.5 bg-slate-950/70 rounded-xl border border-slate-850 flex items-start gap-2 min-h-[46px]">
          {course.format === 'online' && (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 mt-1" />
              <div className="text-[10px] text-slate-400 leading-normal">
                <span className="text-rose-450 font-extrabold uppercase">Online (ao vivo)</span>: Aulas com transmissão direta e professores em tempo real.
              </div>
            </>
          )}
          {course.format === 'recorded' && (
            <>
              <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-1" />
              <div className="text-[10px] text-slate-400 leading-normal">
                <span className="text-indigo-400 font-extrabold uppercase">Gravado</span>: Conteúdo online ministrado ao vivo e disponibilizado posteriormente para estudo flexível.
              </div>
            </>
          )}
          {course.format === 'presencial' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1" />
              <div className="text-[10px] text-slate-400 leading-normal">
                <span className="text-amber-400 font-extrabold uppercase">Presencial</span>: Ensino presencial prático dinâmico focado em vivência empírica técnica.
              </div>
            </>
          )}
        </div>

        {/* Pricing / CTA Section */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Investimento
            </span>
            <span className="text-lg font-display font-medium text-emerald-400">
              {course.price === 0 ? 'Gratuito' : course.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          {isRegistered ? (
            <div className="flex items-center gap-1.5 relative">
              <button
                id={`view-lessons-btn-${course.id}`}
                onClick={onSelect}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-100 hover:bg-emerald-500 hover:text-slate-950 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 cursor-pointer"
              >
                Ver Aulas
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShareOptions(!showShareOptions);
                  }}
                  className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl border border-slate-800 transition duration-200 cursor-pointer flex items-center justify-center h-8 w-8"
                  title="Compartilhar Curso"
                >
                  <Share2 size={13} />
                </button>

                {showShareOptions && (
                  <div className="absolute right-0 bottom-full mb-2.5 w-48 bg-slate-950 border border-slate-850 rounded-xl p-2 shadow-2xl z-30 space-y-1 animate-fadeIn">
                    <span className="text-[9px] uppercase font-mono font-bold text-slate-500 tracking-wider block px-2 py-1 mb-1 border-b border-slate-900">
                      Compartilhar
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all text-left font-sans cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check size={11} className="text-emerald-400 shrink-0" />
                          <span className="text-emerald-400 font-medium">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Link size={11} className="shrink-0" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Confira este curso no Savana Experience: "${course.title}" - ${window.location.origin}?course=${course.id}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowShareOptions(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all text-left font-sans"
                    >
                      <MessageCircle size={11} className="fill-slate-350 text-slate-300 shrink-0" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}?course=${course.id}`)}&text=${encodeURIComponent(`Estou aprendendo sobre "${course.title}" no Savana Experience!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowShareOptions(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all text-left font-sans"
                    >
                      <Twitter size={11} className="shrink-0" />
                      <span>X (Twitter)</span>
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}?course=${course.id}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowShareOptions(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all text-left font-sans"
                    >
                      <Linkedin size={11} className="shrink-0" />
                      <span>LinkedIn</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 relative">
              <button
                id={`learn-more-btn-${course.id}`}
                onClick={onSelect}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:text-slate-200 hover:bg-slate-700 transition-all duration-200 cursor-pointer"
              >
                Saiba mais
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShareOptions(!showShareOptions);
                  }}
                  className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl border border-slate-800 transition duration-200 cursor-pointer flex items-center justify-center h-8 w-8"
                  title="Compartilhar Curso"
                >
                  <Share2 size={13} />
                </button>

                {showShareOptions && (
                  <div className="absolute right-0 bottom-full mb-2.5 w-48 bg-slate-950 border border-slate-850 rounded-xl p-2 shadow-2xl z-30 space-y-1 animate-fadeIn">
                    <span className="text-[9px] uppercase font-mono font-bold text-slate-500 tracking-wider block px-2 py-1 mb-1 border-b border-slate-900">
                      Compartilhar
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all text-left font-sans cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check size={11} className="text-emerald-400 shrink-0" />
                          <span className="text-emerald-400 font-medium">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Link size={11} className="shrink-0" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Confira este curso no Savana Experience: "${course.title}" - ${window.location.origin}?course=${course.id}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowShareOptions(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all text-left font-sans"
                    >
                      <MessageCircle size={11} className="fill-slate-350 text-slate-300 shrink-0" />
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}?course=${course.id}`)}&text=${encodeURIComponent(`Estou aprendendo sobre "${course.title}" no Savana Experience!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowShareOptions(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all text-left font-sans"
                    >
                      <Twitter size={11} className="shrink-0" />
                      <span>X (Twitter)</span>
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}?course=${course.id}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowShareOptions(false)}
                      className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all text-left font-sans"
                    >
                      <Linkedin size={11} className="shrink-0" />
                      <span>LinkedIn</span>
                    </a>
                  </div>
                )}
              </div>

              {course.saleType === 'whatsapp' ? (
                <a
                  id={`enroll-btn-${course.id}`}
                  href={getWhatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-1"
                >
                  <MessageCircle size={11} className="fill-slate-950 text-slate-950 shrink-0" />
                  Inscrição
                </a>
              ) : (
                <button
                  id={`enroll-btn-${course.id}`}
                  onClick={onEnroll}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200"
                >
                  Matricular
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
