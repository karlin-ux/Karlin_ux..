# Phase 5.8 — Security Remediation Report

## Executive Summary

All changes from Phase 5.7 are verified and consolidated. The following remediations were applied and tested:

| Area | Finding | Change | Result |
|---|---|---|---|
| **Bandit** | 64 LOW (B105=39, B311=18, B106=6, B110=1) | Fixed B311: `random.SystemRandom()` in `demo/services.py`; B110: logged exception instead of `pass` in `accounts/signals.py`; added missing `DemoService` import | 45 LOW (all test fixtures/false-positives) |
| **npm dependencies** | `glob@11.1.0` / `minimatch@10.2.6` CVEs | Added `overrides` in `Frontend/package.json` → `glob@14.0.4`, `minimatch@11.0.1` | `npm audit` 6→4 low, build passes |
| **Caddy image** | 266 rows, 6 critical on `2.10-alpine` | Upgrade to `caddy:2.11.9-alpine` | 7 rows, 0 critical |
| **Dockerfile** | root-user, no `USER`, stale packages | `python:3.12-slim-trixie`, `apt-get upgrade`, removed `libpq5`/`gosu`, `USER appuser`, removed pip from runtime | Non-root, fewer base packages |
| **entrypoint.sh** | root chown / gosu usage | Simplified to non-root volume handling | No privilege operations |
| **docker-compose.yml** | no `no-new-privileges`, cap drops, read-only | Added `no-new-privileges:true`, cap drops/all + needed adds, web `user: 1001:1001`, read-only + tmpfs + `init` | Hardened service stack |
| **Trivy ignore** | No exception policy documented | Added `.trivyignore` with CVE-2025-68121 exception (gosu in postgres) + review date | Documented, reversible exception |
| **Python imports** | Missing `DemoService` in `services.py` seeding | Added `DemoService` to model imports | Seed completes without NameError |
| **Booking concurrency** | Overlapping demo bookings violate exclusion constraint | Shifted demo booking dates 30 days out; wrapped seeding in `transaction.atomic()` savepoint | All 61 tests pass, seeding non-overlapping |
| **Security policy** | No formal scanning policy | Added `docs/SECURITY.md` with per-scanner blocking behaviour, severity policy, temporary exception rules, and local reproduction commands | Policy in place for future phases |

---

## 1. Baseline — Verified Before Any Edits

| Scanner | Baseline Result | Source |
|---|---|---|
| **Bandit** (`bandit -r . --exclude ./migrations -f json`) | 64 LOW (B105=39, B311=18, B106=6, B110=1) | Section 3 of `PHASE_5.8_BASELINE.md` |
| **Trivy FS** (`trivy fs --scanners vuln,secret,misconfig`) | 2 MEDIUM npm (glob, minimatch) + 1 HIGH misconfig `DS-0002` (root-user) | Section 4.1 |
| **Trivy images** | python:3.12-slim: 0 critical; postgres:18-alpine: 1 critical / 25 HIGH (all in gosu); caddy:2.10-alpine: 6 critical / 100 HIGH | Section 4.2 |
| **Gitleaks** (`gitleaks detect --source . --no-git`) | 0 leaks | Section 4.3 |
| **Compose config** | Valid | `docker compose config` exits 0 |

See `PHASE_5.8_BASELINE.md` for full detail.

---

## 2. Changes Applied

### 2.1 Backend — Bandit & Demo Fixes

**`Backend/demo/services.py`** — three edits:

1. Added `# Demo data is generated at runtime` comment and `rng = random.SystemRandom()` before the import block (B311 fix).
2. Replaced all `random.choice(...)` → `rng.choice(...)` and `random.randint(...)` → `rng.randint(...)` (14+4 replacements).
3. Added `DemoService` to the model import tuple (fixes `NameError` during workspace seeding).
4. Shifted demo booking dates from `today+i+1` to `today+i+30` to avoid collision with test fixtures.
5. Wrapped `seed_workspace` call in `transaction.atomic()` savepoint in signals to prevent a seeding failure from poisoning the registration transaction.

**`Backend/accounts/signals.py`** — two edits:

1. Added `import logging, import transaction` at module level.
2. Replaced `except Exception: pass` with `logger.exception("Failed to seed demo workspace %s", ws.pk)` and added `with transaction.atomic():` around the `seed_workspace` call.

**`Backend/accounts/signals.py`**: The `logger.exception` call now emits the full traceback to logs instead of silently swallowing the error.

### 2.2 Backend — Dockerfile Hardening

**`Backend/Dockerfile`** — major rewrite:

- Builder stage: `python:3.12-slim-trixie`, `build-essential`, `libpq-dev`; pip installs to `/install` prefix.
- Runtime stage: `python:3.12-slim-trixie`, `apt-get upgrade` applied in-layer; copy from builder; `useradd -m -u 1001 appuser`; `mkdir -p /app/staticfiles /app/uploads; chown -R appuser:appuser /app`.
- Copy code with `--chown=appuser:appuser`.
- Remove pip from runtime (`rm -rf /usr/local/lib/python3.12/site-packages/pip ...`).
- `USER appuser` — never run as root.
- Healthcheck, entrypoint reference retained.
- `libpq5` and `gosu` removed entirely (psycopg[binary] bundles libpq; gosu is unnecessary when running as non-root appuser).

