import React, { useState } from "react";
import { auth, mockAuth, isFirebaseReady } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signInAnonymously,
} from "firebase/auth";
import {
  Award,
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
  Sparkles,
  LogIn,
} from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">(
    "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (isFirebaseReady && auth) {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        onAuthSuccess(result.user);
      } else {
        // Fallback sandbox google login
        const result = await mockAuth.signInWithPopup();
        onAuthSuccess(result.user);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || "حدث خطأ أثناء تسجيل الدخول بالرقم الموحد من جوجل.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isFirebaseReady && auth) {
        const result = await signInAnonymously(auth);
        onAuthSuccess(result.user);
      } else {
        const guestUser = {
          uid: "guest_user_" + Math.random().toString(36).substring(2, 8),
          displayName: "زائر ضيف",
          email: "guest@tajweed.app",
          photoURL: "",
          isAnonymous: true,
        };
        onAuthSuccess(guestUser);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        "فشل الدخول كضيف: يرجى تفعيل تسجيل الدخول المجهول (Anonymous Auth) في لوحة تحكم Firebase.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (activeTab === "login") {
        if (isFirebaseReady && auth) {
          const result = await signInWithEmailAndPassword(
            auth,
            email,
            password,
          );
          onAuthSuccess(result.user);
        } else {
          const result = await mockAuth.signInWithEmailAndPassword(
            email,
            password,
          );
          onAuthSuccess(result.user);
        }
      } else if (activeTab === "register") {
        if (!name.trim()) {
          throw new Error("يرجى إدخال الاسم كاملاً");
        }
        if (isFirebaseReady && auth) {
          const result = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
          );
          await updateProfile(result.user, { displayName: name });
          onAuthSuccess(result.user);
        } else {
          const result = await mockAuth.createUserWithEmailAndPassword(
            email,
            password,
          );
          await mockAuth.updateProfile({ displayName: name });
          onAuthSuccess({ ...result.user, displayName: name });
        }
      } else if (activeTab === "forgot") {
        if (isFirebaseReady && auth) {
          await sendPasswordResetEmail(auth, email);
        } else {
          await mockAuth.sendPasswordResetEmail(email);
        }
        setInfo(
          "✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح.",
        );
        setTimeout(() => setActiveTab("login"), 4000);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message;
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        errMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "هذا البريد الإلكتروني مسجل بالفعل لدينا.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "يجب أن تكون كلمة المرور 6 أحرف على الأقل.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "صيغة البريد الإلكتروني المدخل غير صالحة.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-bg-primary flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-bg-secondary rounded-3xl shadow-xl border border-brand-primary/10 overflow-hidden relative p-8 space-y-6">
        {/* Top brand circle background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-light/30 rounded-full blur-2xl -z-10" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-50 rounded-full blur-3xl -z-10" />

        {/* Brand logo & tagline */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-brand-light rounded-3xl mx-auto flex items-center justify-center shadow-lg relative border border-brand-primary/20 overflow-hidden">
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
                  target.src = 'https://placehold.co/100x100/0a5f3e/ffffff?text=Logo';
                }
              }} 
            />
          </div>
          <div>
            <h1 className="text-3xl font-black text-brand-primary font-amiri tracking-wide mt-2">
              تجاويد
            </h1>
            <p className="text-xs bg-amber-100 text-gold-accent font-extrabold px-3 py-1 rounded-full inline-block mt-1">
              ✨ كرر حتى تتقن
            </p>
          </div>
          <p className="text-xs text-text-muted font-bold max-w-sm mx-auto pt-1 leading-relaxed">
            المنصة الذكية الرائدة لتسميع المتون وضبط قواعد التجويد باستخدام الذكاء الاصطناعي التفاعلي.
          </p>
        </div>

        {/* Sandbox Indicator if not cloud-configured */}
        {!isFirebaseReady && (
          <div className="bg-amber-50 text-[10px] text-amber-700 font-bold p-2.5 rounded-xl border border-amber-205 text-center leading-relaxed">
            📢 جاري العمل بوضع الرمل المحلي الآمن (Sandbox Mode). يمكنك استخدام
            كافة الصلاحيات على الفور.
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="text-right leading-relaxed">{error}</span>
          </div>
        )}

        {info && (
          <div className="p-3 bg-brand-light text-brand-primary rounded-2xl border border-emerald-100 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="text-right leading-relaxed">{info}</span>
          </div>
        )}

        {/* Authentication forms */}
        {activeTab !== "forgot" && (
          <div className="flex border-b border-border-primary pb-1">
            <button
              onClick={() => {
                setActiveTab("login");
                setError(null);
              }}
              className={`flex-1 text-center pb-2.5 text-xs font-black transition-all ${
                activeTab === "login"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setError(null);
              }}
              className={`flex-1 text-center pb-2.5 text-xs font-black transition-all ${
                activeTab === "register"
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              حساب جديد
            </button>
          </div>
        )}

        <form onSubmit={handleEmailAction} className="space-y-4">
          {activeTab === "forgot" && (
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-text-primary text-right">
                  نسيت كلمة المرور؟
                </h3>
                <p className="text-[11px] text-text-muted leading-relaxed text-right pb-2">
                  أدخل بريدك الإلكتروني وسيقوم النظام بإرسال رابط تعيين كلمة
                  المرور المخصص لك آلياً ومباشرة.
                </p>
              </div>
            )}

            {activeTab === "register" && (
              <div className="space-y-1.5 text-right">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                  الأسم الكامل
                </label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-2.5 w-4.5 h-4.5 text-text-muted" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="محمد بن أحمد..."
                    className="w-full pr-10 pl-3 py-2 text-xs bg-bg-tertiary border border-border-primary rounded-xl outline-none focus:border-brand-primary text-right font-medium"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-right">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-2.5 w-4.5 h-4.5 text-text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full pr-10 pl-3 py-2 text-xs bg-bg-tertiary border border-border-primary rounded-xl outline-none focus:border-brand-primary text-right font-medium"
                />
              </div>
            </div>

            {activeTab !== "forgot" && (
              <div className="space-y-1.5 text-right">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-2.5 w-4.5 h-4.5 text-text-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-2 text-xs bg-bg-tertiary border border-border-primary rounded-xl outline-none focus:border-brand-primary text-right font-medium"
                  />
                </div>
                {activeTab === "login" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("forgot")}
                    className="text-[10px] text-brand-primary font-bold hover:underline float-left mt-0.5"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-primary text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-emerald-900 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading
                ? "جاري المعالجة..."
                : activeTab === "login"
                  ? "سجل الدخول"
                  : activeTab === "register"
                    ? "إنشاء حساب جدید"
                    : "إرسال رابط الاستعادة"}
            </button>
          </form>

        {/* Separator */}
        {activeTab !== "forgot" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-text-secondary text-[10px] font-bold">
              <span className="flex-1 h-px bg-bg-tertiary" />
              <span className="px-3 uppercase">أو من خلال</span>
              <span className="flex-1 h-px bg-bg-tertiary" />
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2 bg-bg-secondary border border-border-primary hover:bg-bg-tertiary justify-center flex items-center gap-2 rounded-xl text-xs font-bold text-text-secondary hover:scale-101 transition-all"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>تسجيل الدخول بواسطة Google</span>
            </button>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-2.5 bg-brand-light/30 hover:bg-brand-light/50 text-brand-primary justify-center flex items-center gap-2 rounded-xl text-xs font-black transition-all border border-brand-primary/10 hover:scale-101"
            >
              <UserIcon className="w-4 h-4" />
              <span>الدخول كضيف (حساب زائر محلي)</span>
            </button>
          </div>
        )}

        {activeTab === "forgot" && (
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setError(null);
            }}
            className="text-xs text-text-muted font-bold hover:text-text-secondary block text-center w-full"
          >
            ← العودة لصفحة تسجيل الدخول
          </button>
        )}
      </div>
    </div>
  );
}
