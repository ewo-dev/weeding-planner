import { readFile } from "node:fs/promises";

const [reportPath = "security-report.md", auditPath = "npm-audit.json"] = process.argv.slice(2);
const failures = [];

const getSection = (report, name) => {
  const heading = report.match(new RegExp(`^## ${name}\\s*$`, "m"));
  if (!heading) return undefined;

  const remaining = report.slice(heading.index + heading[0].length);
  const nextHeading = remaining.search(/^## /m);
  return nextHeading === -1 ? remaining : remaining.slice(0, nextHeading);
};

const exitCode = (name) => {
  const raw = process.env[name];
  if (!raw || !/^\d+$/.test(raw)) return null;

  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
};

const npmCiExitCode = exitCode("NPM_CI_EXIT_CODE");
if (npmCiExitCode !== 0) failures.push(`npm ci did not succeed (exit code: ${npmCiExitCode ?? "unknown"})`);

const npmAuditExitCode = exitCode("NPM_AUDIT_EXIT_CODE");
if (npmAuditExitCode === null) failures.push("npm audit did not produce an exit status");
if (npmAuditExitCode !== null && npmAuditExitCode > 1) {
  failures.push(`npm audit failed unexpectedly (exit code: ${npmAuditExitCode})`);
}

if (process.env.OPENCODE_INSTALL_OUTCOME !== "success") {
  failures.push("OpenCode CLI installation did not succeed");
}
if (process.env.OPENCODE_OUTCOME !== "success") {
  failures.push("OpenCode security audit did not complete");
}

let report = "";
try {
  report = await readFile(reportPath, "utf8");
} catch {
  failures.push(`Security report is missing: ${reportPath}`);
}

if (!/^# Security Audit\s*$/m.test(report)) failures.push("Security report is missing its title");
if (!/^Date:\s*\S+/m.test(report)) failures.push("Security report is missing its date");
if (!/^Commit:\s*[0-9a-f]{40}\s*$/m.test(report)) failures.push("Security report is missing its commit SHA");
if (!/^## Findings\s*$/m.test(report)) failures.push("Security report is missing its Findings section");
if (!/^## Dependency Audit\s*$/m.test(report)) failures.push("Security report is missing its Dependency Audit section");
if (!/^## Additional observations\s*$/m.test(report)) {
  failures.push("Security report is missing its Additional observations section");
}

let audit;
try {
  audit = JSON.parse(await readFile(auditPath, "utf8"));
} catch {
  failures.push(`npm audit output is missing or invalid JSON: ${auditPath}`);
}

const dependencyCounts = audit?.metadata?.vulnerabilities;
if (
  !dependencyCounts ||
  !["critical", "high", "moderate", "low", "info"].every((severity) =>
    Number.isInteger(dependencyCounts[severity]),
  )
) {
  failures.push("npm audit did not provide valid vulnerability counts");
} else if (dependencyCounts.critical > 0 || dependencyCounts.high > 0) {
  failures.push(
    `npm audit found ${dependencyCounts.critical} critical and ${dependencyCounts.high} high vulnerabilities`,
  );
} else if (
  npmAuditExitCode === 1 &&
  dependencyCounts.moderate === 0 &&
  dependencyCounts.low === 0 &&
  dependencyCounts.info === 0
) {
  failures.push("npm audit returned a non-zero exit code without reporting vulnerabilities");
}

const summary = getSection(report, "Summary");
const severities = ["Critical", "High", "Medium", "Low", "Informational"];
const summaryCounts = {};

if (!summary) {
  failures.push("Security report is missing its Summary section");
} else {
  for (const severity of severities) {
    const count = summary.match(new RegExp(`^${severity}:\\s*(\\d+)\\s*$`, "mi"))?.[1];
    if (count === undefined) {
      failures.push(`Security report is missing a valid ${severity} count`);
    } else {
      summaryCounts[severity.toLowerCase()] = Number(count);
    }
  }
}

const findings = getSection(report, "Findings");
if (findings === undefined) {
  failures.push("Could not parse the Findings section");
} else {
  if (/^### SEC-(?!\d{3} — ).+$/m.test(findings)) {
    failures.push("Security report contains a finding with an invalid SEC ID or heading format");
  }

  const blocks = findings.split(/(?=^### SEC-\d{3} — )/m).filter((block) => /^### SEC-\d{3} — /m.test(block));
  const findingCounts = Object.fromEntries(severities.map((severity) => [severity.toLowerCase(), 0]));

  for (const block of blocks) {
    const severity = block.match(/^Severity:\s*(Critical|High|Medium|Low|Informational)\s*$/mi)?.[1];
    if (!severity) {
      failures.push(`Finding is missing a valid Severity field: ${block.match(/^### .*$/m)?.[0] ?? "unknown finding"}`);
    } else {
      findingCounts[severity.toLowerCase()] += 1;
    }
  }

  for (const severity of severities) {
    const key = severity.toLowerCase();
    if (summaryCounts[key] !== undefined && summaryCounts[key] < findingCounts[key]) {
      failures.push(`Security report understates its ${severity} finding count`);
    }
  }
}

if ((summaryCounts.critical ?? 0) > 0 || (summaryCounts.high ?? 0) > 0) {
  failures.push(
    `OpenCode reported ${summaryCounts.critical ?? "unknown"} critical and ${summaryCounts.high ?? "unknown"} high findings`,
  );
}

if (failures.length > 0) {
  console.error("Security audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Security audit passed: no Critical or High findings; lower severities are report-only.");
}
