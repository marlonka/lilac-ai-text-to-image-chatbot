# Lilac AI Text-to-Image Chatbot - Implementation Plan (Revised - Context List Flow + Quality Selector)

## Background and Motivation

The user wants to develop a functional chatbot application based on an existing UI prototype (HTML, CSS, TypeScript, visualized in `@texttoimageAIchatbotlilacaccent.png`). The core functionality involves leveraging the OpenAI `gpt-image-1` model to enable text-to-image and image-to-image generation within a chat interface. The goal is to create a locally runnable application suitable for open-sourcing on GitHub.

**Pivot (July 26, 2024):** Based on user feedback and OpenAI documentation confirming multi-image input for `images.edit`, the approach is shifting from a complex "select base + upload secondary" flow to a simpler, more powerful "image context list" model. The application will maintain a list of recent images (user-uploaded and AI-generated, up to 10). Each API request will send the current prompt and this image list to the backend, which will use `images.edit` if images are present, or `images.generate` otherwise. This aims for a user experience closer to ChatGPT's multi-modal interaction.

**Addendum (July 26, 2024):** User requested the ability to select image generation quality (low, medium, high, auto) via the UI to help manage API costs during development and testing.

The user also wants to add a "How to use" button to the application interface to provide guidance to users. Additionally, the browser console shows persistent WebSocket connection errors during development, which need investigation and resolution. Fixing the underlying connection errors is prioritized to ensure a stable development environment.

## Key Challenges and Analysis

1.  **API Key Security:** The OpenAI API key is confidential and must *not* be exposed in the frontend code (`index.tsx`). A backend server acting as a proxy is **essential** to protect the key.
2.  **OpenAI API Integration (`gpt-image-1`):**
    *   Using the correct API endpoints (`images.generate` for text-to-image, `images.edit` for image+text prompts) with `model: "gpt-image-1"`.
    *   Handling *arrays* of image data URLs from frontend -> Backend receives array of strings -> Backend converts *each* to Buffer/File object for the `openai.images.edit` call.
    *   Parsing API responses: Extracting generated image data (likely `b64_json`) and any accompanying text.
    *   Understanding API limitations: Latency (image generation can be slow), potential lack of streaming for image data (requiring good loading state UX), cost implications (based on image size/quality/tokens - see `gpt-image-1` pricing).
3.  **Asynchronous Operations & UX:** Managing the user experience during potentially long API calls. Requires clear loading indicators and non-blocking UI. Investigate if any part of the response (e.g., textual description) can be streamed even if the image data itself cannot.
4.  **Error Handling:** Implementing robust mechanisms to handle API errors (e.g., invalid key, rate limits, content policy, bad requests), network issues, and invalid user inputs, providing clear feedback.
5.  **State Management:** Managing the `imageContextList` (array of data URLs) state, enforcing the limit (e.g., 10 images), and updating the associated UI counter. Managing the user's currently selected upload (`selectedFile`) separately before it's added to the context list upon sending.
6.  **Backend Implementation:** Building a Node.js/Express backend using TypeScript.
7.  **UI State Management:** Managing frontend state for both the `imageContextList` and the newly added `selectedQuality`.
8.  **WebSocket Errors:**
    *   The console logs `WebSocket connection to 'ws://localhost:5173/' failed:` repeatedly, originating from `client:1035`.
    *   Port `5173` is the default port for the Vite development server.
    *   This strongly suggests the errors are related to Vite's Hot Module Replacement (HMR) client trying to establish a WebSocket connection with the dev server and failing.
    *   This might be due to network configuration, proxy issues, or the dev server itself having problems with its HMR WebSocket. It's less likely related to the application's own backend (`server/src/server.ts`), which currently only seems to expose HTTP endpoints.
    *   These errors don't necessarily break the main application functionality (like image generation via HTTP) but can be annoying and might indicate HMR isn't working correctly (changes might require manual page reloads).

## High-level Task Breakdown

**Phase 1: Backend Setup & API Proxy (Node.js/Express)**

