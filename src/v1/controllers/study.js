
import axios from 'axios';
import { enhancePromptsForImageGeneration, generateImages } from '../helpers/imageGeneration.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const HEADERS = {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
};

const ALLOWED_MODELS = [
    // Claude 3 (Anthropic)
    "claude-3-haiku-20240307",     // Fastest, cheapest
    "claude-3-sonnet-20240229",    // Balanced
    "claude-3-opus-20240229",      // Most powerful

    // Claude 2 series (legacy)
    "claude-2.1",                  // Older Anthropic model
    "claude-instant-1.2",          // Lightweight, lower-latency Claude 2 version

    // GPT-4 / OpenAI (if added in future)
    "gpt-4o",                      // GPT-4 Omni (multimodal, best value)
    "gpt-4-turbo",                 // Turbo GPT-4
    "gpt-4",                       // Original GPT-4
    "gpt-3.5-turbo",               // Fast, cheaper model for lighter use

    // Google Gemini (if supported later)
    "gemini-1.5-pro",              // Gemini's current best
    "gemini-1.0-pro",

    // Mistral / Mixtral (open source contenders)
    "mistral-7b-instruct",
    "mixtral-8x7b",

    // Meta LLaMA models (useful for local/private deployments)
    "llama-3-70b",
    "llama-3-8b"
];

// Response validation schema (equivalent to Pydantic BaseModel)
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
        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({
                error: "Anthropic API key not configured"
            });
        }

        // Validate model
        if (!ALLOWED_MODELS.includes(model)) {
            return res.status(400).json({
                error: `Unsupported model '${model}'. Allowed: ${ALLOWED_MODELS.join(', ')}`
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
        const response = await axios.post(ANTHROPIC_API_URL, requestBody, {
            headers: HEADERS
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