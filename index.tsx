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
    function updateImageContextUI() {
        if (!imageContextCounter || !imageContextCounterText) {
            console.warn("Image context counter elements not found, UI cannot be updated.");
            return;
        }

        const count = imageContextList.length;

        if (count === 0) {
            // Hide the counter if context is empty
            imageContextCounter.classList.add('hidden');
        } else {
            // Show the counter and update text
            imageContextCounterText.textContent = `${count} Image${count > 1 ? 's' : ''}`;
            imageContextCounter.classList.remove('hidden');
        }
        console.log(`🖼️ Image Context UI updated. Count: ${count}`);
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

}); // End DOMContentLoaded