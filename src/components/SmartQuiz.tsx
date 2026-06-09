import { useState } from 'react';
import { 
  HelpCircle, 
  RefreshCw, 
  Trophy, 
  AlertTriangle, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  BookOpen, 
  CheckSquare, 
  Square 
} from 'lucide-react';
import { QuizQuestion, QuizReport } from '../types';
import { EXCLUSIVE_MATNS } from '../data/matnsData';

interface SmartQuizProps {
  matnName: string;
  onAddSession: (score: number, type: 'recitation' | 'quiz' | 'chat') => void;
}

export default function SmartQuiz({ matnName, onAddSession }: SmartQuizProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [grading, setGrading] = useState<boolean>(false);
  
  // Selection of doors (multiple)
  const [selectedChapters, setSelectedChapters] = useState<string[]>(["عام"]);
  
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [report, setReport] = useState<QuizReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedData = EXCLUSIVE_MATNS[matnName] || EXCLUSIVE_MATNS["تحفة الأطفال"];
  const chaptersList = selectedData?.chapters || [];

  const handleChapterToggle = (chap: string) => {
    if (chap === "عام") {
      setSelectedChapters(["عام"]);
      return;
    }
    
    setSelectedChapters(prev => {
      const filtered = prev.filter(c => c !== "عام");
      if (filtered.includes(chap)) {
        const after = filtered.filter(c => c !== chap);
        return after.length === 0 ? ["عام"] : after;
      } else {
        return [...filtered, chap];
      }
    });
  };

  const startNewQuiz = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    setCurrentIdx(0);
    setAnswers({});
    setQuestions([]);
    try {
      const chaptersQuery = selectedChapters.join(", ");
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matnName, chapter: chaptersQuery })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل توليد أسئلة الاختبار من الخادم الذكي.');
      }
      const data: QuizQuestion[] = await response.json();
      if (!data || data.length === 0) {
        throw new Error("لم نتمكن من صياغة أسئلة في الوقت الراهن، يرجى المحاولة لاحقاً.");
      }
      setQuestions(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'خطأ في جلب الاختبار.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (rawAns: string) => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentIdx].id]: rawAns
    }));
  };

  const submitQuiz = async () => {
    setGrading(true);
    setError(null);
    try {
      const answeredQuestions = questions.map(q => ({
        ...q,
        userAnswer: answers[q.id] || ''
      }));

      const response = await fetch('/api/grade-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matnName, questions: answeredQuestions })
      });
      if (!response.ok) {
        throw new Error('حدث خطأ أثناء رصد وتصحيح نتائج الاختبار.');
      }
      const reportData: QuizReport = await response.json();
      setReport(reportData);
      onAddSession(reportData.score, 'quiz');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "فشل تصحيح المسابقة.");
    } finally {
      setGrading(false);
    }
  };

  const activeQuestion = questions[currentIdx];
  const totalQuestions = questions.length;
  const isFinishedAll = totalQuestions > 0 && Object.keys(answers).length === totalQuestions;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-primary/10 space-y-6">
      
      {/* Quiz setup header */}
      <div className="flex flex-col gap-4 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-2 text-right">
          <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
            <HelpCircle className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-black text-sm md:text-base text-zinc-800">
              برامج قياس الحفظ والمسابقات الذكية
            </h3>
            <span className="text-[10px] text-zinc-400 block font-bold">المعلم الذكي يطرح أسئلة مخصصة في الأبواب المختارة ويصحح إجاباتك</span>
          </div>
        </div>

        {questions.length === 0 && !loading && (
          <div className="bg-zinc-55 pb-2.5 p-4 rounded-2xl border border-zinc-100 space-y-2 text-right">
            <label className="text-[10px] font-black text-emerald-primary block">🎯 حدد الباب أو الأبواب المتعددة المراد اختبارها:</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedChapters(["عام"])}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all ${
                  selectedChapters.includes("عام")
                    ? "bg-emerald-primary text-white"
                    : "bg-emerald-light/40 text-emerald-primary hover:bg-emerald-primary hover:text-white"
                }`}
              >
                شامل المتن بالكامل (افتراضي)
              </button>
              {chaptersList.map( chap => (
                <button
                  key={chap}
                  type="button"
                  onClick={() => handleChapterToggle(chap)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all ${
                    selectedChapters.includes(chap)
                      ? "bg-emerald-primary text-white"
                      : "bg-[#f5fbf6] text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {selectedChapters.includes(chap) ? <CheckSquare className="w-3 h-3 text-amber-400" /> : <Square className="w-3 h-3" />}
                  <span>{chap}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-primary animate-spin" />
          <p className="text-xs text-zinc-500 font-bold">يقوم معلم تجاويد بمطالعة الأبيات وتركيب 5 أسئلة مخصصة في الأبواب المختارة لـ {matnName}...</p>
        </div>
      )}

      {grading && (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-zinc-500 font-bold">يقوم ذكاء تجاويد اللغوي بتقييم إجاباتك ورصد درجة المطابقة...</p>
        </div>
      )}

      {/* Intro state before test begins */}
      {questions.length === 0 && !loading && !grading && !report && (
        <div className="text-center py-8 space-y-4">
          <Trophy className="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
          <div className="space-y-1">
            <h4 className="font-black text-sm text-zinc-805">
              جاهز لاختبار حفظ النظم في متن "{matnName}"؟
            </h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              سيقوم مرشد تجاويد الذكي بتركيب 5 أسئلة استبيانية لقياس دقة حفظك ومعاني الكلمات والوقف والابتداء في المنظومة.
            </p>
          </div>
          <button
            onClick={startNewQuiz}
            className="px-6 py-3 bg-emerald-primary text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-emerald-990 hover:scale-103 transition-all cursor-pointer"
          >
            🏁 ابدأ الاختبار الحصري الآن
          </button>
          {error && <p className="text-red-500 text-xs font-bold leading-relaxed">{error}</p>}
        </div>
      )}

      {/* Quizzing loop active */}
      {questions.length > 0 && !loading && !grading && !report && (
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="flex items-center justify-between text-[11px] font-black text-zinc-500">
            <span>السؤال {currentIdx + 1} من أصل {totalQuestions}</span>
            <span className="text-emerald-primary">التقدم: {Math.round(((currentIdx + 1) / totalQuestions) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-primary transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Question Box */}
          <div className="bg-[#f9fdfa] p-5 rounded-2xl border border-zinc-100 text-right space-y-4">
            <span className="text-[10px] font-black uppercase bg-amber-500/10 text-amber-700 px-2.5 py-1 rounded-full border border-amber-500/10">
              {activeQuestion.type === 'multiple-choice' ? 'اختيار من متعدد' :
               activeQuestion.type === 'true-false' ? 'صواب أم خطأ' :
               activeQuestion.type === 'fill-in-blank' ? 'إكمال أبيات / فراغات' : 'شرح وإعراب مبرهن'}
            </span>
            <p className="font-extrabold text-sm md:text-base text-zinc-850 leading-relaxed pt-1.5">
              ❓ {activeQuestion.questionText}
            </p>

            {/* Answer inputs according to types */}
            {activeQuestion.type === 'multiple-choice' && activeQuestion.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                {activeQuestion.options.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAnswerSelect(option)}
                    className={`p-3.5 rounded-2xl text-xs font-bold leading-relaxed text-right border transition-all duration-200 cursor-pointer ${
                      answers[activeQuestion.id] === option
                        ? 'bg-emerald-primary text-white border-emerald-primary shadow-xs'
                        : 'bg-white hover:bg-[#fafdfb] text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {activeQuestion.type === 'true-false' && (
              <div className="grid grid-cols-2 gap-4 pt-3">
                {['صحيح', 'خاطئ'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAnswerSelect(option)}
                    className={`p-3.5 rounded-2xl text-xs font-extrabold text-center border transition-all duration-150 cursor-pointer ${
                      answers[activeQuestion.id] === option
                        ? 'bg-emerald-primary text-white border-emerald-primary shadow-xs'
                        : 'bg-white hover:bg-zinc-50 text-zinc-705 border-zinc-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {(activeQuestion.type === 'fill-in-blank' || activeQuestion.type === 'explanation') && (
              <div className="pt-3">
                <textarea
                  value={answers[activeQuestion.id] || ''}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  placeholder="✍️ اكتب جوابك هنا بالفصحى ومحاولة الضبط..."
                  rows={activeQuestion.type === 'explanation' ? 4 : 2}
                  className="w-full p-4 text-xs bg-white border border-zinc-200 rounded-2xl outline-none focus:border-emerald-primary text-right font-medium text-zinc-800 placeholder-zinc-400"
                />
              </div>
            )}
          </div>

          {/* Navigation actions */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 font-black text-xs text-zinc-500 border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-40 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />السابق
            </button>

            {currentIdx < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="flex items-center gap-1.5 px-4 py-2 font-black text-xs bg-emerald-primary text-white rounded-xl hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                التالي<ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={!isFinishedAll}
                className={`flex items-center gap-1.5 px-6 py-2 rounded-xl font-extrabold text-xs shadow-md transition-all ${
                  isFinishedAll
                    ? 'bg-amber-500 text-white hover:bg-amber-600 scale-103 cursor-pointer'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
              >
                🏁 تسليم ورقة الإجابة
              </button>
            )}
          </div>

          {!isFinishedAll && (
            <p className="text-[10px] text-zinc-400 text-center font-bold">⚠️ يرجى تدوين إجابات لكافة الأسئلة لتسليم الاختبار تلقائياً.</p>
          )}
        </div>
      )}

      {/* Quiz feedback report view */}
      {report && !loading && !grading && (
        <div className="space-y-6">
          <div className="text-center bg-gradient-to-br from-emerald-primary to-emerald-900 text-white p-6 rounded-3xl space-y-3 border border-emerald-primary/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient(ellipse_at_center,_var(--tw-gradient-stops)) from-emerald-700 to-transparent opacity-40 pointer-events-none" />
            <div className="relative z-10 space-y-1">
              <Trophy className="w-12 h-12 text-amber-300 mx-auto animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-emerald-950 px-2.5 py-1 rounded-full inline-block">التقرير النهائي لمسيرة الحفظ</span>
              <h3 className="font-extrabold text-lg md:text-xl font-amiri text-center">التقويم والدرجة الكلية</h3>
              <div className="text-3xl md:text-4xl font-extrabold text-amber-300 pt-1 leading-none">{report.score}/100</div>
              <p className="text-emerald-100 text-xs font-semibold leading-relaxed pt-2 max-w-md mx-auto">{report.overallFeedback}</p>
            </div>
          </div>

          {/* Graded layout */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-emerald-primary flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              أجوبتك المصححة بالتفصيل:
            </h4>

            {report.gradedQuestions.map((q, idx) => (
              <div 
                key={q.id}
                className={`p-4 rounded-2xl border text-right space-y-2.5 leading-relaxed text-xs font-semibold ${
                  q.isCorrect 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950' 
                    : 'bg-red-500/10 border-red-500/20 text-red-950'
                }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-zinc-100/30 pb-2">
                  <div className="flex items-center gap-1.5">
                    {q.isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-black text-xs text-zinc-800">سؤال {idx + 1}: {q.questionText}</span>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded ${q.isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                    {q.isCorrect ? 'صحيح' : 'يحتاج مراجعة'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-bold text-zinc-650">
                  <div><strong>إجابتك المسجلة:</strong> <span className={q.isCorrect ? "text-emerald-800" : "text-red-700 font-bold"}>{q.userAnswer || 'لا يوجد'}</span></div>
                  <div><strong>الإجابة النموذجية:</strong> <span className="text-emerald-805">{q.correctAnswer}</span></div>
                </div>

                <p className="text-zinc-600 bg-white/70 p-3 rounded-xl font-normal leading-relaxed text-[11px] border border-emerald-primary/5">
                  💡 <strong>ملاحظة وتعليق المعلم:</strong> {q.correctionFeedback}
                </p>
              </div>
            ))}
          </div>

          {/* Suggested study reviews */}
          <div className="bg-amber-500/10 p-5 rounded-2xl border border-gold-accent/20 space-y-2 text-right">
            <h4 className="font-black text-xs text-amber-900 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-gold-accent animate-pulse" />
              📚 التوجيه والمراجعة الدراسية المقترحة:
            </h4>
            <p className="text-xs leading-relaxed text-zinc-700 font-medium whitespace-pre-line">{report.recommendedReviewPlan}</p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={startNewQuiz}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-primary text-white text-xs font-black rounded-xl shadow-md hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />ابدأ مسابقة جديدة
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
