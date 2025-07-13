import fs from 'fs'
import path from 'path'
import { pdfToPng } from 'pdf-to-png-converter'

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

        // Convert PDF to images - this will create temp/sessionId/images/1.png, 2.png, etc.
        const imageFiles = await convertPdfToImages(req.file.path, pdfOutputDir);

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

        // Clean up the entire session directory on error
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
    } finally {
        // Optional: Clean up the original PDF file if needed
        // if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        //     try {
        //         fs.unlinkSync(req.file.path);
        //     } catch (cleanupError) {
        //         console.error('Error cleaning up uploaded file:', cleanupError);
        //     }
        // }
    }
};