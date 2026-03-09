/**
 * Configuration loader — uses cosmiconfig to find and merge quicklint config
 */
import { cosmiconfig } from 'cosmiconfig';
import { deepMerge } from '../utils/merge.js';
import { defaultConfig } from './defaults.js';
import { logger } from '../utils/logger.js';
import type { QuickLintConfig } from '../types/index.js';

const MODULE_NAME = 'quicklint';

const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: [
        `${MODULE_NAME}.config.js`,
        `${MODULE_NAME}.config.cjs`,
        `${MODULE_NAME}.config.mjs`,
        `${MODULE_NAME}.config.json`,
        `.${MODULE_NAME}rc`,
        `.${MODULE_NAME}rc.json`,
        `.${MODULE_NAME}rc.js`,
        `.${MODULE_NAME}rc.cjs`,
        'package.json',
    ],
});

let cachedConfig: QuickLintConfig | null = null;

/**
 * Fix rule objects after deepMerge.
 *
 * deepMerge concatenates arrays, which is correct for `ignorePatterns` and
 * `extends`, but WRONG for ESLint/SonarJS rule values like `['warn', 15]`.
 * Those are tuples that must be replaced entirely, not concatenated.
 *
 * This function re-applies the user's rule objects as shallow overrides
 * so that individual rule entries fully replace the defaults.
 */
function fixRuleMerge(
    merged: QuickLintConfig,
    userConfig: Record<string, unknown>,
): void {
    const user = userConfig as Partial<Record<string, Record<string, unknown>>>;

    if (user.eslint?.rules) {
        merged.eslint.rules = {
            ...defaultConfig.eslint.rules,
            ...user.eslint.rules,
        } as typeof merged.eslint.rules;
    }
    if (user.sonarqube?.rules) {
        merged.sonarqube.rules = {
            ...defaultConfig.sonarqube.rules,
            ...user.sonarqube.rules,
        } as typeof merged.sonarqube.rules;
    }
    if (user.commitlint?.rules) {
        merged.commitlint.rules = {
            ...defaultConfig.commitlint.rules,
            ...user.commitlint.rules as Record<string, unknown>,
        };
    }
}

/**
 * Load the quicklint config by searching for config files
 * and merging with defaults
 */
export async function loadConfig(cwd?: string): Promise<QuickLintConfig> {
    if (cachedConfig) return cachedConfig;

    try {
        const result = await explorer.search(cwd || process.cwd());

        if (result && result.config) {
            logger.info(`Config loaded from ${result.filepath}`);
            cachedConfig = deepMerge(
                defaultConfig as unknown as Record<string, unknown>,
                result.config as Record<string, unknown>
            ) as unknown as QuickLintConfig;

            // Fix rule tuples that deepMerge incorrectly concatenated
            fixRuleMerge(cachedConfig, result.config as Record<string, unknown>);
        } else {
            logger.info('No config file found — using defaults');
            cachedConfig = { ...defaultConfig };
        }
    } catch (error) {
        logger.warn(
            `Error loading config: ${error instanceof Error ? error.message : String(error)}`
        );
        logger.info('Falling back to defaults');
        cachedConfig = { ...defaultConfig };
    }

    return cachedConfig!;
}

/**
 * Clear the cached config (useful for testing)
 */
export function clearConfigCache(): void {
    cachedConfig = null;
}

/**
 * Load config from a specific file path
 */
export async function loadConfigFromFile(
    filePath: string
): Promise<QuickLintConfig> {
    const result = await explorer.load(filePath);
    if (result && result.config) {
        const merged = deepMerge(
            defaultConfig as unknown as Record<string, unknown>,
            result.config as Record<string, unknown>
        ) as unknown as QuickLintConfig;

        // Fix rule tuples that deepMerge incorrectly concatenated
        fixRuleMerge(merged, result.config as Record<string, unknown>);

        return merged;
    }
    return { ...defaultConfig };
}