1.  **Task:** Initialize Backend Project Structure & Dependencies
    *   **Description:** Create a `server` directory. Inside, run `npm init -y`. Install dependencies: `npm install express openai dotenv cors` and dev dependencies: `npm install -D typescript @types/node @types/express @types/cors ts-node-dev --save-dev`. Create `server/tsconfig.json` (configuring `outDir` to `dist`, `rootDir` to `src`, `module` to `NodeNext` or `CommonJS`, `target` to `ES2020` or later, `moduleResolution` to `NodeNext` or `Node`). Create `server/src/server.ts`. Create `server/.gitignore` (add `node_modules`, `dist`, `.env`). Add build/start scripts to `server/package.json` (e.g., `build: tsc`, `start: node dist/server.js`, `dev: ts-node-dev --respawn src/server.ts`).
    *   **Success Criteria:** `server` directory exists with `package.json`, `tsconfig.json`, `.gitignore`, `src/server.ts`. Dependencies are in `node_modules`. `npm run build` compiles TS to `dist`. `npm run dev` starts the dev server.
2.  **Task:** Create Basic Express Server & CORS
    *   **Description:** In `server/src/server.ts`, set up a basic Express app. Use `dotenv.config()`. Use the `cors` middleware, configuring it to allow requests from the frontend origin (likely `http://localhost:5173` from Vite default). Make the server listen on a port (e.g., 3001 from `process.env.PORT`). Add a simple root route (`/`) that returns a success message.
    *   **Success Criteria:** `npm run dev` starts the server, logging the listening port. Accessing `http://localhost:3001/` returns the success message. CORS headers are set correctly for requests from the frontend origin.
3.  **Task:** Implement API Key Handling & OpenAI Client
    *   **Description:** Create `server/.env` file and add `OPENAI_API_KEY=your_actual_key`. Ensure `.env` is in `server/.gitignore`. In `server/src/server.ts`, load the key using `process.env.OPENAI_API_KEY`. Instantiate the OpenAI client: `const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });`. Add checks to ensure the key is loaded.
    *   **Success Criteria:** Server starts without API key errors. The key is loaded from `.env` and not hardcoded. OpenAI client is instantiated.
4.  **Task:** Create `/api/generate` Endpoint Structure
    *   **Description:** Add a POST route `/api/generate` in `server/src/server.ts`. Use `express.json()` middleware to parse JSON request bodies. Initially, log the received request body.
    *   **Success Criteria:** The endpoint `/api/generate` exists and accepts POST requests with JSON. Sending a test JSON payload logs it correctly on the server.
