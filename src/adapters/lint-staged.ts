/**
 * Lint-staged adapter
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { QuickLintConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Write .lintstagedrc.json
 */
export async function setupLintStaged(config: QuickLintConfig): Promise<void> {
  if (!config.lintStaged.enabled) {
    logger.info('Lint-staged is disabled');
    return;
  }

  const cwd = process.cwd();
  const filePath = path.join(cwd, '.lintstagedrc.json');

  await fs.writeFile(filePath, `${JSON.stringify(config.lintStaged.config, null, 2)}\n`, 'utf8');
  logger.success('Created .lintstagedrc.json');
}

/**
 * Remove lint-staged configs
 */
export async function removeLintStaged(): Promise<void> {
  const cwd = process.cwd();
  try {
    await fs.unlink(path.join(cwd, '.lintstagedrc.json'));
    logger.success('Removed .lintstagedrc.json');
  } catch {
    // Ignored
  }
}
