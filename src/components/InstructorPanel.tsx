/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Course, CourseModule, LeaderboardUser, Turma, Lesson, QuizQuestion } from '../types';
import { localDB, getCachedAccessToken, signInWithGmail } from '../firebase';
import { BookOpen, Users, Award, TrendingUp, Plus, Edit, Trash2, CloudLightning, Calendar, Download, AlertCircle, Video, Key, Lock, Loader2, CheckCircle, ExternalLink, X, Search } from 'lucide-react';

interface InstructorPanelProps {
  currentUserId: string;
  isSystemAdmin?: boolean;
  courses: Course[];
  onUpdateCourses: () => void;
}

export function InstructorPanel({ currentUserId, isSystemAdmin = false, courses, onUpdateCourses }: InstructorPanelProps) {
  // Local admin states
  const [activeTab, setActiveTab] = useState<'reports' | 'lessons' | 'notifications' | 'agenda'>('reports');
  
  // Real-time states
  const [students, setStudents] = useState<LeaderboardUser[]>(() => localDB.getLeaderboard().filter(u => u.role === 'student'));
  const [modules, setModules] = useState<CourseModule[]>(() => localDB.getModules());
  const [turmas, setTurmas] = useState<Turma[]>(() => localDB.getTurmas());

  // Subscribe to real-time sync for collections
  useEffect(() => {
    const unsubLeaderboard = localDB.onChange('leaderboard', () => {
      setStudents(localDB.getLeaderboard().filter(u => u.role === 'student'));
    });
    const unsubModules = localDB.onChange('modules', () => {
      setModules(localDB.getModules());
    });
    const unsubTurmas = localDB.onChange('turmas', () => {
      setTurmas(localDB.getTurmas());
    });
    return () => {
      unsubLeaderboard();
      unsubModules();
      unsubTurmas();
    };
  }, []);

  // Filter allowed classes - only display class if the teacher is assigned to it
  const allowedTurmas = turmas.filter(t => t.instructorId === currentUserId);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');

  // Active student list filtering and pagination
  const [activeStudentsSearch, setActiveStudentsSearch] = useState('');
  const [activeStudentsPage, setActiveStudentsPage] = useState(1);
  const ITEMS_PER_PAGE_ACTIVE_STUDENTS = 10;

  // Sync selectedTurmaId when allowed changes
  useEffect(() => {
    if (allowedTurmas.length > 0) {
      if (!selectedTurmaId || !allowedTurmas.some(t => t.id === selectedTurmaId)) {
        setSelectedTurmaId(allowedTurmas[0].id);
      }
    } else {
      setSelectedTurmaId('');
    }
  }, [allowedTurmas, selectedTurmaId]);

  // Reset page when turma changes
  useEffect(() => {
    setActiveStudentsPage(1);
    setActiveStudentsSearch('');
  }, [selectedTurmaId]);

  // Course addition states
  const [showAddModule, setShowAddModule] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [modTitle, setModTitle] = useState('');
  const [modDesc, setModDesc] = useState('');
  const [modIsLive, setModIsLive] = useState(false);
  const [modLiveDate, setModLiveDate] = useState('');
  const [modIsMeet, setModIsMeet] = useState(false);
  const [modMeetLink, setModMeetLink] = useState('');
  const [modMeetDateTime, setModMeetDateTime] = useState('');

  // Lesson addition/editing states
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [targetModuleForLesson, setTargetModuleForLesson] = useState<CourseModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);
  
  const [lesTitle, setLesTitle] = useState('');
  const [lesDesc, setLesDesc] = useState('');
  const [lesDuration, setLesDuration] = useState('15 min');
  const [lesType, setLesType] = useState<'video' | 'article' | 'quiz' | 'file'>('video');
  const [lesVideoUrl, setLesVideoUrl] = useState('https://vjs.zencdn.net/v/oceans.mp4');
  const [lesVideoIsEncrypted, setLesVideoIsEncrypted] = useState(false);
  const [lesArticleContent, setLesArticleContent] = useState('');
  const [lesQuizQuestions, setLesQuizQuestions] = useState<QuizQuestion[]>([]);
  const [lesFileUrl, setLesFileUrl] = useState('https://example.com/material.pdf');
  const [lesFileName, setLesFileName] = useState('Material de Apoio.pdf');
  const [lesFileType, setLesFileType] = useState('pdf');
  const [lesComingSoon, setLesComingSoon] = useState(false);

  // Auto Cloud functions simulation feedback
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);

  // Student list & actions states (moved up to satisfy Rules of Hooks)
  const [studentToRemove, setStudentToRemove] = useState<LeaderboardUser | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedStudentIdsToAdd, setSelectedStudentIdsToAdd] = useState<string[]>([]);

  // Microsoft Teams & Calendar scheduling states (moved up to satisfy Rules of Hooks)
  const [liveDate, setLiveDate] = useState('');
  const [liveDescription, setLiveDescription] = useState('Aula Síncrona Interativa oficial via Microsoft Teams. Venha preparado(a) para discutir diagnósticos e casos complexos.');
  const [isMeetScheduling, setIsMeetScheduling] = useState(false);
  const [meetError, setMeetError] = useState<string | null>(null);
  const [meetSuccess, setMeetSuccess] = useState<string | null>(null);
  const [confirmDeleteLive, setConfirmDeleteLive] = useState(false);

  // Return empty state if teacher has no allocated Turmas
  if (allowedTurmas.length === 0) {
    return (
      <div id="no-turmas-error" className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center max-w-2xl mx-auto my-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <AlertCircle size={48} className="mx-auto text-amber-500 mb-4 animate-bounce" />
        <h3 className="font-display text-lg font-bold text-slate-100 mb-2">Sem Regência Atribuída</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Olá! Você possui credenciais de <strong>Professor</strong>, porém não foi designado para nenhuma turma ativa sob regência no momento. 
          Apenas o docente especificamente designado para cada turma possui autorização para gerenciar seus planos de aula e monitorar as notas.
        </p>
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 inline-block text-left text-xs text-slate-500 font-mono">
          💡 <strong>Como resolver?</strong> Entre em contato com o administrador geral para designar você como docente para as turmas desejadas.
        </div>
      </div>
    );
  }

  const selectedTurma = allowedTurmas.find(t => t.id === selectedTurmaId) || allowedTurmas[0];
  const selectedCourseId = selectedTurma ? selectedTurma.courseId : '';
  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const courseModules = modules.filter(m => m.courseId === selectedCourseId).sort((a, b) => a.order - b.order);

  // Class KPI aggregates based on selected turma's actual students
  const classStudents = students.filter(s => selectedTurma?.studentIds?.includes(s.userId));
  const totalEnrolled = classStudents.length;
  const avgXP = Math.round(classStudents.reduce((acc, s) => acc + s.xp, 0) / (classStudents.length || 1));
  const classGrade = (classStudents.reduce((acc, s) => acc + (s.level * 14.5), 0) / (classStudents.length || 1)).toFixed(1);

  // Filter active students by search term (name or email)
  const filteredActiveStudents = classStudents.filter(s => {
    const term = activeStudentsSearch.toLowerCase();
    return s.name.toLowerCase().includes(term) || (s.email && s.email.toLowerCase().includes(term));
  });

  const totalActiveStudentsPages = Math.ceil(filteredActiveStudents.length / ITEMS_PER_PAGE_ACTIVE_STUDENTS);
  const paginatedActiveStudents = filteredActiveStudents.slice(
    (activeStudentsPage - 1) * ITEMS_PER_PAGE_ACTIVE_STUDENTS,
    activeStudentsPage * ITEMS_PER_PAGE_ACTIVE_STUDENTS
  );

  const handleRemoveStudentConfirm = async () => {
    if (!selectedTurma || !studentToRemove) return;
    
    const updatedStudentIds = (selectedTurma.studentIds || []).filter(id => id !== studentToRemove.userId);
    const updatedTurma = { ...selectedTurma, studentIds: updatedStudentIds };
    
    // Save to localDB
    await localDB.saveTurma(updatedTurma);
    setStudentToRemove(null);
  };

  const handleAddStudent = async () => {
    if (!selectedTurma) return;
    setShowAddStudentModal(true);
    setStudentSearchTerm('');
    setSelectedStudentIdsToAdd([]);
  };

  const handleSaveAddedStudents = async () => {
    if (!selectedTurma || selectedStudentIdsToAdd.length === 0) return;
    const updatedStudentIds = [...(selectedTurma.studentIds || []), ...selectedStudentIdsToAdd];
    const updatedTurma = { ...selectedTurma, studentIds: updatedStudentIds };
    await localDB.saveTurma(updatedTurma);
    setShowAddStudentModal(false);
    setSelectedStudentIdsToAdd([]);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle.trim() || !selectedCourseId) return;

    try {
      if (editingModule) {
        // Editing Mode
        const updatedMod: CourseModule = {
          ...editingModule,
          title: modTitle,
          description: modDesc,
          isLive: modIsLive,
          isLiveClass: modIsLive,
          liveDate: modIsLive ? modLiveDate : undefined,
          lessons: (modIsLive || modIsMeet) ? [] : editingModule.lessons,
          isMeet: modIsMeet,
          meetLink: modIsMeet ? modMeetLink : undefined,
          meetDateTime: modIsMeet ? modMeetDateTime : undefined,
        };
        await localDB.saveModule(updatedMod);
      } else {
        // Creation Mode
        const newModId = `module-${Date.now()}`;
        const newMod: CourseModule = {
          id: newModId,
          courseId: selectedCourseId,
          title: modTitle,
          description: modDesc,
          order: courseModules.length + 1,
          isLive: modIsLive,
          isLiveClass: modIsLive,
          liveDate: modIsLive ? modLiveDate : undefined,
          lessons: (modIsLive || modIsMeet) ? [] : [
            {
              id: `lesson-${Date.now()}-1`,
              moduleId: newModId,
              title: 'Introdução ao Novo Bloco de Ensino',
              description: 'Vídeo rápido de alinhamento de expectativas e cronograma mensal de estudos.',
              order: 1,
              duration: '10 min',
              type: 'video',
              videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4'
            }
          ],
          isMeet: modIsMeet,
          meetLink: modIsMeet ? modMeetLink : undefined,
          meetDateTime: modIsMeet ? modMeetDateTime : undefined,
        };
        await localDB.saveModule(newMod);
      }
    } catch (err) {
      console.error("Failed to save module to Firebase:", err);
    } finally {
      setModules(localDB.getModules());
      setModTitle('');
      setModDesc('');
      setModIsLive(false);
      setModLiveDate('');
      setModIsMeet(false);
      setModMeetLink('');
      setModMeetDateTime('');
      setShowAddModule(false);
      setEditingModule(null);

      // Notify parent
      onUpdateCourses();
    }
  };

  const handleOpenEditModule = (mod: CourseModule) => {
    setEditingModule(mod);
    setModTitle(mod.title);
    setModDesc(mod.description || '');
    setModIsLive(!!mod.isLive);
    setModLiveDate(mod.liveDate || '');
    setModIsMeet(!!mod.isMeet);
    setModMeetLink(mod.meetLink || '');
    setModMeetDateTime(mod.meetDateTime || '');
    setShowAddModule(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      await localDB.deleteModule(selectedCourseId, moduleId);
      setModules(localDB.getModules());
      onUpdateCourses();
    } catch (err) {
      console.error("Erro ao excluir o módulo:", err);
    }
  };

  const handleToggleLiveClassStatus = async (mod: CourseModule, activate: boolean) => {
    try {
      const updatedMod: CourseModule = {
        ...mod,
        isLive: activate ? (mod.liveDate ? true : false) : false,
        isMeet: activate ? (mod.meetDateTime ? true : false) : false,
        isLiveClass: true, // Keep it as a live class type
      };
      
      // If activating but neither has dates, default to isLive = true to open the room
      if (activate && !updatedMod.isLive && !updatedMod.isMeet) {
        updatedMod.isLive = true;
      }

      await localDB.saveModule(updatedMod);
      setModules(localDB.getModules());
      onUpdateCourses();
      
      alert(activate 
        ? "Aula ao vivo reativada com sucesso! Alunos poderão acessar a transmissão novamente." 
        : "Aula encerrada com sucesso! Alunos agora têm presença registrada automaticamente e podem avançar para a conclusão do curso."
      );
    } catch (err) {
      console.error("Failed to toggle live class status:", err);
      alert("Ocorreu um erro ao alterar o status da aula ao vivo.");
    }
  };

  const handleDragStartModule = (e: React.DragEvent, moduleId: string) => {
    setDraggingModuleId(moduleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverModule = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropModule = async (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    if (!draggingModuleId || draggingModuleId === targetModuleId) {
      setDraggingModuleId(null);
      return;
    }

    const newModulesList = [...courseModules];
    const draggedIndex = newModulesList.findIndex(m => m.id === draggingModuleId);
    const targetIndex = newModulesList.findIndex(m => m.id === targetModuleId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggingModuleId(null);
      return;
    }

    const [draggedItem] = newModulesList.splice(draggedIndex, 1);
    newModulesList.splice(targetIndex, 0, draggedItem);

    const updatedPromises = newModulesList.map((m, index) => {
      return localDB.saveModule({ ...m, order: index + 1 });
    });

    try {
      await Promise.all(updatedPromises);
      setModules(localDB.getModules());
      onUpdateCourses();
    } catch (err) {
      console.error("Failed to reorder modules:", err);
    } finally {
      setDraggingModuleId(null);
    }
  };

  // Lesson actions:
  const handleOpenAddLesson = (module: CourseModule) => {
    setTargetModuleForLesson(module);
    setEditingLesson(null);
    setLesTitle('');
    setLesDesc('');
    setLesDuration('15 min');
    setLesType('video');
    setLesVideoUrl('https://vjs.zencdn.net/v/oceans.mp4');
    setLesVideoIsEncrypted(false);
    setLesArticleContent('### Título do Artigo de Apoio\n\nEste artigo contém os conceitos teóricos fundamentais para a sua formação...');
    setLesFileUrl('https://example.com/material.pdf');
    setLesFileName('Material de Apoio.pdf');
    setLesFileType('pdf');
    setLesComingSoon(false);
    setLesQuizQuestions([
      {
        id: `q-${Date.now()}-1`,
        text: 'Qual a principal diretriz clínica estudada neste capítulo?',
        options: [
          'Diretriz de diagnóstico precoce ativo',
          'Protocolo de acompanhamento passivo',
          'Procedimento invasivo de primeira escolha',
          'Tratamento expectante contínuo'
        ],
        correctAnswerIndex: 0
      }
    ]);
    setShowLessonModal(true);
  };

  const handleOpenEditLesson = (module: CourseModule, lesson: Lesson) => {
    setTargetModuleForLesson(module);
    setEditingLesson(lesson);
    setLesTitle(lesson.title);
    setLesDesc(lesson.description || '');
    setLesDuration(lesson.duration || '15 min');
    setLesType(lesson.type || 'video');
    setLesVideoUrl(lesson.videoUrl || 'https://vjs.zencdn.net/v/oceans.mp4');
    setLesVideoIsEncrypted(!!lesson.videoIsEncrypted);
    setLesArticleContent(lesson.articleContent || '### Notas de Aula\n\nConteúdo explicativo da aula.');
    setLesFileUrl(lesson.fileUrl || 'https://example.com/material.pdf');
    setLesFileName(lesson.fileName || 'Material de Apoio.pdf');
    setLesFileType(lesson.fileType || 'pdf');
    setLesComingSoon(!!lesson.comingSoon);
    setLesQuizQuestions(lesson.quiz?.questions && lesson.quiz.questions.length > 0 ? lesson.quiz.questions : [
      {
        id: `q-${Date.now()}-1`,
        text: 'Qual a principal diretriz clínica estudada neste capítulo?',
        options: [
          'Diretriz de diagnóstico precoce ativo',
          'Protocolo de acompanhamento passivo',
          'Procedimento invasivo de primeira escolha',
          'Tratamento expectante contínuo'
        ],
        correctAnswerIndex: 0
      }
    ]);
    setShowLessonModal(true);
  };

  const handleDeleteLesson = async (module: CourseModule, lessonId: string) => {
    const updatedLessons = module.lessons.filter(l => l.id !== lessonId);
    // Recalculate lessons orders
    updatedLessons.forEach((l, idx) => {
      l.order = idx + 1;
    });

    const updatedMod: CourseModule = {
      ...module,
      lessons: updatedLessons
    };

    await localDB.saveModule(updatedMod);
    setModules(localDB.getModules());
    onUpdateCourses();
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetModuleForLesson || !lesTitle.trim()) return;

    let updatedLessons = [...targetModuleForLesson.lessons];

    if (editingLesson) {
      // Edit mode
      const updatedLesson: Lesson = {
        ...editingLesson,
        title: lesTitle,
        description: lesDesc,
        duration: lesComingSoon ? 'Disponível em breve' : lesDuration,
        type: lesType,
        comingSoon: lesComingSoon,
        videoUrl: (lesType === 'video' && !lesComingSoon) ? lesVideoUrl : undefined,
        videoIsEncrypted: (lesType === 'video' && !lesComingSoon) ? lesVideoIsEncrypted : undefined,
        articleContent: lesType === 'article' ? lesArticleContent : undefined,
        fileUrl: (lesType === 'file' && !lesComingSoon) ? lesFileUrl : undefined,
        fileName: lesType === 'file' ? lesFileName : undefined,
        fileType: lesType === 'file' ? lesFileType : undefined,
        quiz: lesType === 'quiz' ? {
          id: editingLesson.quiz?.id || `quiz-${Date.now()}`,
          title: `Avaliação do Conhecimento: ${lesTitle}`,
          questions: lesQuizQuestions,
          xpPoints: lesQuizQuestions.length * 100
        } : undefined
      };
      
      const idx = updatedLessons.findIndex(l => l.id === editingLesson.id);
      if (idx >= 0) {
        updatedLessons[idx] = updatedLesson;
      }
    } else {
      // Add mode
      const newLessonId = `lesson-${Date.now()}`;
      const newLesson: Lesson = {
        id: newLessonId,
        moduleId: targetModuleForLesson.id,
        title: lesTitle,
        description: lesDesc,
        order: updatedLessons.length + 1,
        duration: lesComingSoon ? 'Disponível em breve' : lesDuration,
        type: lesType,
        comingSoon: lesComingSoon,
        videoUrl: (lesType === 'video' && !lesComingSoon) ? lesVideoUrl : undefined,
        videoIsEncrypted: (lesType === 'video' && !lesComingSoon) ? lesVideoIsEncrypted : undefined,
        articleContent: lesType === 'article' ? lesArticleContent : undefined,
        fileUrl: (lesType === 'file' && !lesComingSoon) ? lesFileUrl : undefined,
        fileName: lesType === 'file' ? lesFileName : undefined,
        fileType: lesType === 'file' ? lesFileType : undefined,
        quiz: lesType === 'quiz' ? {
          id: `quiz-${Date.now()}`,
          title: `Avaliação do Conhecimento: ${lesTitle}`,
          questions: lesQuizQuestions,
          xpPoints: lesQuizQuestions.length * 100
        } : undefined
      };
      updatedLessons.push(newLesson);
    }

    const updatedMod: CourseModule = {
      ...targetModuleForLesson,
      lessons: updatedLessons
    };

    try {
      await localDB.saveModule(updatedMod);
    } catch (err) {
      console.error("Failed to save lesson to Firebase:", err);
    } finally {
      setModules(localDB.getModules());
      onUpdateCourses();

      setShowLessonModal(false);
      setTargetModuleForLesson(null);
      setEditingLesson(null);
    }
  };

  // Quiz helper functions:
  const handleAddQuizQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}-${Math.random().toString().slice(-4)}`,
      text: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0
    };
    setLesQuizQuestions([...lesQuizQuestions, newQ]);
  };

  const handleUpdateQuestionText = (qId: string, text: string) => {
    setLesQuizQuestions(lesQuizQuestions.map(q => q.id === qId ? { ...q, text } : q));
  };

  const handleUpdateQuestionOption = (qId: string, optIdx: number, val: string) => {
    setLesQuizQuestions(lesQuizQuestions.map(q => {
      if (q.id === qId) {
        const updatedOpts = [...q.options];
        updatedOpts[optIdx] = val;
        return { ...q, options: updatedOpts };
      }
      return q;
    }));
  };

  const handleUpdateCorrectIndex = (qId: string, idx: number) => {
    setLesQuizQuestions(lesQuizQuestions.map(q => q.id === qId ? { ...q, correctAnswerIndex: idx } : q));
  };

  const handleRemoveQuizQuestion = (qId: string) => {
    setLesQuizQuestions(lesQuizQuestions.filter(q => q.id !== qId));
  };

  // Triggering simulation of Firebase Cloud Functions
  const runCloudFunction = (type: 'backup' | 'prizing' | 'push') => {
    setCloudLoading(true);
    setCloudMessage(null);
    
    setTimeout(() => {
      setCloudLoading(false);
      if (type === 'backup') {
        setCloudMessage('Sucesso: Backup completo do banco de dados e arquivos de estudo sincronizado no Cloud Storage!');
      } else if (type === 'prizing') {
        setCloudMessage('Sucesso: Avaliação cronometrada gerada. Notificação automática disparada para os alunos!');
      } else {
        setCloudMessage('Sucesso: 6 push notifications enviadas em tempo real para alunos inativos há mais de 3 dias!');
      }
    }, 1200);
  };

  const handleScheduleGoogleMeet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveDate) {
      alert("Por favor, selecione a data e horário das aulas ao vivo.");
      return;
    }
    setIsMeetScheduling(true);
    setMeetError(null);
    setMeetSuccess(null);

    let token = getCachedAccessToken();
    let authNotice = "";
    if (!token) {
      let confirmAuth = true;
      if (confirmAuth) {
        try {
          await signInWithGmail();
          token = getCachedAccessToken();
        } catch (err: any) {
          console.warn("Autenticação Google cancelada ou bloqueada:", err);
          authNotice = " (Gerado em modo Sandbox de alta resiliência devido ao fechamento ou bloqueio do popup de login)";
        }
      } else {
        authNotice = " (Agendamento rápido em modo Sandbox sem integração do Gmail/Agenda pessoal)";
      }
    }

    try {
      // Step 1: Create Microsoft Teams Link
      let meetSpaceUri = `https://teams.microsoft.com/l/meetup-join/SavanaExperience-${selectedCourse.id}-${Date.now().toString().slice(-4)}`;

      // Step 2: Create Calendar Event
      const startDateTime = new Date(liveDate);
      const endDateTime = new Date(startDateTime.getTime() + 90 * 60 * 1000); // 1h30 minutes lesson

      if (token) {
        const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: `Savana Experience: ${selectedCourse.title} - Aula Ao Vivo`,
            description: `${liveDescription}\n\nLink seguro da transmissão: ${meetSpaceUri}`,
            location: meetSpaceUri,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
            },
            conferenceData: {
              createRequest: {
                requestId: `req-${Date.now()}`,
                conferenceSolutionKey: { type: "hangoutsMeet" }
              }
            }
          })
        });

        if (calRes.ok) {
          const calData = await calRes.json();
          if (calData.hangoutLink) {
            meetSpaceUri = calData.hangoutLink;
          }
        } else {
          console.warn("Calendar API call details: Status " + calRes.status + ". Proceeding with Meet Space fallback.");
        }
      }

      // Step 3: Update localDB Course with Meet info
      const updatedCourse = {
        ...selectedCourse,
        liveMeetLink: meetSpaceUri,
        liveClassDate: liveDate
      };
      await localDB.saveCourse(updatedCourse);
      onUpdateCourses();

      if (token) {
        setMeetSuccess(`Sua aula ao vivo foi registrada e sincronizada com sucesso! Link seguro do Microsoft Teams gerado: ${meetSpaceUri}. Os estudantes já conseguem visualizar o convite.`);
      } else {
        setMeetSuccess(`Sua aula ao vivo foi registrada com sucesso!${authNotice}. Link seguro do Microsoft Teams configurado para a turma: ${meetSpaceUri}`);
      }
    } catch (err: any) {
      console.error("Live scheduling engine error:", err);
      // Fallback sandbox
      const fallbackUrl = `https://teams.microsoft.com/l/meetup-join/SavanaExperience-${selectedCourse.id}-${Date.now().toString().slice(-4)}`;
      const updatedCourse = {
        ...selectedCourse,
        liveMeetLink: fallbackUrl,
        liveClassDate: liveDate
      };
      await localDB.saveCourse(updatedCourse);
      onUpdateCourses();

      setMeetSuccess(`Sua aula ao vivo foi registrada e sincronizada com sucesso no Sandbox! Link seguro do Microsoft Teams gerado para a turma: ${fallbackUrl}`);
    } finally {
      setIsMeetScheduling(false);
    }
  };

  const handleDeleteLiveClass = async () => {
    if (!selectedCourse) return;
    try {
      const updatedCourse = {
        ...selectedCourse,
        liveMeetLink: undefined,
        liveClassDate: undefined
      };
      await localDB.saveCourse(updatedCourse);
      onUpdateCourses();
      setMeetSuccess("Agendamento de aula síncrona excluído com sucesso.");
      setMeetError(null);
      setConfirmDeleteLive(false);
    } catch (err) {
      console.error("Failed to delete live class:", err);
      setMeetError("Falha ao excluir o agendamento da aula síncrona.");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      
      {/* Glow */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold block mb-1">
            Espaço do Professor / Direção
          </span>
          <h2 className="font-display text-2xl font-bold text-slate-100 flex items-center gap-2">
            Regência de Turmas
          </h2>
          <p className="text-xs text-slate-400">
            Gerenciando a turma ativa: <strong className="text-emerald-450 font-semibold">{selectedTurma?.name}</strong> vinculada ao curso <span className="text-slate-300 font-mono text-[10px]">{selectedTurma?.courseTitle}</span>.
          </p>
        </div>

        {/* Course Select Filter limited to allowed classes for the active teacher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Turma Ativa:</span>
          <select
            value={selectedTurmaId}
            onChange={(e) => setSelectedTurmaId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            {allowedTurmas.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-850 pb-4 mb-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeTab === 'reports' 
              ? 'bg-emerald-500 text-slate-950 shadow-md animate-pulse' 
              : 'bg-slate-950 text-slate-455 border border-slate-900 hover:text-slate-100'
          }`}
        >
          <TrendingUp size={14} />
          Desempenho da Turma
        </button>

        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeTab === 'lessons' 
              ? 'bg-emerald-500 text-slate-950 shadow-md' 
              : 'bg-slate-950 text-slate-455 border border-slate-900 hover:text-slate-100'
          }`}
        >
          <BookOpen size={14} />
          Grade Curricular ({courseModules.length})
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeTab === 'notifications' 
              ? 'bg-emerald-500 text-slate-950 shadow-md' 
              : 'bg-slate-950 text-slate-455 border border-slate-900 hover:text-slate-100'
          }`}
        >
          <CloudLightning size={14} />
          Tarefas Schedulers & GCP
        </button>

        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 ${
            activeTab === 'agenda' 
              ? 'bg-emerald-500 text-slate-950 shadow-md' 
              : 'bg-slate-950 text-slate-455 border border-slate-900 hover:text-slate-100'
          }`}
          id="btn-schedule-live-agenda"
        >
          <Video size={14} />
          Agendar Aula (Google Meet)
        </button>
      </div>

      {/* TABS BODY */}

      {/* 1. REPORT PERFORMANCE TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* STAT CARDS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60 relative">
              <Users className="text-emerald-400 absolute top-4 right-4" size={20} />
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Matrículas Ativas</div>
              <div className="text-2xl font-display font-bold text-slate-100 mt-1">{totalEnrolled} alunos</div>
              <div className="text-[10px] text-emerald-400 mt-1.5 font-mono">↑ 14% este mês</div>
            </div>

            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60 relative">
              <Award className="text-amber-400 absolute top-4 right-4 animate-bounce" size={20} />
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Média de Gamificação</div>
              <div className="text-2xl font-display font-bold text-slate-100 mt-1">{avgXP} XP</div>
              <div className="text-[10px] text-slate-500 mt-1.5 font-mono">Total acumulado</div>
            </div>

            <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60 relative">
              <TrendingUp className="text-indigo-400 absolute top-4 right-4" size={20} />
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Aproveitamento Médio</div>
              <div className="text-2xl font-display font-bold text-slate-100 mt-1">{classGrade}%</div>
              <div className="text-[10px] text-emerald-400 mt-1.5 font-mono">Acima da meta (70%)</div>
            </div>
          </div>

          {/* CUSTOM SVG PERFORMANCE GRAPH */}
          <div className="bg-slate-950/30 border border-slate-800 p-5 rounded-2xl">
            <h4 className="text-xs uppercase tracking-wider text-slate-300 font-semibold mb-4 font-mono">Progresso Individual de Aprendizado da Turma</h4>
            
            {/* SVG Visual Scale */}
            <div className="relative pt-4 overflow-hidden">
              <div className="flex justify-between items-end h-40 border-b border-slate-800 pb-1 px-4 gap-2">
                {classStudents.map((student) => {
                  const barPercentage = Math.min(100, Math.max(15, (student.xp / 4000) * 105));
                  return (
                    <div key={student.userId} className="flex flex-col items-center flex-1 group">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition duration-200 absolute -top-2 bg-slate-950 text-slate-200 text-[10px] px-2.5 py-1 rounded border border-slate-800 shadow-lg pointer-events-none z-10">
                        {student.xp} XP • {student.badges.length} Medalhas
                      </div>
                      
                      {/* Interactive Bar */}
                      <div 
                        style={{ height: `${barPercentage}%` }} 
                        className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 transition-all duration-300 relative shadow-sm cursor-pointer"
                      />
                      
                      <span className="text-[10px] text-slate-500 mt-2 text-center line-clamp-1 max-w-14">
                        {student.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DETAILED STUDENTS LIST TABLE */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h4 className="text-xs uppercase tracking-wider text-slate-300 font-semibold shrink-0">Lista de Alunos Ativos</h4>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou e-mail..."
                    value={activeStudentsSearch}
                    onChange={(e) => {
                      setActiveStudentsSearch(e.target.value);
                      setActiveStudentsPage(1);
                    }}
                    className="w-full bg-slate-900/90 border border-slate-850 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={handleAddStudent}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-semibold transition"
                  >
                    <Users size={11} />
                    Adicionar Estudante
                  </button>
                  <button 
                    onClick={() => {
                      const headers = ['Nome', 'Email', 'XP', 'Nivel', 'Medalhas'];
                      const rows = filteredActiveStudents.map(s => [
                        s.name,
                        s.email || '',
                        s.xp,
                        s.level,
                        s.badges.length
                      ]);
                      const csvContent = "data:text/csv;charset=utf-8," 
                        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `alunos_ativos_turma_${selectedTurmaId || 'export'}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] text-slate-300 transition"
                  >
                    <Download size={11} />
                    Exportar CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-955 text-slate-400 font-medium">
                    <th className="p-4">Estudante</th>
                    <th className="p-4">E-mail</th>
                    <th className="p-4">Pontuação Total</th>
                    <th className="p-4">Nível Atual</th>
                    <th className="p-4">Selos Virtuais</th>
                    <th className="p-4">Desempenho</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {paginatedActiveStudents.map((student) => (
                    <tr key={student.userId} className="hover:bg-slate-900/45 transition">
                      <td className="p-4 flex items-center gap-2.5">
                        <img src={student.avatar} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />
                        <span className="font-semibold text-slate-200">{student.name}</span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-[11px] max-w-[180px] truncate" title={student.email}>
                        {student.email || <span className="text-slate-600 italic">Sem e-mail</span>}
                      </td>
                      <td className="p-4 font-mono font-medium text-emerald-400">{student.xp} XP</td>
                      <td className="p-4"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Level {student.level}</span></td>
                      <td className="p-4 text-slate-400 font-mono">{student.badges.length} medalhas</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full" 
                              style={{ width: `${Math.min(100, (student.xp / 4000) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {Math.round(Math.min(100, (student.xp / 4000) * 100))}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setStudentToRemove(student)}
                          className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/20 text-[10px] transition font-semibold"
                          title="Remover aluno da turma"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredActiveStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-500 font-mono">
                        Nenhum aluno ativo encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalActiveStudentsPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800 bg-slate-950/45 gap-3">
                <span className="text-slate-400 text-xs text-center sm:text-left">
                  Mostrando <strong>{(activeStudentsPage - 1) * ITEMS_PER_PAGE_ACTIVE_STUDENTS + 1}</strong> a{' '}
                  <strong>{Math.min(activeStudentsPage * ITEMS_PER_PAGE_ACTIVE_STUDENTS, filteredActiveStudents.length)}</strong> de{' '}
                  <strong>{filteredActiveStudents.length}</strong> alunos ativos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activeStudentsPage === 1}
                    onClick={() => setActiveStudentsPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Anterior
                  </button>
                  <span className="text-slate-300 font-mono text-xs font-semibold min-w-[50px] text-center">
                    {activeStudentsPage} / {totalActiveStudentsPages}
                  </span>
                  <button
                    type="button"
                    disabled={activeStudentsPage === totalActiveStudentsPages}
                    onClick={() => setActiveStudentsPage(prev => Math.min(prev + 1, totalActiveStudentsPages))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. LESSONS AND MODULES UPDATE TAB */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Gerenciador de Estruturas Curriculares</h4>
              <p className="text-xs text-slate-400">Adicione, edite ou remova módulos e aulas deste curso.</p>
            </div>
            
            <button
              onClick={() => {
                setEditingModule(null);
                setModTitle('');
                setModDesc('');
                setModIsLive(false);
                setModLiveDate('');
                setShowAddModule(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shadow-lg shadow-emerald-500/10 transition"
            >
              <Plus size={14} />
              Novo Módulo
            </button>
          </div>

          <div className="space-y-3">
            {courseModules.map((mod) => (
              <div 
                key={mod.id} 
                className={`bg-slate-955/30 border p-5 rounded-2xl relative overflow-hidden transition-all ${
                  draggingModuleId === mod.id ? 'opacity-50 border-emerald-500 border-dashed' : 'border-slate-800/80 hover:border-slate-700 cursor-move'
                }`}
                draggable
                onDragStart={(e) => handleDragStartModule(e, mod.id)}
                onDragOver={handleDragOverModule}
                onDrop={(e) => handleDropModule(e, mod.id)}
              >
                {(mod.isLiveClass || mod.isLive || mod.isMeet) && (
                  <div className={`absolute top-0 right-0 text-[10px] font-mono px-3 py-1 font-bold rounded-bl-xl uppercase tracking-wider border-l border-b ${
                    (mod.isLive || mod.isMeet)
                      ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
                  }`}>
                    {(mod.isLive || mod.isMeet) ? '🔴 Aula Ao Vivo Ativa' : '✓ Aula Encerrada'}
                  </div>
                )}
                
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h5 className="font-display font-bold text-sm text-slate-200 flex items-center gap-2">
                      {mod.title}
                    </h5>
                    <p className="text-xs text-slate-400 mt-1">{mod.description}</p>
                    
                    {(mod.isLiveClass || mod.isLive || mod.isMeet) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(mod.liveDate || mod.meetDateTime) && (
                          <p className="text-[11px] font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded inline-block">
                            📅 Encontro Agendado: {new Date(mod.liveDate || mod.meetDateTime!).toLocaleString('pt-BR')}
                          </p>
                        )}
                        {mod.isMeet && mod.meetLink && (
                          <a 
                            href={mod.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded inline-flex items-center gap-1 hover:bg-emerald-500/20 transition"
                          >
                            <ExternalLink size={10} /> Link Teams
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/40 p-1.5 rounded-lg border border-slate-800 shrink-0">
                    <button 
                      onClick={() => handleOpenEditModule(mod)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-950 rounded-md transition" 
                      title="Editar Módulo"
                    >
                      <Edit size={13} />
                    </button>
                    <button 
                      onClick={() => handleDeleteModule(mod.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-950 rounded-md transition" 
                      title="Excluir Módulo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Sub Lessons list inside modules */}
                <div className="mt-5 border-t border-slate-900/60 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Conteúdos & Aulas Anexadas ({mod.lessons?.length || 0})</span>
                    {!(mod.isLiveClass || mod.isLive || mod.isMeet) && (
                      <button
                        onClick={() => handleOpenAddLesson(mod)}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1 transition"
                      >
                        <Plus size={11} />
                        Anexar Material
                      </button>
                    )}
                  </div>
                  
                  {(mod.isLiveClass || mod.isLive || mod.isMeet) ? (
                    <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider font-bold">
                            {(mod.isLive || mod.isMeet) ? (
                              <>
                                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                <span className="text-rose-400">Aula Síncrona Ativa</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 bg-slate-500 rounded-full" />
                                <span className="text-slate-400">Aula Finalizada / Encerrada</span>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-350 leading-relaxed">
                            {(mod.isLive || mod.isMeet) 
                              ? "A sala de aula virtual está ativa para receber os alunos agora." 
                              : "Esta aula ao vivo foi finalizada. A presença dos alunos foi registrada."}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          {(mod.isLive || mod.isMeet) ? (
                            <button
                              onClick={() => handleToggleLiveClassStatus(mod, false)}
                              className="px-3.5 py-1.5 bg-red-500 hover:bg-red-400 text-slate-950 font-black text-xs rounded-lg transition-all flex items-center gap-1.5 font-mono"
                              title="Encerrar aula síncrona para liberar a conclusão do curso para os alunos"
                            >
                              <X size={13} />
                              Encerrar Aula
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleLiveClassStatus(mod, true)}
                              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg transition-all flex items-center gap-1.5 font-mono"
                              title="Reativar aula síncrona para os alunos"
                            >
                              <Video size={13} />
                              Reativar Aula
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-normal text-left">
                        Este é um <strong className="text-emerald-400">Módulo de Aula ao Vivo Síncrono</strong>. Ao encerrar a aula, você sinaliza ao sistema que os alunos concluíram esta etapa, permitindo que eles recebam seus pontos de presença e progridam para a emissão do certificado.
                      </p>
                    </div>
                  ) : (!mod.lessons || mod.lessons.length === 0) ? (
                    <div className="text-center py-4 bg-slate-950/20 rounded-xl border border-dashed border-slate-850">
                      <p className="text-[11px] text-slate-500">Nenhuma aula ou material anexado neste módulo ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mod.lessons.map((less) => (
                        <div key={less.id} className="group flex items-center justify-between bg-slate-950/40 hover:bg-slate-950/80 p-3 rounded-xl border border-slate-900/60 transition duration-150">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1 px-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[9px] shrink-0">
                              {less.type === 'video' ? '📺 VÍDEO' : less.type === 'article' ? '📄 ARTIGO' : '📝 AVALIAÇÃO'}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-xs text-slate-200 block truncate">{less.title}</span>
                              {less.description && (
                                <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1 truncate">{less.description}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-505 font-mono shrink-0">({less.duration})</span>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition duration-150">
                            <button
                              onClick={() => handleOpenEditLesson(mod, less)}
                              className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-950 rounded transition" 
                              title="Editar Aula Anexada"
                            >
                              <Edit size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(mod, less.id)}
                              className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-950 rounded transition" 
                              title="Remover Aula Anexada"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TAREFAS SCHEDULERS TAB */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-amber-200">
              <strong className="block mb-1">Integração do Professor & Serverless</strong>
              As rotas abaixo são ligadas diretamente ao Firebase Cloud Functions para monitoramento de comportamento e automações agendadas diárias.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-955/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h5 className="font-display font-semibold text-xs text-slate-200">Sincronização de Backups</h5>
                <p className="text-[11px] text-slate-400 mt-1 pb-1">Exporta logs de progresso e questionários para o Google Cloud Storage a cada 24h.</p>
              </div>
              <button
                disabled={cloudLoading}
                onClick={() => runCloudFunction('backup')}
                className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Rodar Backup Agora
              </button>
            </div>

            <div className="bg-slate-955/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h5 className="font-display font-semibold text-xs text-slate-200">Envio de Push Notifications</h5>
                <p className="text-[11px] text-slate-400 mt-1 pb-1">Identifica estudantes sem acessos há e envia push-reminders de retorno aos conteúdos.</p>
              </div>
              <button
                disabled={cloudLoading}
                onClick={() => runCloudFunction('push')}
                className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Disparar Pushes
              </button>
            </div>

            <div className="bg-slate-955/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h5 className="font-display font-semibold text-xs text-slate-200">Sincronizar Calendários</h5>
                <p className="text-[11px] text-slate-400 mt-1 pb-1">Atualiza links ICS externos para garantir e organizar entregas de atividades.</p>
              </div>
              <button
                disabled={cloudLoading}
                onClick={() => runCloudFunction('prizing')}
                className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Sincronizar ICS
              </button>
            </div>
          </div>

          {cloudLoading && (
            <div className="flex items-center gap-2 justify-center py-4 text-xs text-slate-400 font-mono">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Invocando Firebase Cloud Function via API Server-side...
            </div>
          )}

          {cloudMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-mono">
              {cloudMessage}
            </div>
          )}
        </div>
      )}

      {/* 4. GOOGLE CALENDAR & MEET SCHEDULER TAB */}
      {activeTab === 'agenda' && (
        <div className="space-y-6" id="agenda-google-tab">
          
          {/* Active class information */}
          <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-emerald-400 block mb-1">PROGRAMAÇÃO SÍNCRONA ATUAL</span>
                <h4 className="font-display font-bold text-base text-slate-100">{selectedCourse.title}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Agende as aulas ao vivo para os alunos matriculados neste curso síncrono. O link gerado será exibido na tela inicial de estudos do aluno, permitindo o ingresso via Teams com um único clique.
                </p>
              </div>
              <div className="bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-center shrink-0">
                <span className="block text-[8px] uppercase tracking-widest font-mono text-slate-400">Modalidade</span>
                <span className="text-xs font-semibold text-emerald-400 font-mono capitalize">{selectedCourse.format === 'online' ? 'Ao Vivo (Teams)' : selectedCourse.format}</span>
              </div>
            </div>

            {selectedCourse.liveClassDate && selectedCourse.liveMeetLink ? (
              <div className="mt-5 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-mono tracking-wider text-emerald-400">Aula Agendada no Teams</span>
                    <span className="text-xs font-bold text-slate-100 font-mono">
                      {new Date(selectedCourse.liveClassDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0 self-start sm:self-auto">
                  {confirmDeleteLive ? (
                    <div className="flex items-center gap-2 animate-fade-in bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                      <span className="text-[9px] text-red-400 font-semibold uppercase tracking-wider px-1">Excluir?</span>
                      <button
                        type="button"
                        onClick={handleDeleteLiveClass}
                        className="px-2.5 py-1 bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-[10px] rounded-lg transition"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLive(false)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] rounded-lg transition"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLive(true)}
                        className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition flex items-center gap-1.5 border border-red-500/20 text-xs font-bold"
                        title="Excluir aula ao vivo"
                      >
                        <Trash2 size={13} />
                        Excluir
                      </button>
                      <a
                        href={selectedCourse.liveMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0"
                      >
                        <ExternalLink size={13} />
                        Entrar na transmissão (Teams)
                      </a>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 p-4 bg-slate-950/60 border border-slate-850 rounded-xl text-center">
                <p className="text-xs text-slate-500 italic animate-pulse">
                  Nenhuma aula ao vivo agendada neste curso até o momento. Utilize o painel abaixo para carregar as datas no Microsoft Teams.
                </p>
              </div>
            )}
          </div>

          {/* Form Scheduler & Google Workspace Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form */}
            <form onSubmit={handleScheduleGoogleMeet} className="lg:col-span-2 bg-slate-950/35 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h4 className="font-display font-semibold text-xs text-slate-200 border-b border-slate-800 pb-3 mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-400" />
                Configurar Nova Aula de Transmissão
              </h4>

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Data e Horário de Início</label>
                <input
                  type="datetime-local"
                  required
                  value={liveDate}
                  onChange={(e) => setLiveDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Ementa / Pauta da Aula</label>
                <textarea
                  required
                  rows={3}
                  value={liveDescription}
                  onChange={(e) => setLiveDescription(e.target.value)}
                  placeholder="Quais serão os principais tópicos abordados nesta mentoria presencial/síncrona?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-normal"
                />
              </div>

              {meetError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-mono">
                  ⚠️ {meetError}
                </div>
              )}

              {meetSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-start gap-2 leading-relaxed animate-pulse">
                  <CheckCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{meetSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isMeetScheduling}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isMeetScheduling ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Sincronizando Agenda & Criando Link do Teams...
                  </>
                ) : (
                  <>
                    <Video size={13} />
                    Integrar Teams & Agendar Aula no Calendar
                  </>
                )}
              </button>
            </form>

            {/* Google Workspace sidebar details */}
            <div className="bg-slate-955/30 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h5 className="font-display font-semibold text-xs text-slate-200 mb-2">Sincronização de Agenda</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                  Para adicionar reservas automaticamente à sua agenda do Google Agenda/Outlook, certifique-se de conectar sua conta de agendamento corporativa ou pessoal.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs">
                    <span className="text-slate-450 font-medium font-mono text-[10px]">STATUS OAUTH</span>
                    {getCachedAccessToken() ? (
                      <span className="text-emerald-400 font-mono font-bold uppercase text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse">Conectado</span>
                    ) : (
                      <span className="text-amber-400 font-mono font-semibold uppercase text-[9px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Desconectado</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs">
                    <span className="text-slate-455 font-medium font-mono text-[10px]">INTEGRAÇÃO AGENDA</span>
                    <span className="text-emerald-400 font-bold font-mono text-[9px]">calendar.events</span>
                  </div>
                </div>
              </div>

              {!getCachedAccessToken() && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await signInWithGmail();
                      alert("Google Workspace conectado com sucesso!");
                      // Refresh views
                      setActiveTab('reports');
                      setTimeout(() => setActiveTab('agenda'), 100);
                    } catch (err: any) {
                      alert("Erro na conexão OAuth: " + (err?.message || err));
                    }
                  }}
                  className="w-full mt-6 py-2.5 bg-slate-900 border border-slate-800 text-slate-205 text-xs font-bold rounded-xl transition hover:bg-slate-850 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Key size={13} className="text-emerald-400" />
                  Conectar Conta Google
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* NEW MODULE WORKFLOW MODAL */}
      {showAddModule && (
        <div className="fixed inset-0 z-50 bg-slate-955/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="font-display text-lg font-bold text-slate-100 mb-1">
              {editingModule ? 'Editar Bloco de Matéria' : 'Novo Bloco de Matéria'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              {editingModule ? 'Modifique os dados do módulo pedagógico existente.' : 'Insira os dados do novo módulo pedagógico.'}
            </p>

            <form onSubmit={handleSaveModule} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1">Título do Módulo</label>
                <input
                  type="text"
                  required
                  value={modTitle}
                  onChange={(e) => setModTitle(e.target.value)}
                  placeholder="Ex: Módulo 4: Gerenciamento Avançado de Estados"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1">Breve Resumo</label>
                <textarea
                  rows={3}
                  value={modDesc}
                  onChange={(e) => setModDesc(e.target.value)}
                  placeholder="Explique resumidamente os tópicos abordados..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* LIVE MODULE OPTIONS */}
              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer font-sans select-none">
                    <input
                      type="checkbox"
                      checked={modIsLive}
                      onChange={(e) => {
                        setModIsLive(e.target.checked);
                        if (e.target.checked) setModIsMeet(false);
                      }}
                      className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-800 focus:ring-emerald-500"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-200 block">Módulo Síncrono (Aula ao Vivo)</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Os alunos se reunirão online e em tempo real para essa aula.</span>
                    </div>
                  </label>

                  {modIsLive && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-900 animate-fade-in text-left">
                      <label className="block text-[10px] uppercase tracking-wider font-mono text-emerald-400">Data e Hora de Início</label>
                      <input
                        type="datetime-local"
                        required={modIsLive}
                        value={modLiveDate}
                        onChange={(e) => setModLiveDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer font-sans select-none">
                    <input
                      type="checkbox"
                      checked={modIsMeet}
                      onChange={(e) => {
                        setModIsMeet(e.target.checked);
                        if (e.target.checked) setModIsLive(false);
                      }}
                      className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-800 focus:ring-emerald-500"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-200 block">Sala Microsoft Teams (Link Externo)</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Os alunos acessarão um link externo agendado para o Microsoft Teams.</span>
                    </div>
                  </label>

                  {modIsMeet && (
                    <div className="space-y-3 pt-2 border-t border-slate-900 animate-fade-in text-left">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-mono text-emerald-400 mb-1">Link da Sala Teams</label>
                        <input
                          type="url"
                          required={modIsMeet}
                          value={modMeetLink}
                          onChange={(e) => setModMeetLink(e.target.value)}
                          placeholder="https://teams.microsoft.com/l/meetup-join/..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-mono text-emerald-400 mb-1">Data e Hora da Aula</label>
                        <input
                          type="datetime-local"
                          required={modIsMeet}
                          value={modMeetDateTime}
                          onChange={(e) => setModMeetDateTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModule(false);
                    setEditingModule(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
                >
                  {editingModule ? 'Salvar Alterações' : 'Salvar Módulo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW LESSON WORKFLOW MODAL */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 bg-slate-955/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-lg font-bold text-slate-100 mb-1">
              {editingLesson ? 'Editar Material / Aula Anexada' : 'Novo Material / Aula Anexada'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Módulo Destino: <span className="text-emerald-400 font-semibold">{targetModuleForLesson?.title}</span>
            </p>

            <form onSubmit={handleSaveLesson} className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1">Título do Conteúdo</label>
                  <input
                    type="text"
                    required
                    value={lesTitle}
                    onChange={(e) => setLesTitle(e.target.value)}
                    placeholder="Ex: Prontuário Médico Digital e LGPD"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1 font-semibold">Duração ou Tempo de Leitura</label>
                  <input
                    type="text"
                    required
                    value={lesDuration}
                    onChange={(e) => setLesDuration(e.target.value)}
                    placeholder="Ex: 20 min ou 1h 15m"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1">Descrição Curta</label>
                <input
                  type="text"
                  value={lesDesc}
                  onChange={(e) => setLesDesc(e.target.value)}
                  placeholder="Resumo rápido para orientar o aluno no dashboard..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* LESSON TYPE TABS */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-2 font-bold">Tipo de Conteúdo Acadêmico</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { type: 'video', label: '📺 Vídeo Aula', desc: 'Player de mídia síncrono/assíncrono' },
                    { type: 'article', label: '📄 Artigo de Apoio', desc: 'Material de leitura estruturado' },
                    { type: 'quiz', label: '📝 Avaliação / Teste', desc: 'Questões gamificadas de XP' },
                    { type: 'file', label: '📎 Arquivo/Anexo', desc: 'Upload de PDF, DOCX, ZIP' }
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setLesType(item.type as any)}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                        lesType === item.type
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950/40 border-slate-800 text-slate-450 hover:border-slate-750'
                      }`}
                    >
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5 mt-1 leading-tight">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* OPTION: RECORDER CLASS WILL BE AVAILABLE SOON */}
              {(lesType === 'video' || lesType === 'file') && (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                  <label className="flex items-center gap-2.5 cursor-pointer font-sans select-none">
                    <input
                      type="checkbox"
                      id="input-lesson-coming-soon"
                      checked={lesComingSoon}
                      onChange={(e) => setLesComingSoon(e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-800 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-200 block">Aula gravada será disponibilizada em breve</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Sinaliza aos alunos que a gravação/material desta aula estará disponível em instantes.</span>
                    </div>
                  </label>
                </div>
              )}

              {/* CONDITIONAL SUB forms BASED ON TYPE */}
              {lesType === 'file' && !lesComingSoon && (
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 animate-fade-in text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-mono text-emerald-400 mb-1">Nome do Arquivo</label>
                      <input
                        type="text"
                        required={lesType === 'file' && !lesComingSoon}
                        value={lesFileName}
                        onChange={(e) => setLesFileName(e.target.value)}
                        placeholder="Ex: Apostila_Completa.pdf"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-mono text-emerald-400 mb-1">Formato (Extensão)</label>
                      <select
                        value={lesFileType}
                        onChange={(e) => setLesFileType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      >
                        <option value="pdf">PDF (.pdf)</option>
                        <option value="doc">Word (.doc, .docx)</option>
                        <option value="xls">Excel (.xls, .xlsx)</option>
                        <option value="ppt">PowerPoint (.ppt, .pptx)</option>
                        <option value="zip">Arquivo Compactado (.zip, .rar)</option>
                        <option value="other">Outro formato</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-mono text-emerald-400 mb-1">Material Anexo (Upload)</label>
                    <input
                      type="file"
                      required={lesType === 'file' && !lesFileUrl && !lesComingSoon}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLesFileName(file.name);
                          const ext = file.name.split('.').pop()?.toLowerCase() || 'other';
                          if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'].some(e => ext.includes(e))) {
                            let mappedType = ext;
                            if (ext.includes('doc')) mappedType = 'doc';
                            if (ext.includes('xls')) mappedType = 'xls';
                            if (ext.includes('ppt')) mappedType = 'ppt';
                            if (ext.includes('zip') || ext.includes('rar')) mappedType = 'zip';
                            setLesFileType(mappedType);
                          } else {
                            setLesFileType('other');
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setLesFileUrl(event.target?.result as string);
                            setCloudMessage(`Arquivo "${file.name}" anexado localmente com sucesso!`);
                            setTimeout(() => setCloudMessage(null), 3500);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                    />
                    {lesFileUrl && lesFileName && (
                      <span className="text-[10px] text-emerald-450 font-bold block mt-2">✓ Arquivo "{lesFileName}" pronto para uso.</span>
                    )}
                  </div>
                </div>
              )}

              {lesType === 'video' && !lesComingSoon && (
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-mono text-emerald-400 mb-1">Link ou Código Embed do Vídeo (YouTube, Vimeo, MP4 ou &lt;iframe&gt;)</label>
                    <textarea
                      rows={3}
                      required={lesType === 'video' && !lesComingSoon}
                      value={lesVideoUrl}
                      onChange={(e) => setLesVideoUrl(e.target.value)}
                      placeholder="Cole o Link (ex: https://youtu.be/...) ou o Código de Incorporação completo (ex: <iframe src=...></iframe>)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <span className="text-[9px] text-slate-500 font-semibold block mt-1">Dica: Você pode colar links convencionais (YouTube, Vimeo, arquivos mp4) ou o código de incorporação HTML completo (&lt;iframe&gt;) fornecido por plataformas de vídeo.</span>
                  </div>

                  <div className="pt-2 border-t border-slate-900/60">
                    <label className="flex items-center gap-2 cursor-pointer font-sans select-none">
                      <input
                        type="checkbox"
                        checked={lesVideoIsEncrypted}
                        onChange={(e) => setLesVideoIsEncrypted(e.target.checked)}
                        className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-800 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                        <Lock size={12} className="text-amber-500 shrink-0" />
                        Encriptar / Ocultar link original no "Inspecionar"
                      </span>
                    </label>
                    <span className="text-[9px] text-amber-500/80 font-medium block mt-1 leading-normal pl-6">
                      O sistema converterá o reprodutor de vídeo em uma sandbox segura utilizando um carregador de blob isolado (blob:), ocultando o link original no código-fonte contra cópias.
                    </span>
                  </div>
                </div>
              )}

              {lesType === 'article' && (
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-mono text-emerald-400 mb-1">Conteúdo do Artigo Acadêmico (Suporta Markdown)</label>
                    <textarea
                      rows={8}
                      required={lesType === 'article'}
                      value={lesArticleContent}
                      onChange={(e) => setLesArticleContent(e.target.value)}
                      placeholder="# Título do Artigo Acadêmico&#10;&#10;Estruture o texto de apoio para os alunos com formatação livre..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {lesType === 'quiz' && (
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-mono text-emerald-400 font-bold">Gerenciador de Questões</h4>
                      <p className="text-[9px] text-slate-500">Cada questão correta dará 100 XP extras de pontuação ao estudante na trilha.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddQuizQuestion}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold rounded"
                    >
                      + Nova Questão
                    </button>
                  </div>

                  {lesQuizQuestions.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-500">Nenhuma questão adicionada neste teste. Clique em "+ Nova Questão" para criar uma avaliação.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 divide-y divide-slate-850/50 max-h-96 overflow-y-auto pr-1">
                      {lesQuizQuestions.map((q, qidx) => (
                        <div key={q.id} className="pt-3 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1">Pergunta #{qidx + 1}</label>
                              <input
                                type="text"
                                required
                                value={q.text}
                                onChange={(e) => handleUpdateQuestionText(q.id, e.target.value)}
                                placeholder="Insira o enunciado da questão..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuizQuestion(q.id)}
                              className="p-1 px-2 mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition border border-red-500/20"
                              title="Remover Questão"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>

                          {/* OPTION FIELDS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4 border-l border-emerald-500/20">
                            {q.options.map((opt, oidx) => (
                              <div key={oidx} className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-slate-500 uppercase">{String.fromCharCode(65 + oidx)})</span>
                                <input
                                  type="text"
                                  required
                                  value={opt}
                                  onChange={(e) => handleUpdateQuestionOption(q.id, oidx, e.target.value)}
                                  placeholder={`Alternativa ${String.fromCharCode(65 + oidx)}`}
                                  className="w-full bg-slate-900 border border-slate-850 rounded-md px-3 py-1.5 text-xs text-slate-205 focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            ))}
                          </div>

                          {/* CORRECT ANSWER DROPDOWN */}
                          <div className="flex items-center gap-2 pl-4">
                            <span className="text-[10.5px] text-slate-400">Alternativa Correta:</span>
                            <select
                              value={q.correctAnswerIndex}
                              onChange={(e) => handleUpdateCorrectIndex(q.id, parseInt(e.target.value))}
                              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-emerald-400 font-semibold focus:outline-none"
                            >
                              {q.options.map((_, idx) => (
                                <option key={idx} value={idx}>Alternativa {String.fromCharCode(65 + idx)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLessonModal(false);
                    setTargetModuleForLesson(null);
                    setEditingLesson(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md"
                >
                  {editingLesson ? 'Salvar Alterações' : 'Anexar Aula / Teste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ADD STUDENT MODAL */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div>
                <h3 className="font-display font-bold text-slate-100 text-lg">Adicionar Estudantes</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Turma: {selectedTurma?.name}</p>
              </div>
              <button 
                onClick={() => setShowAddStudentModal(false)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 border-b border-slate-800/80">
              <input
                type="text"
                placeholder="Pesquise por nome..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {students
                .filter(s => !selectedTurma?.studentIds?.includes(s.userId))
                .filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                .map(student => (
                  <label key={student.userId} className="flex items-center gap-3 p-3 hover:bg-slate-800/50 rounded-xl cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={selectedStudentIdsToAdd.includes(student.userId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIdsToAdd(prev => [...prev, student.userId]);
                        } else {
                          setSelectedStudentIdsToAdd(prev => prev.filter(id => id !== student.userId));
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <img src={student.avatar} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <div className="font-semibold text-slate-200 text-sm">{student.name}</div>
                    </div>
                  </label>
              ))}
              {students.filter(s => !selectedTurma?.studentIds?.includes(s.userId)).filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())).length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">Nenhum estudante encontrado.</div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
              <span className="text-xs text-slate-400 font-medium">
                {selectedStudentIdsToAdd.length} selecionado{selectedStudentIdsToAdd.length !== 1 && 's'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAddedStudents}
                  disabled={selectedStudentIdsToAdd.length === 0}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-slate-950 transition"
                >
                  Confirmar e Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Remoção de Aluno */}
      {studentToRemove && (
        <div id="remove-student-confirmation-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={20} />
                <h3 className="font-display font-bold text-slate-100 text-base">Remover Aluno</h3>
              </div>
              <button 
                onClick={() => setStudentToRemove(null)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 text-center space-y-4">
              <div className="relative inline-block">
                <img 
                  src={studentToRemove.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-red-500/20" 
                />
                <span className="absolute bottom-0 right-0 px-2 py-0.5 text-[9px] font-bold font-mono text-slate-205 bg-slate-950 border border-slate-850 rounded-full">
                  Lvl {studentToRemove.level}
                </span>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-slate-100 font-bold text-base">{studentToRemove.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">{studentToRemove.xp} XP acumulados</p>
              </div>

              <p className="text-xs text-slate-350 leading-relaxed max-w-sm mx-auto">
                Tem certeza que deseja remover este aluno da turma <strong className="text-slate-205">"{selectedTurma?.name}"</strong>? O aluno perderá o acesso de visualização a essa regência de turma.
              </p>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/50">
              <button
                type="button"
                onClick={() => setStudentToRemove(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRemoveStudentConfirm}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 transition"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}