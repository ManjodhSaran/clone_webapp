import vision from '@google-cloud/vision';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Initialize Google Vision client
const client = new vision.ImageAnnotatorClient({
    // You can specify credentials here or use environment variables
    // keyFilename: 'path/to/service-account-key.json',
    // or use GOOGLE_APPLICATION_CREDENTIALS environment variable
});

export const extractImagesFromImage2 = async (image) => {
    try {
        console.log(`Processing image with Google Vision: ${image.filename}`);

        // Create nested images directory
        const parentDir = path.dirname(image.path);
        const nestedDir = path.join(parentDir, 'nested');
        if (!fs.existsSync(nestedDir)) {
            fs.mkdirSync(nestedDir, { recursive: true });
        }

        // Get image dimensions for validation
        const metadata = await sharp(image.path).metadata();
        const { width, height } = metadata;
        console.log(`Image dimensions: ${width}x${height}`);

        // Use Google Vision API to detect objects and logos
        const [objectResult] = await client.objectLocalization(image.path);
        const [logoResult] = await client.logoDetection(image.path);
        const [labelResult] = await client.labelDetection(image.path);

        // Combine all detected regions
        const allRegions = [];

        // Process object detections
        if (objectResult.localizedObjectAnnotations) {
            objectResult.localizedObjectAnnotations.forEach((object, index) => {
                if (object.boundingPoly && object.boundingPoly.normalizedVertices) {
                    const vertices = object.boundingPoly.normalizedVertices;
                    const region = normalizedToPixels(vertices, width, height);

                    // Filter out regions that are too small or too large
                    if (isValidImageRegion(region, width, height)) {
                        allRegions.push({
                            ...region,
                            type: 'object',
                            description: object.name,
                            confidence: object.score,
                            originalIndex: index
                        });
                    }
                }
            });
        }

        // Process logo detections
        if (logoResult.logoAnnotations) {
            logoResult.logoAnnotations.forEach((logo, index) => {
                if (logo.boundingPoly && logo.boundingPoly.vertices) {
                    const region = verticesToPixels(logo.boundingPoly.vertices);

                    if (isValidImageRegion(region, width, height)) {
                        allRegions.push({
                            ...region,
                            type: 'logo',
                            description: logo.description,
                            confidence: logo.score,
                            originalIndex: index
                        });
                    }
                }
            });
        }

        // Use text detection to find image captions and exclude text-heavy regions
        const [textResult] = await client.textDetection(image.path);
        const textRegions = [];

        if (textResult.textAnnotations && textResult.textAnnotations.length > 1) {
            // Skip the first annotation (full text), process individual text blocks
            textResult.textAnnotations.slice(1).forEach(text => {
                if (text.boundingPoly && text.boundingPoly.vertices) {
                    const region = verticesToPixels(text.boundingPoly.vertices);
                    textRegions.push(region);
                }
            });
        }

        // Filter out regions that overlap heavily with text
        const imageRegions = allRegions.filter(region =>
            !hasSignificantTextOverlap(region, textRegions)
        );

        // Remove overlapping regions and keep the most confident ones
        const finalRegions = removeOverlappingRegions(imageRegions);

        console.log(`Found ${finalRegions.length} potential image regions after filtering`);

        const extractedImages = [];

        // Process each detected region
        for (let i = 0; i < finalRegions.length; i++) {
            try {
                const region = finalRegions[i];

                // Generate filename with the specified naming convention
                const nestedFilename = `${image.pageNumber}_nested_${i + 1}.png`;
                const nestedPath = path.join(nestedDir, nestedFilename);

                // Extract region using Sharp
                await sharp(image.path)
                    .extract({
                        left: Math.max(0, Math.round(region.x)),
                        top: Math.max(0, Math.round(region.y)),
                        width: Math.min(width - Math.round(region.x), Math.round(region.width)),
                        height: Math.min(height - Math.round(region.y), Math.round(region.height))
                    })
                    .png({ quality: 90, compressionLevel: 6 })
                    .toFile(nestedPath);

                const extractedImage = {
                    parentPageNumber: image.pageNumber,
                    nestedIndex: i + 1,
                    filename: nestedFilename,
                    path: nestedPath,
                    dimensions: {
                        width: Math.round(region.width),
                        height: Math.round(region.height),
                        x: Math.round(region.x),
                        y: Math.round(region.y)
                    },
                    area: Math.round(region.width * region.height),
                    detectionType: region.type,
                    description: region.description,
                    confidence: region.confidence
                };

                extractedImages.push(extractedImage);
                console.log(`Extracted ${region.type}: ${region.description} (confidence: ${region.confidence?.toFixed(2)})`);

            } catch (error) {
                console.error(`Error extracting nested image ${i + 1}:`, error);
            }
        }

        console.log(`Successfully extracted ${extractedImages.length} nested images from page ${image.pageNumber}`);

        return {
            parentImage: image,
            extractedCount: extractedImages.length,
            extractedImages: extractedImages,
            nestedDirectory: nestedDir,
            visionResults: {
                objectsDetected: objectResult.localizedObjectAnnotations?.length || 0,
                logosDetected: logoResult.logoAnnotations?.length || 0,
                labelsDetected: labelResult.labelAnnotations?.length || 0
            }
        };

    } catch (error) {
        console.error(`Error in extractImagesFromImage for ${image.filename}:`, error);
        throw new Error(`Failed to extract images from ${image.filename}: ${error.message}`);
    }
};

