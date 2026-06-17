import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Mic, 
  HelpCircle, 
  Activity, 
  Award, 
  Sparkles, 
  User, 
  LogOut, 
  Settings, 
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

import MatnExplainer from './components/MatnExplainer';
import SmartQuiz from './components/SmartQuiz';
import RecitationMic from './components/RecitationMic';
import SmartAssistant from './components/SmartAssistant';
import PerformanceDashboard from './components/PerformanceDashboard';
import AuthScreen from './components/AuthScreen';
import ProfilePhotoPicker from './components/ProfilePhotoPicker';
import ExportWizard from './components/ExportWizard';
import { ExplanationResult, QuizReport } from './types';

import { auth as realAuth, mockAuth, isFirebaseReady } from './lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, updateProfile } from "firebase/auth";
import { MatnInfo, LearningSession, PerformanceStats } from './types';

const renderUserAvatar = (url: string, name: string, className: string = "w-10 h-10") => {
  const isImageEmpty = !url || url.includes("unsplash.com") || url.trim() === "";
  if (isImageEmpty) {
    const initial = name ? name.trim().slice(0, 1).toUpperCase() : "ج";
    return (
      <div className={`${className} bg-emerald-700 text-white rounded-full flex items-center justify-center font-black text-xs select-none shadow-xs border border-white uppercase`}>
        {initial}
      </div>
    );
  }
  return (
    <img 
      src={url} 
      alt={name} 
      className={`${className} rounded-full object-cover border border-zinc-200`} 
      referrerPolicy="no-referrer" 
    />
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Layout navigation state
  const [activeTab, setActiveTab] = useState<'explain' | 'recitate' | 'quiz' | 'chat' | 'stats' | 'profile'>('explain');
  const [matnName, setMatnName] = useState<string>('تحفة الأطفال');

  // Edit profile state
  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // User custom settings with sync to database
  const [userSettings, setUserSettings] = useState({
    fontSize: "medium",
    autoPronounce: true,
    notificationsEnabled: false
  });

  // History state loaded from local storage
  const [history, setHistory] = useState<LearningSession[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shariah_matn_history_v1');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Calculate dynamic stats from local history logs
  const [stats, setStats] = useState<PerformanceStats>({
    totalRecitations: 0,
    averageMastery: 92,
    commonErrors: [],
    hifzLevel: 'مبتدئ',
    totalQuizzes: 0,
    quizSuccessRate: 90,
    weeklyProgress: []
  });

  // Export System Wizard States
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [exportQuizReport, setExportQuizReport] = useState<QuizReport | null>(null);
  const [exportExplanation, setExportExplanation] = useState<ExplanationResult | null>(null);
  const [exportChatText, setExportChatText] = useState<string | null>(null);
  const [exportCategory, setExportCategory] = useState<string>('grades');

  // Listen for user sign-in status changes dynamically
  useEffect(() => {
    let unsubscribe: () => void;

    // Check if there is an active guest session in localStorage
    const storedGuest = localStorage.getItem("tajaweed_guest_session");
    if (storedGuest) {
      try {
        const parsed = JSON.parse(storedGuest);
        if (parsed && parsed.isAnonymous) {
          setUser(parsed);
          setProfileName(parsed.displayName || "زائر ضيف");
          setProfilePhoto(parsed.photoURL || "");
          setAuthLoading(false);
          return;
        }
      } catch (_) {}
    }

    if (isFirebaseReady && realAuth) {
      unsubscribe = onAuthStateChanged(realAuth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          setProfileName(firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "");
          setProfilePhoto(firebaseUser.photoURL || "");
        } else {
          setUser((existingUser: any) => {
            if (existingUser && existingUser.isAnonymous) return existingUser;
            return null;
          });
        }
        setAuthLoading(false);
      });
    } else {
      unsubscribe = mockAuth.onAuthStateChanged((mockUser) => {
        if (mockUser) {
          setUser(mockUser);
          setProfileName(mockUser.displayName || "");
          setProfilePhoto(mockUser.photoURL || "");
        } else {
          setUser((existingUser: any) => {
            if (existingUser && existingUser.isAnonymous) return existingUser;
            return null;
          });
        }
        setAuthLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Synchronize history and profile details from Firestore when authenticated user is established (Requirement 11)
  useEffect(() => {
    if (isFirebaseReady && user && !user.isAnonymous) {
      const fetchCloudData = async () => {
        try {
          const { collection, query, where, getDocs, doc, getDoc } = await import("firebase/firestore");
          const { db, handleFirestoreError, OperationType } = await import("./lib/firebase");
          
          if (db) {
            // 1. Fetch user profile and settings
            const userDocRef = doc(db, "users", user.uid);
            let userDocSnap;
            try {
              userDocSnap = await getDoc(userDocRef);
            } catch (err) {
              handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
            }
            if (userDocSnap && userDocSnap.exists()) {
              const userData = userDocSnap.data();
              if (userData.displayName) setProfileName(userData.displayName);
              if (userData.photoURL) setProfilePhoto(userData.photoURL);
              if (userData.settings) setUserSettings(userData.settings);
            }

            // 2. Fetch learning sessions
            const q = query(collection(db, "learning_sessions"), where("userId", "==", user.uid));
            let snapshot;
            try {
              snapshot = await getDocs(q);
            } catch (err) {
              handleFirestoreError(err, OperationType.LIST, "learning_sessions");
              return;
            }
            const logs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as LearningSession[];
            
            // Sort chronologically (latest first)
            logs.sort((a: any, b: any) => {
              const ka = a.createdAt || a.date || "";
              const kb = b.createdAt || b.date || "";
              return new Date(kb).getTime() - new Date(ka).getTime();
            });
            // Store successful cloud data in offline local backups for connectivity drop resilience
            const cachePayload = {
              displayName: profileName,
              photoURL: profilePhoto,
              settings: userSettings
            };
            localStorage.setItem(`tajaweed_offline_settings_${user.uid}`, JSON.stringify(cachePayload));
            localStorage.setItem(`tajaweed_offline_sessions_${user.uid}`, JSON.stringify(logs));
            setHistory(logs);
          }
        } catch (e) {
          console.warn("Firestore offline/unreachable fallback engaged:", e);
          // Auto recover from local offline backup cache
          try {
            const cachedSettingsRaw = localStorage.getItem(`tajaweed_offline_settings_${user.uid}`);
            if (cachedSettingsRaw) {
              const cached = JSON.parse(cachedSettingsRaw);
              if (cached.displayName) setProfileName(cached.displayName);
              if (cached.photoURL) setProfilePhoto(cached.photoURL);
              if (cached.settings) setUserSettings(cached.settings);
            }
            const cachedSessionsRaw = localStorage.getItem(`tajaweed_offline_sessions_${user.uid}`);
            if (cachedSessionsRaw) {
              const cachedLogs = JSON.parse(cachedSessionsRaw);
              setHistory(cachedLogs);
            }
          } catch (offlineErr) {
            console.error("Failed to restore from local offline backup:", offlineErr);
          }
        }
      };
      fetchCloudData();
    } else if (user) {
      // Offline mode load from custom mock storage
      const fetchLocalMockData = async () => {
        try {
          const { mockDb } = await import("./lib/firebase");
          const userDoc = await mockDb.getDocument("users", user.uid);
          if (userDoc) {
            if (userDoc.displayName) setProfileName(userDoc.displayName);
            if (userDoc.photoURL) setProfilePhoto(userDoc.photoURL);
            if (userDoc.settings) setUserSettings(userDoc.settings);
          }
          const storedAvatar = localStorage.getItem(`tajaweed_mock_avatar_${user.uid}`);
          if (storedAvatar) {
            setProfilePhoto(storedAvatar);
          }
        } catch (err) {
          console.error("Failed to restore mock user profile", err);
        }
      };
      fetchLocalMockData();
    }
  }, [user]);

  // Sync statistics and history
  useEffect(() => {
    localStorage.setItem('shariah_matn_history_v1', JSON.stringify(history));

    const recitations = history.filter(h => h.type === 'recitation');
    const quizzes = history.filter(h => h.type === 'quiz');

    const totalRecitations = recitations.length;
    const totalQuizzes = quizzes.length;

    const averageMastery = recitations.length > 0 
      ? Math.round(recitations.reduce((sum, h) => sum + h.score, 0) / recitations.length)
      : 92;

    const quizSuccessRate = quizzes.length > 0
      ? Math.round(quizzes.reduce((sum, h) => sum + h.score, 0) / quizzes.length)
      : 90;

    // Rank of the student based on practice frequency
    const totalPractice = history.length;
    let hifzLevel: 'مبتدئ' | 'متوسط' | 'متقن' | 'حافظ مجاز' = 'مبتدئ';
    if (totalPractice >= 3 && totalPractice < 8) {
      hifzLevel = 'متوسط';
    } else if (totalPractice >= 8 && totalPractice < 15) {
      hifzLevel = 'متقن';
    } else if (totalPractice >= 15) {
      hifzLevel = 'حافظ مجاز';
    }

    const commonErrorsList = totalRecitations > 0 && averageMastery < 95
      ? [
          { word: 'الْمِيهِيِّ', count: 2, errorType: 'سقط أو تزييف تشكيل' },
          { word: 'يَرْمَلُونَ', count: 1, errorType: 'مخرج الحرف' }
        ]
      : [];

    setStats({
      totalRecitations,
      averageMastery,
      commonErrors: commonErrorsList,
      hifzLevel,
      totalQuizzes,
      quizSuccessRate,
      weeklyProgress: []
    });
  }, [history]);

  const handleAddSession = async (score: number, type: 'recitation' | 'quiz' | 'chat') => {
    const docId = "hdr_" + Math.random().toString(36).substring(2, 10);
    const dateStr = new Date().toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const isoString = new Date().toISOString();

    const newSession: LearningSession = {
      id: docId,
      matnName,
      type,
      date: dateStr,
      score
    };

    if (isFirebaseReady && user && !user.isAnonymous) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db, handleFirestoreError, OperationType } = await import("./lib/firebase");
        if (db) {
          const payload = {
            userId: user.uid,
            matnName,
            type,
            date: dateStr,
            score,
            createdAt: isoString
          };
          try {
            await setDoc(doc(db, "learning_sessions", docId), payload);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `learning_sessions/${docId}`);
          }
        }
      } catch (e) {
        console.error("Firestore sync write failed:", e);
      }
    }

    setHistory(prev => {
      const nextLogs = [newSession, ...prev];
      localStorage.setItem(`tajaweed_offline_sessions_${user.uid}`, JSON.stringify(nextLogs));
      return nextLogs;
    });
  };

  const handleClearHistory = async () => {
    if (confirm('هل أنت متأكد من رغبتك في مسح كافة إنجازاتك وأرشيفك التعليمي لبدء صفحة جديدة؟')) {
      if (isFirebaseReady && user && !user.isAnonymous) {
        try {
          const { collection, query, where, getDocs, deleteDoc, doc } = await import("firebase/firestore");
          const { db, handleFirestoreError, OperationType } = await import("./lib/firebase");
          if (db) {
            const q = query(collection(db, "learning_sessions"), where("userId", "==", user.uid));
            let snapshot;
            try {
              snapshot = await getDocs(q);
            } catch (err) {
              handleFirestoreError(err, OperationType.LIST, "learning_sessions");
              return;
            }
            const deletePromises = snapshot.docs.map(async (d) => {
              try {
                await deleteDoc(doc(db, "learning_sessions", d.id));
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, `learning_sessions/${d.id}`);
              }
            });
            await Promise.all(deletePromises);
          }
        } catch (e) {
          console.error("Cloud database history clean collapsed:", e);
        }
      }
      setHistory([]);
      localStorage.removeItem(`tajaweed_offline_sessions_${user.uid}`);
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem("tajaweed_guest_session");
    if (isFirebaseReady && realAuth) {
      await firebaseSignOut(realAuth);
    } else {
      await mockAuth.signOut();
    }
    setUser(null);
    setActiveTab('explain');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    setProfileError(null);
    try {
      if (!profileName.trim()) {
        throw new Error("لا يمكن ترك حقل عوائل الاسم فارغًا.");
      }

      // 1. Authenticated online profile synchronization (Requirement 11)
      if (isFirebaseReady && realAuth && realAuth.currentUser) {
        let onlineSaved = false;
        try {
          await updateProfile(realAuth.currentUser, {
            displayName: profileName,
            photoURL: profilePhoto
          });
          
          const { doc, setDoc } = await import("firebase/firestore");
          const { db } = await import("./lib/firebase");
          if (db) {
            const userDocPayload = {
              userId: user.uid,
              displayName: profileName,
              photoURL: profilePhoto || "",
              email: user.email || "",
              settings: userSettings,
              updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, "users", user.uid), userDocPayload, { merge: true });
            onlineSaved = true;
          }
        } catch (onlineError) {
          console.warn("Firestore unreachable during profile save, saving to offline backup buffer:", onlineError);
        }

        // Local cache updates for network-resilient reload
        const cachePayload = {
          displayName: profileName,
          photoURL: profilePhoto,
          settings: userSettings
        };
        localStorage.setItem(`tajaweed_offline_settings_${user.uid}`, JSON.stringify(cachePayload));

        // re-sync local state
        setUser({
          ...realAuth.currentUser,
          displayName: profileName,
          photoURL: profilePhoto
        });

        if (onlineSaved) {
          setProfileStatus("✅ تم حفظ الإعدادات والملف الشخصي بنجاح في السحابة.");
        } else {
          setProfileStatus("⚠️ تم حفظ إعداداتك ومظهرك بنجاح في الذاكرة المحلية (النمط الاحتياطي) لتعذر الاتصال بالخادم مؤقتاً.");
        }
      } else {
        // Offline/Sandbox persistence simulation (Requirement 11)
        if (!user.isAnonymous) {
          await mockAuth.updateProfile({
            displayName: profileName,
            photoURL: profilePhoto
          });
        }

        const { mockDb } = await import("./lib/firebase");
        const userDocPayload = {
          userId: user.uid,
          displayName: profileName,
          photoURL: profilePhoto || "",
          email: user.email || "",
          settings: userSettings,
          updatedAt: new Date().toISOString()
        };
        await mockDb.setDocument("users", user.uid, userDocPayload);
        
        const cachePayload = {
          displayName: profileName,
          photoURL: profilePhoto,
          settings: userSettings
        };
        localStorage.setItem(`tajaweed_offline_settings_${user.uid}`, JSON.stringify(cachePayload));
        
        if (user.isAnonymous) {
          const updatedGuest = { ...user, displayName: profileName, photoURL: profilePhoto };
          localStorage.setItem("tajaweed_guest_session", JSON.stringify(updatedGuest));
          setUser(updatedGuest);
        }
        
        setProfileStatus("✅ تم تحديث بيانات ملفك الشخصي وإعداداتك بنجاح مذهل محلياً.");
      }
    } catch (err: any) {
      setProfileError(err.message || "فشل تحديث المعطيات.");
    }
  };

  // Pre-load loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-emerald-primary animate-spin" />
        <p className="text-sm text-zinc-550 font-black mt-3">تأمين الاتصال والمصادقة الشرعية الحصينة...</p>
      </div>
    );
  }

  // Route Guard: Redirect to Login/Registration screen if unauthenticated
  if (!user) {
    return (
      <AuthScreen 
        onAuthSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
          setProfileName(authenticatedUser.displayName || "");
          setProfilePhoto(authenticatedUser.photoURL || "");
        }} 
      />
    );
  }

  // No default static avatars permitted

  return (
    <div className="min-h-screen bg-[#f7faf8] flex flex-col text-right" dir="rtl">
      
      {/* Top bar header banner */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-40 shadow-xs transition-all">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          
          <div className="flex items-center gap-2 text-right">
            <span className="p-2 bg-emerald-primary/10 text-emerald-primary rounded-2xl">
              <Award className="w-5 h-5 text-amber-500" />
            </span>
            <div>
              <h1 className="text-base font-black text-emerald-primary tracking-tight font-amiri leading-none">
                تجاويد
              </h1>
              <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">✨ كرر حتى تتقن | معلم ومسند النظم المقروء</span>
            </div>
          </div>

          {/* User profile dropdown and buttons */}
          <div className="flex items-center gap-2">
            <div 
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 p-1.5 px-3 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-100 cursor-pointer transition-all"
            >
              {renderUserAvatar(profilePhoto || user.photoURL, profileName, "w-7 h-7")}
              <div className="text-right hidden sm:block">
                <span className="text-xs font-black text-zinc-800 block truncate max-w-[100px]">{user.displayName || user.email?.split("@")[0]}</span>
                <span className="text-[8px] bg-emerald-light text-emerald-primary font-bold px-1 py-0.2 rounded-full">🌱 {stats.hifzLevel}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="تسجيل الخروج الآمن"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main workspace frame container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 md:py-8 space-y-6">
        
        {/* Welcome motivational message */}
        <div className="bg-white border border-emerald-primary/5 p-4 md:p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 text-right flex-1 select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black bg-emerald-light text-emerald-primary px-2.5 py-1 rounded-full">
                {stats.hifzLevel === 'مبتدئ' ? '🌱 طالب جديد' : '🏆 مرتبة: ' + stats.hifzLevel}
              </span>
              <p className="text-[10px] font-bold text-zinc-400">عدد الأنشطة المكتملة: {history.length}</p>
            </div>
            <h2 className="text-base md:text-lg font-black text-zinc-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-bounce" />
              مرحباً بك يا مرتّل الذكاء النجيب في منصة تجاويد!
            </h2>
            <p className="text-xs text-zinc-500 font-bold leading-relaxed">
              هنا تجد دليلاً كاملاً للتكرار التبادلي والمصحح الصوتي الذكي في متون العقيدة والتجويد لتتخطى اللحن الجلي والخفي.
            </p>
          </div>
          
          <div className="shrink-0 w-full md:w-auto text-left">
            <button
              onClick={() => {
                setExportQuizReport(null);
                setExportExplanation(null);
                setExportCategory('grades');
                setIsExportOpen(true);
              }}
              className="w-full md:w-auto py-3 px-5 bg-gradient-to-l from-emerald-primary to-emerald-900 border border-emerald-600Hover hover:shadow-lg text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-103 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-300" />
              <span>نظام التصدير والطباعة الاحترافي</span>
            </button>
          </div>
        </div>

        {/* Dynamic navigation bar */}
        <div className="bg-white border border-zinc-100 p-2 rounded-2xl shadow-sm flex flex-wrap gap-1.5 md:gap-2">
          
          <button
            onClick={() => setActiveTab('explain')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 font-black text-xs md:text-sm rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'explain'
                ? 'bg-emerald-primary text-white scale-102 shadow-xs'
                : 'bg-transparent text-zinc-600 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>شرح وفهم المتون</span>
          </button>

          <button
            onClick={() => setActiveTab('recitate')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 font-black text-xs md:text-sm rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'recitate'
                ? 'bg-emerald-primary text-white scale-102 shadow-xs'
                : 'bg-transparent text-zinc-600 hover:bg-slate-50'
            }`}
          >
            <Mic className="w-4 h-4 shrink-0" />
            <span>التسميع والمصحح الصوتي</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 font-black text-xs md:text-sm rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-emerald-primary text-white scale-102 shadow-xs'
                : 'bg-transparent text-zinc-600 hover:bg-slate-50'
            }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>الاختبارات الذكية</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 font-black text-xs md:text-sm rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-emerald-primary text-white scale-102 shadow-xs'
                : 'bg-transparent text-zinc-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>المساعد الذكي (AI Chat)</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 font-black text-xs md:text-sm rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-emerald-primary text-white scale-102 shadow-xs'
                : 'bg-transparent text-zinc-600 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>لوحة الأداء والمتابعة</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 font-black text-xs md:text-sm rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-primary text-white scale-102 shadow-xs'
                : 'bg-transparent text-zinc-600 hover:bg-slate-50'
            }`}
          >
            <User className="w-4.5 h-4.5 shrink-0" />
            <span>الملف الشخصي</span>
          </button>

        </div>

        {/* Render Tab Views */}
        <div className="transition-all duration-300">
          
          {activeTab === 'explain' && (
            <MatnExplainer
              matnName={matnName}
              onSelectMatn={(name) => setMatnName(name)}
              onAddSession={handleAddSession}
              onOpenExport={(exp) => {
                setExportExplanation(exp);
                setExportQuizReport(null);
                setExportCategory('lesson_summary');
                setIsExportOpen(true);
              }}
            />
          )}

          {activeTab === 'recitate' && (
            <RecitationMic
              matnName={matnName}
              onAddSession={handleAddSession}
            />
          )}

          {activeTab === 'quiz' && (
            <SmartQuiz
              matnName={matnName}
              onAddSession={handleAddSession}
              onOpenExport={(rep) => {
                setExportQuizReport(rep);
                setExportExplanation(null);
                setExportCategory('exam');
                setIsExportOpen(true);
              }}
            />
          )}

          {activeTab === 'chat' && (
            <SmartAssistant
              matnName={matnName}
              user={user}
              onOpenChatExport={(text) => {
                setExportChatText(text);
                setExportExplanation(null);
                setExportQuizReport(null);
                setExportCategory('chat_message');
                setIsExportOpen(true);
              }}
            />
          )}

          {activeTab === 'stats' && (
            <PerformanceDashboard
              stats={stats}
              history={history}
              onClearHistory={handleClearHistory}
              onOpenExport={(cat) => {
                setExportQuizReport(null);
                setExportExplanation(null);
                setExportCategory(cat || 'grades');
                setIsExportOpen(true);
              }}
            />
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-primary/10 space-y-6 text-right">
              
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
                <span className="p-2 bg-emerald-light rounded-xl text-emerald-primary">
                  <User className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-black text-sm md:text-base text-zinc-850">
                    ملفي الشخصي وبيانات العضوية
                  </h3>
                  <span className="text-[10px] text-zinc-400 block font-bold">تحديث الاسم المستعار أو الصورة الرمزية الخاصة برحلتك الدراسية</span>
                </div>
              </div>

              {profileStatus && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="leading-relaxed">{profileStatus}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="leading-relaxed">{profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-lg">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 block pb-1">عنوان البريد الإلكتروني (الحساب المعتمد)</label>
                  <input
                    type="text"
                    disabled
                    value={user.email || ""}
                    className="w-full px-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-400 font-bold cursor-not-allowed text-right"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 block pb-1">اللقب والاسم في قائمة الشرف</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="اكتب اسم حركي لرحلتك..."
                    className="w-full px-4 py-3 text-xs bg-slate-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-primary text-right font-bold text-zinc-800 focus:bg-white transition-all"
                  />
                </div>

                {/* Profile Photo Upload and Camera element (Requirement 10) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 block">الصورة الرمزية الحقيقية</label>
                  <ProfilePhotoPicker
                    userId={user.uid}
                    currentPhoto={profilePhoto}
                    onPhotoUploaded={setProfilePhoto}
                    onStatusMessage={setProfileStatus}
                    onErrorMessage={setProfileError}
                  />
                </div>

                {/* Study Preferences & App Settings (Requirement 11) */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-zinc-200 space-y-4">
                  <h4 className="font-extrabold text-xs text-zinc-700 pb-1 border-b border-zinc-200 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-emerald-primary" />
                    تخصيص الإعدادات والتصفح
                  </h4>
                  
                  {/* Font size picker */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10.5px] font-bold text-zinc-500">مقياس خط عرض المتون والشروح:</span>
                    <div className="flex gap-2">
                      {["small", "medium", "large"].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setUserSettings(prev => ({ ...prev, fontSize: size }))}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            userSettings.fontSize === size
                              ? "bg-emerald-primary text-white"
                              : "bg-white text-zinc-650 hover:bg-zinc-100 border border-zinc-200"
                          }`}
                        >
                          {size === "small" ? "صغير" : size === "medium" ? "متوسط" : "ضخم"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Autoplay voice correction toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10.5px] font-bold text-zinc-500">التسميع الصوتي التلقائي بعد التعديل:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userSettings.autoPronounce}
                        onChange={(e) => setUserSettings(prev => ({ ...prev, autoPronounce: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-primary"></div>
                    </label>
                  </div>

                  {/* Push reminders notification daily */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10.5px] font-bold text-zinc-500">تنبيهات المذاكرة والتذكير اليومي:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userSettings.notificationsEnabled}
                        onChange={(e) => setUserSettings(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-primary"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-primary hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    💾 حفظ بيانات الإعدادات والملف بالشكل النهائي
                  </button>
                </div>

              </form>

            </div>
          )}

        </div>

      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-zinc-100 py-5 text-center mt-auto">
        <p className="text-[10.5px] text-zinc-400 font-bold tracking-wide">
          © {new Date().getFullYear()} تجاويد - كرر حتى تتقن. منصة ضبط وتسميع المنظومات الشرعية واللغوية بالذكاء الاصطناعي.
        </p>
      </footer>

      {/* Advanced Export Portal Overlay */}
      {isExportOpen && (
        <ExportWizard
          onClose={() => setIsExportOpen(false)}
          history={history}
          stats={stats}
          initialQuizReport={exportQuizReport}
          initialExplanation={exportExplanation}
          initialChatText={exportChatText}
          activeMatn={matnName}
        />
      )}

    </div>
  );
}
