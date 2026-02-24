/**
 * `lint` command — runs ESLint + SonarJS on the project
 */
import { loadConfig } from '../../config/loader.js';
import { runEslint } from '../../adapters/eslint.js';
import { logger } from '../../utils/logger.js';
import { withSpinner } from '../../utils/spinner.js';
import type { FileResult } from '../../types/index.js';
import chalk from 'chalk';

/**
 * Check if a rule ID belongs to the SonarJS plugin.
 */
function isSonarRule(ruleId: string | null | undefined): boolean {
    return !!ruleId && ruleId.startsWith('sonarjs/');
}

/**
 * Partition file results into ESLint-only and SonarQube-only buckets.
 * Each file may appear in both buckets if it has both types of issues.
 */
function partitionResults(files: FileResult[]): {
    eslintFiles: FileResult[];
    sonarFiles: FileResult[];
    eslintErrors: number;
    eslintWarnings: number;
    sonarErrors: number;
    sonarWarnings: number;
} {
    const eslintFiles: FileResult[] = [];
    const sonarFiles: FileResult[] = [];
    let eslintErrors = 0;
    let eslintWarnings = 0;
    let sonarErrors = 0;
    let sonarWarnings = 0;

    for (const file of files) {
        const eslintMsgs = file.messages.filter((m) => !isSonarRule(m.ruleId));
        const sonarMsgs = file.messages.filter((m) => isSonarRule(m.ruleId));

        if (eslintMsgs.length > 0) {
            eslintFiles.push({ filePath: file.filePath, messages: eslintMsgs });
            for (const m of eslintMsgs) {
                if (m.severity === 'error') eslintErrors++;
                else eslintWarnings++;
            }
        }

        if (sonarMsgs.length > 0) {
            sonarFiles.push({ filePath: file.filePath, messages: sonarMsgs });
            for (const m of sonarMsgs) {
                if (m.severity === 'error') sonarErrors++;
                else sonarWarnings++;
            }
        }
    }

    return { eslintFiles, sonarFiles, eslintErrors, eslintWarnings, sonarErrors, sonarWarnings };
}

/**
 * Print a section of lint results with a header.
 */
function printSection(header: string, icon: string, files: FileResult[]): void {
    console.log(chalk.bold(`${icon}  ${header}`));
    console.log(chalk.dim('─'.repeat(50)));

    for (const file of files) {
        const relativePath = file.filePath
            .replace(process.cwd() + '/', '')
            .replace(process.cwd() + '\\', '');
        console.log(chalk.underline(relativePath));

        for (const msg of file.messages) {
            const sev =
                msg.severity === 'error'
                    ? chalk.red('error')
                    : chalk.yellow('warn ');
            const rule = msg.ruleId ? chalk.dim(` ${msg.ruleId}`) : '';
            console.log(
                `  ${chalk.dim(`${msg.line}:${msg.column}`)}  ${sev}  ${msg.message}${rule}`
            );
        }
        console.log();
    }
}

export async function lintCommand(options: {
    fix?: boolean;
    staged?: boolean;
    files?: string[];
}): Promise<void> {
    const config = await loadConfig();

    const result = await withSpinner(
        `Running ESLint + SonarQube analysis${options.fix ? ' (with auto-fix)' : ''}${options.staged ? ' (staged files)' : ''}`,
        async () => runEslint(config, options)
    );

    // Partition results into ESLint vs SonarQube
    const {
        eslintFiles, sonarFiles,
        eslintErrors, eslintWarnings,
        sonarErrors, sonarWarnings,
    } = partitionResults(result.files);

    logger.blank();

    if (eslintFiles.length === 0 && sonarFiles.length === 0) {
        logger.success('No lint issues found! ✨');
    } else {
        // Print ESLint issues
        if (eslintFiles.length > 0) {
            printSection('ESLint', '🔍', eslintFiles);
        }

        // Print SonarQube issues
        if (sonarFiles.length > 0) {
            printSection('SonarQube', '📊', sonarFiles);
        }
    }

    // Summary table with separate counts
    logger.table([
        ['ESLint Errors', eslintErrors],
        ['ESLint Warnings', eslintWarnings],
        ['SonarQube Errors', sonarErrors],
        ['SonarQube Warnings', sonarWarnings],
        ['Total Issues', result.errorCount + result.warningCount],
        ['Fixable', result.fixableCount],
        ['Duration', `${(result.duration / 1000).toFixed(2)}s`],
    ]);
    logger.blank();

    if (result.fixableCount > 0 && !options.fix) {
        logger.info(
            `${result.fixableCount} issues are auto-fixable. Run ${chalk.bold('quicklint lint --fix')} to fix them.`
        );
        logger.blank();
    }

    if (sonarFiles.length > 0) {
        logger.info(
            `Run ${chalk.bold('quicklint report')} to generate a detailed SonarQube HTML report.`
        );
        logger.blank();
    }

    if (!result.success) {
        process.exitCode = 1;
    }
}
