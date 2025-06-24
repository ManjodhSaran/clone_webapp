import axios from 'axios';
import { config } from '../config/index.js';
import { enhancePromptsForImageGeneration, generateImages } from '../helpers/imageGeneration.js';

const HEADERS = {
  "x-api-key": config.ai.anthropicApiKey,
  "anthropic-version": "2023-06-01",
  "content-type": "application/json"
};

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

export class StudyController {
  static async generateContentFromWord(req, res) {
    try {
      const { word } = req.params;
      const model = req.query.model || config.ai_models.default;

      if (!config.ai.anthropicApiKey) {
        return res.status(500).json({
          error: "Anthropic API key not configured"
        });
      }

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
  "definition": "...",                     
  "explanation": "...",                   
  "examples": ["Example 1", "Example 2"], 
  "misconceptions": ["Misconception 1"],  
  "images": [                             
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

      const response = await axios.post(config.ai.anthropicApiUrl, requestBody, {
        headers: HEADERS
      });

      const content = response.data.content[0].text;
      const parsedContent = JSON.parse(content);

      validateGenerateResponse(parsedContent);

      const images = parsedContent.images || [];
      const enhancedImages = await enhancePromptsForImageGeneration(images);
      const imageLinks = await generateImages(enhancedImages);

      const result = {
        ...parsedContent,
        images: imageLinks
      };

      res.status(200).json(result);
    } catch (error) {
      console.error('Error generating content:', error);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.response.statusText;
        res.status(status).json({ error: `API Error: ${message}` });
      } else if (error instanceof SyntaxError) {
        res.status(500).json({ error: "Failed to parse API response as JSON" });
      } else {
        res.status(500).json({ error: `Error generating content: ${error.message}` });
      }
    }
  }
}