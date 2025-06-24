
import axios from 'axios';
import { enhancePromptsForImageGeneration, generateImages } from '../helpers/imageGeneration.js';
import { config } from '../config/index.js';

const validateGenerateResponse = (data) => {
    const required = ['definition', 'explanation', 'examples', 'misconceptions', 'images'];
    const missing = required.filter(field => !(field in data));

    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!Array.isArray(data.examples)) {
        throw new Error('examples must be an array');
    }

    if (!Array.isArray(data.misconceptions)) {
        throw new Error('misconceptions must be an array');
    }

    if (!Array.isArray(data.images)) {
        throw new Error('images must be an array');
    }

    return data;
};


export const generateContentFromWord = async (req, res) => {
    try {
        const { word } = req.params;
        const model = req.query.model || "claude-3-haiku-20240307";

        // Validate API key
        if (!config.ai.anthropicApiKey) {
            return res.status(500).json({
                error: "Anthropic API key not configured"
            });
        }

        // Validate model
        if (!config.ai_models.allowed.includes(model)) {
            return res.status(400).json({
                error: `Unsupported model '${model}'. Allowed: ${config.ai_models.allowed.join(', ')}`
            });
        }

        const prompt = `
You are an expert educational content creator.
Your task is to create a **one-page structured educational summary** for the concept: **${word}**.

Audience: Middle to high school students. Use friendly, simple language but keep it scientifically accurate.
Avoid overly technical jargon. Use analogies and storytelling where helpful.

Respond only in JSON with the following structure:
{
  "definition": "...",                     // Short 1-2 line clear definition
  "explanation": "...",                   // A well-written, simple paragraph explanation
  "examples": ["Example 1", "Example 2"], // Two clear real-world examples
  "misconceptions": ["Misconception 1"],  // One or two common misunderstandings
  "images": [                             // 3 image prompts students can visualize
    "Image 1 description",
    "Image 2 description",
    "Image 3 description"
  ]
}

Ensure the JSON is valid and complete.
`;

        const requestBody = {
            model: model,
            max_tokens: 1500,
            temperature: 0.7,
            messages: [
                { role: "user", content: prompt }
            ]
        };

        // Make request to Anthropic API
        const response = await axios.post(config.ai.anthropicApiUrl, requestBody, {
            headers: config.ai.anthropicHeaders,
        });

        const content = response.data.content[0].text;
        const parsedContent = JSON.parse(content);

        // Validate the response structure
        validateGenerateResponse(parsedContent);

        // Generate images from prompts
        const images = parsedContent.images || [];
        const enhancedImages = await enhancePromptsForImageGeneration(images);
        const imageLinks = await generateImages(enhancedImages);

        // Return the response
        const result = {
            ...parsedContent,
            images: imageLinks
        };

        res.status(200).json(result);

    } catch (error) {
        console.error('Error generating content:', error);

        // Handle different types of errors
        if (error.response) {
            // Axios HTTP error
            const status = error.response.status;
            const message = error.response.data?.error?.message || error.response.statusText;
            res.status(status).json({ error: `API Error: ${message}` });
        } else if (error instanceof SyntaxError) {
            // JSON parsing error
            res.status(500).json({ error: "Failed to parse API response as JSON" });
        } else {
            // General error
            res.status(500).json({ error: `Error generating content: ${error.message}` });
        }
    }
}