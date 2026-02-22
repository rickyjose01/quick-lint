/**
 * `format` command — runs Prettier on the project
 */
import { loadConfig } from '../../config/loader.js';
import { formatFiles, checkFormatting } from '../../adapters/prettier.js';
import { logger } from '../../utils/logger.js';
import { withSpinner } from '../../utils/spinner.js';

export async function formatCommand(options: {
    check?: boolean;
    staged?: boolean;
}): Promise<void> {
    const config = await loadConfig();

    if (options.check) {
        const result = await withSpinner('Checking formatting', async () =>
            checkFormatting(config)
        );

        logger.blank();

        if (result.success) {
            logger.success('All files are properly formatted ✨');
        } else {
            logger.warn(`${result.unformattedFiles.length} file(s) need formatting:`);
            for (const file of result.unformattedFiles.slice(0, 20)) {
                logger.info(`  ${file}`);
            }
            if (result.unformattedFiles.length > 20) {
                logger.info(`  ... and ${result.unformattedFiles.length - 20} more`);
            }
            logger.blank();
            logger.info('Run `quick-lint format` to fix them.');
            process.exitCode = 1;
        }
    } else {
        await withSpinner(
            `Formatting${options.staged ? ' staged files' : ' all files'}`,
            async () => formatFiles(config, { staged: options.staged })
        );
    }

    logger.blank();
}
