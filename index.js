// Import from SillyTavern core
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// Extension name MUST match folder name
const extensionName = "lore-spoilers"; // ⚠️ MUST match your folder name exactly
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Default settings
const defaultSettings = {
    enabled: false,
    spoilerTag: "[SPOILER]",
    cipherShift: 13
};

// Load saved settings
async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    $("#lore_spoilers_enabled").prop("checked", extension_settings[extensionName].enabled);
    $("#lore_spoilers_tag").val(extension_settings[extensionName].spoilerTag);
    $("#lore_spoilers_shift").val(extension_settings[extensionName].cipherShift);
}

// Handle enable checkbox change
function onEnabledChange(event) {
    const value = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].enabled = value;
    saveSettingsDebounced();
}

// Handle spoiler tag change
function onSpoilerTagChange(event) {
    const value = String($(event.target).val());
    extension_settings[extensionName].spoilerTag = value;
    saveSettingsDebounced();
}

// Handle cipher shift change
function onCipherShiftChange(event) {
    let value = parseInt($(event.target).val());
    // Clamp between 1-25
    if (isNaN(value) || value < 1) value = 1;
    if (value > 25) value = 25;
    extension_settings[extensionName].cipherShift = value;
    $("#lore_spoilers_shift").val(value); // Update display if clamped
    saveSettingsDebounced();
}

// Caesar cipher function
function caesarCipher(text, shift) {
    return text.split('').map(char => {
        if (char.match(/[a-z]/i)) {
            const code = char.charCodeAt(0);
            const isUpperCase = (code >= 65 && code <= 90);
            const base = isUpperCase ? 65 : 97;
            return String.fromCharCode(((code - base + shift) % 26) + base);
        }
        return char;
    }).join('');
}

// Check if text starts with spoiler tag and cipher it
function processSpoilerText(text) {
    if (!extension_settings[extensionName].enabled) {
        return text; // Extension disabled, return original
    }
    
    const spoilerTag = extension_settings[extensionName].spoilerTag;
    const shift = extension_settings[extensionName].cipherShift;
    
    if (text.startsWith(spoilerTag)) {
        // Remove the tag and cipher the rest
        const contentWithoutTag = text.slice(spoilerTag.length);
        const cipheredContent = caesarCipher(contentWithoutTag, shift);
        return spoilerTag + cipheredContent;
    }
    
    return text; // No spoiler tag, return original
}

// Decipher text (reverse Caesar cipher)
function decipherSpoilerText(text) {
    const spoilerTag = extension_settings[extensionName].spoilerTag;
    const shift = extension_settings[extensionName].cipherShift;
    
    if (text.startsWith(spoilerTag)) {
        const contentWithoutTag = text.slice(spoilerTag.length);
        const decipheredContent = caesarCipher(contentWithoutTag, -shift);
        return spoilerTag + decipheredContent;
    }
    
    return text;
}

// Handle clicking reveal button on individual entry
function onRevealEntryClick(textarea) {
    console.log(`[${extensionName}] Reveal button clicked`);
    
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return false;
    }
    
    const textareaId = textarea.getAttribute('data-lore-spoiler-id');
    
    if (!textareaId || !displayCipheredTextareas.has(textareaId)) {
        console.log(`[${extensionName}] No ciphered data found for this textarea`);
        toastr.info("Entry is not ciphered", "Lore Spoilers");
        return false;
    }
    
    const data = displayCipheredTextareas.get(textareaId);
    
    // Restore plaintext
    textarea.value = data.plaintext;
    data.isRevealed = true;
    
    console.log(`[${extensionName}] Entry revealed successfully`);
    toastr.success("Entry revealed", "Lore Spoilers");
    return true;
}

// Manual hide button handler
function onHideSpoilersClick() {
    cipherAllVisibleEntries();
}

// Store original (plaintext) values for World Info entries - FOR DISPLAY ONLY
// The actual World Info database always keeps plaintext
const displayCipheredTextareas = new Map();

