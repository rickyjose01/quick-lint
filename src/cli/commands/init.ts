/**
 * `init` command — scaffolds quick-lint in a project
 */
import { promises as fs, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { loadConfig } from '../../config/loader.js';
import { setupHusky } from '../../adapters/husky.js';
import { emitIdeConfigs } from '../../ide/config-emitter.js';
import { logger } from '../../utils/logger.js';
import { withSpinner } from '../../utils/spinner.js';
import chalk from 'chalk';

/**
 * Resolve the templates directory relative to this file's location.
 */
function getTemplatesDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..', '..', '..', 'templates');
}

/**
 * Read quick-lint's own peerDependencies from its package.json.
 */
function getQuickLintPeerDeps(): Record<string, string> {
  try {
    const pkgPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..', '..', '..', 'package.json'
    );
    const raw = JSON.parse(
      readFileSync(pkgPath, 'utf8')
    );
    return raw.peerDependencies ?? {};
  } catch {
    return {};
  }
}

/**
 * Check which peer dependencies are missing from the host project
 * and install them automatically.
 */
async function installMissingPeers(): Promise<void> {
  const peerDeps = getQuickLintPeerDeps();
  if (Object.keys(peerDeps).length === 0) return;

  const missing: string[] = [];

  for (const pkgName of Object.keys(peerDeps)) {
    try {
      // Check if the package exists in the host project's node_modules
      const resolved = path.join(process.cwd(), 'node_modules', pkgName);
      await fs.access(resolved);
    } catch {
      missing.push(pkgName);
    }
  }

  if (missing.length === 0) {
    logger.success('All required packages are already installed');
    return;
  }

  logger.info(`Installing ${missing.length} missing package(s): ${missing.join(', ')}`);

  try {
    const packages = missing.join(' ');
    execSync(`npm install --save-dev ${packages}`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    logger.success(`Installed ${missing.length} package(s)`);
  } catch {
    logger.warn('Some packages could not be installed automatically.');
    logger.info(`Try manually: npm install --save-dev ${missing.join(' ')}`);
  }
}

/**
 * Ensure `quick-lint` itself is installed in the project's node_modules.
 * This is required for the eslint.config.mjs proxy to resolve imports.
 */
async function ensureQuickLintInstalled(): Promise<void> {
  const cwd = process.cwd();
  try {
    await fs.access(path.join(cwd, 'node_modules', 'quick-lint'));
    return; // Already installed
  } catch {
    // Not installed — install it
  }

  logger.info('Installing quick-lint as a dev dependency...');
  try {
    execSync('npm install --save-dev quick-lint', {
      cwd,
      stdio: 'inherit',
    });
    logger.success('Installed quick-lint');
  } catch {
    logger.warn('Could not install quick-lint automatically.');
    logger.info('Try manually: npm install --save-dev quick-lint');
  }
}

export async function initCommand(): Promise<void> {
  logger.header('Initializing Quick-Lint');
  logger.blank();

  const cwd = process.cwd();

  // 1. Create quicklint.config.js if it doesn't exist
  const configPath = path.join(cwd, 'quicklint.config.js');

  try {
    await fs.access(configPath);
    logger.info('quicklint.config.js already exists — keeping it');
  } catch {
    await withSpinner('Creating quicklint.config.js', async () => {
      const templatePath = path.join(getTemplatesDir(), 'quicklint.config.js');

      let template: string;
      try {
        template = await fs.readFile(templatePath, 'utf8');
      } catch {
        // Fallback inline template if the bundled template is missing
        template = getInlineTemplate();
      }

      await fs.writeFile(configPath, template, 'utf8');
    });
  }

  // 2. Ensure quick-lint itself is installed (required for IDE proxy)
  await withSpinner('Ensuring quick-lint is installed', async () => {
    await ensureQuickLintInstalled();
  });

  // 3. Install missing peer dependencies
  await withSpinner('Checking and installing dependencies', async () => {
    await installMissingPeers();
  });

  // 3. Load the config (defaults + user overrides)
  const config = await loadConfig(cwd);

  // 4. Set up Husky hooks
  await withSpinner('Setting up git hooks (Husky)', async () => {
    await setupHusky(config);
  });

  // 5. Generate IDE config files
  await withSpinner('Configuring IDE integration', async () => {
    await emitIdeConfigs(config);
  });

  // 6. Print success message
  logger.blank();
  logger.header('Quick-Lint is ready! 🚀');
  logger.blank();

  logger.info('Available commands:');
  logger.table([
    ['quick-lint lint', 'Run ESLint + SonarJS analysis'],
    ['quick-lint format', 'Format code with Prettier'],
    ['quick-lint check', 'Run all quality checks'],
    ['quick-lint report', 'Generate SonarQube-style report'],
  ]);
  logger.blank();

  logger.info(chalk.bold('IDE Integration:'));
  logger.info('  • ESLint + SonarJS linting is now active in your editor');
  logger.info('  • Install the recommended VS Code extensions when prompted');
  logger.info('  • Prettier format-on-save is configured in .vscode/settings.json');
  logger.blank();

  logger.info('Customize by editing quicklint.config.js');
  logger.blank();
}

function getInlineTemplate(): string {
  return `// Quick-Lint Configuration
// Docs: https://github.com/user/quick-lint#configuration

/** @type {import('quick-lint').QuickLintConfig} */
export default {
  eslint: {
    enabled: true,
    react: true,
    typescript: true,
    rules: {},
    ignorePatterns: ['node_modules', 'dist', 'build', '.next', 'coverage'],
  },

  prettier: {
    enabled: true,
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    tabWidth: 2,
    printWidth: 100,
  },

  commitlint: {
    enabled: true,
    rules: {},
  },

  sonarqube: {
    enabled: true,
    rules: {},
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
`;
}
