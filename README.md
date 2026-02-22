# ⚡ Quick-Lint

**Unified code quality orchestrator for React** — ESLint, Prettier, Husky, Commitlint & SonarQube analysis in one package with zero configuration.

---

## Why Quick-Lint?

Managing code quality across React projects is painful:

- **Multiple packages** to install (`eslint`, `prettier`, `husky`, `@commitlint/cli`, etc.)
- **Multiple config files** (`eslint.config.js`, `.prettierrc`, `.commitlintrc`, etc.)
- **Version mismatches** across projects
- **SonarQube** requires a cloud server or VS Code plugin

Quick-Lint solves all of this with **one install, one config file, zero overhead**.

```bash
npm install quick-lint --save-dev
npx quick-lint init
```

That's it. Your project now has:
- ✅ ESLint with React + TypeScript + SonarJS rules
- ✅ Prettier with opinionated defaults
- ✅ Husky git hooks (pre-commit lint, commit message validation)
- ✅ Commitlint with conventional commits
- ✅ SonarQube-style analysis with HTML report generation
- ✅ IDE integration (VS Code, IntelliJ, WebStorm)

---

## Quick Start

```bash
# Install
npm install quick-lint --save-dev

# Initialize (creates config, hooks, IDE proxy files)
npx quick-lint init

# Run all quality checks
npx quick-lint check

# Lint only
npx quick-lint lint

# Format code
npx quick-lint format

# Generate SonarQube report
npx quick-lint report
```

---

## Commands

| Command | Description |
|---------|-------------|
| `quick-lint init` | Scaffold config file, git hooks, IDE configs |
| `quick-lint lint` | Run ESLint + SonarJS analysis |
| `quick-lint lint --fix` | Auto-fix lint issues |
| `quick-lint lint --staged` | Only lint staged files (for CI) |
| `quick-lint format` | Format all files with Prettier |
| `quick-lint format --check` | Check formatting without writing |
| `quick-lint check` | Run all quality checks |
| `quick-lint report` | Generate SonarQube-style HTML report |
| `quick-lint report -f json` | Generate JSON report |
| `quick-lint report -f both` | Generate both HTML and JSON |
| `quick-lint commitlint --edit <file>` | Validate commit message (used by hooks) |

---

## Configuration

Quick-Lint works out of the box with **zero configuration**. If you need to customize, edit `quicklint.config.js`:

```js
/** @type {import('quick-lint').QuickLintConfig} */
module.exports = {
  eslint: {
    enabled: true,
    react: true,
    typescript: true,
    rules: {
      'no-console': 'warn',
    },
    ignorePatterns: ['node_modules', 'dist', 'build'],
  },

  prettier: {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    tabWidth: 2,
    printWidth: 100,
  },

  commitlint: {
    enabled: true,
    rules: {
      // Override conventional commit rules
    },
  },

  sonarqube: {
    enabled: true,
    rules: {
      // Override SonarJS rules
    },
    report: {
      format: 'html',      // 'html', 'json', or 'both'
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
```

Only specify what you want to override — everything else uses production-ready defaults.

---

## How IDE Integration Works

When you run `quick-lint init`, it generates thin proxy config files:

| File | Purpose |
|------|---------|
| `eslint.config.mjs` | Re-exports ESLint config from quick-lint |
| `.prettierrc.json` | Contains resolved Prettier options |
| `commitlint.config.cjs` | Re-exports Commitlint config |

These files are read by VS Code, IntelliJ, WebStorm, and any editor with ESLint/Prettier extensions. You get **real-time feedback** without additional setup.

> **Tip:** These files are safe to commit if you want consistent IDE behavior across the team.

---

## SonarQube Analysis

Quick-Lint includes `eslint-plugin-sonarjs` (200+ rules by SonarSource) and runs it locally — no server needed.

```bash
# Run analysis and generate HTML report
npx quick-lint report

# The report is saved to ./reports/sonarqube-report.html
```

The report categorizes issues as:
- 🐛 **Bugs** — code that is demonstrably wrong
- 🔒 **Vulnerabilities** — security-related issues
- 🔧 **Code Smells** — maintainability issues

---

## Programmatic API

```js
import { loadConfig, runEslint, checkFormatting, runSonarAnalysis } from 'quick-lint';

const config = await loadConfig();

// Run ESLint
const lintResult = await runEslint(config);

// Check formatting
const formatResult = await checkFormatting(config);

// SonarQube analysis
const sonarResult = await runSonarAnalysis(config);
```

---

## What's Included

| Tool | Version | Purpose |
|------|---------|---------|
| ESLint | ^9.20 | JavaScript/TypeScript linting |
| Prettier | ^3.5 | Code formatting |
| Husky | ^9.1 | Git hooks |
| Commitlint | ^19.6 | Commit message validation |
| eslint-plugin-sonarjs | ^3.0 | SonarQube rules (200+) |
| eslint-plugin-react | ^7.37 | React-specific rules |
| eslint-plugin-react-hooks | ^5.1 | React hooks rules |
| typescript-eslint | ^8.24 | TypeScript support |

All versions are managed together. Minor upgrades happen automatically. Major upgrades of individual tools are released as major versions of quick-lint.

---

## Requirements

- Node.js >= 18
- Git (for Husky hooks)

---

## License

MIT
