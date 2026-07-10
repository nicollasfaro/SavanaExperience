/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Course, Redemption } from '../types';
import { localDB } from '../firebase';
import { GraduationCap, Clock, Award, MessageCircle, Share2, Twitter, Linkedin, Link, Check, Tag, Star, X } from 'lucide-react';

interface CourseCardProps {
  key?: string;
  course: Course;
  isRegistered: boolean;
  onSelect: () => void;
  onEnroll: (coupon?: Redemption) => void;
  currentUserId?: string;
  isLandingMode?: boolean;
}

export function CourseCard({ course, isRegistered, onSelect, onEnroll, currentUserId, isLandingMode }: CourseCardProps) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);

  const reviewsList = (course.reviews || []).filter(r => r.approved === true);
  const reviewsCount = reviewsList.length;
  const averageRating = reviewsCount > 0 
    ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsCount).toFixed(1)
    : null;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.origin + `?course=${course.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const [availableCoupons, setAvailableCoupons] = useState<Redemption[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Redemption | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const updateCoupons = () => {
      const all = localDB.getRedemptions();
      const mine = all.filter(r => r.userId === currentUserId && r.couponCode && !r.used);
      setAvailableCoupons(mine);
    };

    updateCoupons();

    const unsub = localDB.onChange('redemptions', updateCoupons);
    return () => unsub();
  }, [currentUserId]);

  const getWhatsappLink = () => {
    const defaultNumber = '5521971477755';
    let rawPhone = course.whatsappNumber ? course.whatsappNumber.replace(/\D/g, '') : '';
    if (!rawPhone) {
      rawPhone = defaultNumber;
    } else if (rawPhone.length === 10 || rawPhone.length === 11) {
      rawPhone = '55' + rawPhone;
    }
    
    let text = `Olá! Tenho interesse em me matricular no curso "${course.title}". Como procedo com a inscrição?`;
    if (selectedCoupon) {
      text = `Olá! Quero me matricular no curso "${course.title}" e estou usando o cupom de desconto válido "${selectedCoupon.couponCode}" de ${selectedCoupon.discountPercentage}% de desconto. Como procedo com a inscrição?`;
    }
    
    return `https://wa.me/${rawPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleWhatsappClick = async () => {
    if (selectedCoupon) {
      await localDB.saveRedemption({ ...selectedCoupon, used: true });
      setSelectedCoupon(null);
    }
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
        
        {course.instructorName && (
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium flex items-center gap-1">
            <span className="text-blue-450 font-bold">Dr(a):</span>
            <span className="text-slate-300">{course.instructorName}</span>
          </p>
        )}

        {/* Rating/Reviews button */}
        <div className="flex items-center gap-2 mt-1.5">
          {reviewsCount > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsReviewsModalOpen(true);
              }}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-350 transition-colors cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/20 px-2 py-0.5 rounded-lg font-mono font-bold"
              id={`btn-course-reviews-${course.id}`}
            >
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span>{averageRating}</span>
              <span className="text-slate-400 font-sans font-normal text-[10px]">({reviewsCount} {reviewsCount === 1 ? 'avaliação' : 'avaliações'})</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono italic">
              Sem avaliações ainda
            </span>
          )}
        </div>
        
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

        {/* Coupon Selector Section */}
        {!isRegistered && course.price > 0 && availableCoupons.length > 0 && (
          <div className="mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-850/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1 font-mono">
                <Tag size={10} className="text-amber-400" />
                Cupom de Desconto Disponível
              </span>
              {selectedCoupon && (
                <button
                  type="button"
                  onClick={() => setSelectedCoupon(null)}
                  className="text-[9px] font-bold text-rose-450 hover:text-rose-400 underline cursor-pointer"
                >
                  Remover
                </button>
              )}
            </div>
            <select
              value={selectedCoupon?.id || ''}
              onChange={(e) => {
                const found = availableCoupons.find(c => c.id === e.target.value);
                setSelectedCoupon(found || null);
              }}
              className="w-full bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
            >
              <option value="">-- Selecionar Cupom --</option>
              {availableCoupons.map(c => (
                <option key={c.id} value={c.id}>
                  {c.couponCode} ({c.discountPercentage}% OFF)
                </option>
              ))}
            </select>
          </div>
        )}

        {isLandingMode && (
          <div className="mt-3.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[10px] text-amber-400 font-semibold leading-tight">
              Acesse o ambiente do aluno para se matricular
            </span>
          </div>
        )}

        {/* Pricing / CTA Section */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Investimento
            </span>
            <span className="text-lg font-display font-medium text-emerald-400">
              {course.price === 0 ? (
                'Gratuito'
              ) : selectedCoupon ? (
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 line-through leading-none mb-0.5">
                    {course.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-lg font-bold text-emerald-400 leading-none">
                    {(course.price * (1 - (selectedCoupon.discountPercentage || 0) / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ) : (
                course.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              )}
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

              {isLandingMode ? (
                <button
                  id={`enroll-btn-landing-${course.id}`}
                  onClick={() => onEnroll()}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-450 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer"
                >
                  Entrar p/ Inscrição
                </button>
              ) : course.saleType === 'whatsapp' ? (
                <a
                  id={`enroll-btn-${course.id}`}
                  href={getWhatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsappClick}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-1"
                >
                  <MessageCircle size={11} className="fill-slate-950 text-slate-950 shrink-0" />
                  Inscrição
                </a>
              ) : (
                <button
                  id={`enroll-btn-${course.id}`}
                  onClick={() => onEnroll(selectedCoupon || undefined)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200"
                >
                  Matricular
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reviews Modal */}
      {isReviewsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn" onClick={() => setIsReviewsModalOpen(false)}>
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-100">
                  Avaliações do Curso
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                  {course.title}
                </p>
              </div>
              <button 
                onClick={() => setIsReviewsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                id="btn-close-reviews-modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Overview Stats */}
            <div className="p-6 bg-slate-950/30 border-b border-slate-800/50 flex items-center gap-6">
              <div className="text-center">
                <span className="block text-4xl font-display font-black text-amber-400">
                  {averageRating || "0.0"}
                </span>
                <div className="flex items-center gap-0.5 justify-center mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      size={14} 
                      className={`${
                        s <= Math.round(parseFloat(averageRating || "0")) 
                          ? "text-amber-400 fill-amber-400" 
                          : "text-slate-700"
                      }`} 
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  {reviewsCount} {reviewsCount === 1 ? 'avaliação' : 'avaliações'}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-1.5 border-l border-slate-800/80 pl-6">
                {[5, 4, 3, 2, 1].map((ratingVal) => {
                  const valCount = reviewsList.filter(r => r.rating === ratingVal).length;
                  const pct = reviewsCount > 0 ? (valCount / reviewsCount) * 100 : 0;
                  return (
                    <div key={ratingVal} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-slate-400 w-3 text-right">{ratingVal}</span>
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-slate-500 w-6 text-right">
                        {valCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews List */}
            <div className="max-h-[300px] overflow-y-auto p-6 space-y-4 divide-y divide-slate-800/60 custom-scrollbar">
              {reviewsList.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 italic">Nenhuma avaliação detalhada ainda.</p>
                </div>
              ) : (
                reviewsList.map((review, rIdx) => {
                  const ratingValue = review.rating || 5;
                  return (
                    <div key={review.userId || rIdx} className={`pt-4 ${rIdx === 0 ? 'pt-0' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={review.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                            alt={review.userName || 'Estudante'} 
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-slate-800 object-cover"
                          />
                          <div>
                            <span className="block text-xs font-semibold text-slate-200">
                              {review.userName || 'Estudante'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString('pt-BR') : 'Data não informada'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              size={10} 
                              className={`${
                                star <= ratingValue 
                                  ? "text-amber-400 fill-amber-400" 
                                  : "text-slate-700"
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-xs text-slate-300 leading-relaxed pl-10">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
