document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const imagePreviewColumn = document.getElementById('imagePreviewColumn') as HTMLDivElement | null;
    const previewImageLarge = document.getElementById('previewImageLarge') as HTMLImageElement | null;
    const closePreviewButton = document.getElementById('closePreviewButton') as HTMLButtonElement | null;
    const messageTextarea = document.getElementById('messageTextarea') as HTMLTextAreaElement | null;
    const sendButton = document.getElementById('sendButton') as HTMLButtonElement | null;
    const messageList = document.getElementById('messageList') as HTMLDivElement | null;
    const attachFileButton = document.getElementById('attachFileButton') as HTMLButtonElement | null;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
    const inputImagePreviewContainer = document.getElementById('inputImagePreviewContainer') as HTMLDivElement | null;
    const inputImagePreview = document.getElementById('inputImagePreview') as HTMLImageElement | null;
    const removeInputImagePreview = document.getElementById('removeInputImagePreview') as HTMLButtonElement | null;
    const loadingIndicator = document.getElementById('loadingIndicator') as HTMLDivElement | null;
    const imageContextCounter = document.getElementById('imageContextCounter') as HTMLButtonElement | null;
    const imageContextCounterText = imageContextCounter?.querySelector('.counter-text') as HTMLSpanElement | null;
    const customQualityDropdown = document.getElementById('customQualityDropdown') as HTMLDivElement | null;
    const qualityDropdownButton = document.getElementById('qualityDropdownButton') as HTMLButtonElement | null;
    const qualityDropdownLabel = document.getElementById('qualityDropdownLabel') as HTMLSpanElement | null;
    const qualityDropdownOptions = document.getElementById('qualityDropdownOptions') as HTMLDivElement | null;
    const inputControls = document.getElementById('inputControls');
    const controlsLeft = document.getElementById('controlsLeft');
    const controlsRight = document.getElementById('controlsRight');
    const howToUseButton = document.getElementById('howToUseButton');
    const newChatButton = document.getElementById('newChatButton');

    // Add references for modal elements
    const howToUseModalOverlay = document.getElementById('howToUseModalOverlay');
    const closeHowToUseModalButton = document.getElementById('closeHowToUseModal');

    // === Add Settings Modal Elements ===
    const settingsButton = document.getElementById('settingsButton');
    const settingsModalOverlay = document.getElementById('settingsModalOverlay');
    const closeSettingsModalButton = document.getElementById('closeSettingsModal');
    // ===================================

    // Type definition for the file object we store (for user upload preview)
    interface SelectedFile {
        name: string;
        dataUrl: string; // Assuming base64 data URL
    }

    // --- State Variables ---
    let selectedFile: SelectedFile | null = null;
    const imageContextList: string[] = [];
    const MAX_CONTEXT_IMAGES = 10; // Define the maximum number of images in context
    let currentPreviewImageUrl: string | null = null;
    type ImageQuality = 'auto' | 'low' | 'medium' | 'high';
    let selectedQuality: ImageQuality = 'auto'; // Default quality
    let currentLanguage = 'en'; // Default language

    // --- Translation Store ---
    const translations: { [lang: string]: { [key: string]: string } } = {
        en: {
            // Header
            settingsAriaLabel: "Settings",
            newChatAriaLabel: "Start new chat",
            // Settings Modal
            settingsTitle: "Settings",
            languageLabel: "Language:",
            // Input Area
            inputPlaceholder: "Describe the image you want to create or edit...",
            uploadButton: "Upload Image",
            qualityLabelPrefix: "Quality: ", // Prefix for quality labels
            howToUseButton: "How to use",
            sendAriaLabel: "Send message",
            // How To Use Modal
            howToUseTitle: "How to Use",
            // === NEW: How to Use Modal Content ===
            howToUse_intro: "Here's a quick guide to generating images:",
            howToUse_prompt_li: "<strong>Prompt:</strong> Type what you want to see in the text box. Be descriptive!",
            howToUse_upload_li: "<strong>Upload (Optional):</strong> Click \"Upload Image\" to provide context for editing or inspiration. The uploaded image will appear above the text box and be added to the context list.",
            howToUse_context_li: "<strong>Context:</strong> The number next to \"Upload Image\" shows how many images (uploaded or previously generated) will be sent with your next prompt (max 10). Click this number pill to clear the context.",
            howToUse_quality_li: "<strong>Quality:</strong> Select the desired image quality (Low, Medium, High, or Auto). Lower quality is faster.",
            howToUse_model_li: "<strong>Model:</strong> Shows the AI model being used (currently gpt-image-1).",
            howToUse_send_li: "<strong>Send:</strong> Click the paper plane button or press Enter to generate your image.",
            howToUse_preview_li: "<strong>Preview:</strong> Click any generated image thumbnail in the chat to see a larger version on the right.",
            howToUse_download_li: "<strong>Download:</strong> Click the \"Download image\" button below a generated image, or the download icon in the preview panel.",
            howToUse_newChat_li: "<strong>New Chat:</strong> Click the \"+\" button in the top-left corner to clear the chat, context, and input.",
            // === NEW Translations ===
            imageContextTooltip: "Click to clear image context",
            previewDownloadAriaLabel: "Download large image",
            previewCloseAriaLabel: "Close image preview",
            aiMessageSubInfo: "Image AI generated",
            aiMessageDownloadBtn: "Download image",
            // === NEW: Preview Footer Buttons ===
            previewAction_fixTint: "Fix yellow tint",
            previewAction_upscale: "Upscale",
            previewAction_createVideo: "Create video",
            // === NEW: Image Context Counter ===
            imageContextCounter_singular: "Image",
            imageContextCounter_plural: "Images",
            // =================================
            // ======================================
        },
        de: {
            // Header
            settingsAriaLabel: "Einstellungen",
            newChatAriaLabel: "Neuen Chat starten",
            // Settings Modal
            settingsTitle: "Einstellungen",
            languageLabel: "Sprache:",
            // Input Area
            inputPlaceholder: "Beschreiben Sie das Bild, das Sie erstellen oder bearbeiten möchten...",
            uploadButton: "Bild hochladen",
            qualityLabelPrefix: "Qualität: ", // Keep or change prefix if needed in German
            howToUseButton: "Anleitung",
            sendAriaLabel: "Nachricht senden",
            // How To Use Modal
            howToUseTitle: "Anleitung",
            // === NEW: How to Use Modal Content (German) ===
            howToUse_intro: "Hier ist eine Kurzanleitung zum Generieren von Bildern:",
            howToUse_prompt_li: "<strong>Eingabeaufforderung:</strong> Geben Sie in das Textfeld ein, was Sie sehen möchten. Seien Sie beschreibend!",
            howToUse_upload_li: "<strong>Hochladen (Optional):</strong> Klicken Sie auf \"Bild hochladen\", um Kontext für die Bearbeitung oder Inspiration bereitzustellen. Das hochgeladene Bild erscheint über dem Textfeld und wird zur Kontextliste hinzugefügt.",
            howToUse_context_li: "<strong>Kontext:</strong> Die Zahl neben \"Bild hochladen\" zeigt an, wie viele Bilder (hochgeladene oder zuvor generierte) mit Ihrer nächsten Eingabeaufforderung gesendet werden (max. 10). Klicken Sie auf diese Zahl, um den Kontext zu löschen.",
            howToUse_quality_li: "<strong>Qualität:</strong> Wählen Sie die gewünschte Bildqualität (Niedrig, Mittel, Hoch oder Auto). Niedrigere Qualität ist schneller.",
            howToUse_model_li: "<strong>Modell:</strong> Zeigt das verwendete KI-Modell (derzeit gpt-image-1).",
            howToUse_send_li: "<strong>Senden:</strong> Klicken Sie auf die Schaltfläche mit dem Papierflieger oder drücken Sie die Eingabetaste, um Ihr Bild zu generieren.",
            howToUse_preview_li: "<strong>Vorschau:</strong> Klicken Sie auf ein generiertes Bild-Miniaturbild im Chat, um eine größere Version auf der rechten Seite anzuzeigen.",
            howToUse_download_li: "<strong>Herunterladen:</strong> Klicken Sie auf die Schaltfläche \"Bild herunterladen\" unter einem generierten Bild oder auf das Download-Symbol im Vorschaufenster.",
            howToUse_newChat_li: "<strong>Neuer Chat:</strong> Klicken Sie auf die \"+\"-Schaltfläche oben links, um den Chat, den Kontext und die Eingabe zu löschen.",
            // === NEW Translations (German) ===
            imageContextTooltip: "Klicken, um den Bildkontext zu löschen",
            previewDownloadAriaLabel: "Großes Bild herunterladen",
            previewCloseAriaLabel: "Bildvorschau schließen",
            aiMessageSubInfo: "Bild von KI generiert",
            aiMessageDownloadBtn: "Bild herunterladen",
            // === NEW: Preview Footer Buttons (German) ===
            previewAction_fixTint: "Gelbstich beheben",
            previewAction_upscale: "Hochskalieren",
            previewAction_createVideo: "Video erstellen",
            // === NEW: Image Context Counter (German) ===
            imageContextCounter_singular: "Bild",
            imageContextCounter_plural: "Bilder",
            // ========================================
            // =============================================
        }
    };
    // ==========================

    // --- Helper Function to Add Image to Context List ---
    function addImageToContext(imageUrl: string | null) {
        if (!imageUrl) {
            console.warn("Attempted to add null/empty image URL to context.");
            return;
        }

        // Add the new image URL to the end of the list
        imageContextList.push(imageUrl);
        console.log(`➕ Added image to context. Current length: ${imageContextList.length}`);
        // Optional: Log the added URL's start/end for debugging
        // console.log(`   Added: ${imageUrl.substring(0, 30)}...${imageUrl.slice(-10)}`);


        // Enforce the maximum limit (FIFO - First-In, First-Out)
        if (imageContextList.length > MAX_CONTEXT_IMAGES) {
            // Remove the oldest image (from the beginning of the array)
            const removedUrl = imageContextList.shift();
            console.log(`-- Context limit reached (${MAX_CONTEXT_IMAGES}). Removed oldest image.`);
            // Optional: Log the removed URL's start/end for debugging
            // console.log(`   Removed: ${removedUrl?.substring(0, 30)}...${removedUrl?.slice(-10)}`);
        }

        // Update the UI counter display
        updateImageContextUI();
    }

    // --- Function to Update Image Context Counter UI ---
    // Add optional parameter 'langPackToUse'
    function updateImageContextUI(langPackToUse?: { [key: string]: string }) {
        if (!imageContextCounter || !imageContextCounterText) {
            console.warn("Image context counter elements not found, UI cannot be updated.");
            return;
        }

        // Use the provided langPack, OR look it up based on the global currentLanguage
        const langPack = langPackToUse || translations[currentLanguage] || translations['en'];
        const count = imageContextList.length;

        if (count === 0) {
            imageContextCounter.classList.add('hidden');
        } else {
            // Use translated singular/plural strings from the determined langPack
            const imageText = count === 1 ? langPack.imageContextCounter_singular : langPack.imageContextCounter_plural;
            imageContextCounterText.textContent = `${count} ${imageText}`; // Construct the text using translated term
            imageContextCounter.classList.remove('hidden');
        }
        // Log which language pack was effectively used (either passed in or looked up)
        const effectiveLang = Object.keys(translations).find(key => translations[key] === langPack) || 'en (fallback)';
        console.log(`🖼️ Image Context UI updated. Count: ${count}, Lang: ${effectiveLang}`);
    }

    // --- Function to clear the input preview area ---
    function clearInputPreview() {
        if (inputImagePreview) inputImagePreview.src = '#'; // Clear src
        inputImagePreviewContainer?.classList.add('hidden'); // Hide container
        selectedFile = null; // Clear stored file data
        checkSendButtonState(); // Update send button state
    }

    // --- Function to enable/disable send button ---
    function checkSendButtonState() {
        if (!messageTextarea || !sendButton) return;
        const hasText = messageTextarea.value.trim() !== '';
        // Enable if there's text OR a file selected for upload (even if context has images)
        const hasImageSelected = selectedFile !== null;
        sendButton.disabled = !(hasText || hasImageSelected);
    }

    // --- DEFINE adjustTextareaHeight HERE ---
    const adjustTextareaHeight = () => {
        if (!messageTextarea) return;
        messageTextarea.style.height = 'auto';
        const maxHeight = parseInt(window.getComputedStyle(messageTextarea).maxHeight, 10);
        const scrollHeight = messageTextarea.scrollHeight;
        const newHeight = Math.min(scrollHeight, maxHeight || Infinity);
        messageTextarea.style.height = `${newHeight}px`;
    };

    // --- Setup Listeners that USE adjustTextareaHeight ---
    if (messageTextarea && sendButton) {
        messageTextarea.addEventListener('input', () => {
            adjustTextareaHeight();
            checkSendButtonState();
        });
        adjustTextareaHeight(); // Initial check
    }

    // --- Simplified File Upload Trigger ---
    if (attachFileButton && fileInput) {
        attachFileButton.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // --- File Input Handling (ADD image to context here) ---
    if (fileInput && inputImagePreviewContainer && inputImagePreview && removeInputImagePreview) {
        fileInput.addEventListener('change', (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e: ProgressEvent<FileReader>) => {
                    const result = e.target?.result as string | null;
                    if (result) {
                        // Store the uploaded file temporarily for preview and sending
                            console.log("Received primary image upload:", file.name);
                            if (inputImagePreview) {
                                inputImagePreview.src = result; // Show preview
                            }
                            inputImagePreviewContainer?.classList.remove('hidden');
                        selectedFile = { name: file.name, dataUrl: result }; // Store file data for send

                        // --- Add user uploaded image to context list HERE ---
                        addImageToContext(result);

                            checkSendButtonState(); // Update send button state
                    }
                }
                reader.readAsDataURL(file);
            }
            if (target) target.value = ''; // Reset input
        });

        removeInputImagePreview.addEventListener('click', () => {
            // Note: Removing preview doesn't remove from context list automatically.
            // Context is cleared via the counter button.
            clearInputPreview();
            checkSendButtonState();
        });
    }

    // --- Send Message Logic Setup ---
    if (sendButton && messageList && loadingIndicator && messageTextarea) {
        sendButton.addEventListener('click', sendMessage);
        messageTextarea.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // --- Send Message Function (Add quality to payload) ---
    async function sendMessage() {
        if (!messageTextarea || !messageList || !loadingIndicator || !sendButton) return; // Guard clause

        const text = messageTextarea.value.trim();
        const userUpload = selectedFile;

        if (!text && !userUpload) {
            console.log("Nothing to send (no text, no *new* user image selected).");
            return;
        }

        // 1. Create and display the user's message
        const userDisplayImageUrl = userUpload ? userUpload.dataUrl : null;
        const userMsgElement = createMessageElement('user', text, userDisplayImageUrl);
        messageList.insertBefore(userMsgElement, loadingIndicator);

        // 2. Clear the input field(s) and reset state
        const currentPrompt = text;
        const currentContext = [...imageContextList];
        // --- Get current quality state ---
        const currentQuality = selectedQuality; // Capture selected quality
        messageTextarea.value = '';
        clearInputPreview();
        messageTextarea.style.height = 'auto';
        sendButton.disabled = true;

        // 3. Show the loading indicator
        loadingIndicator.classList.remove('hidden');
        scrollToBottom();

        // --- 4. Call the backend API ---
        try {
            // --- Construct payload including quality ---
            // Define the type including the optional quality
            const bodyPayload: {
                 prompt: string;
                 imageContextUrls?: string[];
                 quality?: ImageQuality // Add quality field
            } = {
                prompt: currentPrompt,
                imageContextUrls: currentContext.length > 0 ? currentContext : undefined,
                quality: currentQuality // Add the captured quality
            };

            console.log(`🚀 Sending to backend:`, bodyPayload); // Log the full payload including quality

            const response = await fetch('http://localhost:3001/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyPayload),
            });

            console.log("📥 Received response status:", response.status);

            if (!response.ok) {
                let errorMsg = `Error from server: ${response.status} ${response.statusText}`;
                try { const errorData = await response.json(); if (errorData && errorData.message) { errorMsg = `Error: ${errorData.message}`; } } catch (jsonError) { /* Ignore */ }
                throw new Error(errorMsg);
            }

            const responseData = await response.json();
            console.log("✅ Backend Response Data:", { success: responseData.success, text: responseData.text, imageReceived: !!responseData.image });

            if (responseData.success && responseData.image) {
                const imageUrl = `data:image/png;base64,${responseData.image}`;
                const aiText = responseData.text || "Here is the generated image:";
                const aiMsgElement = createMessageElement('ai', aiText, imageUrl);
                messageList.insertBefore(aiMsgElement, loadingIndicator);
                addImageToContext(imageUrl);
                scrollToBottom();
            } else {
                const errorMsg = responseData.message || 'The backend failed to process the request.';
                console.error("🔴 Backend reported failure:", errorMsg);
                const errorMsgElement = createErrorMessageElement(`Oops! ${errorMsg}`);
                messageList.insertBefore(errorMsgElement, loadingIndicator);
                scrollToBottom();
            }

        } catch (error) {
            console.error("🔴 Frontend Error sending message:", error);
            const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred while contacting the server.';
            const errorMsgElement = createErrorMessageElement(`Network Error: ${errorMsg}`);
            messageList.insertBefore(errorMsgElement, loadingIndicator);
            scrollToBottom();

        } finally {
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            scrollToBottom();
        }
    }

    // --- Helper Function to Create ERROR Message HTML ---
    function createErrorMessageElement(errorMessage: string): HTMLDivElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper ai-message error-message';
        const textHtml = `<div class="message-bubble error-bubble"><div>⚠️ ${errorMessage}</div></div>`;
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const metaHtml = `<div class="message-meta"><span>${timeString}</span></div>`;
        wrapper.innerHTML = `<div class="message-content-wrapper">${textHtml}</div>${metaHtml}`;
        return wrapper;
    }

    // --- Helper Function to Create Message HTML (Action buttons removed, download logic separated) ---
    function createMessageElement(type: 'user' | 'ai', text: string | null, imageUrl: string | null): HTMLDivElement {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${type}-message`;

        // Store image URL in dataset for AI messages (needed for download)
        if (type === 'ai' && imageUrl) {
            wrapper.dataset.imageUrl = imageUrl;
        }

        // --- Image HTML ---
        let imageHtml = '';
        if (imageUrl) {
             // Add dataset only for AI images to make them clickable for preview
            const datasetAttr = type === 'ai' ? `data-large-src="${imageUrl}"` : '';
            const interactiveClass = type === 'ai' ? 'interactive-thumbnail' : '';
            imageHtml = `
                <div class="message-media">
                    <div class="image-thumbnail-container ${interactiveClass}" ${datasetAttr}>
                        <img src="${imageUrl}" alt="${type} image" class="image-thumbnail">
                    </div>
                </div>
            `;
        }

        // --- Text HTML ---
        let textHtml = '';
        if (text) {
            textHtml = `<div class="message-bubble ${type}-bubble"><div>${text.replace(/\n/g, '<br>')}</div></div>`;
        }

        // --- AI Specific Elements ---
        let aiSubInfoHtml = '';
        let aiDownloadButtonHtml = ''; // Renamed from aiActionsHtml
        if (type === 'ai' && imageUrl) { // Only show sub-info and download for AI *generated* images
             aiSubInfoHtml = `
                <div class="message-sub-info">
                    <svg class="icon size-3"><use xlink:href="#icon-images"></use></svg>
                    <span>Image AI generated</span>
                </div>
             `;
             // --- ADD Download button HTML back ---
             aiDownloadButtonHtml = `
                <div class="ai-action-buttons">
                     <button class="btn-action-pill message-download-button" aria-label="Download image">
                         <svg class="icon size-4"><use xlink:href="#icon-download"></use></svg>
                         Download image
                     </button>
                </div>
             `;
        }

        // --- Meta Info (Timestamp Only) ---
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const metaHtml = `<div class="message-meta"><span>${timeString}</span></div>`;

        // Assemble the final message HTML (Using aiDownloadButtonHtml)
        wrapper.innerHTML = `
            <div class="message-content-wrapper">
                ${textHtml}
                ${aiSubInfoHtml}
                ${imageHtml}
            </div>
            ${aiDownloadButtonHtml}
            ${metaHtml}
        `;
        return wrapper;
    }

     // --- Scroll to Bottom Utility ---
    function scrollToBottom() {
        requestAnimationFrame(() => {
            if (messageList) {
                messageList.scrollTop = messageList.scrollHeight;
            }
        });
    }

    // --- Image Preview Logic (Large View Panel) ---
    if (imagePreviewColumn && previewImageLarge && closePreviewButton && messageList) {

        // Get the download button *within* the preview column header
        const previewHeaderDownloadButton = imagePreviewColumn.querySelector('.preview-header button[aria-label="Download large image"]') as HTMLButtonElement | null;

        if (!previewHeaderDownloadButton) {
             console.error("Could not find the download button within the preview header!");
             // We can still proceed with preview functionality if download is missing,
             // but log the error. Preview download will just be broken.
        }

        const showPreview = (largeImageUrl: string | null | undefined) => {
            // Check only essential elements for showing
            if (!largeImageUrl || !previewImageLarge || !imagePreviewColumn) return;
            previewImageLarge.src = largeImageUrl;
            currentPreviewImageUrl = largeImageUrl; // Store for download button
            // Set download attributes on the *actual button* if found, or handle elsewhere
            if (previewHeaderDownloadButton) {
                 // Buttons don't have href/download, store data needed for click handler
                 previewHeaderDownloadButton.dataset.downloadUrl = largeImageUrl;
                 previewHeaderDownloadButton.dataset.downloadFilename = generateFilename();
            }
            imagePreviewColumn.classList.remove('hidden');
        };

        const hidePreview = () => {
            if (!imagePreviewColumn || !previewImageLarge) return;
            imagePreviewColumn.classList.add('hidden');
            previewImageLarge.src = "";
            currentPreviewImageUrl = null; // Clear stored URL
            // Clear download button data if it exists
            if (previewHeaderDownloadButton) {
                delete previewHeaderDownloadButton.dataset.downloadUrl;
                delete previewHeaderDownloadButton.dataset.downloadFilename;
            }
        };

        // --- Consolidated Event Listener for Message List ---
        messageList.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // --- Handle AI Thumbnail Clicks for Preview ---
            const thumbnailContainer = target.closest('.interactive-thumbnail') as HTMLElement | null;
            if (thumbnailContainer) {
                 const largeSrc = thumbnailContainer.dataset.largeSrc;
                 if (largeSrc) {
                    showPreview(largeSrc);
                 } else { console.error("No large source found for preview."); }
                 return; // Stop processing click if preview shown
            }

            // --- Handle Download Button Click WITHIN a message ---
            const downloadButton = target.closest('.message-download-button');
            if (downloadButton) {
                const messageWrapper = downloadButton.closest('.message-wrapper.ai-message') as HTMLElement | null;
                const imageUrl = messageWrapper?.dataset.imageUrl;
                if (imageUrl) {
                    console.log("Message download button clicked.");
                    downloadImage(imageUrl, generateFilename());
                } else { console.error("Cannot find image URL in message dataset to download."); }
                return; // Stop processing click if download initiated
            }

        });

        // --- Add Listener for Preview Header Download Button ---
        if (previewHeaderDownloadButton) {
            previewHeaderDownloadButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent closing panel if click bubbles
                const url = previewHeaderDownloadButton.dataset.downloadUrl;
                const filename = previewHeaderDownloadButton.dataset.downloadFilename;
                if (url && filename) {
                    console.log(`Preview header download clicked for: ${filename}`);
                    downloadImage(url, filename);
                } else {
                    console.error("Couldn't find download URL/filename on button dataset.");
                    alert('Error: Could not find preview image source to download.');
                }
            });
        }
        // else {
        //     console.warn("Preview download button not found, download functionality will be unavailable.");
        // }


        // Close button listener for the right panel
        if (closePreviewButton) {
        closePreviewButton.addEventListener('click', hidePreview);
        }

    } else {
        // This error should now only trigger if core elements like imagePreviewColumn, previewImageLarge, closePreviewButton, or messageList are missing
        console.error('Core elements for image preview or message list functionality not found!');
    }

    // --- Helper Function to Generate Filename ---
    function generateFilename(): string {
        const prefix = 'ai-image';
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}.png`;
    }

    // --- Helper Function to Trigger Image Download ---
    function downloadImage(url: string, filename: string) {
        if (!url.startsWith('data:image')) {
            console.error('Download attempt for non-data URL:', url);
            alert('Error: Cannot download this image type.');
            return;
        }
        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log(`Download triggered for: ${filename}`);
        } catch (error) {
            console.error('Error triggering download:', error);
            alert('An error occurred while trying to download the image.');
        }
    }

    // --- Initial UI Setup & Event Listeners ---
    updateImageContextUI(); // Call initially to set the hidden state
    if (messageTextarea) { // Check if textarea exists before adjusting
        adjustTextareaHeight(); // Initial height check for textarea
    }

    // --- Listener for the image context counter reset ---
    if (imageContextCounter) {
        imageContextCounter.addEventListener('click', () => {
            console.log("🔄 Resetting image context list.");
            imageContextList.length = 0;
            updateImageContextUI();
        });
    } else {
        console.warn("Image context counter element not found, cannot attach reset listener.");
    }

    // --- NEW: Custom Quality Dropdown Logic ---
    if (customQualityDropdown && qualityDropdownButton && qualityDropdownLabel && qualityDropdownOptions) {

        // 1. Toggle Dropdown Visibility
        qualityDropdownButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent the document click listener from immediately closing it
            customQualityDropdown.classList.toggle('open');
            // Optional: Add ARIA attribute for accessibility
            const isOpen = customQualityDropdown.classList.contains('open');
            qualityDropdownButton.setAttribute('aria-expanded', String(isOpen));
            if (isOpen) {
                qualityDropdownOptions.classList.remove('hidden'); // Ensure display:block/flex is set before transition starts
            } else {
                 // Listen for transition end to set display: none (or use visibility directly)
                 // For simplicity with visibility transition, the CSS handles hiding.
            }
        });

        // 2. Handle Option Selection (using event delegation)
        qualityDropdownOptions.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const option = target.closest('.custom-dropdown-option') as HTMLDivElement | null;

            if (option) {
                const newValue = option.dataset.value as ImageQuality | undefined;
                const newLabel = option.textContent || 'Quality: Auto';

                if (newValue && ['auto', 'low', 'medium', 'high'].includes(newValue)) {
                    selectedQuality = newValue;
                    qualityDropdownLabel.textContent = newLabel; // Update button text
                    console.log(`⚙️ Quality selection changed to: ${selectedQuality}`);

                    // Optional: Add 'selected' class for styling (remove from others)
                    // qualityDropdownOptions.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('selected'));
                    // option.classList.add('selected');

                } else {
                    console.warn(`Invalid quality value selected: ${newValue}`);
                }

                customQualityDropdown.classList.remove('open'); // Close dropdown
                qualityDropdownButton.setAttribute('aria-expanded', 'false');
            }
        });

        // 3. Close Dropdown on Outside Click
        document.addEventListener('click', (event) => {
            if (!customQualityDropdown.contains(event.target as Node)) {
                // Clicked outside the dropdown
                if (customQualityDropdown.classList.contains('open')) {
                    customQualityDropdown.classList.remove('open');
                    qualityDropdownButton.setAttribute('aria-expanded', 'false');
                }
            }
        });

        // 4. Close Dropdown on Escape key
        document.addEventListener('keydown', (event) => {
             if (event.key === 'Escape' && customQualityDropdown.classList.contains('open')) {
                 customQualityDropdown.classList.remove('open');
                 qualityDropdownButton.setAttribute('aria-expanded', 'false');
             }
        });

    } else {
        console.warn("Custom quality dropdown elements not found, cannot attach listeners.");
    }

    // --- Event Listener for How To Use Button (MODIFIED) ---
    if (howToUseButton && howToUseModalOverlay) { // Check for modal overlay too
        console.log("✅ 'How to use' button FOUND in the DOM.");
        howToUseButton.addEventListener('click', () => {
            console.log('How to use button clicked - showing modal');
            howToUseModalOverlay.classList.add('open'); // Show the modal
            howToUseModalOverlay.classList.remove('hidden'); // REMOVE the hidden class
        });
    } else {
        console.error("🔴 'How to use' button (id='howToUseButton') or its modal overlay NOT FOUND!");
    }

    // --- Listener to Close the Modal ---
    function closeModal() {
        if (howToUseModalOverlay) {
            howToUseModalOverlay.classList.remove('open');
            howToUseModalOverlay.classList.add('hidden'); // Add hidden back when closing
            console.log('Modal closed');
        }
    }

    // Close via the 'X' button
    if (closeHowToUseModalButton) {
        closeHowToUseModalButton.addEventListener('click', closeModal);
    }

    // Close by clicking the overlay background
    if (howToUseModalOverlay) {
        howToUseModalOverlay.addEventListener('click', (event) => {
            // Only close if the click is directly on the overlay, not the content inside
            if (event.target === howToUseModalOverlay) {
                closeModal();
            }
        });
    }

    // Close via Escape key (Add this listener if not already present for quality dropdown)
    // Check if an Escape listener already exists to avoid duplicates
    let escapeListenerExists = false; // You might need a better way to track this if complex
    if (!escapeListenerExists) {
         document.addEventListener('keydown', (event) => {
             if (event.key === 'Escape') {
                // Close quality dropdown if open
                if (customQualityDropdown && customQualityDropdown.classList.contains('open')) {
                    customQualityDropdown.classList.remove('open');
                    if (qualityDropdownButton) qualityDropdownButton.setAttribute('aria-expanded', 'false');
                }
                // Close HowToUse modal if open
                if (howToUseModalOverlay && howToUseModalOverlay.classList.contains('open')) {
                    closeModal();
                }
             }
        });
        escapeListenerExists = true;
    }

    // --- Event Listener for New Chat / Reset Button ---
    if (newChatButton && messageList && messageTextarea /* && other needed elements/functions */ ) {
        console.log("✅ 'New Chat' button FOUND in the DOM.");
        newChatButton.addEventListener('click', () => {
            console.log("🔄 Resetting chat and context...");

            // 1. Clear Image Context
            imageContextList.length = 0;
            updateImageContextUI(); // Update the counter pill

            // 2. Clear Input Area Preview
            clearInputPreview(); // Use existing helper

            // 3. Clear Text Area
            messageTextarea.value = '';
            adjustTextareaHeight(); // Reset height

            // 4. Clear Chat Messages (Carefully, keep loading indicator if it's a child)
            // Remove all children EXCEPT the loading indicator
            const loadingIndicator = document.getElementById('loadingIndicator');
            while (messageList.firstChild && messageList.firstChild !== loadingIndicator) {
                messageList.removeChild(messageList.firstChild);
            }
            // OR if loading indicator is NOT a child: messageList.innerHTML = '';

            // 5. Hide Image Preview Panel
            // Make sure hidePreview is defined or accessible here
            // hidePreview(); // Assuming hidePreview function exists and works

            // 6. Update Send Button State
            checkSendButtonState();

            console.log("✅ Chat reset complete.");
            // Maybe add a subtle visual confirmation if desired
        });
    } else {
        console.error("🔴 'New Chat' button (id='newChatButton') or other essential elements NOT FOUND!");
    }

    // === Settings Modal Logic ===
    if (settingsButton && settingsModalOverlay) {
        console.log("✅ Settings button and modal overlay FOUND...");

        settingsButton.addEventListener('click', () => {
            console.log("Settings button clicked - showing modal");
            settingsModalOverlay.classList.remove('hidden'); // Make sure it's not display: none
            settingsModalOverlay.classList.add('open');     // Trigger the open animation/styles
        });

        if (closeSettingsModalButton) {
            closeSettingsModalButton.addEventListener('click', () => {
                console.log("Settings modal CLOSE button clicked");
                settingsModalOverlay.classList.remove('open');
                // Optional: Add hidden back if needed, depends on CSS transitions
                // settingsModalOverlay.classList.add('hidden');
            });
        } else {
            console.error("🔴 Settings modal CLOSE button (id='closeSettingsModal') NOT FOUND!");
        }

        // Close modal if clicking on the overlay background
        settingsModalOverlay.addEventListener('click', (event) => {
            if (event.target === settingsModalOverlay) { // Only trigger if the click is directly on the overlay
                 console.log("Settings modal OVERLAY clicked - closing modal");
                settingsModalOverlay.classList.remove('open');
                // Optional: Add hidden back
                // settingsModalOverlay.classList.add('hidden');
            }
        });

        // === Language Selection Logic ===
        const languageOptionsContainer = settingsModalOverlay.querySelector('.settings-options');
        if (languageOptionsContainer) {
            languageOptionsContainer.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;
                const langButton = target.closest('.language-option') as HTMLButtonElement | null;

                if (langButton) {
                    const newLang = langButton.dataset.lang;
                    if (newLang && translations[newLang]) {
                        updateUIText(newLang);
                        // Optional: Highlight active button
                        languageOptionsContainer.querySelectorAll('.language-option').forEach(btn => btn.classList.remove('active')); // You'll need to define .active CSS
                        langButton.classList.add('active');
                        // Maybe close the modal after selection?
                        // settingsModalOverlay.classList.remove('open');
                    } else {
                        console.warn(`Invalid or unsupported language selected: ${newLang}`);
                    }
                }
            });
        } else {
            console.error("🔴 Language options container (.settings-options) NOT FOUND!");
        }
        // === End Language Selection Logic ===

    } else {
        if (!settingsButton) console.error("🔴 Settings button (id='settingsButton') NOT FOUND!");
        if (!settingsModalOverlay) console.error("🔴 Settings modal overlay (id='settingsModalOverlay') NOT FOUND!");
    }
    // === End Settings Modal Logic ===

    // --- Function to Update UI based on Language ---
    function updateUIText(lang: string) {
        const langPack = translations[lang] || translations['en']; // Fallback to English
        console.log(`🔄 Updating UI text to: ${lang}`);
        currentLanguage = lang; // Set current language *first*

        // Update elements using their IDs or specific selectors
        const settingsBtn = document.getElementById('settingsButton');
        if (settingsBtn) settingsBtn.setAttribute('aria-label', langPack.settingsAriaLabel);

        const newChatBtn = document.getElementById('newChatButton');
        if (newChatBtn) newChatBtn.setAttribute('aria-label', langPack.newChatAriaLabel);

        const settingsModalTitle = settingsModalOverlay?.querySelector('h2');
        if (settingsModalTitle) settingsModalTitle.textContent = langPack.settingsTitle;

        const settingsLangLabel = settingsModalOverlay?.querySelector('.settings-label');
        if (settingsLangLabel) settingsLangLabel.textContent = langPack.languageLabel;

        const messageInput = document.getElementById('messageTextarea') as HTMLTextAreaElement | null;
        if (messageInput) messageInput.placeholder = langPack.inputPlaceholder;

        const uploadBtn = document.getElementById('attachFileButton');
        if (uploadBtn) uploadBtn.textContent = langPack.uploadButton; // Simple text replacement

        const howToUseBtn = document.getElementById('howToUseButton');
         if (howToUseBtn) {
             // Find the text node directly within the button to avoid replacing the SVG
             const textNode = Array.from(howToUseBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
             if (textNode) {
                 textNode.textContent = ` ${langPack.howToUseButton}`; // Keep leading space
             } else {
                 // Fallback if structure changes - might overwrite SVG!
                 // howToUseBtn.textContent = langPack.howToUseButton;
                 console.warn("Could not find text node in 'How to Use' button for translation.");
             }
        }


        const sendBtn = document.getElementById('sendButton');
        if (sendBtn) sendBtn.setAttribute('aria-label', langPack.sendAriaLabel);

        // Update Quality Dropdown Button Text (Handle prefix)
        const qualityBtnLabel = document.getElementById('qualityDropdownLabel');
        if (qualityBtnLabel && qualityBtnLabel.textContent) {
            const currentQualityValue = qualityBtnLabel.textContent.split(': ')[1] || 'Auto'; // Get current value like "Auto"
             // Only update if the label starts with a known prefix (prevents re-translation on quality change)
             const knownPrefix = translations['en'].qualityLabelPrefix; // Use English as reference
             if (qualityBtnLabel.textContent.startsWith(knownPrefix)) {
                 qualityBtnLabel.textContent = `${langPack.qualityLabelPrefix}${currentQualityValue}`;
             } else {
                // If it doesn't start with the expected prefix, it might already be translated.
                // We could try finding the *value* part and re-prefixing, but it gets complex.
                // For now, let's assume it gets updated correctly when quality changes later.
                console.log("Quality label doesn't start with expected prefix, skipping re-translation for now.");
             }
        }


        // Update How To Use Modal Title
        const howToUseModalTitle = howToUseModalOverlay?.querySelector('h2');
        if (howToUseModalTitle) howToUseModalTitle.textContent = langPack.howToUseTitle;

        // === Update How to Use Modal Content ===
        const howToUseContent = document.getElementById('howToUseModalContent');
        if (howToUseContent) {
            const introP = howToUseContent.querySelector('p');
            if (introP) introP.textContent = langPack.howToUse_intro;

            const listItems = howToUseContent.querySelectorAll('ul li');
            if (listItems.length >= 9) { // Check if we found enough list items
                listItems[0].innerHTML = langPack.howToUse_prompt_li;
                listItems[1].innerHTML = langPack.howToUse_upload_li;
                listItems[2].innerHTML = langPack.howToUse_context_li;
                listItems[3].innerHTML = langPack.howToUse_quality_li;
                listItems[4].innerHTML = langPack.howToUse_model_li;
                listItems[5].innerHTML = langPack.howToUse_send_li;
                listItems[6].innerHTML = langPack.howToUse_preview_li;
                listItems[7].innerHTML = langPack.howToUse_download_li;
                listItems[8].innerHTML = langPack.howToUse_newChat_li;
            } else {
                console.warn("Could not find all expected list items in 'How to Use' modal for translation.");
            }
        }
        // ======================================

        // === NEW Element Updates ===

        // Image Context Counter Tooltip
        const imgContextCounter = document.getElementById('imageContextCounter');
        if (imgContextCounter) imgContextCounter.title = langPack.imageContextTooltip;

        // Image Preview Header Buttons (Aria Labels)
        const previewHeader = document.querySelector('.preview-header');
        if (previewHeader) {
            const downloadBtn = previewHeader.querySelector('button[aria-label*="Download"]'); // Find based on partial label
            if (downloadBtn) downloadBtn.setAttribute('aria-label', langPack.previewDownloadAriaLabel);

            const closeBtn = previewHeader.querySelector('#closePreviewButton'); // Use ID if available
            if (closeBtn) closeBtn.setAttribute('aria-label', langPack.previewCloseAriaLabel);
        }

        // --- Update Existing AI Message Elements ---
        // This will only affect messages already on the screen when language changes.
        // New messages will be created with the language active *at that time*.
        // A better approach involves translating during message creation.
        const existingAiMessages = messageList?.querySelectorAll('.message-wrapper.ai-message');
        if (existingAiMessages) {
            existingAiMessages.forEach(msg => {
                const subInfoSpan = msg.querySelector('.message-sub-info span');
                if (subInfoSpan) subInfoSpan.textContent = langPack.aiMessageSubInfo;

                const downloadBtn = msg.querySelector('.message-download-button');
                if (downloadBtn) {
                    // Update aria-label
                    downloadBtn.setAttribute('aria-label', langPack.aiMessageDownloadBtn);
                    // Update text content (find text node carefully)
                    const textNode = Array.from(downloadBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
                    if (textNode) {
                         textNode.textContent = ` ${langPack.aiMessageDownloadBtn}`; // Keep space
                    } else {
                        // Fallback - might replace SVG!
                        // downloadBtn.textContent = langPack.aiMessageDownloadBtn;
                        console.warn("Could not find text node in AI message download button.");
                    }
                }
            });
        }
        // ============================

        // === Update Preview Footer Buttons (REVISED) ===
        const previewActionsFooter = document.querySelector('.preview-actions');
        if (previewActionsFooter) {
            // --- Helper to update button text safely ---
            const updateButtonText = (actionName: string, translationKey: string) => {
                // Select using the data-action attribute
                const btn = previewActionsFooter.querySelector(`button[data-action="${actionName}"]`) as HTMLButtonElement | null;
                if (btn) {
                    const textNode = Array.from(btn.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
                    if (textNode) {
                        textNode.textContent = ` ${langPack[translationKey]}`; // Add space before text
                    } else {
                        console.warn(`Could not find text node for button with data-action: ${actionName}`);
                    }
                } else {
                     console.warn(`Could not find button with data-action: ${actionName}`);
                }
            };

            // Call the helper using the data-action values
            updateButtonText('fix-tint', 'previewAction_fixTint');
            updateButtonText('upscale', 'previewAction_upscale');
            updateButtonText('create-video', 'previewAction_createVideo');
        }
        // ========================================

        // === Call updateImageContextUI explicitly with the new langPack ===
        updateImageContextUI(langPack); // Pass the determined language pack
        // ===================================================================
    }
    // ============================================

    // === Initial UI Setup ===
    updateImageContextUI();
    if (messageTextarea) adjustTextareaHeight();
    updateUIText(currentLanguage); // Set initial text based on default language
    // ========================

}); // End DOMContentLoaded