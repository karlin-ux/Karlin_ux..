# SECURITY

## Security scanning policy

CI runs three independent scanners. They have different jobs and different
blocking behaviour:

| Scanner | Scope | Blocks CI on |
|---|---|---|
| Gitleaks | Committed secrets | Any detected secret |
| Bandit | Python source (`Backend/`) | MEDIUM or HIGH severity |
| Trivy | Dependencies, secrets, Dockerfile/compose config, container images | Fixable CRITICAL/HIGH in the application; fixable CRITICAL in base images |

### Trivy severity policy

- **Application (filesystem + `karlin-backend` image):** fixable CRITICAL and
  HIGH findings block the build. `--ignore-unfixed` is used so the gate is
  actionable; unfixed findings are still shown in the non-blocking report.
- **Base images (`postgres`, `caddy`):** fixable CRITICAL findings block the
  build. HIGH findings are reported and reviewed, because upstream images
  routinely lag their bundled Go/OS dependencies. Base images are pinned to
  explicit minor versions so upgrades are deliberate.
- **Low/medium findings** are reported but never fail CI. They are reviewed in
  each phase report.

### Temporary exceptions

Temporary exceptions live in `.trivyignore`. Every entry must include:

1. the CVE or rule ID,
2. why the finding is not reachable/exploitable,
3. a review date.

Exceptions are re-checked at the review date and removed as soon as an upstream
fix is available. They are excluded from the blocking gate only; the finding
still appears in the SARIF and table reports.

### Reproducing the scans locally

```bash
# Bandit
cd Backend
pip install bandit==1.9.4
bandit -r . --exclude ./migrations -ll          # gate
bandit -r . --exclude ./migrations -f json -o bandit-report.json

# Trivy
trivy fs --scanners vuln,secret,misconfig --severity CRITICAL,HIGH \
  --ignore-unfixed --trivyignore .trivyignore --exit-code 1 .
trivy image --severity CRITICAL,HIGH --ignore-unfixed \
  --trivyignore .trivyignore --exit-code 1 karlin-backend:ci

# Gitleaks
gitleaks detect --source . --no-git
```

## Application security controls

- Secrets only via environment variables; `.env` is git-ignored.
- Backend permissions are enforced server-side; workspace isolation is tested.
- Uploads are stored privately and served only through authenticated endpoints.
- Production settings reject weak secret keys, localhost-only `ALLOWED_HOSTS`,
  missing CSRF origins, and disabled secure cookies / SSL redirect.
- Containers run as non-root (`web`), with `no-new-privileges`, dropped
  capabilities, and read-only root filesystems where the workload allows it.
