/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, 
  deleteDoc, collection, onSnapshot, getDocFromServer,
  query, where
} from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Course, CourseModule, StudentProgress, ForumThread, ChatMessage, LeaderboardUser, Turma, Reward, Redemption, CertificateSettings, IssuedCertificate, PreRegistration, NotificationItem } from './types';
import { INITIAL_COURSES, INITIAL_MODULES, INITIAL_LEADERBOARD, INITIAL_DISCUSSION_THREADS, INITIAL_CHAT_MESSAGES, INITIAL_TURMAS, INITIAL_CERTIFICATE_SETTINGS } from './data';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj);
    if (proto === null || proto === Object.prototype) {
      const res: any = {};
      for (const key of Object.keys(obj)) {
        const val = (obj as any)[key];
        if (val !== undefined) {
          res[key] = cleanUndefined(val);
        }
      }
      return res as T;
    }
  }
  return obj;
}

class StorageEngine {
  private prefix = 'savanaxp_';
  private listeners: Record<string, Set<() => void>> = {};
  private isFirebaseAuthenticated = false;
  private activeUnsubscribes: (() => void)[] = [];
  private moduleUnsubscribes: (() => void)[] = [];

  private cleanupListeners() {
    this.activeUnsubscribes.forEach(unsub => {
      try {
        unsub();
      } catch (err) {
        console.warn('Listener cleanup failed:', err);
      }
    });
    this.activeUnsubscribes = [];
    this.cleanupModuleListeners();
  }

  private cleanupModuleListeners() {
    this.moduleUnsubscribes.forEach(unsub => {
      try {
        unsub();
      } catch (err) {
        console.warn('Module listener cleanup failed:', err);
      }
    });
    this.moduleUnsubscribes = [];
  }

  constructor() {
    this.init();
  }

  // In-memory cache instead of localStorage
  private memoryCache: Record<string, any> = {};

  // Transient memory-based cache helper
  private get(key: string, defaultValue: any) {
    if (this.memoryCache[key] === undefined) {
      this.memoryCache[key] = defaultValue;
    }
    return this.memoryCache[key];
  }

  private set(key: string, value: any) {
    this.memoryCache[key] = value;
  }

