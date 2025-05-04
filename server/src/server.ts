import express, { Express, Request, Response, RequestHandler } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import OpenAI from 'openai'; // Import OpenAI
import { OpenAIError, APIError } from 'openai/error'; // Import specific error types
import { File } from 'node:buffer'; // Explicitly import Node's File
import { Buffer } from 'node:buffer'; // Import Buffer explicitly
import { GoogleGenAI, Content, Part, GenerateContentResponse, Modality } from '@google/genai'; // <-- Corrected Gemini SDK import name

// Load environment variables from .env file
dotenv.config();

// --- Check for API Keys ---
const openaiApiKey = process.env.OPENAI_API_KEY;
// const googleApiKey = process.env.GOOGLE_API_KEY; // <-- REMOVE Google API Key loading

if (!openaiApiKey) {
  console.warn("🟠 OPENAI_API_KEY is not set in the .env file. OpenAI features will be unavailable.");
  // process.exit(1); 
}
// REMOVE Google API Key check
// if (!googleApiKey) { 
//   console.warn("🟠 GOOGLE_API_KEY is not set in the .env file. Gemini features will be unavailable.");
// }

// --- Instantiate OpenAI Client (Conditional) ---
let openai: OpenAI | null = null;
if (openaiApiKey) {
  openai = new OpenAI({ apiKey: openaiApiKey });
  console.log("✅ OpenAI client instantiated successfully.");
} else {
  console.log("➡️ OpenAI client not instantiated (key missing).");
}

// --- Instantiate Google GenAI Client for Vertex AI ---
let genAI: GoogleGenAI | null = null; 
try {
    const vertexProject = "librechattergemini"; // Your Project ID
    const vertexLocation = "us-central1";   // Location 
    
    console.log(`🧬 Initializing Google GenAI client for Vertex AI (Project: ${vertexProject}, Location: ${vertexLocation})...`);
    console.log("   (Using vertexai: true, relying on ADC)");
    
    // Initialize using the CORRECT pattern including vertexai: true
    genAI = new GoogleGenAI({ 
        vertexai: true,        // <--- ADDED this crucial flag
        project: vertexProject, 
        location: vertexLocation 
    }); 

    // Simple check to see if client object seems valid (can refine later)
    if (genAI && typeof genAI.models?.generateContent === 'function') {
         console.log("✅ Google GenAI client for Vertex AI appears instantiated successfully.");
    } else {
        throw new Error("GoogleGenAI client initialization did not result in a valid object.");
    }

} catch (error) {
    console.error("🔴 Failed to initialize Google GenAI client for Vertex AI:", error);
    console.error("   Make sure Application Default Credentials (ADC) are correctly configured and the Vertex AI API is enabled for the project.");
    genAI = null; // Ensure client is null if initialization failed
}
// --- End Google GenAI Client Initialization ---

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

// --- Helper Function: Data URL to Base64 Data and Mime Type ---
// Gemini SDK needs mime type and base64 data separately
function dataUrlToGeminiData(dataUrl: string): { mimeType: string; data: string } {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) {
        throw new Error('Invalid data URL format');
    }
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!mimeMatch || mimeMatch.length < 2) {
        throw new Error('Could not extract mime type from data URL');
    }
    const mimeType = mimeMatch[1];
    const base64Data = parts[1];
    return { mimeType, data: base64Data };
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

    // --- Add check for OpenAI client ---
    if (!openai) {
        console.error("🔴 OpenAI client not initialized. Cannot process request for /api/generate.");
        return res.status(503).json({ success: false, message: 'OpenAI service is unavailable (client not initialized).' });
    }

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

// --- NEW GEMINI API Route ---
// Define interface for Gemini request body (can be refined later)
interface GeminiGenerateRequestBody {
    prompt: string;
    imageContextUrls?: string[];
    // Add other Gemini-specific parameters if needed
}

