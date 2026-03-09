/**
 * Prettier adapter — runs Prettier via Node.js API
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { QuickLintConfig, PrettierResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getStagedFiles } from '../utils/git.js';

/**
 * Dynamically import prettier. Throws a helpful error if not installed.
 */
async function loadPrettier(): Promise<typeof import('prettier')> {
  try {
    return await import('prettier');
  } catch {
    throw new Error('prettier is not installed. Install it with: npm install --save-dev prettier');
  }
}

/**
 * Extract Prettier-specific options from the quicklint config.
 * Strips the `enabled` flag so the result can be passed directly to Prettier.
 */
export function buildPrettierConfig(config: QuickLintConfig): Record<string, unknown> {
  const prettierOpts = { ...config.prettier };
  delete (prettierOpts as { enabled?: boolean }).enabled;
  return prettierOpts;
}

/**
 * Supported file extensions for formatting, grouped by language.
 */
const FORMATTABLE_EXTENSIONS: ReadonlyArray<ReadonlyArray<string>> = [
  ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
  ['.css', '.scss', '.less'],
  ['.json', '.jsonc'],
  ['.md', '.mdx'],
  ['.yml', '.yaml'],
  ['.html', '.htm'],
  ['.graphql', '.gql'],
];

const FORMATTABLE_EXT_SET: ReadonlySet<string> = new Set(FORMATTABLE_EXTENSIONS.flat());

/**
 * Directories and files that should always be ignored during formatting.
 */
const IGNORE_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  'coverage',
  '.git',
  '.husky',
]);

const IGNORE_FILES: ReadonlySet<string> = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
]);

function isFormattableFile(name: string): boolean {
  if (IGNORE_FILES.has(name)) return false;
  if (name.endsWith('.min.js') || name.endsWith('.min.css')) return false;
  return FORMATTABLE_EXT_SET.has(path.extname(name));
}

async function collectFormattableFiles(dir: string, results: string[]): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const { name } = entry;
    const fullPath = path.join(dir, name);

    if (entry.isDirectory() && !IGNORE_DIRS.has(name)) {
      await collectFormattableFiles(fullPath, results);
    } else if (entry.isFile() && isFormattableFile(name)) {
      results.push(fullPath);
    }
  }
}

/**
 * Recursively walk a directory and collect formattable files.
 */
async function getFormattableFiles(cwd: string): Promise<string[]> {
  const results: string[] = [];
  await collectFormattableFiles(cwd, results);
  return results;
}

/**
 * Build Prettier options for a single file.
 */
function buildFileOptions(
  prettierConfig: Record<string, unknown>,
  filePath: string,
  inferredParser: string | null,
): Record<string, unknown> {
  return {
    ...prettierConfig,
    filepath: filePath,
    ...(inferredParser ? { parser: inferredParser } : {}),
  };
}

/**
 * Check formatting of all files (read-only).
 */
export async function checkFormatting(config: QuickLintConfig): Promise<PrettierResult> {
  const startTime = Date.now();

  if (!config.prettier.enabled) {
    return { success: true, unformattedFiles: [], totalFiles: 0, duration: 0 };
  }

  const prettierConfig = buildPrettierConfig(config);
  const cwd = process.cwd();
  const files = await getFormattableFiles(cwd);
  const unformattedFiles: string[] = [];

  const prettier = await loadPrettier();

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileInfo = await prettier.getFileInfo(filePath);
      if (fileInfo.ignored) continue;

      const opts = buildFileOptions(prettierConfig, filePath, fileInfo.inferredParser);
      const isFormatted = await prettier.check(content, opts);

      if (!isFormatted) {
        unformattedFiles.push(path.relative(cwd, filePath));
      }
    } catch (error) {
      // Re-throw prettier not installed errors
      if (error instanceof Error && error.message.includes('not installed')) throw error;
      // Skip files that can't be parsed (e.g. binary, broken syntax)
    }
  }

  return {
    success: unformattedFiles.length === 0,
    unformattedFiles,
    totalFiles: files.length,
    duration: Date.now() - startTime,
  };
}

/**
 * Resolves the files to format based on the provided options.
 */
async function resolveFilesToFormat(
  cwd: string,
  options: { staged?: boolean; files?: string[] },
): Promise<string[]> {
  if (options.files && options.files.length > 0) {
    return options.files.map((f) => path.resolve(cwd, f));
  }
  if (options.staged) {
    const staged = await getStagedFiles();
    return staged.map((f) => path.resolve(cwd, f));
  }
  return getFormattableFiles(cwd);
}

/**
 * Process and format a single file.
 */
async function formatSingleFile(
  prettier: typeof import('prettier'),
  filePath: string,
  prettierConfig: Record<string, unknown>,
  cwd: string,
): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const fileInfo = await prettier.getFileInfo(filePath);
    if (fileInfo.ignored) return null;

    const opts = buildFileOptions(prettierConfig, filePath, fileInfo.inferredParser);
    const formattedContent = await prettier.format(content, opts);

    if (content !== formattedContent) {
      await fs.writeFile(filePath, formattedContent, 'utf8');
      return path.relative(cwd, filePath);
    }
  } catch (error) {
    // Re-throw prettier not installed errors
    if (error instanceof Error && error.message.includes('not installed')) throw error;
    // Skip files that can't be parsed
  }
  return null;
}

/**
 * Format all files with Prettier (writes changes to disk).
 */
export async function formatFiles(
  config: QuickLintConfig,
  formatOptions: { staged?: boolean; files?: string[] } = {},
): Promise<PrettierResult> {
  const startTime = Date.now();

  if (!config.prettier.enabled) {
    return { success: true, unformattedFiles: [], totalFiles: 0, duration: 0 };
  }

  const prettierConfig = buildPrettierConfig(config);
  const cwd = process.cwd();
  const files = await resolveFilesToFormat(cwd, formatOptions);

  const changedFiles: string[] = [];
  const prettier = await loadPrettier();

  for (const filePath of files) {
    const changedFile = await formatSingleFile(prettier, filePath, prettierConfig, cwd);
    if (changedFile) {
      changedFiles.push(changedFile);
    }
  }

  if (changedFiles.length > 0) {
    logger.success(`Formatted ${changedFiles.length} file(s)`);
  } else {
    logger.success('All files are properly formatted');
  }

  return {
    success: true,
    unformattedFiles: changedFiles,
    totalFiles: files.length,
    duration: Date.now() - startTime,
  };
}
