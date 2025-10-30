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
        console.log(`[${extensionName}] Revealed entry for editing:`, textareaId);
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
        console.log(`[${extensionName}] Extension disabled, skipping cipher`);
        return;
    }
    
    console.log(`[${extensionName}] Starting manual cipher (display only)...`);
    
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
        
        const spoilerTag = extension_settings[extensionName].spoilerTag;
        
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
            console.log(`[${extensionName}] Ciphered display for textarea ${index}`);
        }
    });
    
    if (cipheredCount > 0) {
        console.log(`[${extensionName}] Ciphered ${cipheredCount} entries for display`);
        toastr.success(`Ciphered ${cipheredCount} spoiler entries (UI only - LLM sees plaintext)`, "Lore Spoilers");
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

// NO LLM HOOK NEEDED!
// Since we only cipher the UI display and never save ciphered text to the database,
// the LLM automatically receives plaintext from the World Info system.
function setupLLMPlaintextHook() {
    console.log(`[${extensionName}] 📝 Note: LLM receives plaintext automatically`);
    console.log(`[${extensionName}] This extension only ciphers the UI display, not the saved data`);
    console.log(`[${extensionName}] World Info database always contains plaintext for the LLM`);
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
