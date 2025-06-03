import path from 'path';

/**
 * Validates and fixes filename to ensure it's safe for file system operations
 * @param {string} filename - The filename to validate and fix
 * @param {string} defaultName - Default name if filename becomes empty (default: 'file')
 * @returns {string} - Safe filename
 */
export const validateAndFixFilename = (filename, defaultName = 'file') => {
    if (!filename || typeof filename !== 'string') {
        return defaultName;
    }

    // Parse the filename to separate name and extension
    const ext = path.extname(filename);
    let name = path.basename(filename, ext);

    // Remove or replace problematic characters
    // Windows reserved characters: < > : " | ? * \ /
    // Additional problematic chars: [ ] + ' and control characters
    name = name
        .replace(/[<>:"|?*\\\/\[\]+']/g, '') // Remove special characters
        .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
        .replace(/^\.+/, '') // Remove leading dots
        .replace(/\.+$/, '') // Remove trailing dots
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    // Handle Windows reserved names
    const windowsReservedNames = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    if (windowsReservedNames.includes(name.toUpperCase())) {
        name = `${name}_file`;
    }

    // If name becomes empty after cleaning, use default
    if (!name) {
        name = defaultName;
    }

    // Ensure filename isn't too long (most filesystems have 255 byte limit)
    const maxLength = 250; // Leave some room for extension
    if (name.length > maxLength) {
        name = name.substring(0, maxLength);
    }

    // Clean the extension as well
    let cleanExt = ext.replace(/[<>:"|?*\\\/\[\]+']/g, '').replace(/[\x00-\x1f\x80-\x9f]/g, '');

    // Ensure extension starts with dot if it exists
    if (cleanExt && !cleanExt.startsWith('.')) {
        cleanExt = '.' + cleanExt;
    }

    return name + cleanExt;
};

/**
 * Validates if a filename is safe for file system operations
 * @param {string} filename - The filename to validate
 * @returns {boolean} - True if filename is safe, false otherwise
 */
export const isValidFilename = (filename) => {
    if (!filename || typeof filename !== 'string') {
        return false;
    }

    // Check for problematic characters
    const problematicChars = /[<>:"|?*\\\/\[\]+']/;
    if (problematicChars.test(filename)) {
        return false;
    }

    // Check for control characters
    if (/[\x00-\x1f\x80-\x9f]/.test(filename)) {
        return false;
    }

    // Check for leading/trailing dots or spaces
    if (/^[.\s]|[.\s]$/.test(filename)) {
        return false;
    }

    // Check for Windows reserved names
    const baseName = path.basename(filename, path.extname(filename));
    const windowsReservedNames = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    if (windowsReservedNames.includes(baseName.toUpperCase())) {
        return false;
    }

    // Check length
    if (filename.length > 255) {
        return false;
    }

    return true;
};

/**
 * Enhanced formatName function with better validation
 * @param {string} name - The name to format
 * @returns {string} - Formatted safe name
 */
export const formatName = (name) => {
    return validateAndFixFilename(name);
};

// Example usage and tests
if (import.meta.url === `file://${process.argv[1]}`) {
    // Test cases
    const testCases = [
        'normal-file.txt',
        'file with spaces.pdf',
        'file*with|special<chars>.jpg',
        'CON.txt', // Windows reserved
        '.hidden-file',
        'file..with..dots.exe',
        'very-long-filename-that-exceeds-the-typical-filesystem-limits-and-should-be-truncated-to-ensure-compatibility-with-various-operating-systems-and-their-filename-length-restrictions.txt',
        'file[with]brackets+and\'quotes.png',
        '', // Empty filename
        null, // Null input
        'file/with/slashes.html'
    ];

    console.log('Testing filename validation and fixing:');
    console.log('='.repeat(50));

    testCases.forEach(testCase => {
        const isValid = isValidFilename(testCase);
        const fixed = validateAndFixFilename(testCase);
        console.log(`Original: "${testCase}"`);
        console.log(`Valid: ${isValid}`);
        console.log(`Fixed: "${fixed}"`);
        console.log('-'.repeat(30));
    });
}