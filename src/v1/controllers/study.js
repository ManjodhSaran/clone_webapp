import axios from 'axios';
import { config } from '../config/index.js';

const validateGenerateResponse = (data) => {
    const required = [
        'definition', 'explanation', 'examples', 'misconceptions',
        'imageSearchQueries', 'keyFacts', 'memoryTips', 'relatedConcepts',
        'realWorldApplications', 'funFacts', 'studyQuestions', 'difficulty'
    ];
    const missing = required.filter(field => !(field in data));

    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate arrays
    const arrayFields = ['examples', 'misconceptions', 'imageSearchQueries', 'keyFacts', 'memoryTips', 'relatedConcepts', 'realWorldApplications', 'funFacts', 'studyQuestions'];
    for (const field of arrayFields) {
        if (!Array.isArray(data[field])) {
            throw new Error(`${field} must be an array`);
        }
    }

    return data;
};

const cleanJsonResponse = (content) => {
    // Remove any markdown code blocks
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Remove any text before the first { or after the last }
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.substring(firstBrace, lastBrace + 1);
    }

    // Clean up common JSON formatting issues
    content = content
        .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
        .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
        .replace(/[\u0000-\u0019]+/g, '') // Remove control characters
        .replace(/\n\s*\n/g, '\n') // Remove extra newlines
        .trim();

    return content;
};

const parseJsonSafely = (content) => {
    try {
        return JSON.parse(content);
    } catch (error) {
        console.log('Initial JSON parse failed, attempting fixes...');

        // Try multiple fixing strategies
        let fixedContent = content;

        // Strategy 1: Fix common JSON formatting issues
        fixedContent = fixedContent
            // Remove any trailing commas before closing brackets/braces
            .replace(/,(\s*[\]}])/g, '$1')
            // Fix missing commas between array elements (quoted strings)
            .replace(/"\s*\n\s*"/g, '",\n"')
            // Fix missing commas between object properties
            .replace(/}(\s*)"([^"]+)":/g, '},\n"$2":')
            // Fix missing commas after array elements
            .replace(/](\s*)"([^"]+)":/g, '],\n"$2":')
            // Fix unescaped quotes within strings (basic attempt)
            .replace(/"([^"]*)"([^",:}\]]*)"([^",:}\]]*)"(\s*[,:}\]])/g, '"$1\\"$2\\"$3"$4');

        try {
            return JSON.parse(fixedContent);
        } catch (secondError) {
            console.log('Strategy 1 failed, trying strategy 2...');

            // Strategy 2: Try to reconstruct the JSON by finding complete sections
            try {
                // Find the position where the error occurred
                const errorPos = parseInt(error.message.match(/position (\d+)/)?.[1] || '0');
                console.log('Error position:', errorPos);

                // Try to find the last complete property before the error
                const beforeError = content.substring(0, errorPos);
                const afterError = content.substring(errorPos);

                console.log('Before error:', beforeError.slice(-50));
                console.log('After error:', afterError.slice(0, 50));

                // Try to find a good truncation point
                const lastCompleteProperty = beforeError.lastIndexOf('"]');
                if (lastCompleteProperty !== -1) {
                    const truncated = beforeError.substring(0, lastCompleteProperty + 2) + '\n}';
                    console.log('Trying truncated JSON:', truncated.slice(-100));
                    return JSON.parse(truncated);
                }
            } catch (truncationError) {
                console.log('Strategy 2 failed, trying strategy 3...');
            }

            // Strategy 3: Build a minimal valid response
            const fallbackResponse = {
                definition: "Content generation failed due to formatting issues",
                explanation: "The AI generated malformed JSON. Please try again.",
                difficulty: "intermediate",
                keyFacts: ["Unable to parse response"],
                examples: ["Please try again"],
                realWorldApplications: ["Please try again"],
                misconceptions: ["Please try again"],
                memoryTips: ["Please try again"],
                funFacts: ["Please try again"],
                relatedConcepts: ["Please try again"],
                studyQuestions: ["Please try again?"],
                imageSearchQueries: ["general educational content"]
            };

            console.log('All strategies failed, using fallback response');
            return fallbackResponse;
        }
    }
};

