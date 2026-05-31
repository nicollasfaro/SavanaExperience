/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Course, CourseModule, Badge, ForumThread, LeaderboardUser, ChatMessage, CertificateSettings } from './types';

export const INITIAL_CERTIFICATE_SETTINGS: CertificateSettings = {
  id: 'default',
  institutionName: 'SAVANA XP • ACADEMY OF WILDLIFE MEDICINE',
  certificateTitle: 'Certificado de Conclusão',
  directorName: 'Dr. Alexandre Savana',
  chiefInstructorName: 'Coordenador Docente',
  textDescription: 'por ter concluído integral e satisfatoriamente todas as aulas, leituras técnicas, quizzes e avaliações práticas estipuladas na grade curricular do curso de especialização de:',
  detailedMetadata: 'Comprovando aproveitamento proficiente com carga pedagógica total estimada em {duration} de atividades clínicas teóricas e práticas, totalizando o bônus de +{xpReward} XP na plataforma de formação de residentes.'
};

export const INITIAL_COURSES: Course[] = [];

export const INITIAL_MODULES: CourseModule[] = [];

export const ALL_BADGES: Badge[] = [
  {
    id: 'badge-welcome',
    name: 'Primeiro Resgate',
    description: 'Iniciou sua jornada profissional em medicina veterinária de selvagens.',
    iconName: 'BookOpen',
    color: 'from-blue-500 to-indigo-600',
    criteria: 'Entrar na plataforma pela primeira vez.'
  },
  {
    id: 'badge-first-lesson',
    name: 'Clínico Ativo',
    description: 'Completou sua primeira avaliação de caso ou vídeo prático clínico.',
    iconName: 'Award',
    color: 'from-emerald-400 to-teal-600',
    criteria: 'Completar 1 lição de qualquer curso.'
  },
  {
    id: 'badge-quiz-master',
    name: 'Diagnóstico Preciso',
    description: 'Acertou 100% das questões de um caso no módulo clínico.',
    iconName: 'Zap',
    color: 'from-amber-400 to-orange-500',
    criteria: 'Gabaritar um quiz de fim de módulo.'
  },
  {
    id: 'badge-forum-contributor',
    name: 'Interconsultor',
    description: 'Participou de forma ativa publicando discussão clínica no fórum médico.',
    iconName: 'MessageSquareText',
    color: 'from-fuchsia-500 to-pink-600',
    criteria: 'Criar ou responder um tópico de discussão.'
  },
  {
    id: 'badge-course-completed',
    name: 'Residente Especialista',
    description: 'Concluiu integralmente todos os módulos e lições de selvagens com excelência.',
    iconName: 'GraduationCap',
    color: 'from-purple-600 to-violet-800',
    criteria: 'Finalizar 100% do progresso de um curso completo.'
  }
];

export const INITIAL_LEADERBOARD: LeaderboardUser[] = [];

export const INITIAL_DISCUSSION_THREADS: ForumThread[] = [];

export const INITIAL_CHAT_MESSAGES: { [key: string]: ChatMessage[] } = {};

export const INITIAL_TURMAS = [];

