# Phase 5.8 — Verified Security Baseline

**Repository:** `/home/karlheinslourens/Projects/Karlin_ux`
**Branch:** `main`
**HEAD at baseline:** `06e694b` ("Allow super admin to use demo workspace features")
**Phase 5.7 commit:** `9d35e7c` ("Phase 5.7: CI/CD, security verification and technology integration")
**Working tree at baseline:** clean (`git status --porcelain` empty)
**Baseline date:** 2026-11-08

> Note on history: `main` is 5 commits ahead of `9d35e7c` (unrelated UI/UX work:
> `06e694b`, `4798f14`, `51262f0`, `14cc68f`, `a6c345e`). Those user changes are
> preserved; Phase 5.8 is applied on top of current `main`, not by resetting to `9d35e7c`.

---

## 1. Evidence availability

| Artefact requested by Phase 5.8 | Status |
|---|---|
| `PHASE_5.7_REPORT.md` | **Not present** in the working tree or anywhere in git history |
| Stored Trivy JSON/SARIF output from Phase 5.7 | **Not present** |
| Stored Bandit output from Phase 5.7 | **Not present** |
| CI pipeline | Present: `.github/workflows/ci.yml` |
| Container definitions | Present: `Backend/Dockerfile`, `docker-compose.yml`, `Backend/docker/Caddyfile` |
| Dependency manifests | Present: `Backend/requirements.txt`, `Frontend/package.json`, `Frontend/package-lock.json` |

Because the original scan artefacts do not exist, this baseline was **reconstructed by
re-running the scanners** with explicit, reproducible commands (section 6). The headline
numbers quoted in the Phase 5.8 brief (219 Trivy findings / 0 critical; 64 Bandit low)
could only be partially reproduced, as explained in section 5.

---

## 2. Toolchain used for verification

| Tool | Version |
|---|---|
| Trivy | 0.76.2 |
| Bandit | 1.9.4 |
| Gitleaks | 8.30.1 |
| Python (test venv) | 3.14.8 |
| PostgreSQL (local embedded, for tests) | 18.6 |
| Node.js / npm | 26.13.0 / 11.20.0 |

Scans were run against the repository at `06e694b` **before any Phase 5.8 edit**.

---

## 3. Bandit baseline — reproduced exactly

Command:

```bash
cd Backend
bandit -r . --exclude ./migrations -f json -o bandit-baseline.json
bandit -r . --exclude ./migrations -ll          # CI gate mode
```

**Result: 64 findings, all LOW severity, 0 MEDIUM, 0 HIGH.**
This matches the Phase 5.7 figure exactly.

| Test | Count | Meaning |
|---|---|---|
| B105 | 39 | hard-coded password string |
| B311 | 18 | use of non-cryptographic RNG |
| B106 | 6 | hard-coded password passed as function argument |
| B110 | 1 | `try` / `except` / `pass` |

Distribution:

| File | Findings | Tests |
|---|---|---|
| `demo/services.py` | 18 | B311 (demo-data generation) |
| `demo/tests.py` | 17 | B105 (test fixture passwords) |
| `accounts/tests.py` | 16 | B105 ×14, B106 ×2 (test fixtures) |
| `config/tests.py` | 5 | B105 ×1, B106 ×4 (test fixtures) |
| `media/tests.py` | 4 | B105 (test fixtures) |
| `accounts/models.py` | 1 | B105 — value is `'password_changed'` (status string, not a secret) |
| `accounts/serializers.py` | 1 | B105 — value is `'Passwords do not match.'` (validation message) |
| `accounts/signals.py` | 1 | B110 — `except Exception: pass` around demo seeding |
| `config/checks.py` | 1 | B105 — empty string default (`secret_key = ""`) |

CI currently runs Bandit with `-ll`, so none of these fail CI.

---

## 4. Trivy baseline

### 4.1 Filesystem scan (application dependencies, secrets, config)

Command:

```bash
trivy fs --scanners vuln,secret,misconfig --format json -o trivy-fs-baseline.json .
```

