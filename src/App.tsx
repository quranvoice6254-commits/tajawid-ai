import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  BookOpenText,
  Mic,
  AudioLines,
  HelpCircle,
  Lightbulb,
  Activity,
  TrendingUp,
  Award,
  Sparkles,
  User,
  LogOut,
  Settings,
  MessageSquare,
  BotMessageSquare,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Moon,
  Sun,
  Calendar,
} from "lucide-react";

import MatnExplainer from "./components/MatnExplainer";
import SmartQuiz from "./components/SmartQuiz";
import RecitationMic from "./components/RecitationMic";
import SmartAssistant from "./components/SmartAssistant";
import PerformanceDashboard from "./components/PerformanceDashboard";
import AuthScreen from "./components/AuthScreen";
import ProfilePhotoPicker from "./components/ProfilePhotoPicker";
import { ExplanationResult, QuizReport } from "./types";

import { auth as realAuth, mockAuth, isFirebaseReady } from "./lib/firebase";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { MatnInfo, LearningSession, PerformanceStats } from "./types";

const renderUserAvatar = (
  url: string,
  name: string,
  className: string = "w-10 h-10",
) => {
  const isImageEmpty =
    !url || url.includes("unsplash.com") || url.trim() === "";
  if (isImageEmpty) {
    const initial = name ? name.trim().slice(0, 1).toUpperCase() : "ج";
    return (
      <div
        className={`${className} bg-emerald-700 text-white rounded-full flex items-center justify-center font-black text-xs select-none shadow-xs border border-white uppercase`}
      >
        {initial}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      className={`${className} rounded-full object-cover border border-border-primary`}
      referrerPolicy="no-referrer"
    />
  );
};

const TypewriterText = ({
  text,
  onComplete,
}: {
  text: string;
  onComplete?: () => void;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text.charAt(index));
        setIndex((prev) => prev + 1);
      }, 50); // typing speed
      return () => clearTimeout(timer);
    } else if (onComplete) {
      const delayTimer = setTimeout(() => {
        onComplete();
      }, 200);
      return () => clearTimeout(delayTimer);
    }
  }, [index, text, onComplete]);

  return <span>{displayedText}</span>;
};

