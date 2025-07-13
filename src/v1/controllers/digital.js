import fs from 'fs'
import path from 'path'
import { pdfToPng } from 'pdf-to-png-converter'
import { extractImagesFromImage, extractImagesFromImageSharp } from '../helpers/digital/digitalPdf.js';
import { imageToHtml, processAllImages, saveHtmlToFile } from '../helpers/digital/imageToHtml.js';

const convertPdfToImages = async (pdfPath, outputDir) => {
    try {
        // Create images directory inside the session directory
        const imagesDir = path.join(outputDir, 'images');
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }

        const pngPages = await pdfToPng(pdfPath, {
            outputFolder: imagesDir,
            outputFileMaskFunc: (pageNumber) => `${pageNumber}.png`,
            viewportScale: 2.0,
            outputFilePrefix: '',
            strictPagination: false,
            verbosityLevel: 0
        });

        const imageFiles = pngPages.map((page, index) => ({
            pageNumber: index + 1,
            filename: `${index + 1}.png`,
            path: path.join(imagesDir, `${index + 1}.png`)
        }));

        console.log(`Successfully converted ${imageFiles.length} pages to PNG images`);
        return imageFiles;

    } catch (error) {
        console.error('Error converting PDF to images:', error);
        throw new Error(`PDF conversion failed: ${error.message}`);
    }
};


export const digitizePdf = async (req, res) => {
    let pdfOutputDir = null;

    try {
        console.log('File info:', req.file);

        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const sessionId = req.uploadUuid;
        const tempDir = path.join(process.cwd(), 'temp');
        pdfOutputDir = path.join(tempDir, sessionId);

        const imageFiles = await convertPdfToImages(req.file.path, pdfOutputDir);

        imageFiles.forEach(async (image) => {
            // extractImagesFromImage(image)
            // Smart detection (recommended)
            const result = await extractImagesFromImage(image);
            console.log('result', JSON.stringify(result, null, 2));
            // Simple grid (most reliable)
            // const result2 = await extractImagesFromImageSharp(image);
            // console.log('result2', JSON.stringify(result2, null, 2));
        })



        const htmlContent = await processAllImages(imageFiles);

        const outputDir = `${pdfOutputDir}/html`;
        for (const htmlResult of htmlContent) {
            await saveHtmlToFile(htmlResult, outputDir);
        }


        res.status(200).json({
            success: true,
            sessionId: sessionId,
            totalPages: imageFiles.length,
            imageFiles: imageFiles,
            outputDirectory: pdfOutputDir,
            imagesDirectory: path.join(pdfOutputDir, 'images')
        });

    } catch (error) {
        console.error('Error in digitizePdf:', error);

        if (pdfOutputDir && fs.existsSync(pdfOutputDir)) {
            try {
                fs.rmSync(pdfOutputDir, { recursive: true, force: true });
            } catch (cleanupError) {
                console.error('Error cleaning up output directory:', cleanupError);
            }
        }

        res.status(500).json({
            error: 'Failed to convert PDF to images',
            details: error.message
        });
    }
};