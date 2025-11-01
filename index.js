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
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return false;
    }
    
    const textareaId = textarea.getAttribute('data-lore-spoiler-id');
    
    if (!textareaId || !displayCipheredTextareas.has(textareaId)) {
        toastr.info("Entry is not ciphered", "Lore Spoilers");
        return false;
    }
    
    const data = displayCipheredTextareas.get(textareaId);
    
    // Restore plaintext
    textarea.value = data.plaintext;
    data.isRevealed = true;
    
    toastr.success("Entry revealed", "Lore Spoilers");
    return true;
}

// Handle clicking "Cipher Entire Lorebook" button
function onCipherAllClick() {
    console.log('[lore-spoilers] onCipherAllClick called');
    
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return;
    }
    
    // Find the World Info container first
    const worldInfoContainer = document.querySelector('#world_popup') || 
                               document.querySelector('#world_info') ||
                               document.querySelector('.world_entries_container');
    
    console.log('[lore-spoilers] World Info container:', worldInfoContainer);
    
    if (!worldInfoContainer) {
        toastr.warning("Could not find World Info panel. Make sure it's open.", "Lore Spoilers");
        return;
    }
    
    // Find ALL content textareas within the World Info container
    const textareas = worldInfoContainer.querySelectorAll('textarea[name="content"]');
    console.log(`[lore-spoilers] Found ${textareas.length} textareas in World Info`);
    
    if (textareas.length === 0) {
        toastr.warning("No World Info entries found. Open some entries in the lorebook.", "Lore Spoilers");
        return;
    }
    
    let cipheredCount = 0;
    
    textareas.forEach((textarea, idx) => {
        const currentValue = textarea.value;
        console.log(`[lore-spoilers] Textarea ${idx}: id="${textarea.id}", length=${currentValue.length}`);
        
        // Skip if empty
        if (!currentValue || !currentValue.trim()) {
            console.log(`[lore-spoilers] Textarea ${idx} is empty, skipping`);
            return;
        }
        
        console.log(`[lore-spoilers] Processing textarea ${idx}...`);
        
        // Cipher ALL entries (no spoiler tag required for global button)
        const textareaId = textarea.getAttribute('data-lore-spoiler-id') || `lore_${Date.now()}_${Math.random()}`;
        textarea.setAttribute('data-lore-spoiler-id', textareaId);
        
        // Cipher directly without requiring spoiler tag
        const shift = extension_settings[extensionName].cipherShift;
        const ciphered = caesarCipher(currentValue, shift);
        console.log(`[lore-spoilers] Ciphered textarea ${idx}, original length=${currentValue.length}, ciphered length=${ciphered.length}`);
        
        displayCipheredTextareas.set(textareaId, {
            plaintext: currentValue,
            ciphered: ciphered,
            isRevealed: false
        });
        
        textarea.value = ciphered;
        console.log(`[lore-spoilers] Set textarea ${idx} value to ciphered text`);
        
        // Toggle per-entry buttons if they exist (for open entries)
        const entry = textarea.closest('.world_entry');
        if (entry) {
            const buttonContainer = entry.querySelector('.lore-spoiler-cipher-btn');
            if (buttonContainer) {
                const cipherBtn = buttonContainer.querySelector('.lore-cipher-btn');
                const revealBtn = buttonContainer.querySelector('.lore-reveal-btn');
                if (cipherBtn && revealBtn) {
                    cipherBtn.style.display = 'none';
                    revealBtn.style.display = 'inline-block';
                }
            }
        }
        
        cipheredCount++;
    });
    
    console.log(`[lore-spoilers] Ciphered ${cipheredCount} entries total`);
    
    if (cipheredCount > 0) {
        toastr.success(`Ciphered ${cipheredCount} ${cipheredCount === 1 ? 'entry' : 'entries'}`, "Lore Spoilers");
    } else {
        toastr.info("No entries found to cipher", "Lore Spoilers");
    }
}

