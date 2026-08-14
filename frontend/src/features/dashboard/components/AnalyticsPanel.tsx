import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  dashboardService,
  CATEGORY_COLORS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatResolutionTime,
} from "../services/dashboardService";
import { useAnalytics } from "../hooks/useAnalytics";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { ROUTES } from "@/shared/config/routes";
import { LoadingState } from "@/shared/components/LoadingState";
import {
  BarChart3,
  TrendingUp,
  Map,
  PieChart as PieIcon,
  MapPin,
  Clock,
  Sparkles,
  Activity,
  AlertTriangle,
} from "lucide-react";

const TICK = { fill: "#9ca3af", fontSize: 11 };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl p-2.5 shadow-2xl text-xs font-sans">
      {label && (
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">{label}</p>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 font-medium text-foreground mt-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
            style={{ backgroundColor: p.color ?? p.stroke ?? p.fill }}
          />
          <span>{p.name || "Value"}:</span>
          <span className="font-bold ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function parseBoldText(text: string) {
  if (!text) return { __html: "" };
  const html = text.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-foreground'>$1</strong>");
  return { __html: html };
}

/**
 * Every figure rendered here comes from /analytics/* — the panel performs
 * no aggregation of its own and shows nothing the database can't back.
 */
export function AnalyticsPanel() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { overview, departments = [], hotspots = [], trends = [], byPriority = [], loading, error } = useAnalytics();

  if (loading) {
    return (
      <LoadingState message={language === "en" ? "Loading analytics…" : "विश्लेषण लोड हो रहा है…"} />
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {language === "en" ? "Analytics unavailable" : "विश्लेषण उपलब्ध नहीं"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!overview || overview.totals.issues === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {language === "en"
            ? "No issues reported yet — analytics will appear once the first report comes in."
            : "अभी कोई समस्या दर्ज नहीं — पहली रिपोर्ट के बाद विश्लेषण दिखेगा।"}
        </p>
      </div>
    );
  }

  const summary = dashboardService.buildWeeklySummary(overview, departments, hotspots);

  const isDeptAdmin = departments.length === 1;

  const chartData = isDeptAdmin && byPriority && byPriority.length > 0
    ? byPriority.map(p => ({
        name: language === "en" ? p.nameEn : p.nameHi,
        count: p.count,
        color: p.color,
      }))
    : overview.byCategory.map((c) => ({
        name: c.nameEn,
        count: c.count,
        color: CATEGORY_COLORS[c.nameEn] ?? "#6366f1",
      }));

  const trendData = trends.map((t) => ({ month: t.month, reported: t.reported, resolved: t.resolved }));

  const handleCategoryClick = (category: string) =>
    navigate(`${ROUTES.CIVIC_MAP}?category=${encodeURIComponent(category)}`);

  return (
    <div className="space-y-6 pt-2">
      {/* Charts 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Issues by Category / Priority */}
        <div className="bg-card/60 border border-border/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {isDeptAdmin 
                ? (language === "en" ? "Issues by Priority" : "प्राथमिकता के आधार पर मुद्दे")
                : (language === "en" ? "[Chart: Issues by Category & Status]" : "[चार्ट: श्रेणी व स्थिति]")
              }
            </h3>
            {!isDeptAdmin && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {language === "en" ? "click → filter map" : "क्लिक → मानचित्र फ़िल्टर"}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" horizontal={false} />
              <XAxis type="number" tick={TICK} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={TICK} width={110} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#64748b18" }} />
              <Bar 
                dataKey="count" 
                radius={[0, 6, 6, 0]} 
                onClick={!isDeptAdmin ? (d: any) => handleCategoryClick(d.name) : undefined}
              >
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} className={!isDeptAdmin ? "cursor-pointer" : ""} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reported vs Resolved Trend */}
        <div className="bg-card/60 border border-border/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {language === "en" ? "[Chart: Trend Line]" : "[चार्ट: ट्रेंड लाइन]"}
            </h3>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {language === "en" ? "last 6 months" : "पिछले 6 महीने"}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
              <XAxis dataKey="month" tick={TICK} />
              <YAxis tick={TICK} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="reported"
                name={language === "en" ? "Reported" : "दर्ज"}
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name={language === "en" ? "Resolved" : "हल"}
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Civic Summary Container */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {language === "en" ? "CIVIC SUMMARY" : "नागरिक सारांश"}
          </h3>
        </div>
        <p
          className="text-base text-foreground/90 leading-relaxed font-medium"
          dangerouslySetInnerHTML={parseBoldText(
            language === "en" ? summary.summaryTextEn : summary.summaryTextHi
          )}
        />
        <ul className="mt-4 space-y-2.5">
          {(language === "en" ? summary.insightsEn : summary.insightsHi).map((insight, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/80">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="pt-0.5" dangerouslySetInnerHTML={parseBoldText(insight)} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DepartmentPerformanceCard() {
  const { language } = useLanguage();
  const { departments, loading } = useAnalytics();

  if (loading || !departments.length) return null;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-card h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">
          {language === "en" ? "Department Performance" : "विभागीय प्रदर्शन"}
        </h3>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border text-left">
              <th className="py-2.5 font-semibold text-sm">{language === "en" ? "Department" : "विभाग"}</th>
              <th className="py-2.5 text-center font-semibold text-sm">{language === "en" ? "Open" : "खुले"}</th>
              <th className="py-2.5 text-center font-semibold text-sm">{language === "en" ? "Resolved" : "हल"}</th>
              <th className="py-2.5 text-right font-semibold text-sm">{language === "en" ? "Rate" : "दर"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {departments.slice(0, 4).map((dept) => (
              <tr key={dept.departmentId} className="hover:bg-muted/20 transition-colors">
                <td className="py-3 font-semibold text-foreground pr-2 text-sm">{dept.nameEn}</td>
                <td className="py-3 text-center text-muted-foreground font-medium text-sm">{dept.openIssues}</td>
                <td className="py-3 text-center text-muted-foreground font-medium text-sm">{dept.resolvedIssues}</td>
                <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {dept.resolutionRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function IssueHotspotsCard() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { hotspots, loading } = useAnalytics();

  if (loading || !hotspots.length) return null;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-card h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">
            {language === "en" ? "Issue Hotspots" : "समस्या हॉटस्पॉट"}
          </h3>
        </div>
        <span className="text-xs text-muted-foreground font-semibold">
          {language === "en" ? "click → zoom map" : "क्लिक → मानचित्र"}
        </span>
      </div>
      <div className="space-y-3 flex-1">
        {hotspots.slice(0, 3).map((spot, idx) => (
          <button
            key={`${spot.latitude},${spot.longitude}`}
            onClick={() =>
              navigate(`${ROUTES.CIVIC_MAP}?lat=${spot.latitude}&lng=${spot.longitude}&zoom=14`)
            }
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 hover:border-primary/30 transition-all text-left group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate flex items-center gap-1.5 group-hover:text-primary transition-colors">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {spot.topCategory ?? (language === "en" ? "Mixed reports" : "मिश्रित")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                {spot.latitude.toFixed(3)}, {spot.longitude.toFixed(3)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-extrabold text-foreground">{spot.count}</p>
              <p className="text-xs font-bold text-rose-500">
                {spot.openCount} {language === "en" ? "open" : "खुले"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
