/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CourseReview {
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  type?: 'course' | 'capsule';
  title: string;
  description: string;
  category: string;
  instructorName: string;
  thumbnail: string;
  price: number;
  xpReward: number;
  totalDuration: string;
  modulesCount: number;
  enrolledCount: number;
  rating: number;
  reviews?: CourseReview[];
  isPublished: boolean;
  format: 'online' | 'recorded' | 'presencial';
  liveMeetLink?: string;
  liveClassDate?: string;
  createdAt?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
  isLive?: boolean;
  liveDate?: string;
  liveRoomId?: string;
  liveTeacherId?: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  order: number;
  duration: string;
  type: 'video' | 'article' | 'quiz' | 'file';
  videoUrl?: string; // Standard video player simulation URL
  articleContent?: string;
  quiz?: Quiz;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  xpPoints: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface StudentProgress {
  userId: string;
  courseId: string;
  progressPercentage: number;
  completedLessons: string[]; // Lesson IDs
  xp: number;
  score: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  criteria: string;
}

export interface LeaderboardUser {
  userId: string;
  name: string;
  email?: string;
  avatar: string;
  xp: number;
  level: number;
  badges: string[]; // Badge IDs
  role: 'student' | 'instructor';
}

export interface ForumThread {
  id: string;
  courseId: string | 'general';
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'instructor';
  createdAt: string;
  category: string;
  likes: number;
  replies: ForumReply[];
}

export interface ForumReply {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'instructor';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'instructor';
  message: string;
  createdAt: string;
}

export interface CourseRegistration {
  id: string;
  userId: string;
  courseId: string;
  paymentStatus: 'completed' | 'pending';
  paymentMethod: string;
  amount: number;
  enrolledAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'progress' | 'course' | 'forum' | 'badge' | 'announcement';
  read: boolean;
  createdAt: string;
}

export interface Turma {
  id: string;
  name: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  instructorName: string;
  startDate: string;
  studentIds?: string[];
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  xpCost: number;
  stock: number;
}

export interface Redemption {
  id: string;
  userId: string;
  rewardId: string;
  redeemedAt: string;
  status: 'pending' | 'delivered';
}