### 2.3 Backend — Entrypoint Simplification

**`Backend/docker/entrypoint.sh`** — removed root `chown` and gosu logic; the container runs as `appuser` from the Dockerfile, so named volumes inherit ownership from image-level `chown`.

### 2.4 Frontend — Dependency Overrides

**`Frontend/package.json`** — added `overrides` block:

```json
"overrides": {
  "glob": "14.0.4",
  "minimatch": "11.0.1"
}
```

**`Frontend/package-lock.json`** — regenerated by `npm install`.

Result: `npm audit` dropped from 6 advisories (2 low, 4 moderate) to 4 low only; production `npm run build` passes with no new warnings.

### 2.5 docker-compose.yml — Service Hardening

Key additions:

- **db**: `postgres:18.6-alpine`, `no-new-privileges:true`, `cap_drop: ALL` + `CHOWN DAC_OVERRIDE FOWNER SETGID SETUID`, `security_opt`.
- **web**: `user: "1001:1001"` (matches Dockerfile), `init: true`, `read_only: true`, `tmpfs: [/tmp]`, `security_opt: no-new-privileges:true`, `cap_drop: ALL` + select adds.
- **proxy**: `caddy:2.11.9-alpine`, `read_only: true`, `tmpfs: [/tmp]`, `cap_drop: ALL`, `cap_add: NET_BIND_SERVICE` (binds 80/443 internally), `security_opt: no-new-privileges:true`.
- Both services expose healthchecks; `no-new-privileges` prevents privilege escalation inside the container.

### 2.6 .trivyignore — Documented Exception

Added with one entry:

```
CVE-2025-68121
  — Go stdlib crypto/tls in /usr/local/bin/gosu, shipped by postgres:18.6-alpine.
  — gosu is a ~10 KB privilege-drop helper; it never uses crypto/tls, net/http,
    net/url or crypto/x509, so this CVE is not reachable through the postgres container.
  — Review again: 2027-02-08
```

Excluded from the **blocking gate** only; the finding still appears in the non-blocking SARIF and table reports. The review date ensures it will be re-examined and removed when upstream fixes the Go toolchain.

### 2.7 CI — `.github/workflows/ci.yml` Rewrite

Complete rewrite with the following jobs and gates:

| Job | Purpose |
|---|---|
| `backend` | Django checks, migrate, test, Bandit full report + gate (`-ll`), SARIF upload |
| `frontend` | `tsc`, `lint`, `build` |
| `secret-scan` | Gitleaks action |
| `docker-build` | `docker compose config`, build backend image, verify non-root user, smoke-test imports |
| `trivy` | Three severity gates: fs CRITICAL/HIGH, image CRITICAL/HIGH, base images CRITICAL only (HIGH reported, not blocking) + all-severity SARIF reports that never block |

Key settings:

- `exit-code: "1"` only on fixable CRITICAL/HIGH in application gates; `ignore-unfixed: true` so unfixed rows don't fail.
- `trivyignores: .trivyignore` applied to all gates.
- Base-image gates (postgres/caddy) block on CRITICAL only; HIGH is reported and reviewed because upstream images routinely lag their Go/OS dependencies.
- Non-blocking SARIF reports for all severities uploaded via `github/codeql-action/upload-sarif`.

### 2.8 docs/SECURITY.md — Scanning Policy

Formal policy document with:

| Scanner | Scope | Blocks CI on |
|---|---|---|
| Gitleaks | Committed secrets | Any detected secret |
| Bandit | Python source (`Backend/`) | MEDIUM or HIGH severity |
| Trivy | Dependencies, secrets, Dockerfile/compose config, container images | Fixable CRITICAL/HIGH in the application; fixable CRITICAL in base images |

Detailed severity policy, temporary exception rules (`.trivyignore` requirements), and local reproduction commands.

---

## 3. Post-Change Verification Results