  // Listener pattern for real-time reactive sync
  onChange(key: string, callback: () => void) {
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
    }
    this.listeners[key].add(callback);
    return () => {
      this.listeners[key].delete(callback);
    };
  }

  private notify(key: string) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => cb());
    }
  }

  // Initialize and enable bidirectional synchronization
  private async init() {
    // Validate Connection
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      console.warn("Connection verification failed or initially silent/offline.");
    }

    onAuthStateChanged(auth, async (user) => {
      // Clear any prior listeners to prevent access token expiration / logout permission errors and memory leaks
      this.cleanupListeners();

      if (user) {
        const isAnon = user.isAnonymous;
        console.log(`Real-time connection authenticated as ${isAnon ? 'Anonymous' : 'Gmail'} user:`, user.email || 'None', 'UID:', user.uid);
        this.isFirebaseAuthenticated = true;
        
        // Ensure user is matching with an instructor profile if they are an instructor or system admin
        try {
          if (!isAnon) {
            const isAdminEmail = user.email === 'ciuldinciuldin@gmail.com';
            // Only attempt to seed instructor profiles if they are indeed the admin or an instructor
            if (isAdminEmail) {
              try {
                await setDoc(doc(db, 'instructors', user.uid), {
                  id: user.uid,
                  userId: user.uid,
                  name: user.displayName || user.email?.split('@')[0] || 'User'
                }, { merge: true });
              } catch (e) {
                console.warn('Instructor profile seeding skipped:', e);
              }
            }
          }
        } catch (setDocErr) {
          console.warn('Silent restriction: Instructors profile could not be seeded on remote Firestore directly:', setDocErr);
        }

        // Initialize user in the synced leaderboard structure
        try {
          const userDocRef = doc(db, 'leaderboard', user.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userDocRef);
          } catch (getErr) {
            userSnap = null;
          }

          if (!userSnap || !userSnap.exists()) {
            const defaultUser: LeaderboardUser = {
              userId: user.uid,
              name: user.displayName || user.email?.split('@')[0] || `Aluno #${user.uid.slice(0, 4)}`,
              email: user.email || undefined,
              avatar: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              xp: 0,
              level: 1,
              badges: ['badge-welcome'],
              role: user.email === 'ciuldinciuldin@gmail.com' ? 'instructor' : 'student' // Admin as instructor
            };
            
            // Clean undefined fields first, ensuring strict compatibility with Firestore client SDK
            const cleanedProfile = cleanUndefined(defaultUser);
            await setDoc(userDocRef, cleanedProfile);
            console.log('Successfully registered new Gmail user in Firestore leaderboard:', user.email);
            
            // Append locally
            const localBoard = this.getLeaderboard();
            if (!localBoard.some(u => u.userId === user.uid)) {
              localBoard.push(defaultUser);
              this.set('leaderboard', localBoard);
              this.notify('leaderboard');
            }
          } else {
            // Update email on existing profile if missing
            const existingData = userSnap.data() as LeaderboardUser;
            if (!existingData.email && user.email) {
              await updateDoc(userDocRef, cleanUndefined({ email: user.email }));
            }
          }
        } catch (err: any) {
          console.error('CRITICAL: Could not register/update user in remote leaderboard collection:', err);
          
          // Local fallback
          const localBoard = this.getLeaderboard();
          if (!localBoard.some(u => u.userId === user.uid)) {
            const defaultUser: LeaderboardUser = {
              userId: user.uid,
              name: user.displayName || user.email?.split('@')[0] || `Aluno #${user.uid.slice(0, 4)}`,
              email: user.email || undefined,
              avatar: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              xp: 0,
              level: 1,
              badges: ['badge-welcome'],
              role: user.email === 'ciuldinciuldin@gmail.com' ? 'instructor' : 'student'
            };
            localBoard.push(defaultUser);
            this.set('leaderboard', localBoard);
            this.notify('leaderboard');
          }
        }
        
        // Check for and process any pre-registrations matching this user's email (Gmail or classic email/password login)
        if (user.email) {
          try {
            await processPreRegistration(user.email, user.uid);
          } catch (enrollErr) {
            console.warn("Auto-enrollment matching pre-registration failed on login change:", enrollErr);
          }
        }

        // Start active listeners
        this.setupRealtimeListeners();
      } else {
        this.isFirebaseAuthenticated = false;
        console.log('No auth user present. Attempting to sign in anonymously to bind to dynamic Firestore...');
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.warn('Failed to sign in anonymously to Firestore:', anonErr);
        }
      }
    });
  }

  // Real-time synchronization listeners
  private setupRealtimeListeners() {
    this.cleanupListeners();

    // Courses Sync
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const coursesList: Course[] = [];
      snap.forEach((d) => {
        coursesList.push(d.data() as Course);
      });
      
      this.set('courses', coursesList);
      this.notify('courses');
      
      // Dynamically register module listeners for each active course
      this.cleanupModuleListeners();
      coursesList.forEach(course => {
          const unsubModules = onSnapshot(collection(db, 'courses', course.id, 'modules'), (modSnap) => {
            const currentModules = this.getModules();
            const courseModList: CourseModule[] = [];
            modSnap.forEach(mdoc => {
              courseModList.push(mdoc.data() as CourseModule);
            });
            
            // Merge mod entries into overall list
            const filtered = currentModules.filter(m => m.courseId !== course.id);
            const merged = [...filtered, ...courseModList].sort((a,b) => a.order - b.order);
            this.set('modules', merged);
            this.notify('modules');
          }, (err) => {
            if (this.isFirebaseAuthenticated) {
              handleFirestoreError(err, OperationType.LIST, `courses/${course.id}/modules`);
            } else {
              console.warn(`Module Sync skipped on ${course.id}:`, err.message);
            }
          });
          this.moduleUnsubscribes.push(unsubModules);
        });
    }, (err) => {
      if (this.isFirebaseAuthenticated) {
        handleFirestoreError(err, OperationType.LIST, 'courses');
      } else {
        console.warn("Course Sync rejected: ", err.message);
      }
    });
    this.activeUnsubscribes.push(unsubCourses);

    // Leaderboard Sync
    const unsubLeaderboard = onSnapshot(collection(db, 'leaderboard'), (snap) => {
      const boardList: LeaderboardUser[] = [];
      snap.forEach((d) => {
        boardList.push(d.data() as LeaderboardUser);
      });
      this.set('leaderboard', boardList);
      this.notify('leaderboard');
    }, (err) => {
      if (this.isFirebaseAuthenticated) {
        handleFirestoreError(err, OperationType.LIST, 'leaderboard');
      } else {
        console.error("Leaderboard Snapshot error:", err.message);
      }
    });
    this.activeUnsubscribes.push(unsubLeaderboard);

    // Forum Threads Sync
    const unsubThreads = onSnapshot(collection(db, 'forumThreads'), (snap) => {
      const threadList: ForumThread[] = [];
      snap.forEach((d) => {
        threadList.push(d.data() as ForumThread);
      });
      this.set('threads', threadList.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      this.notify('threads');
    }, (err) => {
      if (this.isFirebaseAuthenticated) {
        handleFirestoreError(err, OperationType.LIST, 'forumThreads');
      } else {
        console.warn("Forum Threads Sync error: ", err.message);
      }
    });
    this.activeUnsubscribes.push(unsubThreads);

    // Support Chat Messages Sync
    const unsubChat = onSnapshot(collection(db, 'chatMessages'), (snap) => {
      const msgList: ChatMessage[] = [];
      snap.forEach((d) => {
        msgList.push(d.data() as ChatMessage);
      });
      const sorted = msgList.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      const chats: { [key: string]: ChatMessage[] } = {};
      sorted.forEach((msg) => {
        const cId = msg.chatId || 'general-support';
        if (!chats[cId]) chats[cId] = [];
        chats[cId].push(msg);
      });
      this.set('chat_messages', chats);
      this.notify('chat_messages');
    }, (err) => {
      if (this.isFirebaseAuthenticated) {
        handleFirestoreError(err, OperationType.LIST, 'chatMessages');
      } else {
        console.warn("Chat Messages Sync error: ", err.message);
      }
    });
    this.activeUnsubscribes.push(unsubChat);

    // Turmas Sync
    const unsubTurmas = onSnapshot(collection(db, 'turmas'), (snap) => {
      const turmasList: Turma[] = [];
      snap.forEach((d) => {
        turmasList.push(d.data() as Turma);
      });
      this.set('turmas', turmasList);
      this.notify('turmas');
    }, (err) => {
      if (this.isFirebaseAuthenticated) {
        handleFirestoreError(err, OperationType.LIST, 'turmas');
      } else {
        console.warn("Turmas Sync error: ", err.message);
      }
    });
    this.activeUnsubscribes.push(unsubTurmas);

    const user = auth.currentUser;
    if (!user) return;

    // Payments (Registrations) Sync
    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('userId', '==', user.uid)),
      (snap) => {
        const enrolledCourseIds: string[] = [];
        snap.forEach((d) => {
          const payment = d.data();
          if (payment.paymentStatus === 'completed' && payment.courseId) {
            enrolledCourseIds.push(payment.courseId);
          }
        });
        if (enrolledCourseIds.length > 0) {
          this.set('registrations', enrolledCourseIds);
        } else {
          const existingReg = this.get('registrations', ['course-2']);
          if (!existingReg || existingReg.length === 0) {
            this.set('registrations', ['course-2']);
          }
        }
        this.notify('registrations');
      },
      (err) => {
        if (this.isFirebaseAuthenticated) {
          handleFirestoreError(err, OperationType.LIST, 'payments');
        } else {
          console.warn("Payments Sync error: ", err.message);
        }
      }
    );
    this.activeUnsubscribes.push(unsubPayments);

    // Progress Sync
    const unsubProgress = onSnapshot(
      query(collection(db, 'progress'), where('userId', '==', user.uid)),
      (snap) => {
        const progressList: StudentProgress[] = [];
        snap.forEach((d) => {
          progressList.push(d.data() as StudentProgress);
        });
        this.set(`progress_${user.uid}`, progressList);
        this.notify(`progress_${user.uid}`);
      },
      (err) => {
        if (this.isFirebaseAuthenticated) {
          handleFirestoreError(err, OperationType.LIST, 'progress');
        } else {
          console.warn("Progress Sync error: ", err.message);
        }
      }
    );
    this.activeUnsubscribes.push(unsubProgress);

    // Notifications Sync
    const unsubNotifications = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', user.uid)),
      (snap) => {
        const notifList: NotificationItem[] = [];
        snap.forEach((d) => {
          notifList.push(d.data() as NotificationItem);
        });
        const key = `notifications_${user.uid}`;
        this.set(key, notifList.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        this.notify(key);
      },
      (err) => {
        if (this.isFirebaseAuthenticated) {
          handleFirestoreError(err, OperationType.LIST, 'notifications');
        } else {
          console.warn("Notifications Sync error: ", err.message);
        }
      }
    );
    this.activeUnsubscribes.push(unsubNotifications);

    // Rewards Sync
    const unsubRewards = onSnapshot(
      collection(db, 'rewards'),
      (snap) => {
        const rewardsList: Reward[] = [];
        snap.forEach((d) => {
          rewardsList.push(d.data() as Reward);
        });
        if (rewardsList.length > 0) {
          this.set('rewards', rewardsList);
          this.notify('rewards');
        }
      },
      (err) => {
        if (this.isFirebaseAuthenticated) {
          handleFirestoreError(err, OperationType.LIST, 'rewards');
        } else {
          console.warn("Rewards Sync error: ", err.message);
        }
      }
    );
    this.activeUnsubscribes.push(unsubRewards);

    // Redemptions Sync
    const unsubRedemptions = onSnapshot(
      query(collection(db, 'redemptions'), where('userId', '==', user.uid)),
      (snap) => {
        const redemptionsList: Redemption[] = [];
        snap.forEach((d) => {
          redemptionsList.push(d.data() as Redemption);
        });
        this.set('redemptions', redemptionsList);
        this.notify('redemptions');
      },
      (err) => {
        if (this.isFirebaseAuthenticated) {
          handleFirestoreError(err, OperationType.LIST, 'redemptions');
        } else {
          console.warn("Redemptions Sync error: ", err.message);
        }
      }
    );
    this.activeUnsubscribes.push(unsubRedemptions);

    // Pre-Registrations Sync (Only visible to admin/instructors, handled gracefully)
    const unsubPreRegistrations = onSnapshot(
      collection(db, 'preRegistrations'),
      (snap) => {
        const list: PreRegistration[] = [];
        snap.forEach((d) => {
          list.push(d.data() as PreRegistration);
        });
        this.set('preRegistrations', list);
        this.notify('preRegistrations');
      },
      (err) => {
        if (err.code !== 'permission-denied') {
          console.warn("Pre-Registration Sync error: ", err.message);
        }
      }
    );
    this.activeUnsubscribes.push(unsubPreRegistrations);

    // Certificate Settings Sync
    const unsubCertSettings = onSnapshot(doc(db, 'settings', 'certificates'), (docSnap) => {
      if (docSnap.exists()) {
        this.set('certificateSettings', docSnap.data() as CertificateSettings);
      } else {
        this.set('certificateSettings', INITIAL_CERTIFICATE_SETTINGS);
      }
      this.notify('certificateSettings');
    }, (err) => {
      console.warn("Certificate Settings Sync error: ", err.message);
    });
    this.activeUnsubscribes.push(unsubCertSettings);

    // Issued Certificates Sync
    const unsubIssuedCerts = onSnapshot(
      query(collection(db, 'issuedCertificates'), where('userId', '==', user.uid)),
      (snap) => {
        const certList: IssuedCertificate[] = [];
        snap.forEach((d) => {
          certList.push(d.data() as IssuedCertificate);
        });
        this.set(`issued_certificates_${user.uid}`, certList);
        this.notify(`issued_certificates_${user.uid}`);
      },
      (err) => {
        if (this.isFirebaseAuthenticated) {
          handleFirestoreError(err, OperationType.LIST, 'issuedCertificates');
        } else {
          console.warn("Issued Certificates Sync error: ", err.message);
        }
      }
    );
    this.activeUnsubscribes.push(unsubIssuedCerts);
  }

  // --- PUBLIC API WRAPPERS (Sync local fallback + Async push onto Firestore) ---

  // Issued Certificates
  getIssuedCertificates(userId: string): IssuedCertificate[] {
    return this.get(`issued_certificates_${userId}`, []);
  }

  async saveIssuedCertificate(cert: IssuedCertificate) {
    const key = `issued_certificates_${cert.userId}`;
    const list = this.get(key, []);
    const idx = list.findIndex((c: IssuedCertificate) => c.id === cert.id);
    if (idx >= 0) {
      list[idx] = cert;
    } else {
      list.push(cert);
    }
    this.set(key, list);
    this.notify(key);

    // Also store globally for validation if needed
    const globalKey = `global_cert_${cert.id}`;
    this.set(globalKey, cert);

    if (!this.isFirebaseAuthenticated) return;

    try {
      await setDoc(doc(db, 'issuedCertificates', cert.id), cleanUndefined(cert));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `issuedCertificates/${cert.id}`);
    }
  }

  async validateCertificate(code: string): Promise<IssuedCertificate | null> {
    const cleanCode = code.trim().toUpperCase();
    
    // First check memory cache
    const cached = this.get(`global_cert_${cleanCode}`, null);
    if (cached) return cached;

    // Direct fetch from server for maximum integrity and real time checks
    try {
      const snap = await getDoc(doc(db, 'issuedCertificates', cleanCode));
      if (snap.exists()) {
        const cert = snap.data() as IssuedCertificate;
        this.set(`global_cert_${cleanCode}`, cert);
        return cert;
      }
    } catch (err) {
      console.warn("Validate Certificate server-side check failed:", err);
    }

    // Secondary fallback: search current user's lists
    const user = auth.currentUser;
    if (user) {
      const certs = this.getIssuedCertificates(user.uid);
      const matched = certs.find(c => c.id.toUpperCase() === cleanCode);
      if (matched) return matched;
    }

    return null;
  }

  // Certificate Settings
  getCertificateSettings(): CertificateSettings {
    return this.get('certificateSettings', INITIAL_CERTIFICATE_SETTINGS);
  }

  async saveCertificateSettings(settings: CertificateSettings) {
    this.set('certificateSettings', settings);
    this.notify('certificateSettings');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await setDoc(doc(db, 'settings', 'certificates'), cleanUndefined(settings));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/certificates');
    }
  }

  // Registrations (Course purchases tracking)
  getRegistrations(): string[] {
    return this.get('registrations', ['course-2']);
  }
  
  async saveRegistrations(courseIds: string[]) {
    this.set('registrations', courseIds);
    this.notify('registrations');

    if (!this.isFirebaseAuthenticated || !auth.currentUser) return;

    for (const courseId of courseIds) {
      const paymentId = `${auth.currentUser.uid}_${courseId}`;
      const course = this.getCourses().find(c => c.id === courseId);
      const amount = course ? course.price : 0;
      try {
        await setDoc(doc(db, 'payments', paymentId), cleanUndefined({
          id: paymentId,
          userId: auth.currentUser.uid,
          courseId: courseId,
          paymentStatus: 'completed',
          paymentMethod: 'Simulated Pix/Credit',
          amount: amount,
          enrolledAt: new Date().toISOString()
        }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `payments/${paymentId}`);
      }
    }
  }

  // Courses
  getCourses(): Course[] {
    return this.get('courses', INITIAL_COURSES);
  }

  async saveCourse(course: Course) {
    const list = this.getCourses();
    const idx = list.findIndex(c => c.id === course.id);
    if (idx >= 0) list[idx] = course;
    else list.push(course);
    this.set('courses', list);
    this.notify('courses');

    if (!this.isFirebaseAuthenticated) return;

    // Firestore Sync
    try {
      await setDoc(doc(db, 'courses', course.id), cleanUndefined(course));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `courses/${course.id}`);
    }
  }

  async deleteCourse(courseId: string) {
    const list = this.getCourses();
    const filtered = list.filter(c => c.id !== courseId);
    this.set('courses', filtered);
    this.notify('courses');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await deleteDoc(doc(db, 'courses', courseId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}`);
    }
  }

  // Modules
  getModules(): CourseModule[] {
    return this.get('modules', INITIAL_MODULES);
  }

  async saveModule(mod: CourseModule) {
    const list = this.getModules();
    const idx = list.findIndex(m => m.id === mod.id);
    if (idx >= 0) list[idx] = mod;
    else list.push(mod);
    this.set('modules', list);
    this.notify('modules');

    if (!this.isFirebaseAuthenticated) return;

    // Firestore Sync
    try {
      await setDoc(doc(db, 'courses', mod.courseId, 'modules', mod.id), cleanUndefined(mod));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `courses/${mod.courseId}/modules/${mod.id}`);
    }
  }

  async deleteModule(courseId: string, moduleId: string) {
    const list = this.getModules().filter(m => m.id !== moduleId);
    this.set('modules', list);
    this.notify('modules');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await deleteDoc(doc(db, 'courses', courseId, 'modules', moduleId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}/modules/${moduleId}`);
    }
  }

  // Progress
  getProgress(userId: string): StudentProgress[] {
    return this.get(`progress_${userId}`, []);
  }

  async saveProgress(userId: string, prog: StudentProgress) {
    const list = this.getProgress(userId);
    const idx = list.findIndex(p => p.courseId === prog.courseId);
    if (idx >= 0) list[idx] = prog;
    else list.push(prog);
    this.set(`progress_${userId}`, list);

    if (!this.isFirebaseAuthenticated) return;

    // Save progress mapping to Firestore
    try {
      await setDoc(doc(db, 'progress', `${userId}_${prog.courseId}`), cleanUndefined({
        ...prog,
        userId: userId // Enforce authentication owner constraint
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `progress/${userId}_${prog.courseId}`);
    }
  }

  async completeLessonForUser(userId: string, courseId: string, lessonId: string, xpReward: number = 200): Promise<void> {
    let prog: StudentProgress | null = null;
    const list = this.getProgress(userId);
    const cachedProg = list.find(p => p.courseId === courseId);
    
    if (cachedProg) {
      prog = { ...cachedProg, completedLessons: [...cachedProg.completedLessons] };
    } else if (this.isFirebaseAuthenticated) {
      try {
        const snap = await getDoc(doc(db, 'progress', `${userId}_${courseId}`));
        if (snap.exists()) {
          const data = snap.data() as StudentProgress;
          prog = {
            ...data,
            completedLessons: data.completedLessons || []
          };
        }
      } catch (err) {
        console.warn("Failed to fetch progress from firestore inside completeLessonForUser:", err);
      }
    }

    if (!prog) {
      prog = {
        userId: userId,
        courseId: courseId,
        progressPercentage: 0,
        completedLessons: [],
        xp: 0,
        score: 0
      };
    }

    if (!prog.completedLessons.includes(lessonId)) {
      prog.completedLessons.push(lessonId);
      prog.xp += xpReward;
      
      const updatedList = this.getProgress(userId).filter(p => p.courseId !== courseId);
      updatedList.push(prog);
      this.set(`progress_${userId}`, updatedList);
      this.notify(`progress_${userId}`);

      if (this.isFirebaseAuthenticated) {
        try {
          await setDoc(doc(db, 'progress', `${userId}_${courseId}`), cleanUndefined({
            ...prog,
            userId: userId
          }));
        } catch (err) {
          console.warn("Failed to save progress to firestore in completeLessonForUser:", err);
        }
      }

      await this.updateLeaderboardXP(userId, xpReward);
    }
  }

  // Leaderboard
  getLeaderboard(): LeaderboardUser[] {
    return this.get('leaderboard', INITIAL_LEADERBOARD);
  }

  async updateLeaderboardXP(userId: string, extraXp: number) {
    const board = this.getLeaderboard();
    const user = board.find(u => u.userId === userId);
    if (user) {
      user.xp += extraXp;
      user.level = Math.floor(user.xp / 1000) + 1;
      this.set('leaderboard', board);
      this.notify('leaderboard');

      if (!this.isFirebaseAuthenticated) return;

      try {
        await setDoc(doc(db, 'leaderboard', userId), cleanUndefined(user));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `leaderboard/${userId}`);
      }
    }
  }

  async unlockBadge(userId: string, badgeId: string) {
    const board = this.getLeaderboard();
    const user = board.find(u => u.userId === userId);
    if (user && !user.badges.includes(badgeId)) {
      user.badges.push(badgeId);
      this.set('leaderboard', board);
      this.notify('leaderboard');

      if (!this.isFirebaseAuthenticated) return;

      try {
        await setDoc(doc(db, 'leaderboard', userId), cleanUndefined(user));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `leaderboard/${userId}`);
      }
      return true;
    }
    return false;
  }

  async toggleFollowUser(currentUserId: string, targetUserId: string) {
    const board = this.getLeaderboard();
    const currentUser = board.find(u => u.userId === currentUserId);
    if (currentUser) {
      if (!currentUser.following) {
        currentUser.following = [];
      }
      const isFollowing = currentUser.following.includes(targetUserId);
      if (isFollowing) {
        currentUser.following = currentUser.following.filter(id => id !== targetUserId);
      } else {
        currentUser.following.push(targetUserId);
      }
      
      this.set('leaderboard', board);
      this.notify('leaderboard');

      // Create notification to the target user if starting to follow
      if (!isFollowing) {
        const followNotif: NotificationItem = {
          id: `follow-${currentUserId}-${targetUserId}-${Date.now()}`,
          userId: targetUserId,
          title: 'Novo Seguidor!',
          message: `${currentUser.name} começou a seguir o seu perfil no Savana Experience.`,
          type: 'progress',
          read: false,
          createdAt: new Date().toISOString()
        };
        await this.saveNotification(followNotif);
      }

      if (!this.isFirebaseAuthenticated) return;

      try {
        await setDoc(doc(db, 'leaderboard', currentUserId), cleanUndefined(currentUser));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `leaderboard/${currentUserId}`);
      }
    }
  }

  // --- NOTIFICATIONS API ---
  getNotifications(userId: string): NotificationItem[] {
    const key = `notifications_${userId}`;
    const baseWelcome: NotificationItem = {
      id: 'n-1',
      userId: userId,
      title: 'Boas-vindas ao Savana Experience!',
      message: 'Comece a estudar hoje, acumule pontos de experiência (XP) e conquiste sua primeira medalha.',
      type: 'progress',
      read: false,
      createdAt: new Date().toISOString()
    };
    return this.get(key, [baseWelcome]);
  }

  async saveNotification(notif: NotificationItem) {
    const key = `notifications_${notif.userId}`;
    const list = this.getNotifications(notif.userId);
    const idx = list.findIndex(n => n.id === notif.id);
    if (idx >= 0) {
      list[idx] = notif;
    } else {
      list.unshift(notif); // Newest first
    }
    
    this.set(key, list);
    this.notify(key);

    if (!this.isFirebaseAuthenticated) return;

    try {
      await setDoc(doc(db, 'notifications', notif.id), cleanUndefined(notif));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notifications/${notif.id}`);
    }
  }

  async markAllNotificationsRead(userId: string) {
    const key = `notifications_${userId}`;
    const list = this.getNotifications(userId);
    const unreadList = list.filter(n => !n.read);
    const updated = list.map(n => ({ ...n, read: true }));
    
    this.set(key, updated);
    this.notify(key);

    if (!this.isFirebaseAuthenticated) return;

    try {
      await Promise.all(unreadList.map(n => {
        const updatedNotif = { ...n, read: true };
        return setDoc(doc(db, 'notifications', n.id), cleanUndefined(updatedNotif));
      }));
    } catch (err) {
      console.warn("Failed to mark all notifications read in Firestore:", err.message);
    }
  }

  // Forum Threads
  getForumThreads(): ForumThread[] {
    return this.get('threads', INITIAL_DISCUSSION_THREADS);
  }

  async saveForumThread(thread: ForumThread) {
    const list = this.getForumThreads();
    const idx = list.findIndex(t => t.id === thread.id);
    if (idx >= 0) list[idx] = thread;
    else list.push(thread);
    this.set('threads', list);
    this.notify('threads');

    // Notify followers if this is a new social post
    if (thread.category === 'social' && idx < 0) {
      const board = this.getLeaderboard();
      const followers = board.filter(u => u.following?.includes(thread.authorId));
      for (const follower of followers) {
        const notif: NotificationItem = {
          id: `status-${thread.id}-${follower.userId}-${Date.now()}`,
          userId: follower.userId,
          title: 'Novo Status Publicado!',
          message: `${thread.authorName} publicou um novo status: "${thread.content.length > 50 ? thread.content.substring(0, 47) + '...' : thread.content}"`,
          type: 'forum',
          read: false,
          createdAt: new Date().toISOString()
        };
        await this.saveNotification(notif);
      }
    }

    if (!this.isFirebaseAuthenticated) return;

    try {
      await setDoc(doc(db, 'forumThreads', thread.id), cleanUndefined(thread));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `forumThreads/${thread.id}`);
    }
  }

  async deleteForumThread(threadId: string) {
    const list = this.getForumThreads();
    const updated = list.filter(t => t.id !== threadId);
    this.set('threads', updated);
    this.notify('threads');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await deleteDoc(doc(db, 'forumThreads', threadId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `forumThreads/${threadId}`);
    }
  }

  // Chat
  getChatMessages(chatId: string): ChatMessage[] {
    const chats = this.get('chat_messages', INITIAL_CHAT_MESSAGES);
    const msgs = chats[chatId] || [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return msgs.filter((m: ChatMessage) => {
      if (!m.createdAt) return false;
      return new Date(m.createdAt).getTime() >= cutoff;
    });
  }

  async saveChatMessage(chatId: string, msg: ChatMessage) {
    msg.chatId = chatId;
    const chats = this.get('chat_messages', INITIAL_CHAT_MESSAGES);
    if (!chats[chatId]) chats[chatId] = [];
    chats[chatId].push(msg);
    this.set('chat_messages', chats);
    this.notify('chat_messages');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await setDoc(doc(db, 'chatMessages', msg.id), cleanUndefined(msg));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chatMessages/${msg.id}`);
    }
  }

  async updateUserRole(userId: string, role: 'student' | 'instructor' | 'admin') {
    const board = this.getLeaderboard();
    const user = board.find(u => u.userId === userId);
    
    // Normalize role for UI: 'admin' implies instructor visually in some places, 
    // but we store 'instructor' in leaderboard and handle admin via the admins collection
    const leaderboardRole = role === 'admin' ? 'instructor' : role;

    if (user) {
      user.role = leaderboardRole;
      this.set('leaderboard', board);
      this.notify('leaderboard');

      if (!this.isFirebaseAuthenticated) return;

      try {
        await setDoc(doc(db, 'leaderboard', userId), cleanUndefined(user));
        
        // Ensure backend sync with instructors collection
        if (leaderboardRole === 'instructor') {
          await setDoc(doc(db, 'instructors', userId), { 
            assignedAt: new Date().toISOString(),
            active: true
          });
        } else {
          // Attempt to remove instructor privileges if downgraded
          try {
             await deleteDoc(doc(db, 'instructors', userId));
          } catch(e) { /* ignore if doesn't exist */ }
        }

        // Handle Admin role
        if (role === 'admin') {
          await setDoc(doc(db, 'admins', userId), {
             assignedAt: new Date().toISOString(),
             active: true
          });
        } else {
          try {
             await deleteDoc(doc(db, 'admins', userId));
          } catch(e) { /* ignore if doesn't exist */ }
        }

      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `roles_update/${userId}`);
      }
    }
  }

  async deleteUser(userId: string) {
    const board = this.getLeaderboard();
    const filtered = board.filter(u => u.userId !== userId);
    this.set('leaderboard', filtered);
    this.notify('leaderboard');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await deleteDoc(doc(db, 'leaderboard', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `leaderboard/${userId}`);
    }
  }

  // Turmas (Classes/Cohorts)
  getTurmas(): Turma[] {
    return this.get('turmas', INITIAL_TURMAS);
  }

  async saveTurma(turma: Turma) {
    const list = this.getTurmas();
    const idx = list.findIndex(t => t.id === turma.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...turma };
    else list.push(turma);
    this.set('turmas', list);
    this.notify('turmas');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await setDoc(doc(db, 'turmas', turma.id), cleanUndefined(turma));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `turmas/${turma.id}`);
    }
  }

  async deleteTurma(turmaId: string) {
    const list = this.getTurmas();
    const filtered = list.filter(t => t.id !== turmaId);
    this.set('turmas', filtered);
    this.notify('turmas');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await deleteDoc(doc(db, 'turmas', turmaId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `turmas/${turmaId}`);
    }
  }

  // Rewards
  getRewards(): Reward[] {
    return this.get('rewards', []);
  }

  async saveReward(reward: Reward) {
    const list = this.getRewards();
    const idx = list.findIndex(r => r.id === reward.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...reward };
    else list.push(reward);
    this.set('rewards', list);
    this.notify('rewards');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await setDoc(doc(db, 'rewards', reward.id), cleanUndefined(reward));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rewards/${reward.id}`);
    }
  }

  async deleteReward(rewardId: string) {
    const list = this.getRewards();
    const filtered = list.filter(r => r.id !== rewardId);
    this.set('rewards', filtered);
    this.notify('rewards');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await deleteDoc(doc(db, 'rewards', rewardId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rewards/${rewardId}`);
    }
  }

  // Redemptions
  getRedemptions(): Redemption[] {
    return this.get('redemptions', []);
  }

  async saveRedemption(red: Redemption) {
    const list = this.getRedemptions();
    const idx = list.findIndex(r => r.id === red.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...red };
    else list.push(red);
    this.set('redemptions', list);
    this.notify('redemptions');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await setDoc(doc(db, 'redemptions', red.id), cleanUndefined(red));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `redemptions/${red.id}`);
    }
  }

  // Pre-Registrations
  getPreRegistrations(): PreRegistration[] {
    return this.get('preRegistrations', []);
  }

  async savePreRegistration(pre: PreRegistration) {
    const list = this.getPreRegistrations();
    const docId = pre.email.trim().toLowerCase();
    const cleanPre = { ...pre, email: docId, id: docId };
    
    const idx = list.findIndex(p => p.id === docId);
    if (idx >= 0) list[idx] = cleanPre;
    else list.push(cleanPre);
    
    this.set('preRegistrations', list);
    this.notify('preRegistrations');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await setDoc(doc(db, 'preRegistrations', docId), cleanUndefined(cleanPre));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `preRegistrations/${docId}`);
    }
  }

  async deletePreRegistration(docId: string) {
    const list = this.getPreRegistrations();
    const filtered = list.filter(p => p.id !== docId);
    this.set('preRegistrations', filtered);
    this.notify('preRegistrations');

    if (!this.isFirebaseAuthenticated) return;

    try {
      await deleteDoc(doc(db, 'preRegistrations', docId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `preRegistrations/${docId}`);
    }
  }

  // Fetch pre-registration directly from server (used during registration / guest flow)
  async fetchPreRegistrationForEmail(email: string): Promise<PreRegistration | null> {
    const docId = email.trim().toLowerCase();
    try {
      const snap = await getDoc(doc(db, 'preRegistrations', docId));
      if (snap.exists()) {
        return snap.data() as PreRegistration;
      }
    } catch (err) {
      console.warn("Failed to fetch pre-registration:", err);
    }
    // Fall back to local check if offline/cached
    const localMatch = this.getPreRegistrations().find(p => p.id === docId || p.email.toLowerCase() === docId);
    return localMatch || null;
  }
}

