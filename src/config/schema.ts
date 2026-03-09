/**
 * Config validation schema
 */

function validateEslintConfig(eslint: unknown, errors: string[]) {
  if (typeof eslint !== 'object' || eslint === null) {
    errors.push('eslint config must be an object');
    return;
  }
  const eslintCfg = eslint as Record<string, unknown>;
  if (eslintCfg.rules !== undefined && typeof eslintCfg.rules !== 'object') {
    errors.push('eslint.rules must be an object');
  }
  if (eslintCfg.ignorePatterns !== undefined && !Array.isArray(eslintCfg.ignorePatterns)) {
    errors.push('eslint.ignorePatterns must be an array');
  }
}

function validatePrettierConfig(prettier: unknown, errors: string[]) {
  if (typeof prettier !== 'object' || prettier === null) {
    errors.push('prettier config must be an object');
    return;
  }
  const prettierCfg = prettier as Record<string, unknown>;
  if (prettierCfg.tabWidth !== undefined && typeof prettierCfg.tabWidth !== 'number') {
    errors.push('prettier.tabWidth must be a number');
  }
  if (prettierCfg.printWidth !== undefined && typeof prettierCfg.printWidth !== 'number') {
    errors.push('prettier.printWidth must be a number');
  }
  if (
    prettierCfg.trailingComma !== undefined &&
    !['all', 'es5', 'none'].includes(prettierCfg.trailingComma as string)
  ) {
    errors.push('prettier.trailingComma must be one of: all, es5, none');
  }
}

function validateSonarqubeConfig(sonarqube: unknown, errors: string[]) {
  if (typeof sonarqube !== 'object' || sonarqube === null) {
    errors.push('sonarqube config must be an object');
    return;
  }
  const sonarCfg = sonarqube as Record<string, unknown>;
  if (sonarCfg.report !== undefined) {
    const report = sonarCfg.report as Record<string, unknown>;
    if (
      report.format !== undefined &&
      !['html', 'json', 'both'].includes(report.format as string)
    ) {
      errors.push('sonarqube.report.format must be one of: html, json, both');
    }
  }
}

function validateHuskyConfig(husky: unknown, errors: string[]) {
  if (typeof husky !== 'object' || husky === null) {
    errors.push('husky config must be an object');
    return;
  }
  const huskyCfg = husky as Record<string, unknown>;
  if (huskyCfg.hooks !== undefined && typeof huskyCfg.hooks !== 'object') {
    errors.push('husky.hooks must be an object');
  }
}

function validateLintStagedConfig(lintStaged: unknown, errors: string[]) {
  if (typeof lintStaged !== 'object' || lintStaged === null) {
    errors.push('lintStaged config must be an object');
  }
}

export function validateConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof config !== 'object' || config === null) {
    return { valid: false, errors: ['Config must be an object'] };
  }

  const cfg = config as Record<string, unknown>;

  if (cfg.eslint !== undefined) validateEslintConfig(cfg.eslint, errors);
  if (cfg.prettier !== undefined) validatePrettierConfig(cfg.prettier, errors);
  if (cfg.sonarqube !== undefined) validateSonarqubeConfig(cfg.sonarqube, errors);
  if (cfg.husky !== undefined) validateHuskyConfig(cfg.husky, errors);
  if (cfg.lintStaged !== undefined) validateLintStagedConfig(cfg.lintStaged, errors);

  return { valid: errors.length === 0, errors };
}
