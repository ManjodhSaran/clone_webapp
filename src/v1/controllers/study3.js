import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createErrorPage } from '../../helper/createErrorPage.js';
import { enhancePromptsForImageGeneration } from '../helpers/imageGeneration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache the template to avoid reading it every time
let htmlTemplate = null;

const loadTemplate = async () => {
    if (!htmlTemplate) {
        const templatePath = path.join(__dirname, '../template/educational-template-progressive.html');
        htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    }
    return htmlTemplate;
};

const generateListItems = (items) => {
    return items.map(item => `<li>${item}</li>`).join('');
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const HEADERS = {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
};

const ALLOWED_MODELS = [
    "claude-3-haiku-20240307",
    "claude-3-sonnet-20240229",
    "claude-3-opus-20240229",
    "claude-2.1",
    "claude-instant-1.2"
];

/**
 * @swagger
 * /v1/api/study/generate/html/{word}:
 *   get:
 *     summary: Generate educational HTML content for a word/concept
 *     description: Creates a complete HTML page with educational content that loads progressively. Content is displayed first, then images are loaded asynchronously for a smooth user experience.
 *     tags: [Educational Content]
 *     parameters:
 *       - in: path
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *         description: The word or concept to generate educational content for
 *         example: photosynthesis
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *           enum: [claude-3-haiku-20240307, claude-3-sonnet-20240229, claude-3-opus-20240229, claude-2.1, claude-instant-1.2]
 *           default: claude-3-haiku-20240307
 *         description: AI model to use for content generation
 *     responses:
 *       200:
 *         description: Educational HTML content generated successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Complete HTML page with educational content
 *       400:
 *         description: Invalid model or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Server error or API key not configured
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Error page HTML
 */
export const generateProgressiveHtmlContent = async (req, res) => {
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

        // Optimized prompt for educational content
        const prompt = `
You are an expert educational content creator.
Create educational content for the concept: **${word}**.

Audience: Middle to high school students. Use friendly, simple language but keep it scientifically accurate.
Avoid overly technical jargon. Use analogies and storytelling where helpful.

Respond ONLY in JSON format with this exact structure:
{
  "definition": "A clear, concise 1-2 sentence definition",
  "explanation": "A detailed paragraph explanation (3-5 sentences) that elaborates on the concept with examples and context",
  "examples": ["Real-world example 1", "Real-world example 2", "Real-world example 3"],
  "misconceptions": ["Common misconception 1", "Common misconception 2"],
  "imagePrompts": ["Educational illustration prompt 1", "Diagram/visual prompt 2", "Real-world example image prompt 3"]
}

Focus on educational value and clarity. Make it engaging for students.
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
        const required = ['definition', 'explanation', 'examples', 'misconceptions'];
        const missing = required.filter(field => !(field in parsedContent));

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Load template
        const template = await loadTemplate();

        // Generate unique session ID for this request
        const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Create image prompts for progressive loading
        const imagePrompts = parsedContent.imagePrompts || [
            `Educational illustration of ${word}`,
            `Scientific diagram showing ${word}`,
            `Real-world application of ${word}`
        ];

        // Generate initial HTML with placeholders
        const htmlContent = template
            .replace(/\{\{TITLE\}\}/g, word.charAt(0).toUpperCase() + word.slice(1))
            .replace(/\{\{DEFINITION\}\}/g, parsedContent.definition)
            .replace(/\{\{EXPLANATION\}\}/g, parsedContent.explanation)
            .replace(/\{\{EXAMPLES\}\}/g, generateListItems(parsedContent.examples))
            .replace(/\{\{MISCONCEPTIONS\}\}/g, generateListItems(parsedContent.misconceptions))
            .replace(/\{\{SESSION_ID\}\}/g, sessionId)
            .replace(/\{\{IMAGE_COUNT\}\}/g, imagePrompts.length)
            .replace(/\{\{WORD\}\}/g, word);

        // Start image generation in background (don't await)
        generateImagesInBackground(imagePrompts, sessionId, word);

        // Return HTML response immediately
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(200).send(htmlContent);

    } catch (error) {
        console.error('Error generating HTML content:', error);

        // Load error template
        const errorHtml = await createErrorPage(error, req.params.word);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(error.response?.status || 500).send(errorHtml);
    }
};

// Background image generation function
const generateImagesInBackground = async (imagePrompts, sessionId, word) => {
    try {
        console.log(`Starting background image generation for session: ${sessionId}`);
        const imageUrls = await enhancePromptsForImageGeneration(imagePrompts);
        
        // Store the generated images in memory cache with session ID
        if (!global.imageCache) {
            global.imageCache = new Map();
        }
        
        global.imageCache.set(sessionId, {
            images: imageUrls,
            timestamp: Date.now(),
            word: word
        });

        // Clean up old cache entries (older than 1 hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [key, value] of global.imageCache.entries()) {
            if (value.timestamp < oneHourAgo) {
                global.imageCache.delete(key);
            }
        }

        console.log(`Background image generation completed for session: ${sessionId}`);
    } catch (error) {
        console.error(`Background image generation failed for session ${sessionId}:`, error);
        
        // Store error state
        if (!global.imageCache) {
            global.imageCache = new Map();
        }
        
        global.imageCache.set(sessionId, {
            images: [],
            error: error.message,
            timestamp: Date.now(),
            word: word
        });
    }
};

/**
 * @swagger
 * /v1/api/study/images/{sessionId}:
 *   get:
 *     summary: Get generated images for a session
 *     description: Retrieves the generated images for a specific session ID. Used for progressive loading of images after initial content is displayed.
 *     tags: [Educational Content]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID from the initial content generation request
 *         example: "1234567890abcdef"
 *     responses:
 *       200:
 *         description: Images retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 images:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of image URLs or descriptions
 *                 ready:
 *                   type: boolean
 *                   description: Whether images are ready
 *                 word:
 *                   type: string
 *                   description: The word/concept the images are for
 *       404:
 *         description: Session not found or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       202:
 *         description: Images still being generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Images are still being generated"
 */
export const getSessionImages = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!global.imageCache || !global.imageCache.has(sessionId)) {
            return res.status(404).json({
                message: 'Session not found or expired',
                ready: false
            });
        }

        const sessionData = global.imageCache.get(sessionId);

        if (sessionData.error) {
            return res.status(200).json({
                images: [],
                ready: true,
                error: sessionData.error,
                word: sessionData.word
            });
        }

        if (sessionData.images && sessionData.images.length > 0) {
            return res.status(200).json({
                images: sessionData.images,
                ready: true,
                word: sessionData.word
            });
        }

        // Images still being generated
        return res.status(202).json({
            ready: false,
            message: 'Images are still being generated',
            word: sessionData.word
        });

    } catch (error) {
        console.error('Error retrieving session images:', error);
        res.status(500).json({
            message: 'Error retrieving images',
            error: error.message
        });
    }
};