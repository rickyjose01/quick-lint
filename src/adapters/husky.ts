/**
 * Husky adapter — programmatic git hooks setup
 */
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { QuickLintConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Check if the current directory is inside a git repository
 */
async function isGitRepo(): Promise<boolean> {
    try {
        execSync('git rev-parse --is-inside-work-tree', {
            stdio: 'ignore',
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Initialize Husky and install git hooks
 */
export async function setupHusky(config: QuickLintConfig): Promise<void> {
    if (!config.husky.enabled) {
        logger.info('Husky is disabled — skipping hooks setup');
        return;
    }

    if (!(await isGitRepo())) {
        logger.warn('Not a git repository — skipping Husky setup');
        logger.info('Run "git init" first, then "quick-lint init" again');
        return;
    }

    const cwd = process.cwd();

    // Initialize Husky
    try {
        execSync('npx husky init', {
            cwd,
            stdio: 'ignore',
        });
    } catch {
        // Husky may already be initialized, try to create .husky dir manually
        const huskyDir = path.join(cwd, '.husky');
        await fs.mkdir(huskyDir, { recursive: true });
    }

    // Write hook files
    const huskyDir = path.join(cwd, '.husky');
    await fs.mkdir(huskyDir, { recursive: true });

    for (const [hookName, command] of Object.entries(config.husky.hooks)) {
        const hookPath = path.join(huskyDir, hookName);
        const hookContent = `#!/usr/bin/env sh\n${command}\n`;

        await fs.writeFile(hookPath, hookContent, { encoding: 'utf8', mode: 0o755 });
        logger.success(`Created hook: .husky/${hookName}`);
    }
}

/**
 * Remove Husky hooks
 */
export async function removeHusky(): Promise<void> {
    const cwd = process.cwd();
    const huskyDir = path.join(cwd, '.husky');

    try {
        await fs.rm(huskyDir, { recursive: true, force: true });
        logger.success('Removed .husky directory');
    } catch {
        logger.warn('No .husky directory found');
    }
}