app.post('/api/generate-gemini', (async (req: Request<{}, {}, GeminiGenerateRequestBody>, res: Response) => {
    console.log('🔄 Received request for /api/generate-gemini:');
    const { prompt, imageContextUrls } = req.body;

    console.log(`   Prompt: "${prompt}"`);
    console.log(`   Image Context URLs provided: ${imageContextUrls?.length || 0}`);

    // --- Basic Input Validation ---
    // Allow empty prompt if context images are provided
    const hasContextImages = imageContextUrls && imageContextUrls.length > 0;
    if ((!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) && !hasContextImages) {
         return res.status(400).json({ success: false, message: 'Prompt is required when no context images are provided.' });
    }
    // Prompt can be empty if images ARE provided

    // Check if Gemini client is available
    if (!genAI) {
        console.error("🔴 Gemini client not initialized. Cannot process request.");
        return res.status(503).json({ success: false, message: 'Gemini service is unavailable (client not initialized).' });
    }

    try {
        // --- Define Model and Config ---
        const modelId = "gemini-2.0-flash-exp";
        const generationConfig = {
            responseModalities: [Modality.TEXT, Modality.IMAGE]
        };

        // --- Prepare contents (Handle multimodal input) ---
        let contents: Content[];
        const userParts: Part[] = []; // Array to hold all parts for the user role

        if (hasContextImages) {
            console.log(`🖼️ Processing ${imageContextUrls.length} context image(s)...`);
            try {
                for (const dataUrl of imageContextUrls) {
                    const { mimeType, data } = dataUrlToGeminiData(dataUrl); // Use helper function
                    userParts.push({ inlineData: { mimeType, data } });
                }
                 console.log(`   ✅ Successfully converted ${imageContextUrls.length} image URLs to inlineData parts.`);
            } catch (convertError) {
                 console.error("🔴 Error converting data URL to Gemini format:", convertError);
                 // Use return here
                 return res.status(400).json({ success: false, message: `Failed to process image data: ${convertError instanceof Error ? convertError.message : 'Unknown conversion error'}` });
            }
        }

        // Add the text prompt (if provided) AFTER the images
        // Gemini generally expects [image, image, ..., text] structure for multimodal
        if (prompt && prompt.trim().length > 0) {
            userParts.push({ text: prompt });
            console.log("   ➕ Added text prompt part.");
        } else if (!hasContextImages) {
             // This case should be caught by initial validation, but double-check
             console.error("🔴 Attempting to send without prompt or images.");
             return res.status(400).json({ success: false, message: 'Cannot send request without a text prompt or context images.' });
        } else {
             console.log("   📝 Sending image context without an additional text prompt.");
        }

        // Structure the final contents array
        contents = [{ role: "user", parts: userParts }];

        console.log(`📞 Calling Gemini models.generateContent (${modelId}, ${hasContextImages ? 'Multimodal' : 'Text-only'})...`);

        // --- Make the API Call ---
        const result = await genAI.models.generateContent({
            model: modelId,
            contents: contents,
            config: generationConfig
        });

        console.log("✅ Gemini API call successful.");

        // --- Parse Response ---
        let responseText: string | null = null;
        let responseImageBase64: string | null = null;

        if (result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
            console.log(`   Received ${result.candidates[0].content.parts.length} parts from Gemini.`);
            for (const part of result.candidates[0].content.parts) {
                if (part.text && !responseText) {
                    responseText = part.text;
                    console.log("    extracted text part.");
                }
                if (part.inlineData && part.inlineData.data && !responseImageBase64) {
                    responseImageBase64 = part.inlineData.data;
                    console.log(`   extracted image part (mime type: ${part.inlineData.mimeType}).`);
                }
                if (responseText && responseImageBase64) break;
            }
        } else {
            console.warn("🟠 Gemini response structure might be unexpected or empty:", JSON.stringify(result, null, 2));
        }

        // === Provide default text if only image is received === (MODIFIED SECTION)
        if (responseImageBase64 && !responseText) {
            if (hasContextImages) {
                responseText = "Edited image based on your prompt and context."; // Default for multimodal edit
                console.log("   ℹ️ Generated default text for multimodal edit response.");
            } else {
                responseText = "Generated image based on your prompt."; // Default for text-to-image
                console.log("   ℹ️ Generated default text for text-to-image response.");
            }
        }
        // ========================================================

        // Check if we still have nothing usable (including handling block reasons)
        if (!responseText && !responseImageBase64) {
            console.warn("🟠 Failed to extract usable text or image from Gemini response.");
            const blockReason = result?.promptFeedback?.blockReason;
            const safetyRatings = result?.candidates?.[0]?.safetyRatings;
            let message = "Gemini generated a response, but no usable text or image content was found.";
            if(blockReason) {
                 message += ` Block Reason: ${blockReason}.`;
                 console.warn(`   Block Reason: ${blockReason}`);
                 if (safetyRatings) {
                     console.warn(`   Safety Ratings: ${JSON.stringify(safetyRatings)}`);
                 }
            }
            return res.status(500).json({ success: false, message: message });
        }

        console.log("✅ Successfully parsed Gemini response.");
        res.json({
            success: true,
            text: responseText, // Send back extracted text OR the default text
            image: responseImageBase64
        });

    } catch (error) {
       console.error("🔴 Error during Gemini API call or processing:", error);
       let message = "An unexpected error occurred processing the Gemini request.";
       if (error instanceof Error) {
           message = error.message;
       }
       // Use return here
       return res.status(500).json({ success: false, message: message });
    }

}) as RequestHandler);

// --- Server Start ---
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
}); 