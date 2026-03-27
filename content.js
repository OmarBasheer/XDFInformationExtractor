// Content script that extracts XDF map data from the webpage
(function() {
  'use strict';

  // Store extracted data
  let extractedData = [];

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

      let maps = [];

      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0 && elements.length < 1000) {
          // Check if elements have properties that look like map data
          for (const elem of elements) {
            if (hasMapProperties(elem)) {
              maps.push(elem);
            }
          }
          if (maps.length > 0) break;
        }
      }

      // If no maps found with specific selectors, try to find clickable elements
      if (maps.length === 0) {
        maps = findClickableMapElements();
      }

      sendResponse({
        success: true,
        count: maps.length,
        message: `Found ${maps.length} potential map elements`
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
  function extractMapData(sendResponse) {
    try {
      extractedData = [];

      // Strategy 1: Look for a properties dialog or panel
      const propertyDialog = findPropertyDialog();

      if (propertyDialog) {
        extractFromPropertyDialog(sendResponse);
        return;
      }

      // Strategy 2: Try to trigger right-click context menu programmatically
      // This is complex and may not work on all sites due to security restrictions

      // Strategy 3: Extract visible data from the page
      extractFromVisibleElements(sendResponse);

    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  // Find property dialog or panel
  function findPropertyDialog() {
    const selectors = [
      '[class*="properties"]',
      '[class*="dialog"]',
      '[id*="properties"]',
      '[id*="dialog"]',
      '.modal',
      '[role="dialog"]'
    ];

    for (const selector of selectors) {
      const elem = document.querySelector(selector);
      if (elem && isVisible(elem)) {
        return elem;
      }
    }
    return null;
  }

  // Check if element is visible
  function isVisible(elem) {
    return elem && elem.offsetParent !== null;
  }

  // Extract data from property dialog
  function extractFromPropertyDialog(sendResponse) {
    // This would need to be customized based on the actual dialog structure
    sendResponse({
      success: false,
      error: 'Property dialog extraction requires manual implementation based on website structure'
    });
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
        data: extractedData.slice(0, 5) // Send preview of first 5 items
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
      /address\s*start[:\s]+([0-9a-fx]+)/i,
      /address\s*end[:\s]+([0-9a-fx]+)/i,
      /data\s*type[:\s]+([^\n,]+)/i,
      /type[:\s]+([^\n,]+)/i,
      /size[:\s]+([0-9]+)/i,
      /name[:\s]+([^\n,]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const key = pattern.source.split('[')[0].replace(/\\/g, '').trim();
        data[key] = match[1].trim();
      }
    }

    // Also try to extract from data attributes
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        const key = attr.name.replace('data-', '').replace(/-/g, ' ');
        data[key] = attr.value;
      }
    }

    return data;
  }

  // Signal that content script is loaded
  console.log('XDF Information Extractor content script loaded');
})();
