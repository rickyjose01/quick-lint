/**
 * `report` command — generates SonarQube-style HTML/JSON report
 */
import { loadConfig } from '../../config/loader.js';
import { runSonarAnalysis, buildSonarReport } from '../../adapters/sonarqube.js';
import { writeHtmlReport } from '../../reporters/html.js';
import { writeJsonReport } from '../../reporters/json.js';
import { logger } from '../../utils/logger.js';
import { withSpinner } from '../../utils/spinner.js';
import chalk from 'chalk';

export async function reportCommand(options: { format?: string; output?: string }): Promise<void> {
  const config = await loadConfig();

  // Override from CLI options
  const format = options.format || config.sonarqube.report.format;
  const outputDir = options.output || config.sonarqube.report.outputDir;

  // 1. Run analysis
  const result = await withSpinner('Running SonarQube analysis...', async () =>
    runSonarAnalysis(config),
  );

  // 2. Build structured report
  const report = buildSonarReport(result);

  // 3. Write reports
  logger.blank();

  if (format === 'html' || format === 'both') {
    const htmlPath = await writeHtmlReport(report, outputDir);
    const url = `file://${htmlPath}`;
    logger.info(`Open: ${chalk.underline(url)}`);
  }

  if (format === 'json' || format === 'both') {
    await writeJsonReport(report, outputDir);
  }

  // 4. Print summary
  logger.blank();
  logger.header('SonarQube Analysis Summary');
  logger.blank();
  logger.table([
    ['🐛 Bugs', report.summary.bugs],
    ['🔒 Vulnerabilities', report.summary.vulnerabilities],
    ['🔧 Code Smells', report.summary.codeSmells],
    ['📋 Total Issues', report.summary.totalIssues],
  ]);
  logger.blank();
}
