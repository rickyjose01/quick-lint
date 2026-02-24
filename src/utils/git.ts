/**
 * Git utilities — shared helpers for git operations
 */
import { execSync } from 'node:child_process';

/**
 * Get staged JS/TS files from git.
 */
export function getStagedFiles(): string[] {
    try {
        const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
            encoding: 'utf8',
        });
        return output
            .trim()
            .split('\n')
            .filter((f) => /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f));
    } catch {
        return [];
    }
}
