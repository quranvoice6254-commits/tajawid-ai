import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Volume2, 
  Search, 
  Brain, 
  AlignRight, 
  Loader2, 
  BookMarked,
  Eye,
  EyeOff,
  Compass,
  Trophy
} from 'lucide-react';
import { EXCLUSIVE_MATNS, Verse } from '../data/matnsData';
import { ExplanationResult } from '../types';

interface MatnExplainerProps {
  matnName: string;
  onSelectMatn: (name: string) => void;
  onAddSession: (score: number, type: 'recitation' | 'quiz' | 'chat') => void;
}

export default function MatnExplainer({
  matnName,
  onSelectMatn,
  onAddSession
}: MatnExplainerProps) {
  const [error, setError] = useState<string | null>(null);
  const [searchVerse, setSearchVerse] = useState<string>('');
  const [revealedVerses, setRevealedVerses] = useState<Record<number, boolean>>({});
  const [globalReveal, setGlobalReveal] = useState<boolean>(false);
  
  // Explanation states
  const [explainingId, setExplainingId] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);
  const [explainLoading, setExplainLoading] = useState<boolean>(false);

  // Selected Matn core static data entry
  const selectedData = EXCLUSIVE_MATNS[matnName] || EXCLUSIVE_MATNS["تحفة الأطفال"];

  // Propagate default select on mount if empty or mismatched
  useEffect(() => {
    if (!EXCLUSIVE_MATNS[matnName]) {
      onSelectMatn("تحفة الأطفال");
    }
  }, []);

  const explainVerse = async (verse: Verse) => {
    setExplainLoading(true);
    setExplanation(null);
    setExplainingId(verse.id);
    setError(null);
    try {
      const response = await fetch('/api/matn-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matnName: matnName,
          verseText: `${verse.s1} - ${verse.s2}`
        })
      });
      if (!response.ok) {
        throw new Error('عذرًا، فشل توليد الشرح في الوقت الحالي.');
      }
      const data: ExplanationResult = await response.json();
      setExplanation(data);
      onAddSession(100, 'chat');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء الاتصال بالمعلم اللغوي.");
    } finally {
      setExplainLoading(false);
    }
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      const arabicVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('ar'));
      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }
      utterance.rate = 0.85; // Elegant slow reciting speed
      window.speechSynthesis.speak(utterance);
    } else {
      alert('إصدار متصفحك الحالي لا يدعم قراءة النصوص صوتياً.');
    }
  };

  const toggleVerseReveal = (id: number) => {
    setRevealedVerses(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAllReveal = () => {
    const newVal = !globalReveal;
    setGlobalReveal(newVal);
    const updated: Record<number, boolean> = {};
    if (newVal && selectedData) {
      selectedData.verses.forEach(v => {
        updated[v.id] = true;
      });
    }
    setRevealedVerses(updated);
  };

  // Restrict to EXCLUSIVE_MATNS list
  const filteredVerses = selectedData?.verses.filter(v => 
    v.s1.toLowerCase().includes(searchVerse.toLowerCase()) ||
    v.s2.toLowerCase().includes(searchVerse.toLowerCase()) ||
    v.chapter.toLowerCase().includes(searchVerse.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      
      {/* Book selector */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-primary/10 space-y-4">
        <div>
          <h3 className="text-sm font-black text-emerald-primary mb-2.5 flex items-center gap-1.5 selection:bg-amber-100">
            <BookMarked className="w-4 h-4 text-amber-500 animate-pulse" />
            📚 الكتب والمتون المتاحة للدراسة والتسميع:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {Object.keys(EXCLUSIVE_MATNS).map((name) => (
              <button
                key={name}
                onClick={() => {
                  onSelectMatn(name);
                  setRevealedVerses({});
                  setGlobalReveal(false);
                  setExplainingId(null);
                  setExplanation(null);
                }}
                className={`text-xs font-black p-3.5 rounded-2xl transition-all duration-200 text-center border cursor-pointer ${
                  matnName === name
                    ? 'bg-emerald-primary text-white scale-102 border-emerald-primary shadow-sm'
                    : 'bg-emerald-light/40 text-emerald-primary border-emerald-primary/10 hover:bg-emerald-primary hover:text-white'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Matn Specs dashboard card */}
      {selectedData && (
        <div className="space-y-6">
          
          {/* Metadata banner of specific book */}
          <div className="bg-gradient-to-br from-emerald-primary to-emerald-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 top-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-700 to-transparent opacity-30 pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black bg-amber-400 text-emerald-950 px-2.5 py-1 rounded-full uppercase">
                  ✍️ ناظم المتن: {selectedData.author}
                </span>
                <span className="text-[10px] font-black bg-emerald-800 text-emerald-100 px-2.5 py-1 rounded-full">
                  ⏳ الحقبة: {selectedData.era}
                </span>
                <span className="text-[10px] font-black bg-emerald-800 text-emerald-100 px-2.5 py-1 rounded-full">
                  🔢 عدد الأبيات: {selectedData.totalVerses} بيتًا
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black font-amiri tracking-wide text-right">{selectedData.name}</h2>
              <div className="text-xs text-emerald-100 font-medium leading-relaxed leading-5">
                <strong>موضوع المتن:</strong> {selectedData.subject}
              </div>
              <p className="text-xs text-emerald-100 font-normal leading-relaxed leading-5 border-t border-white/10 pt-2.5">{selectedData.summary}</p>
            </div>
          </div>

          {/* Quick study metrics layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Chapters list of chosen Book */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-primary/5 space-y-3 text-right">
              <h4 className="text-xs font-black text-emerald-primary border-b border-zinc-150 pb-2 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-500" />
                أبواب وفصول المنظومة المعتمدة:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-zinc-600">
                {selectedData.chapters.map((chapter) => (
                  <span key={chapter} className="p-2 bg-[#f9fbf9] border border-emerald-primary/5 rounded-xl block truncate pr-2.5 text-right border-r-2 border-r-amber-500/40">
                    {chapter}
                  </span>
                ))}
              </div>
            </div>

            {/* Scientific and educative benefits */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-primary/5 space-y-3 text-right">
              <h4 className="text-xs font-black text-emerald-primary border-b border-zinc-150 pb-2 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-emerald-primary" />
                الأهداف والفوائد التربوية للمستمع:
              </h4>
              <ul className="text-xs font-bold text-zinc-600 space-y-2 pr-1">
                {selectedData.benefits.map((benefit, idx) => (
                  <li key={idx} className="text-right leading-relaxed pr-4.5 relative before:content-['•'] before:absolute before:right-0 before:text-sm before:text-amber-500">
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Interactive full system poet explorer */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-primary/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAllReveal}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-gold-accent border border-amber-500/10 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                  title="إخفاء أو كشف كامل الأبيات للتقويم الذاتي"
                >
                  {globalReveal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{globalReveal ? "إخفاء كل الأبيات" : "عرض كل الأبيات"}</span>
                </button>
                <div className="text-right">
                  <h3 className="font-black text-sm text-zinc-800">
                    الأبيات والمنظومة تفاعلياً
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-semibold">اضغط على زر العين 👀 لعرض شطري البيت، أو انقر للاستماع للنطق والشرح</p>
                </div>
              </div>

              {/* Search tool */}
              <div className="relative">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchVerse}
                  onChange={(e) => setSearchVerse(e.target.value)}
                  placeholder="ابحث في الأبيات..."
                  className="w-full sm:w-48 pl-3 pr-9 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-emerald-primary text-right font-bold text-zinc-700"
                />
              </div>

            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold text-center py-1">{error}</p>
            )}

            {/* List rendered */}
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1" id="interactive-verses-canvas">
              {filteredVerses.map((verse, index) => {
                const isSelected = explainingId === verse.id;
                const isRevealed = revealedVerses[verse.id] || globalReveal;

                return (
                  <div
                    key={verse.id}
                    className={`p-4 rounded-2xl border transition-all duration-300 space-y-4 ${
                      isSelected
                        ? 'bg-[#faefe2]/35 border-gold-accent'
                        : 'bg-zinc-50/50 border-zinc-150/40 hover:bg-[#f6faf8]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
                        
                        {/* Shatr 1 */}
                        <div className="font-amiri text-base md:text-lg text-zinc-800 text-right flex-1 select-none font-bold">
                          {isRevealed ? (
                            verse.s1
                          ) : (
                            <span className="text-zinc-350 cursor-pointer text-xs font-sans tracking-widest hover:text-emerald-primary" onClick={() => toggleVerseReveal(verse.id)}>
                              •••••••••••••••••••• (انقر للكشف)
                            </span>
                          )}
                        </div>

                        {/* Middle badge */}
                        <div className="flex items-center gap-1.5 self-center my-1 sm:my-0">
                          <button
                            onClick={() => toggleVerseReveal(verse.id)}
                            className="p-1 hover:bg-zinc-250 text-zinc-400 hover:text-zinc-600 rounded"
                            title="عرض / إخفاء البيت"
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5 text-emerald-primary" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <div className="w-6.5 h-6.5 rounded-full bg-emerald-light text-emerald-primary text-[10px] font-black flex items-center justify-center">
                            {index + 1}
                          </div>
                        </div>

                        {/* Shatr 2 */}
                        <div className="font-amiri text-base md:text-lg text-zinc-800 text-left sm:text-right flex-1 select-none font-bold">
                          {isRevealed ? (
                            verse.s2
                          ) : (
                            <span className="text-zinc-350 cursor-pointer text-xs font-sans tracking-widest hover:text-emerald-primary" onClick={() => toggleVerseReveal(verse.id)}>
                              •••••••••••••••••••• (انقر للكشف)
                            </span>
                          )}
                        </div>

                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleSpeak(`${verse.s1} ، ${verse.s2}`)}
                          className="p-1.5 bg-white border border-zinc-200 hover:border-gold-accent hover:bg-amber-50 rounded-xl hover:scale-105 transition-all text-emerald-primary"
                          title="استمع للبيت مرتلاً ومقروءاً"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => explainVerse(verse)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-primary text-white text-[10px] font-bold rounded-xl shadow-xs hover:bg-emerald-900 hover:scale-103 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>شرح وإعراب البيت</span>
                        </button>
                      </div>
                    </div>

                    {/* Explaining panel expansion dynamically with typing animation */}
                    {isSelected && (
                      <div className="border-t border-zinc-200/80 pt-4 space-y-4">
                        {explainLoading && (
                          <div className="flex items-center justify-center py-6 gap-2">
                            <Loader2 className="w-5 h-5 text-emerald-primary animate-spin" />
                            <span className="text-xs text-zinc-500 font-black">جاري طلب الشرح اللغوي التفصيلي وإذن الإعراب النحوي من المعلم...</span>
                          </div>
                        )}

                        {explanation && !explainLoading && (
                          <div className="space-y-4 text-xs font-medium leading-relaxed text-zinc-700 text-right">
                            {/* Meaning */}
                            <div className="bg-[#fcfbf9] p-4 rounded-xl border border-emerald-primary/5 space-y-1">
                              <h5 className="font-black text-emerald-primary text-xs">📖 الشرح المفرداتي للبيت:</h5>
                              <p className="text-zinc-650 leading-relaxed text-[11px] font-semibold">{explanation.meaning}</p>
                            </div>

                            {/* Parsing */}
                            <div className="bg-[#edf6f2] p-4 rounded-xl border border-emerald-primary/5 space-y-1">
                              <h5 className="font-black text-emerald-primary text-xs">💬 الإعراب البلاغي والنحوي للشطرين ميسرًا:</h5>
                              <p className="font-mono text-zinc-700 text-[11px] leading-relaxed font-semibold whitespace-pre-line">{explanation.grammarAnalysis}</p>
                            </div>

                            {/* Rules */}
                            {explanation.tajweedRules?.length > 0 && (
                              <div className="bg-[#fcfbf9] p-4 rounded-xl border border-emerald-primary/5 space-y-1">
                                <h5 className="font-black text-gold-accent text-xs">✨ الأحكام التجويدية والفوائد المصاحبة:</h5>
                                <ul className="list-disc list-inside space-y-1 pr-1 text-[11px]">
                                  {explanation.tajweedRules.map((rule, idx) => (
                                    <li key={idx} className="list-none pr-3 relative before:content-['✓'] before:absolute before:right-0 before:font-bold before:text-emerald-primary">
                                      {rule}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Tip */}
                            <div className="p-3.5 bg-amber-500/10 text-amber-900 rounded-xl border border-gold-accent/15">
                              <h5 className="font-black text-gold-accent text-xs">💡 نصيحة دراسية للحفظ وضبط اللحن:</h5>
                              <p className="font-serif italic text-[11px] mt-0.5">{explanation.educationalTip}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}

              {filteredVerses.length === 0 && (
                <p className="text-center text-xs text-zinc-400 py-6">مكرم! لم نعثر على أي شطر شعر موازٍ لبحثك.</p>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
