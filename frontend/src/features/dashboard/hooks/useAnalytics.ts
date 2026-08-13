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
 * One shared fetch per `months` window, not one per component.
 *
 * The dashboard mounts this hook from four places (the page itself, the chart
 * panel, and the two performance cards). Each instance used to run its own
 * four requests, so a single dashboard load fired every analytics endpoint
 * four times over. Concurrent callers now join the in-flight promise and
 * later mounts read the cache.
 */
const cache = new Map<number, AnalyticsBundle>();
const inFlight = new Map<number, Promise<AnalyticsBundle>>();
const listeners = new Map<number, Set<() => void>>();

function notify(months: number) {
  listeners.get(months)?.forEach((fn) => fn());
}

async function fetchBundle(months: number): Promise<AnalyticsBundle> {
  const [overview, departments, hotspots, trends] = await Promise.all([
    analyticsApi.overview(),
    analyticsApi.departments(),
    analyticsApi.hotspots(),
    analyticsApi.trends(months),
  ]);
  return {
    overview,
    departments: departments.items,
    hotspots: hotspots.items,
    trends: trends.items,
  };
}

function loadShared(months: number, force = false): Promise<AnalyticsBundle> {
  const existing = inFlight.get(months);
  if (existing && !force) return existing;

  const promise = fetchBundle(months)
    .then((bundle) => {
      cache.set(months, bundle);
      inFlight.delete(months);
      notify(months);
      return bundle;
    })
    .catch((err) => {
      inFlight.delete(months);
      throw err;
    });

  inFlight.set(months, promise);
  return promise;
}

/**
 * Loads every analytics figure from the server. Nothing is aggregated or
 * predicted client-side, so whatever renders here is what the database
 * actually contains.
 */
export function useAnalytics(months = 6) {
  const [data, setData] = useState<AnalyticsBundle>(() => cache.get(months) ?? EMPTY);
  const [loading, setLoading] = useState(() => !cache.has(months));
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (force: boolean) => {
      setLoading(true);
      return loadShared(months, force)
        .then((bundle) => {
          setData(bundle);
          setError(null);
        })
        .catch((err: any) => {
          logger.error("Failed to load analytics:", err);
          setError(err?.message || "Could not load analytics.");
        })
        .finally(() => setLoading(false));
    },
    [months]
  );

  useEffect(() => {
    let active = true;

    const onChange = () => {
      if (active) setData(cache.get(months) ?? EMPTY);
    };
    const set = listeners.get(months) ?? new Set();
    set.add(onChange);
    listeners.set(months, set);

    const cached = cache.get(months);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      void run(false);
    }

    return () => {
      active = false;
      set.delete(onChange);
    };
  }, [months, run]);

  const refetch = useCallback(() => run(true), [run]);

  return { ...data, loading, error, refetch };
}
