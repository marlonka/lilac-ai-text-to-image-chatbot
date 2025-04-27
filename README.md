# Lilac AI Text-to-Image Chatbot

A simple web-based chatbot interface for interacting with OpenAI's `gpt-image-1` model, allowing text-to-image generation and basic image editing based on prompts and context images.

## Features

*   **Text-to-Image Generation:** Generate images based on textual descriptions.
*   **Image Context:** Upload images or use previously generated images as context for subsequent prompts (image editing/variation). Maintains a list of up to 10 context images.
*   **Quality Selection:** Choose image generation quality (Auto, Low, Medium, High) via a dropdown.
*   **Image Preview:** Click generated thumbnails to view larger previews.
*   **Download:** Download generated images.
*   **How to Use Modal:** Provides basic usage instructions.
*   **Settings:** Access settings via the globe icon in the header.
*   **Language Switching:** Change UI language between English and German via the Settings modal.

## Screenshot

![Chatbot Screenshot](lilac_ai_text_to_image_chatbot_screenshot_v1.1.png)

## Setup

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm (usually comes with Node.js)
*   An OpenAI API key

### Configuration

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/marlonka/lilac-ai-text-to-image-chatbot.git
    cd lilac-ai-text-to-image-chatbot
    ```
2.  **Backend API Key:**
    *   Navigate to the `server` directory: `cd server`
    *   Create a file named `.env` in the `server` directory.
    *   Add your OpenAI API key to the `.env` file:
        ```dotenv
        OPENAI_API_KEY=your_openai_api_key_here
        PORT=3001
        ```
    *   **Important:** Ensure the `server/.env` file is listed in `server/.gitignore` (it should be by default) to prevent accidentally committing your API key.
    *   Go back to the root directory: `cd ..`

### Installation

1.  **Frontend Dependencies:** In the **root** project directory (`lilac-ai-text-to-image-chatbot`), install frontend dependencies:
    ```bash
    npm install
    ```
2.  **Backend Dependencies:** Navigate to the `server` directory and install backend dependencies:
    ```bash
    cd server
    npm install
    cd ..
    ```

## Running the Application

You need to run both the frontend (Vite dev server) and the backend (Node.js server) simultaneously.

1.  **Start the Backend Server:** Open a terminal in the **root** project directory and run:
    ```bash
    cd server
    npm run dev
    ```
    This will start the Node.js/Express server (usually on `http://localhost:3001`). It uses `ts-node-dev` for automatic restarts on code changes.

2.  **Start the Frontend Dev Server:** Open a *second* terminal in the **root** project directory and run:
    ```bash
    npm run dev
    ```
    This will start the Vite development server (usually on `http://localhost:5173`) and should automatically open the application in your browser.

## Usage

1.  Open the application in your browser (likely `http://localhost:5173`).
2.  **Enter a Prompt:** Type a description of the image you want in the text area at the bottom.
3.  **Upload Image (Optional):** Click "Upload Image" to select an image from your device. This image will be added to the context list and shown in a preview above the text area.
4.  **Image Context:** The pill next to "Upload Image" (e.g., "1 Image") shows how many images are in the context list (max 10). Clicking this pill clears the list.
5.  **Select Quality:** Use the "Quality: ..." dropdown to select the desired generation quality.
6.  **Send:** Click the send button (paper plane icon) or press Enter.
7.  **View Results:** The generated image and any accompanying text will appear in the chat.
8.  **Preview:** Click on any generated image thumbnail to see a larger version in the right-hand panel.
9.  **Download:** Use the "Download image" button below a generated image or the download icon in the preview panel.
10. **Settings:** Click the globe icon (🌐) in the header to open settings and change the language.
11. **New Chat:** Click the plus icon (+) in the header to clear the chat history, image context, and input fields.

## Known Limitations

*   Backend API currently does not implement streaming for responses.
*   Error handling can be further improved.
*   Image editing capabilities via the API are basic and depend on the prompt and context images provided.
*   Translation covers most UI elements but might miss edge cases or dynamically generated text from the API itself.
*   The action buttons in the preview panel ("Fix yellow tint", "Remove object", "Enhance details") are placeholders for future features and are currently commented out in the HTML.
