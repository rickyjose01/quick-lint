/**
 * Deep merge utility for combining config objects.
 * Arrays are concatenated (not replaced). Objects are recursively merged.
 */

export function deepMerge<T extends Record<string, unknown>>(
    target: T,
    ...sources: Array<Partial<T>>
): T {
    const result = { ...target } as Record<string, unknown>;

    for (const source of sources) {
        if (!source || typeof source !== 'object') continue;

        for (const key of Object.keys(source)) {
            const targetVal = result[key];
            const sourceVal = (source as Record<string, unknown>)[key];

            if (sourceVal === undefined) continue;

            if (
                isPlainObject(targetVal) &&
                isPlainObject(sourceVal)
            ) {
                result[key] = deepMerge(
                    targetVal as Record<string, unknown>,
                    sourceVal as Record<string, unknown>
                );
            } else if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
                // Deduplicate when merging arrays (useful for extends, ignorePatterns)
                result[key] = [...new Set([...targetVal, ...sourceVal])];
            } else {
                result[key] = sourceVal;
            }
        }
    }

    return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}