// Process World Info textareas - ONLY for visual display
function processWorldInfoEntries() {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    // Find all World Info content textareas
    const textareas = document.querySelectorAll('textarea[name="world_info_entry_content"]');
    
    textareas.forEach(textarea => {
        const textareaId = textarea.getAttribute('data-lore-spoiler-id') || `lore_${Date.now()}_${Math.random()}`;
        textarea.setAttribute('data-lore-spoiler-id', textareaId);
        
        // Check if we should cipher this for display
        const currentValue = textarea.value;
        const spoilerTag = extension_settings[extensionName].spoilerTag;
        
        if (currentValue.startsWith(spoilerTag) && !displayCipheredTextareas.has(textareaId)) {
            // This is a new spoiler entry - track it
            displayCipheredTextareas.set(textareaId, {
                plaintext: currentValue,
                ciphered: processSpoilerText(currentValue),
                isRevealed: false
            });
        }
    });
}

// Handle focus on World Info textarea (reveal original)
function onWorldInfoFocus(event) {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    const textarea = event.target;
    const textareaId = textarea.getAttribute('data-lore-spoiler-id');
    
    if (textareaId && displayCipheredTextareas.has(textareaId)) {
        const data = displayCipheredTextareas.get(textareaId);
        // Show plaintext for editing
        textarea.value = data.plaintext;
        data.isRevealed = true;
    }
}

// Handle input changes - update our plaintext tracking
function onWorldInfoInput(event) {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    const textarea = event.target;
    const textareaId = textarea.getAttribute('data-lore-spoiler-id');
    const currentValue = textarea.value;
    const spoilerTag = extension_settings[extensionName].spoilerTag;
    
    if (currentValue.startsWith(spoilerTag)) {
        if (!textareaId) {
            const newId = `lore_${Date.now()}_${Math.random()}`;
            textarea.setAttribute('data-lore-spoiler-id', newId);
            displayCipheredTextareas.set(newId, {
                plaintext: currentValue,
                ciphered: processSpoilerText(currentValue),
                isRevealed: true
            });
        } else if (displayCipheredTextareas.has(textareaId)) {
            // Update tracked plaintext
            const data = displayCipheredTextareas.get(textareaId);
            data.plaintext = currentValue;
            data.ciphered = processSpoilerText(currentValue);
        } else {
            displayCipheredTextareas.set(textareaId, {
                plaintext: currentValue,
                ciphered: processSpoilerText(currentValue),
                isRevealed: true
            });
        }
    }
}

// Manually cipher all visible World Info entries (called by button or when leaving WI)
// NOTE: This only ciphers the DISPLAY. The actual WI database stays plaintext for the LLM.
function cipherAllVisibleEntries() {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    // Try multiple selectors to find World Info textareas
    const selectors = [
        '.world_entry textarea[name="content"]',  // Try content first
        'textarea[name="content"]',
        '.world_entry textarea',
        'textarea[name="comment"]',
        'textarea[name="world_info_entry_content"]',
        '#world_info textarea',
        '.world_entry_form_control',
        '#world_popup textarea'
    ];
    
    let textareas = [];
    for (const selector of selectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
            textareas = Array.from(found);
            break;
        }
    }
    
    if (textareas.length === 0) {
        toastr.warning("No World Info entries found. Make sure an entry is open for editing.", "Lore Spoilers");
        return;
    }
    
    let cipheredCount = 0;
    const spoilerTag = extension_settings[extensionName].spoilerTag;
    
    textareas.forEach((textarea) => {
        const currentValue = textarea.value;
        
        // Skip empty textareas
        if (!currentValue || currentValue.trim().length === 0) {
            return;
        }
        
        if (currentValue.startsWith(spoilerTag)) {
            const textareaId = textarea.getAttribute('data-lore-spoiler-id') || `lore_${Date.now()}_${Math.random()}`;
            textarea.setAttribute('data-lore-spoiler-id', textareaId);
            
            // Track this entry
            const ciphered = processSpoilerText(currentValue);
            displayCipheredTextareas.set(textareaId, {
                plaintext: currentValue,
                ciphered: ciphered,
                isRevealed: false
            });
            
            // Update textarea DISPLAY to show ciphered (but don't save yet)
            textarea.value = ciphered;
            cipheredCount++;
        }
    });
    
    if (cipheredCount > 0) {
        toastr.success(`Ciphered ${cipheredCount} spoiler ${cipheredCount === 1 ? 'entry' : 'entries'}`, "Lore Spoilers");
    } else {
        toastr.info("No spoiler entries found. Make sure entries start with: " + spoilerTag, "Lore Spoilers");
    }
}