const testGoogleAPI = async () => {
    try {
        console.log('Testing Google API configuration...');
        console.log('API Key exists:', !!config.google.apiKey);
        console.log('Search Engine ID exists:', !!config.google.searchEngineId);

        const testResponse = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: config.google.apiKey,
                cx: config.google.searchEngineId,
                q: 'test',
                searchType: 'image',
                num: 1,
                safe: 'active'
            }
        });

        console.log('Google API test successful:', testResponse.status);
        return true;
    } catch (error) {
        console.error('Google API test failed:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        return false;
    }
};

const searchGoogleImages = async (query, count = 3) => {
    try {
        console.log(`Searching for images with query: "${query}"`);

        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: config.google.apiKey,
                cx: config.google.searchEngineId,
                q: query,
                searchType: 'image',
                num: count,
                safe: 'active',
                imgSize: 'large',
                imgType: 'photo',
                fileType: 'jpg,png',
                imgColorType: 'color',
                fields: 'items(title,link,image,displayLink)'
            },
            timeout: 10000
        });

        console.log(`Google API response status: ${response.status}`);
        console.log(`Items found: ${response.data.items ? response.data.items.length : 0}`);

        if (!response.data.items || response.data.items.length === 0) {
            console.warn(`No images found for query: "${query}"`);
            return [];
        }

        const filteredImages = response.data.items
            .filter(item => {
                if (!item.link || !item.image) {
                    return false;
                }

                const width = item.image?.width || 0;
                const height = item.image?.height || 0;

                return width >= 200 && height >= 150;
            })
            .map(item => ({
                url: item.link,
                title: item.title || 'Educational Image',
                thumbnail: item.image?.thumbnailLink || item.link,
                context: item.image?.contextLink || `https://${item.displayLink}`,
                width: item.image?.width || 0,
                height: item.image?.height || 0,
                size: item.image?.byteSize || 0,
                source: item.displayLink || 'Unknown'
            }))
            .sort((a, b) => {
                const aSize = (a.width * a.height) || 0;
                const bSize = (b.width * b.height) || 0;
                return bSize - aSize;
            });

        console.log(`Filtered images for "${query}": ${filteredImages.length}`);
        return filteredImages;

    } catch (error) {
        console.error(`Error searching images for "${query}":`, error.message);

        if (error.response) {
            console.error('Google API Error Status:', error.response.status);
            console.error('Google API Error Data:', error.response.data);
        }

        return [];
    }
};