// Helper function to convert normalized coordinates to pixels
function normalizedToPixels(vertices, width, height) {
    const xCoords = vertices.map(v => v.x * width);
    const yCoords = vertices.map(v => v.y * height);

    return {
        x: Math.min(...xCoords),
        y: Math.min(...yCoords),
        width: Math.max(...xCoords) - Math.min(...xCoords),
        height: Math.max(...yCoords) - Math.min(...yCoords)
    };
}

// Helper function to convert vertex coordinates to pixels
function verticesToPixels(vertices) {
    const xCoords = vertices.map(v => v.x);
    const yCoords = vertices.map(v => v.y);

    return {
        x: Math.min(...xCoords),
        y: Math.min(...yCoords),
        width: Math.max(...xCoords) - Math.min(...xCoords),
        height: Math.max(...yCoords) - Math.min(...yCoords)
    };
}

// Helper function to validate if a region is likely an image
function isValidImageRegion(region, imageWidth, imageHeight) {
    const minSize = 50; // Minimum 50x50 pixels
    const maxSizeRatio = 0.8; // Maximum 80% of total image size
    const minAspectRatio = 0.3; // Minimum aspect ratio
    const maxAspectRatio = 3.0; // Maximum aspect ratio

    // Check size constraints
    if (region.width < minSize || region.height < minSize) {
        return false;
    }

    // Check if region is too large (likely the whole page)
    const regionArea = region.width * region.height;
    const totalArea = imageWidth * imageHeight;
    if (regionArea > totalArea * maxSizeRatio) {
        return false;
    }

    // Check aspect ratio
    const aspectRatio = region.width / region.height;
    if (aspectRatio < minAspectRatio || aspectRatio > maxAspectRatio) {
        return false;
    }

    return true;
}

// Helper function to check if region overlaps significantly with text
function hasSignificantTextOverlap(region, textRegions) {
    const overlapThreshold = 0.5; // 50% overlap threshold

    for (const textRegion of textRegions) {
        const overlap = calculateOverlap(region, textRegion);
        const overlapRatio = overlap / (region.width * region.height);

        if (overlapRatio > overlapThreshold) {
            return true;
        }
    }

    return false;
}

// Helper function to calculate overlap area between two regions
function calculateOverlap(region1, region2) {
    const x1 = Math.max(region1.x, region2.x);
    const y1 = Math.max(region1.y, region2.y);
    const x2 = Math.min(region1.x + region1.width, region2.x + region2.width);
    const y2 = Math.min(region1.y + region1.height, region2.y + region2.height);

    if (x2 <= x1 || y2 <= y1) {
        return 0;
    }

    return (x2 - x1) * (y2 - y1);
}

// Helper function to remove overlapping regions, keeping the most confident ones
function removeOverlappingRegions(regions) {
    const filtered = [];
    const overlapThreshold = 0.3; // 30% overlap threshold

    // Sort by confidence (highest first)
    const sorted = regions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    for (const region of sorted) {
        let hasOverlap = false;

        for (const existing of filtered) {
            const overlap = calculateOverlap(region, existing);
            const regionArea = region.width * region.height;
            const overlapRatio = overlap / regionArea;

            if (overlapRatio > overlapThreshold) {
                hasOverlap = true;
                break;
            }
        }

        if (!hasOverlap) {
            filtered.push(region);
        }
    }

    return filtered;
}