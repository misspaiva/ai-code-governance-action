const fs = require("node:fs");
const path = require("node:path");

const workspace = process.env.GITHUB_WORKSPACE || process.cwd();

const failOnSecret =
  String(process.env.INPUT_FAIL_ON_SECRET || "true").toLowerCase() === "true";

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

const ignoredFiles = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

const patterns = [
  {
    name: "AWS Access Key",
    severity: "error",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    name: "GitHub Token",
    severity: "error",
    regex: /\bgh[pousr]_[A-Za-z0-9_]{30,255}\b/g,
  },
  {
    name: "OpenAI API Key",
    severity: "error",
    regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: "Private Key",
    severity: "error",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: "Generic Secret Assignment",
    severity: "warning",
    regex:
      /\b(?:api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["'][^"'\n]{8,}["']/gi,
  },
];

function walk(directory) {
  const results = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      results.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && !ignoredFiles.has(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

function scanFile(filePath) {
  let content;

  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  if (content.includes("\0")) {
    return [];
  }

  const findings = [];

  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;

      if (pattern.regex.test(line)) {
        findings.push({
          type: pattern.name,
          severity: pattern.severity,
          file: path.relative(workspace, filePath),
          line: index + 1,
        });
      }
    }
  }

  return findings;
}

function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;

  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`);
  }
}

console.log("🛡️ AI Code Governance");
console.log("Scanning repository for exposed secrets...\n");

const files = walk(workspace);
const findings = files.flatMap(scanFile);

setOutput("findings-count", String(findings.length));

if (findings.length === 0) {
  console.log("✅ No secrets detected.");
  process.exit(0);
}

console.log(`⚠️ ${findings.length} potential secret(s) detected:\n`);

for (const finding of findings) {
  console.log(
    `::${finding.severity === "error" ? "error" : "warning"} file=${
      finding.file
    },line=${finding.line}::${finding.type} detected`
  );

  console.log(
    `- ${finding.type} → ${finding.file}:${finding.line}`
  );
}

if (failOnSecret) {
  console.error("\n❌ Governance check failed.");
  process.exit(1);
}

console.log("\n⚠️ Findings reported, but fail-on-secret=false.");