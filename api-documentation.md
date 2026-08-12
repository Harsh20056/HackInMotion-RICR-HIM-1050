# API Documentation

**Status: Pending Phase 2.**

The frontend currently runs against a local mock data layer
(`frontend/src/shared/mock/`) with no real API. Once the Phase 2 backend
exists, this file will document its endpoints (auth, issues, admin,
profile, documents, AI services) and request/response contracts.

Until then, the closest thing to an API contract is the frontend's own
`frontend/src/shared/contracts/` and `frontend/src/shared/types/domain/`
— the shapes each mock repository already returns, which a real backend
should match.

See [`docs/roadmap.md`](docs/roadmap.md) and
[`docs/phase-1-supabase-removal.md`](docs/phase-1-supabase-removal.md).
