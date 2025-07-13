import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to convert image to base64
const imageToBase64 = (imagePath) => {
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        return imageBuffer.toString('base64');
    } catch (error) {
        throw new Error(`Failed to read image file: ${error.message}`);
    }
};

// Function to get image mime type
const getImageMimeType = (imagePath) => {
    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/png';
};

export const imageToHtml = async (image) => {
    try {
        // Validate input
        if (!image || !image.path) {
            throw new Error('Invalid image object: missing path');
        }

        // Check if image file exists
        if (!fs.existsSync(image.path)) {
            throw new Error(`Image file not found: ${image.path}`);
        }

        console.log('Converting image to HTML...');
        // Get the generative model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Convert image to base64
        const base64Image = imageToBase64(image.path);
        const mimeType = getImageMimeType(image.path);

        // Create the prompt for HTML conversion
        const prompt = `
        Convert this image to clean, semantic HTML code. 
        Please analyze the image and create HTML that represents:
        - Text content with proper headings, paragraphs, and formatting
        - Tables if present (with proper table structure)
        - Lists if present (ordered or unordered)
        - Any forms or input elements if visible
        - Maintain the visual hierarchy and structure
        - Use semantic HTML5 tags where appropriate
        - Do not include CSS styling, just clean HTML structure
        - If the image contains a form, recreate the form structure
        - If the image contains a table, recreate the table with proper headers
        
        Return only the HTML code without any explanations or markdown formatting.
        `;

        // Prepare the image data for Gemini
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        // Generate HTML from the image
        const result = await model.generateContent([prompt, imagePart]);
        const htmlContent = result.response.text();

        // Clean up the response (remove any markdown code blocks if present)
        const cleanedHtml = htmlContent
            .replace(/```html\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        return {
            success: true,
            pageNumber: image.pageNumber,
            filename: image.filename,
            originalPath: image.path,
            htmlContent: cleanedHtml,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error converting image to HTML:', error);

        return {
            success: false,
            pageNumber: image.pageNumber || null,
            filename: image.filename || null,
            originalPath: image.path || null,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

// Helper function to process multiple images
export const processAllImages = async (imageFiles) => {
    const results = [];

    for (const image of imageFiles) {
        console.log(`Processing page ${image.pageNumber}...`);

        try {
            const result = await imageToHtml(image);
            results.push(result);

            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`Error processing page ${image.pageNumber}:`, error);
            results.push({
                success: false,
                pageNumber: image.pageNumber,
                filename: image.filename,
                originalPath: image.path,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    return results;
};

// Helper function to save HTML to file
export const saveHtmlToFile = async (htmlResult, outputDir) => {
    try {
        if (!htmlResult.success) {
            throw new Error(`Cannot save HTML: ${htmlResult.error}`);
        }

        const htmlDir = path.join(outputDir, 'html');
        if (!fs.existsSync(htmlDir)) {
            fs.mkdirSync(htmlDir, { recursive: true });
        }

        const htmlFilePath = path.join(htmlDir, `page_${htmlResult.pageNumber}.html`);
        fs.writeFileSync(htmlFilePath, htmlResult.htmlContent, 'utf8');

        return {
            success: true,
            htmlFilePath,
            pageNumber: htmlResult.pageNumber
        };

    } catch (error) {
        console.error('Error saving HTML file:', error);
        return {
            success: false,
            error: error.message,
            pageNumber: htmlResult.pageNumber
        };
    }
};