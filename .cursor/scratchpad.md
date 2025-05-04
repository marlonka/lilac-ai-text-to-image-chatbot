# Lilac AI Chatbot - Gemini API Integration

## Background and Motivation

The project is pivoting from using OpenAI's `gpt-image-1` model to integrating Google's Gemini API, specifically targeting the `gemini-2.0-flash-exp` model via the `@google/genai` SDK. The goal is to leverage Gemini's capability to generate both text and images within the existing chatbot interface, including iterative image editing based on conversation context. This requires updating the backend server to interact with the new API and potentially adjusting the frontend to handle Gemini's specific response format.

## Key Challenges and Analysis

1.  **API Key Management:** Securely handling the `GOOGLE_API_KEY` on the backend.
2.  **SDK Integration:** Installing and using the `@google/genai` SDK within the existing Node.js/TypeScript backend.
3.  **API Interaction:** Correctly formulating requests to the `gemini-2.0-flash-exp` model, including setting `response_modalities` to `['TEXT', 'IMAGE']`.
4.  **Multimodal Handling:** Adapting the existing `imageContextList` mechanism to provide context images to the Gemini API for editing tasks.
5.  **Response Parsing:** Processing the Gemini API response, which can contain interleaved text (`part.text`) and inline image data (`part.inlineData`). Extracting image data (base64) and text appropriately.
6.  **Frontend Adaptation:** Ensuring the frontend can correctly display responses containing text, images, or both, as returned by the Gemini-powered backend.
7.  **Error Handling:** Implementing robust error handling for Gemini-specific API errors (e.g., quotas, content restrictions, invalid requests).
8.  **Experimental Model:** Working with an experimental model (`gemini-2.0-flash-exp`) might involve limitations or changes. Need to consult documentation and handle potential instability.
9.  **Dependency Management:** Adding the `@google/genai` dependency to the server project.

## High-level Task Breakdown

**Phase 1: Backend Setup & Gemini API Integration**

1.  **Task:** Install Gemini SDK & Configure API Key
    *   **Description:** Add `@google/genai` as a dependency to `server/package.json`. Update `server/.env` to include `GOOGLE_API_KEY=your_gemini_key`. Update server startup logic (`server/src/server.ts`) to load and validate this new key. Instantiate the `GoogleGenAI` client.
    *   **Success Criteria:** `@google/genai` is installed. Server loads `GOOGLE_API_KEY` from `.env`. `GoogleGenAI` client is initialized successfully on server start.
2.  **Task:** Create New API Endpoint (`/api/generate-gemini`)
    *   **Description:** Decide whether to create a new endpoint (e.g., `/api/generate-gemini`) or refactor the existing `/api/generate` in `server/src/server.ts`. This endpoint will handle requests intended for the Gemini API.
    *   **Success Criteria:** A clear POST endpoint exists to handle Gemini generation requests.
3.  **Task:** Implement Gemini Text-to-Image Generation Logic
    *   **Description:** In the Gemini endpoint handler:
        *   Receive `prompt` (string) from the request body.
        *   Use the `@google/genai` client to call `generateContent` on the `gemini-2.0-flash-exp` model.
        *   Pass the `prompt` as `contents`.
        *   Set `config.responseModalities` to `['TEXT', 'IMAGE']`.
        *   Implement initial response parsing (extract text and base64 image data).
        *   Format the response for the frontend (e.g., `{ success: true, text: "...", image: "base64..." }`).
        *   Add basic `try...catch` error handling.
    *   **Success Criteria:** Sending a text prompt to the endpoint successfully calls the Gemini API. The backend correctly parses a simple text+image response and sends it back to the client in the expected format. Basic API errors are caught.
4.  **Task:** Implement Gemini Image Context Handling (Editing)
    *   **Description:** Enhance the Gemini endpoint handler:
        *   Receive `imageContextUrls` (array of data URLs) from the request body, alongside the `prompt`.
        *   If `imageContextUrls` are present, format the `contents` for the `generateContent` call according to `@google/genai` requirements for multimodal input (likely involves converting data URLs to `{inlineData: {mimeType: '...', data: '...'}}` objects and structuring the `contents` array).
        *   Ensure the `response_modalities` are still set correctly.
        *   Refine response parsing and error handling for multimodal interactions.
    *   **Success Criteria:** Sending a prompt along with image context URLs correctly calls the Gemini API with multimodal input. The backend handles the potentially more complex `contents` structure.

