// Import from SillyTavern core
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// Extension name MUST match folder name
const extensionName = "lore-spoilers";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Default settings
const defaultSettings = {
    enabled: false,
    cipherShift: 13
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
    $("#lore_spoilers_shift").val(extension_settings[extensionName].cipherShift);
}

// Handle enable checkbox change
function onEnabledChange(event) {
    const value = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].enabled = value;
    saveSettingsDebounced();
}

// Handle cipher shift change
function onCipherShiftChange(event) {
    let value = parseInt($(event.target).val());
    if (isNaN(value) || value < 1) value = 1;
    if (value > 25) value = 25;
    extension_settings[extensionName].cipherShift = value;
    $("#lore_spoilers_shift").val(value);
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

// Handle clicking "Cipher Entire Lorebook" button
function onCipherAllClick() {
    console.log('[lore-spoilers] onCipherAllClick called');
    
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return;
    }
    
    const worldInfoContainer = document.querySelector('#world_popup') || 
                               document.querySelector('#world_info') ||
                               document.querySelector('.world_entries_container');
    
    if (!worldInfoContainer) {
        toastr.warning("Could not find World Info panel. Make sure it's open.", "Lore Spoilers");
        return;
    }
    
    const textareas = worldInfoContainer.querySelectorAll('textarea[name="content"]');
    console.log(`[lore-spoilers] Found ${textareas.length} textareas`);
    
    if (textareas.length === 0) {
        toastr.warning("No expanded entries found. Please expand all entries first.", "Lore Spoilers");
        return;
    }
    
    let cipheredCount = 0;
    const shift = extension_settings[extensionName].cipherShift;
    
    textareas.forEach((textarea, idx) => {
        const currentValue = textarea.value;
        
        if (!currentValue || !currentValue.trim()) {
            return;
        }
        
        const textareaId = textarea.getAttribute('data-lore-spoiler-id') || `lore_${Date.now()}_${idx}`;
        textarea.setAttribute('data-lore-spoiler-id', textareaId);
        
        const ciphered = caesarCipher(currentValue, shift);
        
        displayCipheredTextareas.set(textareaId, {
            plaintext: currentValue,
            ciphered: ciphered,
            isRevealed: false
        });
        
        textarea.value = ciphered;
        cipheredCount++;
    });
    
    if (cipheredCount > 0) {
        toastr.success(`Ciphered ${cipheredCount} ${cipheredCount === 1 ? 'entry' : 'entries'}`, "Lore Spoilers");
    } else {
        toastr.info("No entries with content found", "Lore Spoilers");
    }
}

// Handle clicking "Reveal Entire Lorebook" button
function onRevealAllClick() {
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return;
    }
    
    let revealedCount = 0;
    
    displayCipheredTextareas.forEach((data, textareaId) => {
        const textarea = document.querySelector(`textarea[data-lore-spoiler-id="${textareaId}"]`);
        
        if (textarea && !data.isRevealed) {
            textarea.value = data.plaintext;
            data.isRevealed = true;
            revealedCount++;
        }
    });
    
    if (revealedCount > 0) {
        toastr.success(`Revealed ${revealedCount} ${revealedCount === 1 ? 'entry' : 'entries'}`, "Lore Spoilers");
    } else {
        toastr.info("No ciphered entries to reveal", "Lore Spoilers");
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
                   title="Hide all expanded entries (expand all entries first)" />
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
        $("#lore_spoilers_shift").on("input", onCipherShiftChange);
        
        loadSettings();
        setupWorldInfoMonitoring();
        
        console.log(`[${extensionName}] Loaded successfully`);
    } catch (error) {
        console.error(`[${extensionName}] Failed to load:`, error);
    }
});
