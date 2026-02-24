// Quick-Lint Configuration
// Docs: https://github.com/user/quick-lint#configuration

/** @type {import('quick-lint').QuickLintConfig} */
export default {
    // ESLint configuration
    eslint: {
        enabled: true,
        react: true,
        typescript: true,
        rules: {
            // Override or disable default rules here. Examples:
            // 'no-console': 'off',          // Allow console.log
            // 'prefer-const': 'off',         // Allow let even when const would work
            // 'eqeqeq': 'off',              // Allow == instead of ===
            // 'no-param-reassign': 'off',    // Allow parameter reassignment
        },
        ignorePatterns: ['node_modules', 'dist', 'build', '.next', 'coverage'],
    },

    // Prettier configuration
    prettier: {
        enabled: true,
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
        tabWidth: 2,
        printWidth: 100,
    },

    // Commitlint configuration
    commitlint: {
        enabled: true,
        // Uses @commitlint/config-conventional by default
        rules: {
            // Override commitlint rules here
        },
    },

    // SonarQube analysis
    sonarqube: {
        enabled: true,
        rules: {
            // Override SonarJS rules here. Examples:
            // 'sonarjs/cognitive-complexity': ['warn', 20],  // Raise complexity threshold
            // 'sonarjs/no-duplicate-string': 'off',          // Disable duplicate string check
        },
        report: {
            format: 'html', // 'html', 'json', or 'both'
            outputDir: './reports',
        },
    },

    // Git hooks (Husky)
    husky: {
        enabled: true,
        hooks: {
            'pre-commit': 'npx quick-lint lint --staged',
            'commit-msg': 'npx quick-lint commitlint --edit "$1"',
        },
    },

    // IDE integration
    ide: {
        generateConfigs: true, // Generate proxy config files for VS Code / IntelliJ
    },
};
