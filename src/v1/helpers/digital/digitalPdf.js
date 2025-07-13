import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Jimp } from 'jimp';


export const extractImagesFromImage = async (image) => {
    try {
        console.log(`Processing image: ${image.filename}`);

        // Create nested images directory
        const parentDir = path.dirname(image.path);
        const nestedDir = path.join(parentDir, 'nested');

        if (!fs.existsSync(nestedDir)) {
            fs.mkdirSync(nestedDir, { recursive: true });
        }

        // Read the image using Jimp for edge detection
        const jimpImage = await Jimp.read(image.path);
        const { width, height } = jimpImage.bitmap;

        console.log(`Image dimensions: ${width}x${height}`);

        // Convert to grayscale and apply edge detection
        const grayImage = jimpImage.clone().greyscale();

        // Simple edge detection using Sobel-like filter
        const edgeDetected = await detectEdges(grayImage);

        // Find rectangular regions that might contain images
        const regions = await findImageRegions(edgeDetected, width, height);

        console.log(`Found ${regions.length} potential image regions`);

        const extractedImages = [];

        // Process each detected region
        for (let i = 0; i < regions.length; i++) {
            try {
                const region = regions[i];

                // Generate filename with the specified naming convention
                const nestedFilename = `${image.pageNumber}_nested_${i + 1}.png`;
                const nestedPath = path.join(nestedDir, nestedFilename);

                // Extract region using Sharp (more efficient for large images)
                await sharp(image.path)
                    .extract({
                        left: region.x,
                        top: region.y,
                        width: region.width,
                        height: region.height
                    })
                    .png({ quality: 90, compressionLevel: 6 })
                    .toFile(nestedPath);

                const extractedImage = {
                    parentPageNumber: image.pageNumber,
                    nestedIndex: i + 1,
                    filename: nestedFilename,
                    path: nestedPath,
                    dimensions: {
                        width: region.width,
                        height: region.height,
                        x: region.x,
                        y: region.y
                    },
                    area: region.width * region.height
                };

                extractedImages.push(extractedImage);

            } catch (error) {
                console.error(`Error extracting nested image ${i + 1}:`, error);
            }
        }

        console.log(`Successfully extracted ${extractedImages.length} nested images from page ${image.pageNumber}`);

        return {
            parentImage: image,
            extractedCount: extractedImages.length,
            extractedImages: extractedImages,
            nestedDirectory: nestedDir
        };

    } catch (error) {
        console.error(`Error in extractImagesFromImage for ${image.filename}:`, error);
        throw new Error(`Failed to extract images from ${image.filename}: ${error.message}`);
    }
};

// Helper function for edge detection using Jimp
const detectEdges = async (grayImage) => {
    const width = grayImage.bitmap.width;
    const height = grayImage.bitmap.height;

    // Apply a simple edge detection filter
    grayImage.convolute([
        [-1, -1, -1],
        [-1, 8, -1],
        [-1, -1, -1]
    ]);

    // Threshold to get binary image
    grayImage.scan(0, 0, width, height, function (x, y, idx) {
        const gray = this.bitmap.data[idx];
        const value = gray > 30 ? 255 : 0; // Threshold value
        this.bitmap.data[idx] = value;     // R
        this.bitmap.data[idx + 1] = value; // G
        this.bitmap.data[idx + 2] = value; // B
    });

    return grayImage;
};