// Monitor for World Info panel changes and new entries
function setupWorldInfoMonitoring() {
    console.log(`[${extensionName}] Setting up World Info monitoring...`);
    
    // Use MutationObserver to watch for new World Info entries
    const observer = new MutationObserver((mutations) => {
        console.log(`[${extensionName}] MutationObserver detected ${mutations.length} mutations`);
        processWorldInfoEntries();
        attachWorldInfoListeners();
        attachSaveButtonListeners();
        injectCipherButtons();
    });
    
    // Try multiple containers
    const containers = [
        '#world_info',
        '#worldInfoContainer', 
        '.world_entries_container',
        '#world_popup',
        'body'  // Last resort - observe everything
    ];
    
    let observerAttached = false;
    for (const selector of containers) {
        const container = document.querySelector(selector);
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            console.log(`[${extensionName}] Monitoring container: ${selector}`);
            observerAttached = true;
            break;
        }
    }
    
    if (!observerAttached) {
        console.log(`[${extensionName}] WARNING: Could not find container to observe`);
    }
    
    // Initial processing
    processWorldInfoEntries();
    attachWorldInfoListeners();
    attachSaveButtonListeners();
    injectCipherButtons();
    
    // Also poll every 2 seconds as backup
    setInterval(() => {
        injectCipherButtons();
    }, 2000);
    
    console.log(`[${extensionName}] World Info monitoring setup complete`);
}

