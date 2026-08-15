# Samadhan — Role and Permission Model

## Two-Role System

Samadhan exposes exactly **two user roles** to the product:

| Product Role | JWT scope label | Who holds it |
|---|---|---|
| **Citizen** | `citizen` | Any registered member of the public |
| **Administrator** | `dept_admin` | Municipal staff scoped to one department + one city |
| **Administrator** | `super_admin` | Municipal staff with city-wide, all-department access |

`dept_admin` and `super_admin` are **scopes of the Administrator role**, not separate roles. The scope boundary is enforced at the middleware layer (`requireDepartmentAccess`, `resolveCityScope`, `assertCityAccess`) so individual handlers do not need to repeat it.

The `isAdministrator(role)` helper in `rbac.ts` returns `true` for either Administrator scope and should be used wherever the code only needs to distinguish staff from the public.

---

## Scope Boundaries

| Scope | Department access | City access |
|---|---|---|
| `dept_admin` | Own department only | Own city only (from JWT claim) |
| `super_admin` | All departments | All cities (state-wide) |

A `dept_admin` with no city assigned resolves to the sentinel `""`, which matches no issue — they get an empty queue rather than inadvertent state-wide access (fail-closed by design).

---

## Permissions Matrix

| Action | Citizen | dept_admin (Administrator) | super_admin (Administrator) |
|---|:---:|:---:|:---:|
| **Issues** | | | |
| Report a new issue | ? | — | — |
| View own reported issues | ? | — | — |
| View all issues (city/dept scoped) | — | ? | ? |
| View all issues (state-wide) | — | — | ? |
| Transition issue status | — | ? (own dept + city) | ? |
| Close / resolve issue | — | ? (own dept + city) | ? |
| Support another citizen's issue | ? | — | — |
| Vote on resolution verification | ? | — | — |
| **Work Orders** | | | |
| View work orders (scoped) | — | ? (own dept + city) | ? |
| Create / update work order | — | ? (own dept) | ? |
| Reassign work order to another dept | — | — | ? |
| Transfer work order (coordination) | — | ? (own dept only) | ? |
| **Departments** | | | |
| View departments | — | ? (own) | ? (all) |
| Create / update department | — | — | ? |
| Manage routing rules | — | — | ? |
| **Analytics** | | | |
| View dashboard metrics (city scoped) | — | ? (own city) | ? |
| View dashboard metrics (state-wide) | — | — | ? |
| **AI features** | | | |
| Request AI categorisation (on submit) | ? | — | — |
| View AI metrics + call stats | — | ? | ? |
| View flagged-resolution review queue | — | — | ? |
| Request AI issue decomposition | — | ? | ? |
| **Notifications** | | | |
| Receive and read own notifications | ? | ? | ? |
| **Public transparency** | | | |
| View public scorecard | ? (unauthenticated) | ? | ? |
| **Uploads** | | | |
| Obtain signed Cloudinary upload URL | ? | ? | ? |

---

## Enforcement Points

| Middleware / helper | Where used | What it enforces |
|---|---|---|
| `authenticate` | All protected routes | Valid JWT required |
| `optionalAuthenticate` | Public routes that benefit from auth context | JWT parsed if present; not required |
| `requireRole("dept_admin", "super_admin")` | Staff-only routes | Citizen requests rejected with 403 |
| `requireRole("super_admin")` | City-wide admin routes | dept_admin requests rejected with 403 |
| `requireDepartmentAccess(paramName)` | Department-scoped routes | dept_admin can only reach their own department |
| `resolveCityScope(auth)` | List queries | Returns dept_admin's city or null for super_admin |
| `assertCityAccess(auth, issueCity)` | Per-record write actions | dept_admin cannot write to another city's records |
| `isAdministrator(role)` | Service-layer staff checks | Returns true for either Administrator scope |
