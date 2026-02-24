/**
 * Ambient module declarations for packages without TypeScript types.
 */

declare module 'eslint-plugin-jsx-a11y' {
    import type { ESLint } from 'eslint';
    const plugin: ESLint.Plugin;
    export default plugin;
}