let cachedAccessToken: string | null = null;

export const localDB = new StorageEngine();
export const hasRealFirebase = true;

export async function signInWithGmail() {
  const provider = new GoogleAuthProvider();
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    if (cachedAccessToken) {
      sessionStorage.setItem('savanaxp_google_oauth_token', cachedAccessToken);
    }
    return result.user;
  } catch (error: any) {
    console.error('Core Gmail authentication failed:', error);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      alert("O popup de login foi fechado ou bloqueado pelo seu navegador. Se o problema persistir, tente abrir o app em outra aba, ou verifique sua conexão.");
    }
    throw error;
  }
}

export function getCachedAccessToken(): string | null {
  if (!cachedAccessToken) {
    cachedAccessToken = sessionStorage.getItem('savanaxp_google_oauth_token');
  }
  return cachedAccessToken;
}

export function logoutGmail() {
  cachedAccessToken = null;
  sessionStorage.removeItem('savanaxp_google_oauth_token');
  return signOut(auth);
}

export async function uploadCourseThumbnail(courseId: string, file: File, onProgress?: (pct: number) => void): Promise<string> {
  // If not authenticated dynamically in Firestore (e.g. working offline/local fallback)
  if (!auth.currentUser) {
    console.log('User offline or locally signed-in, converting thumbnail to Base64...');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // Real upload to Firebase Storage
  return new Promise((resolve, reject) => {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `thumb_${Date.now()}.${fileExt}`;
      const fileRef = ref(storage, `courses/${courseId}/thumbnail/${fileName}`);
      
      const uploadTask = uploadBytesResumable(fileRef, file, {
        contentType: file.type
      });

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        }, 
        (error) => {
          console.error('Storage Upload Error:', error);
          reject(error);
        }, 
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    } catch (err) {
      console.error('Failed to configure upload task:', err);
      reject(err);
    }
  });
}

