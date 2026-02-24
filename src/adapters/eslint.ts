/**
 * ESLint adapter — runs ESLint with the resolved config via Node.js API
 */
import { ESLint, Linter } from 'eslint';
import type { QuickLintConfig, LintResult, FileResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getStagedFiles } from '../utils/git.js';



/**
 * Build the ESLint flat config array from quicklint config.
 * Returns flat config objects that can be passed to ESLint({ overrideConfig }).
 */
export async function buildEslintConfig(config: QuickLintConfig): Promise<Linter.Config[]> {
    const flatConfig: Linter.Config[] = [];

    // Global ignores
    flatConfig.push({
        ignores: config.eslint.ignorePatterns,
    });

    // Import globals for browser environment
    const globalsModule = await import('globals');
    const globalVars = globalsModule.default;

    // TypeScript support via typescript-eslint
    if (config.eslint.typescript) {
        const tseslint = await import('typescript-eslint');
        const recommended = tseslint.default.configs.recommended;
        if (Array.isArray(recommended)) {
            flatConfig.push(...(recommended as Linter.Config[]));
        }
    }

    // React & React Hooks plugins
    if (config.eslint.react) {
        const reactPlugin = await import('eslint-plugin-react');
        const reactHooksPlugin = await import('eslint-plugin-react-hooks');

        flatConfig.push({
            plugins: {
                react: reactPlugin.default,
            },
            settings: {
                react: { version: 'detect' },
            },
            languageOptions: {
                parserOptions: {
                    ecmaFeatures: { jsx: true },
                },
                globals: {
                    ...globalVars.browser,
                },
            },
            rules: {
                'react/react-in-jsx-scope': 'off',
                'react/prop-types': 'off',
                'react/jsx-uses-react': 'off',
                'react/jsx-no-target-blank': 'error',
                'react/jsx-key': 'error',
                'react/no-unescaped-entities': 'warn',
                'react/no-deprecated': 'warn',
                'react/no-direct-mutation-state': 'error',
                'react/no-array-index-key': 'warn',
            },
        });

        flatConfig.push({
            plugins: {
                'react-hooks': reactHooksPlugin.default,
            },
            rules: {
                'react-hooks/rules-of-hooks': 'error',
                'react-hooks/exhaustive-deps': 'warn',
            },
        });

        // JSX Accessibility — catches missing alt, invalid aria roles, etc.
        try {
            const jsxA11yPlugin = await import('eslint-plugin-jsx-a11y');
            flatConfig.push({
                plugins: {
                    'jsx-a11y': jsxA11yPlugin.default,
                },
                rules: {
                    'jsx-a11y/alt-text': 'error',
                    'jsx-a11y/anchor-has-content': 'warn',
                    'jsx-a11y/anchor-is-valid': 'warn',
                    'jsx-a11y/aria-props': 'error',
                    'jsx-a11y/aria-role': 'error',
                    'jsx-a11y/aria-unsupported-elements': 'error',
                    'jsx-a11y/click-events-have-key-events': 'warn',
                    'jsx-a11y/heading-has-content': 'warn',
                    'jsx-a11y/html-has-lang': 'warn',
                    'jsx-a11y/img-redundant-alt': 'warn',
                    'jsx-a11y/no-access-key': 'warn',
                    'jsx-a11y/no-autofocus': 'warn',
                    'jsx-a11y/no-distracting-elements': 'error',
                    'jsx-a11y/role-has-required-aria-props': 'error',
                    'jsx-a11y/role-supports-aria-props': 'error',
                    'jsx-a11y/tabindex-no-positive': 'warn',
                },
            });
        } catch {
            // jsx-a11y not installed — skip accessibility rules
        }
    }

    // SonarJS rules (always included when sonarqube is enabled)
    if (config.sonarqube.enabled) {
        const sonarPlugin = await import('eslint-plugin-sonarjs');
        flatConfig.push(sonarPlugin.default.configs.recommended as Linter.Config);
    }

    // User rule overrides (applied last so they take precedence)
    if (Object.keys(config.eslint.rules).length > 0) {
        flatConfig.push({
            rules: config.eslint.rules,
        });
    }

    return flatConfig;
}

/**
 * Run ESLint on the project.
 */
export async function runEslint(
    config: QuickLintConfig,
    options: {
        fix?: boolean;
        staged?: boolean;
        files?: string[];
    } = {},
): Promise<LintResult> {
    const startTime = Date.now();

    if (!config.eslint.enabled) {
        return {
            tool: 'eslint',
            success: true,
            errorCount: 0,
            warningCount: 0,
            fixableCount: 0,
            files: [],
            duration: 0,
        };
    }

    const flatConfig = await buildEslintConfig(config);

    const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: flatConfig,
        fix: options.fix ?? false,
        cwd: process.cwd(),
    });

    // Determine which files to lint
    let patterns: string[];
    if (options.files && options.files.length > 0) {
        patterns = options.files;
    } else if (options.staged) {
        patterns = await getStagedFiles();
        if (patterns.length === 0) {
            logger.info('No staged files to lint');
            return {
                tool: 'eslint',
                success: true,
                errorCount: 0,
                warningCount: 0,
                fixableCount: 0,
                files: [],
                duration: Date.now() - startTime,
            };
        }
    } else {
        patterns = ['.'];
    }

    const results = await eslint.lintFiles(patterns);

    if (options.fix) {
        await ESLint.outputFixes(results);
    }

    // Aggregate results
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalFixable = 0;
    const fileResults: FileResult[] = [];

    for (const result of results) {
        totalErrors += result.errorCount;
        totalWarnings += result.warningCount;
        totalFixable += result.fixableErrorCount + result.fixableWarningCount;

        if (result.messages.length > 0) {
            fileResults.push({
                filePath: result.filePath,
                messages: result.messages.map((msg) => ({
                    ruleId: msg.ruleId,
                    severity: msg.severity === 2 ? 'error' as const : 'warning' as const,
                    message: msg.message,
                    line: msg.line,
                    column: msg.column,
                    endLine: msg.endLine,
                    endColumn: msg.endColumn,
                    fix: msg.fix
                        ? { range: msg.fix.range as [number, number], text: msg.fix.text }
                        : undefined,
                })),
            });
        }
    }

    return {
        tool: 'eslint',
        success: totalErrors === 0,
        errorCount: totalErrors,
        warningCount: totalWarnings,
        fixableCount: totalFixable,
        files: fileResults,
        duration: Date.now() - startTime,
    };
}