// Inject cipher buttons into World Info entries
function injectCipherButtons() {
    if (!extension_settings[extensionName].enabled) {
        console.log(`[${extensionName}] Extension disabled, skipping button injection`);
        return;
    }
    
    console.log(`[${extensionName}] Injecting cipher buttons...`);
    
    // Try multiple selectors to find World Info entries
    const selectors = [
        '.world_entry',
        '.world_popup',
        '#world_popup_entries_list .world_entry',
        '.inline-drawer-content .world_entry'
    ];
    
    let entries = [];
    for (const selector of selectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
            console.log(`[${extensionName}] Found ${found.length} entries with selector: ${selector}`);
            entries = Array.from(found);
            break;
        }
    }
    
    if (entries.length === 0) {
        console.log(`[${extensionName}] No World Info entries found`);
        return;
    }
    
    console.log(`[${extensionName}] Processing ${entries.length} entries`);
    
    entries.forEach((entry, idx) => {
        // Check if we already added the button
        if (entry.querySelector('.lore-spoiler-cipher-btn')) {
            console.log(`[${extensionName}] Entry ${idx} already has button`);
            return;
        }
        
        // Find the textarea - try multiple selectors
        let textarea = entry.querySelector('textarea[name="content"]');  // The actual content textarea!
        if (!textarea) {
            textarea = entry.querySelector('textarea[name="comment"]');
        }
        if (!textarea) {
            textarea = entry.querySelector('textarea[name="world_info_entry_content"]');
        }
        if (!textarea) {
            textarea = entry.querySelector('textarea');
        }
        
        if (!textarea) {
            console.log(`[${extensionName}] Entry ${idx} has no textarea at all`);
            return;
        }
        
        console.log(`[${extensionName}] Adding button to entry ${idx}, textarea name: ${textarea.name || 'no name'}`);
        
        // Store textarea reference directly on button for easy access
        const textareaRefId = `lore_spoiler_ref_${Date.now()}_${idx}`;
        
        // Create button container with both cipher and reveal buttons
        const cipherBtn = document.createElement('div');
        cipherBtn.className = 'lore-spoiler-cipher-btn';
        cipherBtn.innerHTML = `
            <input type="button" class="menu_button menu_button_icon lore-cipher-btn" 
                   value="🔒 Cipher This Entry" 
                   title="Hide this entry with Caesar cipher"
                   data-textarea-ref="${textareaRefId}"
                   onclick="console.log('[lore-spoilers] CIPHER CLICKED'); window.loreSpoilersCipherEntry(this);" />
            <input type="button" class="menu_button menu_button_icon lore-reveal-btn" 
                   value="👁️ Reveal This Entry" 
                   title="Show the original plaintext"
                   data-textarea-ref="${textareaRefId}"
                   style="display: none;"
                   onclick="console.log('[lore-spoilers] REVEAL CLICKED'); window.loreSpoilersRevealEntry(this);" />
        `;
        
        const button = cipherBtn.querySelector('.lore-cipher-btn');
        
        // Store the textarea reference globally
        window[textareaRefId] = textarea;
        console.log(`[${extensionName}] Stored textarea reference as:`, textareaRefId);
        
        // Insert button after textarea
        if (textarea.parentElement) {
            textarea.parentElement.appendChild(cipherBtn);
            console.log(`[${extensionName}] Button added to entry ${idx}`);
        } else {
            console.log(`[${extensionName}] Entry ${idx} textarea has no parent`);
        }
        
        console.log(`[${extensionName}] Button with inline onclick created for entry ${idx}`);
    });
    
    console.log(`[${extensionName}] Button injection complete`);
}

// Handle clicking cipher button on individual entry
function onCipherEntryClick(textarea) {
    console.log(`[${extensionName}] Cipher button clicked`);
    console.log(`[${extensionName}] Extension enabled:`, extension_settings[extensionName].enabled);
    
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return false;
    }
    
    const currentValue = textarea.value;
    console.log(`[${extensionName}] Textarea value:`, currentValue.substring(0, 50));
    
    const spoilerTag = extension_settings[extensionName].spoilerTag;
    console.log(`[${extensionName}] Spoiler tag:`, spoilerTag);
    
    // Check if empty
    if (!currentValue || currentValue.trim().length === 0) {
        console.log(`[${extensionName}] Entry is empty`);
        toastr.warning("Entry is empty", "Lore Spoilers");
        return false;
    }
    
    // Check if starts with spoiler tag
    if (!currentValue.startsWith(spoilerTag)) {
        console.log(`[${extensionName}] Entry does not start with spoiler tag`);
        toastr.info(`Entry must start with ${spoilerTag}`, "Lore Spoilers");
        return false;
    }
    
    console.log(`[${extensionName}] Ciphering entry...`);
    
    // Cipher this entry
    const textareaId = textarea.getAttribute('data-lore-spoiler-id') || `lore_${Date.now()}_${Math.random()}`;
    textarea.setAttribute('data-lore-spoiler-id', textareaId);
    
    const ciphered = processSpoilerText(currentValue);
    console.log(`[${extensionName}] Ciphered text:`, ciphered.substring(0, 50));
    
    displayCipheredTextareas.set(textareaId, {
        plaintext: currentValue,
        ciphered: ciphered,
        isRevealed: false
    });
    
    // Update display
    textarea.value = ciphered;
    
    console.log(`[${extensionName}] Entry ciphered successfully`);
    toastr.success("Entry ciphered", "Lore Spoilers");
    return true;
}

