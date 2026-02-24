/**
 * Colored logging utility for quicklint
 */
import chalk from 'chalk';

const PREFIX = chalk.bold.hex('#7c3aed')('⚡ quicklint');

export const logger = {
    info(message: string): void {
        console.log(`${PREFIX} ${chalk.blue('ℹ')} ${message}`);
    },

    success(message: string): void {
        console.log(`${PREFIX} ${chalk.green('✔')} ${message}`);
    },

    warn(message: string): void {
        console.log(`${PREFIX} ${chalk.yellow('⚠')} ${message}`);
    },

    error(message: string): void {
        console.error(`${PREFIX} ${chalk.red('✖')} ${message}`);
    },

    blank(): void {
        console.log();
    },

    header(title: string): void {
        console.log();
        console.log(chalk.bold.hex('#7c3aed')(`  ⚡ ${title}`));
        console.log(chalk.dim('  ' + '─'.repeat(50)));
    },

    table(rows: Array<[string, string | number]>): void {
        const maxLabel = Math.max(...rows.map(([l]) => l.length));
        for (const [label, value] of rows) {
            const formattedValue =
                typeof value === 'number' && value > 0
                    ? chalk.red(String(value))
                    : typeof value === 'number' && value === 0
                        ? chalk.green(String(value))
                        : String(value);
            console.log(`  ${chalk.dim(label.padEnd(maxLabel + 2))} ${formattedValue}`);
        }
    },
};