export async function processPreRegistration(email: string | null | undefined, userId: string): Promise<void> {
  if (!email) return;
  const docId = email.trim().toLowerCase();
  try {
    const preSnap = await getDoc(doc(db, 'preRegistrations', docId));
    if (preSnap.exists()) {
      const preReg = preSnap.data() as PreRegistration;
      if (!preReg.used) {
        // 1. Seed Course Registrations / Payments in Firestore
        if (preReg.courseIds && preReg.courseIds.length > 0) {
          for (const courseId of preReg.courseIds) {
            const paymentId = `${userId}_${courseId}`;
            try {
              await setDoc(doc(db, 'payments', paymentId), {
                id: paymentId,
                userId: userId,
                courseId: courseId,
                paymentStatus: 'completed',
                paymentMethod: 'WhatsApp Pre-Registration',
                amount: 0,
                enrolledAt: new Date().toISOString()
              });
            } catch (payErr) {
              console.warn(`Failed to seed payment for course ${courseId}:`, payErr);
            }
          }

          // 2. Set them into the local cache immediately to ensure instantaneous UI rendering without waiting for snap
          try {
            await localDB.saveRegistrations(preReg.courseIds);
          } catch (localRegErr) {
            console.warn("Failed to set local registrations:", localRegErr);
          }

          // 2.5 Auto-enroll user in associated Turmas (cohorts)
          try {
            const turmasList: Turma[] = [];
            try {
              const turmasSnap = await getDocs(collection(db, 'turmas'));
              turmasSnap.forEach(tDoc => {
                turmasList.push({ id: tDoc.id, ...tDoc.data() } as Turma);
              });
            } catch (dbErr) {
              console.warn("Could not fetch turmas from firestore directly, falling back to local cache", dbErr);
              turmasList.push(...localDB.getTurmas());
            }

            for (const turma of turmasList) {
              if (preReg.courseIds.includes(turma.courseId)) {
                const currentStudentIds = turma.studentIds || [];
                if (!currentStudentIds.includes(userId)) {
                  const updatedTurma: Turma = {
                    ...turma,
                    studentIds: [...currentStudentIds, userId]
                  };
                  await localDB.saveTurma(updatedTurma);
                  console.log(`Auto-enrolled user ${userId} into turma ${turma.id} for course ${turma.courseId}`);
                }
              }
            }
          } catch (turmaEnrollErr) {
            console.warn("Failed to auto-enroll user in course cohorts/turmas:", turmaEnrollErr);
          }

          console.log(`WhatsApp pre-registration auto-enrolled user ${userId} in:`, preReg.courseIds);
        }

        // 3. Mark pre-registration as used in Firestore
        try {
          await setDoc(doc(db, 'preRegistrations', docId), {
            ...preReg,
            used: true,
            usedBy: userId,
            usedAt: new Date().toISOString()
          });
        } catch (preUseErr) {
          console.warn("Failed to mark pre-registration as used in Firestore:", preUseErr);
        }
      }
    }
  } catch (err) {
    console.warn("Silent fallback: processing Whatsapp pre-registration failed:", err);
  }
}

