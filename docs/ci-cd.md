# CI/CD automation

## Pull request CI

`.github/workflows/ci.yml` runs for opened, updated, reopened, and ready-for-review pull requests. It uses Node.js 22 and the npm lockfile, then runs these checks sequentially:

```text
npm ci → npm run lint → npm run typecheck → npm run test → npm run build
```

The workflow has read-only repository permissions and requires no secrets.

## OpenCode pull request review

`.github/workflows/code-review.yml` starts after the CI workflow completes for a pull request. It retrieves the diff through the GitHub API and checks out the PR base for context; it does not check out or execute the PR head. This also allows reviews of fork PRs without exposing the OpenCode key to their CI jobs.

The `code-reviewer` agent is read-only. It uses OpenCode Go's `kimi-k3` model, and the workflow publishes its report as a PR review. The report is also retained as an artifact for 14 days. The OpenCode API key is available only to the review job; the separate publishing job receives only the permission needed to submit a PR review.

## Weekly security audit

`.github/workflows/security-audit.yml` runs every Monday at 09:00 UTC and can be started manually from **Actions → Security Audit → Run workflow** on the default branch. It installs the locked dependencies, runs `npm audit`, then invokes the read-only `security-auditor` agent using OpenCode Go's `kimi-k3` model.

The audit does not create corrective pull requests. Its `security-report.md` and raw npm audit output are available in the workflow run's **Artifacts** for 30 days. Critical or High findings fail the workflow; Medium, Low, and Informational findings are reported without failing it. An incomplete audit also fails rather than being treated as clean.

## GitHub configuration

Add the OpenCode Go API key as the GitHub Actions secret **`OPENCODE_API_KEY`**. It is required by both OpenCode workflows; there is no OpenCode secret in the CI workflow. The workflows use the automatically provided `GITHUB_TOKEN` with narrowly scoped permissions and need no PAT.

The OpenCode workflows send the diff or repository content needed for analysis to OpenCode Go. Configure the secret only if that data-sharing behavior is acceptable for this repository.
