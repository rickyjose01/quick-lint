/**
 * Default Prettier configuration for Quick-Lint
 * This is exported as 'quick-lint/prettier-config'
 */
import { defaultConfig } from '../config/defaults.js';

const prettierConfig = {
    semi: defaultConfig.prettier.semi,
    singleQuote: defaultConfig.prettier.singleQuote,
    trailingComma: defaultConfig.prettier.trailingComma,
    tabWidth: defaultConfig.prettier.tabWidth,
    printWidth: defaultConfig.prettier.printWidth,
    arrowParens: defaultConfig.prettier.arrowParens,
    endOfLine: defaultConfig.prettier.endOfLine,
    bracketSpacing: defaultConfig.prettier.bracketSpacing,
    jsxSingleQuote: defaultConfig.prettier.jsxSingleQuote,
};

export default prettierConfig;
