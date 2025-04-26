import express, { Express, Request, Response, RequestHandler } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import OpenAI from 'openai'; // Import OpenAI
import { OpenAIError, APIError } from 'openai/error'; // Import specific error types
import { File } from 'node:buffer'; // Explicitly import Node's File
import { Buffer } from 'node:buffer'; // Import Buffer explicitly

// Load environment variables from .env file
dotenv.config();

// --- Check for API Key ---
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("🔴 OPENAI_API_KEY is not set in the .env file.");
  process.exit(1); // Exit the process if the key is missing
}

// --- Instantiate OpenAI Client ---
const openai = new OpenAI({ apiKey });
console.log("✅ OpenAI client instantiated successfully.");

const app: Express = express();
const port = process.env.PORT || 3001; // Use port from .env or default to 3001

// --- Middleware ---
// Enable CORS for requests from your frontend origin
// Replace 'http://localhost:5173' with your actual frontend URL if different
app.use(cors({
  origin: 'http://localhost:5173'
}));

// Middleware to parse JSON bodies - Important! Must come before routes that need it.
app.use(express.json({ limit: '50mb' })); // Increase limit for potential base64 images

// --- Routes ---
// Basic root route for testing
app.get('/', (req: Request, res: Response) => {
  res.send('Lilac AI Chatbot Server is running!');
});

// --- Helper Function: Data URL to File-like object ---
// The OpenAI library expects an object satisfying the File interface (Blob + name)
// Node's global File works perfectly here.
async function dataUrlToImageFile(dataUrl: string, index: number): Promise<File> {
    const response = await fetch(dataUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch data URL for image ${index}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    // --- Convert ArrayBuffer to Node.js Buffer ---
    const buffer = Buffer.from(arrayBuffer);
    const filename = `context-image-${index}.${blob.type.split('/')[1] || 'png'}`;
    // --- Use Node's File constructor with the Buffer ---
    return new File([buffer], filename, { type: blob.type });
}

// --- Type Definitions ---
// Define allowed quality values (matching frontend)
type ImageQuality = 'auto' | 'low' | 'medium' | 'high';

// Interface for the expected request body
interface GenerateRequestBody {
    prompt: string;
    imageContextUrls?: string[]; // Optional array of data URLs
    quality?: ImageQuality; // Add optional quality field
}

// --- API Route ---
app.post('/api/generate', (async (req: Request<{}, {}, GenerateRequestBody>, res: Response) => {
    // Now req.body is typed according to GenerateRequestBody
    console.log('🔄 Received request:');
    const { prompt, imageContextUrls, quality } = req.body; // Extract quality here

    // Log the received quality
    console.log(`   Prompt: "${prompt}"`);
    console.log(`   Image Context URLs provided: ${imageContextUrls?.length || 0}`);
    console.log(`   Requested Quality: ${quality || 'auto (default)'}`); // Log quality

    // --- Basic Input Validation ---
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        // Use 'return' before sending response to satisfy linting/type checking
        return res.status(400).json({ success: false, message: 'Prompt is required.' });
    }
    // Optional: Validate quality if needed, though defaulting to 'auto' is safe
    if (quality && !['auto', 'low', 'medium', 'high'].includes(quality)) {
        console.warn(`🟠 Received invalid quality value: "${quality}". Defaulting to 'auto'.`);
        // No need to return here, just log and proceed
    }

    try {
        // --- Determine API call based on context ---
        const hasContextImages = imageContextUrls && imageContextUrls.length > 0;

        // --- Prepare common options based on quality ---
        // Define the base type for options objects (adjust as needed if edit/generate differ more)
        type CommonImageOptions = {
             model: string;
             prompt: string;
             n: number;
             size: "1024x1024"; // Keep consistent for now
             quality?: Exclude<ImageQuality, 'auto'>; // Only include if not 'auto'
        };

        // Build the base options object
        const commonOptions: CommonImageOptions = {
            model: "gpt-image-1",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
        };

        // Conditionally add the quality parameter if it's not 'auto'
        if (quality && quality !== 'auto') {
            commonOptions.quality = quality;
             console.log(`   ➡️  Using quality: ${quality}`);
        } else {
             console.log(`   ➡️  Using quality: auto (default)`);
        }

        if (hasContextImages) {
            // --- EDIT PATH ---
            console.log(`⏳ Preparing ${imageContextUrls.length} image(s) for editing...`);
            const imageFiles = await Promise.all(
                 imageContextUrls.map((url, index) => dataUrlToImageFile(url, index))
            );
            const validFiles = imageFiles as File[]; // Assuming helper throws on error

            if (validFiles.length !== imageContextUrls.length) {
                 console.error("🔴 Failed to process one or more context images.");
                 return res.status(500).json({ success: false, message: 'Failed to process one or more context images.' });
            }
            console.log(`📦 Created ${validFiles.length} File objects for editing.`);

            console.log(`📞 Calling openai.images.edit with ${validFiles.length} image(s)...`);
            const response = await openai.images.edit({
                ...commonOptions, // Spread the common options (including quality if set)
                image: validFiles, // Add the specific 'image' parameter for edit
            });
            console.log("✅ OpenAI API call successful (edit).");

            if (response && response.data && response.data[0] && response.data[0].b64_json) {
                console.log('🖼️ Successfully received image data (b64_json).');
                res.json({
                    success: true,
                    image: response.data[0].b64_json,
                    text: `Edited image using ${validFiles.length} context image(s) based on prompt: "${prompt}" (Quality: ${quality || 'auto'})`
                });
            } else {
                console.error('🔴 Unexpected response structure from OpenAI edit API:', response);
                throw new Error('Invalid response structure from OpenAI edit API.');
            }

        } else {
            // --- GENERATE PATH ---
            console.log('📞 Calling openai.images.generate (no context)...');
            const response = await openai.images.generate({
                ...commonOptions, // Spread the common options (including quality if set)
            });
            console.log("✅ OpenAI API call successful (generate).");

            if (response && response.data && response.data[0] && response.data[0].b64_json) {
                console.log('🖼️ Successfully received image data (b64_json).');
                res.json({
                    success: true,
                    image: response.data[0].b64_json,
                    text: `Generated image based on prompt: "${prompt}" (Quality: ${quality || 'auto'})`
                });
            } else {
                console.error('🔴 Unexpected response structure from OpenAI generate API:', response);
                throw new Error('Invalid response structure from OpenAI generate API.');
            }
        }

    } catch (error) {
        console.error("🔴 Error during OpenAI API call or processing:", error);
        let statusCode = 500;
        let message = "An unexpected error occurred processing the image request.";

        if (error instanceof APIError) {
            statusCode = error.status || 500;
            message = `OpenAI API Error (${statusCode}): ${error.message || 'Unknown API error'}`;
            console.error(`   APIError Details: Type=${error.type}, Code=${error.code}, Param=${error.param}`);
        } else if (error instanceof Error) { // Catch broader errors, including fetch errors in helper
            message = error.message;
        }

        // Ensure response isn't already sent before sending error
        if (!res.headersSent) {
             // Use return here
             return res.status(statusCode).json({ success: false, message: message });
        } else {
            console.error("🔴 Headers already sent, cannot send error response to client.");
        }
    }
}) as RequestHandler);

// --- Server Start ---
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
}); 