export async function signUpUserWithEmailAndPassword(name: string, email: string, password: string, avatarUrlOrFile?: string | File): Promise<any> {
  const credentials = await createUserWithEmailAndPassword(auth, email, password);
  const user = credentials.user;
  const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
  let finalAvatar = fallbackAvatar;

  if (avatarUrlOrFile) {
    if (avatarUrlOrFile instanceof File) {
      try {
        const fileExt = avatarUrlOrFile.name.split('.').pop() || 'png';
        const fileName = `avatar_${Date.now()}.${fileExt}`;
        const fileRef = ref(storage, `users/${user.uid}/avatar/${fileName}`);
        
        const uploadTask = uploadBytesResumable(fileRef, avatarUrlOrFile, {
          contentType: avatarUrlOrFile.type
        });

        const downloadUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed', 
            null, 
            (error) => {
              console.error('Avatar Upload Error during registration:', error);
              reject(error);
            }, 
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
        finalAvatar = downloadUrl;
      } catch (uploadErr) {
        console.error('File upload failed, falling back to basic fallback avatar:', uploadErr);
      }
    } else if (typeof avatarUrlOrFile === 'string') {
      finalAvatar = avatarUrlOrFile;
    }
  }
  
  // To avoid 'Photo URL too long' error (which has a 2048 character limit in Firebase Auth profiles),
  // we use a standard / short fallback url for auth.photoURL if the avatar is base64, but preserve the user's custom avatar in the Firestore db!
  const authPhotoURL = (finalAvatar && finalAvatar.length < 1500) ? finalAvatar : fallbackAvatar;

  await updateProfile(user, {
    displayName: name,
    photoURL: authPhotoURL
  });

  // Pre-seed leaderboard profile directly in Firestore
  const userDocRef = doc(db, 'leaderboard', user.uid);
  const defaultUser: LeaderboardUser = {
    userId: user.uid,
    name: name,
    email: email,
    avatar: finalAvatar,
    xp: 0,
    level: 1,
    badges: ['badge-welcome'],
    role: email === 'ciuldinciuldin@gmail.com' ? 'instructor' : 'student'
  };

  try {
    await setDoc(userDocRef, defaultUser);
    console.log('Pre-seeded email/password registration to Firebase:', email);
  } catch (err) {
    console.warn('Silent fallback: Pre-seeding email/password to Firebase failed:', err);
  }

  // --- WhatsApp Pre-Registration Auto-Enrollment ---
  await processPreRegistration(email, user.uid);

  return user;
}

