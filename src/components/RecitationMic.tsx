import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Volume2,
  Sparkles,
  AlertTriangle,
  Loader2,
  Clock,
  Eye,
  EyeOff,
  Trophy,
  Award,
} from "lucide-react";
import { RecitationCorrection, RecitationError } from "../types";
import { EXCLUSIVE_MATNS } from "../data/matnsData";

interface RecitationMicProps {
  matnName: string;
  onAddSession: (score: number, type: "recitation" | "quiz" | "chat") => void;
}

const normalizeArabic = (text: string) => {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove diacritics
    .replace(/[أإآا]/g, "ا")
    .replace(/[ةه]/g, "ه")
    .replace(/[ىي]/g, "ي")
    .replace(/[\s\.\,\-\?\!\؛\s]+/g, " ") // remove punctuation and normalize spaces
    .trim();
};

export default function RecitationMic({
  matnName,
  onAddSession,
}: RecitationMicProps) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [status, setStatus] = useState<
    "مستعد للبدء" | "جاري الاستماع🎤" | "متوقف" | "فشل التعرف"
  >("مستعد للبدء");
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [flashRed, setFlashRed] = useState<boolean>(false);

  // Realtime word highlighting & tracking states
  const [matchedWordIndices, setMatchedWordIndices] = useState<Set<number>>(
    new Set(),
  );
  const [hasRealtimeError, setHasRealtimeError] = useState<boolean>(false);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hidden verses configuration (Requirement 6)
  const [versesHidden, setVersesHidden] = useState<boolean>(true);

  // Correction report state
  const [report, setReport] = useState<RecitationCorrection | null>(null);

  const recognitionRef = useRef<any>(null);

  const selectedData =
    EXCLUSIVE_MATNS[matnName] || EXCLUSIVE_MATNS["تحفة الأطفال"];
  const verses = selectedData?.verses || [];

  // Recalculate word indexes offsets for displaying aligned matches
  let cumulativeWordCount = 0;
  const verseWordStarts = verses.map((v) => {
    const s1Len = v.s1.split(/\s+/).filter(Boolean).length;
    const s2Len = v.s2.split(/\s+/).filter(Boolean).length;
    const s1Start = cumulativeWordCount;
    cumulativeWordCount += s1Len;
    const s2Start = cumulativeWordCount;
    cumulativeWordCount += s2Len;
    return {
      id: v.id,
      s1Start,
      s2Start,
    };
  });

  // Track real-time spoken transcript match
  useEffect(() => {
    const spoken = (transcript + " " + interimTranscript).trim();
    if (!spoken) {
      setMatchedWordIndices(new Set());
      setHasRealtimeError(false);
      return;
    }

    const expected: string[] = [];
    verses.forEach((v) => {
      v.s1
        .split(/\s+/)
        .filter(Boolean)
        .forEach((w) => expected.push(normalizeArabic(w)));
      v.s2
        .split(/\s+/)
        .filter(Boolean)
        .forEach((w) => expected.push(normalizeArabic(w)));
    });

    const spokeWords = normalizeArabic(spoken).split(/\s+/).filter(Boolean);
    const newMatched = new Set<number>();
    let expIdx = 0;
    let seqError = false;

    for (let sIdx = 0; sIdx < spokeWords.length; sIdx++) {
      const sWord = spokeWords[sIdx];
      let found = false;
      // Search window of 12 anticipated words to tolerate small variations/skips
      for (let w = expIdx; w < Math.min(expIdx + 12, expected.length); w++) {
        if (expected[w] === sWord) {
          newMatched.add(w);
          expIdx = w + 1;
          found = true;
          break;
        }
      }
      if (!found) {
        seqError = true;
      }
    }

    setMatchedWordIndices(newMatched);

    // If mistake sequentially, trigger rapid red flash feedback and vibration once
    if (seqError && !hasRealtimeError) {
      setHasRealtimeError(true);
      setFlashRed(true);
      setTimeout(() => setFlashRed(false), 500);
      if ("vibrate" in navigator) {
        navigator.vibrate(100);
      }
    } else if (!seqError) {
      setHasRealtimeError(false);
    }
  }, [transcript, interimTranscript, matnName]);

  // Start & Stop tracking timer
  useEffect(() => {
    if (isListening) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Format seconds to string: MM:SS
  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop stream immediately to release hardware until recognition is started
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setRecognitionError(
        "🚫 عذرًا، تم رفض إذن الميكروفون. يرجى تفعيل الصلاحية للميكروفون للبدء بالتسميع.",
      );
      setStatus("فشل التعرف");
      return false;
    }
  };

  const startSpeechRecognition = async () => {
    setRecognitionError(null);
    setStatus("مستعد للبدء");
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionError(
        "منصتك أو متصفحك الحالي لا يدعم التعرّف على الصوت (HTML5 Speech Recognition). يرجى التحديث لمتصفح Chrome.",
      );
      setStatus("فشل التعرف");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "ar-SA";

      rec.onstart = () => {
        setIsListening(true);
        setStatus("جاري الاستماع🎤");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setTranscript((prev) => (prev ? `${prev} ${final}` : final));
        }
        setInterimTranscript(interim);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setRecognitionError("🚫 الميكروفون محجوب أو غير مصرح به.");
          setStatus("فشل التعرف");
        } else if (event.error === "network") {
          setRecognitionError(
            "📡 عذراً، تداخلت الشبكة أو تذبذب الاتصال بالخادم اللغوي.",
          );
          setStatus("فشل التعرف");
        } else if (event.error === "aborted") {
          setRecognitionError("⚠️ تم إيقاف التعرف الصوتي مؤقتاً.");
          setStatus("متوقف");
        } else {
          setRecognitionError(
            `⚠️ عذراً، تعذر إتمام التعرف الصوتي: ${event.error}`,
          );
          setStatus("فشل التعرف");
        }
      };

      rec.onend = () => {
        setIsListening(false);
        // Do not auto-restart unless explicitly listening continues
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      console.error("Failed to boot speech engine:", e);
      setRecognitionError(e.message || "فشل تشغيل مصفوفة الصوت.");
    }
  };

  const stopAndSubmitRecitation = async () => {
    setIsListening(false);
    setStatus("متوقف");
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const SpeechToAnalyze = (transcript + " " + interimTranscript).trim();
    if (!SpeechToAnalyze) {
      setRecognitionError(
        "⚠️ يرجى التحدث أو قراءة بعض الأبيات أولاً ليتسنى للنظام تقييم التسميع.",
      );
      return;
    }

    setLoading(true);
    setReport(null);
    try {
      const response = await fetch("/api/correct-recitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userSpeech: SpeechToAnalyze,
          expectedMatn: matnName,
        }),
      });

      if (!response.ok) {
        throw new Error("فشل معالجة التسميع الصوتي في الخادم الذكي.");
      }

      const data: RecitationCorrection = await response.json();
      setReport(data);

      if (data.errors && data.errors.length > 0) {
        setFlashRed(true);
        setTimeout(() => setFlashRed(false), 800);
        if ("vibrate" in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      }

      onAddSession(data.score, "recitation");
    } catch (e: any) {
      console.error(e);
      setRecognitionError(
        e.message || "فشل الاتصال بالخادم الصوتي لتصحيح النظم.",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInteractiveVerseHalf = (
    text: string,
    startWordIndex: number,
    isHidden: boolean,
  ) => {
    const words = text.split(/\s+/).filter(Boolean);
    return (
      <span className="inline-flex flex-wrap gap-x-1 justify-center leading-relaxed">
        {words.map((w, idx) => {
          const globalWordIdx = startWordIndex + idx;
          const isMatched = matchedWordIndices.has(globalWordIdx);

          let wordClass = "transition-all duration-300 ";
          if (isMatched) {
            wordClass +=
              "text-emerald-750 font-black scale-102 bg-emerald-100/50 px-1 rounded-sm";
          } else if (isHidden) {
            wordClass += "blur-[3.5px] opacity-40 select-none";
          } else {
            wordClass += "text-text-secondary";
          }

          return (
            <span key={idx} className={wordClass} title={w}>
              {w}
            </span>
          );
        })}
      </span>
    );
  };

  const clearSession = () => {
    setTranscript("");
    setInterimTranscript("");
    setReport(null);
    setRecognitionError(null);
    setStatus("مستعد للبدء");
  };

  return (
    <div
      className={`bg-bg-secondary rounded-3xl p-6 shadow-sm border space-y-6 transition-all duration-500 relative ${
        flashRed
          ? "border-red-500 shadow-lg animate-pulse"
          : "border-brand-primary/10"
      }`}
      id="speech-and-mic-panel"
    >
      {/* Listening header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary pb-4 text-right">
        <div className="flex items-center gap-2">
          <span
            className={`p-2 rounded-xl flex items-center justify-center ${
              isListening
                ? "bg-red-500/10 text-red-500 animate-pulse"
                : "bg-bg-tertiary text-text-muted"
            }`}
          >
            <Mic className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-black text-sm md:text-base text-text-primary">
              المسند والمصحح الصوتي الذكي
            </h3>
            <span className="text-[10px] text-text-muted block font-bold">
              سمّع بصوتك، وسيقوم الذكاء الاصطناعي بمقارنة قراءتك والتقاط مواضع
              اللحن
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end">
          <button
            onClick={() => setVersesHidden(!versesHidden)}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-light text-brand-primary text-[10px] font-black rounded-lg border border-brand-primary/10 cursor-pointer"
            title="إخفاء أو كشف الأبيات المراد تسميعها للتقويم"
          >
            {versesHidden ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>
              {versesHidden
                ? "عرض الأبيات المعيارية"
                : "إخفاء الأبيات المعيارية"}
            </span>
          </button>
        </div>
      </div>

      {/* Standard reference verses that are hidden originally */}
      <div className="bg-bg-tertiary p-5 rounded-2xl border border-gold-accent/15 space-y-3 text-right">
        <h4 className="text-[11px] font-black text-gold-accent flex items-center gap-1">
          <Award className="w-4 h-4" />
          الأبيات المطلوبة للضبط والتسميع في متن "{matnName}":
        </h4>

        <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
          {verses.map((v, index) => {
            const starts = verseWordStarts.find((s) => s.id === v.id) || {
              s1Start: 0,
              s2Start: 0,
            };
            return (
              <div
                key={v.id}
                className="text-xs leading-relaxed font-semibold flex items-center justify-between text-text-secondary bg-bg-secondary p-2.5 rounded-xl border border-border-primary select-none"
              >
                <span className="text-[9px] font-black bg-brand-light text-brand-primary px-1.5 py-0.5 rounded-full">
                  {index + 1}
                </span>
                <div className="flex-1 text-center font-amiri text-sm flex justify-around gap-4 md:gap-8 px-2 items-center">
                  <div className="flex-1 text-center">
                    {renderInteractiveVerseHalf(
                      v.s1,
                      starts.s1Start,
                      versesHidden,
                    )}
                  </div>
                  <span className="text-text-secondary font-sans font-light">|</span>
                  <div className="flex-1 text-center">
                    {renderInteractiveVerseHalf(
                      v.s2,
                      starts.s2Start,
                      versesHidden,
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          <p className="text-xs text-text-muted font-bold">
            جاري تصحيح التسميع، ومقارنة الكلمات وضبط حركات التجويد بدقة بالغة...
          </p>
        </div>
      )}

      {/* Listening actions */}
      {!loading && !report && (
        <div className="text-center py-6 space-y-6">
          {/* Circular Microphone control buttons */}
          <div className="flex justify-center items-center gap-4">
            {!isListening ? (
              <button
                onClick={startSpeechRecognition}
                className="w-16 h-16 bg-brand-primary hover:bg-emerald-800 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer relative"
              >
                <Mic className="w-7 h-7" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 text-emerald-950 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-bg-secondary">
                  🏁
                </span>
              </button>
            ) : (
              <button
                onClick={stopAndSubmitRecitation}
                className="w-16 h-16 bg-red-650 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer relative animate-pulse"
              >
                <MicOff className="w-7 h-7" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 text-emerald-950 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-bg-secondary">
                  ⏹
                </span>
              </button>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-xs font-black text-text-primary flex justify-center items-center gap-1">
              <span>حالة اللاقط:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  isListening
                    ? "bg-red-100 text-red-700 font-extrabold animate-bounce"
                    : "bg-bg-tertiary text-text-secondary font-bold"
                }`}
              >
                {status}
              </span>
            </div>
            {isListening && (
              <div className="text-brand-primary text-xs font-black flex items-center justify-center gap-1 pt-1">
                <Clock className="w-4 h-4 animate-spin text-amber-500" />
                <span>
                  الوقت المستغرق:{" "}
                  <strong className="font-mono">
                    {formatTime(elapsedSeconds)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Transcript live feed */}
          {(transcript || interimTranscript) && (
            <div className="bg-bg-tertiary p-5 rounded-2xl border border-border-primary relative text-right space-y-2">
              <span className="text-[9px] font-black bg-brand-light text-brand-primary uppercase tracking-wider px-2 py-0.5 rounded">
                الكلمات الملتقطة لحظياً:
              </span>
              <p className="font-normal font-serif text-sm text-text-primary leading-relaxed pt-1.5 min-h-[40px]">
                {transcript}
                {interimTranscript && (
                  <span className="text-text-muted grayscale italic pr-1">
                    {interimTranscript}
                  </span>
                )}
              </p>
            </div>
          )}

          {recognitionError && (
            <p className="text-red-500 text-xs font-bold leading-relaxed">
              {recognitionError}
            </p>
          )}
        </div>
      )}

      {/* Graduation final recitation correction report */}
      {report && !loading && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 bg-gradient-to-br from-[#0a5f3e] to-[#043320] text-white rounded-3xl space-y-4 shadow-sm border border-brand-primary/10 relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,_var(--tw-gradient-stops)) from-emerald-800 to-transparent opacity-40" />
            <div className="relative z-10 space-y-1.5">
              <Trophy className="w-12 h-12 text-amber-300 mx-auto animate-bounce" />
              <span className="text-[10px] bg-amber-400 text-emerald-950 font-black px-2.5 py-1 rounded-full inline-block">
                حفل رصد التلاوة
              </span>
              <h3 className="font-black text-lg md:text-xl font-amiri">
                تقرير تسميع متن {report.detectedMatn}
              </h3>

              <div className="text-3xl md:text-4xl font-extrabold text-amber-300 pt-1">
                {report.score}/100
              </div>

              {/* Duration metrics shown */}
              <div className="flex justify-center items-center gap-3 pt-1 text-[10px] text-emerald-100 font-bold">
                <span>⏱️ مدة التلاوة: {formatTime(elapsedSeconds)}</span>
                <span>•</span>
                <span>
                  ❌ عدد الأخطاء اللفظية: {report.errors?.length || 0}
                </span>
              </div>

              <p className="text-emerald-100 text-xs font-semibold leading-relaxed pt-2 leading-5 max-w-sm mx-auto">
                {report.feedback}
              </p>
            </div>
          </div>

          {/* Correct vs Speak matching details */}
          <div className="space-y-3 text-right">
            <h4 className="text-xs font-black text-brand-primary flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              مقارنة الكلمات ومكان الأخطاء بالتفصيل:
            </h4>

            <div className="bg-bg-tertiary p-4 rounded-2xl border border-border-primary space-y-2 text-xs font-semibold">
              <div className="border-b border-border-primary/50 pb-2 text-text-muted text-[10px]">
                نص الأبيات المسمتعة من الطالب:
              </div>
              <p className="font-serif text-sm text-text-secondary italic leading-relaxed">
                "{transcript}"
              </p>
            </div>

            <div
              className={`p-4 rounded-2xl border ${report.isCorrect ? "bg-brand-light0/10 border-emerald-500/20 text-emerald-950" : "bg-red-500/10 border-red-500/20 text-red-950"}`}
            >
              <div className="text-[10px] text-text-muted pb-2 border-b border-border-primary/30">
                الأبيات الصحيحة المقابلة:
              </div>
              <p className="font-amiri text-brand-primary text-base font-extrabold leading-relaxed pt-1.5 text-center">
                "{report.correctText}"
              </p>
            </div>
          </div>

          {/* Logged Errors detailed stream list */}
          {report.errors && report.errors.length > 0 && (
            <div className="space-y-3 text-right">
              <h5 className="text-xs font-black text-red-650 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                الأخطاء التي تم تسجيلها لتجنب اللحن:
              </h5>

              <div className="grid grid-cols-1 gap-2.5">
                {report.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-500/5 hover:bg-red-500/10 rounded-2xl border border-red-500/10 flex flex-col md:flex-row md:items-center justify-between text-xs gap-2 leading-relaxed"
                  >
                    <span className="bg-red-200/60 text-red-700 px-2.5 py-1 rounded text-[10px] font-bold self-start md:self-center">
                      {err.type === "omission"
                        ? "سقوط وحذف كلمة"
                        : err.type === "addition"
                          ? "إضافة كلمة زائدة"
                          : err.type === "substitution"
                            ? "تبديل وتحريف"
                            : "ضبط وتشكيل"}
                    </span>
                    <div className="text-right flex-1">
                      <span className="text-text-primary font-bold block">
                        الكلمة المقروءة:{" "}
                        <strong className="text-red-600">
                          "{err.wordInUserText || "لا يوجد"}"
                        </strong>
                        ← الكلمة الصحيحة:{" "}
                        <strong className="text-brand-primary">
                          "{err.wordInCorrectText}"
                        </strong>
                      </span>
                      <span className="text-[10px] text-text-muted font-medium block mt-1">
                        {err.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset try actions */}
          <div className="flex justify-center">
            <button
              onClick={clearSession}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-primary text-white text-xs font-black rounded-xl shadow-md hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              ابدأ دورة تسميع جديدة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
