/**
 * @fileoverview Popup script for extension toggle and cache management
 * @module popup
 */

/** @constant {string} Storage key for extension toggle state */
const TOGGLE_KEY = 'extension_enabled';
/** @constant {string} Storage key for cache data */
const CACHE_KEY = 'twitter_location_cache';
/** @constant {boolean} Default enabled state */
const DEFAULT_ENABLED = true;
/** @constant {string} Extension enabled color */
const ENABLED_COLOR = '#1d9bf0';
/** @constant {string} Extension disabled color */
const DISABLED_COLOR = '#536471';
/** @constant {string} Storage key for blocked countries */
const BLOCKED_COUNTRIES_KEY = 'blocked_countries';

// Get elements
const toggleSwitch = document.getElementById('toggleSwitch');
const toggleText = document.getElementById('toggleText');
const cacheSize = document.getElementById('cacheSize');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const blockedCountriesInput = document.getElementById('blockedCountries');
const saveBlocklistBtn = document.getElementById('saveBlocklistBtn');

// Load current state
chrome.storage.local.get([TOGGLE_KEY, BLOCKED_COUNTRIES_KEY], (result) => {
  const isEnabled = result[TOGGLE_KEY] !== undefined ? result[TOGGLE_KEY] : DEFAULT_ENABLED;
  updateToggle(isEnabled);
  
  if (result[BLOCKED_COUNTRIES_KEY]) {
    blockedCountriesInput.value = result[BLOCKED_COUNTRIES_KEY];
  }
});

/**
 * Updates the cache size display in the popup
 */
function updateCacheSize() {
  chrome.storage.local.get([CACHE_KEY], (result) => {
    const cache = result[CACHE_KEY] || {};
    const count = Object.keys(cache).length;
    cacheSize.textContent = count;
  });
}

// Load cache size on popup open
updateCacheSize();

// Toggle click handler
toggleSwitch.addEventListener('click', () => {
  chrome.storage.local.get([TOGGLE_KEY], (result) => {
    const currentState = result[TOGGLE_KEY] !== undefined ? result[TOGGLE_KEY] : DEFAULT_ENABLED;
    const newState = !currentState;
    
    chrome.storage.local.set({ [TOGGLE_KEY]: newState }, () => {
      updateToggle(newState);
      
      // Notify content script to update
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'extensionToggle',
            enabled: newState
          }).catch(() => {
            // Tab might not have content script loaded yet, that's okay
          });
        }
      });
    });
  });
});

// Clear cache button handler
clearCacheBtn.addEventListener('click', () => {
  if (confirm('Clear all cached profiles? This cannot be undone.')) {
    chrome.storage.local.remove([CACHE_KEY], () => {
      console.log('Cache cleared from popup');
      updateCacheSize();
      alert('Cache cleared successfully!');
      
      // Notify content script to clear runtime caches
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'clearCache'
          }).catch(() => {
            // Tab might not have content script
          });
        });
      });
    });
  }
});

// Save blocklist button handler
saveBlocklistBtn.addEventListener('click', () => {
  const blocklistStr = blockedCountriesInput.value;
  chrome.storage.local.set({ [BLOCKED_COUNTRIES_KEY]: blocklistStr }, () => {
    console.log('Blocklist saved:', blocklistStr);
    
    // Provide visual feedback
    const originalText = saveBlocklistBtn.textContent;
    saveBlocklistBtn.textContent = 'Saved!';
    saveBlocklistBtn.style.background = '#00ba7c'; // Success green color
    
    setTimeout(() => {
      saveBlocklistBtn.textContent = originalText;
      saveBlocklistBtn.style.background = '';
    }, 2000);
    
    // Notify content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'updateBlocklist',
          blocklist: blocklistStr
        }).catch(() => {
          // Tab might not have content script
        });
      });
    });
  });
});

/**
 * Updates the toggle switch UI based on enabled state
 * @param {boolean} isEnabled - Whether the extension is enabled
 */
function updateToggle(isEnabled) {
  if (isEnabled) {
    toggleSwitch.classList.add('enabled');
    if (toggleText) toggleText.textContent = 'On';
  } else {
    toggleSwitch.classList.remove('enabled');
    if (toggleText) toggleText.textContent = 'Off';
  }
}

