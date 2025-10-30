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
    console.log(`[${extensionName}] Settings loaded:`, extension_settings[extensionName]);
}

// Handle enable checkbox change
function onEnabledChange(event) {
    const value = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].enabled = value;
    saveSettingsDebounced();
    console.log(`[${extensionName}] Setting saved - enabled:`, value);
}

// Handle spoiler tag change
function onSpoilerTagChange(event) {
    const value = String($(event.target).val());
    extension_settings[extensionName].spoilerTag = value;
    saveSettingsDebounced();
    console.log(`[${extensionName}] Setting saved - spoilerTag:`, value);
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
    console.log(`[${extensionName}] Setting saved - cipherShift:`, value);
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

// Test button handler
function onTestButtonClick() {
    const testText = $("#lore_spoilers_test").val();
    
    if (!testText) {
        toastr.warning("Please enter some text to test", "Lore Spoilers");
        return;
    }
    
    const processed = processSpoilerText(testText);
    $("#lore_spoilers_test").val(processed);
    
    console.log(`[${extensionName}] Test cipher - Original:`, testText);
    console.log(`[${extensionName}] Test cipher - Processed:`, processed);
    
    toastr.success("Text ciphered! Click again to decipher.", "Lore Spoilers");
}

// Manual hide button handler
function onHideSpoilersClick() {
    cipherAllVisibleEntries();
}

// Store original (plaintext) values for World Info entries
const originalValues = new Map();

// Process World Info textareas
function processWorldInfoEntries() {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    // Find all World Info content textareas
    const textareas = document.querySelectorAll('textarea[name="world_info_entry_content"]');
    
    textareas.forEach(textarea => {
        const currentValue = textarea.value;
        const spoilerTag = extension_settings[extensionName].spoilerTag;
        
        // Only process if it starts with spoiler tag and isn't already ciphered
        if (currentValue.startsWith(spoilerTag)) {
            // Check if we've already stored the original
            const textareaId = textarea.getAttribute('data-lore-spoiler-id') || `lore_${Date.now()}_${Math.random()}`;
            textarea.setAttribute('data-lore-spoiler-id', textareaId);
            
            // If not in our map, this is a fresh entry - store original and cipher it
            if (!originalValues.has(textareaId)) {
                originalValues.set(textareaId, currentValue);
                const ciphered = processSpoilerText(currentValue);
                textarea.value = ciphered;
                console.log(`[${extensionName}] Ciphered entry:`, textareaId);
            }
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
    
    if (textareaId && originalValues.has(textareaId)) {
        textarea.value = originalValues.get(textareaId);
        console.log(`[${extensionName}] Revealed entry:`, textareaId);
    }
}

// Handle blur on World Info textarea (re-cipher)
function onWorldInfoBlur(event) {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    const textarea = event.target;
    const textareaId = textarea.getAttribute('data-lore-spoiler-id');
    const currentValue = textarea.value;
    const spoilerTag = extension_settings[extensionName].spoilerTag;
    
    // Update original value and re-cipher
    if (currentValue.startsWith(spoilerTag)) {
        if (!textareaId) {
            const newId = `lore_${Date.now()}_${Math.random()}`;
            textarea.setAttribute('data-lore-spoiler-id', newId);
            originalValues.set(newId, currentValue);
        } else {
            originalValues.set(textareaId, currentValue);
        }
        
        const ciphered = processSpoilerText(currentValue);
        textarea.value = ciphered;
        console.log(`[${extensionName}] Re-ciphered entry:`, textareaId);
    }
}

// Handle input changes on World Info textarea (save plaintext as they type)
function onWorldInfoInput(event) {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    const textarea = event.target;
    const textareaId = textarea.getAttribute('data-lore-spoiler-id');
    const currentValue = textarea.value;
    const spoilerTag = extension_settings[extensionName].spoilerTag;
    
    // If it starts with spoiler tag and we're tracking it, update the original
    if (currentValue.startsWith(spoilerTag) && textareaId && originalValues.has(textareaId)) {
        originalValues.set(textareaId, currentValue);
    }
}

// Manually cipher all visible World Info entries (called by button or when leaving WI)
function cipherAllVisibleEntries() {
    if (!extension_settings[extensionName].enabled) {
        console.log(`[${extensionName}] Extension disabled, skipping cipher`);
        return;
    }
    
    console.log(`[${extensionName}] Starting manual cipher...`);
    
    // Try multiple selectors to find World Info textareas
    const selectors = [
        '.world_entry textarea',
        'textarea[name="world_info_entry_content"]',
        '#world_info textarea',
        '.world_entry_form_control',
        '#world_popup textarea'
    ];
    
    let textareas = [];
    for (const selector of selectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
            console.log(`[${extensionName}] Found ${found.length} textareas with selector: ${selector}`);
            textareas = Array.from(found);
            break;
        }
    }
    
    if (textareas.length === 0) {
        console.log(`[${extensionName}] No World Info textareas found`);
        toastr.warning("No World Info entries found. Make sure an entry is open for editing.", "Lore Spoilers");
        return;
    }
    
    console.log(`[${extensionName}] Processing ${textareas.length} textareas`);
    let cipheredCount = 0;
    
    textareas.forEach((textarea, index) => {
        const currentValue = textarea.value;
        const valueLength = currentValue ? currentValue.length : 0;
        console.log(`[${extensionName}] Textarea ${index}: length=${valueLength}, value="${currentValue.substring(0, 100)}"`);
        
        const spoilerTag = extension_settings[extensionName].spoilerTag;
        
        // Skip empty textareas
        if (!currentValue || currentValue.trim().length === 0) {
            console.log(`[${extensionName}] Textarea ${index} is empty, skipping`);
            return;
        }
        
        if (currentValue.startsWith(spoilerTag)) {
            console.log(`[${extensionName}] Textarea ${index} has spoiler tag`);
            const textareaId = textarea.getAttribute('data-lore-spoiler-id') || `lore_${Date.now()}_${Math.random()}`;
            textarea.setAttribute('data-lore-spoiler-id', textareaId);
            
            // Store original and cipher
            originalValues.set(textareaId, currentValue);
            const ciphered = processSpoilerText(currentValue);
            
            console.log(`[${extensionName}] Original: ${currentValue.substring(0, 100)}`);
            console.log(`[${extensionName}] Ciphered: ${ciphered.substring(0, 100)}`);
            
            // Update textarea value
            textarea.value = ciphered;
            
            // Trigger events so SillyTavern knows the value changed
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Force focus and blur to trigger ST's save
            setTimeout(() => {
                textarea.focus();
                textarea.blur();
            }, 100);
            
            cipheredCount++;
            console.log(`[${extensionName}] Successfully ciphered textarea ${index}`);
        } else {
            console.log(`[${extensionName}] Textarea ${index} does not start with spoiler tag "${spoilerTag}"`);
            console.log(`[${extensionName}] First 20 chars: "${currentValue.substring(0, 20)}"`);
        }
    });
    
    if (cipheredCount > 0) {
        console.log(`[${extensionName}] Manually ciphered ${cipheredCount} entries`);
        toastr.success(`Ciphered ${cipheredCount} spoiler entries`, "Lore Spoilers");
    } else {
        console.log(`[${extensionName}] No entries were ciphered`);
        toastr.info("No spoiler entries found to cipher. Make sure entries start with: " + extension_settings[extensionName].spoilerTag, "Lore Spoilers");
    }
}

// Monitor for World Info panel changes and new entries
function setupWorldInfoMonitoring() {
    // Use MutationObserver to watch for new World Info entries
    const observer = new MutationObserver((mutations) => {
        processWorldInfoEntries();
        attachWorldInfoListeners();
    });
    
    // Observe the world info container
    const worldInfoContainer = document.querySelector('#world_info');
    if (worldInfoContainer) {
        observer.observe(worldInfoContainer, {
            childList: true,
            subtree: true
        });
        console.log(`[${extensionName}] Monitoring World Info panel`);
    }
    
    // Initial processing
    processWorldInfoEntries();
    attachWorldInfoListeners();
}

// Hook into SillyTavern's World Info processing to send plaintext to LLM
function setupLLMPlaintextHook() {
    const context = getContext();
    
    console.log(`[${extensionName}] Setting up LLM plaintext hook...`);
    console.log(`[${extensionName}] Currently tracking ${originalValues.size} spoiler entries`);
    
    // Intercept by patching the textarea values right before message send
    const originalSend = $.ajax;
    let hookInstalled = false;
    
    $.ajax = function(options) {
        if (!hookInstalled) {
            console.log(`[${extensionName}] Ajax hook is active and intercepting requests`);
            hookInstalled = true;
        }
        
        // Log all AJAX requests to see what we're intercepting
        if (options && options.url) {
            console.log(`[${extensionName}] AJAX request to: ${options.url}`);
        }
        
        // Check if this is a message being sent to the LLM
        if (options && options.url && (
            options.url.includes('/generate') || 
            options.url.includes('/api/completions') ||
            options.url.includes('/chat/completions') ||
            options.url.includes('/v1/chat') ||
            options.url.includes('/v1/completions')
        )) {
            console.log(`[${extensionName}] 🎯 Intercepting LLM request to: ${options.url}`);
            console.log(`[${extensionName}] Extension enabled: ${extension_settings[extensionName].enabled}`);
            console.log(`[${extensionName}] Tracked spoilers: ${originalValues.size}`);
            
            if (!extension_settings[extensionName].enabled) {
                console.log(`[${extensionName}] Extension disabled, skipping plaintext replacement`);
                return originalSend.apply(this, arguments);
            }
            
            if (originalValues.size === 0) {
                console.log(`[${extensionName}] No spoilers tracked, skipping plaintext replacement`);
                return originalSend.apply(this, arguments);
            }
            
            // Replace any ciphered World Info with plaintext in the request
            if (options.data) {
                let data = options.data;
                let dataStr = typeof data === 'string' ? data : JSON.stringify(data);
                
                console.log(`[${extensionName}] Original data length: ${dataStr.length}`);
                console.log(`[${extensionName}] First 200 chars: ${dataStr.substring(0, 200)}`);
                
                if (typeof data === 'string') {
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        console.log(`[${extensionName}] Data is not JSON, processing as string`);
                    }
                }
                
                let replacementCount = 0;
                const spoilerTag = extension_settings[extensionName].spoilerTag;
                
                // Replace ciphered text with plaintext from our stored originals
                originalValues.forEach((plaintext, id) => {
                    const ciphered = processSpoilerText(plaintext);
                    
                    console.log(`[${extensionName}] Checking for spoiler ${id}`);
                    console.log(`[${extensionName}]   Plaintext: ${plaintext.substring(0, 50)}`);
                    console.log(`[${extensionName}]   Ciphered:  ${ciphered.substring(0, 50)}`);
                    
                    // Replace in string data
                    if (typeof dataStr === 'string' && dataStr.includes(ciphered)) {
                        dataStr = dataStr.replace(new RegExp(ciphered.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), plaintext);
                        replacementCount++;
                        console.log(`[${extensionName}] ✅ Replaced ciphered text with plaintext in data string`);
                    }
                    
                    // Replace in parsed object
                    if (typeof data === 'object') {
                        // Replace in prompt
                        if (data.prompt && typeof data.prompt === 'string' && data.prompt.includes(ciphered)) {
                            data.prompt = data.prompt.replace(new RegExp(ciphered.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), plaintext);
                            replacementCount++;
                            console.log(`[${extensionName}] ✅ Replaced ciphered text with plaintext in prompt`);
                        }
                        
                        // Replace in messages array
                        if (data.messages && Array.isArray(data.messages)) {
                            data.messages.forEach((msg, idx) => {
                                if (msg.content && typeof msg.content === 'string' && msg.content.includes(ciphered)) {
                                    msg.content = msg.content.replace(new RegExp(ciphered.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), plaintext);
                                    replacementCount++;
                                    console.log(`[${extensionName}] ✅ Replaced ciphered text with plaintext in message ${idx}`);
                                }
                            });
                        }
                    }
                });
                
                console.log(`[${extensionName}] Total replacements made: ${replacementCount}`);
                
                // Update options.data with modified version
                if (typeof options.data === 'string' && typeof data === 'object') {
                    options.data = JSON.stringify(data);
                } else if (typeof options.data === 'string') {
                    options.data = dataStr;
                } else {
                    options.data = data;
                }
                
                if (replacementCount > 0) {
                    console.log(`[${extensionName}] Modified data length: ${JSON.stringify(options.data).length}`);
                }
            }
        }
        
        return originalSend.apply(this, arguments);
    };
    
    console.log(`[${extensionName}] ✅ LLM plaintext hook installed`);
}

// Attach focus/blur listeners to World Info textareas
function attachWorldInfoListeners() {
    const textareas = document.querySelectorAll('textarea[name="world_info_entry_content"]');
    
    textareas.forEach(textarea => {
        // Remove old listeners to avoid duplicates
        textarea.removeEventListener('focus', onWorldInfoFocus);
        textarea.removeEventListener('input', onWorldInfoInput);
        
        // Add new listeners
        textarea.addEventListener('focus', onWorldInfoFocus);
        textarea.addEventListener('input', onWorldInfoInput);
    });
}

// Extension initialization
jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);
   
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
        
        // Bind test button
        $("#lore_spoilers_test_button").on("click", onTestButtonClick);
        
        // Bind hide spoilers button
        $("#lore_spoilers_hide_button").on("click", onHideSpoilersClick);
       
        // Load saved settings
        loadSettings();
        
        // Setup World Info monitoring
        setupWorldInfoMonitoring();
        
        // Setup LLM plaintext hook
        setupLLMPlaintextHook();
       
        console.log(`[${extensionName}] ✅ Loaded successfully`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Failed to load:`, error);
    }
});
