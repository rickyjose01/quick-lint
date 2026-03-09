/**
 * `init` command — scaffolds quicklint in a project
 */
import { promises as fs, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { loadConfig } from '../../config/loader.js';
import { setupHusky } from '../../adapters/husky.js';
import { setupLintStaged } from '../../adapters/lint-staged.js';
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
 * Read quicklint's own peerDependencies from its package.json.
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
 * Check which peer dependencies are missing from the host project's package.json
 * and install them automatically.
 */
async function installMissingPeers(): Promise<void> {
  const peerDeps = getQuickLintPeerDeps();
  if (Object.keys(peerDeps).length === 0) return;

  const missing: string[] = [];
  let hostPkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  } = {};

  try {
    const hostPkgPath = path.join(process.cwd(), 'package.json');
    hostPkg = JSON.parse(await fs.readFile(hostPkgPath, 'utf8'));
  } catch {
    // If no package.json, we assume everything is missing
  }

  const allHostDeps = {
    ...(hostPkg.dependencies || {}),
    ...(hostPkg.devDependencies || {}),
    ...(hostPkg.peerDependencies || {}),
  };

  for (const pkgName of Object.keys(peerDeps)) {
    if (!allHostDeps[pkgName]) {
      missing.push(pkgName);
    }
  }

  if (missing.length === 0) {
    logger.success('All required packages are already in package.json');
    return;
  }

  logger.info(`Installing ${missing.length} missing package(s): ${missing.join(', ')}`);

  try {
    // Validate package names to strictly prevent any command injection
    const isValid = missing.every(pkg => /^[a-zA-Z0-9\-_.@/]+$/.test(pkg));
    if (!isValid) throw new Error('Invalid package names prevented installation');
    
    const packages = missing.join(' ');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    // eslint-disable-next-line
    execSync(`${npmCmd} install --save-dev ${packages}`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    logger.success(`Installed ${missing.length} package(s)`);
  } catch (error) {
    logger.warn('Some packages could not be installed automatically.');
    if (error instanceof Error && 'stderr' in error && error.stderr) {
      logger.error(error.stderr.toString());
    }
    logger.info(`Try manually: npm install --save-dev ${missing.join(' ')}`);
  }
}

/**
 * Ensure `quicklint` itself is installed in the project's node_modules.
 * This is required for the eslint.config.mjs proxy to resolve imports.
 */
async function ensureQuickLintInstalled(): Promise<void> {
  const cwd = process.cwd();
  try {
    await fs.access(path.join(cwd, 'node_modules', 'quicklint-react'));
    return; // Already installed
  } catch {
    // Not installed — install it
  }

  logger.info('Installing quicklint as a dev dependency...');
  try {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    // eslint-disable-next-line
    execSync(`${npmCmd} install --save-dev quicklint-react`, {
      cwd,
      stdio: 'pipe',
    });
    logger.success('Installed quicklint');
  } catch (error) {
    logger.warn('Could not install quicklint-react automatically.');
    if (error instanceof Error && 'stderr' in error && error.stderr) {
      logger.error(error.stderr.toString());
    }
    logger.info('Try manually: npm install --save-dev quicklint-react');
  }
}

export async function initCommand(): Promise<void> {
  logger.header('Initializing quicklint');
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

  // 2. Ensure quicklint itself is installed (required for IDE proxy)
  await withSpinner('Ensuring quicklint is installed', async () => {
    await ensureQuickLintInstalled();
  });

  // 3. Install missing peer dependencies
  await withSpinner('Checking and installing dependencies', async () => {
    await installMissingPeers();
  });

  // 3. Load the config (defaults + user overrides)
  const config = await loadConfig(cwd);

  // 4. Set up Husky hooks and lint-staged
  await withSpinner('Setting up git hooks and lint tools', async () => {
    await setupHusky(config);
    await setupLintStaged(config);
  });

  // 5. Generate IDE config files
  await withSpinner('Configuring IDE integration', async () => {
    await emitIdeConfigs(config);
  });

  // 6. Print success message
  logger.blank();
  logger.header('quicklint is ready! 🚀');
  logger.blank();

  logger.info('Available commands:');
  logger.table([
    ['quicklint lint', 'Run ESLint + SonarJS analysis'],
    ['quicklint format', 'Format code with Prettier'],
    ['quicklint check', 'Run all quality checks'],
    ['quicklint report', 'Generate SonarQube-style report'],
  ]);
  logger.blank();

  logger.info(chalk.bold('IDE Integration:'));
  logger.info('  • ESLint + SonarJS linting is now active in your editor');
  logger.info('  • Install the recommended VS Code extensions when prompted');
  logger.info('  • Prettier format-on-save is configured in .vscode/settings.json');
  logger.blank();
  logger.info(chalk.yellow('  ⚠️  Please RELOAD your IDE window for ESLint to pick up the new packages.'));
  logger.blank();
  logger.info(chalk.magenta('  🔄  Remember: If you change Prettier, Husky, or IDE settings in quicklint.config.js,'));
  logger.info(chalk.magenta('      you MUST run `npx quicklint init` again to synchronize them!'));
  logger.blank();

  logger.info('Customize by editing quicklint.config.js');
  logger.blank();
}

function getInlineTemplate(): string {
  return `// quicklint Configuration
// Docs: https://github.com/user/quicklint#configuration
// 
// ⚠️ NOTE: If you change Prettier, Husky, or IDE Configs, you MUST run
// \`npx quicklint init\` again for the changes to take effect in your project.

/** @type {import('quicklint-react').QuickLintConfig} */
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
      'pre-commit': 'npx lint-staged',
      'commit-msg': 'npx quicklint commitlint --edit "$1"',
    },
  },

  ide: {
    generateConfigs: true,
  },
};
`;
}