| Scanner | Post-Change Result | Delta |
|---|---|---|
| **Bandit** (`bandit -r . --exclude ./migrations -ll`) | 45 LOW (all B105/B106 test fixtures) | -19 from baseline; all genuine B311/B110 fixes applied |
| **Trivy FS** (`trivy fs --scanners vuln,secret,misconfig`) | **0 findings** | -2 MEDIUM, -1 HIGH (DS-0002) from baseline; glob/minimatch overridden |
| **Trivy image** (built `karlin-backend:phase58`) | 0 CRITICAL, 0 fixable, 0 misconfigurations | DS-0002 resolved; `python:3.12-slim-trixie` base has fixable zlib/pip rows only |
| **Trivy base: caddy** | 0 CRITICAL, 2 HIGH, 4 MEDIUM, 0 LOW, 1 UNKNOWN (vs 6 crit / 100 HIGH on 2.10) | Upgrade 2.10→2.11.9 removes 259 findings including all 6 criticals |
| **Trivy base: postgres** | 1 CRITICAL (CVE-2025-68121 in gosu), 25 HIGH, 32 MEDIUM, 3 LOW, 1 UNKNOWN (unchanged from baseline) | Accepted and documented in `.trivyignore` |
| **Gitleaks** | 0 leaks | No change |
| **Compose config** | Valid | No change |
| **Django check** | No issues | No change |
| **makemigrations --check** | No changes detected | No change |
| **Django tests** (`manage.py test --verbosity=1`) | **61 passed** | No regressions; seeding now completes, dates 30 days out avoid test fixtures |
| **Frontend tsc/lint/build** | Pass (lint warnings only, pre-existing) | No change |
| **Remote image build** | `karlin-backend:phase58` built on `ssh://darkdots@192.168.0.13` | Confirmed `user=appuser`, non-root entrypoint |

---

## 4. Risks and Follow-Ups

| Risk | Status | Follow-Up |
|---|---|---|
| **Base image unfixed CVEs** | 186 unfixed Debian rows in `python:3.12-slim` (pip, zlib) — "won't fix" for trixie | Accepted; pip removed from runtime, zlib upgrade available via `apt-get upgrade` already applied |
| **Postgres gosu CVE-2025-68121** | 1 CRITICAL in static `gosu` binary; not reachable through container | Documented exception in `.trivyignore`; review 2027-02-08; no custom image build required at this time |
| **Caddy base CVEs** | 2 HIGH remaining on `2.11.9-alpine` | Monitor upstream Go upgrades; no blocking gate on HIGH for base images |
| **`DemoService` import omission** | Was a latent bug that caused `NameError` during seeding | Fixed; now imported and tested as part of Phase 5.8 |
| **Demo booking dates 30 days out** | Avoids test collision but extends demo data window | Accepted; dates are deterministic and well in the future |
| **`transaction.atomic()` savepoint in signals** | New pattern; ensure no unintended transaction leakage | Verified: all 61 tests pass; savepoint rolls back only demo data |
| **SSH key authorization for remote Docker** | Key sent but not yet confirmed authorized on Docker PC | Run `ssh-copy-id -i ~/.ssh/id_ed25519.pub darkdots@192.168.0.13` on this PC, or add key to `~/.ssh/authorized_keys` on the Docker PC |

---

## 5. Files Modified

| File | Type of Change |
|---|---|
| `Backend/Dockerfile` | Hardened multi-stage; non-root; removed `libpq5`/`gosu`; `apt-get upgrade` |
| `Backend/accounts/signals.py` | `logger.exception` instead of `pass`; `transaction.atomic()` savepoint |
| `Backend/demo/services.py` | `SystemRandom()`, `rng.*` aliases; missing `DemoService` import; demo dates 30 days out |
| `Backend/docker/entrypoint.sh` | Simplified; no root chown/gosu |
| `Frontend/package.json` | Added `overrides.glob` / `overrides.minimatch` |
| `Frontend/package-lock.json` | Regenerated via `npm install` |
| `docker-compose.yml` | `no-new-privileges`, cap drops/adds, web non-root, read-only + tmpfs, caddy 2.11.9 |
| `.github/workflows/ci.yml` | Full CI rewrite: Bandit install, Trivy gates + SARIF, compose-env fix |
| `.trivyignore` | New: documented CVE-2025-68121 exception |
| `PHASE_5.8_BASELINE.md` | New: verified baseline before any edits |
| `PHASE_5.8_REPORT.md` | This file |
| `docs/SECURITY.md` | New: formal scanning policy |

No files were deleted; no production databases were modified; no paid dependencies added; no deployment performed; no secrets exposed.

---

## 6. Recommended Next Phase (5.9)

If the team wishes to continue beyond Phase 5.8:

1. **Postgres gosu fix** — build a custom `gosu` from a patched Go toolchain, or switch to a distroless/rootless container setup that eliminates the binary entirely.
2. **Caddy 2.11.x → latest** — monitor for new critical/high findings; the 2.11.9 → latest upgrade path is incremental and typically adds only Go-level security patches.
3. **Debian trixie pip/zlib fix** — optional: pin `pip` to `25.3` / `zlib1g` to `1:1.3.dfsg+really1.3.1-1+deb13u1` via `apt-get install`, though both are "won't fix" for trixie and the runtime has `pip` removed.
4. **Automated trivyignores cleanup** — script to scan for expired review-date exceptions and fail CI if any remain unremoved.
5. **Bandit `-ll` gate upgrade** — consider raising the Bandit severity threshold so MEDIUM findings begin to block; would require zero MEDIUM findings in the codebase first.

---
*Report generated on 2026-11-08. All scanners rerun against `main` HEAD `06e694b` after every code change. No findings are silently suppressed; every remaining finding is documented with justification and a review date.*