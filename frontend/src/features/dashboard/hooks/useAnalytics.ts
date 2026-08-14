import { useCallback, useEffect, useState } from "react";
import {
  analyticsApi,
  AnalyticsOverview,
  DepartmentPerformanceRow,
  Hotspot,
  TrendPoint,
} from "../services/analyticsApi";
import { logger } from "@/shared/services/logger";
import { useAuth } from "@/features/auth";
import { adminService } from "@/features/admin/services/adminService";
import { UserRole } from "@/shared/types/domain/UserRole";
import { issueRepository } from "@/features/issues/repositories/issueRepository";
import { issueService } from "@/features/issues/services/issueService";

export interface AnalyticsBundle {
  overview: AnalyticsOverview | null;
  departments: DepartmentPerformanceRow[];
  hotspots: Hotspot[];
  trends: TrendPoint[];
  byPriority?: { nameEn: string; nameHi: string; count: number; color: string }[];
}

const EMPTY: AnalyticsBundle = { overview: null, departments: [], hotspots: [], trends: [], byPriority: [] };

function getCategoryCode(category: string): string {
  if (!category) return "";
  const normalized = category.toLowerCase().trim();
  if (normalized.includes("water")) return "water";
  if (normalized.includes("sanitation") || normalized.includes("garbage") || normalized.includes("trash")) return "sanitation";
  if (normalized.includes("electricity") || normalized.includes("electric") || normalized.includes("power")) return "electricity";
  if (normalized.includes("road")) return "roads";
  if (normalized.includes("park") || normalized.includes("garden")) return "parks";
  if (normalized.includes("building")) return "buildings";
  return normalized;
}

function doesCategoryBelongToDepartment(categoryCode: string, deptCode: string): boolean {
  const code = getCategoryCode(categoryCode);
  if (deptCode === "water_supply") return code === "water";
  return code === deptCode;
}

export function useAnalytics(months = 6) {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsBundle>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch raw analytics data
      const [overview, departmentsData, hotspotsData, trendsData] = await Promise.all([
        analyticsApi.overview(),
        analyticsApi.departments(),
        analyticsApi.hotspots(),
        analyticsApi.trends(months),
      ]);

      let scopedOverview = { ...overview };
      let scopedDepartments = [...departmentsData.items];
      let scopedHotspots = [...hotspotsData.items];
      let scopedTrends = [...trendsData.items];
      let scopedPriority: { nameEn: string; nameHi: string; count: number; color: string }[] = [];

      // 2. Resolve admin scope
      if (user?.id) {
        try {
          const roleInfo = await adminService.getUserRole(user.id);
          if (roleInfo.role === UserRole.DEPARTMENT_ADMIN) {
            const deptsList = await adminService.listDepartments();
            const myDept = deptsList.find(d => d.id === roleInfo.department);
            const myDeptCode = myDept?.code;

            if (myDeptCode) {
              // Get all issues to filter and recalculate precisely
              const issuesRaw = await issueRepository.fetchAllIssuesForMap();
              const issuesMapped = issuesRaw.map(item => issueService.mapResponseToDomain(item));
              
              const myIssues = issuesMapped.filter(issue => {
                if (roleInfo.city && (!issue.location || !issue.location.toLowerCase().includes(roleInfo.city.toLowerCase()))) {
                  return false;
                }
                const categoryObj: any = issue.category;
                const issueCategoryCode = categoryObj ? (typeof categoryObj === 'object' ? categoryObj.code : categoryObj) : '';
                if (!doesCategoryBelongToDepartment(issueCategoryCode, myDeptCode)) {
                  return false;
                }
                return true;
              });

              // Filter department list to only show the officer's own department
              scopedDepartments = scopedDepartments.filter(d => d.departmentId === roleInfo.department);
              const myDeptRow = scopedDepartments[0];

              // Recompute totals
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              const reportedThisWeek = myIssues.filter(i => new Date(i.createdAt) >= sevenDaysAgo).length;
              const supports = myIssues.reduce((acc, curr) => acc + curr.supportsCount, 0);
              const geoTagged = myIssues.filter(i => i.latitude !== null && i.longitude !== null).length;
              const reopened = myIssues.filter(i => (i.status as string) === 'reopened').length;
              const resolved = myIssues.filter(i => (i.status as string) === 'resolved' || (i.status as string) === 'closed' || (i.status as string) === 'verified').length;
              const open = myIssues.filter(i => (i.status as string) !== 'resolved' && (i.status as string) !== 'closed' && (i.status as string) !== 'verified' && (i.status as string) !== 'rejected').length;

              scopedOverview.totals = {
                issues: myIssues.length,
                geoTagged,
                reportedThisWeek,
                reopened,
                resolved,
                open,
                supports
              };

              // Recompute resolution times from department row
              scopedOverview.resolutionTime = {
                avgHours: myDeptRow?.avgResolutionHours ?? null,
                p90Hours: myDeptRow?.p90ResolutionHours ?? null
              };

              // Filter category breakdown
              scopedOverview.byCategory = scopedOverview.byCategory.filter(c => 
                doesCategoryBelongToDepartment(c.code, myDeptCode)
              );

              // Filter hotspots
              scopedHotspots = scopedHotspots.filter(h => {
                return myIssues.some(i => 
                  i.latitude && i.longitude && 
                  Math.abs(i.latitude - h.latitude) < 0.05 && 
                  Math.abs(i.longitude - h.longitude) < 0.05
                );
              });

              // Recompute trends
              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const last6Months: string[] = [];
              for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                last6Months.push(monthNames[d.getMonth()]);
              }

              scopedTrends = last6Months.map(mName => {
                const monthIssues = myIssues.filter(i => {
                  const iDate = new Date(i.createdAt);
                  return monthNames[iDate.getMonth()] === mName;
                });
                const reported = monthIssues.length;
                const resolvedCount = monthIssues.filter(i => 
                  (i.status as string) === 'resolved' || (i.status as string) === 'closed' || (i.status as string) === 'verified'
                ).length;
                return { month: mName, reported, resolved: resolvedCount };
              });

              // Recompute Priority distribution for single department admin
              const counts = {
                critical: myIssues.filter(i => i.priority === 1).length,
                high: myIssues.filter(i => i.priority === 2).length,
                medium: myIssues.filter(i => i.priority === 3 || i.priority === null || i.priority === undefined || !i.priority).length,
                low: myIssues.filter(i => i.priority === 4).length,
              };

              scopedPriority = [
                { nameEn: "Critical", nameHi: "गंभीर", count: counts.critical, color: "#ef4444" },
                { nameEn: "High", nameHi: "उच्च", count: counts.high, color: "#f97316" },
                { nameEn: "Medium", nameHi: "मध्यम", count: counts.medium, color: "#3b82f6" },
                { nameEn: "Low", nameHi: "निम्न", count: counts.low, color: "#64748b" },
              ];
            }
          }
        } catch (err) {
          logger.info("Could not scope useAnalytics data to officer:", err);
        }
      }

      setData({
        overview: scopedOverview,
        departments: scopedDepartments,
        hotspots: scopedHotspots,
        trends: scopedTrends,
        byPriority: scopedPriority,
      });
      setError(null);
    } catch (err: any) {
      logger.error("Failed to load analytics:", err);
      setError(err?.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [months, user]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, error, refetch: load };
}
