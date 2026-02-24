/**
 * quicklint — Public API
 *
 * This module exports the programmatic API for quicklint,
 * allowing other packages and IDE integrations to use quicklint functionality.
 */

// Config
export { loadConfig, clearConfigCache, loadConfigFromFile } from './config/loader.js';
export { defaultConfig } from './config/defaults.js';
export { validateConfig } from './config/schema.js';

// Adapters
export { runEslint, buildEslintConfig } from './adapters/eslint.js';
export { formatFiles, checkFormatting, buildPrettierConfig } from './adapters/prettier.js';
export { setupHusky, removeHusky } from './adapters/husky.js';
export { lintCommitMessage, lintCommitMessageFromFile } from './adapters/commitlint.js';
export { runSonarAnalysis, buildSonarReport } from './adapters/sonarqube.js';

// IDE
export { emitIdeConfigs, removeIdeConfigs } from './ide/config-emitter.js';

// Reporters
export { printCheckResult } from './reporters/console.js';
export { writeHtmlReport } from './reporters/html.js';
export { writeJsonReport } from './reporters/json.js';

// Types
export type {
    QuickLintConfig,
    EslintConfig,
    PrettierConfig,
    CommitlintConfig,
    SonarqubeConfig,
    HuskyConfig,
    IdeConfig,
    LintResult,
    FileResult,
    LintMessage,
    CheckResult,
    PrettierResult,
    SonarReport,
    SonarFileReport,
    SonarIssue,
} from './types/index.js';

// Utils
export { deepMerge } from './utils/merge.js';
