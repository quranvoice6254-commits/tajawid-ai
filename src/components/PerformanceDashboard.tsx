import { Trophy, Compass, Star, HelpCircle, Activity, Award, Calendar, AlertTriangle } from 'lucide-react';
import { PerformanceStats, LearningSession } from '../types';

interface PerformanceDashboardProps {
  stats: PerformanceStats;
  history: LearningSession[];
  onClearHistory: () => void;
}

export default function PerformanceDashboard({ stats, history, onClearHistory }: PerformanceDashboardProps) {
  
  // Create beautiful progress SVG coordinates
  const EvolutionChart = () => {
    // Generate simple historical points
    const points = [
      { date: 'الأسبوع 1', score: 82 },
      { date: 'الأسبوع 2', score: 85 },
      { date: 'الأسبوع 3', score: 88 },
      { date: 'الأسبوع 4', score: 91 },
      { date: 'الأسبوع 5', score: stats.averageMastery || 92 },
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
      return idx === 0 ? `M ${coord.x} ${coord.y}` : `${acc} L ${coord.x} ${coord.y}`;
    }, '');

    return (
      <div className="w-full bg-zinc-50 p-5 rounded-2xl border border-zinc-150">
        <h4 className="text-xs font-black text-emerald-primary mb-4 flex items-center gap-1">
          <Activity className="w-4 h-4 text-emerald-primary animate-pulse" />
          رسم بياني للتطور والتقدم المستمر (درجة الحفظ والإتقان):
        </h4>

        <div className="relative w-full overflow-x-auto custom-scrollbar">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px] h-36">
            {/* Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="4 4" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="4 4" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth={1.5} />

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-counters-bento">
        
        {/* Stat 1 */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-primary/10 space-y-1 text-right">
          <div className="flex justify-between items-center pb-1">
            <span className="p-1 px-1.5 bg-emerald-light text-emerald-primary rounded-lg text-xs font-bold">التسميع</span>
            <Compass className="w-4 h-4 text-emerald-primary" />
          </div>
          <div className="text-2xl font-black text-zinc-800">{stats.totalRecitations}</div>
          <p className="text-[10px] text-zinc-400 font-bold">إجمالي جلسات التلاوة الصوتية</p>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-primary/10 space-y-1 text-right">
          <div className="flex justify-between items-center pb-1">
            <span className="p-1 px-1.5 bg-amber-50 text-amber-705 rounded-lg text-[10px] font-bold">درجة الإتقان</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-300" />
          </div>
          <div className="text-2xl font-black text-zinc-800">{stats.averageMastery}%</div>
          <p className="text-[10px] text-zinc-400 font-bold">معدل التلاوة الصحيحة الخالية من اللحن</p>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-primary/10 space-y-1 text-right">
          <div className="flex justify-between items-center pb-1">
            <span className="p-1 px-1.5 bg-emerald-light text-emerald-primary rounded-lg text-xs font-bold font-black">الاختبارات</span>
            <HelpCircle className="w-4 h-4 text-emerald-primary" />
          </div>
          <div className="text-2xl font-black text-zinc-800">{stats.totalQuizzes}</div>
          <p className="text-[10px] text-zinc-400 font-bold">عدد المسابقات والاختبارات المنجزة</p>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-primary/10 space-y-1 text-right">
          <div className="flex justify-between items-center pb-1">
            <span className="p-1 px-1.5 bg-amber-500/10 text-gold-accent rounded-lg text-[10px] font-black">المستوى النحوي</span>
            <Trophy className="w-4 h-4 text-gold-accent fill-gold-accent" />
          </div>
          <div className="text-lg font-black text-zinc-800 md:text-xl">{stats.hifzLevel}</div>
          <p className="text-[10px] text-zinc-400 font-bold">مستوى الحفظ والتركيز الراهن</p>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* evolution chart */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-primary/10">
          <EvolutionChart />
        </div>

        {/* Common recitation errors list */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-primary/10 text-right space-y-3">
          <h4 className="text-xs font-black text-emerald-primary pb-2 border-b border-zinc-100 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
            أكثر الصعوبات والأخطاء اللفظية تكراراً لتجنب اللحن:
          </h4>

          {stats.commonErrors.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-6">ممتاز! حافظ على التلاوة، لا توجد لحون متراكمة في السجل حالياً.</p>
          ) : (
            <div className="space-y-2">
              {stats.commonErrors.map((err, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-red-500/5 rounded-2xl text-xs font-bold leading-relaxed">
                  <span className="bg-red-200/55 text-red-700 rounded px-2.5 py-0.5 text-[10px]">{err.count} تكرار</span>
                  <div className="text-right">
                    <span className="text-zinc-800 block">الخطأ في كلمة: <strong className="text-red-650">"{err.word}"</strong></span>
                    <span className="text-[10px] text-zinc-400 font-medium block">تصنيف الخطأ: {err.errorType}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-primary/10 space-y-4 text-right">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
          <button
            onClick={onClearHistory}
            className="text-[10px] text-red-500 hover:underline font-black cursor-pointer"
          >
            مسح جميع الإحصاءات والأرشيف
          </button>
          
          <h4 className="text-xs font-black text-emerald-primary flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            أرشيف وحصاد الأنشطة الأخيرة للمتعلم:
          </h4>
        </div>

        {history.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 py-6">لم يتم تسوية أي أنشطة أو تسميع حتى الآن.</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs font-bold text-zinc-600">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 text-[10px]">
                  <th className="py-2 text-right">المتن النجمي</th>
                  <th className="py-2 text-center">نوع العمل</th>
                  <th className="py-2 text-center">التاريخ والوقت</th>
                  <th className="py-2 text-left">مستوى الإتقان/النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-zinc-55/65">
                    <td className="py-2.5 text-right">{h.matnName}</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        h.type === 'recitation' ? 'bg-emerald-light text-emerald-primary' :
                        h.type === 'quiz' ? 'bg-amber-50 text-amber-705' : 'bg-zinc-100 text-zinc-650'
                      }`}>
                        {h.type === 'recitation' ? 'تسميع صوتي' :
                         h.type === 'quiz' ? 'مسابقة وأسئلة' : 'شرح الأبيات'}
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-[10px] text-zinc-400">{h.date}</td>
                    <td className="py-2.5 text-left text-emerald-primary font-black">{h.score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
