import React, { useState, useMemo } from 'react';
import { Course, CourseModule } from '../types';
import { CourseCard } from './CourseCard';
import { 
  GraduationCap, BookOpen, Shield, Trophy, Sparkles, Zap, Award, 
  CheckCircle2, ArrowRight, Video, Search, Heart, Users, MapPin, CheckSquare, Star, Play,
  X, ChevronRight, Clock, PlayCircle, FileText, HelpCircle, Lock, Instagram, MessageCircle
} from 'lucide-react';
import { localDB } from '../firebase';

interface LandingPageProps {
  courses: Course[];
  onJoin: () => void;
  onSelectCourse: (course: Course) => void;
  logoComponent: React.ComponentType<{ className?: string }>;
  onShowValidator: () => void;
  isLoading?: boolean;
}

export function LandingPage({ courses, onJoin, onSelectCourse, logoComponent: SavanaLogo, onShowValidator, isLoading = false }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'online' | 'recorded' | 'presencial'>('all');
  const [selectedSyllabusCourse, setSelectedSyllabusCourse] = useState<Course | null>(null);
  const [isPlayingIntroVideo, setIsPlayingIntroVideo] = useState(false);

  // Filter courses
  const filteredCourses = useMemo(() => {
    const searchNormalized = searchQuery.toLowerCase().trim();
    return courses.filter(course => {
      // Show only published courses on landing page
      if (course.isPublished === false) return false;
      
      const matchesFormat = formatFilter === 'all' || course.format === formatFilter;
      const matchesSearch = !searchNormalized || 
        course.title.toLowerCase().includes(searchNormalized) ||
        course.description.toLowerCase().includes(searchNormalized) ||
        (course.instructorName && course.instructorName.toLowerCase().includes(searchNormalized)) ||
        course.category.toLowerCase().includes(searchNormalized);
      return matchesFormat && matchesSearch;
    });
  }, [courses, searchQuery, formatFilter]);

  const mainCourses = filteredCourses.filter(c => c.type !== 'capsule');
  const capsuleCourses = filteredCourses.filter(c => c.type === 'capsule');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SavanaLogo className="w-9 h-9" />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-display font-black text-lg tracking-wider text-slate-100">SAVANA</span>
                <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1 py-0.5 rounded tracking-widest font-mono">EXPERIENCE</span>
              </div>
              <span className="text-[9px] text-slate-400 font-medium block mt-0.5 uppercase tracking-wider">Liderança em Ensino Veterinário</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onShowValidator}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition font-medium"
            >
              <Award size={13} className="text-emerald-400" />
              Validar Certificado
            </button>
            <button
              onClick={onJoin}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition duration-200 shadow-md shadow-emerald-500/10 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <GraduationCap size={15} />
              <span>Ambiente do Aluno</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 pt-16 pb-20 text-center sm:text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-wider font-mono">
              <Sparkles size={11} className="animate-pulse" />
              Educação Continuada de Alto Impacto
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-slate-100 tracking-tight leading-[1.1]">
              O Ecossistema de Ensino Veterinário <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
                Mais Imersivo do País
              </span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
              Bem-vindo ao <strong>Savana Experience</strong>. Uma plataforma moderna desenvolvida para médicos veterinários e estudantes apaixonados por animais silvestres, exóticos e medicina de conservação. Aprenda em tempo real, resolva casos clínicos práticos e conquiste destaque na profissão.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <a 
                href="#courses-section"
                className="w-full sm:w-auto text-center bg-slate-900 hover:bg-slate-850 text-slate-100 font-bold px-6 py-3.5 rounded-xl text-xs transition border border-slate-850 hover:border-slate-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Conhecer Nossos Cursos</span>
                <ArrowRight size={14} className="text-slate-400" />
              </a>
              <button 
                onClick={onJoin}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black px-6 py-3.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/15 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
              >
                <GraduationCap size={15} />
                <span>Entrar no Ambiente de Estudos</span>
              </button>
            </div>

            {/* Quick trust metrics - Oculto por enquanto
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-900/60 text-center sm:text-left">
              <div>
                <span className="block text-2xl font-black text-slate-200 font-display">5K+</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold block mt-0.5">Alunos Ativos</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-emerald-400 font-display">98.7%</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold block mt-0.5">De Satisfação</span>
              </div>
              <div>
                <span className="block text-2xl font-black text-purple-400 font-display">400+</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold block mt-0.5">Casos Clínicos</span>
              </div>
            </div>
            */}
          </div>

          <div className="lg:col-span-5 relative">
            {/* Visual preview card */}
            <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Video size={14} className="text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider font-mono">Vídeo de Apresentação</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Savana Experience</span>
              </div>

              {isPlayingIntroVideo ? (
                <div className="aspect-video bg-slate-950 rounded-2xl relative border border-slate-800 overflow-hidden">
                  <iframe 
                    src="https://www.youtube.com/embed/ysz5S6PUM-U?autoplay=1" 
                    title="Apresentação Savana Experience"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div 
                  onClick={() => setIsPlayingIntroVideo(true)}
                  className="aspect-video bg-slate-950 rounded-2xl relative border border-slate-800 overflow-hidden flex items-center justify-center cursor-pointer group"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80"
                    alt="Veterinary Training"
                    className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center group-hover:bg-slate-950/20 transition-all duration-300">
                    <div className="w-14 h-14 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-200 shadow-emerald-500/20">
                      <Play size={20} className="fill-slate-950 ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded-lg text-[9px] font-bold text-slate-300 border border-slate-800 backdrop-blur-sm">
                    Clique para assistir à apresentação
                  </div>
                </div>
              )}

              {/* Course features checklist */}
              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-xs text-slate-300">Certificado digital válido com verificação de autenticidade</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-xs text-slate-300">Suporte personalizado e fórum com monitores de plantão</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-xs text-slate-300">Gamificação ativa com acúmulo de XP e medalhas de honra</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="bg-slate-900/30 border-y border-slate-900/80 relative z-10 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-emerald-400 text-xs font-bold font-mono uppercase tracking-widest block">Metodologia Exclusiva</span>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-100">
              O Que Oferece o Savana Experience?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Diferente de cursos de prateleira comuns, nossa abordagem promove o aprendizado ativo, prático e guiado por especialistas de ponta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3 hover:border-slate-800 transition">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-450 text-rose-400">
                <Video size={20} />
              </div>
              <h3 className="font-display font-bold text-sm text-slate-200">Encontros Síncronos ao Vivo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Participe de transmissões ao vivo integradas onde você pode interagir, tirar dúvidas e participar do debate clínico na hora.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3 hover:border-slate-800 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Zap size={20} />
              </div>
              <h3 className="font-display font-bold text-sm text-slate-200">Sistema Gamificado com XP</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Suas horas de estudo e acertos de testes geram pontos de experiência (XP), que o posicionam no ranking oficial da turma.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3 hover:border-slate-800 transition">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                <BookOpen size={20} />
              </div>
              <h3 className="font-display font-bold text-sm text-slate-200">Simulados & Artigos de Apoio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fixe o conhecimento com quizzes práticos de múltipla escolha e tenha acesso a materiais didáticos complementares refinados.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-3 hover:border-slate-800 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                <Shield size={20} />
              </div>
              <h3 className="font-display font-bold text-sm text-slate-200">Suporte de Monitores</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nossa equipe conta com monitores oficiais (profissionais experientes) de plantão no fórum para dar feedback aos alunos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Catalog Section */}
      <section id="courses-section" className="relative z-10 max-w-7xl mx-auto px-4 py-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-emerald-400 text-xs font-bold font-mono uppercase tracking-widest block">Nosso Portfólio</span>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-100 mt-1">
              Catálogo de Especializações
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Selecione o formato ideal para as suas metas de desenvolvimento.</p>
          </div>
        </div>

        {/* Filters and Search Panel */}
        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar por título, descrição ou instrutor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl py-2 pl-10 pr-8 text-xs text-slate-200 placeholder-slate-500 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 text-xs font-semibold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Format Filter Toggles */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-850 self-start md:self-auto overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 ${
                formatFilter === 'all' ? 'bg-emerald-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFormatFilter('online')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 flex items-center gap-1.5 ${
                formatFilter === 'online' ? 'bg-rose-500 text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-450 animate-pulse" />
              Ao Vivo
            </button>
            <button
              onClick={() => setFormatFilter('recorded')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 flex items-center gap-1 ${
                formatFilter === 'recorded' ? 'bg-indigo-600 text-indigo-150 font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📼 Gravados
            </button>
            <button
              onClick={() => setFormatFilter('presencial')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 flex items-center gap-1 ${
                formatFilter === 'presencial' ? 'bg-amber-600 text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📍 Presenciais
            </button>
          </div>
        </div>

        {/* Regular Courses */}
        <h3 className="font-display font-extrabold text-sm text-slate-400 mb-4 uppercase tracking-widest">Treinamentos e Cursos</h3>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-slate-900/60 border border-slate-850 rounded-3xl overflow-hidden flex flex-col h-[400px] animate-pulse">
                {/* Aspect Ratio Header */}
                <div className="aspect-[16/9] bg-slate-850/50 w-full relative" />
                {/* Content area */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div className="space-y-3">
                    {/* Title block */}
                    <div className="h-5 bg-slate-800/60 rounded-lg w-3/4" />
                    {/* Instructor info block */}
                    <div className="h-3.5 bg-slate-800/45 rounded-md w-1/2" />
                    {/* Description block */}
                    <div className="space-y-2 mt-4">
                      <div className="h-3 bg-slate-800/30 rounded w-full" />
                      <div className="h-3 bg-slate-800/30 rounded w-5/6" />
                      <div className="h-3 bg-slate-800/30 rounded w-4/5" />
                    </div>
                  </div>
                  {/* Buttons block */}
                  <div className="flex gap-3 pt-4 border-t border-slate-850/60 mt-4">
                    <div className="h-9 bg-slate-800/50 rounded-xl flex-1" />
                    <div className="h-9 bg-slate-800/50 rounded-xl flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : mainCourses.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-850 rounded-2xl mb-12">
            <p className="text-sm text-slate-400">
              {searchQuery ? 'Nenhum curso corresponde à sua busca.' : 'Nenhum curso disponível neste formato no momento.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {mainCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isRegistered={false}
                onSelect={() => setSelectedSyllabusCourse(course)}
                onEnroll={() => onSelectCourse(course)}
                isLandingMode={true}
              />
            ))}
          </div>
        )}

        {/* Capsule Courses */}
        {!isLoading && capsuleCourses.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 mt-12">
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-400" />
                  Cápsulas de Conhecimento Rápidas
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {capsuleCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isRegistered={false}
                  onSelect={() => setSelectedSyllabusCourse(course)}
                  onEnroll={() => onSelectCourse(course)}
                  isLandingMode={true}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Instagram Section */}
      <section className="bg-slate-950/60 border-t border-slate-900 py-16 relative z-10 px-4">
        <div className="max-w-4xl mx-auto bg-slate-900/40 border border-slate-900/80 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden shadow-xl">
          {/* Subtle background radial light */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 bg-pink-500/10 text-pink-500 px-3 py-1 rounded-full text-[10px] uppercase font-mono tracking-wider font-extrabold mx-auto">
              <Instagram size={12} />
              <span>Instagram Oficial</span>
            </div>
            
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-100 tracking-tight max-w-lg mx-auto leading-tight">
              Acompanhe o dia a dia da medicina veterinária no <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">@savanaxp</span>
            </h2>
            
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              Siga nosso perfil oficial para acompanhar casos clínicos reais de animais silvestres e exóticos, dicas de manejo veterinário, bastidores imperdíveis das nossas aulas presenciais e atualizações da nossa comunidade.
            </p>

            <div className="pt-2">
              <a 
                href="https://www.instagram.com/savanaxp/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm transition duration-150 shadow-lg shadow-pink-500/15 cursor-pointer hover:scale-[1.02]"
              >
                <Instagram size={16} />
                <span>Seguir @savanaxp no Instagram</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-emerald-950/60 via-teal-950/30 to-emerald-950/40 border-t border-slate-900 py-20 relative z-10 text-center px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-black text-slate-100 leading-tight">
            Pronto para Elevar o Seu Patamar Profissional?
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Crie sua conta de estudante agora mesmo e comece a estudar. Conquiste seu primeiro certificado e seja ranqueado entre os melhores alunos.
          </p>
          <div>
            <button
              onClick={onJoin}
              className="inline-flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black px-8 py-4 rounded-xl text-xs transition duration-200 hover:scale-[1.03] shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <GraduationCap size={16} />
              <span>Criar Conta ou Entrar</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 relative z-10 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <SavanaLogo className="w-7 h-7" />
            <div>
              <span className="font-display font-bold text-slate-400 block">Savana Experience</span>
              <span className="text-[10px] text-slate-600 block mt-0.5">Todos os direitos reservados • {new Date().getFullYear()}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onShowValidator} className="hover:text-slate-300 transition">Validador de Certificados</button>
            <button onClick={onJoin} className="hover:text-slate-300 transition">Portal de Estudos</button>
          </div>
        </div>
      </footer>

      {selectedSyllabusCourse && (() => {
        const courseModules = localDB.getModules().filter(m => m.courseId === selectedSyllabusCourse.id);
        
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative animate-fadeIn text-slate-100 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      Grade Curricular
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                      {selectedSyllabusCourse.format === 'online' ? '🔴 Ao Vivo' : selectedSyllabusCourse.format === 'recorded' ? '📼 Gravado' : '📍 Presencial'}
                    </span>
                  </div>
                  <h3 className="font-display font-black text-xl text-slate-100 tracking-tight leading-tight">
                    {selectedSyllabusCourse.title}
                  </h3>
                  <p className="text-slate-400 text-xs mt-1.5 line-clamp-2">
                    {selectedSyllabusCourse.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSyllabusCourse(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-slate-200 cursor-pointer shrink-0"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Curriculum Area */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {courseModules.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-850/60">
                    <p className="text-xs text-slate-500 italic">Esta grade curricular está em fase de diagramação pelo coordenador pedagógico.</p>
                  </div>
                ) : (
                  courseModules.sort((a, b) => (a.order || 0) - (b.order || 0)).map((mod, modIdx) => (
                    <div key={mod.id} className="bg-slate-950/40 border border-slate-850/60 p-4 sm:p-5 rounded-2xl space-y-3">
                      <div className="border-b border-slate-850 pb-2.5">
                        <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-slate-500 block mb-0.5">
                          Módulo {String(modIdx + 1).padStart(2, '0')}
                        </span>
                        <h4 className="font-display font-bold text-sm text-slate-200 leading-tight">
                          {mod.title}
                        </h4>
                        {mod.description && (
                          <p className="text-slate-400 text-xs mt-1 font-sans leading-relaxed">
                            {mod.description}
                          </p>
                        )}
                      </div>

                      {/* Lessons List */}
                      <div className="space-y-2.5">
                        {(!mod.lessons || mod.lessons.length === 0) ? (
                          <p className="text-[11px] text-slate-500 italic px-1">Nenhum conteúdo adicionado a este módulo.</p>
                        ) : (
                          mod.lessons.sort((a, b) => (a.order || 0) - (b.order || 0)).map((lesson) => {
                            let icon = <PlayCircle size={13} className="text-slate-500 shrink-0" />;
                            if (lesson.type === 'quiz') icon = <HelpCircle size={13} className="text-emerald-500 shrink-0" />;
                            if (lesson.type === 'article' || lesson.type === 'file') icon = <FileText size={13} className="text-blue-400 shrink-0" />;
                            
                            return (
                              <div key={lesson.id} className="flex items-center justify-between gap-3 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-900 px-3 py-2 rounded-xl transition duration-150">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {icon}
                                  <div className="min-w-0">
                                    <span className="text-xs text-slate-300 font-medium block truncate pr-2">
                                      {lesson.title}
                                    </span>
                                    {lesson.duration && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-slate-500 mt-0.5">
                                        <Clock size={9} />
                                        {lesson.duration}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-550 shrink-0">
                                  <Lock size={11} className="text-slate-600" />
                                  <span className="text-[9px] font-mono uppercase tracking-wider font-semibold text-slate-600 hidden sm:inline">Trancada</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Call to Action */}
              <div className="border-t border-slate-800 pt-4 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-left">
                  <p className="text-slate-300 text-xs font-semibold leading-snug">
                    Quer iniciar seus estudos e conquistar seu certificado?
                  </p>
                  <p className="text-slate-500 text-[10px] leading-tight mt-0.5">
                    Cadastre-se ou acesse o Ambiente de Estudos para liberar todo o material.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => setSelectedSyllabusCourse(null)}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSyllabusCourse(null);
                      onJoin();
                    }}
                    className="px-4 py-2 text-xs font-extrabold rounded-xl bg-emerald-500 hover:bg-emerald-450 text-slate-950 transition shadow-lg shadow-emerald-500/15 cursor-pointer flex items-center gap-1.5"
                  >
                    <GraduationCap size={13} />
                    <span>Iniciar Matrícula</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
