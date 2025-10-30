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

// Attach focus/blur listeners to World Info textareas
function attachWorldInfoListeners() {
    const textareas = document.querySelectorAll('textarea[name="world_info_entry_content"]');
    
    textareas.forEach(textarea => {
        // Remove old listeners to avoid duplicates
        textarea.removeEventListener('focus', onWorldInfoFocus);
        textarea.removeEventListener('blur', onWorldInfoBlur);
        
        // Add new listeners
        textarea.addEventListener('focus', onWorldInfoFocus);
        textarea.addEventListener('blur', onWorldInfoBlur);
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
       
        // Load saved settings
        loadSettings();
        
        // Setup World Info monitoring
        setupWorldInfoMonitoring();
       
        console.log(`[${extensionName}] ✅ Loaded successfully`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ Failed to load:`, error);
    }
});