// Attach listeners to save/close buttons to restore plaintext before save
function attachSaveButtonListeners() {
    // Find all World Info save/close buttons
    const buttons = document.querySelectorAll('.world_entry_form_control button, .world_popup_close, .world_popup_save');
    
    buttons.forEach(button => {
        // Remove old listener
        button.removeEventListener('click', onWorldInfoSaveClick);
        
        // Add new listener with capture phase (runs before ST's handler)
        button.addEventListener('click', onWorldInfoSaveClick, true);
    });
}

// Before WI is saved, restore plaintext to textarea
function onWorldInfoSaveClick(event) {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    // Find all textareas and restore plaintext - content is the main one!
    const textareas = document.querySelectorAll('textarea[name="content"], textarea[name="comment"], textarea[name="world_info_entry_content"], .world_entry textarea');
    
    textareas.forEach(textarea => {
        const textareaId = textarea.getAttribute('data-lore-spoiler-id');
        
        if (textareaId && displayCipheredTextareas.has(textareaId)) {
            const data = displayCipheredTextareas.get(textareaId);
            
            // Restore plaintext so ST saves it
            textarea.value = data.plaintext;
        }
    });
}

// NO LLM HOOK NEEDED!
// Since we only cipher the UI display and never save ciphered text to the database,
// the LLM automatically receives plaintext from the World Info system.
function setupLLMPlaintextHook() {
    // Nothing to do here - plaintext is saved to database automatically
}

// Attach focus/blur listeners to World Info textareas
function attachWorldInfoListeners() {
    // Try multiple selectors for textareas - content is the main one!
    const textareas = document.querySelectorAll('textarea[name="content"], textarea[name="comment"], textarea[name="world_info_entry_content"], .world_entry textarea');
    
    textareas.forEach(textarea => {
        // Remove old listeners to avoid duplicates
        textarea.removeEventListener('focus', onWorldInfoFocus);
        textarea.removeEventListener('input', onWorldInfoInput);
        textarea.removeEventListener('blur', onWorldInfoBlur);
        
        // Add new listeners
        textarea.addEventListener('focus', onWorldInfoFocus);
        textarea.addEventListener('input', onWorldInfoInput);
        textarea.addEventListener('blur', onWorldInfoBlur);
    });
}

// Handle blur - ensure plaintext is in textarea when saving
function onWorldInfoBlur(event) {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    const textarea = event.target;
    const textareaId = textarea.getAttribute('data-lore-spoiler-id');
    
    if (textareaId && displayCipheredTextareas.has(textareaId)) {
        const data = displayCipheredTextareas.get(textareaId);
        
        // Put plaintext back in the textarea so ST saves the plaintext
        textarea.value = data.plaintext;
        data.isRevealed = false;
        
        // After a short delay, cipher the display again (after ST has read the value)
        setTimeout(() => {
            if (document.activeElement !== textarea) {
                textarea.value = data.ciphered;
            }
        }, 100);
    }
}