| Class | Severity | Finding |
|---|---|---|
| npm (lang-pkgs) | MEDIUM | `CVE-2026-118773` — `glob` 11.1.0 → fixed 14.0.2 (DoS via incomplete traversal cancellation) |
| npm (lang-pkgs) | MEDIUM | `CVE-2026-118764` — `minimatch` 10.2.6 → fixed 11.0.1 (DoS via crafted glob expansion) |
| Dockerfile (misconfig) | HIGH | `DS-0002` — image has no `USER`; runs as root |
| Secrets | — | **0 findings** |

Dependency path for the two npm findings (build-time only):

```
vite-plugin-pwa@2.0.0 → workbox-build@7.4.1 → glob@11.1.0 → minimatch@10.2.6
```

`npm audit` reports 6 advisories (2 low, 4 moderate), all rooted in the same
`vite-plugin-pwa → workbox-build` build-time tree.

### 4.2 Container image scans

Commands:

```bash
trivy image --format json -o <out>.json python:3.12-slim
trivy image --format json -o <out>.json postgres:18-alpine
trivy image --format json -o <out>.json caddy:2.10-alpine
```

| Image | Raw rows | Unique CVEs | CRITICAL | HIGH | MEDIUM | LOW | UNKNOWN |
|---|---:|---:|---:|---:|---:|---:|---:|
| `python:3.12-slim` (backend base) | 195 | 93 | 0 | 49 | 80 | 66 | 0 |
| `postgres:18-alpine` | 62 | 62 | 1 | 25 | 32 | 3 | 1 |
| `caddy:2.10-alpine` | 266 | 196 | 6 | 100 | 112 | 46 | 2 |

**Duplicate rows are common**: e.g. `libc6`/`libc-bin`, `libssl3`/`libcrypto3`, and
`libmount1`/`mount`/`util-linux` report the same CVE for the same underlying code.

#### Critical findings (all images)

| Image | CVE | Package | Installed → Fixed | Notes |
|---|---|---|---|---|
| `caddy:2.10-alpine` | CVE-2026-31789 | libssl3/libcrypto3 | 3.5.5-r0 → 3.5.6-r0 | OpenSSL heap overflow (32-bit) |
| `caddy:2.10-alpine` | CVE-2025-44005 | smallstep/certificates | v0.28.4 → 0.29.0 | Step CA |
| `caddy:2.10-alpine` | CVE-2026-30836 | smallstep/certificates | v0.28.4 → 0.30.0 | unauthenticated certificate issue |
| `caddy:2.10-alpine` | CVE-2026-33186 | google.golang.org/grpc | v1.73.0 → 1.79.3 | authz bypass |
| `caddy:2.10-alpine` | CVE-2025-68121 | Go stdlib | v1.25.0 → 1.25.7 | crypto/tls validation |
| `postgres:18-alpine` | CVE-2025-68121 | Go stdlib in `/usr/local/bin/gosu` | v1.24.6 → 1.24.13/1.25.7 | gosu privilege-drop helper |

#### Fixability

| Image | Fixable rows | Non-fixable rows |
|---|---:|---:|
| `python:3.12-slim` | 9 (zlib1g, pip) | 186 (Debian trixie "won't fix" / unfixed) |
| `postgres:18-alpine` | 62 (but all critical/high are inside the static `gosu` binary) | 0 |
| `caddy:2.10-alpine` | 196 unique | 0 |

The backend base (`python:3.12-slim`) has **no critical findings**, which is consistent
with the Phase 5.7 claim of "219 findings, zero critical": a scan of the *built backend
image* (195 base rows + ~24 rows from `libpq5`/`gosu`) would land near 219 with no
criticals. That scan, however, **never covered the `postgres` or `caddy` images**, where
all 7 criticals actually live. This is a coverage gap in Phase 5.7, not a contradiction
in the data.

### 4.3 Candidate patched images (measured, not yet applied)

