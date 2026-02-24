/**
 * quicklint — Shared type definitions
 */

import type { Linter } from 'eslint';
import type { Options as PrettierOptions } from 'prettier';

// ─── Config Types ──────────────────────────────────────────

export interface QuickLintConfig {
    eslint: EslintConfig;
    prettier: PrettierConfig;
    commitlint: CommitlintConfig;
    sonarqube: SonarqubeConfig;
    husky: HuskyConfig;
    ide: IdeConfig;
}

export interface EslintConfig {
    enabled: boolean;
    rules: Linter.RulesRecord;
    extends: string[];
    ignorePatterns: string[];
    react: boolean;
    typescript: boolean;
}

/**
 * Extends Prettier's native Options so that new upstream options
 * are automatically available without manual changes.
 */
export interface PrettierConfig extends PrettierOptions {
    enabled: boolean;
}

export interface CommitlintConfig {
    enabled: boolean;
    extends: string[];
    rules: Record<string, unknown>;
}

export interface SonarqubeConfig {
    enabled: boolean;
    rules: Linter.RulesRecord;
    report: {
        format: 'html' | 'json' | 'both';
        outputDir: string;
    };
}

export interface HuskyConfig {
    enabled: boolean;
    hooks: Record<string, string>;
}

export interface IdeConfig {
    generateConfigs: boolean;
}

// ─── Result Types ──────────────────────────────────────────

export interface LintResult {
    tool: string;
    success: boolean;
    errorCount: number;
    warningCount: number;
    fixableCount: number;
    files: FileResult[];
    duration: number;
}

export interface FileResult {
    filePath: string;
    messages: LintMessage[];
}

export interface LintMessage {
    ruleId: string | null;
    severity: 'error' | 'warning' | 'info';
    message: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    category?: 'bug' | 'vulnerability' | 'code-smell' | 'style';
    fix?: {
        range: [number, number];
        text: string;
    };
}

export interface CheckResult {
    eslint?: LintResult;
    sonarqube?: LintResult;
    prettier?: PrettierResult;
    overall: {
        success: boolean;
        totalErrors: number;
        totalWarnings: number;
        duration: number;
    };
}

export interface PrettierResult {
    success: boolean;
    unformattedFiles: string[];
    totalFiles: number;
    duration: number;
}

// ─── Report Types ──────────────────────────────────────────

export interface SonarReport {
    projectName: string;
    timestamp: string;
    summary: {
        bugs: number;
        vulnerabilities: number;
        codeSmells: number;
        totalIssues: number;
    };
    files: SonarFileReport[];
}

export interface SonarFileReport {
    filePath: string;
    issues: SonarIssue[];
}

export interface SonarIssue {
    ruleId: string;
    severity: 'blocker' | 'critical' | 'major' | 'minor' | 'info';
    type: 'bug' | 'vulnerability' | 'code_smell';
    message: string;
    line: number;
    column: number;
    effort: string;
}