**Phase 2: Frontend Integration**

5.  **Task:** Update Frontend API Call
    *   **Description:** Modify the `fetch` call in `index.tsx`'s `sendMessage` function to target the new/updated Gemini backend endpoint. Ensure the payload (`prompt`, `imageContextUrls`) is sent correctly.
    *   **Success Criteria:** Frontend sends requests to the correct Gemini backend endpoint with the required data.
6.  **Task:** Update Frontend Response Handling
    *   **Description:** Adjust the response processing logic within `sendMessage` to handle the potentially mixed text/image responses from the Gemini backend. Ensure `createMessageElement` can display text-only, image-only, or text+image AI responses correctly.
    *   **Success Criteria:** AI responses from Gemini (text, image, or both) are displayed accurately in the chat interface.
7.  **Task:** Update UI (Model Selector)
    *   **Description:** Update any UI elements that display the model name (e.g., in the footer) to reflect the use of Gemini. Consider if the quality selector is still relevant or needs adaptation for Gemini.
    *   **Success Criteria:** UI accurately reflects the underlying model being used.

**Phase 3: Refinement & Testing**

8.  **Task:** Thorough Testing
    *   **Description:** Test various scenarios: text-only prompts, text+single image prompts, text+multiple image prompts. Test edge cases and error conditions (e.g., invalid API key, Gemini refusing to generate, network errors).
    *   **Success Criteria:** The integration works reliably across different input types. Errors are handled gracefully.
9.  **Task:** Refine Error Handling & Logging
    *   **Description:** Improve error messages returned to the frontend. Add more detailed logging on the backend to capture Gemini API specific errors or warnings.
    *   **Success Criteria:** Errors are informative for both the user and developers.
10. **Task:** Documentation Update
    *   **Description:** Update `README.md` to reflect the switch to Gemini API. Include setup instructions for the `GOOGLE_API_KEY`, new dependencies, and any changes in usage.
    *   **Success Criteria:** README is accurate and enables others to set up and run the Gemini-powered version.
11. **Task:** Code Cleanup
    *   **Description:** Refactor frontend and backend code for clarity, consistency, and maintainability. Remove any unused code related to the previous OpenAI integration.
    *   **Success Criteria:** Codebase is clean and well-organized.

## Project Status Board

-   [x] **Phase 1: Backend Setup & Gemini API Integration** (Completed)
    -   [x] 1. Install Gemini SDK & Configure API Key (Switched to ADC for Vertex)
    -   [x] 2. Create New API Endpoint (`/api/generate-gemini`)
    -   [x] 3. Implement Gemini Text-to-Image Generation Logic
    -   [x] 4. Implement Gemini Image Context Handling (Editing)
-   [x] **Phase 2: Frontend Integration** (Completed)
    -   [x] 5. Update Frontend API Call (Using state variable)
    -   [x] 6. Update Frontend Response Handling (Verified OK during testing)
    -   [x] 7. Update UI (Model Selector - Implemented & Styled)
-   [ ] **Phase 3: Refinement & Testing**
    -   [x] 8. Thorough Testing (Completed by user)
    -   [ ] 9. Refine Error Handling & Logging
    -   [ ] 10. Documentation Update (README)
    -   [ ] 11. Code Cleanup

## Executor's Feedback or Assistance Requests

*   Completed Phase 1 (Backend Gemini Integration via Vertex AI).
*   Completed Phase 2 (Frontend Integration, including Model Selector UI). User-uploaded images now display correctly. Added default text fallback for AI responses.
*   Task 8 Testing: User confirmed both Gemini and OpenAI endpoints work correctly via the UI, including multimodal for Gemini. Styling issues resolved. Console errors related to commented-out buttons resolved. Connection issues resolved (user confirmed backend was running).
*   Proceeding with remaining Phase 3 tasks.

## Lessons Learned