const IntroScreen = ({ onStart }: { onStart: () => void; key?: string }) => {
  const [stage, setStage] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-bg-primary flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      {/* Background decorations matching the app */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 pointer-events-none z-0" />
      
      <div className="max-w-2xl text-center flex flex-col items-center relative z-10 bg-bg-secondary p-12 rounded-[3rem] shadow-2xl border border-white/20 dark:border-white/5 backdrop-blur-xl">
        <motion.div 
          initial={{ clipPath: "circle(0% at 50% 50%)", opacity: 0, scale: 0.8 }}
          animate={{ clipPath: "circle(100% at 50% 50%)", opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="w-32 h-32 mb-8 flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl shadow-brand-primary/20 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20"
        >
          <img 
            src="/logo.png" 
            alt="تجاويد Logo" 
            className="w-full h-full object-cover" 
            onError={(e) => { 
              const target = e.currentTarget;
              if (target.src.endsWith('.png')) {
                target.src = '/logo.jpg';
              } else if (target.src.endsWith('.jpg')) {
                target.src = '/logo.jpeg';
              } else {
                target.src = 'https://placehold.co/400x400/0a5f3e/ffffff?text=Logo';
              }
            }} 
          />
        </motion.div>
        
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-text-primary font-amiri tracking-wide leading-relaxed drop-shadow-sm flex items-center justify-center flex-wrap gap-x-2">
          <TypewriterText text="مرحباً بك في" onComplete={() => setStage(1)} />
          {stage >= 1 ? (
            <span className="text-brand-primary drop-shadow-md">
              <TypewriterText text="تجاويد Ai" onComplete={() => setStage(2)} />
            </span>
          ) : (
            <span className="opacity-0">تجاويد Ai</span>
          )}
        </h2>

        {stage >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mt-6 text-text-secondary font-bold text-base md:text-lg tracking-widest bg-brand-light dark:bg-brand-primary/10 px-6 py-2 rounded-full border border-brand-primary/20"
          >
            كرر حتى تتقن
          </motion.div>
        )}

        {stage >= 2 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
            onClick={onStart}
            className="mt-12 px-10 py-4 bg-brand-primary text-white font-black text-sm md:text-base rounded-full shadow-lg hover:shadow-xl hover:shadow-brand-primary/30 transition-all flex items-center gap-2 cursor-pointer group"
          >
            ابدأ الآن
            <svg
              className="w-5 h-5 -scale-x-100 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Intro state
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tajaweed_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("tajaweed_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Layout navigation state
  const [activeTab, setActiveTab] = useState<
    "explain" | "recitate" | "quiz" | "chat" | "stats" | "profile"
  >("explain");
  const [matnName, setMatnName] = useState<string>("تحفة الأطفال");

  // Swipe logic
  const swipeOrder = ["explain", "quiz", "recitate", "chat", "stats"];
  const [touchStartXY, setTouchStartXY] = useState<{x: number, y: number} | null>(null);
  const [touchEndXY, setTouchEndXY] = useState<{x: number, y: number} | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndXY(null);
    setTouchStartXY({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndXY({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEnd = () => {
    if (!touchStartXY || !touchEndXY) return;
    const distanceX = touchStartXY.x - touchEndXY.x;
    const distanceY = touchStartXY.y - touchEndXY.y;
    
    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 50) {
      const currentIndex = swipeOrder.indexOf(activeTab);
      if (currentIndex === -1) return;
      
      if (distanceX < -50 && currentIndex < swipeOrder.length - 1) {
        // Swipe Right (Move towards left tabs in RTL)
        setActiveTab(swipeOrder[currentIndex + 1] as any);
      } else if (distanceX > 50 && currentIndex > 0) {
        // Swipe Left (Move towards right tabs in RTL)
        setActiveTab(swipeOrder[currentIndex - 1] as any);
      }
    }
  };

  // Edit profile state
  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // User custom settings with sync to database
  const [userSettings, setUserSettings] = useState({
    fontSize: "medium",
    autoPronounce: true,
    notificationsEnabled: false,
  });

  // History state loaded from local storage
  const [history, setHistory] = useState<LearningSession[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("shariah_matn_history_v1");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Calculate dynamic stats from local history logs
  const [stats, setStats] = useState<PerformanceStats>({
    totalRecitations: 0,
    averageMastery: 92,
    commonErrors: [],
    hifzLevel: "مبتدئ",
    totalQuizzes: 0,
    quizSuccessRate: 90,
    weeklyProgress: [],
  });

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
          setProfileName(
            firebaseUser.isAnonymous
              ? "زائر ضيف"
              : firebaseUser.displayName ||
                  firebaseUser.email?.split("@")[0] ||
                  "",
          );
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
          const { collection, query, where, getDocs, doc, getDoc } =
            await import("firebase/firestore");
          const { db, handleFirestoreError, OperationType } =
            await import("./lib/firebase");

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
            const q = query(
              collection(db, "learning_sessions"),
              where("userId", "==", user.uid),
            );
            let snapshot;
            try {
              snapshot = await getDocs(q);
            } catch (err) {
              handleFirestoreError(
                err,
                OperationType.LIST,
                "learning_sessions",
              );
              return;
            }
            const logs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
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
              settings: userSettings,
            };
            localStorage.setItem(
              `tajaweed_offline_settings_${user.uid}`,
              JSON.stringify(cachePayload),
            );
            localStorage.setItem(
              `tajaweed_offline_sessions_${user.uid}`,
              JSON.stringify(logs),
            );
            setHistory(logs);
          }
        } catch (e) {
          console.warn("Firestore offline/unreachable fallback engaged:", e);
          // Auto recover from local offline backup cache
          try {
            const cachedSettingsRaw = localStorage.getItem(
              `tajaweed_offline_settings_${user.uid}`,
            );
            if (cachedSettingsRaw) {
              const cached = JSON.parse(cachedSettingsRaw);
              if (cached.displayName) setProfileName(cached.displayName);
              if (cached.photoURL) setProfilePhoto(cached.photoURL);
              if (cached.settings) setUserSettings(cached.settings);
            }
            const cachedSessionsRaw = localStorage.getItem(
              `tajaweed_offline_sessions_${user.uid}`,
            );
            if (cachedSessionsRaw) {
              const cachedLogs = JSON.parse(cachedSessionsRaw);
              setHistory(cachedLogs);
            }
          } catch (offlineErr) {
            console.error(
              "Failed to restore from local offline backup:",
              offlineErr,
            );
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
          const storedAvatar = localStorage.getItem(
            `tajaweed_mock_avatar_${user.uid}`,
          );
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
    localStorage.setItem("shariah_matn_history_v1", JSON.stringify(history));

    const recitations = history.filter((h) => h.type === "recitation");
    const quizzes = history.filter((h) => h.type === "quiz");

    const totalRecitations = recitations.length;
    const totalQuizzes = quizzes.length;

    const averageMastery =
      recitations.length > 0
        ? Math.round(
            recitations.reduce((sum, h) => sum + h.score, 0) /
              recitations.length,
          )
        : 92;

    const quizSuccessRate =
      quizzes.length > 0
        ? Math.round(
            quizzes.reduce((sum, h) => sum + h.score, 0) / quizzes.length,
          )
        : 90;

    // Rank of the student based on practice frequency
    const totalPractice = history.length;
    let hifzLevel: "مبتدئ" | "متوسط" | "متقن" | "حافظ مجاز" = "مبتدئ";
    if (totalPractice >= 3 && totalPractice < 8) {
      hifzLevel = "متوسط";
    } else if (totalPractice >= 8 && totalPractice < 15) {
      hifzLevel = "متقن";
    } else if (totalPractice >= 15) {
      hifzLevel = "حافظ مجاز";
    }

    const commonErrorsList =
      totalRecitations > 0 && averageMastery < 95
        ? [
            { word: "الْمِيهِيِّ", count: 2, errorType: "سقط أو تزييف تشكيل" },
            { word: "يَرْمَلُونَ", count: 1, errorType: "مخرج الحرف" },
          ]
        : [];

    setStats({
      totalRecitations,
      averageMastery,
      commonErrors: commonErrorsList,
      hifzLevel,
      totalQuizzes,
      quizSuccessRate,
      weeklyProgress: [],
    });
  }, [history]);

  const handleAddSession = async (
    score: number,
    type: "recitation" | "quiz" | "chat",
  ) => {
    const docId = "hdr_" + Math.random().toString(36).substring(2, 10);
    const dateStr = new Date().toLocaleDateString("ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const isoString = new Date().toISOString();

    const newSession: LearningSession = {
      id: docId,
      matnName,
      type,
      date: dateStr,
      score,
    };

    if (isFirebaseReady && user && !user.isAnonymous) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db, handleFirestoreError, OperationType } =
          await import("./lib/firebase");
        if (db) {
          const payload = {
            userId: user.uid,
            matnName,
            type,
            date: dateStr,
            score,
            createdAt: isoString,
          };
          try {
            await setDoc(doc(db, "learning_sessions", docId), payload);
          } catch (err) {
            handleFirestoreError(
              err,
              OperationType.WRITE,
              `learning_sessions/${docId}`,
            );
          }
        }
      } catch (e) {
        console.error("Firestore sync write failed:", e);
      }
    }

    setHistory((prev) => {
      const nextLogs = [newSession, ...prev];
      localStorage.setItem(
        `tajaweed_offline_sessions_${user.uid}`,
        JSON.stringify(nextLogs),
      );
      return nextLogs;
    });
  };

  const handleClearHistory = async () => {
    if (
      confirm(
        "هل أنت متأكد من رغبتك في مسح كافة إنجازاتك وأرشيفك التعليمي لبدء صفحة جديدة؟",
      )
    ) {
      if (isFirebaseReady && user && !user.isAnonymous) {
        try {
          const { collection, query, where, getDocs, deleteDoc, doc } =
            await import("firebase/firestore");
          const { db, handleFirestoreError, OperationType } =
            await import("./lib/firebase");
          if (db) {
            const q = query(
              collection(db, "learning_sessions"),
              where("userId", "==", user.uid),
            );
            let snapshot;
            try {
              snapshot = await getDocs(q);
            } catch (err) {
              handleFirestoreError(
                err,
                OperationType.LIST,
                "learning_sessions",
              );
              return;
            }
            const deletePromises = snapshot.docs.map(async (d) => {
              try {
                await deleteDoc(doc(db, "learning_sessions", d.id));
              } catch (err) {
                handleFirestoreError(
                  err,
                  OperationType.DELETE,
                  `learning_sessions/${d.id}`,
                );
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
    setActiveTab("explain");
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
            photoURL: profilePhoto,
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
              updatedAt: new Date().toISOString(),
            };
            await setDoc(doc(db, "users", user.uid), userDocPayload, {
              merge: true,
            });
            onlineSaved = true;
          }
        } catch (onlineError) {
          console.warn(
            "Firestore unreachable during profile save, saving to offline backup buffer:",
            onlineError,
          );
        }

        // Local cache updates for network-resilient reload
        const cachePayload = {
          displayName: profileName,
          photoURL: profilePhoto,
          settings: userSettings,
        };
        localStorage.setItem(
          `tajaweed_offline_settings_${user.uid}`,
          JSON.stringify(cachePayload),
        );

        // re-sync local state
        setUser({
          ...realAuth.currentUser,
          displayName: profileName,
          photoURL: profilePhoto,
        });

        if (onlineSaved) {
          setProfileStatus(
            "✅ تم حفظ الإعدادات والملف الشخصي بنجاح في السحابة.",
          );
        } else {
          setProfileStatus(
            "⚠️ تم حفظ إعداداتك ومظهرك بنجاح في الذاكرة المحلية (النمط الاحتياطي) لتعذر الاتصال بالخادم مؤقتاً.",
          );
        }
      } else {
        // Offline/Sandbox persistence simulation (Requirement 11)
        if (!user.isAnonymous) {
          await mockAuth.updateProfile({
            displayName: profileName,
            photoURL: profilePhoto,
          });
        }

        const { mockDb } = await import("./lib/firebase");
        const userDocPayload = {
          userId: user.uid,
          displayName: profileName,
          photoURL: profilePhoto || "",
          email: user.email || "",
          settings: userSettings,
          updatedAt: new Date().toISOString(),
        };
        await mockDb.setDocument("users", user.uid, userDocPayload);

        const cachePayload = {
          displayName: profileName,
          photoURL: profilePhoto,
          settings: userSettings,
        };
        localStorage.setItem(
          `tajaweed_offline_settings_${user.uid}`,
          JSON.stringify(cachePayload),
        );

        if (user.isAnonymous) {
          const updatedGuest = {
            ...user,
            displayName: profileName,
            photoURL: profilePhoto,
          };
          localStorage.setItem(
            "tajaweed_guest_session",
            JSON.stringify(updatedGuest),
          );
          setUser(updatedGuest);
        }

        setProfileStatus(
          "✅ تم تحديث بيانات ملفك الشخصي وإعداداتك بنجاح مذهل محلياً.",
        );
      }
    } catch (err: any) {
      setProfileError(err.message || "فشل تحديث المعطيات.");
    }
  };

  // Pre-load loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="text-sm text-text-secondary font-black mt-3">
          تأمين الاتصال والمصادقة الشرعية الحصينة...
        </p>
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
    <div
      className="min-h-screen bg-bg-primary flex flex-col text-right relative overflow-x-hidden"
      dir="rtl"
    >
      {/* Decorative blurry background blobs for the crystal glass effect */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 pointer-events-none z-0" />
      <div className="fixed top-1/2 left-1/2 w-[800px] h-[800px] bg-brand-light/20 dark:bg-brand-primary/5 rounded-full blur-[150px] -translate-y-1/2 -translate-x-1/2 pointer-events-none z-0" />

      <AnimatePresence mode="wait">
        {showIntro ? (
          <IntroScreen key="intro" onStart={() => setShowIntro(false)} />
        ) : (
          <motion.div
            key="main-app"
            className="flex-1 flex flex-col relative w-full z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.95, rotateX: 15 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              transition={{ duration: 0.9, type: "spring", bounce: 0.3 }}
              className="flex-1 flex flex-col w-full min-h-screen"
              style={{ perspective: "1000px" }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Top bar header banner was moved to be sibling so it doesn't scroll */}

              {/* Main workspace frame container */}
              <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-24 md:pt-32 pb-28 md:pb-32 space-y-6">
                {/* Render Tab Views */}
                <div className="transition-all duration-300">
                  {activeTab === "explain" && (
                    <MatnExplainer
                      matnName={matnName}
                      onSelectMatn={(name) => setMatnName(name)}
                      onAddSession={handleAddSession}
                    />
                  )}

                  {activeTab === "recitate" && (
                    <RecitationMic
                      matnName={matnName}
                      onAddSession={handleAddSession}
                    />
                  )}

                  {activeTab === "quiz" && (
                    <SmartQuiz
                      matnName={matnName}
                      onAddSession={handleAddSession}
                    />
                  )}

                  {activeTab === "chat" && (
                    <SmartAssistant matnName={matnName} user={user} />
                  )}

                  {activeTab === "stats" && (
                    <PerformanceDashboard
                      stats={stats}
                    />
                  )}

                  {activeTab === "profile" && (
                    <div className="bg-bg-secondary rounded-3xl p-6 shadow-sm border border-brand-primary/10 space-y-6 text-right">
                      <div className="flex items-center gap-2 border-b border-border-primary pb-4">
                        <span className="p-2 bg-brand-light rounded-xl text-brand-primary">
                          <User className="w-5 h-5 animate-pulse" />
                        </span>
                        <div>
                          <h3 className="font-black text-sm md:text-base text-text-secondary">
                            ملفي الشخصي وبيانات العضوية
                          </h3>
                          <span className="text-[10px] text-text-muted block font-bold">
                            تحديث الاسم المستعار أو الصورة الرمزية الخاصة برحلتك
                            الدراسية
                          </span>
                        </div>
                      </div>

                      {profileStatus && (
                        <div className="p-3 bg-brand-light text-brand-primary rounded-2xl border border-emerald-100 text-xs font-semibold flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="leading-relaxed">
                            {profileStatus}
                          </span>
                        </div>
                      )}

                      {profileError && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs font-semibold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="leading-relaxed">
                            {profileError}
                          </span>
                        </div>
                      )}

                      <form
                        onSubmit={handleUpdateProfile}
                        className="space-y-6 max-w-lg"
                      >
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-text-muted block pb-1">
                            عنوان البريد الإلكتروني (الحساب المعتمد)
                          </label>
                          <input
                            type="text"
                            disabled
                            value={user.email || ""}
                            className="w-full px-4 py-2.5 text-xs bg-bg-tertiary border border-border-primary rounded-xl text-text-muted font-bold cursor-not-allowed text-right"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-text-muted block pb-1">
                            اللقب والاسم في قائمة الشرف
                          </label>
                          <input
                            type="text"
                            required
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="اكتب اسم حركي لرحلتك..."
                            className="w-full px-4 py-3 text-xs bg-slate-50 border border-border-primary rounded-xl outline-none focus:border-brand-primary text-right font-bold text-text-primary focus:bg-bg-secondary transition-all"
                          />
                        </div>

                        {/* Profile Photo Upload and Camera element (Requirement 10) */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-text-muted block">
                            الصورة الرمزية الحقيقية
                          </label>
                          <ProfilePhotoPicker
                            userId={user.uid}
                            currentPhoto={profilePhoto}
                            onPhotoUploaded={setProfilePhoto}
                            onStatusMessage={setProfileStatus}
                            onErrorMessage={setProfileError}
                          />
                        </div>

                        {/* Study Preferences & App Settings (Requirement 11) */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-border-primary space-y-4">
                          <h4 className="font-extrabold text-xs text-text-secondary pb-1 border-b border-border-primary flex items-center gap-1.5">
                            <Settings className="w-4 h-4 text-brand-primary" />
                            تخصيص الإعدادات والتصفح
                          </h4>

                          {/* Font size picker */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10.5px] font-bold text-text-muted">
                              مقياس خط عرض المتون والشروح:
                            </span>
                            <div className="flex gap-2">
                              {["small", "medium", "large"].map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() =>
                                    setUserSettings((prev) => ({
                                      ...prev,
                                      fontSize: size,
                                    }))
                                  }
                                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    userSettings.fontSize === size
                                      ? "bg-brand-primary text-white"
                                      : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border border-border-primary"
                                  }`}
                                >
                                  {size === "small"
                                    ? "صغير"
                                    : size === "medium"
                                      ? "متوسط"
                                      : "ضخم"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Autoplay voice correction toggle */}
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10.5px] font-bold text-text-muted">
                              التسميع الصوتي التلقائي بعد التعديل:
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={userSettings.autoPronounce}
                                onChange={(e) =>
                                  setUserSettings((prev) => ({
                                    ...prev,
                                    autoPronounce: e.target.checked,
                                  }))
                                }
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-bg-secondary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-secondary after:border-border-primary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                            </label>
                          </div>

                          {/* Push reminders notification daily */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10.5px] font-bold text-text-muted">
                              تنبيهات المذاكرة والتذكير اليومي:
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={userSettings.notificationsEnabled}
                                onChange={(e) =>
                                  setUserSettings((prev) => ({
                                    ...prev,
                                    notificationsEnabled: e.target.checked,
                                  }))
                                }
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-bg-secondary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bg-secondary after:border-border-primary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div>
                            </label>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            className="w-full py-3 bg-brand-primary hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            💾 حفظ بيانات الإعدادات والملف بالشكل النهائي
                          </button>
                        </div>
                      </form>
                      
                      {/* History table moved to profile/settings */}
                      <div className="bg-bg-secondary p-5 rounded-2xl border border-dashed border-border-primary space-y-4 text-right">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-primary pb-3 gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={handleClearHistory}
                              className="text-[10px] text-red-500 hover:underline font-black cursor-pointer"
                            >
                              مسح جميع الأرشيف
                            </button>
                          </div>

                          <h4 className="text-xs font-black text-brand-primary flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            أرشيف وحصاد الأنشطة الأخيرة للمتعلم:
                          </h4>
                        </div>

                        {history.length === 0 ? (
                          <p className="text-center text-xs text-text-muted py-6">
                            لم يتم تسوية أي أنشطة أو تسميع حتى الآن.
                          </p>
                        ) : (
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-xs font-bold text-text-secondary">
                              <thead>
                                <tr className="border-b border-border-primary text-text-muted text-[10px]">
                                  <th className="py-2 text-right">المتن النجمي</th>
                                  <th className="py-2 text-center">نوع العمل</th>
                                  <th className="py-2 text-center">التاريخ والوقت</th>
                                  <th className="py-2 text-left">مستوى الإتقان/النتيجة</th>
                                </tr>
                              </thead>
                              <tbody>
                                {history.map((h) => (
                                  <tr key={h.id} className="border-b border-border-primary/65">
                                    <td className="py-2.5 text-right">{h.matnName}</td>
                                    <td className="py-2.5 text-center">
                                      <span
                                        className="px-2 py-0.5 rounded text-[10px] bg-bg-tertiary text-text-secondary"
                                      >
                                        {h.type === "recitation"
                                          ? "تسميع صوتي"
                                          : h.type === "quiz"
                                            ? "مسابقة وأسئلة"
                                            : "شرح الأبيات"}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-center text-[10px] text-text-muted">
                                      {h.date}
                                    </td>
                                    <td className="py-2.5 text-left text-brand-primary font-black">
                                      {h.score}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </main>


            </motion.div>

            {/* Top bar header banner */}
            <motion.header
              initial={{ y: -150, x: "-50%" }}
              animate={{ y: 0, x: "-50%" }}
              transition={{
                duration: 0.7,
                type: "spring",
                bounce: 0.4,
                delay: 0.1,
              }}
              className="fixed top-4 md:top-6 left-1/2 z-[100] w-[95%] max-w-4xl flex justify-center"
            >
              <div className="glass-nav-bar flex items-center justify-between w-full" dir="rtl">
                <div className="flex items-center gap-2 text-right pl-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-light flex items-center justify-center border border-brand-primary/20 shadow-sm ml-1">
                    <img 
                      src="/logo.png" 
                      alt="Logo" 
                      className="w-full h-full object-cover" 
                      onError={(e) => { 
                        const target = e.currentTarget;
                        if (target.src.endsWith('.png')) {
                          target.src = '/logo.jpg';
                        } else if (target.src.endsWith('.jpg')) {
                          target.src = '/logo.jpeg';
                        } else {
                          target.src = 'https://placehold.co/100x100/0a5f3e/ffffff?text=Logo';
                        }
                      }} 
                    />
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-brand-primary tracking-tight font-amiri leading-none">
                      تجاويد
                    </h1>
                    <span className="text-[10px] text-text-muted font-bold block mt-0.5 truncate tracking-widest">
                      كرر حتى تتقن
                    </span>
                  </div>
                </div>

                {/* User profile dropdown and buttons */}
                <div className="flex items-center gap-1 sm:gap-2 pl-1">
                  <div
                    onClick={() => setActiveTab("profile")}
                    className="flex items-center gap-2 p-1.5 sm:px-3 rounded-[1.5rem] hover:bg-brand-primary/5 cursor-pointer transition-all"
                  >
                    {renderUserAvatar(
                      profilePhoto || user.photoURL,
                      profileName,
                      "w-8 h-8 rounded-full border border-border-primary",
                    )}
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-black text-text-primary block truncate max-w-[100px]">
                        {user.displayName || user.email?.split("@")[0]}
                      </span>
                      <span className="text-[9px] bg-brand-light text-brand-primary font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                        🌱 {stats.hifzLevel}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2.5 text-text-muted hover:text-brand-primary hover:bg-bg-tertiary rounded-full transition-all cursor-pointer"
                    title={
                      darkMode ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"
                    }
                  >
                    {darkMode ? (
                      <Sun className="w-4.5 h-4.5" />
                    ) : (
                      <Moon className="w-4.5 h-4.5" />
                    )}
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="p-2.5 text-red-500 hover:bg-red-50 hover:scale-105 rounded-full transition-all cursor-pointer"
                    title="تسجيل الخروج الآمن"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </motion.header>

            {/* Floating Bottom Navigation */}
            <motion.div
              initial={{ y: 150, x: "-50%" }}
              animate={{ y: 0, x: "-50%" }}
              transition={{
                duration: 0.7,
                type: "spring",
                bounce: 0.4,
                delay: 0.2,
              }}
              className="fixed bottom-4 md:bottom-6 left-1/2 z-[100] w-[95%] max-w-4xl flex justify-center lg:hidden"
            >
              <div className="glass-nav-bar" dir="rtl">
                {/* 1. Explain */}
                <div 
                  className={`nav-item ${activeTab === "explain" ? "active" : ""}`}
                  onClick={() => setActiveTab("explain")}
                >
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <BookOpen className={`absolute nav-icon transition-all duration-500 ${activeTab === "explain" ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"}`} />
                    <BookOpenText className={`absolute nav-icon transition-all duration-500 ${activeTab === "explain" ? "scale-100 opacity-100 rotate-0 -translate-y-1" : "scale-0 opacity-0 -rotate-90"}`} />
                  </div>
                  <span className="nav-text">شرح</span>
                </div>
                {/* 2. Quiz */}
                <div 
                  className={`nav-item ${activeTab === "quiz" ? "active" : ""}`}
                  onClick={() => setActiveTab("quiz")}
                >
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <HelpCircle className={`absolute nav-icon transition-all duration-500 ${activeTab === "quiz" ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"}`} />
                    <Lightbulb className={`absolute nav-icon transition-all duration-500 ${activeTab === "quiz" ? "scale-100 opacity-100 rotate-0 -translate-y-1" : "scale-0 opacity-0 -rotate-90"}`} />
                  </div>
                  <span className="nav-text">اختبار</span>
                </div>
                {/* 3. Recitate */}
                <div 
                  className={`nav-item ${activeTab === "recitate" ? "active" : ""}`}
                  onClick={() => setActiveTab("recitate")}
                >
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <Mic className={`absolute nav-icon transition-all duration-500 ${activeTab === "recitate" ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"}`} />
                    <AudioLines className={`absolute nav-icon transition-all duration-500 ${activeTab === "recitate" ? "scale-100 opacity-100 rotate-0 -translate-y-1" : "scale-0 opacity-0 -rotate-90"}`} />
                  </div>
                  <span className="nav-text">تسميع</span>
                </div>
                {/* 4. Chat */}
                <div 
                  className={`nav-item ${activeTab === "chat" ? "active" : ""}`}
                  onClick={() => setActiveTab("chat")}
                >
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <MessageSquare className={`absolute nav-icon transition-all duration-500 ${activeTab === "chat" ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"}`} />
                    <BotMessageSquare className={`absolute nav-icon transition-all duration-500 ${activeTab === "chat" ? "scale-100 opacity-100 rotate-0 -translate-y-1" : "scale-0 opacity-0 -rotate-90"}`} />
                  </div>
                  <span className="nav-text">مساعد</span>
                </div>
                {/* 5. Stats */}
                <div 
                  className={`nav-item ${activeTab === "stats" ? "active" : ""}`}
                  onClick={() => setActiveTab("stats")}
                >
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <Activity className={`absolute nav-icon transition-all duration-500 ${activeTab === "stats" ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"}`} />
                    <TrendingUp className={`absolute nav-icon transition-all duration-500 ${activeTab === "stats" ? "scale-100 opacity-100 rotate-0 -translate-y-1" : "scale-0 opacity-0 -rotate-90"}`} />
                  </div>
                  <span className="nav-text">أداء</span>
                </div>

                <div 
                  className="glass-indicator"
                  style={{
                    transform: `translateX(${
                      activeTab === "explain" ? "0%" :
                      activeTab === "quiz" ? "-100%" :
                      activeTab === "recitate" ? "-200%" :
                      activeTab === "chat" ? "-300%" :
                      "-400%"
                    })`
                  }}
                >
                  <div className="indicator-glow"></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
