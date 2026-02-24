/**
 * Console reporter — colored terminal output with summary
 */
import chalk from 'chalk';
import type { CheckResult, LintResult, PrettierResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Print a full check result to the console
 */
export function printCheckResult(result: CheckResult): void {
    logger.blank();
    logger.header('quicklint Quality Report');
    logger.blank();

    if (result.eslint) {
        printLintResult(result.eslint);
    }

    if (result.sonarqube) {
        printLintResult(result.sonarqube);
    }

    if (result.prettier) {
        printPrettierResult(result.prettier);
    }

    // Summary
    logger.blank();
    console.log(chalk.bold('  Summary'));
    console.log(chalk.dim('  ' + '─'.repeat(50)));
    logger.table([
        ['Errors', result.overall.totalErrors],
        ['Warnings', result.overall.totalWarnings],
        ['Duration', `${(result.overall.duration / 1000).toFixed(2)}s`],
        ['Status', result.overall.success ? chalk.green('PASS ✔') : chalk.red('FAIL ✖')],
    ]);
    logger.blank();
}

/**
 * Print lint result for a single tool
 */
function printLintResult(result: LintResult): void {
    const icon = result.success ? chalk.green('✔') : chalk.red('✖');
    const toolName = result.tool.charAt(0).toUpperCase() + result.tool.slice(1);

    console.log(`  ${icon} ${chalk.bold(toolName)} — ${result.errorCount} errors, ${result.warningCount} warnings (${(result.duration / 1000).toFixed(2)}s)`);

    if (result.files.length > 0) {
        // Show up to 10 files with issues
        const filesToShow = result.files.slice(0, 10);
        for (const file of filesToShow) {
            const relativePath = file.filePath.replace(process.cwd() + '/', '').replace(process.cwd() + '\\', '');
            console.log(chalk.dim(`    ${relativePath}`));

            // Show up to 5 messages per file
            const msgsToShow = file.messages.slice(0, 5);
            for (const msg of msgsToShow) {
                const sev =
                    msg.severity === 'error'
                        ? chalk.red('error')
                        : chalk.yellow('warn ');
                const rule = msg.ruleId ? chalk.dim(` (${msg.ruleId})`) : '';
                console.log(`      ${sev}  ${chalk.dim(`${msg.line}:${msg.column}`)}  ${msg.message}${rule}`);
            }

            if (file.messages.length > 5) {
                console.log(chalk.dim(`      ... and ${file.messages.length - 5} more`));
            }
        }

        if (result.files.length > 10) {
            console.log(chalk.dim(`    ... and ${result.files.length - 10} more files`));
        }
    }

    logger.blank();
}

/**
 * Print Prettier check result
 */
function printPrettierResult(result: PrettierResult): void {
    const icon = result.success ? chalk.green('✔') : chalk.yellow('⚠');

    console.log(`  ${icon} ${chalk.bold('Prettier')} — ${result.unformattedFiles.length} unformatted files out of ${result.totalFiles} (${(result.duration / 1000).toFixed(2)}s)`);

    if (result.unformattedFiles.length > 0) {
        const filesToShow = result.unformattedFiles.slice(0, 10);
        for (const file of filesToShow) {
            console.log(chalk.dim(`    ${file}`));
        }
        if (result.unformattedFiles.length > 10) {
            console.log(chalk.dim(`    ... and ${result.unformattedFiles.length - 10} more`));
        }
        console.log(chalk.dim(`    Run ${chalk.bold('quicklint format')} to fix formatting.`));
    }

    logger.blank();
}
