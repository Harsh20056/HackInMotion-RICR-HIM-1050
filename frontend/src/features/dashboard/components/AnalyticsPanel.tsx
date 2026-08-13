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
  const { overview, departments, hotspots, trends, loading, error } = useAnalytics();

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
      <div className="bg-muted/30 border border-border rounded-2xl p-8 text-center">
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

  const categoryData = overview.byCategory.map((c) => ({
    name: c.nameEn,
    count: c.count,
    color: CATEGORY_COLORS[c.nameEn] ?? "#6366f1",
  }));

  const statusData = overview.byStatus.map((s) => ({
    name: STATUS_LABELS[s.status]?.[language] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#6366f1",
  }));

  const trendData = trends.map((t) => ({ month: t.month, reported: t.reported, resolved: t.resolved }));

  const handleCategoryClick = (category: string) =>
    navigate(`${ROUTES.CIVIC_MAP}?category=${encodeURIComponent(category)}`);

  return (
    <div className="space-y-6">
      {/* Panel Summary Subtitle */}
      <div className="-mt-2">
        <p className="text-xs text-muted-foreground">
          {language === "en"
            ? `${overview.totals.issues} issues · ${overview.totals.geoTagged} geo-tagged · ${formatResolutionTime(overview.resolutionTime.avgHours, "en")} avg. resolution`
            : `${overview.totals.issues} समस्याएं · ${overview.totals.geoTagged} जियो-टैग · ${formatResolutionTime(overview.resolutionTime.avgHours, "hi")} औसत समाधान`}
        </p>
      </div>

      {/* Category + status distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {language === "en" ? "Issues by Category" : "श्रेणी अनुसार समस्याएं"}
            </h3>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {language === "en" ? "click → filter map" : "क्लिक → मानचित्र फ़िल्टर"}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415533" horizontal={false} />
              <XAxis type="number" tick={TICK} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={TICK} width={110} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#64748b18" }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} onClick={(d: any) => handleCategoryClick(d.name)}>
                {categoryData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} className="cursor-pointer" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {language === "en" ? "Status Distribution" : "स्थिति वितरण"}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {statusData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reported vs resolved trend */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">
            {language === "en" ? "Reported vs Resolved" : "दर्ज बनाम हल"}
          </h3>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {language === "en" ? "last 6 months" : "पिछले 6 महीने"}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#33415533" />
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

      {/* Narrative summary — built from the figures above, nothing invented */}
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/15 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            {language === "en" ? "Civic Summary" : "नागरिक सारांश"}
          </h3>
        </div>
        <p
          className="text-sm text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={parseBoldText(
            language === "en" ? summary.summaryTextEn : summary.summaryTextHi
          )}
        />
        <ul className="mt-4 space-y-2">
          {(language === "en" ? summary.insightsEn : summary.insightsHi).map((insight, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                {idx + 1}
              </span>
              <span dangerouslySetInnerHTML={parseBoldText(insight)} />
            </li>
          ))}
        </ul>
      </div>

      {/* Department performance */}
      {departments.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {language === "en" ? "Department Performance" : "विभागीय प्रदर्शन"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-semibold">{language === "en" ? "Department" : "विभाग"}</th>
                  <th className="text-right py-2 font-semibold">{language === "en" ? "Open" : "खुले"}</th>
                  <th className="text-right py-2 font-semibold">{language === "en" ? "Resolved" : "हल"}</th>
                  <th className="text-right py-2 font-semibold">{language === "en" ? "Rate" : "दर"}</th>
                  <th className="text-right py-2 font-semibold">{language === "en" ? "Avg" : "औसत"}</th>
                  <th className="text-right py-2 font-semibold">P90</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.departmentId} className="border-b border-border/40 last:border-0">
                    <td className="py-2 font-medium text-foreground">{dept.nameEn}</td>
                    <td className="py-2 text-right text-muted-foreground">{dept.openIssues}</td>
                    <td className="py-2 text-right text-muted-foreground">{dept.resolvedIssues}</td>
                    <td className="py-2 text-right font-semibold text-foreground">{dept.resolutionRate}%</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {formatResolutionTime(dept.avgResolutionHours, language)}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {formatResolutionTime(dept.p90ResolutionHours, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Geographic hotspots (PostGIS grid clusters) */}
      {hotspots.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Map className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {language === "en" ? "Issue Hotspots" : "समस्या हॉटस्पॉट"}
            </h3>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {language === "en" ? "click → zoom map" : "क्लिक → मानचित्र"}
            </span>
          </div>
          <div className="space-y-2">
            {hotspots.slice(0, 5).map((spot, idx) => (
              <button
                key={`${spot.latitude},${spot.longitude}`}
                onClick={() =>
                  navigate(`${ROUTES.CIVIC_MAP}?lat=${spot.latitude}&lng=${spot.longitude}&zoom=14`)
                }
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 hover:border-primary/20 transition-all text-left"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                    {spot.topCategory ?? (language === "en" ? "Mixed reports" : "मिश्रित")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {spot.latitude.toFixed(3)}, {spot.longitude.toFixed(3)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{spot.count}</p>
                  <p className="text-[10px] text-amber-500">
                    {spot.openCount} {language === "en" ? "open" : "खुले"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