// Handle clicking "Reveal Entire Lorebook" button
function onRevealAllClick() {
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return;
    }
    
    let revealedCount = 0;
    
    // Find all entries with ciphered data
    displayCipheredTextareas.forEach((data, textareaId) => {
        const textarea = document.querySelector(`textarea[data-lore-spoiler-id="${textareaId}"]`);
        
        if (textarea && !data.isRevealed) {
            textarea.value = data.plaintext;
            data.isRevealed = true;
            
            // Toggle per-entry buttons if they exist
            const entry = textarea.closest('.world_entry');
            if (entry) {
                const buttonContainer = entry.querySelector('.lore-spoiler-cipher-btn');
                if (buttonContainer) {
                    const cipherBtn = buttonContainer.querySelector('.lore-cipher-btn');
                    const revealBtn = buttonContainer.querySelector('.lore-reveal-btn');
                    if (cipherBtn && revealBtn) {
                        cipherBtn.style.display = 'inline-block';
                        revealBtn.style.display = 'none';
                    }
                }
            }
            
            revealedCount++;
        }
    });
    
    if (revealedCount > 0) {
        toastr.success(`Revealed ${revealedCount} spoiler ${revealedCount === 1 ? 'entry' : 'entries'}`, "Lore Spoilers");
    } else {
        toastr.info("No ciphered entries found to reveal", "Lore Spoilers");
    }
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
    // Use MutationObserver to watch for new World Info entries
    const observer = new MutationObserver((mutations) => {
        processWorldInfoEntries();
        attachWorldInfoListeners();
        attachSaveButtonListeners();
        injectCipherButtons();
        injectLorebookButtons();
    });
    
    // Try multiple containers
    const containers = [
        '#world_info',
        '#worldInfoContainer', 
        '.world_entries_container',
        '#world_popup',
        'body'  // Last resort - observe everything
    ];
    
    for (const selector of containers) {
        const container = document.querySelector(selector);
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            break;
        }
    }
    
    // Initial processing
    processWorldInfoEntries();
    attachWorldInfoListeners();
    attachSaveButtonListeners();
    injectCipherButtons();
    injectLorebookButtons();
    
    // Also poll every 2 seconds as backup
    setInterval(() => {
        injectCipherButtons();
        injectLorebookButtons();
    }, 2000);
}

// Inject cipher/reveal all buttons into lorebook UI
function injectLorebookButtons() {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    // Try to find the lorebook header/controls area
    const selectors = [
        '#world_popup_new_entry',
        '#world_popup_entries_list',
        '.world_popup',
        '#world_info'
    ];
    
    let lorebookContainer = null;
    for (const selector of selectors) {
        lorebookContainer = document.querySelector(selector);
        if (lorebookContainer) break;
    }
    
    if (!lorebookContainer) {
        return;
    }
    
    // Check if we already added buttons
    if (lorebookContainer.querySelector('.lore-spoiler-lorebook-btns')) {
        return;
    }
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'lore-spoiler-lorebook-btns';
    buttonContainer.style.cssText = 'margin: 10px 0; padding: 10px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 5px;';
    buttonContainer.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="button" class="menu_button menu_button_icon lore-cipher-lorebook-btn" 
                   value="🔒 Cipher This Lorebook" 
                   title="Hide all entries in this lorebook" />
            <input type="button" class="menu_button menu_button_icon lore-reveal-lorebook-btn" 
                   value="👁️ Reveal This Lorebook" 
                   title="Show all entries in this lorebook"
                   style="display: none;" />
        </div>
    `;
    
    // Insert at the top of the lorebook
    if (lorebookContainer.firstChild) {
        lorebookContainer.insertBefore(buttonContainer, lorebookContainer.firstChild);
    } else {
        lorebookContainer.appendChild(buttonContainer);
    }
    
    // Attach click handlers
    const cipherBtn = buttonContainer.querySelector('.lore-cipher-lorebook-btn');
    const revealBtn = buttonContainer.querySelector('.lore-reveal-lorebook-btn');
    
    cipherBtn.addEventListener('click', () => {
        onCipherAllClick();
        cipherBtn.style.display = 'none';
        revealBtn.style.display = 'inline-block';
    });
    
    revealBtn.addEventListener('click', () => {
        onRevealAllClick();
        cipherBtn.style.display = 'inline-block';
        revealBtn.style.display = 'none';
    });
}

// Inject cipher buttons into World Info entries
function injectCipherButtons() {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
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
            entries = Array.from(found);
            break;
        }
    }
    
    if (entries.length === 0) {
        return;
    }
    
    entries.forEach((entry, idx) => {
        // Check if we already added the button
        if (entry.querySelector('.lore-spoiler-cipher-btn')) {
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
            return;
        }
        
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
                   onclick="window.loreSpoilersCipherEntry(this);" />
            <input type="button" class="menu_button menu_button_icon lore-reveal-btn" 
                   value="👁️ Reveal This Entry" 
                   title="Show the original plaintext"
                   data-textarea-ref="${textareaRefId}"
                   style="display: none;"
                   onclick="window.loreSpoilersRevealEntry(this);" />
        `;
        
        const button = cipherBtn.querySelector('.lore-cipher-btn');
        
        // Store the textarea reference globally
        window[textareaRefId] = textarea;
        
        // Insert button after textarea
        if (textarea.parentElement) {
            textarea.parentElement.appendChild(cipherBtn);
        }
    });
}