5.  **Task:** Implement Core API Logic (Text-to-Image First)
    *   **Description:** Inside the `/api/generate` route:
        *   Add robust `try...catch` block for error handling.
        *   Extract `prompt` (string) and `imageDataUrl` (string, optional) from `req.body`.
        *   **Text-to-Image Path:** If `imageDataUrl` is *not* provided:
            *   Call `openai.images.generate({ model: "gpt-image-1", prompt: prompt, n: 1, size: "1024x1024", response_format: "b64_json" /* other params like quality later */ })`.
            *   Extract `b64_json` from the successful response.
            *   Send `res.json({ success: true, image: b64_json, text: "Generated image based on your prompt." })`.
        *   **Image+Text Path (Placeholder):** If `imageDataUrl` *is* provided, initially return an error/placeholder response: `res.status(501).json({ success: false, message: "Image-to-image not yet implemented" })`. (We'll implement this in Phase 3).
        *   **Error Handling:** In the `catch` block, log the error and send an appropriate error response: `res.status(500).json({ success: false, message: "Error generating image.", error: error.message })`. Handle specific OpenAI errors if possible.
    *   **Success Criteria:** Sending a valid text prompt to `/api/generate` triggers `openai.images.generate`. A successful OpenAI response results in a `{ success: true, image: "base64...", text: "..." }` JSON response from the backend. OpenAI API errors are caught and returned as `{ success: false, ... }`. Sending image data results in the "not implemented" response for now.

**Phase 2: Frontend Integration**

6.  **Task:** Modify `sendMessage` to Call Backend
    *   **Description:** In `index.tsx`'s `sendMessage` function:
        *   Remove the `setTimeout` placeholder.
        *   Get `text` from textarea and `image` (`selectedFile.dataUrl` if `selectedFile` exists).
        *   Construct the request body: `const body = { prompt: text }; if (image) { body.imageDataUrl = image; }`.
        *   Add `try...catch` block around the `fetch` call.
        *   Make a `fetch('http://localhost:3001/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })`.
        *   Handle the response promise (`await response.json()`).
    *   **Success Criteria:** Clicking send triggers a POST request to the backend. The request payload is correct JSON. `fetch` call is wrapped in try/catch.
7.  **Task:** Process Backend Response & Display Results (Text-to-Image)
    *   **Description:** Inside the `fetch`'s `.then()` or `await` block in `sendMessage`:
        *   Hide the loading indicator (`loadingIndicator.classList.add('hidden')`).
        *   Check `responseData.success`.
        *   If successful: Extract `responseData.image` (base64 string) and `responseData.text`. Construct the AI message `dataUrl`: `"data:image/png;base64," + responseData.image`. Call `createMessageElement('ai', responseData.text, dataUrl)` and append it.
        *   If unsuccessful: Call `createMessageElement` (or a new error version) to display `responseData.message` as an AI/error message.
    *   **Success Criteria:** Successful text-to-image generation displays the AI text and the received base64 image correctly. Backend errors are displayed in the chat. Loading indicator hides correctly.
8.  **Task:** Implement Frontend Error Handling (Fetch/Network)
    *   **Description:** In the `catch` block of the `fetch` call in `sendMessage`, handle network errors or cases where the backend is unreachable. Hide the loading indicator. Display a generic error message in the chat (e.g., "Failed to connect to the server.").
    *   **Success Criteria:** Network errors during the fetch call result in a user-friendly error message in the chat.
9.  **Task:** Refine Image Handling (Thumbnails/Preview)
    *   **Description:** Verify that the base64 `dataUrl` works correctly for the thumbnail `<img>` `src` in `createMessageElement`. Ensure the `interactive-thumbnail` logic and `data-large-src` attribute are correctly set for AI messages using the `dataUrl`. Test clicking the AI thumbnail opens the preview panel (`#imagePreviewColumn`) and displays the image correctly in `#previewImageLarge`.
    *   **Success Criteria:** Generated images appear as thumbnails. Clicking the thumbnail opens the preview panel displaying the same (potentially larger resolution if API supports later) image via its dataUrl.

**Phase 3: Refinement & Full Functionality (Revised for Context List Flow & Quality Selector)**

10. **Task:** Implement Image+Text (Single Image Edit) Flow - *(Completed, but backend logic will be adapted in 11c.8)*
    *   **Success Criteria:** (Met previously) Uploading an image and sending a prompt successfully triggers the `images.edit` path on the backend. The resulting edited image is displayed in the chat.
11. **Task:** ~~Implement AI Action Buttons (Initial: Download)~~ *(Superseded by removal of most buttons)*
11b. **Task:** ~~Implement Multi-Image Composition Flow (Action Buttons)~~ **(Obsolete/Superseded by Task 11c)**
    *   **Reason:** Requirements changed to adopt an image context list model instead of selecting a base image + secondary image via action buttons.
11c. **Task:** **Implement Image Context List Flow (Completed)**
    *   **Goal:** Allow users to have conversations involving multiple images (uploaded or AI-generated), sending the recent image history (up to 10) with each prompt to the OpenAI API (`images.edit`). Provide UI feedback on the context size and a way to reset it.
    *   **Sub-Tasks:**
        *   **[x] 11c.1 (FE State & Cleanup):** Define `imageContextList: string[]` state variable in `index.tsx`. Remove unused state variables (`nextAiImageAsBase`, `secondaryImageForEdit`, `expectingSecondaryImage`) and related logic (including the cause of the `ReferenceError`).
            *   **Success Criteria:** `imageContextList` array exists. Unused variables and logic are removed. No JS errors on load related to old state.
        *   **[x] 11c.2 (FE UI - Counter Element):** Add HTML for the counter pill button (`#imageContextCounter`) in `index.html`'s footer controls (e.g., between "Upload Image" and model name). Add basic CSS for visibility and styling (`.image-context-counter`) in `index.css`.
            *   **Success Criteria:** Counter pill element exists in the DOM in the correct location. It's styled appropriately (e.g., lilac pill) and can be hidden/shown via CSS.
        *   **[x] 11c.3 (FE Logic - Update Counter Display):** Create/modify a function (`updateImageContextUI`) to update the `#imageContextCounter` text (e.g., "1 Image", "5 Images") and visibility (show if > 0, hide if 0) based on `imageContextList.length`. Call this function whenever the list changes.
            *   **Success Criteria:** Counter text updates accurately reflects `imageContextList.length`. Counter is hidden when list is empty, visible otherwise.
        *   **[x] 11c.4 (FE Logic - Reset Counter Action):** Add a click listener to `#imageContextCounter`. On click, it should clear the `imageContextList` array and call `updateImageContextUI()`.
            *   **Success Criteria:** Clicking the visible counter pill resets `imageContextList` to `[]` and hides the counter pill.
        *   **[x] 11c.5 (FE Logic - Add Images to Context):**
            *   Modify `fileInput` 'change' handler: After reading the file to `result` (dataUrl), add `result` to `imageContextList`. If list exceeds 10, remove the oldest image(s). Call `updateImageContextUI()`. *Keep* the `selectedFile` logic temporarily to show the preview in the input area before send.
            *   Modify `createMessageElement`: Remove obsolete action pill buttons. **Ensure Download button remains/is re-added below AI images.** When creating an AI message element *with an image*, add its `imageUrl` to `imageContextList`. If list exceeds 10, remove the oldest image(s). Call `updateImageContextUI()`. Add listener for the message download button.
            *   **Success Criteria:** Uploading images and receiving AI images updates `imageContextList` correctly (FIFO, max 10) and triggers the UI counter update. Only Download button is present below AI images and is functional.
        *   **[x] 11c.6 (FE Logic - Send Context):** Modify `sendMessage`:
            *   When sending, retrieve the current `imageContextList`.
            *   Construct the payload: `{ prompt: text, imageContextUrls: [...imageContextList] }`. (The `selectedFile` shown in preview is already added to context list by the upload handler).
            *   Clear `selectedFile` *after* sending the message (as it's now part of the sent context).
            *   **Success Criteria:** Clicking send constructs a payload with `prompt` and `imageContextUrls` (array of data URLs). The `selectedFile` preview is cleared after sending.
        *   **[x] 11c.7 (BE API)** Update backend endpoint signature.
        *   **[x] 11c.8 (BE Logic)** Update backend handler for context list / generate vs edit.
        *   [-] ~~11c.9 (Testing) End-to-end testing of the new flow.~~ *(Moved to Task 11e)*
            *   **Success Criteria:** *(Moved to Task 11e)*
11d. **Task:** **Implement Quality Selector (NEW)**
    *   **Goal:** Allow users to select the image generation quality (low, medium, high, auto) via the UI to help manage API costs during development and testing.
    *   **Sub-Tasks:**
        *   **[x] 11d.1 (FE UI) Add quality dropdown HTML/CSS.**
        *   **[x] 11d.2 (FE State & Logic) Add state, update on change.**
        *   **[x] 11d.3 (FE Logic - Send) Add quality to payload.**
        *   **[x] 11d.4 (BE API) Update backend signature for quality.**
        *   **[x] 11d.5 (BE Logic) Pass quality to OpenAI SDK calls.**
        *   **[x] 11d.6 (Testing - Quality) Verify quality parameter flow.**
11e. **Task:** **Final End-to-End Testing (Formerly 11c.9)**
    *   **Goal:** Rigorously test all the core features together to ensure everything works smoothly and handles different scenarios correctly.
    *   **Success Criteria:** All core features function correctly in various scenarios.
12. **Task:** Code Cleanup & Structuring
    *   **Description:** Refactor frontend (`index.tsx`) and backend (`server.ts`) code. Consider splitting backend routes/logic into separate files if `server.ts` becomes too large. Add JSDoc/TSDoc comments for functions and complex logic. Ensure consistent formatting.
    *   **Success Criteria:** Codebase is well-organized, readable, and maintainable.
13. **Task:** README Documentation
    *   **Description:** Create/update `README.md` with project description, setup (frontend `npm install`, backend `cd server && npm install`), configuration (`server/.env`), running (`npm run dev` for frontend, `cd server && npm run dev` for backend), usage (explaining image context **and quality selector**), and known limitations.
    *   **Success Criteria:** A comprehensive `README.md` allows easy setup and usage.
14. **Task:** Final Git Setup & Commits
    *   **Description:** Ensure `.gitignore` (root and server) is correct. Use `git add .`, `git commit -m "Meaningful message"` frequently throughout development. Create a final commit before potentially pushing to GitHub.
    *   **Success Criteria:** Project is fully version controlled with a clean, logical history.

**Phase 2: Implement "How to Use" Button**

1.  **Task:** Add Button Element
    *   Action: Locate the input area in `index.tsx`. Add a `<button>` element styled similarly to existing buttons, labeled "How to use". Position it near the send button.
    *   Success Criteria: The button appears visually correct in the designated location in the browser.
2.  **Task:** Implement Modal Component
    *   Action: Create a basic React component for the modal (e.g., `HowToUseModal.tsx`). It should accept `isOpen` and `onClose` props. Style it as a simple overlay with a content area and a close button.
    *   Success Criteria: Component structure is created. Basic styling allows it to function as an overlay.
3.  **Task:** Add State and Toggle Logic
    *   Action: In `index.tsx`, add a `useState` hook (e.g., `isHowToUseOpen`, `setIsHowToUseOpen`) initialized to `false`. Add an `onClick` handler to the "How to use" button that calls `setIsHowToUseOpen(true)`. Render the `<HowToUseModal>` component, passing the state variable to `isOpen` and a function calling `setIsHowToUseOpen(false)` to `onClose`.
    *   Success Criteria: Clicking the "How to use" button opens the modal. Clicking the modal's close button (or potentially the overlay) closes it.
4.  **Task:** Add Instructional Content
    *   Action: Define simple "How to use" instructions (e.g., "1. Type a prompt describing the image you want. 2. Select quality and model. 3. Click send. 4. Optionally upload an image for context-based editing."). Add this text content inside the `HowToUseModal` component.
    *   Success Criteria: The modal displays the defined instructional text when opened.

## Project Status Board

*(Tasks updated based on pivot to Context List Flow + Quality Selector)*
-   [x] **Phase 1: Backend Setup & API Proxy** (Complete)
-   [x] **Phase 2: Frontend Integration** (Complete)
-   [ ] **Phase 3: Refinement & Full Functionality (Revised)**
    -   [x] 10. Implement Image+Text Flow (Backend & Frontend - Single Image Edit) *(Backend logic adapted in 11c.8)*
    -   [-] ~~11. Implement AI Action Buttons (Initial: Download)~~ *(Superseded)*
    -   [-] ~~**11b. Implement Multi-Image Composition Flow (Action Buttons)**~~ *(Obsolete)*
    -   [x] **11c. Implement Image Context List Flow** (Complete)
        -   [x] 11c.1 (FE State & Cleanup)
        -   [x] 11c.2 (FE UI - Counter Element)
        -   [x] 11c.3 (FE Logic - Update Counter Display)
        -   [x] 11c.4 (FE Logic - Reset Counter Action)
        -   [x] 11c.5 (FE Logic - Add Images to Context)
        -   [x] 11c.6 (FE Logic - Send Context)
        -   [x] 11c.7 (BE API) Update backend endpoint signature.
        -   [x] 11c.8 (BE Logic) Update backend handler for context list / generate vs edit.
        -   [-] ~~11c.9 (Testing)~~ *(Moved to 11e)*
    -   [x] **11d. Implement Quality Selector (NEW)**
        -   [x] 11d.1 (FE UI) Add quality dropdown HTML/CSS.
        -   [x] 11d.2 (FE State & Logic) Add state, update on change.
        -   [x] 11d.3 (FE Logic - Send) Add quality to payload.
        -   [x] 11d.4 (BE API) Update backend signature for quality.
        -   [x] 11d.5 (BE Logic) Pass quality to OpenAI SDK calls.
        -   [x] 11d.6 (Testing - Quality) Verify quality parameter flow.
    -   [x] **11e. Final End-to-End Testing (Formerly 11c.9)**
    -   [x] **11f. Implement Custom Quality Dropdown UI (NEW)**
        -   [x] 11f.1 (HTML) Replace `<select>` with custom `div` structure.
        -   [x] 11f.2 (CSS) Style custom dropdown elements (pill, options list).
        -   [x] 11f.3 (JS) Implement toggle, selection, and outside-click logic.
        -   [x] 11f.4 (Testing) Verified appearance and functionality.
    -   [x] 12. Code Cleanup & Structuring
    -   [x] 13. README Documentation
    -   [ ] 14. Final Git Setup & Commits

**Phase 2: Implement "How to Use" Button**

1.  **Task:** Add Button Element
    *   Action: Locate the input area in `index.tsx`. Add a `<button>` element styled similarly to existing buttons, labeled "How to use". Position it near the send button.
    *   Success Criteria: The button appears visually correct in the designated location in the browser.
2.  **Task:** Implement Modal Component
    *   Action: Create a basic React component for the modal (e.g., `HowToUseModal.tsx`). It should accept `isOpen` and `onClose` props. Style it as a simple overlay with a content area and a close button.
    *   Success Criteria: Component structure is created. Basic styling allows it to function as an overlay.
3.  **Task:** Add State and Toggle Logic
    *   Action: In `index.tsx`, add a `useState` hook (e.g., `isHowToUseOpen`, `setIsHowToUseOpen`) initialized to `false`. Add an `onClick` handler to the "How to use" button that calls `setIsHowToUseOpen(true)`. Render the `<HowToUseModal>` component, passing the state variable to `isOpen` and a function calling `setIsHowToUseOpen(false)` to `onClose`.
    *   Success Criteria: Clicking the "How to use" button opens the modal. Clicking the modal's close button (or potentially the overlay) closes it.
4.  **Task:** Add Instructional Content
    *   Action: Define simple "How to use" instructions (e.g., "1. Type a prompt describing the image you want. 2. Select quality and model. 3. Click send. 4. Optionally upload an image for context-based editing."). Add this text content inside the `HowToUseModal` component.
    *   Success Criteria: The modal displays the defined instructional text when opened.

## Current Status / Progress Tracking

*   Backend server differentiates generate/edit calls based on image context.
*   Frontend manages context list state and sends it to backend.
*   Quality selector implemented and functional (FE & BE).
*   **Next Step:** Begin **Task 11e** - Final End-to-End Testing.

## Executor's Feedback or Assistance Requests

*   **Task 11d completed.** Quality selector feature implemented and tested successfully. Backend logs and frontend UI confirm quality setting is passed and used. Subjective speed difference observed.
*   Ready to proceed with **Task 11e** in Executor mode: Final End-to-End Testing.

## Lessons Learned

*   `curl` on Windows PowerShell is often an alias for `Invoke-WebRequest` and requires different syntax (e.g., `-Method POST`, `-ContentType`, `-Body`). Use `Invoke-WebRequest` directly for clarity.
*   TypeScript errors like `TS2322` (Type 'Promise<Response>' is not assignable to type 'void | Promise<void>') in Express async handlers often mean the handler shouldn't explicitly `return res.json(...)`. Instead, call `res.json(...)` and then use `return;` or let the function implicitly return `void`. Using `RequestHandler` type from `express` helps enforce this.
*   The `gpt-image-1` model via `openai.images.generate` does **not** accept the `response_format` parameter (it defaults to `b64_json` with the Node SDK). Including it causes a 400 error. `images.edit` also defaults to `b64_json`.
*   Import specific error types like `APIError` from `openai/error` to safely access properties like `status` in catch blocks. Check for `APIError` before `OpenAIError` if you need the status code.
*   Check for `response` and `response.data` existence before accessing nested properties like `response.data[0].b64_json` to prevent runtime errors and satisfy TypeScript's `possibly 'undefined'` checks (`TS18048`).
*   Ensure frontend dependencies (like `vite`) are installed in the correct directory (`npm install` in the root) before running scripts like `npm run dev`.
*   When working with the DOM in TypeScript, elements obtained via `getElementById` might be `null`. Use type assertions (`as HTML...Element`) or null checks (`if (element)`) before accessing properties or methods. Event targets (`event.target`) also often need type assertion.
*   Base64 image data received from an API needs to be prepended with the correct data URI scheme (`data:image/png;base64,` or similar, depending on the image type) before being used as an `<img>` `src`.
*   Displaying fetch/network errors directly in the UI provides a better user experience than using `alert()`. Use the `catch` block of `fetch` and potentially a dedicated error message creation function.
*   The `dataset` property on HTML elements provides a convenient way to store custom data (like `data-large-src`) that can be accessed in JavaScript event handlers.
*   The `openai` Node.js library's `images.edit` endpoint requires the image data to be passed as a `File`-like object. This can be created from a `Buffer` derived from a base64 data URL using `new File([buffer], filename, { type: mimeType })`. Remember to parse the mime type from the data URL.
*   **Confirmed (via July 2024 docs):** The `openai.images.edit` API endpoint accepts an *array* for the `image` parameter (`image: [file1, file2, ...]`) to support multi-image composition/reference with `gpt-image-1`, not just single-image edits.
*   **Requirement Pivot:** Changed multi-image handling from specific action buttons ("Add a logo") to a persistent image context list (like ChatGPT), simplifying UI and aligning better with API capabilities.