*   Include useful debugging info in program output (e.g., API endpoints, parameters).
*   Read files before editing (`read_file` tool).
*   Run `npm audit` if vulnerabilities appear.
*   Always ask before using `git push --force`.
*   The Google GenAI Node.js SDK (`@google/genai`) requires `new GoogleGenAI({ apiKey: ... })` or initialization via `new VertexAI({project:..., location:...})` when using Vertex AI and ADC. The latter automatically picks up ADC.
*   Specify `responseModalities: [Modality.TEXT, Modality.IMAGE]` in `generationConfig` for Gemini image output.
*   Check CSS specificity and existing styles (like padding/margin on dropdown buttons) when trying to match element appearances. Use browser dev tools.
*   **IMPORTANT:** For OpenAI image generation in this project, the correct model identifier to use in the API call is **`gpt-image-1`**, NOT `gpt-4o`. They are distinct models according to the user's requirements.

---
---

# Archived Projects

## Lilac AI Text-to-Image Chatbot - Implementation Plan (OpenAI `gpt-image-1` - Context List Flow + Quality Selector + i18n)

### Background and Motivation (Archived)

The user wanted to develop a functional chatbot application based on an existing UI prototype (HTML, CSS, TypeScript, visualized in `@texttoimageAIchatbotlilacaccent.png`). The core functionality involved leveraging the OpenAI `gpt-image-1` model to enable text-to-image and image-to-image generation within a chat interface. The goal was to create a locally runnable application suitable for open-sourcing on GitHub.

**Pivot (July 26, 2024):** Based on user feedback and OpenAI documentation confirming multi-image input for `images.edit`, the approach shifted from a complex "select base + upload secondary" flow to a simpler, more powerful "image context list" model. The application maintained a list of recent images (user-uploaded and AI-generated, up to 10). Each API request sent the current prompt and this image list to the backend, which used `images.edit` if images were present, or `images.generate` otherwise.

**Addendum (July 26, 2024):** User requested the ability to select image generation quality (low, medium, high, auto) via the UI to help manage API costs. User also requested a "How to use" button and resolution for WebSocket connection errors (identified as Vite HMR related).

**Addendum (July 27, 2024):** The user wanted to add a settings menu for language switching (English/German) with UI text translation.

### Key Challenges and Analysis (Archived)

*(Challenges specific to the OpenAI implementation)*
1.  API Key Security (OpenAI).
2.  OpenAI API Integration (`gpt-image-1`, `images.generate`, `images.edit`, `b64_json` format, array of image inputs for edit).
3.  Asynchronous Operations & UX (Loading states).
4.  Error Handling (OpenAI specific errors).
5.  State Management (`imageContextList`, `selectedQuality`).
6.  Backend Implementation (Node.js/Express/TypeScript).
7.  WebSocket Errors (Vite HMR).
8.  Internationalization (i18n - state, text abstraction, storage, updates).

### High-level Task Breakdown (Archived - OpenAI `gpt-image-1`)

*(Condensed list of completed phases for historical reference)*

-   **Phase 1: Backend Setup & API Proxy (OpenAI)** - *Completed*
-   **Phase 2: Frontend Integration (OpenAI)** - *Completed*
-   **Phase 3: Refinement & Full Functionality (OpenAI - Context List, Quality, UI Polish)** - *Completed*
-   **Phase 4: "How to Use" Button & Modal** - *Completed*
-   **Phase 5: Settings & Language Implementation (i18n)** - *Completed*

### Project Status Board (Archived - OpenAI `gpt-image-1`)

*(Final state before pivot)*
-   [x] All phases and tasks related to OpenAI integration, context list, quality selector, HowToUse modal, and i18n were completed.

### Executor's Feedback or Assistance Requests (Archived)

*(None outstanding for the archived project)*

### Lessons Learned (Archived)

-   Include info useful for debugging in the program output.
-   Read the file before you try to edit it.
-   If there are vulnerabilities that appear in the terminal, run npm audit before proceeding.
-   Always ask before using the -force git command.
-   OpenAI `images.edit` accepts an `image` parameter (the base image to edit) and an optional `mask`. It does *not* natively accept an array of context images in the same way some chat models do. The implemented workaround sent the list to the backend, which used the *most recent* image from the context list as the `image` parameter for `images.edit`.
-   `gpt-image-1` was the model used for OpenAI.
-   Vite HMR WebSocket errors can sometimes be ignored if HMR functionality is not critical during active development, but indicate an underlying issue with the dev server setup or network configuration.
-   Using `data-translate-key` attributes and a central translation object is a feasible approach for simple i18n in vanilla JS/TS projects.
