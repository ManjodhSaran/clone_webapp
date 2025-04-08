export const logResults = (result) => {
    console.log(`\nArchiving complete!`);
    console.log(`Total pages: ${result.stats.totalPages}`);
    console.log(`Total unique assets: ${result.stats.uniqueAssets}`);
    console.log(`Duplicate assets (saved): ${result.stats.duplicateAssets}`);
    console.log(`Failed pages: ${result.stats.failedPages}`);
    console.log(`Output saved to: ${result.outputPath}`);
    // console.log(`Zip archive created: ${result.zipFilePath}`);
};