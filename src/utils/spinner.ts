/**
 * Spinner utility wrapping `ora` for progress indicators
 */
import ora, { type Ora } from 'ora';
import chalk from 'chalk';

export function createSpinner(text: string): Ora {
    return ora({
        text,
        color: 'magenta',
        prefixText: chalk.bold.hex('#7c3aed')('⚡'),
    });
}

export async function withSpinner<T>(
    text: string,
    fn: () => Promise<T>
): Promise<T> {
    const spinner = createSpinner(text);
    spinner.start();
    try {
        const result = await fn();
        spinner.succeed();
        return result;
    } catch (error) {
        spinner.fail();
        throw error;
    }
}
