/**
 * Quick-Lint CLI — main entry point
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { lintCommand } from './commands/lint.js';
import { formatCommand } from './commands/format.js';
import { checkCommand } from './commands/check.js';
import { reportCommand } from './commands/report.js';
import { ejectCommand } from './commands/eject.js';
import { loadConfig } from '../config/loader.js';
import { lintCommitMessageFromFile } from '../adapters/commitlint.js';
import { logger } from '../utils/logger.js';

const program = new Command();

program
    .name('quick-lint')
    .description(
        chalk.hex('#7c3aed')('⚡ Quick-Lint') +
        ' — Unified code quality orchestrator for React'
    )
    .version('1.0.0');

// ─── init ──────────────────────────────────────────────────

program
    .command('init')
    .description('Initialize quick-lint in your project')
    .action(async () => {
        try {
            await initCommand();
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            process.exitCode = 1;
        }
    });

// ─── lint ──────────────────────────────────────────────────

program
    .command('lint')
    .description('Run ESLint + SonarJS analysis')
    .option('--fix', 'Automatically fix problems')
    .option('--staged', 'Only lint staged files')
    .argument('[files...]', 'Specific files to lint')
    .action(async (files: string[], options: { fix?: boolean; staged?: boolean }) => {
        try {
            await lintCommand({ ...options, files: files.length > 0 ? files : undefined });
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            process.exitCode = 1;
        }
    });

// ─── format ────────────────────────────────────────────────

program
    .command('format')
    .description('Format code with Prettier')
    .option('--check', 'Check formatting without writing')
    .option('--staged', 'Only format staged files')
    .action(async (options: { check?: boolean; staged?: boolean }) => {
        try {
            await formatCommand(options);
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            process.exitCode = 1;
        }
    });

// ─── check ─────────────────────────────────────────────────

program
    .command('check')
    .description('Run all quality checks (lint + format check + SonarQube)')
    .action(async () => {
        try {
            await checkCommand();
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            process.exitCode = 1;
        }
    });

// ─── report ────────────────────────────────────────────────

program
    .command('report')
    .description('Generate SonarQube-style analysis report')
    .option('-f, --format <format>', 'Report format: html, json, both', 'html')
    .option('-o, --output <dir>', 'Output directory', './reports')
    .action(async (options: { format?: string; output?: string }) => {
        try {
            await reportCommand(options);
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            process.exitCode = 1;
        }
    });

// ─── commitlint (used by git hooks) ───────────────────────

program
    .command('commitlint')
    .description('Lint commit message (used by git hooks)')
    .option('--edit <file>', 'Path to the commit message file')
    .action(async (options: { edit?: string }) => {
        try {
            if (!options.edit) {
                logger.error('--edit <file> is required');
                process.exitCode = 1;
                return;
            }

            const config = await loadConfig();
            const result = await lintCommitMessageFromFile(config, options.edit);

            if (!result.valid) {
                logger.error('Commit message does not follow conventions:');
                for (const err of result.errors) {
                    logger.error(`  ✖ ${err}`);
                }
                for (const warn of result.warnings) {
                    logger.warn(`  ⚠ ${warn}`);
                }
                logger.blank();
                logger.info('Expected format: type(scope): subject');
                logger.info('Examples: feat(auth): add login page');
                logger.info('          fix(api): handle null response');
                process.exitCode = 1;
            } else {
                if (result.warnings.length > 0) {
                    for (const warn of result.warnings) {
                        logger.warn(`  ⚠ ${warn}`);
                    }
                }
                logger.success('Commit message is valid ✔');
            }
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            process.exitCode = 1;
        }
    });

// ─── eject ─────────────────────────────────────────────────

program
    .command('eject')
    .description('Remove all quick-lint config files and uninstall the package')
    .option('--dry-run', 'Preview changes without making them')
    .option('--keep-deps', 'Keep peer dependencies installed')
    .action(async (options: { dryRun?: boolean; keepDeps?: boolean }) => {
        try {
            await ejectCommand(options);
        } catch (error) {
            logger.error(error instanceof Error ? error.message : String(error));
            process.exitCode = 1;
        }
    });

// Parse and run
program.parse();
