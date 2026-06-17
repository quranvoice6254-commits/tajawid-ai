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
  onOpenExport?: (explanation: ExplanationResult) => void;
}

export default function MatnExplainer({
  matnName,
  onSelectMatn,
  onAddSession,
  onOpenExport
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
                <div className="text-right">
                  <h3 className="font-black text-sm text-zinc-800">
                    الأبيات والمنظومة تفاعلياً
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-semibold">تصفح الأبيات بجميع حركاتها وتشكيلها الصحيح، وانقر على أي بيت لشرحه وإعرابه بالكامل</p>
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
            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-1" id="interactive-verses-canvas">
              {filteredVerses.map((verse) => {
                const isSelected = explainingId === verse.id;
                const realIndex = selectedData.verses.findIndex(v => v.id === verse.id) + 1;

                return (
                  <div
                    key={verse.id}
                    className={`p-5 rounded-2xl border transition-all duration-300 space-y-4 ${
                      isSelected
                        ? 'bg-[#faefe2]/40 border-amber-400 shadow-md scale-[1.01]'
                        : 'bg-zinc-50 border-zinc-200/50 hover:border-emerald-600/30 hover:bg-[#f6faf8]'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                      
                      {/* Left-side / top verse numbering badge */}
                      <div className="flex items-center gap-2.5 self-start lg:self-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-primary text-white text-xs font-black flex items-center justify-center shadow-xs">
                          {realIndex}
                        </div>
                        <span className="text-[10px] bg-zinc-200/60 text-zinc-600 px-2 py-0.5 rounded-full font-bold">
                          {verse.chapter}
                        </span>
                      </div>

                      {/* Traditional elegant Arabic poetry double hemistich layout */}
                      <div className="flex-1 w-full flex flex-col md:flex-row items-stretch justify-between gap-3 text-right">
                        {/* Shatr 1 */}
                        <div className="flex-1 font-amiri text-base md:text-lg lg:text-xl text-emerald-950 bg-emerald-50/20 px-4 py-3 rounded-2xl border border-emerald-900/5 shadow-2xs font-extrabold flex items-center justify-center text-center leading-loose">
                          {verse.s1}
                        </div>

                        {/* Traditional poetry break indicator */}
                        <div className="hidden md:flex items-center justify-center text-amber-500 font-sans text-sm px-1 font-black self-center">
                          ❈
                        </div>

                        {/* Shatr 2 */}
                        <div className="flex-1 font-amiri text-base md:text-lg lg:text-xl text-emerald-950 bg-emerald-50/20 px-4 py-3 rounded-2xl border border-emerald-900/5 shadow-2xs font-extrabold flex items-center justify-center text-center leading-loose">
                          {verse.s2}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0 self-end lg:self-center">
                        <button
                          onClick={() => handleSpeak(`${verse.s1} ، ${verse.s2}`)}
                          className="p-2 bg-white border border-zinc-250 hover:border-gold-accent hover:bg-amber-50 rounded-xl hover:scale-105 transition-all text-emerald-primary cursor-pointer shadow-2xs"
                          title="استمع للبيت مرتلاً ومقروءاً"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => explainVerse(verse)}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-emerald-primary text-white hover:bg-[#004d3d]'
                          }`}
                        >
                          <Sparkles className="w-4 h-4 text-amber-200" />
                          <span>تفسير البيت وإعرابه</span>
                        </button>
                      </div>
                    </div>

                    {/* Explaining panel expansion dynamically with typing animation */}
                    {isSelected && (
                      <div className="border-t border-zinc-200/80 pt-4 space-y-4">
                        {explainLoading && (
                          <div className="flex items-center justify-center py-8 gap-2">
                            <Loader2 className="w-5 h-5 text-emerald-primary animate-spin" />
                            <span className="text-xs text-zinc-500 font-black">جاري طلب الشرح اللغوي التفصيلي وإذن الإعراب النحوي من المعلم...</span>
                          </div>
                        )}

                        {explanation && !explainLoading && (
                          <div className="space-y-4 text-xs font-medium leading-relaxed text-zinc-700 text-right">
                            
                            {/* Two-column responsive layout for major explanations */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 1. Vocabulary explanation */}
                              <div className="bg-[#fcfbf9] p-4.5 rounded-2xl border border-amber-200/40 space-y-2 shadow-2xs">
                                <h5 className="font-black text-amber-700 text-xs flex items-center gap-1.5 border-b border-amber-200/40 pb-1.5">
                                  <span>📖</span> شرح مفردات البيت وغريب ألفاظه:
                                </h5>
                                <p className="text-zinc-700 leading-relaxed text-[11px] font-bold whitespace-pre-line leading-loose">
                                  {explanation.vocabularyExplanation || explanation.meaning}
                                </p>
                              </div>

                              {/* 2. Overall meaning */}
                              <div className="bg-[#f6faf8] p-4.5 rounded-2xl border border-emerald-primary/10 space-y-2 shadow-2xs">
                                <h5 className="font-black text-emerald-800 text-xs flex items-center gap-1.5 border-b border-emerald-100 pb-1.5">
                                  <span>💡</span> المعنى الإجمالي والمغزى العام:
                                </h5>
                                <p className="text-zinc-700 leading-relaxed text-[11px] font-bold whitespace-pre-line leading-loose">
                                  {explanation.overallMeaning || explanation.meaning}
                                </p>
                              </div>
                            </div>

                            {/* Two-column responsive layout for benefits and examples */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* 3. Scientific benefits */}
                              <div className="bg-white p-4.5 rounded-2xl border border-zinc-200/60 space-y-2 shadow-2xs">
                                <h5 className="font-black text-emerald-primary text-xs flex items-center gap-1.5 border-b border-zinc-150 pb-1.5">
                                  <span>📚</span> الفوائد والتعليمات المستخرجة:
                                </h5>
                                <ul className="space-y-1.5 pr-2.5">
                                  {(explanation.scientificBenefits || [explanation.meaning]).map((benefit, idx) => (
                                    <li key={idx} className="text-zinc-700 text-[11px] font-bold pr-4 relative before:content-['•'] before:absolute before:right-0 before:text-emerald-primary before:font-bold leading-relaxed">
                                      {benefit}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* 4. Practical examples */}
                              <div className="bg-amber-50/25 p-4.5 rounded-2xl border border-amber-500/10 space-y-2 shadow-2xs">
                                <h5 className="font-black text-amber-700 text-xs flex items-center gap-1.5 border-b border-amber-200 pb-1.5">
                                  <span>✨</span> شواهد وأمثلة تطبيقية علمية:
                                </h5>
                                <ul className="space-y-1.5 pr-2.5">
                                  {(explanation.practicalExamples || []).length > 0 ? (
                                    explanation.practicalExamples?.map((example, idx) => (
                                      <li key={idx} className="text-zinc-700 text-[11px] font-bold pr-4 relative before:content-['✓'] before:absolute before:right-0 before:text-amber-600 before:font-black leading-relaxed">
                                        {example}
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-zinc-500 text-[11px] italic pr-4 relative before:content-['✓'] before:absolute before:right-0 before:text-amber-600 leading-relaxed">
                                      {explanation.meaning}
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>

                            {/* Grammar Analysis */}
                            <div className="bg-[#edf6f2] p-4.5 rounded-2xl border border-emerald-primary/10 space-y-2 shadow-2xs">
                              <h5 className="font-black text-emerald-primary text-xs border-b border-emerald-100 pb-1.5">💬 الإعراب البلاغي والنحوي للشطرين ميسرًا:</h5>
                              <p className="font-mono text-zinc-700 text-[11px] leading-loose font-semibold whitespace-pre-line leading-loose">{explanation.grammarAnalysis}</p>
                            </div>

                            {/* Rules */}
                            {explanation.tajweedRules?.length > 0 && (
                              <div className="bg-[#fcfbf9] p-4.5 rounded-2xl border border-emerald-primary/5 space-y-2 shadow-2xs">
                                <h5 className="font-black text-amber-600 text-xs border-b border-zinc-150 pb-1.5">✨ الأحكام التجويدية والفوائد المصاحبة:</h5>
                                <ul className="list-disc list-inside space-y-1.5 pr-1 text-[11px]">
                                  {explanation.tajweedRules.map((rule, idx) => (
                                    <li key={idx} className="list-none pr-4 relative before:content-['✓'] before:absolute before:right-0 before:font-bold before:text-emerald-primary leading-relaxed">
                                      {rule}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Tip */}
                            <div className="p-4 bg-amber-500/10 text-amber-900 rounded-2xl border border-gold-accent/15 shadow-2xs">
                              <h5 className="font-black text-gold-accent text-xs">💡 نصيحة دراسية للحفظ وضبط اللحن:</h5>
                              <p className="font-serif italic text-[11px] mt-1 pr-1.5 leading-relaxed font-bold">{explanation.educationalTip}</p>
                            </div>

                            {onOpenExport && (
                              <div className="pt-2">
                                <button
                                  onClick={() => onOpenExport({
                                    verseText: `${verse.s1} ** ${verse.s2}`,
                                    ...explanation
                                  })}
                                  className="w-full py-2.5 bg-emerald-primary hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-101 shadow-xs border border-emerald-primary/10"
                                >
                                  <BookOpen className="w-4 h-4 text-emerald-light shrink-0" />
                                  <span>تصدير هذا الشرح كملخص دراسي متميز أو إنفوجرافيك لمواقع التواصل</span>
                                </button>
                              </div>
                            )}
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
