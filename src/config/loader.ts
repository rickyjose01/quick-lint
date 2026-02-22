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
 * Load the quick-lint config by searching for config files
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
        return deepMerge(
            defaultConfig as unknown as Record<string, unknown>,
            result.config as Record<string, unknown>
        ) as unknown as QuickLintConfig;
    }
    return { ...defaultConfig };
}