// Helper function to find rectangular regions
const findImageRegions = async (edgeImage, width, height) => {
    const regions = [];
    const minArea = 5000; // Minimum area for a valid image region
    const maxArea = (width * height) * 0.8; // Maximum 80% of total image area

    // Simple region growing algorithm
    const visited = new Array(height).fill(null).map(() => new Array(width).fill(false));

    for (let y = 0; y < height; y += 10) { // Step by 10 for performance
        for (let x = 0; x < width; x += 10) {
            if (!visited[y][x]) {
                const region = findConnectedRegion(edgeImage, x, y, visited, width, height);

                if (region && region.area >= minArea && region.area <= maxArea) {
                    // Add some padding
                    const padding = 20;
                    const paddedRegion = {
                        x: Math.max(0, region.minX - padding),
                        y: Math.max(0, region.minY - padding),
                        width: Math.min(width - Math.max(0, region.minX - padding), region.maxX - region.minX + 1 + (padding * 2)),
                        height: Math.min(height - Math.max(0, region.minY - padding), region.maxY - region.minY + 1 + (padding * 2))
                    };

                    regions.push(paddedRegion);
                }
            }
        }
    }

    // If no regions found, fall back to grid-based extraction
    if (regions.length === 0) {
        console.log('No regions detected, using grid-based extraction');
        return [
            { x: 0, y: 0, width: Math.floor(width / 2), height: Math.floor(height / 2) },
            { x: Math.floor(width / 2), y: 0, width: Math.floor(width / 2), height: Math.floor(height / 2) },
            { x: 0, y: Math.floor(height / 2), width: Math.floor(width / 2), height: Math.floor(height / 2) },
            { x: Math.floor(width / 2), y: Math.floor(height / 2), width: Math.floor(width / 2), height: Math.floor(height / 2) }
        ];
    }

    return regions;
};

// Helper function to find connected regions
const findConnectedRegion = (edgeImage, startX, startY, visited, width, height) => {
    const stack = [[startX, startY]];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let area = 0;

    while (stack.length > 0) {
        const [x, y] = stack.pop();

        if (x < 0 || x >= width || y < 0 || y >= height || visited[y][x]) {
            continue;
        }

        // Check if this pixel is an edge
        const idx = (y * width + x) * 4;
        const isEdge = edgeImage.bitmap.data[idx] > 128;

        if (!isEdge) {
            continue;
        }

        visited[y][x] = true;
        area++;

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        // Add neighboring pixels
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx !== 0 || dy !== 0) {
                    stack.push([x + dx, y + dy]);
                }
            }
        }
    }

    return area > 0 ? { minX, maxX, minY, maxY, area } : null;
};

// Alternative implementation using purely Sharp (if OpenCV is not available)
export const extractImagesFromImageSharp = async (image) => {
    try {
        console.log(`Processing image with Sharp: ${image.filename}`);

        // Create nested images directory
        const parentDir = path.dirname(image.path);
        const nestedDir = path.join(parentDir, 'nested');

        if (!fs.existsSync(nestedDir)) {
            fs.mkdirSync(nestedDir, { recursive: true });
        }

        // Get image metadata
        const metadata = await sharp(image.path).metadata();
        const { width, height } = metadata;

        // Define grid-based extraction (you can modify this logic)
        const extractedImages = [];

        // Example: Extract 4 quadrants as nested images
        const regions = [
            { x: 0, y: 0, width: Math.floor(width / 2), height: Math.floor(height / 2) },
            { x: Math.floor(width / 2), y: 0, width: Math.floor(width / 2), height: Math.floor(height / 2) },
            { x: 0, y: Math.floor(height / 2), width: Math.floor(width / 2), height: Math.floor(height / 2) },
            { x: Math.floor(width / 2), y: Math.floor(height / 2), width: Math.floor(width / 2), height: Math.floor(height / 2) }
        ];

        for (let i = 0; i < regions.length; i++) {
            try {
                const region = regions[i];
                const nestedFilename = `${image.pageNumber}_nested_${i + 1}.png`;
                const nestedPath = path.join(nestedDir, nestedFilename);

                // Extract region using Sharp
                await sharp(image.path)
                    .extract({
                        left: region.x,
                        top: region.y,
                        width: region.width,
                        height: region.height
                    })
                    .png({ quality: 90 })
                    .toFile(nestedPath);

                const extractedImage = {
                    parentPageNumber: image.pageNumber,
                    nestedIndex: i + 1,
                    filename: nestedFilename,
                    path: nestedPath,
                    dimensions: region,
                    area: region.width * region.height
                };

                extractedImages.push(extractedImage);

            } catch (error) {
                console.error(`Error extracting nested image ${i + 1}:`, error);
            }
        }

        console.log(`Successfully extracted ${extractedImages.length} nested images from page ${image.pageNumber}`);

        return {
            parentImage: image,
            extractedCount: extractedImages.length,
            extractedImages: extractedImages,
            nestedDirectory: nestedDir
        };

    } catch (error) {
        console.error(`Error in extractImagesFromImageSharp for ${image.filename}:`, error);
        throw new Error(`Failed to extract images from ${image.filename}: ${error.message}`);
    }
};