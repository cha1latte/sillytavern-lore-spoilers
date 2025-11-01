// Import from SillyTavern core
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// Extension name MUST match folder name
const extensionName = "lore-spoilers";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Default settings
const defaultSettings = {
    enabled: false
};

// Store original (plaintext) values for World Info entries
const displayCipheredTextareas = new Map();

// Load saved settings
async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    $("#lore_spoilers_enabled").prop("checked", extension_settings[extensionName].enabled);
}

// Handle enable checkbox change
function onEnabledChange(event) {
    const value = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].enabled = value;
    saveSettingsDebounced();
}

// Caesar cipher function with fixed shift of 13 (ROT13)
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

// Handle clicking "Cipher Entire Lorebook" button
async function onCipherAllClick() {
    console.log('[lore-spoilers] onCipherAllClick called');
    
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return;
    }
    
    try {
        const context = getContext();
        
        // Get selected lorebook name from dropdown
        const worldInfoSelect = document.querySelector('#world_info');
        if (!worldInfoSelect) {
            toastr.warning("Could not find World Info selector.", "Lore Spoilers");
            return;
        }
        
        const selectedOptions = Array.from(worldInfoSelect.selectedOptions);
        if (selectedOptions.length === 0) {
            toastr.warning("No lorebook is currently selected.", "Lore Spoilers");
            return;
        }
        
        const lorebookName = selectedOptions[0].value;
        console.log(`[lore-spoilers] Selected lorebook: ${lorebookName}`);
        
        const shift = 13; // Fixed ROT13
        
        // Use SillyTavern's loadWorldInfo function
        const worldInfoData = await context.loadWorldInfo(lorebookName);
        
        console.log('[lore-spoilers] worldInfoData:', worldInfoData);
        console.log('[lore-spoilers] worldInfoData type:', typeof worldInfoData);
        console.log('[lore-spoilers] worldInfoData.entries:', worldInfoData?.entries);
        console.log('[lore-spoilers] worldInfoData keys:', worldInfoData ? Object.keys(worldInfoData) : 'null');
        
        if (!worldInfoData) {
            toastr.warning("Failed to load lorebook.", "Lore Spoilers");
            return;
        }
        
        // Check different possible structures
        let entries = worldInfoData.entries || worldInfoData;
        
        if (!entries || !Array.isArray(entries)) {
            toastr.warning("No entries array found in lorebook data.", "Lore Spoilers");
            console.error('[lore-spoilers] Expected array, got:', entries);
            return;
        }
        
        console.log(`[lore-spoilers] Loaded ${entries.length} entries`);
        
        let cipheredCount = 0;
        
        // Cipher ALL entries in the data
        entries.forEach((entry, idx) => {
            if (!entry.content || !entry.content.trim()) {
                return;
            }
            
            const originalContent = entry.content;
            const ciphered = caesarCipher(originalContent, shift);
            
            console.log(`[lore-spoilers] Entry ${idx} (uid=${entry.uid}): Ciphering`);
            
            // Store plaintext for restoration
            displayCipheredTextareas.set(entry.uid, {
                plaintext: originalContent,
                ciphered: ciphered,
                lorebookName: lorebookName
            });
            
            // Modify in data structure
            entry.content = ciphered;
            
            // Update visible textarea if exists
            const textarea = document.querySelector(`textarea[id="world_entry_content_${entry.uid}"]`);
            if (textarea) {
                textarea.value = ciphered;
            }
            
            cipheredCount++;
        });
        
        // Use SillyTavern's saveWorldInfo function
        await context.saveWorldInfo(lorebookName, worldInfoData);
        
        console.log(`[lore-spoilers] Saved ${cipheredCount} ciphered entries`);
        
        if (cipheredCount > 0) {
            toastr.success(`Ciphered ${cipheredCount} ${cipheredCount === 1 ? 'entry' : 'entries'} (including collapsed)`, "Lore Spoilers");
        } else {
            toastr.info("No entries with content found", "Lore Spoilers");
        }
        
    } catch (error) {
        console.error('[lore-spoilers] Error:', error);
        toastr.error(`Failed to cipher: ${error.message}`, "Lore Spoilers");
    }
}

