import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const temporaryDirectories = [];
const checkerPath = resolve("scripts/check-security-report.mjs");
const dash = String.fromCodePoint(0x2014);

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const runChecker = ({ vulnerabilities, findingSeverity, auditExitCode = 1 }) => {
  const directory = mkdtempSync(join(tmpdir(), "security-report-check-"));
  temporaryDirectories.push(directory);

  const reportPath = join(directory, "security-report.md");
  const auditPath = join(directory, "npm-audit.json");
  const hasFinding = findingSeverity !== undefined;
  const count = (severity) => Number(findingSeverity === severity);

  writeFileSync(
    reportPath,
    `# Security Audit

Date: 2026-09-26T09:00:00Z
Commit: ${"a".repeat(40)}

## Summary

Critical: ${count("Critical")}
High: ${count("High")}
Medium: ${count("Medium")}
Low: ${count("Low")}
Informational: ${count("Informational")}

## Findings

${hasFinding ? `### SEC-001 ${dash} Example

Severity: ${findingSeverity}
` : "No findings.\n"}
## Dependency Audit

Audit completed.

## Additional observations

None.
`,
  );
  writeFileSync(auditPath, JSON.stringify({ metadata: { vulnerabilities } }));

  return spawnSync(process.execPath, [checkerPath, reportPath, auditPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      NPM_CI_EXIT_CODE: "0",
      NPM_AUDIT_EXIT_CODE: String(auditExitCode),
      OPENCODE_INSTALL_OUTCOME: "success",
      OPENCODE_OUTCOME: "success",
    },
  });
};

describe("security report threshold", () => {
  it("reports Medium findings without failing", () => {
    const result = runChecker({
      findingSeverity: "Medium",
      vulnerabilities: { critical: 0, high: 0, moderate: 1, low: 0, info: 0 },
    });

    expect(result.status).toBe(0);
  });

  it("fails for a High application finding", () => {
    const result = runChecker({
      findingSeverity: "High",
      vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0, info: 0 },
      auditExitCode: 0,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("high findings");
  });

  it("fails for a High dependency vulnerability", () => {
    const result = runChecker({
      vulnerabilities: { critical: 0, high: 1, moderate: 0, low: 0, info: 0 },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("npm audit found");
  });

  it("fails closed when dependency audit output is incomplete", () => {
    const result = runChecker({ vulnerabilities: undefined });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("valid vulnerability counts");
  });
});
