// TEMPORARY — backend pending (Phase 2)
// Small seed dataset so the dashboard/map aren't empty on a fresh local
// install with no backend. Mirrors the shape of IssueResponse.

import { IssueResponse } from "@/shared/contracts/IssueResponse";

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

export const SEED_ISSUES: IssueResponse[] = [
  {
    id: "seed-issue-1",
    user_id: "seed-user",
    title: "Large pothole near market road",
    description: "Deep pothole causing traffic slowdowns and risk to two-wheelers.",
    category: "Roads",
    location: "MG Road, Indore, Madhya Pradesh",
    latitude: 22.7196,
    longitude: 75.8577,
    status: "reported",
    image_urls: null,
    supports_count: 12,
    master_issue_id: null,
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  },
  {
    id: "seed-issue-2",
    user_id: "seed-user",
    title: "Overflowing garbage bin",
    description: "Bin has not been cleared in over a week, causing foul smell.",
    category: "Sanitation",
    location: "Sector 12, Bhopal, Madhya Pradesh",
    latitude: 23.2599,
    longitude: 77.4126,
    status: "in_progress",
    image_urls: null,
    supports_count: 7,
    master_issue_id: null,
    created_at: daysAgo(9),
    updated_at: daysAgo(2),
  },
  {
    id: "seed-issue-3",
    user_id: "seed-user",
    title: "Streetlight outage on residential lane",
    description: "Streetlight has been non-functional for two weeks, unsafe at night.",
    category: "Electricity",
    location: "Koramangala, Bengaluru, Karnataka",
    latitude: 12.9716,
    longitude: 77.5946,
    status: "resolved",
    image_urls: null,
    supports_count: 3,
    master_issue_id: null,
    created_at: daysAgo(20),
    updated_at: daysAgo(15),
  },
];
