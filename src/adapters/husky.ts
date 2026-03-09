/**
 * Husky adapter — programmatic git hooks setup
 */
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { QuickLintConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Build a hardened PATH containing only fixed, system-owned directories.
 * This prevents PATH-injection attacks where a writable directory in PATH
 * could contain a malicious executable.
 */
function getSafeEnv(): NodeJS.ProcessEnv {
  const safePaths =
    process.platform === 'win32'
      ? ['C:\\Windows\\System32', 'C:\\Windows', 'C:\\Program Files\\Git\\cmd']
      : ['/usr/local/bin', '/usr/bin', '/bin'];

  return { ...process.env, PATH: safePaths.join(path.delimiter) };
}

/**
 * Resolve the absolute path of a command within the safe PATH.
 * Using the absolute path avoids any residual PATH-lookup at exec time.
 */
function resolveCommand(cmd: string): string {
  const safeEnv = getSafeEnv();
  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  return execFileSync(whichCmd, [cmd], {
    env: safeEnv,
    encoding: 'utf8',
  })
    .split(/\r?\n/)[0]
    .trim();
}

/**
 * Check if the current directory is inside a git repository
 */
async function isGitRepo(): Promise<boolean> {
  try {
    const gitPath = resolveCommand('git');
    execFileSync(gitPath, ['rev-parse', '--is-inside-work-tree'], {
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
    logger.info('Husky is disabled in config — removing any existing hooks');
    await removeHusky();
    return;
  }

  if (!(await isGitRepo())) {
    logger.warn('Not a git repository — skipping Husky setup');
    logger.info('Run "git init" first, then "quicklint init" again');
    return;
  }

  const cwd = process.cwd();

  // Initialize Husky
  try {
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execFileSync(npxCmd, ['husky', 'init'], {
      cwd,
      stdio: 'ignore',
      shell: process.platform === 'win32',
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
    let existing = '';
    try {
      existing = await fs.readFile(hookPath, 'utf8');
    } catch {
      // File does not exist
    }

    if (existing) {
      if (!existing.includes(command)) {
        await fs.writeFile(hookPath, `${existing.trimEnd()}\n${command}\n`, {
          encoding: 'utf8',
          mode: 0o755,
        });
        logger.success(`Updated hook: .husky/${hookName}`);
      } else {
        logger.info(`Hook already contains command: .husky/${hookName}`);
      }
    } else {
      const hookContent = `#!/usr/bin/env sh\n${command}\n`;
      await fs.writeFile(hookPath, hookContent, { encoding: 'utf8', mode: 0o755 });
      logger.success(`Created hook: .husky/${hookName}`);
    }
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