// Handle clicking "Reveal Entire Lorebook" button
async function onRevealAllClick() {
    console.log('[lore-spoilers] onRevealAllClick called');
    
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return;
    }
    
    try {
        const context = getContext();
        
        // Get selected lorebook
        const worldInfoSelect = document.querySelector('#world_info');
        if (!worldInfoSelect) {
            toastr.warning("Could not find World Info selector.", "Lore Spoilers");
            return;
        }
        
        const selectedOptions = Array.from(worldInfoSelect.selectedOptions);
        if (selectedOptions.length === 0) {
            toastr.warning("No lorebook is currently selected.", "Lore Spoilers");
            return;
        }
        
        const lorebookName = selectedOptions[0].value;
        
        // Use SillyTavern's loadWorldInfo function
        const worldInfoData = await context.loadWorldInfo(lorebookName);
        
        if (!worldInfoData || !worldInfoData.entries) {
            toastr.warning("No entries found in lorebook.", "Lore Spoilers");
            return;
        }
        
        let revealedCount = 0;
        
        // Restore plaintext for all ciphered entries
        worldInfoData.entries.forEach((entry) => {
            if (displayCipheredTextareas.has(entry.uid)) {
                const data = displayCipheredTextareas.get(entry.uid);
                
                console.log(`[lore-spoilers] Entry uid=${entry.uid}: Restoring plaintext`);
                
                // Restore in data
                entry.content = data.plaintext;
                
                // Update visible textarea if exists
                const textarea = document.querySelector(`textarea[id="world_entry_content_${entry.uid}"]`);
                if (textarea) {
                    textarea.value = data.plaintext;
                }
                
                revealedCount++;
            }
        });
        
        // Use SillyTavern's saveWorldInfo function
        if (revealedCount > 0) {
            await context.saveWorldInfo(lorebookName, worldInfoData);
            displayCipheredTextareas.clear();
        }
        
        console.log(`[lore-spoilers] Revealed ${revealedCount} entries`);
        
        if (revealedCount > 0) {
            toastr.success(`Revealed ${revealedCount} ${revealedCount === 1 ? 'entry' : 'entries'}`, "Lore Spoilers");
        } else {
            toastr.info("No ciphered entries to reveal", "Lore Spoilers");
        }
        
    } catch (error) {
        console.error('[lore-spoilers] Error:', error);
        toastr.error(`Failed to reveal: ${error.message}`, "Lore Spoilers");
    }
}

// Before WI is saved, restore plaintext to textarea
function onWorldInfoSaveClick(event) {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    const textareas = document.querySelectorAll('textarea[name="content"], textarea[name="comment"], .world_entry textarea');
    
    textareas.forEach(textarea => {
        const textareaId = textarea.getAttribute('data-lore-spoiler-id');
        
        if (textareaId && displayCipheredTextareas.has(textareaId)) {
            const data = displayCipheredTextareas.get(textareaId);
            textarea.value = data.plaintext;
        }
    });
}

// Attach listeners to save/close buttons
function attachSaveButtonListeners() {
    const buttons = document.querySelectorAll('.world_entry_form_control button, .world_popup_close, .world_popup_save');
    
    buttons.forEach(button => {
        button.removeEventListener('click', onWorldInfoSaveClick);
        button.addEventListener('click', onWorldInfoSaveClick, true);
    });
}

// Inject cipher/reveal buttons into lorebook UI
function injectLorebookButtons() {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    const selectors = ['#world_popup_new_entry', '#world_popup_entries_list', '.world_popup', '#world_info'];
    
    let lorebookContainer = null;
    for (const selector of selectors) {
        lorebookContainer = document.querySelector(selector);
        if (lorebookContainer) break;
    }
    
    if (!lorebookContainer || lorebookContainer.querySelector('.lore-spoiler-lorebook-btns')) {
        return;
    }
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'lore-spoiler-lorebook-btns';
    buttonContainer.style.cssText = 'margin: 10px 0; padding: 10px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 5px;';
    buttonContainer.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="button" class="menu_button menu_button_icon lore-cipher-lorebook-btn" 
                   value="🔒 Cipher This Lorebook" 
                   title="Hide all entries (including collapsed ones)" />
            <input type="button" class="menu_button menu_button_icon lore-reveal-lorebook-btn" 
                   value="👁️ Reveal This Lorebook" 
                   title="Show all entries"
                   style="display: none;" />
        </div>
    `;
    
    if (lorebookContainer.firstChild) {
        lorebookContainer.insertBefore(buttonContainer, lorebookContainer.firstChild);
    } else {
        lorebookContainer.appendChild(buttonContainer);
    }
    
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

// Setup monitoring for UI changes
function setupWorldInfoMonitoring() {
    const observer = new MutationObserver(() => {
        attachSaveButtonListeners();
        injectLorebookButtons();
    });
    
    const containers = ['#world_info', '#world_popup', 'body'];
    
    for (const selector of containers) {
        const container = document.querySelector(selector);
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: true
            });
            break;
        }
    }
    
    attachSaveButtonListeners();
    injectLorebookButtons();
    
    setInterval(() => {
        injectLorebookButtons();
    }, 2000);
}

// Extension initialization
jQuery(async () => {
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
        $("#extensions_settings2").append(settingsHtml);
        
        $("#lore_spoilers_enabled").on("input", onEnabledChange);
        
        loadSettings();
        setupWorldInfoMonitoring();
        
        console.log(`[${extensionName}] Loaded successfully`);
    } catch (error) {
        console.error(`[${extensionName}] Failed to load:`, error);
    }
});