export const generateContentFromWord = async (req, res) => {
    try {
        const { word } = req.params;
        const model = req.query.model || "claude-3-haiku-20240307";

        // Validate API keys
        if (!config.ai.anthropicApiKey) {
            return res.status(500).json({
                error: "Anthropic API key not configured"
            });
        }

        if (!config.google.apiKey || !config.google.searchEngineId) {
            return res.status(500).json({
                error: "Google API key or Search Engine ID not configured"
            });
        }


        // Validate model
        if (!config.ai_models.allowed.includes(model)) {
            return res.status(400).json({
                error: `Unsupported model '${model}'. Allowed: ${config.ai_models.allowed.join(', ')}`
            });
        }

        // Improved prompt with stricter JSON formatting requirements
        const prompt = `Create educational content for: ${word}

CRITICAL: Return ONLY valid JSON. No explanatory text, markdown, or code blocks.

JSON format (keep all strings SHORT to avoid parsing issues):
{
  "definition": "Brief definition (max 100 chars)",
  "explanation": "Short explanation (max 300 chars)",
  "difficulty": "beginner",
  "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "examples": ["Example 1", "Example 2", "Example 3"],
  "realWorldApplications": ["App 1", "App 2", "App 3"],
  "misconceptions": ["Misconception 1", "Misconception 2"],
  "memoryTips": ["Tip 1", "Tip 2"],
  "funFacts": ["Fun fact 1", "Fun fact 2", "Fun fact 3"],
  "relatedConcepts": ["Concept 1", "Concept 2", "Concept 3"],
  "studyQuestions": ["Question 1?", "Question 2?", "Question 3?"],
  "imageSearchQueries": ["${word} diagram", "${word} example", "${word} photo", "${word} illustration"]
}

Return ONLY the JSON object.`;

        const requestBody = {
            model: model,
            max_tokens: 1500, // Reduced to prevent overly long responses
            temperature: 0.3, // Further reduced for more consistent output
            messages: [
                {
                    role: "user",
                    content: prompt
                },
                {
                    role: "assistant",
                    content: "{"  // Start the response with opening brace
                }
            ]
        };

        // Make request to Anthropic API
        const response = await axios.post(config.ai.anthropicApiUrl, requestBody, {
            headers: config.ai.anthropicHeaders,
            timeout: 30000 // 30 second timeout
        });

        let content = response.data.content[0].text;

        // Since we started with "{", we need to prepend it to the response
        if (!content.startsWith('{')) {
            content = '{' + content;
        }

        // Clean the response
        content = cleanJsonResponse(content);

        // Log the cleaned content for debugging
        console.log('Cleaned AI response length:', content.length);
        console.log('Cleaned AI response preview:', content.substring(0, 300) + '...');
        console.log('Cleaned AI response ending:', content.substring(content.length - 100));

        // Parse JSON safely
        let parsedContent;
        try {
            parsedContent = parseJsonSafely(content);
        } catch (jsonError) {
            console.error('JSON parsing failed. Raw content:', content);
            return res.status(500).json({
                error: "Failed to parse AI response as valid JSON",
                details: jsonError.message,
                rawResponse: content.substring(0, 500) + '...'
            });
        }

        // Validate the response structure
        try {
            validateGenerateResponse(parsedContent);
        } catch (validationError) {
            console.error('Validation error:', validationError.message);
            return res.status(500).json({
                error: "AI response validation failed",
                details: validationError.message,
                parsedContent: parsedContent
            });
        }

        // Search for images
        const imageSearchQueries = parsedContent.imageSearchQueries || [];
        console.log('Image search queries:', imageSearchQueries);

        if (imageSearchQueries.length === 0) {
            console.warn('No image search queries provided by AI');
            return res.status(200).json({
                ...parsedContent,
                images: []
            });
        }

        // const imageSearchPromises = imageSearchQueries.map(query =>
        //     searchGoogleImages(query, 3).catch(error => {
        //         console.error(`Failed to search for "${query}":`, error.message);
        //         return [];
        //     })
        // );

        // const imageResults = await Promise.all(imageSearchPromises);

        // Process images
        // const allImages = imageResults.flat().filter(img => img.url);
        const uniqueImages = [];
        // const seenUrls = new Set();

        // for (const img of allImages) {
        //     if (!seenUrls.has(img.url) && uniqueImages.length < 8) {
        //         seenUrls.add(img.url);
        //         uniqueImages.push(img);
        //     }
        // }

        // Fallback search if no images found
        if (uniqueImages.length === 0) {
            console.log('No images found, trying fallback search...');
            const fallbackQuery = `${word} educational diagram`;
            const fallbackImages = await searchGoogleImages(fallbackQuery, 5);
            uniqueImages.push(...fallbackImages.slice(0, 3));
        }

        // Return the response
        const result = {
            ...parsedContent,
            images: uniqueImages,
            ...(process.env.NODE_ENV === 'development' && {
                debug: {
                    searchQueries: imageSearchQueries,
                    totalImagesFound: allImages.length,
                    uniqueImagesSelected: uniqueImages.length
                }
            })
        };

        res.status(200).json(result);

    } catch (error) {
        console.error('Error generating content:', error);

        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.error?.message || error.response.statusText;
            res.status(status).json({ error: `API Error: ${message}` });
        } else {
            res.status(500).json({ error: `Error generating content: ${error.message}` });
        }
    }
};