| Image | Rows | CRITICAL | HIGH | MEDIUM | LOW | UNKNOWN |
|---|---:|---:|---:|---:|---:|---:|
| `caddy:2.11.9-alpine` | 7 | 0 | 2 | 4 | 0 | 1 |
| `postgres:18.6-alpine` | 62 | 1 | 25 | 32 | 3 | 1 |

Upgrading Caddy `2.10 → 2.11.9` removes 259 of 266 findings including all 6 criticals.
Postgres `18.6` is already the current 18.x release; its findings are all in the static
`gosu` binary (see section 7).

### 4.4 Gitleaks baseline

```bash
gitleaks detect --source . --no-git
```

**Result: 0 leaks.**

---

## 5. Reconciliation with the Phase 5.7 headline numbers

| Metric | Phase 5.7 claim | Reproduced baseline | Explanation |
|---|---|---|---|
| Trivy findings | 219 | 523 raw rows across 3 images; 195 for backend base | 5.7 appears to have scanned only the backend image; postgres/caddy were not covered |
| Trivy criticals | 0 | 7 raw critical rows (6 in caddy 2.10, 1 in postgres) | Coverage gap; backend base genuinely has 0 |
| Bandit low | 64 | 64 | Exact match |
| Bandit medium/high | 0 | 0 | Exact match |

The exact Phase 5.7 scan command/configuration cannot be verified because no report or
output was committed. The numbers above are the reproducible baseline for Phase 5.8.

---

## 6. Exact commands used

```bash
# Bandit
cd Backend && bandit -r . --exclude ./migrations -f json -o bandit-baseline.json
cd Backend && bandit -r . --exclude ./migrations -ll

# Trivy filesystem
trivy fs --scanners vuln,secret,misconfig --format json -o trivy-fs-baseline.json .

# Trivy images
trivy image --format json -o trivy-python-3.12-slim.json python:3.12-slim
trivy image --format json -o trivy-postgres-18-alpine.json postgres:18-alpine
trivy image --format json -o trivy-caddy-2.10-alpine.json caddy:2.10-alpine
trivy image --format json -o trivy-caddy-2.11.9-alpine.json caddy:2.11.9-alpine
trivy image --format json -o trivy-postgres-18.6-alpine.json postgres:18.6-alpine

# Trivy config
trivy config --format json -o trivy-config-baseline.json .

# Gitleaks
gitleaks detect --source . --no-git --report-format json --report-path gitleaks-baseline.json
```

---

## 7. Baseline risk assessment by category

| Category | Baseline state | Assessment |
|---|---|---|
| Backend OS packages | 195 rows, 0 critical, 186 unfixed Debian CVEs | Mostly old/"won't fix" Debian trixie items; fixable zlib + pip should be patched |
| Backend container runtime | runs as root at the Dockerfile level (gosu drops privileges at runtime) | Genuine hardening gap (`DS-0002`) |
| Postgres image | 1 critical / 25 high, all in static `gosu` | `gosu` only performs `execve` privilege drop; it does not use TLS/net/x509. Low exploitability, but cannot be removed without a custom image |
| Caddy image | 6 critical / 100 high on 2.10 | **Genuine and serious**; fixed by 2.11.9 |
| npm dependencies | 2 medium (build-time) | Not shipped to users; DoS only during build; upgrade/override if compatible |
| Dockerfile | no `USER` | Genuine; fix with non-root execution |
| Compose | no `no-new-privileges`, no cap drops, web/db writable | Genuine hardening opportunities |
| Secrets | 0 | No action |
| Bandit | 64 low | 19 are genuine (B311 RNG + B110 swallowed exception); 45 are test fixtures / false positives |

---

## 8. What Phase 5.8 must prove

1. Every change above is justified and does not break Django + DRF, React + TypeScript,
   PostgreSQL, workspace isolation, RBAC, uploads, health endpoints, or booking concurrency.
2. All regression gates run: Django tests + checks, backend lint, frontend typecheck/lint/build,
   Compose validation, image builds, Gitleaks, Bandit, Trivy.
3. Remaining findings are documented honestly; no silent suppressions.
