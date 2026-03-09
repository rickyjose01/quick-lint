/**
 * Git utilities — shared helpers for git operations
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Returns a sanitized PATH containing only fixed, system-owned directories.
 * This prevents PATH injection attacks when spawning child processes.
 */
function getSafePath(): string {
  const sep = path.delimiter;
  if (os.platform() === 'win32') {
    const systemRoot = process.env['SystemRoot'] ?? 'C:\\Windows';
    return [
      path.join(systemRoot, 'System32'),
      systemRoot,
      path.join(systemRoot, 'System32', 'Wbem'),
      path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0'),
      'C:\\Program Files\\Git\\cmd',
    ].join(sep);
  }
  return ['/usr/local/bin', '/usr/bin', '/bin'].join(sep);
}

/**
 * Finds the absolute path to the git executable within the safe directories.
 * Throws if git cannot be found in any safe directory.
 */
function findGitExecutable(): string {
  const safeDirs = getSafePath().split(path.delimiter);
  const candidates = os.platform() === 'win32' ? ['git.exe', 'git.cmd'] : ['git'];
  for (const dir of safeDirs) {
    for (const name of candidates) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  throw new Error('git executable not found in safe PATH directories');
}

/**
 * Get staged JS/TS files from git.
 */
export async function getStagedFiles(): Promise<string[]> {
  try {
    const gitPath = findGitExecutable();
    const safeEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'),
    );
    const output = execFileSync(
      gitPath,
      ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      {
        encoding: 'utf8',
        env: { ...safeEnv, PATH: getSafePath() },
      },
    );
    return output
      .trim()
      .split('\n')
      .filter((f) => /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f));
  } catch {
    return [];
  }
}
