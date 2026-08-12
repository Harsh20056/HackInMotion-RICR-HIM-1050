import { useCallback, useEffect, useState } from "react";
import {
  analyticsApi,
  AnalyticsOverview,
  DepartmentPerformanceRow,
  Hotspot,
  TrendPoint,
} from "../services/analyticsApi";
import { logger } from "@/shared/services/logger";

export interface AnalyticsBundle {
  overview: AnalyticsOverview | null;
  departments: DepartmentPerformanceRow[];
  hotspots: Hotspot[];
  trends: TrendPoint[];
}

const EMPTY: AnalyticsBundle = { overview: null, departments: [], hotspots: [], trends: [] };

/**
 * Loads every analytics figure from the server. Nothing is aggregated or
 * predicted client-side, so whatever renders here is what the database
 * actually contains.
 */
export function useAnalytics(months = 6) {
  const [data, setData] = useState<AnalyticsBundle>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, departments, hotspots, trends] = await Promise.all([
        analyticsApi.overview(),
        analyticsApi.departments(),
        analyticsApi.hotspots(),
        analyticsApi.trends(months),
      ]);
      setData({
        overview,
        departments: departments.items,
        hotspots: hotspots.items,
        trends: trends.items,
      });
      setError(null);
    } catch (err: any) {
      logger.error("Failed to load analytics:", err);
      setError(err?.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, error, refetch: load };
}
