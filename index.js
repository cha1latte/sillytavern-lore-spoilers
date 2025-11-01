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

// Apply blur to all World Info content to prevent spoilers during expansion
function blurAllContent() {
    const style = document.createElement('style');
    style.id = 'lore-spoilers-blur-style';
    style.textContent = `
        textarea[name="content"],
        textarea[id^="world_entry_content"] {
            filter: blur(10px) !important;
            user-select: none !important;
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(style);
}

// Remove blur from content
function unblurAllContent() {
    const style = document.getElementById('lore-spoilers-blur-style');
    if (style) {
        style.remove();
    }
}

// Expand all entries and cipher them automatically
async function onExpandAndCipherClick() {
    console.log('[lore-spoilers] onExpandAndCipherClick called');
    
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return;
    }
    
    try {
        const worldInfoContainer = document.querySelector('#world_popup') || 
                                   document.querySelector('#world_info');
        
        if (!worldInfoContainer) {
            toastr.warning("Could not find World Info panel. Make sure it's open.", "Lore Spoilers");
            return;
        }
        
        // Apply blur first to prevent seeing content
        blurAllContent();
        toastr.info("Expanding entries (content hidden)...", "Lore Spoilers", {timeOut: 2000});
        
        // Wait a moment for blur to apply
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set pagination to 1000/page to ensure we get all entries
        console.log('[lore-spoilers] Looking for pagination selector...');
        let paginationSelect = worldInfoContainer.querySelector('.J-paginationjs-size-select');
        
        if (!paginationSelect) {
            // Try document-wide search
            paginationSelect = document.querySelector('.J-paginationjs-size-select');
            console.log('[lore-spoilers] Tried document-wide:', paginationSelect);
        }
        
        if (!paginationSelect) {
            // Try other common selectors
            paginationSelect = document.querySelector('select[class*="pagination"]') ||
                              document.querySelector('select option[value="1000"]')?.parentElement;
            console.log('[lore-spoilers] Tried alternative selectors:', paginationSelect);
        }
        
        if (paginationSelect) {
            console.log('[lore-spoilers] Found pagination select:', paginationSelect);
            console.log('[lore-spoilers] Current value:', paginationSelect.value);
            console.log('[lore-spoilers] Available options:', Array.from(paginationSelect.options).map(o => o.value));
            
            const option1000 = Array.from(paginationSelect.options).find(opt => opt.value === '1000');
            if (option1000) {
                paginationSelect.value = '1000';
                
                // Try multiple ways to trigger the change
                paginationSelect.dispatchEvent(new Event('change', { bubbles: true }));
                paginationSelect.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Try jQuery trigger if available
                if (typeof $ !== 'undefined') {
                    $(paginationSelect).trigger('change');
                }
                
                console.log('[lore-spoilers] Set pagination to 1000/page');
                
                // Wait longer for pagination to update
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log('[lore-spoilers] No 1000/page option found');
            }
        } else {
            console.log('[lore-spoilers] Could not find pagination selector');
        }
        
        // Find all collapsed entries (entries without visible content textarea)
        const allEntries = worldInfoContainer.querySelectorAll('.world_entry:not(#entry_edit_template)');
        console.log(`[lore-spoilers] Found ${allEntries.length} total entries`);
        
        let expandedCount = 0;
        
        // Click to expand each collapsed entry
        for (const entry of allEntries) {
            const contentTextarea = entry.querySelector('textarea[name="content"]');
            
            // If no content textarea visible, this entry is collapsed
            if (!contentTextarea || !contentTextarea.offsetParent) {
                // Find and click the expand button
                const expandButton = entry.querySelector('.world_entry_form_header, .world_entry_form_control, .inline-drawer-toggle');
                if (expandButton) {
                    expandButton.click();
                    expandedCount++;
                    // Small delay between clicks
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
        }
        
        console.log(`[lore-spoilers] Expanded ${expandedCount} entries`);
        
        // Wait for DOM to update with all textareas
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Now cipher all the expanded content
        const textareas = worldInfoContainer.querySelectorAll('textarea[name="content"]');
        console.log(`[lore-spoilers] Found ${textareas.length} textareas to cipher`);
        
        if (textareas.length === 0) {
            unblurAllContent();
            toastr.warning("No entries found to cipher.", "Lore Spoilers");
            return;
        }
        
        let cipheredCount = 0;
        const shift = 13;
        
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
        
        // Remove blur now that content is ciphered
        unblurAllContent();
        
        console.log(`[lore-spoilers] Ciphered ${cipheredCount} entries`);
        
        if (cipheredCount > 0) {
            toastr.success(`✅ Ciphered ${cipheredCount} ${cipheredCount === 1 ? 'entry' : 'entries'} without spoiling!`, "Lore Spoilers", {timeOut: 4000});
        } else {
            toastr.info("No entries with content found", "Lore Spoilers");
        }
        
    } catch (error) {
        unblurAllContent();
        console.error('[lore-spoilers] Error:', error);
        toastr.error(`Failed: ${error.message}`, "Lore Spoilers");
    }
}

// Handle clicking "Cipher Entire Lorebook" button (for already-expanded entries)
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
        toastr.warning("No expanded entries found. Please expand entries first (use Expand All button).", "Lore Spoilers", {timeOut: 5000});
        return;
    }
    
    let cipheredCount = 0;
    const shift = 13; // Fixed ROT13
    
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
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <input type="button" class="menu_button menu_button_icon lore-expand-cipher-btn" 
                   value="🔒 Expand & Cipher All" 
                   title="Automatically expand all entries and cipher them (content stays hidden)" 
                   style="background: var(--SmartThemeBlurTintColor); font-weight: bold;" />
            <input type="button" class="menu_button menu_button_icon lore-reveal-all-btn" 
                   value="👁️ Reveal All" 
                   title="Show all ciphered entries"
                   style="display: none; background: var(--SmartThemeBlurTintColor); font-weight: bold;" />
        </div>
    `;
    
    if (lorebookContainer.firstChild) {
        lorebookContainer.insertBefore(buttonContainer, lorebookContainer.firstChild);
    } else {
        lorebookContainer.appendChild(buttonContainer);
    }
    
    const expandCipherBtn = buttonContainer.querySelector('.lore-expand-cipher-btn');
    const revealBtn = buttonContainer.querySelector('.lore-reveal-all-btn');
    
    expandCipherBtn.addEventListener('click', async () => {
        await onExpandAndCipherClick();
        expandCipherBtn.style.display = 'none';
        revealBtn.style.display = 'inline-block';
    });
    
    revealBtn.addEventListener('click', () => {
        onRevealAllClick();
        revealBtn.style.display = 'none';
        expandCipherBtn.style.display = 'inline-block';
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