// Global function for inline onclick - defined here so onCipherEntryClick is already defined
window.loreSpoilersCipherEntry = function(buttonElement) {
    console.log(`[lore-spoilers] Global cipher function called, button element:`, buttonElement);
    
    // Find the textarea FRESH - walk up to find the .world_entry container
    let container = buttonElement;
    for (let i = 0; i < 10; i++) {
        container = container.parentElement;
        if (!container) break;
        
        if (container.classList.contains('world_entry')) {
            console.log(`[lore-spoilers] Found world_entry container at level ${i}`);
            break;
        }
    }
    
    if (!container) {
        console.error(`[lore-spoilers] Could not find world_entry container`);
        toastr.error("Could not find entry container", "Lore Spoilers");
        return;
    }
    
    // Now find the content textarea specifically
    let textarea = container.querySelector('textarea[name="content"]');
    
    if (!textarea) {
        console.log(`[lore-spoilers] No textarea[name="content"], trying other selectors...`);
        textarea = container.querySelector('textarea[name="comment"]') ||
                  container.querySelector('textarea[name="world_info_entry_content"]') ||
                  container.querySelector('textarea');
    }
    
    if (!textarea) {
        console.error(`[lore-spoilers] Could not find any textarea in container`);
        toastr.error("Could not find entry textarea", "Lore Spoilers");
        return;
    }
    
    console.log(`[lore-spoilers] Found textarea, name:`, textarea.name);
    console.log(`[lore-spoilers] Textarea value length:`, textarea.value.length);
    console.log(`[lore-spoilers] First 100 chars:`, textarea.value.substring(0, 100));
    console.log(`[lore-spoilers] Calling onCipherEntryClick`);
    
    const result = onCipherEntryClick(textarea);
    
    // If cipher was successful, toggle button visibility
    if (result) {
        const buttonContainer = buttonElement.parentElement;
        const cipherBtn = buttonContainer.querySelector('.lore-cipher-btn');
        const revealBtn = buttonContainer.querySelector('.lore-reveal-btn');
        
        if (cipherBtn && revealBtn) {
            cipherBtn.style.display = 'none';
            revealBtn.style.display = 'inline-block';
        }
    }
};

// Global function for revealing entries
window.loreSpoilersRevealEntry = function(buttonElement) {
    console.log(`[lore-spoilers] Global reveal function called`);
    
    // Find the textarea FRESH - walk up to find the .world_entry container
    let container = buttonElement;
    for (let i = 0; i < 10; i++) {
        container = container.parentElement;
        if (!container) break;
        
        if (container.classList.contains('world_entry')) {
            console.log(`[lore-spoilers] Found world_entry container at level ${i}`);
            break;
        }
    }
    
    if (!container) {
        console.error(`[lore-spoilers] Could not find world_entry container`);
        toastr.error("Could not find entry container", "Lore Spoilers");
        return;
    }
    
    // Now find the content textarea specifically
    let textarea = container.querySelector('textarea[name="content"]');
    
    if (!textarea) {
        textarea = container.querySelector('textarea[name="comment"]') ||
                  container.querySelector('textarea[name="world_info_entry_content"]') ||
                  container.querySelector('textarea');
    }
    
    if (!textarea) {
        console.error(`[lore-spoilers] Could not find any textarea in container`);
        toastr.error("Could not find entry textarea", "Lore Spoilers");
        return;
    }
    
    console.log(`[lore-spoilers] Found textarea for reveal`);
    
    const result = onRevealEntryClick(textarea);
    
    // If reveal was successful, toggle button visibility
    if (result) {
        const buttonContainer = buttonElement.parentElement;
        const cipherBtn = buttonContainer.querySelector('.lore-cipher-btn');
        const revealBtn = buttonContainer.querySelector('.lore-reveal-btn');
        
        if (cipherBtn && revealBtn) {
            cipherBtn.style.display = 'inline-block';
            revealBtn.style.display = 'none';
        }
    }
};

// Extension initialization
jQuery(async () => {
    console.log(`[lore-spoilers] Global cipher function type:`, typeof window.loreSpoilersCipherEntry);
    
    try {
        // Load HTML from file
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
       
        // Append to settings panel (right column for UI extensions)
        $("#extensions_settings2").append(settingsHtml);
       
        // Bind checkbox event
        $("#lore_spoilers_enabled").on("input", onEnabledChange);
        
        // Bind text input events
        $("#lore_spoilers_tag").on("input", onSpoilerTagChange);
        $("#lore_spoilers_shift").on("input", onCipherShiftChange);
        
        // Bind hide spoilers button
        $("#lore_spoilers_hide_button").on("click", onHideSpoilersClick);
       
        // Load saved settings
        loadSettings();
        
        // Setup World Info monitoring
        setupWorldInfoMonitoring();
        
        // Setup LLM plaintext hook
        setupLLMPlaintextHook();
    } catch (error) {
        console.error(`[${extensionName}] Failed to load:`, error);
    }
});
