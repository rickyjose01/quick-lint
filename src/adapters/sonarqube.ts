/**
 * SonarQube adapter — runs eslint-plugin-sonarjs and generates SonarQube-style reports.
 *
 * Uses the official `eslint-plugin-sonarjs` (200+ rules by SonarSource) to perform
 * local code quality analysis without requiring a SonarQube server.
 */
import { ESLint, Linter } from 'eslint';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type {
    QuickLintConfig,
    LintResult,
    FileResult,
    SonarReport,
    SonarFileReport,
    SonarIssue,
} from '../types/index.js';



// ─── Severity & Category Mapping ────────────────────────────

/** Well-known SonarJS rule prefixes that indicate bugs */
const BUG_RULES: ReadonlySet<string> = new Set([
    'no-all-duplicated-branches',
    'no-element-overwrite',
    'no-identical-conditions',
    'no-identical-expressions',
    'no-one-iteration-loop',
    'no-use-of-empty-return-value',
    'no-collection-size-mischeck',
    'no-redundant-jump',
    'no-same-line-conditional',
    'no-gratuitous-expressions',
]);

/** Well-known SonarJS rule prefixes that indicate security vulnerabilities */
const VULN_KEYWORDS: ReadonlyArray<string> = [
    'no-hardcoded-credentials',
    'no-hardcoded-passwords',
    'csrf',
    'encryption',
    'weak-ssl',
    'socket',
    'confidential',
];

/**
 * Map ESLint numeric severity to SonarQube severity tiers.
 */
function mapSeverity(
    eslintSeverity: number,
    ruleId: string | null,
): SonarIssue['severity'] {
    const ruleLower = (ruleId ?? '').toLowerCase();
    if (ruleLower.includes('security') || ruleLower.includes('vulnerability')) {
        return eslintSeverity === 2 ? 'critical' : 'major';
    }
    return eslintSeverity === 2 ? 'major' : 'minor';
}

/**
 * Categorize a SonarJS rule into bug / vulnerability / code_smell.
 */
function categorizeRule(ruleId: string | null): SonarIssue['type'] {
    if (!ruleId) return 'code_smell';

    const ruleLower = ruleId.toLowerCase();

    // Check against known bug rule fragments
    for (const bugRule of BUG_RULES) {
        if (ruleLower.includes(bugRule)) return 'bug';
    }

    // Check against known vulnerability keywords
    for (const keyword of VULN_KEYWORDS) {
        if (ruleLower.includes(keyword)) return 'vulnerability';
    }

    return 'code_smell';
}

/**
 * Convert SonarIssue type to the LintMessage category format (uses hyphens).
 */
function mapCategory(
    type: SonarIssue['type'],
): 'bug' | 'vulnerability' | 'code-smell' | 'style' {
    switch (type) {
        case 'bug':
            return 'bug';
        case 'vulnerability':
            return 'vulnerability';
        case 'code_smell':
            return 'code-smell';
        default:
            return 'code-smell';
    }
}

/**
 * Estimate remediation effort for an issue type.
 */
function estimateEffort(type: SonarIssue['type']): string {
    switch (type) {
        case 'bug':
            return '30min';
        case 'vulnerability':
            return '1h';
        case 'code_smell':
            return '10min';
        default:
            return '15min';
    }
}

// ─── Analysis ───────────────────────────────────────────────

/**
 * Run SonarQube analysis using eslint-plugin-sonarjs.
 *
 * This creates a separate ESLint instance configured with ONLY the SonarJS rules
 * so that the report reflects purely SonarQube-style issues.
 */
export async function runSonarAnalysis(
    config: QuickLintConfig,
): Promise<LintResult> {
    const startTime = Date.now();

    if (!config.sonarqube.enabled) {
        return {
            tool: 'sonarqube',
            success: true,
            errorCount: 0,
            warningCount: 0,
            fixableCount: 0,
            files: [],
            duration: 0,
        };
    }

    const sonarPlugin = await import('eslint-plugin-sonarjs');

    const flatConfig: Linter.Config[] = [
        { ignores: config.eslint.ignorePatterns },
        sonarPlugin.default.configs.recommended as Linter.Config,
    ];

    // Apply user sonarqube rule overrides
    if (Object.keys(config.sonarqube.rules).length > 0) {
        flatConfig.push({ rules: config.sonarqube.rules });
    }

    const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: flatConfig,
        cwd: process.cwd(),
    });

    const results = await eslint.lintFiles(['.']);

    let totalErrors = 0;
    let totalWarnings = 0;
    const fileResults: FileResult[] = [];

    for (const result of results) {
        totalErrors += result.errorCount;
        totalWarnings += result.warningCount;

        if (result.messages.length > 0) {
            fileResults.push({
                filePath: result.filePath,
                messages: result.messages.map((msg) => ({
                    ruleId: msg.ruleId,
                    severity: msg.severity === 2 ? 'error' as const : 'warning' as const,
                    message: msg.message,
                    line: msg.line,
                    column: msg.column,
                    endLine: msg.endLine,
                    endColumn: msg.endColumn,
                    category: mapCategory(categorizeRule(msg.ruleId)),
                })),
            });
        }
    }

    return {
        tool: 'sonarqube',
        success: totalErrors === 0,
        errorCount: totalErrors,
        warningCount: totalWarnings,
        fixableCount: 0,
        files: fileResults,
        duration: Date.now() - startTime,
    };
}

// ─── Report Builder ─────────────────────────────────────────

/**
 * Convert lint results into a structured SonarQube report
 * suitable for HTML/JSON rendering.
 */
export function buildSonarReport(result: LintResult): SonarReport {
    const projectName = getProjectName();

    let bugs = 0;
    let vulnerabilities = 0;
    let codeSmells = 0;

    const files: SonarFileReport[] = result.files.map((file) => {
        const issues: SonarIssue[] = file.messages.map((msg) => {
            const type = categorizeRule(msg.ruleId);
            const severity = mapSeverity(
                msg.severity === 'error' ? 2 : 1,
                msg.ruleId,
            );

            if (type === 'bug') bugs++;
            else if (type === 'vulnerability') vulnerabilities++;
            else codeSmells++;

            return {
                ruleId: msg.ruleId ?? 'unknown',
                severity,
                type,
                message: msg.message,
                line: msg.line,
                column: msg.column,
                effort: estimateEffort(type),
            };
        });

        return { filePath: file.filePath, issues };
    });

    return {
        projectName,
        timestamp: new Date().toISOString(),
        summary: {
            bugs,
            vulnerabilities,
            codeSmells,
            totalIssues: bugs + vulnerabilities + codeSmells,
        },
        files,
    };
}

/**
 * Read the project name from the nearest package.json.
 */
function getProjectName(): string {
    try {
        const raw = readFileSync(
            path.resolve(process.cwd(), 'package.json'),
            'utf8',
        );
        const pkg = JSON.parse(raw) as { name?: string };
        return pkg.name ?? 'unknown-project';
    } catch {
        return 'unknown-project';
    }
}
