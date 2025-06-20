import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache the template to avoid reading it every time
let htmlTemplate = null;

const loadTemplate = async () => {
    if (!htmlTemplate) {
        const templatePath = path.join(__dirname, '../templates/educational-template.html');
        htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    }
    return htmlTemplate;
};

const generateImageElements = (imageUrls) => {
    return imageUrls.map((url, index) => {
        if (url && !url.startsWith('Error')) {
            return `
                <div class="image-container">
                    <img src="${url}" alt="Educational illustration ${index + 1}" loading="lazy">
                </div>
            `;
        } else {
            return `
                <div class="image-container">
                    <div class="image-placeholder">
                        Image ${index + 1} - Loading...
                    </div>
                </div>
            `;
        }
    }).join('');
};

const generateListItems = (items) => {
    return items.map(item => `<li>${item}</li>`).join('');
};

export const generateHtmlContentFromWord = async (req, res) => {
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

        // Optimized prompt - only asks for content, not HTML structure
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

        // Generate images in parallel with content processing
        let imageUrls = [];
        try {
            const imagePrompts = parsedContent.imagePrompts || [
                `Educational illustration of ${word}`,
                `Scientific diagram showing ${word}`,
                `Real-world application of ${word}`
            ];
            imageUrls = await generateImagesFromPrompts(imagePrompts);
        } catch (imageError) {
            console.warn('Image generation failed:', imageError);
            imageUrls = ['', '', '']; // Fallback to placeholders
        }

        // Load and populate template
        const template = await loadTemplate();

        const htmlContent = template
            .replace(/\{\{TITLE\}\}/g, word.charAt(0).toUpperCase() + word.slice(1))
            .replace(/\{\{DEFINITION\}\}/g, parsedContent.definition)
            .replace(/\{\{EXPLANATION\}\}/g, parsedContent.explanation)
            .replace(/\{\{EXAMPLES\}\}/g, generateListItems(parsedContent.examples))
            .replace(/\{\{MISCONCEPTIONS\}\}/g, generateListItems(parsedContent.misconceptions))
            .replace(/\{\{IMAGES\}\}/g, generateImageElements(imageUrls));

        // Return HTML response
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.status(200).send(htmlContent);

    } catch (error) {
        console.error('Error generating HTML content:', error);

        // Load error template or create simple error HTML
        const errorHtml = await createErrorPage(error, req.params.word);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(error.response?.status || 500).send(errorHtml);
    }
};

const createErrorPage = async (error, word = 'Unknown') => {
    const errorTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - ${word}</title>
    <style>
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
        }
        .error-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 { color: #e74c3c; margin-bottom: 20px; }
        p { color: #2c3e50; line-height: 1.6; margin-bottom: 20px; }
        .error-code { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
            font-family: monospace; 
            color: #e74c3c;
            margin: 20px 0;
        }
        .retry-btn {
            background: linear-gradient(45deg, #3498db, #2ecc71);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            font-weight: 500;
            transition: transform 0.3s ease;
        }
        .retry-btn:hover { transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Oops! Something went wrong</h1>
        <p>We couldn't generate the educational content for "<strong>${word}</strong>" at this time.</p>
        <div class="error-code">${error.message}</div>
        <a href="javascript:history.back()" class="retry-btn">← Go Back</a>
        <a href="javascript:location.reload()" class="retry-btn">Try Again</a>
    </div>
</body>
</html>`;

    return errorTemplate;
};