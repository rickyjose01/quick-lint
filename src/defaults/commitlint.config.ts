/**
 * Default Commitlint configuration for quicklint
 * This is exported as 'quicklint/commitlint-config'
 */
import { defaultConfig } from '../config/defaults.js';

const commitlintConfig = {
    extends: defaultConfig.commitlint.extends,
    rules: defaultConfig.commitlint.rules,
};

export default commitlintConfig;