// Handle clicking cipher button on individual entry
function onCipherEntryClick(textarea) {
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return false;
    }
    
    const currentValue = textarea.value;
    const spoilerTag = extension_settings[extensionName].spoilerTag;
    
    // Check if empty
    if (!currentValue || currentValue.trim().length === 0) {
        toastr.warning("Entry is empty", "Lore Spoilers");
        return false;
    }
    
    // Check if starts with spoiler tag
    if (!currentValue.startsWith(spoilerTag)) {
        toastr.info(`Entry must start with ${spoilerTag}`, "Lore Spoilers");
        return false;
    }
    
    // Cipher this entry
    const textareaId = textarea.getAttribute('data-lore-spoiler-id') || `lore_${Date.now()}_${Math.random()}`;
    textarea.setAttribute('data-lore-spoiler-id', textareaId);
    
    const ciphered = processSpoilerText(currentValue);
    
    displayCipheredTextareas.set(textareaId, {
        plaintext: currentValue,
        ciphered: ciphered,
        isRevealed: false
    });
    
    // Update display
    textarea.value = ciphered;
    
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
    // Find the textarea - walk up to find the .world_entry container
    let container = buttonElement;
    for (let i = 0; i < 10; i++) {
        container = container.parentElement;
        if (!container) break;
        
        if (container.classList.contains('world_entry')) {
            break;
        }
    }
    
    if (!container) {
        toastr.error("Could not find entry container", "Lore Spoilers");
        return;
    }
    
    // Find the content textarea
    let textarea = container.querySelector('textarea[name="content"]');
    
    if (!textarea) {
        textarea = container.querySelector('textarea[name="comment"]') ||
                  container.querySelector('textarea[name="world_info_entry_content"]') ||
                  container.querySelector('textarea');
    }
    
    if (!textarea) {
        toastr.error("Could not find entry textarea", "Lore Spoilers");
        return;
    }
    
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
    // Find the textarea - walk up to find the .world_entry container
    let container = buttonElement;
    for (let i = 0; i < 10; i++) {
        container = container.parentElement;
        if (!container) break;
        
        if (container.classList.contains('world_entry')) {
            break;
        }
    }
    
    if (!container) {
        toastr.error("Could not find entry container", "Lore Spoilers");
        return;
    }
    
    // Find the content textarea
    let textarea = container.querySelector('textarea[name="content"]');
    
    if (!textarea) {
        textarea = container.querySelector('textarea[name="comment"]') ||
                  container.querySelector('textarea[name="world_info_entry_content"]') ||
                  container.querySelector('textarea');
    }
    
    if (!textarea) {
        toastr.error("Could not find entry textarea", "Lore Spoilers");
        return;
    }
    
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
