/**
 * Commitlint adapter — validates commit messages against conventional commit conventions.
 */
import { promises as fs } from 'node:fs';
import type { QuickLintConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';

/** Result of a commit message lint operation */
export interface CommitlintResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Lint a commit message against the configured rules.
 */
export async function lintCommitMessage(
    config: QuickLintConfig,
    message: string,
): Promise<CommitlintResult> {
    if (!config.commitlint.enabled) {
        return { valid: true, errors: [], warnings: [] };
    }

    let lint: typeof import('@commitlint/lint').default;
    let load: typeof import('@commitlint/load').default;
    try {
        lint = (await import('@commitlint/lint')).default;
        load = (await import('@commitlint/load')).default;
    } catch {
        throw new Error(
            'Commitlint packages are not installed. Install them with: npm install --save-dev @commitlint/cli @commitlint/config-conventional @commitlint/lint @commitlint/load'
        );
    }

    const commitlintConfig = await load({
        extends: config.commitlint.extends,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rules: config.commitlint.rules as any,
    });

    const parserOpts =
        commitlintConfig.parserPreset &&
            typeof commitlintConfig.parserPreset === 'object' &&
            'parserOpts' in commitlintConfig.parserPreset
            ? { parserOpts: commitlintConfig.parserPreset.parserOpts as Record<string, unknown> }
            : {};

    const result = await lint(message, commitlintConfig.rules, parserOpts);

    return {
        valid: result.valid,
        errors: result.errors.map((e) => e.message),
        warnings: result.warnings.map((w) => w.message),
    };
}

/**
 * Lint the commit message from an edit file (used by the commit-msg hook).
 */
export async function lintCommitMessageFromFile(
    config: QuickLintConfig,
    filePath: string,
): Promise<CommitlintResult> {
    try {
        const message = await fs.readFile(filePath, 'utf8');
        return lintCommitMessage(config, message.trim());
    } catch {
        logger.error(`Could not read commit message file: ${filePath}`);
        return {
            valid: false,
            errors: [`Could not read file: ${filePath}`],
            warnings: [],
        };
    }
}
