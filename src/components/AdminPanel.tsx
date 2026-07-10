import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../lib/cropUtils';
import { LeaderboardUser, Course, Turma, PreRegistration } from '../types';
import { localDB, uploadCourseThumbnail, auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Shield, User, UserCheck, UserX, Search, Mail, Award, Sparkles, Filter,
  Plus, Edit, Trash2, Calendar, BookOpen, Layers, Users, Upload, Image, Loader2,
  Database, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, X, FileText, UserPlus, Send, Save, Download,
  MoreVertical, ChevronDown, Eye, Star
} from 'lucide-react';
import { CertificateSettingsPanel } from './CertificateSettingsPanel';

interface AdminPanelProps {
  allUsers: LeaderboardUser[];
  onUpdateRole: (userId: string, role: 'student' | 'instructor' | 'admin' | 'monitor') => void | Promise<void>;
  currentUserId: string;
  courses: Course[];
  onPreviewCourse?: (course: Course) => void;
}

export function AdminPanel({ allUsers, onUpdateRole, currentUserId, courses: initialCourses, onPreviewCourse }: AdminPanelProps) {
  // Navigation tabs state
  const [adminTab, setAdminTab] = useState<'users' | 'turmas' | 'courses' | 'sync' | 'rewards' | 'finance' | 'certificates' | 'pre-register'>('users');

  // 1. Users management states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'instructor' | 'monitor'>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const ITEMS_PER_PAGE_USERS = 10;

  // Student profile/registration editing states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<LeaderboardUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserXp, setEditUserXp] = useState(0);
  const [editUserLevel, setEditUserLevel] = useState(1);
  const [editUserAvatar, setEditUserAvatar] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // 2. Turmas management states
  const [turmas, setTurmas] = useState<Turma[]>(() => localDB.getTurmas());
  const [turmaSearchTerm, setTurmaSearchTerm] = useState('');
  
  // Turmas form/modal state
  const [showTurmaModal, setShowTurmaModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [turmaName, setTurmaName] = useState('');
  const [turmaCourseId, setTurmaCourseId] = useState('');
  const [turmaInstructorId, setTurmaInstructorId] = useState('');
  const [turmaStartDate, setTurmaStartDate] = useState('');

  // 3. Courses management states
  const [adminCourses, setAdminCourses] = useState<Course[]>(() => localDB.getCourses());
  
  // Calcula o enrolledCount dinamicamente baseado nos alunos ativos nas turmas correspondentes
  const computedAdminCourses = useMemo(() => {
    return adminCourses.map(course => {
      const courseTurmas = turmas.filter(t => t.courseId === course.id);
      const uniqueStudents = new Set<string>();
      courseTurmas.forEach(t => {
        t.studentIds?.forEach(id => uniqueStudents.add(id));
      });
      return {
        ...course,
        enrolledCount: uniqueStudents.size
      };
    });
  }, [adminCourses, turmas]);

  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  
  // Courses form/modal state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseType, setCourseType] = useState<'course' | 'capsule'>('course');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseCategory, setCourseCategory] = useState('');
  const [courseInstructorName, setCourseInstructorName] = useState('');
  const [courseInstructorInstagram, setCourseInstructorInstagram] = useState('');
  const [isCustomInstructor, setIsCustomInstructor] = useState(false);
  const [courseThumbnail, setCourseThumbnail] = useState('');
  const [coursePrice, setCoursePrice] = useState(0);
  const [courseXpReward, setCourseXpReward] = useState(1000);
  const [courseDuration, setCourseDuration] = useState('20 horas');
  const [courseFormat, setCourseFormat] = useState<'online' | 'recorded' | 'presencial'>('online');
  const [courseIsPublished, setCourseIsPublished] = useState(true);
  const [courseSaleType, setCourseSaleType] = useState<'website' | 'whatsapp'>('website');
  const [courseWhatsappNumber, setCourseWhatsappNumber] = useState('');
  const [courseShowStudents, setCourseShowStudents] = useState(true);
  const [courseShowBenefits, setCourseShowBenefits] = useState(false);
  const [courseBenefit1Title, setCourseBenefit1Title] = useState('Encontros Síncronos / Aulas ao Vivo');
  const [courseBenefit1Desc, setCourseBenefit1Desc] = useState('Aprenda em tempo real pelo painel interativo com câmeras e quadro negro do professor.');
  const [courseBenefit2Title, setCourseBenefit2Title] = useState('Grade Curricular Pedagógica');
  const [courseBenefit2Desc, setCourseBenefit2Desc] = useState('Selecione e assista aulas em vídeo, leia apostilas digitais e realize simulados.');
  const [courseBenefit3Title, setCourseBenefit3Title] = useState('Quizzes de Fixação com XP');
  const [courseBenefit3Desc, setCourseBenefit3Desc] = useState('Gabarite os testes práticos de cada módulo pedagógico para acumular pontos de XP.');
  
  // Track specific course ID for asset mapping, plus Upload states
  const [modalCourseId, setModalCourseId] = useState('');

  // 3b. Reviews management states
  const [selectedReviewsCourse, setSelectedReviewsCourse] = useState<Course | null>(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // 4. Rewards management states
  const [rewards, setRewards] = useState(() => localDB.getRewards());
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardImageUrl, setRewardImageUrl] = useState('');
  const [rewardXpCost, setRewardXpCost] = useState(0);
  const [rewardStock, setRewardStock] = useState(0);
  const [rewardIsCoupon, setRewardIsCoupon] = useState(false);
  const [rewardDiscountPercentage, setRewardDiscountPercentage] = useState(10);

  // 5. Pre-registrations WhatsApp states
  const [preRegistrations, setPreRegistrations] = useState<PreRegistration[]>(() => localDB.getPreRegistrations());
  const [preEmail, setPreEmail] = useState('');
  const [preCourseIds, setPreCourseIds] = useState<string[]>([]);
  const [preSearchTerm, setPreSearchTerm] = useState('');
  const [preCourseFilter, setPreCourseFilter] = useState<string>('');
  const [isSavingPre, setIsSavingPre] = useState(false);
  const [newlyPreRegisteredUser, setNewlyPreRegisteredUser] = useState<PreRegistration | null>(null);
  const [showSendEmailPrompt, setShowSendEmailPrompt] = useState(false);
  const [isSendingPromptEmail, setIsSendingPromptEmail] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(() => localDB.getEmailTemplate());
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [lastDispatchLog, setLastDispatchLog] = useState<{ email: string; dispatchedAt: string; status: string }[] | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [prePage, setPrePage] = useState(1);
  const [activePreRegDropdownId, setActivePreRegDropdownId] = useState<string | null>(null);
  const ITEMS_PER_PAGE_PRE = 10;

  // Toast notifications for a smooth experience without blocking alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const confirm = (title: string, description: string, confirmText: string, onConfirm: () => void) => {
    setConfirmConfig({ title, description, confirmText, onConfirm });
  };

  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Sincronização em tempo real de turmas, cursos, recompensas e template de e-mail
  useEffect(() => {
    const unsubTurmas = localDB.onChange('turmas', () => {
      setTurmas(localDB.getTurmas());
    });
    const unsubCourses = localDB.onChange('courses', () => {
      setAdminCourses(localDB.getCourses());
    });
    const unsubRewards = localDB.onChange('rewards', () => {
      setRewards(localDB.getRewards());
    });
    const unsubPre = localDB.onChange('preRegistrations', () => {
      setPreRegistrations(localDB.getPreRegistrations());
    });
    const unsubTemplate = localDB.onChange('emailTemplate', () => {
      setEmailTemplate(localDB.getEmailTemplate());
    });
    return () => {
      unsubTurmas();
      unsubCourses();
      unsubRewards();
      unsubPre();
      unsubTemplate();
    };
  }, []);

  // Filter candidates for instructor selection
  const instructors = allUsers.filter(u => u.role === 'instructor');

  // Filters search term by name or email
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && user.role === roleFilter;
  });

  const totalUsersPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE_USERS);
  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * ITEMS_PER_PAGE_USERS,
    usersPage * ITEMS_PER_PAGE_USERS
  );

  // Filters turmas
  const filteredTurmas = turmas.filter(t => {
    const term = turmaSearchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.courseTitle.toLowerCase().includes(term) ||
      t.instructorName.toLowerCase().includes(term)
    );
  });

  // Filters and paginated pre-registrations
  const filteredPreRegistrations = preRegistrations.filter(p => {
    const matchesSearch = !preSearchTerm || p.email.toLowerCase().includes(preSearchTerm.toLowerCase());
    const matchesCourse = !preCourseFilter || p.courseIds?.includes(preCourseFilter);
    return matchesSearch && matchesCourse;
  });
  const pendingPreRegistrations = preRegistrations.filter(p => {
    const isPending = !p.used;
    const matchesCourse = !preCourseFilter || p.courseIds?.includes(preCourseFilter);
    return isPending && matchesCourse;
  });
  const totalPrePages = Math.ceil(filteredPreRegistrations.length / ITEMS_PER_PAGE_PRE);
  const paginatedPreRegistrations = filteredPreRegistrations.slice(
    (prePage - 1) * ITEMS_PER_PAGE_PRE,
    prePage * ITEMS_PER_PAGE_PRE
  );

  const handleDeleteUser = async (user: LeaderboardUser) => {
    if (user.email === 'ciuldinciuldin@gmail.com') {
      showToast("Este usuário é protegido pelo sistema e não pode ser excluído.", "info");
      return;
    }
    
    setConfirmConfig({
      title: "Excluir Usuário",
      description: `Tem certeza absoluta que deseja excluir o usuário "${user.name}"? Esta ação removerá o perfil e a pontuação permanentemente.`,
      confirmText: "Confirmar Exclusão",
      onConfirm: async () => {
        setConfirmConfig(null);
        setUpdatingUserId(user.userId);
        try {
          await localDB.deleteUser(user.userId);
          showToast("Usuário excluído com sucesso!");
        } catch (err) {
          showToast("Não foi possível excluir o usuário.", "error");
        } finally {
          setUpdatingUserId(null);
        }
      }
    });
  };

  const handleToggleRole = async (user: LeaderboardUser) => {
    setUpdatingUserId(user.userId);
    const newRole = user.role === 'instructor' ? 'student' : 'instructor';
    try {
      await onUpdateRole(user.userId, newRole);
      showToast("Cargo do usuário atualizado com sucesso!");
    } catch (err) {
      showToast("Não foi possível atualizar o cargo do usuário.", "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName.trim()) {
      showToast("O nome do usuário não pode ser vazio.", "error");
      return;
    }
    
    setIsSavingUser(true);
    try {
      await localDB.updateLeaderboardUser(editingUser.userId, {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        xp: Number(editUserXp),
        level: Number(editUserLevel),
        avatar: editUserAvatar.trim()
      });
      showToast("Cadastro de usuário alterado com sucesso!");
      setShowUserModal(false);
      setEditingUser(null);
    } catch (err) {
      showToast("Erro ao alterar o cadastro do usuário.", "error");
    } finally {
      setIsSavingUser(false);
    }
  };

  // Open Add Turma Modal
  const handleOpenAddTurma = () => {
    setEditingTurma(null);
    setTurmaName('');
    setTurmaCourseId(adminCourses[0]?.id || '');
    setTurmaInstructorId(instructors[0]?.userId || '');
    setTurmaStartDate(new Date().toISOString().split('T')[0]);
    setShowTurmaModal(true);
  };

  // Open Edit Turma Modal
  const handleOpenEditTurma = (t: Turma) => {
    setEditingTurma(t);
    setTurmaName(t.name);
    setTurmaCourseId(t.courseId);
    setTurmaInstructorId(t.instructorId);
    setTurmaStartDate(t.startDate);
    setShowTurmaModal(true);
  };

  // Submit/Save Turma CRUD
  const handleSaveTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaName.trim() || !turmaCourseId || !turmaInstructorId) {
      showToast("Por favor preencha todos os campos obrigatórios.", "error");
      return;
    }

    const linkedCourse = adminCourses.find(c => c.id === turmaCourseId);
    const linkedInstructor = instructors.find(u => u.userId === turmaInstructorId);

    const newTurma: Turma = {
      id: editingTurma ? editingTurma.id : `turma-${Date.now()}`,
      name: turmaName,
      courseId: turmaCourseId,
      courseTitle: linkedCourse ? linkedCourse.title : 'Curso Geral',
      instructorId: turmaInstructorId,
      instructorName: linkedInstructor ? linkedInstructor.name : 'Vago',
      startDate: turmaStartDate || new Date().toISOString().split('T')[0]
    };

    try {
      await localDB.saveTurma(newTurma);
      showToast(editingTurma ? "Turma atualizada com sucesso!" : "Turma criada com sucesso!");
    } catch (err) {
      console.error(err);
      showToast("Erro ao sincronizar essa alteração com o banco de dados.", "error");
    } finally {
      setShowTurmaModal(false);
      setEditingTurma(null);
    }
  };

  // Delete Turma
  const handleDeleteTurma = async (turmaId: string) => {
    const targetTurma = turmas.find(t => t.id === turmaId);
    const turmaName = targetTurma ? targetTurma.name : "esta turma";

    setConfirmConfig({
      title: "Excluir Turma",
      description: `Tem certeza absoluta que deseja excluir a turma "${turmaName}"? Esta ação removerá a regência de turma e os alunos vinculados perderão o acesso a ela.`,
      confirmText: "Confirmar Exclusão",
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          await localDB.deleteTurma(turmaId);
          showToast("Turma excluída com sucesso!");
        } catch (err) {
          showToast("Erro ao excluir turma.", "error");
        }
      }
    });
  };

  // FILTERS FOR COURSES
  const filteredCourses = computedAdminCourses.filter(c => {
    const term = courseSearchTerm.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      c.category.toLowerCase().includes(term) ||
      c.instructorName.toLowerCase().includes(term)
    );
  });

  // Open Add Course Modal
  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    const newId = `course-${Date.now()}`;
    setModalCourseId(newId);
    setCourseTitle('');
    setCourseType('course');
    setCourseDescription('');
    setCourseCategory('Neurologia');
    setCourseInstructorName(instructors[0]?.name || 'Equipe Savana Experience');
    setCourseInstructorInstagram('');
    setIsCustomInstructor(false);
    setCourseThumbnail('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80');
    setCoursePrice(1490);
    setCourseXpReward(1000);
    setCourseDuration('24 horas');
    setCourseFormat('online');
    setCourseIsPublished(true);
    setCourseSaleType('website');
    setCourseWhatsappNumber('');
    setCourseShowStudents(true);
    setCourseShowBenefits(false);
    setCourseBenefit1Title('Encontros Síncronos / Aulas ao Vivo');
    setCourseBenefit1Desc('Aprenda em tempo real pelo painel interativo com câmeras e quadro negro do professor.');
    setCourseBenefit2Title('Grade Curricular Pedagógica');
    setCourseBenefit2Desc('Selecione e assista aulas em vídeo, leia apostilas digitais e realize simulados.');
    setCourseBenefit3Title('Quizzes de Fixação com XP');
    setCourseBenefit3Desc('Gabarite os testes práticos de cada módulo pedagógico para acumular pontos de XP.');
    
    // Clear upload states
    setUploadPercent(null);
    setUploadError(null);
    setIsUploading(false);
    setIsDragging(false);

    setShowCourseModal(true);
  };

  // Open Edit Course Modal
  const handleOpenEditCourse = (c: Course) => {
    setEditingCourse(c);
    setModalCourseId(c.id);
    setCourseTitle(c.title || '');
    setCourseType(c.type || 'course');
    setCourseDescription(c.description || '');
    setCourseCategory(c.category || 'Neurologia');
    const isPreset = instructors.some(ins => ins.name === c.instructorName) || c.instructorName === 'Equipe Savana Experience';
    setIsCustomInstructor(!isPreset);
    setCourseInstructorName(c.instructorName || 'Equipe Savana Experience');
    setCourseInstructorInstagram(c.instructorInstagram || '');
    setCourseThumbnail(c.thumbnail || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80');
    setCoursePrice(c.price || 0);
    setCourseXpReward(c.xpReward || 1000);
    setCourseDuration(c.totalDuration || '20 horas');
    setCourseFormat(c.format || 'online');
    setCourseIsPublished(c.isPublished !== false);
    setCourseSaleType(c.saleType || 'website');
    setCourseWhatsappNumber(c.whatsappNumber || '');
    setCourseShowStudents(c.showStudentsCount !== false);
    setCourseShowBenefits(!!c.showBenefits);
    setCourseBenefit1Title(c.benefit1Title || 'Encontros Síncronos / Aulas ao Vivo');
    setCourseBenefit1Desc(c.benefit1Desc || 'Aprenda em tempo real pelo painel interativo com câmeras e quadro negro do professor.');
    setCourseBenefit2Title(c.benefit2Title || 'Grade Curricular Pedagógica');
    setCourseBenefit2Desc(c.benefit2Desc || 'Selecione e assista aulas em vídeo, leia apostilas digitais e realize simulados.');
    setCourseBenefit3Title(c.benefit3Title || 'Quizzes de Fixação com XP');
    setCourseBenefit3Desc(c.benefit3Desc || 'Gabarite os testes práticos de cada módulo pedagógico para acumular pontos de XP.');

    // Clear upload states
    setUploadPercent(null);
    setUploadError(null);
    setIsUploading(false);
    setIsDragging(false);

    setShowCourseModal(true);
  };

  // Submit/Save Course CRUD
  const saveCourseData = async (isDraft: boolean) => {
    if (!courseTitle.trim()) {
      showToast("Por favor, preencha pelo menos o Título do Curso para salvar.", "error");
      return;
    }

    if (!isDraft) {
      if (!courseCategory.trim() || !courseInstructorName.trim()) {
        showToast("Por favor preencha todos os campos obrigatórios (Categoria e Docente).", "error");
        return;
      }

      if (courseSaleType === 'whatsapp' && !courseWhatsappNumber.trim()) {
        showToast("Por favor preencha o número de celular do WhatsApp.", "error");
        return;
      }
    }

    const savedId = modalCourseId || (editingCourse ? editingCourse.id : `course-${Date.now()}`);
    const newCourse: Course = {
      id: savedId,
      type: courseType,
      title: courseTitle,
      description: courseDescription || '',
      category: courseCategory || 'Geral',
      instructorName: courseInstructorName || 'Equipe Savana Experience',
      instructorInstagram: courseInstructorInstagram || '',
      thumbnail: courseThumbnail || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
      price: Number(coursePrice) || 0,
      xpReward: Number(courseXpReward) || 1000,
      totalDuration: courseDuration || '20 horas',
      modulesCount: editingCourse ? (editingCourse.modulesCount || 0) : 0,
      enrolledCount: editingCourse ? (editingCourse.enrolledCount || 0) : 0,
      rating: editingCourse ? (editingCourse.rating || 4.8) : 4.8,
      isPublished: isDraft ? false : courseIsPublished,
      format: courseFormat || 'online',
      saleType: courseSaleType,
      whatsappNumber: courseSaleType === 'whatsapp' ? courseWhatsappNumber : '',
      showStudentsCount: courseShowStudents,
      showBenefits: courseShowBenefits,
      benefit1Title: courseBenefit1Title,
      benefit1Desc: courseBenefit1Desc,
      benefit2Title: courseBenefit2Title,
      benefit2Desc: courseBenefit2Desc,
      benefit3Title: courseBenefit3Title,
      benefit3Desc: courseBenefit3Desc
    };

    try {
      await localDB.saveCourse(newCourse);
      showToast(editingCourse ? "Curso atualizado com sucesso!" : (isDraft ? "Rascunho de curso salvo com sucesso!" : "Curso criado com sucesso!"));
    } catch (err) {
      console.error(err);
      showToast("Erro ao sincronizar as alterações do curso com o banco de dados.", "error");
    } finally {
      setShowCourseModal(false);
      setEditingCourse(null);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCourseData(false);
  };

  const handleSaveDraft = async () => {
    await saveCourseData(true);
  };

  // 4. Rewards Handlers
  const filteredRewards = rewards.filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenAddReward = () => {
    setEditingReward(null);
    setRewardTitle('');
    setRewardDesc('');
    setRewardImageUrl('');
    setRewardXpCost(500);
    setRewardStock(10);
    setRewardIsCoupon(false);
    setRewardDiscountPercentage(10);
    setShowRewardModal(true);
  };

  const handleOpenEditReward = (r: any) => {
    setEditingReward(r);
    setRewardTitle(r.title);
    setRewardDesc(r.description);
    setRewardImageUrl(r.imageUrl);
    setRewardXpCost(r.xpCost);
    setRewardStock(r.stock);
    setRewardIsCoupon(r.isCoupon || false);
    setRewardDiscountPercentage(r.discountPercentage || 10);
    setShowRewardModal(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle.trim()) {
      showToast("Título é obrigatório.", "error");
      return;
    }
    const newReward = {
      id: editingReward ? editingReward.id : `reward-${Date.now()}`,
      title: rewardTitle,
      description: rewardDesc,
      imageUrl: rewardImageUrl || (rewardIsCoupon 
        ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=80' // coupon-like image
        : 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&auto=format&fit=crop&q=80'),
      xpCost: Number(rewardXpCost) || 0,
      stock: Number(rewardStock) || 0,
      isCoupon: rewardIsCoupon,
      discountPercentage: rewardIsCoupon ? Number(rewardDiscountPercentage) : undefined
    };
    try {
      await localDB.saveReward(newReward);
      showToast("Recompensa salva com sucesso!");
      setShowRewardModal(false);
    } catch (err) {
      showToast("Erro ao salvar recompensa.", "error");
    }
  };

  const handleDeleteReward = async (r: any) => {
    setConfirmConfig({
      title: "Excluir Recompensa",
      description: `Tem certeza que deseja excluir a recompensa "${r.title}"? Ela será removida da vitrine da loja XP Savana.`,
      confirmText: "Confirmar Exclusão",
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          await localDB.deleteReward(r.id);
          showToast("Recompensa removida!");
        } catch(err) {
          showToast("Falha ao remover.", "error");
        }
      }
    });
  };

  // --- WhatsApp Pre-Registration Actions ---
  const handleSavePreRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preEmail.trim()) {
      showToast("Por favor, informe o e-mail do aluno.", "error");
      return;
    }
    const cleanMail = preEmail.trim().toLowerCase();
    
    // Validate email format basic regex
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanMail)) {
      showToast("Por favor, insira um e-mail com formato válido.", "error");
      return;
    }

    if (preCourseIds.length === 0) {
      showToast("Selecione pelo menos um curso para conceder pré-acesso.", "error");
      return;
    }

    setIsSavingPre(true);
    try {
      const preData: PreRegistration = {
        id: cleanMail,
        email: cleanMail,
        courseIds: preCourseIds,
        used: false,
        createdAt: new Date().toISOString()
      };
      await localDB.savePreRegistration(preData);
      showToast(`E-mail ${cleanMail} pré-registrado com sucesso!`, "success");
      setPreEmail('');
      setPreCourseIds([]);
      
      // Set the newly registered user and trigger the prompt modal
      setNewlyPreRegisteredUser(preData);
      setShowSendEmailPrompt(true);
    } catch (err: any) {
      showToast("Erro ao salvar pré-registro: " + (err.message || String(err)), "error");
    } finally {
      setIsSavingPre(false);
    }
  };

  const handleSendPromptEmail = async () => {
    if (!newlyPreRegisteredUser) return;
    setIsSendingPromptEmail(true);
    try {
      const courseTitles = (newlyPreRegisteredUser.courseIds || []).map(cid => {
        const courseObj = adminCourses.find(ac => ac.id === cid);
        return courseObj ? courseObj.title : cid;
      });

      const response = await fetch('/api/pre-register/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pendingUsers: [{
            email: newlyPreRegisteredUser.email,
            courseTitles
          }],
          customTemplate: emailTemplate
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao disparar e-mail no servidor');
      }

      // Read latest from localDB state to ensure emailSentCount updates correctly
      const currentLatest = localDB.getPreRegistrations().find(p => p.id === newlyPreRegisteredUser.id) || newlyPreRegisteredUser;
      const updatedUser: PreRegistration = {
        ...currentLatest,
        emailSentCount: (currentLatest.emailSentCount || 0) + 1,
        lastEmailSentAt: new Date().toISOString()
      };
      await localDB.savePreRegistration(updatedUser);

      showToast(`E-mail enviado com sucesso para ${newlyPreRegisteredUser.email}!`, "success");
      setShowSendEmailPrompt(false);
      setNewlyPreRegisteredUser(null);
    } catch (err: any) {
      showToast("Erro ao disparar e-mail: " + (err.message || String(err)), "error");
    } finally {
      setIsSendingPromptEmail(false);
    }
  };

  const handleDeletePreRegistration = async (docId: string) => {
    confirm(
      "Remover Pré-registro",
      `Deseja realmente remover o pré-registro de ${docId}? O aluno perderá o direito a auto-enrollment caso ainda não tenha cadastrado sua senha.`,
      "Deletar",
      async () => {
        setConfirmConfig(null);
        try {
          await localDB.deletePreRegistration(docId);
          showToast("Pré-registro removido!");
        } catch (err: any) {
          showToast("Falha ao deletar: " + (err.message || String(err)), "error");
        }
      }
    );
  };

  const handleExportPreRegistrationsCSV = () => {
    try {
      if (filteredPreRegistrations.length === 0) {
        showToast("Não há pré-registros para exportar.", "info");
        return;
      }

      const headers = ['Email', 'Cursos Permitidos', 'Data de Criacao', 'Status', 'Envios de Email', 'Ultimo Envio'];
      const rows = filteredPreRegistrations.map(p => {
        const email = p.email;
        const allowedCourses = (p.courseIds || []).map(cid => {
          const courseObj = adminCourses.find(ac => ac.id === cid);
          return courseObj ? courseObj.title : cid;
        }).join('; ');
        
        const createdAtDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '';
        const status = p.used ? 'Ativo' : 'Pendente';
        const emailSentCount = p.emailSentCount || 0;
        const lastSentDate = p.lastEmailSentAt ? new Date(p.lastEmailSentAt).toLocaleDateString('pt-BR') : '';

        return [
          `"${email.replace(/"/g, '""')}"`,
          `"${allowedCourses.replace(/"/g, '""')}"`,
          `"${createdAtDate}"`,
          `"${status}"`,
          `"${emailSentCount}"`,
          `"${lastSentDate}"`
        ];
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `matriculas_pre_aprovadas_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Relatório CSV de pré-matrículas exportado com sucesso!");
    } catch (err: any) {
      showToast("Erro ao exportar CSV: " + (err.message || String(err)), "error");
    }
  };

  const handleSendEmailsToPending = async () => {
    const pending = pendingPreRegistrations;
    if (pending.length === 0) {
      showToast(
        preCourseFilter
          ? "Não há pré-registros pendentes para o curso selecionado para enviar e-mails."
          : "Não há pré-registros com status pendente para enviar e-mails.",
        "info"
      );
      return;
    }

    if (!emailTemplate.trim()) {
      showToast("Escreva o texto do e-mail antes de disparar.", "error");
      return;
    }

    setIsSendingEmails(true);
    setLastDispatchLog(null);
    try {
      // Map course titles to send in the body
      const pendingUsersData = pending.map(user => {
        const courseTitles = (user.courseIds || []).map(cid => {
          const courseObj = adminCourses.find(ac => ac.id === cid);
          return courseObj ? courseObj.title : cid;
        });
        return {
          email: user.email,
          courseTitles
        };
      });

      const response = await fetch('/api/pre-register/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pendingUsers: pendingUsersData,
          customTemplate: emailTemplate
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao disparar e-mails no servidor');
      }

      const data = await response.json();
      
      // Persist template choice to Firestore
      await localDB.saveEmailTemplate(emailTemplate);

      // Now update the pre-registration states in localDB/Firestore to increment emailSentCount and lastEmailSentAt
      for (const user of pending) {
        const updatedUser: PreRegistration = {
          ...user,
          emailSentCount: (user.emailSentCount || 0) + 1,
          lastEmailSentAt: new Date().toISOString()
        };
        await localDB.savePreRegistration(updatedUser);
      }

      showToast(`Disparado com sucesso para ${data.sentCount} alunos pendentes!`, "success");
      setLastDispatchLog(data.dispatched || []);
    } catch (err: any) {
      showToast("Erro ao disparar e-mails: " + (err.message || String(err)), "error");
    } finally {
      setIsSendingEmails(false);
    }
  };

  const handleSendSingleEmail = async (user: PreRegistration) => {
    if (!emailTemplate.trim()) {
      showToast("Escreva o texto do e-mail antes de disparar.", "error");
      return;
    }

    const courseTitles = (user.courseIds || []).map(cid => {
      const courseObj = adminCourses.find(ac => ac.id === cid);
      return courseObj ? courseObj.title : cid;
    });

    try {
      const response = await fetch('/api/pre-register/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pendingUsers: [{
            email: user.email,
            courseTitles
          }],
          customTemplate: emailTemplate
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao disparar e-mail no servidor');
      }

      const updatedUser: PreRegistration = {
        ...user,
        emailSentCount: (user.emailSentCount || 0) + 1,
        lastEmailSentAt: new Date().toISOString()
      };
      await localDB.savePreRegistration(updatedUser);

      showToast(`E-mail de lembrete enviado para ${user.email}!`, "success");
    } catch (err: any) {
      showToast("Erro ao disparar lembrete: " + (err.message || String(err)), "error");
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      showToast("Por favor, digite um e-mail de teste.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim())) {
      showToast("Por favor, insira um e-mail com formato válido para teste.", "error");
      return;
    }
    if (!emailTemplate.trim()) {
      showToast("Escreva o texto do e-mail antes de disparar.", "error");
      return;
    }

    setIsSendingTest(true);
    try {
      const sampleCourseTitles = ["Clínica Médica de Felinos (Exemplo)", "Anestesiologia Veterinária (Exemplo)"];
      const response = await fetch('/api/pre-register/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pendingUsers: [{
            email: testEmail.trim().toLowerCase(),
            courseTitles: sampleCourseTitles
          }],
          customTemplate: emailTemplate
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao disparar e-mail de teste no servidor');
      }

      showToast(`E-mail de teste enviado com sucesso para ${testEmail.trim()}!`, "success");
      // Save template in case it changed
      await localDB.saveEmailTemplate(emailTemplate);
    } catch (err: any) {
      showToast("Erro ao disparar teste: " + (err.message || String(err)), "error");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!emailTemplate.trim()) {
      showToast("Escreva o texto do e-mail antes de salvar o modelo.", "error");
      return;
    }
    try {
      await localDB.saveEmailTemplate(emailTemplate);
      showToast("Modelo de e-mail salvo com sucesso!", "success");
    } catch (err: any) {
      showToast("Erro ao salvar modelo: " + (err.message || String(err)), "error");
    }
  };

  // Drag and Drop & File Upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleUploadFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUploadFile(files[0]);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione apenas arquivos de imagem (JPEG, PNG, WEBP, etc.).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Erro: O arquivo de imagem excede o limite de tamanho de 5MB.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    try {
      setIsUploading(true);
      setUploadError(null);
      
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], 'thumbnail.jpeg', { type: 'image/jpeg' });
      
      const activeId = modalCourseId || `course-${Date.now()}`;
      if (!modalCourseId) {
        setModalCourseId(activeId);
      }
      const downloadUrl = await uploadCourseThumbnail(activeId, croppedFile, (progress) => {
        setUploadPercent(progress);
      });
      setCourseThumbnail(downloadUrl);
      setUploadPercent(null);
      setCropImageSrc(null); // Close cropper
    } catch (e: any) {
      console.error('Core Storage Upload error:', e);
      setUploadError('Erro ao carregar imagem para o Storage. Confirme regras ou limite offline.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseId: string) => {
    const targetCourse = adminCourses.find(c => c.id === courseId);
    const courseTitle = targetCourse ? targetCourse.title : "este curso";

    setConfirmConfig({
      title: "Excluir Curso",
      description: `Tem certeza absoluta que deseja excluir o curso "${courseTitle}"? Esta ação removerá o curso, suas aulas, módulos e dados vinculados no Firestore de forma definitiva.`,
      confirmText: "Confirmar Exclusão",
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          await localDB.deleteCourse(courseId);
          showToast("Curso excluído com sucesso!");
        } catch (err) {
          showToast("Erro ao excluir curso.", "error");
        }
      }
    });
  };

  // Manage Reviews Functions
  const handleOpenManageReviews = (course: Course) => {
    setSelectedReviewsCourse(course);
    setShowReviewsModal(true);
  };

  const handleApproveReview = async (reviewUserId: string) => {
    if (!selectedReviewsCourse) return;
    try {
      const reviews = selectedReviewsCourse.reviews || [];
      const updatedReviews = reviews.map(r => {
        if (r.userId === reviewUserId) {
          return { ...r, approved: true };
        }
        return r;
      });

      // Recalculate average rating of only approved reviews
      const approvedReviews = updatedReviews.filter(r => r.approved === true);
      const averageRating = approvedReviews.length > 0 
        ? parseFloat((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
        : 4.8;

      const updatedCourse: Course = {
        ...selectedReviewsCourse,
        reviews: updatedReviews,
        rating: averageRating
      };

      await localDB.saveCourse(updatedCourse);
      setSelectedReviewsCourse(updatedCourse);
      showToast("Avaliação aprovada com sucesso!");
    } catch (err) {
      showToast("Erro ao aprovar avaliação.", "error");
    }
  };

  const handleDisapproveReview = async (reviewUserId: string) => {
    if (!selectedReviewsCourse) return;
    try {
      const reviews = selectedReviewsCourse.reviews || [];
      const updatedReviews = reviews.map(r => {
        if (r.userId === reviewUserId) {
          return { ...r, approved: false };
        }
        return r;
      });

      // Recalculate average rating of only approved reviews
      const approvedReviews = updatedReviews.filter(r => r.approved === true);
      const averageRating = approvedReviews.length > 0 
        ? parseFloat((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
        : 4.8;

      const updatedCourse: Course = {
        ...selectedReviewsCourse,
        reviews: updatedReviews,
        rating: averageRating
      };

      await localDB.saveCourse(updatedCourse);
      setSelectedReviewsCourse(updatedCourse);
      showToast("Avaliação desativada!");
    } catch (err) {
      showToast("Erro ao desativar avaliação.", "error");
    }
  };

  const handleDeleteReview = async (reviewUserId: string) => {
    if (!selectedReviewsCourse) return;
    setConfirmConfig({
      title: "Excluir Avaliação",
      description: "Tem certeza de que deseja remover esta avaliação definitivamente do sistema?",
      confirmText: "Sim, Excluir",
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          const reviews = selectedReviewsCourse.reviews || [];
          const updatedReviews = reviews.filter(r => r.userId !== reviewUserId);

          // Recalculate average rating of only approved reviews
          const approvedReviews = updatedReviews.filter(r => r.approved === true);
          const averageRating = approvedReviews.length > 0 
            ? parseFloat((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
            : 4.8;

          const updatedCourse: Course = {
            ...selectedReviewsCourse,
            reviews: updatedReviews,
            rating: averageRating
          };

          await localDB.saveCourse(updatedCourse);
          setSelectedReviewsCourse(updatedCourse);
          showToast("Avaliação excluída permanentemente!");
        } catch (err) {
          showToast("Erro ao excluir avaliação.", "error");
        }
      }
    });
  };

  return (
    <div id="admin-panel-container" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
      {/* Toast alert overlay */}
      {toast && (
        <div 
          className={`fixed top-24 right-6 z-[100] bg-slate-950 border-2 ${
            toast.type === 'error' ? 'border-red-500/80' : toast.type === 'info' ? 'border-blue-500/80' : 'border-emerald-500/80'
          } text-slate-100 shadow-2xl px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce max-w-sm`} 
          id="admin-toast-message"
        >
          {toast.type === 'error' ? (
            <AlertCircle className="text-red-400 w-5 h-5 flex-shrink-0" />
          ) : toast.type === 'info' ? (
            <Database className="text-blue-400 w-5 h-5 flex-shrink-0 animate-pulse" />
          ) : (
            <CheckCircle2 className="text-emerald-400 w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold leading-normal">{toast.message}</span>
        </div>
      )}

      {/* Visual Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-805">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 px-2.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold block">
              Ambiente de Moderação Geral
            </span>
          </div>
          <h2 className="font-display text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Shield size={24} className="text-blue-400" />
            Administração Central Savana Experience
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Gerencie credenciais de professores, crie turmas dinâmicas de pós-graduação veterinária e designe a regência docente exclusiva correspondente.
          </p>
        </div>

        {/* Total stats counters */}
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl text-center min-w-[100px]">
            <span className="block text-[9px] font-mono uppercase text-slate-505 tracking-wider">Turmas Ativas</span>
            <span className="font-display text-lg font-bold text-blue-400">{turmas.length}</span>
          </div>
          <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-2xl text-center min-w-[100px]">
            <span className="block text-[9px] font-mono uppercase text-slate-505 tracking-wider">Docentes</span>
            <span className="font-display text-lg font-bold text-emerald-450">
              {allUsers.filter(u => u.role === 'instructor').length}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Panel Tab Toggles */}
      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-855 self-start mb-6 w-fit">
        <button
          id="admin-tab-users"
          onClick={() => setAdminTab('users')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            adminTab === 'users' 
              ? 'bg-blue-500 text-slate-950 font-bold shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield size={14} />
          Credenciais e Cargos
        </button>
        <button
          id="admin-tab-turmas"
          onClick={() => setAdminTab('turmas')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            adminTab === 'turmas' 
              ? 'bg-blue-500 text-slate-950 font-bold shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={14} />
          Gerenciar Turmas ({turmas.length})
        </button>
        <button
          id="admin-tab-courses"
          onClick={() => setAdminTab('courses')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            adminTab === 'courses' 
              ? 'bg-blue-500 text-slate-950 font-bold shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen size={14} />
          Gerenciar Cursos ({adminCourses.length})
        </button>
        <button
          id="admin-tab-rewards"
          onClick={() => setAdminTab('rewards')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            adminTab === 'rewards' 
              ? 'bg-blue-500 text-slate-950 font-bold shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award size={14} />
          Recompensas XP ({rewards.length})
        </button>

        <button
          id="admin-tab-finance"
          onClick={() => setAdminTab('finance')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            adminTab === 'finance' 
              ? 'bg-blue-500 text-slate-950 font-bold shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database size={14} />
          Relatório Financeiro
        </button>

        <button
          id="admin-tab-certificates"
          onClick={() => setAdminTab('certificates')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            adminTab === 'certificates' 
              ? 'bg-blue-500 text-slate-950 font-bold shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText size={14} />
          Configurar Certificados
        </button>

        <button
          id="admin-tab-pre-register"
          onClick={() => setAdminTab('pre-register')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            adminTab === 'pre-register' 
              ? 'bg-blue-500 text-slate-100 font-bold shadow-md' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus size={14} />
          Pré-Registro WhatsApp
        </button>

      </div>

      {/* TAB 1: USER LISTING VIEW */}
      {adminTab === 'users' && (
        <div className="space-y-6">
          {/* Control Actions / Search Bar Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            <div className="relative w-full sm:flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="admin-search-users"
                type="text"
                placeholder="Buscar por nome de aluno ou endereço de e-mail..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setUsersPage(1);
                }}
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500/60 transition pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-850 w-full sm:w-auto overflow-x-auto shrink-0">
              <button
                onClick={() => {
                  setRoleFilter('all');
                  setUsersPage(1);
                }}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 ${
                  roleFilter === 'all' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => {
                  setRoleFilter('student');
                  setUsersPage(1);
                }}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 ${
                  roleFilter === 'student' ? 'bg-slate-800 text-slate-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Alunos
              </button>
              <button
                onClick={() => {
                  setRoleFilter('instructor');
                  setUsersPage(1);
                }}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 ${
                  roleFilter === 'instructor' ? 'bg-emerald-550 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Professores
              </button>
              <button
                onClick={() => {
                  setRoleFilter('monitor');
                  setUsersPage(1);
                }}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition shrink-0 ${
                  roleFilter === 'monitor' ? 'bg-purple-500 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monitores
              </button>
            </div>
          </div>

          {/* User database table list */}
          <div className="overflow-x-auto border border-slate-850 rounded-2xl bg-slate-955/45">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-855 bg-slate-900/40">
                  <th className="py-3.5 px-4 text-[10px] font-mono uppercase tracking-wider text-slate-400">Usuário / Cadastro</th>
                  <th className="py-3.5 px-4 text-[10px] font-mono uppercase tracking-wider text-slate-400">Contato / Email</th>
                  <th className="py-3.5 px-4 text-[10px] font-mono uppercase tracking-wider text-slate-400 text-center">Progresso XP</th>
                  <th className="py-3.5 px-4 text-[10px] font-mono uppercase tracking-wider text-slate-400 text-center">Nível</th>
                  <th className="py-3.5 px-4 text-[10px] font-mono uppercase tracking-wider text-slate-400">Cargo Atual</th>
                  <th className="py-3.5 px-4 text-[10px] font-mono uppercase tracking-wider text-slate-400 text-right">Ação de Credencial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center">
                      <UserX className="mx-auto text-slate-605 mb-2" size={28} />
                      <p className="text-xs text-slate-500">Nenhum cadastro encontrado compatível com os filtros inseridos.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const isAdminUser = user.email === 'ciuldinciuldin@gmail.com';
                    
                    return (
                      <tr key={user.userId} className="hover:bg-slate-900/20 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-9 h-9 rounded-full border border-slate-800 bg-slate-900 scale-95"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-200 block">
                                  {user.name}
                                </span>
                                {user.role === 'monitor' && (
                                  <span className="text-[8px] uppercase font-mono bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded font-bold border border-purple-500/20 inline-flex items-center gap-0.5">
                                    <Shield size={8} /> Monitor
                                  </span>
                                )}
                                {user.userId === currentUserId && (
                                  <span className="text-[8px] uppercase font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                                    Você
                                  </span>
                                )}
                                {isAdminUser && (
                                  <span className="text-[8px] uppercase font-mono bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-500/20">
                                    Admin Geral
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-500 font-mono block">
                                ID: {user.userId.substring(0, 10)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs font-mono text-slate-350">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail size={13} className="text-slate-500 animate-pulse" />
                            <span>{user.email || 'Sem email cadastrado'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs font-mono font-bold text-center text-slate-300">
                          {user.xp.toLocaleString()} XP
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs font-bold px-2 py-0.5 rounded-lg">
                            <Award size={11} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                            Lv {user.level}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-xs">
                          {user.role === 'instructor' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-xl font-bold text-[10px] uppercase tracking-wider">
                              <UserCheck size={11} />
                              Professor
                            </span>
                          ) : user.role === 'monitor' ? (
                            <span className="inline-flex items-center gap-1 bg-purple-500/15 border border-purple-500/30 text-purple-400 px-2.5 py-1 rounded-xl font-bold text-[10px] uppercase tracking-wider">
                              <Shield size={11} />
                              Monitor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-900 border border-slate-808 text-slate-400 px-2.5 py-1 rounded-xl font-bold text-[10px] uppercase tracking-wider">
                              <User size={11} />
                              Estudante
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              id={`toggle-role-${user.userId}`}
                              disabled={updatingUserId === user.userId || user.email === 'ciuldinciuldin@gmail.com'}
                              onClick={() => handleToggleRole(user)}
                              className={`text-[10px] uppercase font-mono font-bold tracking-wider px-3.5 py-1.5 rounded-lg transition-all ${
                                user.role === 'instructor'
                                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {updatingUserId === user.userId ? (
                                'Atualizando...'
                              ) : user.role === 'instructor' ? (
                                'Remover Docência'
                              ) : (
                                'Designar Professor'
                              )}
                            </button>

                            <button
                              id={`toggle-monitor-${user.userId}`}
                              disabled={updatingUserId === user.userId || user.email === 'ciuldinciuldin@gmail.com'}
                              onClick={async () => {
                                setUpdatingUserId(user.userId);
                                const newRole = user.role === 'monitor' ? 'student' : 'monitor';
                                try {
                                  await onUpdateRole(user.userId, newRole);
                                  showToast("Cargo de monitor atualizado com sucesso!");
                                } catch (err) {
                                  showToast("Erro ao atualizar monitor.", "error");
                                } finally {
                                  setUpdatingUserId(null);
                                }
                              }}
                              className={`text-[10px] uppercase font-mono font-bold tracking-wider px-3.5 py-1.5 rounded-lg transition-all ${
                                user.role === 'monitor'
                                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40'
                                  : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 hover:border-purple-500/40'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {updatingUserId === user.userId ? (
                                '...'
                              ) : user.role === 'monitor' ? (
                                'Remover Monitoria'
                              ) : (
                                'Designar Monitor'
                              )}
                            </button>
                            {/* Make Admin Toggle Button */}
                            {!isAdminUser && (
                              <button
                                disabled={updatingUserId === user.userId}
                                onClick={async () => {
                                  setUpdatingUserId(user.userId);
                                  try {
                                    // By setting them to 'admin', the backend handles assigning them to the admins collection
                                    await onUpdateRole(user.userId, 'admin');
                                    showToast("Admin delegado com sucesso! Eles agora têm acesso total.");
                                  } catch(e) {
                                    showToast("Erro ao delegar admin.", "error");
                                  }
                                  setUpdatingUserId(null);
                                }}
                                className="text-[10px] uppercase font-mono font-bold tracking-wider px-3.5 py-1.5 rounded-lg transition-all bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40"
                                title="Delegar acesso total de administrador"
                              >
                                {updatingUserId === user.userId ? '...' : 'Tornar Admin'}
                              </button>
                            )}
                            <button
                              id={`edit-user-${user.userId}`}
                              disabled={updatingUserId === user.userId}
                              onClick={() => {
                                setEditingUser(user);
                                setEditUserName(user.name);
                                setEditUserEmail(user.email || '');
                                setEditUserXp(user.xp);
                                setEditUserLevel(user.level);
                                setEditUserAvatar(user.avatar || '');
                                setShowUserModal(true);
                              }}
                              className="p-1.5 bg-slate-900 border border-slate-850 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Editar Cadastro de Aluno"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              id={`delete-user-${user.userId}`}
                              disabled={updatingUserId === user.userId || user.email === 'ciuldinciuldin@gmail.com'}
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 bg-slate-900 border border-slate-850 text-slate-400 hover:text-red-400 hover:border-red-500/30 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Excluir Usuário"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            
            {totalUsersPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-850 bg-slate-900/10 gap-3">
                <span className="text-slate-400 text-xs text-center sm:text-left">
                  Mostrando <strong>{(usersPage - 1) * ITEMS_PER_PAGE_USERS + 1}</strong> a{' '}
                  <strong>{Math.min(usersPage * ITEMS_PER_PAGE_USERS, filteredUsers.length)}</strong> de{' '}
                  <strong>{filteredUsers.length}</strong> usuários
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={usersPage === 1}
                    onClick={() => setUsersPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Anterior
                  </button>
                  <span className="text-slate-300 font-mono text-xs font-semibold min-w-[50px] text-center">
                    {usersPage} / {totalUsersPages}
                  </span>
                  <button
                    type="button"
                    disabled={usersPage === totalUsersPages}
                    onClick={() => setUsersPage(prev => Math.min(prev + 1, totalUsersPages))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TURMAS (COHORTS) MANAGEMENT VIEW */}
      {adminTab === 'turmas' && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="search-turmas-input"
                type="text"
                placeholder="Buscar por turma, curso ou professor..."
                value={turmaSearchTerm}
                onChange={(e) => setTurmaSearchTerm(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500/60 transition pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <button
              id="btn-add-turma"
              onClick={handleOpenAddTurma}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 transition"
            >
              <Plus size={15} />
              Nova Turma
            </button>
          </div>

          {/* Turmas Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTurmas.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-slate-950/45 border border-slate-850 rounded-2xl">
                <Layers className="mx-auto text-slate-600 mb-2" size={28} />
                <p className="text-xs text-slate-500">Nenhuma turma cadastrada compatível com os filtros inseridos.</p>
              </div>
            ) : (
              filteredTurmas.map((t) => {
                const instructorUser = allUsers.find(u => u.userId === t.instructorId);
                return (
                  <div key={t.id} id={`turma-item-${t.id}`} className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between relative group">
                    <div>
                      {/* Badge and Title */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[9px] uppercase font-mono tracking-widest text-blue-400 font-bold block bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                          Id: {t.id}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Calendar size={11} />
                          Início: {t.startDate}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-sm text-slate-100 line-clamp-1 mb-1">
                        {t.name}
                      </h4>

                      {/* Associated Course */}
                      <div className="flex items-center gap-1.5 mb-4 text-xs text-slate-400">
                        <BookOpen size={12} className="text-slate-500 shrink-0" />
                        <span className="line-clamp-1">Curso: {t.courseTitle}</span>
                      </div>

                      {/* Instructor designation card section */}
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-900 flex items-center gap-2.5 mb-4">
                        <img 
                          src={instructorUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-800"
                        />
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider font-mono text-slate-500">Regente Docente</span>
                          <span className="font-semibold text-xs text-slate-200">{t.instructorName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons drawer */}
                    <div className="flex items-center justify-end gap-2 border-t border-slate-900 pt-3 mt-2">
                      <button
                        id={`btn-edit-turma-${t.id}`}
                        onClick={() => handleOpenEditTurma(t)}
                        className="p-2 bg-slate-900 border border-slate-850 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 rounded-lg transition"
                        title="Editar Turma"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        id={`btn-delete-turma-${t.id}`}
                        onClick={() => handleDeleteTurma(t.id)}
                        className="p-2 bg-slate-900 border border-slate-850 text-slate-400 hover:text-red-400 hover:border-red-500/30 rounded-lg transition"
                        title="Excluir Turma"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COURSES CENTRAL MANAGEMENT VIEW */}
      {adminTab === 'courses' && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="search-courses-input"
                type="text"
                placeholder="Buscar por nome do curso, categoria ou professor..."
                value={courseSearchTerm}
                onChange={(e) => setCourseSearchTerm(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500/60 transition pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <button
              id="btn-add-course"
              onClick={handleOpenAddCourse}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 transition"
            >
              <Plus size={15} />
              Novo Curso
            </button>
          </div>

          {/* Courses Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredCourses.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-slate-950/45 border border-slate-850 rounded-2xl">
                <BookOpen className="mx-auto text-slate-600 mb-2" size={28} />
                <p className="text-xs text-slate-500">Nenhum curso cadastrado compatível com os filtros inseridos.</p>
              </div>
            ) : (
              filteredCourses.map((c) => {
                return (
                  <div key={c.id} id={`course-mgmt-item-${c.id}`} className={`bg-slate-950/40 border p-5 rounded-2xl hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between relative group ${c.isPublished ? 'border-slate-850' : 'border-amber-500/20 bg-amber-955/5 shadow-inner shadow-amber-500/5'}`}>
                    <div>
                      {/* Badge and Title */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-400 font-bold block bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {c.category}
                        </span>
                        <div className="flex items-center gap-2">
                          {c.isPublished ? (
                            <span className="text-[9px] uppercase font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold">
                              Publicado
                            </span>
                          ) : (
                            <span className="text-[9px] uppercase font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                              Rascunho
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-slate-350">
                            {c.price > 0 ? c.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Gratuito'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 mb-3">
                        <img 
                          src={c.thumbnail} 
                          alt="" 
                          className="w-16 h-12 rounded-lg object-cover bg-slate-900 border border-slate-800 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="font-display font-bold text-sm text-slate-100 line-clamp-1">
                            {c.title}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                            {c.description}
                          </p>
                        </div>
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-slate-900/60 mb-3 text-[10px] font-mono text-slate-400">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-505">Formato</span>
                          <span className="font-semibold text-slate-300 capitalize">{c.format}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-550">Duração</span>
                          <span className="font-semibold text-slate-300">{c.totalDuration}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-slate-550">Módulos</span>
                          <span className="font-semibold text-slate-300">{c.modulesCount} un</span>
                        </div>
                      </div>

                      {/* Instructor block */}
                      <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-900 flex items-center gap-2 mb-2">
                        <div className="p-1 px-1.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold font-mono uppercase">Docente</div>
                        <span className="font-semibold text-xs text-slate-200 truncate">Dr(a): {c.instructorName}</span>
                      </div>
                    </div>

                    {/* Action buttons drawer */}
                    <div className="flex flex-col gap-2 border-t border-slate-900 pt-3 mt-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-405">
                        <span>XP total: <strong className="text-slate-300">+{c.xpReward} XP</strong></span>
                        <span>Alunos: <strong className="text-slate-300">{c.enrolledCount}</strong> <span className="text-slate-500 text-[9px]">{c.showStudentsCount === false ? '(Oculto no site)' : '(Visível no site)'}</span></span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-900/40">
                        <span className="text-[10px] font-mono text-slate-450">
                          Venda: <strong className={`font-mono font-bold uppercase tracking-wide ${c.saleType === 'whatsapp' ? 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded' : 'text-blue-400 bg-blue-500/5 border border-blue-500/10 px-1.5 py-0.5 rounded'}`}>{c.saleType === 'whatsapp' ? 'WhatsApp' : 'Website'}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          {onPreviewCourse && (
                            <button
                              id={`btn-preview-course-${c.id}`}
                              onClick={() => onPreviewCourse(c)}
                              className="p-2 bg-slate-900 border border-slate-850 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 rounded-lg transition"
                              title="Visualizar curso como aluno"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <button
                            id={`btn-manage-reviews-${c.id}`}
                            onClick={() => handleOpenManageReviews(c)}
                            className="p-2 bg-slate-900 border border-slate-850 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 rounded-lg transition relative"
                            title="Gerenciar Avaliações"
                          >
                            <Star size={14} className={(c.reviews || []).some(r => r.approved === true) ? "fill-amber-400 text-amber-400" : ""} />
                            {(() => {
                              const pendingCount = (c.reviews || []).filter(r => r.approved === false || r.approved === undefined).length;
                              if (pendingCount === 0) return null;
                              return (
                                <span className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 font-mono text-[9px] font-extrabold h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-slate-900 shadow-sm animate-pulse">
                                  {pendingCount}
                                </span>
                              );
                            })()}
                          </button>
                          <button
                            id={`btn-edit-course-${c.id}`}
                            onClick={() => handleOpenEditCourse(c)}
                            className="p-2 bg-slate-900 border border-slate-850 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 rounded-lg transition"
                            title="Editar Curso"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            id={`btn-delete-course-${c.id}`}
                            onClick={() => handleDeleteCourse(c.id)}
                            className="p-2 bg-slate-900 border border-slate-850 text-slate-400 hover:text-red-400 hover:border-red-500/30 rounded-lg transition"
                            title="Excluir Curso"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REWARDS LISTING VIEW */}
      {adminTab === 'rewards' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="search-rewards-input"
                type="text"
                placeholder="Buscar recompensa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-blue-500/60 transition pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <button
              onClick={handleOpenAddReward}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 transition"
            >
              <Plus size={15} />
              Nova Recompensa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredRewards.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-slate-950/45 border border-slate-850 rounded-2xl">
                <Award className="mx-auto text-slate-600 mb-2" size={28} />
                <p className="text-sm font-semibold text-slate-300">Nenhuma recompensa encontrada</p>
              </div>
            ) : (
              filteredRewards.map(r => (
                <div key={r.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-850 mb-3 overflow-hidden flex items-center justify-center">
                    <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-200 mb-1">{r.title}</h4>
                  <p className="text-[10px] text-slate-400 text-center mb-3 line-clamp-2">{r.description}</p>
                  
                  <div className="flex flex-wrap gap-1.5 w-full justify-center text-xs font-mono mb-4">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                      {r.xpCost} XP
                    </span>
                    <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
                      Estoque: {r.stock}
                    </span>
                    {r.isCoupon && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px]">
                        Cupom {r.discountPercentage}% off
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 w-full mt-auto">
                    <button onClick={() => handleOpenEditReward(r)} className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 py-1.5 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1">
                      <Edit size={12}/> Editar
                    </button>
                    <button onClick={() => handleDeleteReward(r)} className="bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-red-500 py-1.5 px-3 rounded-lg text-[10px] uppercase font-bold transition flex items-center justify-center">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}



      {/* FORM MODAL: ADD / EDIT TURMA */}
      {showTurmaModal && (
        <div id="turma-create-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative my-8">
            <h3 className="font-display text-lg font-bold text-slate-100 mb-1">
              {editingTurma ? 'Editar Turma' : 'Criar Nova Turma'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Preencha os dados e designe o docente encarregado.
            </p>

            <form onSubmit={handleSaveTurma} className="space-y-4">
              {/* Turma Name */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Nome da Turma *</label>
                <input
                  id="modal-turma-name"
                  type="text"
                  required
                  value={turmaName}
                  onChange={(e) => setTurmaName(e.target.value)}
                  placeholder="Ex: Medicina de Felinos - Turma Alfa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Linked Course options */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Curso Integrado *</label>
                <select
                  id="modal-turma-course"
                  value={turmaCourseId}
                  onChange={(e) => setTurmaCourseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-blue-500"
                >
                  {adminCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Candidates instructor assignment dropdown */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Professor Docente Designado *</label>
                <select
                  id="modal-turma-instructor"
                  value={turmaInstructorId}
                  onChange={(e) => setTurmaInstructorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-blue-500"
                >
                  {instructors.map(ins => (
                    <option key={ins.userId} value={ins.userId}>{ins.name} ({ins.userId === currentUserId ? 'Você' : 'Professor'})</option>
                  ))}
                </select>
              </div>

              {/* Starting date field */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Data de Início das Aulas</label>
                <input
                  id="modal-turma-date"
                  type="date"
                  value={turmaStartDate}
                  onChange={(e) => setTurmaStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Confirm / Cancel Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850 mt-5">
                <button
                  id="modal-cancel-btn"
                  type="button"
                  onClick={() => setShowTurmaModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  id="modal-save-btn"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 transition"
                >
                  {editingTurma ? 'Salvar Mudanças' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL: ADD / EDIT COURSE */}
      {showCourseModal && (
        <div id="course-create-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative my-8">
            <h3 className="font-display text-lg font-bold text-slate-100 mb-1">
              {editingCourse ? 'Editar Curso' : 'Criar Novo Curso'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Os dados básicos de ementa ditarão os bônus e requisitos dos alunos.
            </p>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Course Title */}
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Título do Curso *</label>
                  <input
                    id="modal-course-title"
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Ex: Pós-Graduação em Cardiologia Canina"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {/* Course Type */}
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Tipo de Conteúdo *</label>
                  <select
                    value={courseType}
                    onChange={(e) => setCourseType(e.target.value as 'course' | 'capsule')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="course">Curso Completo</option>
                    <option value="capsule">Cápsula de Conhecimento</option>
                  </select>
                </div>
              </div>

              {/* Course Description */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Descrição Principal</label>
                <textarea
                  id="modal-course-description"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder="Ementa resumida do curso..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Grid 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Categoria *</label>
                  <input
                    id="modal-course-category"
                    type="text"
                    required
                    value={courseCategory}
                    onChange={(e) => setCourseCategory(e.target.value)}
                    placeholder="Ex: Neurologia, Cirurgia, Felinos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Carga Horária (Dur)</label>
                  <input
                    id="modal-course-duration"
                    type="text"
                    value={courseDuration}
                    onChange={(e) => setCourseDuration(e.target.value)}
                    placeholder="Ex: 24 horas"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Grid 2 Columns (Price & XP) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Preço *</label>
                  <div className="relative">
                    <div className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-500 text-xs font-bold pointer-events-none">
                      R$
                    </div>
                    <input
                      id="modal-course-price"
                      type="number"
                      step="0.01"
                      required
                      min={0}
                      value={coursePrice}
                      onChange={(e) => setCoursePrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* XP Reward */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Recompensa Final (XP) *</label>
                  <input
                    id="modal-course-xp"
                    type="number"
                    required
                    min={0}
                    value={courseXpReward}
                    onChange={(e) => setCourseXpReward(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Format & Instructor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Format selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Formato *</label>
                  <select
                    id="modal-course-format"
                    value={courseFormat}
                    onChange={(e) => setCourseFormat(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-blue-500"
                  >
                    <option value="online">Online / Ao Vivo</option>
                    <option value="recorded">EAD Gravado</option>
                    <option value="presencial">Presencial Híbrido</option>
                  </select>
                </div>

                {/* Instructor name */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Docente do Curso *</label>
                  <div className="space-y-2">
                    <select
                      id="modal-course-instructor"
                      value={isCustomInstructor ? 'custom' : courseInstructorName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsCustomInstructor(true);
                          setCourseInstructorName('');
                        } else {
                          setIsCustomInstructor(false);
                          setCourseInstructorName(val);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-blue-500"
                    >
                      {instructors.map(ins => (
                        <option key={ins.userId} value={ins.name}>{ins.name}</option>
                      ))}
                      <option value="Equipe Savana Experience">Equipe Savana Experience</option>
                      <option value="custom">Outro (Digitar Nome...)</option>
                    </select>

                    {isCustomInstructor && (
                      <div className="relative animate-fade-in">
                        <input
                          id="modal-course-custom-instructor-input"
                          type="text"
                          placeholder="Digite o nome do docente..."
                          value={courseInstructorName}
                          onChange={(e) => setCourseInstructorName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Instagram do Docente */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Instagram do Docente (opcional)</label>
                <input
                  id="modal-course-instructor-instagram"
                  type="text"
                  placeholder="Ex: @lucas_vet"
                  value={courseInstructorInstagram}
                  onChange={(e) => setCourseInstructorInstagram(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Thumbnail Upload & URL Input */}
              <div className="space-y-3">
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400">Imagem de Capa do Curso *</label>
                
                {/* Drag and drop zone */}
                <div
                  id="drop-zone-container"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center min-h-[140px] cursor-pointer ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {courseThumbnail ? (
                    <div className="flex flex-col items-center gap-3">
                      {/* Image Preview */}
                      <img 
                        src={courseThumbnail} 
                        alt="Preview da Capa" 
                        className="w-24 h-16 rounded-lg object-cover bg-slate-900 border border-slate-800 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-center">
                        <p className="text-[11px] font-semibold text-slate-300">Alterar Imagem de Capa</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Arraste uma nova imagem ou clique para selecionar</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-400 hover:text-slate-300">
                        <Upload size={20} />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-semibold text-slate-300">Carregar Imagem de Capa</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Arraste e solte uma imagem aqui, ou clique para explorar</p>
                      </div>
                    </div>
                  )}

                  {/* Uploading progress overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="text-blue-500 animate-spin" />
                      <span className="text-xs font-mono text-slate-300 font-bold">Enviando... {uploadPercent}%</span>
                      <div className="w-32 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="bg-blue-500 h-full transition-all duration-300" 
                          style={{ width: `${uploadPercent || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p className="text-[10px] font-mono font-semibold text-red-400">{uploadError}</p>
                )}

                {/* Text input fallback for Unsplash/Custom URLs */}
                <div>
                  <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider mb-1">Ou insira uma URL manual</span>
                  <input
                    id="modal-course-thumbnail"
                    type="text"
                    value={courseThumbnail}
                    onChange={(e) => setCourseThumbnail(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Canais de Venda & Visualização de Alunos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Canal de Venda */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-2">Canal de Venda *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        id="modal-sale-type-website"
                        type="radio"
                        name="course-sale-type"
                        value="website"
                        checked={courseSaleType === 'website'}
                        onChange={() => setCourseSaleType('website')}
                        className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-800 focus:ring-blue-500 focus:ring-offset-slate-900"
                      />
                      Vender via Website
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        id="modal-sale-type-whatsapp"
                        type="radio"
                        name="course-sale-type"
                        value="whatsapp"
                        checked={courseSaleType === 'whatsapp'}
                        onChange={() => setCourseSaleType('whatsapp')}
                        className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-800 focus:ring-blue-500 focus:ring-offset-slate-900"
                      />
                      Vender via WhatsApp
                    </label>
                  </div>
                </div>

                {/* Exibir bbb de Alunos */}
                <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                  <input
                    id="modal-course-show-students-chk"
                    type="checkbox"
                    checked={courseShowStudents}
                    onChange={(e) => setCourseShowStudents(e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-800 rounded focus:ring-blue-500 shrink-0"
                  />
                  <div>
                    <label htmlFor="modal-course-show-students-chk" className="block text-xs font-bold text-slate-200 cursor-pointer">Mostrar Total de Alunos</label>
                    <span className="text-[10px] text-slate-500 font-mono">Controla a exibição do contador de alunos para este curso.</span>
                  </div>
                </div>
              </div>

              {/* Celular do Whatsapp se selecionado */}
              {courseSaleType === 'whatsapp' && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="modal-whatsapp-number" className="block text-[10px] uppercase tracking-wider font-mono text-emerald-400 font-bold">Número do Celular WhatsApp *</label>
                    <span className="text-[9px] text-slate-500 font-mono">Formato: (xx) xxxxx-xxxx</span>
                  </div>
                  <input
                    id="modal-whatsapp-number"
                    type="text"
                    value={courseWhatsappNumber}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 11) val = val.slice(0, 11);
                      if (val.length > 6) {
                        val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                      } else if (val.length > 2) {
                        val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                      } else if (val.length > 0) {
                        val = `(${val}`;
                      }
                      setCourseWhatsappNumber(val);
                    }}
                    placeholder="(21) 97147-7755"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                    Este número receberá as mensagens diretas de compra de vagas e inscrições via WhatsApp.
                  </p>
                </div>
              )}

              {/* Exibir Benefícios Inclusos */}
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                <div className="flex items-center gap-3">
                  <input
                    id="modal-course-show-benefits-chk"
                    type="checkbox"
                    checked={courseShowBenefits}
                    onChange={(e) => setCourseShowBenefits(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 bg-slate-900 border-slate-800 rounded focus:ring-emerald-500 shrink-0"
                  />
                  <div>
                    <label htmlFor="modal-course-show-benefits-chk" className="block text-xs font-bold text-slate-200 cursor-pointer">
                      Exibir Benefícios Inclusos na Matrícula
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Habilita e personaliza a seção de benefícios na exibição de detalhes sob "Saiba Mais".</span>
                  </div>
                </div>

                {courseShowBenefits && (
                  <div className="space-y-4 pt-3 border-t border-slate-850">
                    <h5 className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold block">Personalizar Benefícios</h5>
                    
                    {/* Benefit 1 */}
                    <div className="space-y-2 pl-3 border-l-2 border-emerald-500/20">
                      <label className="block text-[10px] font-mono text-slate-400">Benefício 1: Título e Descrição</label>
                      <input
                        type="text"
                        value={courseBenefit1Title}
                        onChange={(e) => setCourseBenefit1Title(e.target.value)}
                        placeholder="Ex: Encontros Síncronos / Aulas au Vivo"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                      <textarea
                        value={courseBenefit1Desc}
                        onChange={(e) => setCourseBenefit1Desc(e.target.value)}
                        placeholder="Ex: Aprenda em tempo real pelo painel interativo com câmeras..."
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Benefit 2 */}
                    <div className="space-y-2 pl-3 border-l-2 border-emerald-500/20">
                      <label className="block text-[10px] font-mono text-slate-400">Benefício 2: Título e Descrição</label>
                      <input
                        type="text"
                        value={courseBenefit2Title}
                        onChange={(e) => setCourseBenefit2Title(e.target.value)}
                        placeholder="Ex: Grade Curricular Pedagógica"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                      <textarea
                        value={courseBenefit2Desc}
                        onChange={(e) => setCourseBenefit2Desc(e.target.value)}
                        placeholder="Ex: Selecione e assista aulas em vídeo, leia apostilas digitais..."
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Benefit 3 */}
                    <div className="space-y-2 pl-3 border-l-2 border-emerald-500/20">
                      <label className="block text-[10px] font-mono text-slate-400">Benefício 3: Título e Descrição</label>
                      <input
                        type="text"
                        value={courseBenefit3Title}
                        onChange={(e) => setCourseBenefit3Title(e.target.value)}
                        placeholder="Ex: Quizzes de Fixação com XP"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                      <textarea
                        value={courseBenefit3Desc}
                        onChange={(e) => setCourseBenefit3Desc(e.target.value)}
                        placeholder="Ex: Gabarite os testes práticos de cada módulo pedagógico..."
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                <input
                  id="modal-course-published-chk"
                  type="checkbox"
                  checked={courseIsPublished}
                  onChange={(e) => setCourseIsPublished(e.target.checked)}
                  className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-800 rounded focus:ring-blue-505 shrink-0"
                />
                <div>
                  <label htmlFor="modal-course-published-chk" className="block text-xs font-bold text-slate-200 cursor-pointer">Publicar Curso Imediatamente</label>
                  <span className="text-[10px] text-slate-500 font-mono">Cursos não publicados ficam salvos como rascunhos para os professores.</span>
                </div>
              </div>

              {/* Confirm / Cancel Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850 mt-5">
                <button
                  id="modal-course-cancel-btn"
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  id="modal-course-draft-btn"
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 hover:border-slate-600 transition"
                >
                  Salvar Rascunho
                </button>
                <button
                  id="modal-course-save-btn"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 transition"
                >
                  {editingCourse ? 'Salvar Mudanças' : 'Criar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* CROPPER MODAL */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col h-[80vh]">
            <div className="p-4 border-b border-slate-850 flex items-center justify-between z-10 bg-slate-900">
              <h3 className="font-display text-lg font-bold text-slate-100">Cortar Imagem</h3>
              <button onClick={() => setCropImageSrc(null)} className="text-slate-400 hover:text-slate-200">
                <Trash2 size={20} />
              </button>
            </div>
            <div className="relative flex-grow bg-black">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-4 border-t border-slate-850 z-10 bg-slate-900 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-slate-400">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setCropImageSrc(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 transition"
                  disabled={isUploading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCrop}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Salvar Corte'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL: ADD / EDIT REWARD */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative my-8">
            <h3 className="font-display text-lg font-bold text-slate-100 mb-1">
              {editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Os alunos usarão seus XP para resgatar.
            </p>

            <form onSubmit={handleSaveReward} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Título *</label>
                <input
                  type="text"
                  required
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  placeholder="Ex: Livro Físico, Cupom 50%..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Descrição</label>
                <textarea
                  value={rewardDesc}
                  onChange={(e) => setRewardDesc(e.target.value)}
                  placeholder="Detalhes adicionais do brinde..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">URL da Imagem</label>
                <input
                  type="text"
                  value={rewardImageUrl}
                  onChange={(e) => setRewardImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Coupon Option */}
              <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rewardIsCoupon"
                    checked={rewardIsCoupon}
                    onChange={(e) => setRewardIsCoupon(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-900 focus:ring-0 focus:ring-offset-0 cursor-pointer text-emerald-500"
                  />
                  <label htmlFor="rewardIsCoupon" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                    É um Cupom de Desconto?
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Se ativado, ao resgatar este item, o aluno receberá automaticamente um código de cupom de desconto gerado com a porcentagem configurada abaixo.
                </p>

                {rewardIsCoupon && (
                  <div className="pt-2">
                    <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Porcentagem de Desconto (%) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        required={rewardIsCoupon}
                        min={1}
                        max={100}
                        value={rewardDiscountPercentage}
                        onChange={(e) => setRewardDiscountPercentage(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-4 pr-8 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Custo (XP) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={rewardXpCost}
                    onChange={(e) => setRewardXpCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 mb-1.5">Estoque</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={rewardStock}
                    onChange={(e) => setRewardStock(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850 mt-5">
                <button
                  type="button"
                  onClick={() => setShowRewardModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 transition"
                >
                  {editingReward ? 'Salvar Mudanças' : 'Criar Recompensa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* TAB 5: FINANCE REPORT */}
      {adminTab === 'finance' && (
        <FinanceReport courses={computedAdminCourses} />
      )}

      {/* TAB 6: CERTIFICATE CUSTOMIZATION SETTINGS */}
      {adminTab === 'certificates' && (
        <CertificateSettingsPanel />
      )}

      {/* TAB 7: WHATSAPP PRE-REGISTRATION SYSTEM */}
      {adminTab === 'pre-register' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-left">
            <UserPlus size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-display font-semibold text-slate-105 text-slate-100 text-sm">Painel de Pré-Registro Administrativo</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Esta área permite pré-aprovar alunos que compraram cursos diretamente pelo <strong>WhatsApp</strong> e ainda não têm conta no aplicativo. 
                Ao incluir o e-mail do aluno e vincular seus cursos devidos, o sistema aguardará seu primeiro acesso. 
                Quando ele digitar seu e-mail na tela de login, o app detectará o pré-registro e solicitará a criação de sua senha de acesso, liberando os cursos imediatamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Left Column Stack (Form + Email Template) */}
            <div className="lg:col-span-1 space-y-6">
              {/* Form Section */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="font-display font-medium text-slate-100 text-sm border-b border-slate-800 pb-2">Novo Pré-Registro</h3>
                
                <form onSubmit={handleSavePreRegistration} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">E-mail do Aluno *</label>
                    <input
                      type="email"
                      required
                      value={preEmail}
                      onChange={(e) => setPreEmail(e.target.value)}
                      placeholder="aluno@exemplo.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">Vincular Cursos Autorizados *</label>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto bg-slate-950 border border-slate-850 rounded-xl p-3 scrollbar-thin">
                      {adminCourses.map((c) => {
                        const isChecked = preCourseIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-start gap-2.5 hover:bg-slate-900/60 p-1.5 rounded-lg cursor-pointer transition text-xs text-slate-200">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setPreCourseIds(preCourseIds.filter(id => id !== c.id));
                                } else {
                                  setPreCourseIds([...preCourseIds, c.id]);
                                }
                              }}
                              className="mt-0.5 w-4 h-4 text-blue-500 bg-slate-900 border-slate-800 rounded focus:ring-blue-500 shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-slate-200">{c.title}</p>
                              <span className="text-[10px] text-slate-500 font-mono">ID: {c.id}</span>
                            </div>
                          </label>
                        );
                      })}
                      {adminCourses.length === 0 && (
                        <p className="text-center text-[11px] text-slate-500 font-mono py-2">Nenhum curso cadastrado ainda.</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingPre}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSavingPre ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Pré-Registrar E-mail</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Card 2: Customização e Disparo de E-mail */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <h3 className="font-display font-medium text-slate-100 text-sm">Mensagem Personalizada</h3>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    {pendingPreRegistrations.length} pendentes {preCourseFilter ? '(filtrado)' : ''}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-normal">
                  Personalize o e-mail que é enviado para os usuários que estão com status pendente para notificá-los da liberação do curso.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">Texto do E-mail</label>
                      <button
                        type="button"
                        onClick={handleSaveTemplate}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition uppercase tracking-wider font-mono cursor-pointer"
                        title="Salvar este modelo de mensagem permanentemente"
                      >
                        <Save size={11} className="shrink-0 text-blue-400" />
                        <span>Salvar Modelo</span>
                      </button>
                    </div>
                    <textarea
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                      rows={12}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-sans leading-relaxed resize-y scrollbar-thin"
                      placeholder="Template da mensagem de cobrança/lembrete..."
                    />
                  </div>

                  {/* Placeholders Guide */}
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 space-y-1.5">
                    <span className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 font-bold">Tags Inteligentes</span>
                    <div className="grid grid-cols-1 gap-1 text-[10px] font-mono text-slate-400">
                      <div><span className="text-blue-400">{"{{email}}"}</span> : E-mail do aluno</div>
                      <div><span className="text-blue-400">{"{{cursos}}"}</span> : Cursos pré-liberados</div>
                      <div><span className="text-blue-400">{"{{link}}"}</span> : Link de acesso à plataforma</div>
                    </div>
                  </div>

                  {/* Sending Action Button */}
                  <button
                    type="button"
                    onClick={handleSendEmailsToPending}
                    disabled={isSendingEmails || pendingPreRegistrations.length === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {isSendingEmails ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4" />
                        <span>Disparando...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={14} />
                        <span>
                          {preCourseFilter 
                            ? `Disparar para ${pendingPreRegistrations.length} Pendentes Filtrados` 
                            : "Disparar para todos Pendentes"
                          }
                        </span>
                      </>
                    )}
                  </button>

                  {/* Last Action Feedback Status */}
                  {lastDispatchLog && (
                    <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 rounded-xl p-2.5 border border-emerald-500/10 text-center animate-fade-in">
                      Disparo em lote concluído com sucesso ({lastDispatchLog.length} e-mails)!
                    </div>
                  )}

                  {/* Test Dispatch Area */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      Disparar e-mail de Teste
                    </label>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Envie uma versão de demonstração com este texto para o e-mail de sua preferência para aprovação.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="seu-email-teste@gmail.com"
                        className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        disabled={isSendingTest}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-800 text-slate-950 font-bold text-[11px] px-3 py-2 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-1 shrink-0 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        {isSendingTest ? (
                          <>
                            <Loader2 className="animate-spin w-3 h-3" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send size={11} />
                            <span>Enviar Teste</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* List Table Section */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col h-fit">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-display font-medium text-slate-100 text-sm">Matrículas Pré-Aprovadas</h3>
                  <p className="text-[10px] text-slate-500">Histórico de e-mails aguardando ou que já realizaram cadastro.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      value={preSearchTerm}
                      onChange={(e) => {
                        setPreSearchTerm(e.target.value);
                        setPrePage(1);
                      }}
                      placeholder="Filtrar por e-mail..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  
                  {/* Course allowed filter */}
                  <select
                    id="pre-course-filter-select"
                    value={preCourseFilter}
                    onChange={(e) => {
                      setPreCourseFilter(e.target.value);
                      setPrePage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition cursor-pointer font-sans"
                  >
                    <option value="">Filtrar por Curso...</option>
                    {adminCourses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleExportPreRegistrationsCSV}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer"
                    title="Exportar Pré-Matrículas em formato CSV"
                  >
                    <Download size={13} />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">E-mail do Aluno / Rastreio</th>
                      <th className="py-2.5 px-3">Cursos Permitidos</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {paginatedPreRegistrations.map((p) => {
                        const formattedDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }) : '-';
                        
                        return (
                          <tr key={p.id} className="text-xs hover:bg-slate-950/40 transition">
                            <td className="py-3 px-3 max-w-[220px] truncate" title={p.email}>
                              <div className="font-semibold text-slate-100 truncate">{p.email}</div>
                              {p.emailSentCount ? (
                                <p className="text-[9px] text-blue-400 flex items-center gap-1 mt-1 font-mono">
                                  <Mail size={10} className="shrink-0" />
                                  <span>Envios: <strong>{p.emailSentCount}</strong></span>
                                  {p.lastEmailSentAt && (
                                    <span className="text-[8px] text-slate-500 shrink-0">
                                      ({new Date(p.lastEmailSentAt).toLocaleDateString('pt-BR')} às {new Date(p.lastEmailSentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                  )}
                                </p>
                              ) : (
                                !p.used && (
                                  <span className="text-[8px] text-slate-500 italic mt-1 block">Nenhum lembrete enviado ainda</span>
                                )
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1 max-w-[200px]">
                                {p.courseIds?.map((cid) => {
                                  const courseObj = adminCourses.find(ac => ac.id === cid);
                                  return (
                                    <span key={cid} className="bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-850 truncate" title={courseObj?.title || cid}>
                                      • {courseObj ? courseObj.title : cid}
                                    </span>
                                  );
                                })}
                                {(!p.courseIds || p.courseIds.length === 0) && (
                                  <span className="text-slate-500 italic">Sem cursos</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                              {formattedDate}
                            </td>
                            <td className="py-3 px-3">
                              {p.used ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                    Ativo
                                  </span>
                                  {p.usedAt && (
                                    <p className="text-[8px] text-slate-500 font-mono">
                                      Ativado: {new Date(p.usedAt).toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end">
                                <div className="relative inline-block text-left">
                                  <button
                                    id={`btn-actions-${p.id}`}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePreRegDropdownId(activePreRegDropdownId === p.id ? null : p.id);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 font-semibold text-[10px] transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Ações</span>
                                    <ChevronDown size={10} className={`transition-transform duration-200 ${activePreRegDropdownId === p.id ? 'rotate-180' : ''}`} />
                                  </button>

                                  {activePreRegDropdownId === p.id && (
                                    <>
                                      {/* Backdrop overlay to catch click and close dropdown */}
                                      <div 
                                        className="fixed inset-0 z-40 cursor-default" 
                                        onClick={() => setActivePreRegDropdownId(null)} 
                                      />
                                      
                                      <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-slate-950 border border-slate-800 shadow-xl z-50 py-1 animate-fade-in text-left">
                                        {!p.used && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleSendSingleEmail(p);
                                              setActivePreRegDropdownId(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:bg-slate-900/60 transition flex items-center gap-1.5"
                                          >
                                            <Mail size={12} className="shrink-0 text-blue-400" />
                                            <span>Cobrar Aluno</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleDeletePreRegistration(p.id);
                                            setActivePreRegDropdownId(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-slate-900/60 transition flex items-center gap-1.5"
                                        >
                                          <Trash2 size={12} className="shrink-0 text-red-400" />
                                          <span>Revogar</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {filteredPreRegistrations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-500 font-mono">
                          Nenhum e-mail pré-registrado encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPrePages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-850 bg-slate-900/10 gap-3 mt-auto">
                  <span className="text-slate-400 text-xs text-center sm:text-left">
                    Mostrando <strong>{(prePage - 1) * ITEMS_PER_PAGE_PRE + 1}</strong> a{' '}
                    <strong>{Math.min(prePage * ITEMS_PER_PAGE_PRE, filteredPreRegistrations.length)}</strong> de{' '}
                    <strong>{filteredPreRegistrations.length}</strong> pré-registros
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={prePage === 1}
                      onClick={() => setPrePage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Anterior
                    </button>
                    <span className="text-slate-300 font-mono text-xs font-semibold min-w-[50px] text-center">
                      {prePage} / {totalPrePages}
                    </span>
                    <button
                      type="button"
                      disabled={prePage === totalPrePages}
                      onClick={() => setPrePage(prev => Math.min(prev + 1, totalPrePages))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação geral estilizado com Tailwind */}
      {confirmConfig && (
        <div id="admin-generic-confirmation-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-red-450">
                <AlertCircle size={20} className="text-red-500" />
                <h3 className="font-display font-bold text-slate-100 text-base">{confirmConfig.title}</h3>
              </div>
              <button 
                onClick={() => setConfirmConfig(null)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} className="text-red-550" />
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                {confirmConfig.description}
              </p>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/50">
              <button
                type="button"
                onClick={() => setConfirmConfig(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-350 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmConfig.onConfirm}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-500 hover:bg-red-450 text-slate-950 transition cursor-pointer"
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alteração de Cadastro do Aluno */}
      {showUserModal && editingUser && (
        <div id="admin-user-edit-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-blue-450">
                <Edit size={20} className="text-blue-500" />
                <h3 className="font-display font-bold text-slate-100 text-base">Alterar Cadastro do Aluno</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUser} className="flex flex-col flex-1">
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                
                {/* Profile Avatar Selection & Preview */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                  <div className="relative group shrink-0">
                    <img 
                      src={editUserAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                      alt="Avatar Preview" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 bg-slate-900"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <div className="flex-1 w-full space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Avatar (URL da Imagem)</label>
                    <input
                      type="text"
                      value={editUserAvatar}
                      onChange={(e) => setEditUserAvatar(e.target.value)}
                      placeholder="https://exemplo.com/avatar.jpg"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    
                    {/* Presets Grid */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[9px] text-slate-500 font-mono self-center">Presets:</span>
                      {[
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80'
                      ].map((preset, index) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditUserAvatar(preset)}
                          className={`w-7 h-7 rounded-full overflow-hidden border transition-all ${
                            editUserAvatar === preset ? 'border-emerald-500 scale-105' : 'border-slate-800 hover:border-slate-500'
                          }`}
                        >
                          <img src={preset} alt={`Preset ${index}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    placeholder="Nome do aluno"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/60 transition px-3.5 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">E-mail de Contato</label>
                  <input
                    type="email"
                    required
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    placeholder="aluno@exemplo.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/60 transition px-3.5 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none font-mono"
                  />
                </div>

                {/* XP and Level Group */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">XP Acumulado</label>
                      <button 
                        type="button"
                        onClick={() => {
                          const autoLevel = Math.floor(Number(editUserXp) / 1000) + 1;
                          setEditUserLevel(autoLevel > 0 ? autoLevel : 1);
                        }}
                        className="text-[8px] font-mono uppercase text-blue-450 hover:text-blue-350"
                        title="Recalcular Nível automaticamente baseado no XP atual (1 Nível a cada 1000 XP)"
                      >
                        Auto Nível
                      </button>
                    </div>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editUserXp}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditUserXp(val);
                        const autoLevel = Math.floor(val / 1000) + 1;
                        setEditUserLevel(autoLevel > 0 ? autoLevel : 1);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/60 transition px-3.5 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Nível do Aluno</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editUserLevel}
                      onChange={(e) => setEditUserLevel(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/60 transition px-3.5 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-355 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-450 text-slate-950 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  {isSavingUser ? (
                    <>
                      <Loader2 className="animate-spin w-3.5 h-3.5" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Avaliações */}
      {showReviewsModal && selectedReviewsCourse && (
        <div id="reviews-mgmt-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setShowReviewsModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Fechar"
            >
              <X size={18} />
            </button>

            <h3 className="font-display text-lg font-bold text-slate-100 mb-1">
              Avaliações do Curso
            </h3>
            <p className="text-xs text-blue-450 font-semibold mb-4">
              {selectedReviewsCourse.title}
            </p>

            <div className="space-y-4">
              {(selectedReviewsCourse.reviews || []).length === 0 ? (
                <div className="text-center py-10 bg-slate-950/40 border border-slate-850 rounded-xl">
                  <Star className="mx-auto text-slate-600 mb-2 fill-slate-900" size={24} />
                  <p className="text-xs text-slate-500">Nenhum aluno avaliou este curso ainda.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar font-sans">
                  {(selectedReviewsCourse.reviews || []).map((review, rIdx) => {
                    const isApproved = review.approved === true;
                    return (
                      <div 
                        key={review.userId || rIdx} 
                        className={`p-4 rounded-xl border transition-all ${
                          isApproved 
                            ? 'bg-slate-950/20 border-slate-850/50' 
                            : 'bg-amber-500/5 border-amber-500/20 shadow-inner'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5">
                            <img 
                              src={review.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                              alt={review.userName || 'Estudante'} 
                              className="w-8 h-8 rounded-full border border-slate-800 object-cover shrink-0"
                              referrerPolicy="no-referrer"
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

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5 bg-slate-950/60 px-2 py-1 rounded border border-slate-850/50">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  size={10} 
                                  className={`${
                                    star <= (review.rating || 5) 
                                      ? "text-amber-400 fill-amber-400" 
                                      : "text-slate-700"
                                  }`} 
                                />
                              ))}
                              <span className="text-[10px] font-mono font-bold text-slate-300 ml-1">
                                {review.rating}
                              </span>
                            </div>

                            {isApproved ? (
                              <span className="text-[9px] uppercase font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                                Aprovado / Ativo
                              </span>
                            ) : (
                              <span className="text-[9px] uppercase font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                                Pendente
                              </span>
                            )}
                          </div>
                        </div>

                        {review.comment && (
                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-900/60 font-sans italic mb-3">
                            "{review.comment}"
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900/60">
                          {isApproved ? (
                            <button
                              type="button"
                              onClick={() => handleDisapproveReview(review.userId)}
                              className="px-2.5 py-1 text-[10px] font-mono font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/25 rounded-lg transition cursor-pointer"
                            >
                              Ocultar do Card
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApproveReview(review.userId)}
                              className="px-2.5 py-1 text-[10px] font-mono font-semibold text-emerald-400 hover:text-emerald-350 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/35 rounded-lg transition cursor-pointer"
                            >
                              ✓ Aprovar & Publicar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.userId)}
                            className="px-2.5 py-1 text-[10px] font-mono font-semibold text-red-400 hover:text-red-350 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/25 rounded-lg transition cursor-pointer"
                          >
                            Excluir Avaliação
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReviewsModal(false)}
                className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Voltar ao Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de envio de e-mail após pré-registro */}
      {showSendEmailPrompt && newlyPreRegisteredUser && (
        <div id="admin-send-email-prompt-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in animate-duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-emerald-450">
                <Mail size={20} className="text-emerald-500" />
                <h3 className="font-display font-bold text-slate-100 text-base">Enviar E-mail de Acesso?</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowSendEmailPrompt(false);
                  setNewlyPreRegisteredUser(null);
                }}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <Send size={22} className="text-emerald-400" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  O pré-registro de <strong className="text-slate-150 font-mono">{newlyPreRegisteredUser.email}</strong> foi concluído com sucesso!
                </p>
                <p className="text-[11px] text-slate-400">
                  Deseja enviar o e-mail de convite com as instruções de acesso agora?
                </p>
              </div>

              {/* Courses list preview */}
              <div className="bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl space-y-1.5">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Cursos Concedidos:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(newlyPreRegisteredUser.courseIds || []).map(cid => {
                    const courseObj = adminCourses.find(ac => ac.id === cid);
                    const title = courseObj ? courseObj.title : cid;
                    return (
                      <span key={cid} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                        {title}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/50">
              <button
                type="button"
                disabled={isSendingPromptEmail}
                onClick={() => {
                  setShowSendEmailPrompt(false);
                  setNewlyPreRegisteredUser(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-350 transition cursor-pointer disabled:opacity-50"
              >
                Não, enviar depois
              </button>
              <button
                type="button"
                disabled={isSendingPromptEmail}
                onClick={handleSendPromptEmail}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-450 text-slate-950 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {isSendingPromptEmail ? (
                  <>
                    <Loader2 className="animate-spin w-3.5 h-3.5" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Sim, enviar agora</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

interface FinanceReportProps {
  courses: Course[];
}

function FinanceReport({ courses }: FinanceReportProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [preRegistrations, setPreRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const [paymentsSnapshot, preSnapshot] = await Promise.all([
          getDocs(collection(db, 'payments')),
          getDocs(collection(db, 'preRegistrations'))
        ]);
        
        const paymentsData = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const preData = preSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setPayments(paymentsData);
        setPreRegistrations(preData);
      } catch (error) {
        console.error("Error fetching finance data:", error);
        try {
          handleFirestoreError(error, OperationType.LIST, 'payments_and_preRegistrations');
        } catch (e) {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFinanceData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-950/45 border border-slate-850 rounded-2xl">
        <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-mono">Carregando relatório financeiro...</p>
      </div>
    );
  }

  // Aggregate payments by courseTitle
  const aggregated: Record<string, number> = {};

  // 1. Process standard payments
  payments.forEach(p => {
    let title = p.courseTitle;
    if (!title && p.courseId) {
      const matchedCourse = courses.find(c => c.id === p.courseId);
      if (matchedCourse) {
        title = matchedCourse.title;
      }
    }
    if (!title) {
      title = 'Desconhecido';
    }
    const amount = Number(p.amount) || 0;
    aggregated[title] = (aggregated[title] || 0) + amount;
  });

  // 2. Process pre-registrations (as they have paid outside the platform for their linked courses)
  preRegistrations.forEach(pre => {
    const cIds = pre.courseIds || [];
    cIds.forEach((cid: string) => {
      const matchedCourse = courses.find(c => c.id === cid);
      if (matchedCourse) {
        const title = matchedCourse.title;
        const price = Number(matchedCourse.price) || 0;
        aggregated[title] = (aggregated[title] || 0) + price;
      }
    });
  });

  const chartData = Object.keys(aggregated).map(key => ({
    name: key,
    total: aggregated[key]
  }));

  const totalArrecadado = chartData.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-100">Relatório Financeiro</h3>
          <p className="text-xs text-slate-400 mt-1">Visão geral da arrecadação com assinaturas / compras.</p>
        </div>
        <div className="p-3.5 bg-slate-950/70 border border-emerald-500/20 rounded-2xl text-center min-w-[150px]">
          <span className="block text-[9px] font-mono uppercase text-emerald-500/80 tracking-wider">Total Arrecadado</span>
          <span className="font-display text-xl font-bold text-emerald-400">
            {totalArrecadado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-2xl h-[400px]">
        {chartData.length === 0 ? (
          <div className="inset-0 flex flex-col items-center justify-center h-full text-center">
            <p className="text-xs text-slate-500 font-mono">Nenhum pagamento registrado no momento.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={11} 
                tickMargin={10} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickFormatter={(value) => `R$ ${value}`} 
              />
              <Tooltip 
                cursor={{ fill: 'rgba(51, 65, 85, 0.4)' }}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Arrecadação']}
              />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