export async function signInUserWithEmailAndPassword(email: string, password: string): Promise<any> {
  const credentials = await signInWithEmailAndPassword(auth, email, password);
  return credentials.user;
}

export async function updateUserProfile(userId: string, name: string, avatarUrlOrFile?: string | File): Promise<{ name: string; avatar: string }> {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) {
    throw new Error('Not authenticated or unauthorized to update this profile');
  }

  const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
  let finalAvatar = user.photoURL || fallbackAvatar;

  if (avatarUrlOrFile) {
    if (avatarUrlOrFile instanceof File) {
      try {
        const fileExt = avatarUrlOrFile.name.split('.').pop() || 'png';
        const fileName = `avatar_${Date.now()}.${fileExt}`;
        const fileRef = ref(storage, `users/${user.uid}/avatar/${fileName}`);
        
        const uploadTask = uploadBytesResumable(fileRef, avatarUrlOrFile, {
          contentType: avatarUrlOrFile.type
        });

        const downloadUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed', 
            null, 
            (error) => {
              console.error('Avatar Upload Error during profile edit:', error);
              reject(error);
            }, 
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
        finalAvatar = downloadUrl;
      } catch (uploadErr) {
        console.error('File upload failed during profile edit:', uploadErr);
        throw uploadErr;
      }
    } else if (typeof avatarUrlOrFile === 'string') {
      finalAvatar = avatarUrlOrFile;
    }
  }

  const authPhotoURL = (finalAvatar && finalAvatar.length < 1500) ? finalAvatar : fallbackAvatar;
  await updateProfile(user, {
    displayName: name,
    photoURL: authPhotoURL
  });

  const userDocRef = doc(db, 'leaderboard', user.uid);
  try {
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      await updateDoc(userDocRef, {
        name: name,
        avatar: finalAvatar
      });
    } else {
      await setDoc(userDocRef, {
        userId: user.uid,
        name: name,
        email: user.email || '',
        avatar: finalAvatar,
        xp: 0,
        level: 1,
        badges: ['badge-welcome'],
        role: user.email === 'ciuldinciuldin@gmail.com' ? 'instructor' : 'student'
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `leaderboard/${user.uid}`);
  }

  return { name, avatar: finalAvatar };
}


