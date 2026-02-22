/**
 * Ambient module declarations for @commitlint packages.
 *
 * These packages are `"type": "module"` but lack an `"exports"` field,
 * which prevents TypeScript's Node16 module resolution from finding
 * the type declarations via the legacy `"main"` / `"types"` fallback.
 */

declare module '@commitlint/lint' {
    import type { LintOptions, LintOutcome, QualifiedRules } from '@commitlint/types';
    export default function lint(
        message: string,
        rawRulesConfig?: QualifiedRules,
        rawOpts?: LintOptions,
    ): Promise<LintOutcome>;
}

declare module '@commitlint/load' {
    import type { QualifiedConfig } from '@commitlint/types';
    export default function load(
        seed?: unknown,
        options?: { cwd?: string; file?: string },
    ): Promise<QualifiedConfig>;
}
