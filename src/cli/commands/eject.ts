/**
 * `eject` command — removes all quicklint generated config files
 * and uninstalls the package from the host project.
 */
import { promises as fs, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { removeHusky } from '../../adapters/husky.js';
import { removeIdeConfigs } from '../../ide/config-emitter.js';
import { logger } from '../../utils/logger.js';
import { withSpinner } from '../../utils/spinner.js';
import chalk from 'chalk';

/**
 * All possible quicklint config file names (cosmiconfig search places).
 */
const CONFIG_FILES = [
    'quicklint.config.js',
    'quicklint.config.cjs',
    'quicklint.config.mjs',
    'quicklint.config.json',
    '.quicklintrc',
    '.quicklintrc.json',
    '.quicklintrc.js',
    '.quicklintrc.cjs',
];

/**
 * Read quicklint's own peerDependencies from its package.json.
 */
function getQuickLintPeerDeps(): string[] {
    try {
        const pkgPath = path.resolve(
            process.cwd(),
            'node_modules',
            'quicklint',
            'package.json',
        );
        const raw = JSON.parse(readFileSync(pkgPath, 'utf8'));
        return Object.keys(raw.peerDependencies ?? {});
    } catch {
        return [];
    }
}

/**
 * Remove all quicklint config files from the project root.
 */
async function removeConfigFiles(cwd: string, dryRun: boolean): Promise<string[]> {
    const removed: string[] = [];

    for (const file of CONFIG_FILES) {
        const filePath = path.join(cwd, file);
        try {
            await fs.access(filePath);
            if (!dryRun) {
                await fs.unlink(filePath);
            }
            removed.push(file);
        } catch {
            // File doesn't exist
        }
    }

    return removed;
}

/**
 * Uninstall quicklint and its peer dependencies.
 */
function uninstallPackages(keepDeps: boolean, dryRun: boolean): string[] {
    const packages = ['quicklint'];

    if (!keepDeps) {
        const peers = getQuickLintPeerDeps();
        packages.push(...peers);
    }

    if (!dryRun) {
        try {
            execSync(`npm uninstall ${packages.join(' ')}`, {
                cwd: process.cwd(),
                stdio: 'inherit',
            });
        } catch {
            logger.warn('Some packages could not be uninstalled automatically.');
            logger.info(`Try manually: npm uninstall ${packages.join(' ')}`);
        }
    }

    return packages;
}

export async function ejectCommand(options: {
    keepDeps?: boolean;
    dryRun?: boolean;
}): Promise<void> {
    const cwd = process.cwd();
    const dryRun = options.dryRun ?? false;

    if (dryRun) {
        logger.header('Eject Preview (dry run — no changes will be made)');
    } else {
        logger.header('Ejecting quicklint');
    }
    logger.blank();

    // 1. Remove quicklint config files
    const removedConfigs = await withSpinner(
        'Removing quicklint config files',
        async () => removeConfigFiles(cwd, dryRun),
    );
    if (removedConfigs.length > 0) {
        for (const file of removedConfigs) {
            logger.success(`${dryRun ? 'Would remove' : 'Removed'} ${file}`);
        }
    } else {
        logger.info('No quicklint config files found');
    }

    // 2. Remove IDE proxy config files (eslint.config.mjs, .prettierrc.json, commitlint.config.cjs)
    await withSpinner('Removing IDE proxy config files', async () => {
        if (!dryRun) {
            await removeIdeConfigs();
        } else {
            const ideFiles = ['eslint.config.mjs', '.prettierrc.json', 'commitlint.config.cjs'];
            for (const file of ideFiles) {
                try {
                    await fs.access(path.join(cwd, file));
                    logger.success(`Would remove ${file}`);
                } catch {
                    // Doesn't exist
                }
            }
        }
    });

    // 3. Remove .husky directory
    await withSpinner('Removing Husky git hooks', async () => {
        if (!dryRun) {
            await removeHusky();
        } else {
            try {
                await fs.access(path.join(cwd, '.husky'));
                logger.success('Would remove .husky/ directory');
            } catch {
                logger.info('No .husky/ directory found');
            }
        }
    });

    // 4. Uninstall packages
    logger.blank();
    if (dryRun) {
        const packages = ['quicklint'];
        if (!options.keepDeps) packages.push(...getQuickLintPeerDeps());
        logger.info(chalk.bold('Would uninstall:'));
        for (const pkg of packages) {
            logger.info(`  • ${pkg}`);
        }
    } else {
        await withSpinner('Uninstalling packages', async () => {
            uninstallPackages(options.keepDeps ?? false, false);
        });
    }

    // 5. Print summary
    logger.blank();
    if (dryRun) {
        logger.header('Dry run complete — no changes were made');
        logger.blank();
        logger.info(`Run ${chalk.bold('npx quicklint eject')} to perform the actual eject.`);
    } else {
        logger.header('quicklint has been ejected! 👋');
        logger.blank();
        logger.info('All quicklint config files and dependencies have been removed.');
        logger.info('Your project is now free of quicklint configuration.');
    }
    logger.blank();
}
