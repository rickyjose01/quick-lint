/**
 * JSON reporter — structured output for CI/CD
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { SonarReport } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Write SonarQube report as JSON
 */
export async function writeJsonReport(
    report: SonarReport,
    outputDir: string
): Promise<string> {
    await fs.mkdir(outputDir, { recursive: true });

    const filePath = path.join(outputDir, 'sonarqube-report.json');
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf8');

    logger.success(`JSON report written to ${filePath}`);
    return filePath;
}
