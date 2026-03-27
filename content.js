// Content script that extracts XDF map data from the webpage
(function() {
  'use strict';

  // Store extracted data
  let extractedData = [];
  let mapElements = [];

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanMaps') {
      scanForMaps(sendResponse);
      return true; // Keep channel open for async response
    } else if (request.action === 'extractData') {
      extractMapData(sendResponse);
      return true;
    } else if (request.action === 'getData') {
      sendResponse({ data: extractedData });
      return true;
    }
  });

  // Scan the page to find maps
  function scanForMaps(sendResponse) {
    try {
      // Look for common patterns in XDF map viewers
      // This is a generic approach - may need customization based on actual website structure

      // Try different selectors that might contain map elements
      const possibleSelectors = [
        '[class*="map"]',
        '[id*="map"]',
        '[class*="item"]',
        '[data-map]',
        'li',
        'div[onclick]',
        'tr'
      ];

      mapElements = [];

      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0 && elements.length < 1000) {
          // Check if elements have properties that look like map data
          for (const elem of elements) {
            if (hasMapProperties(elem)) {
              mapElements.push(elem);
            }
          }
          if (mapElements.length > 0) break;
        }
      }

      // If no maps found with specific selectors, try to find clickable elements
      if (mapElements.length === 0) {
        mapElements = findClickableMapElements();
      }

      sendResponse({
        success: true,
        count: mapElements.length,
        message: `Found ${mapElements.length} potential map elements`
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  // Check if element has map-like properties
  function hasMapProperties(element) {
    const text = element.textContent || '';
    const attrs = Array.from(element.attributes).map(a => a.name + '=' + a.value).join(' ');

    // Look for keywords that might indicate map data
    const keywords = ['address', 'start', 'end', 'data', 'type', 'map', 'xdf'];
    const content = (text + ' ' + attrs).toLowerCase();

    return keywords.some(keyword => content.includes(keyword));
  }

  // Find clickable elements that might be maps
  function findClickableMapElements() {
    const clickableElements = document.querySelectorAll('[onclick], a, button, [role="button"]');
    const maps = [];

    for (const elem of clickableElements) {
      if (hasMapProperties(elem)) {
        maps.push(elem);
      }
    }

    return maps;
  }

  // Extract data from all maps
  async function extractMapData(sendResponse) {
    try {
      extractedData = [];

      // Strategy 1: Try to extract from JavaScript API or embedded JSON
      const apiData = extractFromJavaScriptAPI();
      if (apiData && apiData.length > 0) {
        extractedData = apiData;
        sendResponse({
          success: true,
          count: extractedData.length,
          data: extractedData
        });
        return;
      }

      // Strategy 2: Automatically click on each map and extract properties
      if (mapElements.length > 0) {
        await extractByClickingMaps(sendResponse);
        return;
      }

      // Strategy 3: Extract visible data from the page
      extractFromVisibleElements(sendResponse);

    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  // Check if element is visible
  function isVisible(elem) {
    return elem && elem.offsetParent !== null;
  }

  // Extract data from visible elements on the page
  function extractFromVisibleElements(sendResponse) {
    // Look for table rows or list items that might contain map data
    const rows = document.querySelectorAll('tr, li, .item, [class*="row"]');

    for (const row of rows) {
      const data = extractDataFromElement(row);
      if (data && Object.keys(data).length > 0) {
        extractedData.push(data);
      }
    }

    if (extractedData.length > 0) {
      sendResponse({
        success: true,
        count: extractedData.length,
        data: extractedData
      });
    } else {
      sendResponse({
        success: false,
        error: 'No map data found. Please ensure you are on the correct page.'
      });
    }
  }

  // Extract structured data from an element
  function extractDataFromElement(element) {
    const data = {};

    // Try to find labeled data (e.g., "Address Start: 0x1000")
    const text = element.textContent || '';
    const patterns = [
      { regex: /address\s*start[:\s]+([0-9a-fx]+)/i, key: 'Address Start' },
      { regex: /address\s*end[:\s]+([0-9a-fx]+)/i, key: 'Address End' },
      { regex: /data\s*type[:\s]+([^\n,]+)/i, key: 'Data Type' },
      { regex: /type[:\s]+([^\n,]+)/i, key: 'Type' },
      { regex: /size[:\s]+([0-9]+)/i, key: 'Size' },
      { regex: /name[:\s]+([^\n,]+)/i, key: 'Name' }
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        data[pattern.key] = match[1].trim();
      }
    }

    // Also try to extract from data attributes
    if (element.attributes) {
      for (const attr of element.attributes) {
        if (attr.name.startsWith('data-')) {
          const key = attr.name.replace('data-', '').replace(/-/g, ' ');
          data[key] = attr.value;
        }
      }
    }

    return data;
  }

  // Helper function for delays
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Extract data by automatically clicking on each map
  async function extractByClickingMaps(sendResponse) {
    try {
      const totalMaps = mapElements.length;
      console.log(`Starting automated extraction from ${totalMaps} maps...`);

      for (let i = 0; i < mapElements.length; i++) {
        const element = mapElements[i];

        // Check if element is still connected to the DOM
        if (!element.isConnected) {
          console.warn(`Map element ${i} is no longer in the DOM, skipping...`);
          continue;
        }

        // Try multiple interaction methods
        // Method 1: Regular click
        element.click();
        await sleep(150);

        // Check if a properties panel appeared
        let properties = extractPropertiesFromDialog();

        if (!properties || Object.keys(properties).length === 0) {
          // Method 2: Try right-click (contextmenu event)
          element.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 2
          }));
          await sleep(150);

          properties = extractPropertiesFromDialog();
        }

        if (!properties || Object.keys(properties).length === 0) {
          // Method 3: Try double-click
          element.dispatchEvent(new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
            view: window
          }));
          await sleep(150);

          properties = extractPropertiesFromDialog();
        }

        // If we got properties, add them to the extracted data
        if (properties && Object.keys(properties).length > 0) {
          extractedData.push(properties);
        }

        // Try to close any open dialog/panel to prepare for the next map
        closePropertyDialog();
        await sleep(50);

        // Update progress every 10 maps
        if ((i + 1) % 10 === 0) {
          console.log(`Extracted ${i + 1}/${totalMaps} maps...`);
        }
      }

      if (extractedData.length > 0) {
        sendResponse({
          success: true,
          count: extractedData.length,
          data: extractedData
        });
      } else {
        // Fallback to visible elements extraction
        extractFromVisibleElements(sendResponse);
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: 'Automated extraction failed: ' + error.message
      });
    }
  }

  // Extract properties from a dialog/panel that appears after clicking
  function extractPropertiesFromDialog() {
    const properties = {};

    try {
      // Look for property dialogs with multiple selector strategies
      const dialogSelectors = [
        '[class*="properties"]',
        '[class*="dialog"]',
        '[class*="modal"]',
        '[class*="panel"]',
        '[id*="properties"]',
        '[id*="dialog"]',
        '[role="dialog"]',
        '.popup',
        '.overlay'
      ];

      let dialog = null;
      for (const selector of dialogSelectors) {
        const elem = document.querySelector(selector);
        if (elem && isVisible(elem)) {
          dialog = elem;
          break;
        }
      }

      if (!dialog) {
        // Try to find the most recently added visible element
        // (properties panel might be dynamically added)
        const allDivs = document.querySelectorAll('div');
        for (let i = allDivs.length - 1; i >= Math.max(0, allDivs.length - 20); i--) {
          const div = allDivs[i];
          if (isVisible(div) && div.childElementCount > 3) {
            dialog = div;
            break;
          }
        }
      }

      if (!dialog) {
        return properties;
      }

      // Method 1: Extract from label/input pairs
      const labels = dialog.querySelectorAll('label');
      labels.forEach(label => {
        try {
          const labelText = label.textContent ? label.textContent.trim().replace(/[:：]/g, '') : '';

          // Try to find associated input or value element
          let valueElement = null;

          // Check for 'for' attribute
          if (label.htmlFor) {
            valueElement = document.getElementById(label.htmlFor);
          }

          // Check next sibling
          if (!valueElement) {
            valueElement = label.nextElementSibling;
          }

          // Check children
          if (!valueElement) {
            valueElement = label.querySelector('input, span, .value');
          }

          if (valueElement) {
            const value = valueElement.value || (valueElement.textContent ? valueElement.textContent.trim() : '');
            if (value && labelText) {
              properties[labelText] = value;
            }
          }
        } catch (e) {
          // Skip this label if there's an error
        }
      });

      // Method 2: Extract from input elements with name attributes
      const inputs = dialog.querySelectorAll('input[name], select[name], textarea[name]');
      inputs.forEach(input => {
        try {
          const name = input.name || input.getAttribute('placeholder') || '';
          const value = input.value || input.textContent || '';
          if (name && value) {
            properties[name] = value;
          }
        } catch (e) {
          // Skip this input if there's an error
        }
      });

      // Method 3: Extract from definition lists (dl/dt/dd)
      const terms = dialog.querySelectorAll('dt');
      terms.forEach(term => {
        try {
          const key = term.textContent ? term.textContent.trim().replace(/[:：]/g, '') : '';
          const dd = term.nextElementSibling;
          if (dd && dd.tagName === 'DD') {
            const value = dd.textContent ? dd.textContent.trim() : '';
            if (key && value) {
              properties[key] = value;
            }
          }
        } catch (e) {
          // Skip this term if there's an error
        }
      });

      // Method 4: Extract from key-value pair patterns in text
      const textContent = dialog.textContent || '';
      const lines = textContent.split('\n');
      lines.forEach(line => {
        try {
          const colonMatch = line.match(/^([^:：]+)[:：]\s*(.+)$/);
          if (colonMatch && colonMatch[1] && colonMatch[2]) {
            const key = colonMatch[1].trim();
            const value = colonMatch[2].trim();
            if (key && value && !properties[key]) {
              properties[key] = value;
            }
          }
        } catch (e) {
          // Skip this line if there's an error
        }
      });

      // Method 5: Extract from data attributes on the dialog itself
      if (dialog.dataset) {
        try {
          Object.keys(dialog.dataset).forEach(key => {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
            properties[formattedKey] = dialog.dataset[key];
          });
        } catch (e) {
          // Skip dataset extraction if there's an error
        }
      }
    } catch (error) {
      console.warn('Error extracting properties from dialog:', error.message);
    }

    return properties;
  }

  // Try to close any open property dialog
  function closePropertyDialog() {
    // Common close button selectors
    const closeSelectors = [
      '.close',
      '.close-button',
      '[aria-label="Close"]',
      '[aria-label="close"]',
      '.modal-close',
      '.dialog-close',
      'button.close',
      '[class*="close"]'
    ];

    for (const selector of closeSelectors) {
      const closeBtn = document.querySelector(selector);
      if (closeBtn && isVisible(closeBtn)) {
        closeBtn.click();
        return;
      }
    }

    // Try pressing Escape key
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      bubbles: true
    }));
  }

  // Extract from JavaScript API if available
  function extractFromJavaScriptAPI() {
    // Check common global variable names
    const possibleAPIs = [
      'mapData',
      'xdfData',
      'maps',
      'xdfMaps',
      'mapList'
    ];

    for (const apiName of possibleAPIs) {
      if (window[apiName] && Array.isArray(window[apiName])) {
        return window[apiName];
      }
    }

    // Check for nested structures
    if (window.app && window.app.maps) {
      return window.app.maps;
    }

    if (window.data && window.data.maps) {
      return window.data.maps;
    }

    // Try to extract from embedded JSON
    const scripts = document.querySelectorAll('script[type="application/json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.maps || data.mapData) {
          return data.maps || data.mapData;
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  // Signal that content script is loaded
  console.log('XDF Information Extractor content script loaded');
})();
