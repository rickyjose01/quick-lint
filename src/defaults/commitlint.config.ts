/**
 * Default Commitlint configuration for Quick-Lint
 * This is exported as 'quick-lint/commitlint-config'
 */
import { defaultConfig } from '../config/defaults.js';

const commitlintConfig = {
    extends: defaultConfig.commitlint.extends,
    rules: defaultConfig.commitlint.rules,
};

export default commitlintConfig;
