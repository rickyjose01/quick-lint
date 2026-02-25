/**
 * `check` command — runs all quality tools (lint + format check + sonar)
 */
import { loadConfig } from '../../config/loader.js';
import { runEslint } from '../../adapters/eslint.js';
import { checkFormatting } from '../../adapters/prettier.js';
import { printCheckResult } from '../../reporters/console.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';
import type { CheckResult, LintResult, FileResult } from '../../types/index.js';

/**
 * Partition ESLint results into ESLint-only and SonarQube-only results.
 */
function extractSonarResults(eslintResult: LintResult): LintResult {
    let sonarErrors = 0;
    let sonarWarnings = 0;
    const sonarFiles: FileResult[] = [];

    for (const file of eslintResult.files) {
        const sonarMsgs = file.messages.filter(
            (m) => m.ruleId && m.ruleId.startsWith('sonarjs/')
        );
        if (sonarMsgs.length > 0) {
            sonarFiles.push({ filePath: file.filePath, messages: sonarMsgs });
            for (const m of sonarMsgs) {
                if (m.severity === 'error') sonarErrors++;
                else sonarWarnings++;
            }
        }
    }

    return {
        tool: 'sonarqube',
        success: sonarErrors === 0,
        errorCount: sonarErrors,
        warningCount: sonarWarnings,
        fixableCount: 0,
        files: sonarFiles,
        duration: 0,
    };
}

export async function checkCommand(): Promise<void> {
    const config = await loadConfig();
    const startTime = Date.now();

    const result: CheckResult = {
        overall: {
            success: true,
            totalErrors: 0,
            totalWarnings: 0,
            duration: 0,
        },
    };

    // 1. ESLint (includes SonarJS rules when sonarqube is enabled)
    if (config.eslint.enabled || config.sonarqube.enabled) {
        const spinner = createSpinner('Running ESLint + SonarQube analysis...');
        spinner.start();
        try {
            result.eslint = await runEslint(config);
            result.overall.totalErrors += result.eslint.errorCount;
            result.overall.totalWarnings += result.eslint.warningCount;
            if (!result.eslint.success) result.overall.success = false;

            // Extract SonarQube results from the ESLint run (avoids running twice)
            if (config.sonarqube.enabled) {
                result.sonarqube = extractSonarResults(result.eslint);
            }

            spinner.succeed(`ESLint: ${result.eslint.errorCount} errors, ${result.eslint.warningCount} warnings`);
        } catch (error) {
            spinner.fail('ESLint + SonarQube analysis failed');
            logger.error(error instanceof Error ? error.message : String(error));
        }
    }

    // 2. Prettier check
    if (config.prettier.enabled) {
        const spinner = createSpinner('Checking formatting...');
        spinner.start();
        try {
            result.prettier = await checkFormatting(config);
            if (!result.prettier.success) result.overall.success = false;
            spinner.succeed(
                result.prettier.success
                    ? 'Formatting: all files are properly formatted'
                    : `Formatting: ${result.prettier.unformattedFiles.length} files need formatting`
            );
        } catch (error) {
            spinner.fail('Prettier check failed');
            logger.error(error instanceof Error ? error.message : String(error));
        }
    }

    result.overall.duration = Date.now() - startTime;

    // Print combined report
    printCheckResult(result);

    if (!result.overall.success) {
        process.exitCode = 1;
    }
}
