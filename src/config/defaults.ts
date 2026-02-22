/**
 * Production-ready default configuration for Quick-Lint
 *
 * These defaults are opinionated, curated rules suitable for
 * React + TypeScript projects. Users can override any rule via
 * their quicklint.config.js.
 */
import type { QuickLintConfig } from '../types/index.js';

export const defaultConfig: QuickLintConfig = {
    eslint: {
        enabled: true,
        rules: {
            // ── Error Prevention ─────────────────────────────
            'no-debugger': 'error',
            'no-duplicate-case': 'error',
            'no-dupe-keys': 'error',
            'no-dupe-args': 'error',
            'no-unreachable': 'error',
            'no-constant-condition': 'warn',
            'no-empty': 'warn',
            'no-extra-boolean-cast': 'warn',
            'no-self-compare': 'error',
            'no-template-curly-in-string': 'warn',
            'no-loss-of-precision': 'error',
            'no-unsafe-optional-chaining': 'error',
            'no-unused-private-class-members': 'warn',

            // ── Best Practices ───────────────────────────────
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
            'no-var': 'error',
            'prefer-const': 'warn',
            'no-console': 'warn',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-wrappers': 'error',
            'no-throw-literal': 'error',
            'no-useless-catch': 'warn',
            'no-useless-return': 'warn',
            'no-useless-rename': 'warn',
            'no-useless-computed-key': 'warn',
            'curly': ['warn', 'multi-line'],
            'no-else-return': ['warn', { allowElseIf: false }],
            'no-param-reassign': 'warn',

            // ── Style Consistency ────────────────────────────
            'prefer-template': 'warn',
            'object-shorthand': ['warn', 'always'],
            'prefer-arrow-callback': 'warn',
            'no-unneeded-ternary': 'warn',
            'no-lonely-if': 'warn',
            'prefer-destructuring': ['warn', {
                object: true,
                array: false,
            }],
        },
        extends: [],
        ignorePatterns: [
            'node_modules',
            'dist',
            'build',
            '.next',
            'coverage',
            '*.min.js',
        ],
        react: true,
        typescript: true,
    },

    prettier: {
        enabled: true,
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
        tabWidth: 2,
        printWidth: 100,
        arrowParens: 'always',
        endOfLine: 'lf',
        bracketSpacing: true,
        jsxSingleQuote: false,
    },

    commitlint: {
        enabled: true,
        extends: ['@commitlint/config-conventional'],
        rules: {},
    },

    sonarqube: {
        enabled: true,
        rules: {
            // Tune cognitive complexity threshold (default is 15)
            'sonarjs/cognitive-complexity': ['warn', 15],
            // Flag duplicated strings appearing 3+ times
            'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],
        },
        report: {
            format: 'html',
            outputDir: './reports',
        },
    },

    husky: {
        enabled: true,
        hooks: {
            'pre-commit': 'npx quick-lint lint --staged',
            'commit-msg': 'npx quick-lint commitlint --edit "$1"',
        },
    },

    ide: {
        generateConfigs: true,
    },
};
