import {
  Trophy,
  Compass,
  Star,
  HelpCircle,
  Activity,
  Award,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Share2,
} from "lucide-react";
import { PerformanceStats } from "../types";

interface PerformanceDashboardProps {
  stats: PerformanceStats;
}

export default function PerformanceDashboard({
  stats,
}: PerformanceDashboardProps) {
  // Create beautiful progress SVG coordinates
  const EvolutionChart = () => {
    // Generate simple historical points
    const points = [
      { date: "الأسبوع 1", score: 82 },
      { date: "الأسبوع 2", score: 85 },
      { date: "الأسبوع 3", score: 88 },
      { date: "الأسبوع 4", score: 91 },
      { date: "الأسبوع 5", score: stats.averageMastery || 92 },
    ];

    const width = 500;
    const height = 150;
    const padding = 25;

    // Convert keys to SVG coordinates
    const coordinates = points.map((p, idx) => {
      const x = padding + (idx * (width - padding * 2)) / (points.length - 1);
      const y = height - padding - (p.score * (height - padding * 2)) / 100;
      return { x, y, score: p.score, date: p.date };
    });

    // Make an SVG path string
    const dString = coordinates.reduce((acc, coord, idx) => {
      return idx === 0
        ? `M ${coord.x} ${coord.y}`
        : `${acc} L ${coord.x} ${coord.y}`;
    }, "");

    return (
      <div className="w-full bg-bg-tertiary p-5 rounded-2xl border border-border-primary">
        <h4 className="text-xs font-black text-brand-primary mb-4 flex items-center gap-1">
          <Activity className="w-4 h-4 text-brand-primary animate-pulse" />
          رسم بياني للتطور والتقدم المستمر (درجة الحفظ والإتقان):
        </h4>

        <div className="relative w-full overflow-x-auto custom-scrollbar">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[400px] h-36"
          >
            {/* Grid Lines */}
            <line
              x1={padding}
              y1={padding}
              x2={width - padding}
              y2={padding}
              stroke="#f1f5f9"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <line
              x1={padding}
              y1={height / 2}
              x2={width - padding}
              y2={height / 2}
              stroke="#f1f5f9"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="#cbd5e1"
              strokeWidth={1.5}
            />

            {/* Path line */}
            <path
              d={dString}
              fill="none"
              stroke="#0a5f3e"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Accent dots with labels */}
            {coordinates.map((coord, idx) => (
              <g key={idx}>
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={5}
                  fill="#c49a45"
                  className="hover:scale-125 transition-transform cursor-pointer"
                />

                {/* Score hover text */}
                <text
                  x={coord.x}
                  y={coord.y - 10}
                  textAnchor="middle"
                  fontSize="9px"
                  fontFamily="sans-serif"
                  fontWeight="600"
                  fill="#1e293b"
                  className="font-bold"
                >
                  {coord.score}%
                </text>

                {/* X axis tag */}
                <text
                  x={coord.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="8px"
                  fontFamily="sans-serif"
                  fill="#94a3b8"
                >
                  {coord.date}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bento Stats Counters Grid */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        id="stats-counters-bento"
      >
        {/* Stat 1 */}
        <div className="bg-bg-secondary p-4 rounded-2xl shadow-sm border border-brand-primary/10 space-y-1 text-right">
          <div className="flex justify-between items-center pb-1">
            <span className="p-1 px-1.5 bg-brand-light text-brand-primary rounded-lg text-xs font-bold">
              التسميع
            </span>
            <Compass className="w-4 h-4 text-brand-primary" />
          </div>
          <div className="text-2xl font-black text-text-primary">
            {stats.totalRecitations}
          </div>
          <p className="text-[10px] text-text-muted font-bold">
            إجمالي جلسات التلاوة الصوتية
          </p>
        </div>

        {/* Stat 2 */}
        <div className="bg-bg-secondary p-4 rounded-2xl shadow-sm border border-brand-primary/10 space-y-1 text-right">
          <div className="flex justify-between items-center pb-1">
            <span className="p-1 px-1.5 bg-brand-light text-brand-primary rounded-lg text-xs font-bold">
              درجة الإتقان
            </span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-300" />
          </div>
          <div className="text-2xl font-black text-text-primary">
            {stats.averageMastery}%
          </div>
          <p className="text-[10px] text-text-muted font-bold">
            معدل التلاوة الصحيحة الخالية من اللحن
          </p>
        </div>

        {/* Stat 3 */}
        <div className="bg-bg-secondary p-4 rounded-2xl shadow-sm border border-brand-primary/10 space-y-1 text-right">
          <div className="flex justify-between items-center pb-1">
            <span className="p-1 px-1.5 bg-brand-light text-brand-primary rounded-lg text-xs font-bold font-black">
              الاختبارات
            </span>
            <HelpCircle className="w-4 h-4 text-brand-primary" />
          </div>
          <div className="text-2xl font-black text-text-primary">
            {stats.totalQuizzes}
          </div>
          <p className="text-[10px] text-text-muted font-bold">
            عدد المسابقات والاختبارات المنجزة
          </p>
        </div>

        {/* Stat 4 */}
        <div className="bg-bg-secondary p-4 rounded-2xl shadow-sm border border-brand-primary/10 space-y-1 text-right">
          <div className="flex justify-between items-center pb-1">
            <span className="p-1 px-1.5 bg-amber-500/10 text-gold-accent rounded-lg text-[10px] font-black">
              المستوى النحوي
            </span>
            <Trophy className="w-4 h-4 text-gold-accent fill-gold-accent" />
          </div>
          <div className="text-lg font-black text-text-primary md:text-xl">
            {stats.hifzLevel}
          </div>
          <p className="text-[10px] text-text-muted font-bold">
            مستوى الحفظ والتركيز الراهن
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* evolution chart */}
        <div className="bg-bg-secondary rounded-3xl p-5 shadow-sm border border-brand-primary/10">
          <EvolutionChart />
        </div>

        {/* Common recitation errors list */}
        <div className="bg-bg-secondary rounded-3xl p-5 shadow-sm border border-brand-primary/10 text-right space-y-3">
          <h4 className="text-xs font-black text-brand-primary pb-2 border-b border-border-primary flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
            أكثر الصعوبات والأخطاء اللفظية تكراراً لتجنب اللحن:
          </h4>

          {stats.commonErrors.length === 0 ? (
            <p className="text-center text-xs text-text-muted py-6">
              ممتاز! حافظ على التلاوة، لا توجد لحون متراكمة في السجل حالياً.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.commonErrors.map((err, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-red-500/5 rounded-2xl text-xs font-bold leading-relaxed"
                >
                  <span className="bg-red-200/55 text-red-700 rounded px-2.5 py-0.5 text-[10px]">
                    {err.count} تكرار
                  </span>
                  <div className="text-right">
                    <span className="text-text-primary block">
                      الخطأ في كلمة:{" "}
                      <strong className="text-red-650">"{err.word}"</strong>
                    </span>
                    <span className="text-[10px] text-text-muted font-medium block">
                      تصنيف الخطأ: {err.errorType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Levels horizontal slider */}
      <div className="bg-bg-secondary rounded-3xl p-6 shadow-sm border border-brand-primary/10 space-y-4 text-right overflow-hidden">
        <h4 className="text-xs font-black text-brand-primary flex items-center gap-1.5 pb-2 border-b border-border-primary">
          <Trophy className="w-4 h-4" />
          مستويات الحفظ والإتقان
        </h4>
        
        <div className="overflow-x-auto custom-scrollbar pb-4 flex items-center gap-4 px-2" dir="rtl">
          {[
            { id: "مبتدئ", title: "مبتدئ", desc: "يبدأ رحلة الحفظ" },
            { id: "متوسط", title: "متوسط", desc: "يراجع بانتظام ويتقدم" },
            { id: "متقن", title: "متقن", desc: "حفظ قوي مع بعض المراجعات" },
            { id: "حافظ مجاز", title: "حافظ مجاز", desc: "ضبط تام بالأحكام" }
          ].map((lvl, index) => {
            const isActive = stats.hifzLevel === lvl.id;
            
            return (
              <div 
                key={lvl.id} 
                className={`min-w-[160px] flex flex-col items-center justify-center p-5 rounded-2xl border transition-all shrink-0 ${
                  isActive 
                    ? "bg-brand-primary border-brand-primary shadow-lg shadow-emerald-500/20 scale-105" 
                    : "bg-bg-tertiary border-border-primary opacity-60 grayscale hover:grayscale-0 hover:opacity-100 cursor-pointer"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isActive ? 'bg-white/20 text-white' : 'bg-bg-secondary text-text-muted'}`}>
                  {index === 0 && <Star className="w-6 h-6" />}
                  {index === 1 && <Activity className="w-6 h-6" />}
                  {index === 2 && <Award className="w-6 h-6" />}
                  {index === 3 && <Trophy className="w-6 h-6" />}
                </div>
                <h5 className={`font-black text-sm mb-1 ${isActive ? "text-white" : "text-text-primary"}`}>{lvl.title}</h5>
                <span className={`text-[10px] text-center font-bold ${isActive ? "text-emerald-100" : "text-text-muted"}`}>{lvl.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
