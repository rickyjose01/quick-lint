/**
 * Config validation schema
 */

export function validateConfig(config: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof config !== 'object' || config === null) {
        return { valid: false, errors: ['Config must be an object'] };
    }

    const cfg = config as Record<string, unknown>;

    // Validate eslint section
    if (cfg.eslint !== undefined) {
        if (typeof cfg.eslint !== 'object' || cfg.eslint === null) {
            errors.push('eslint config must be an object');
        } else {
            const eslint = cfg.eslint as Record<string, unknown>;
            if (eslint.rules !== undefined && typeof eslint.rules !== 'object') {
                errors.push('eslint.rules must be an object');
            }
            if (eslint.ignorePatterns !== undefined && !Array.isArray(eslint.ignorePatterns)) {
                errors.push('eslint.ignorePatterns must be an array');
            }
        }
    }

    // Validate prettier section
    if (cfg.prettier !== undefined) {
        if (typeof cfg.prettier !== 'object' || cfg.prettier === null) {
            errors.push('prettier config must be an object');
        } else {
            const prettier = cfg.prettier as Record<string, unknown>;
            if (prettier.tabWidth !== undefined && typeof prettier.tabWidth !== 'number') {
                errors.push('prettier.tabWidth must be a number');
            }
            if (prettier.printWidth !== undefined && typeof prettier.printWidth !== 'number') {
                errors.push('prettier.printWidth must be a number');
            }
            if (
                prettier.trailingComma !== undefined &&
                !['all', 'es5', 'none'].includes(prettier.trailingComma as string)
            ) {
                errors.push('prettier.trailingComma must be one of: all, es5, none');
            }
        }
    }

    // Validate sonarqube section
    if (cfg.sonarqube !== undefined) {
        if (typeof cfg.sonarqube !== 'object' || cfg.sonarqube === null) {
            errors.push('sonarqube config must be an object');
        } else {
            const sonar = cfg.sonarqube as Record<string, unknown>;
            if (sonar.report !== undefined) {
                const report = sonar.report as Record<string, unknown>;
                if (
                    report.format !== undefined &&
                    !['html', 'json', 'both'].includes(report.format as string)
                ) {
                    errors.push('sonarqube.report.format must be one of: html, json, both');
                }
            }
        }
    }

    // Validate husky section
    if (cfg.husky !== undefined) {
        if (typeof cfg.husky !== 'object' || cfg.husky === null) {
            errors.push('husky config must be an object');
        } else {
            const husky = cfg.husky as Record<string, unknown>;
            if (husky.hooks !== undefined && typeof husky.hooks !== 'object') {
                errors.push('husky.hooks must be an object');
            }
        }
    }

    return { valid: errors.length === 0, errors };
}
