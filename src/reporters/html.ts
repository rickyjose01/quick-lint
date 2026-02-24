/**
 * HTML reporter — SonarQube-style self-contained HTML report
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { SonarReport, SonarFileReport, SonarIssue } from '../types/index.js';
import { logger } from '../utils/logger.js';

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function severityBadge(severity: SonarIssue['severity']): string {
    const colors: Record<string, string> = {
        blocker: '#dc2626',
        critical: '#ea580c',
        major: '#d97706',
        minor: '#2563eb',
        info: '#6b7280',
    };
    const color = colors[severity] || '#6b7280';
    return `<span class="badge" style="background:${color}">${severity.toUpperCase()}</span>`;
}

function typeBadge(type: SonarIssue['type']): string {
    const icons: Record<string, string> = {
        bug: '🐛',
        vulnerability: '🔒',
        code_smell: '🔧',
    };
    const labels: Record<string, string> = {
        bug: 'Bug',
        vulnerability: 'Vulnerability',
        code_smell: 'Code Smell',
    };
    return `<span class="type-badge">${icons[type] || '📋'} ${labels[type] || type}</span>`;
}

function generateFileSection(file: SonarFileReport): string {
    const relPath = file.filePath
        .replace(process.cwd() + '/', '')
        .replace(process.cwd() + '\\', '')
        .replace(/\\/g, '/');

    const issueRows = file.issues
        .map(
            (issue) => `
        <tr>
          <td>${severityBadge(issue.severity)}</td>
          <td>${typeBadge(issue.type)}</td>
          <td class="rule-id">${escapeHtml(issue.ruleId)}</td>
          <td>${escapeHtml(issue.message)}</td>
          <td class="line-col">L${issue.line}:${issue.column}</td>
          <td class="effort">${issue.effort}</td>
        </tr>`
        )
        .join('\n');

    return `
    <div class="file-section">
      <div class="file-header" onclick="this.parentElement.classList.toggle('collapsed')">
        <span class="file-path">📄 ${escapeHtml(relPath)}</span>
        <span class="issue-count">${file.issues.length} issue${file.issues.length !== 1 ? 's' : ''}</span>
      </div>
      <table class="issues-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Type</th>
            <th>Rule</th>
            <th>Message</th>
            <th>Location</th>
            <th>Effort</th>
          </tr>
        </thead>
        <tbody>
          ${issueRows}
        </tbody>
      </table>
    </div>`;
}

/**
 * Generate a self-contained HTML report
 */
export async function writeHtmlReport(
    report: SonarReport,
    outputDir: string
): Promise<string> {
    await fs.mkdir(outputDir, { recursive: true });

    const fileSections = report.files.map(generateFileSection).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>quicklint | SonarQube Analysis Report</title>
  <style>
    :root {
      --bg: #0f0f23;
      --surface: #1a1a2e;
      --surface-2: #24243e;
      --text: #e0e0e0;
      --text-dim: #9ca3af;
      --accent: #7c3aed;
      --accent-light: #a78bfa;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --border: #2d2d4a;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }

    .container { max-width: 1200px; margin: 0 auto; }

    .header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: linear-gradient(135deg, var(--surface), var(--surface-2));
      border-radius: 16px;
      border: 1px solid var(--border);
    }

    .header h1 {
      font-size: 2rem;
      background: linear-gradient(135deg, var(--accent-light), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }

    .header .project-name { color: var(--text-dim); font-size: 1.1rem; }
    .header .timestamp { color: var(--text-dim); font-size: 0.85rem; margin-top: 0.5rem; }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(124, 58, 237, 0.15);
    }

    .card .count {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .card .label { color: var(--text-dim); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }

    .card.bugs .count { color: var(--danger); }
    .card.vulnerabilities .count { color: var(--warning); }
    .card.code-smells .count { color: var(--accent-light); }
    .card.total .count { color: var(--text); }

    .file-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .file-section.collapsed .issues-table { display: none; }

    .file-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .file-header:hover { background: var(--surface-2); }

    .file-path { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; }
    .issue-count {
      background: var(--surface-2);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      color: var(--text-dim);
    }

    .issues-table {
      width: 100%;
      border-collapse: collapse;
    }

    .issues-table th {
      background: var(--surface-2);
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
    }

    .issues-table td {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
    }

    .badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      color: white;
      text-transform: uppercase;
    }

    .type-badge { font-size: 0.85rem; }
    .rule-id { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--accent-light); }
    .line-col { font-family: 'JetBrains Mono', monospace; color: var(--text-dim); }
    .effort { color: var(--text-dim); }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-dim);
    }

    .empty-state .icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-state h2 { color: var(--success); margin-bottom: 0.5rem; }

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ quicklint Analysis Report</h1>
      <div class="project-name">${escapeHtml(report.projectName)}</div>
      <div class="timestamp">Generated on ${new Date(report.timestamp).toLocaleString()}</div>
    </div>

    <div class="summary-cards">
      <div class="card bugs">
        <div class="count">${report.summary.bugs}</div>
        <div class="label">🐛 Bugs</div>
      </div>
      <div class="card vulnerabilities">
        <div class="count">${report.summary.vulnerabilities}</div>
        <div class="label">🔒 Vulnerabilities</div>
      </div>
      <div class="card code-smells">
        <div class="count">${report.summary.codeSmells}</div>
        <div class="label">🔧 Code Smells</div>
      </div>
      <div class="card total">
        <div class="count">${report.summary.totalIssues}</div>
        <div class="label">📋 Total Issues</div>
      </div>
    </div>

    ${report.files.length > 0
            ? fileSections
            : `
        <div class="empty-state">
          <div class="icon">🎉</div>
          <h2>No Issues Found</h2>
          <p>Your code is clean! Great job.</p>
        </div>`
        }
  </div>
</body>
</html>`;

    const filePath = path.join(outputDir, 'sonarqube-report.html');
    await fs.writeFile(filePath, html, 'utf8');

    logger.success(`HTML report written to ${filePath}`);
    return filePath;
}
