/**
 * Advanced Content Script for Site-Specific XDF Data Extraction
 *
 * This file provides an example of how to customize the extraction logic
 * for a specific XDF mappack viewer. Copy and adapt this code to content.js
 * based on your website's structure.
 */

(function() {
  'use strict';

  let extractedData = [];

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanMaps') {
      scanForMaps(sendResponse);
      return true;
    } else if (request.action === 'extractData') {
      extractMapData(sendResponse);
      return true;
    } else if (request.action === 'getData') {
      sendResponse({ data: extractedData });
      return true;
    }
  });

  /**
   * Example 1: Extracting from a tree view or list
   * Adapt the selector to match your page structure
   */
  function scanForMaps_TreeView(sendResponse) {
    // Look for tree items, list items, or table rows
    const mapElements = document.querySelectorAll(
      '.tree-item, .map-item, li[data-map], tr[data-map-id]'
    );

    sendResponse({
      success: true,
      count: mapElements.length,
      message: `Found ${mapElements.length} maps in tree/list view`
    });
  }

  /**
   * Example 2: Extracting from a table with map data
   */
  function extractFromTable() {
    const data = [];
    const rows = document.querySelectorAll('table#mapTable tbody tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        data.push({
          name: cells[0].textContent.trim(),
          addressStart: cells[1].textContent.trim(),
          addressEnd: cells[2].textContent.trim(),
          dataType: cells[3].textContent.trim(),
          size: cells[4]?.textContent.trim() || ''
        });
      }
    });

    return data;
  }

  /**
   * Example 3: Simulating clicks to open property dialogs
   * WARNING: This approach may be slow and depends on page behavior
   */
  async function extractByClickingMaps() {
    const mapElements = document.querySelectorAll('.map-item');
    const data = [];

    for (let i = 0; i < mapElements.length; i++) {
      const element = mapElements[i];

      // Simulate right-click
      element.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window
      }));

      // Wait for properties dialog to appear
      await sleep(100);

      // Find and extract from the properties dialog
      const dialog = document.querySelector('.properties-dialog, [role="dialog"]');
      if (dialog) {
        const properties = extractPropertiesFromDialog(dialog);
        if (properties) {
          data.push(properties);
        }

        // Close the dialog
        const closeBtn = dialog.querySelector('.close, [aria-label="Close"]');
        if (closeBtn) closeBtn.click();
        await sleep(50);
      }
    }

    return data;
  }

  /**
   * Example 4: Extracting from a properties dialog
   */
  function extractPropertiesFromDialog(dialog) {
    const properties = {};

    // Method 1: Extract from labeled fields
    const labels = dialog.querySelectorAll('label, .property-label');
    labels.forEach(label => {
      const text = label.textContent.trim();
      const valueElement = label.nextElementSibling ||
                          label.querySelector('.value, input, span');

      if (valueElement) {
        const value = valueElement.value || valueElement.textContent.trim();
        properties[text] = value;
      }
    });

    // Method 2: Extract from definition list (dl/dt/dd)
    const terms = dialog.querySelectorAll('dt');
    terms.forEach(term => {
      const key = term.textContent.trim();
      const value = term.nextElementSibling?.textContent.trim();
      if (value) {
        properties[key] = value;
      }
    });

    // Method 3: Extract from data attributes
    const mapElement = dialog.querySelector('[data-address-start]');
    if (mapElement) {
      properties['Address Start'] = mapElement.getAttribute('data-address-start');
      properties['Address End'] = mapElement.getAttribute('data-address-end');
      properties['Data Type'] = mapElement.getAttribute('data-type');
    }

    return Object.keys(properties).length > 0 ? properties : null;
  }

  /**
   * Example 5: Using JavaScript API if available
   * Some pages might expose their data through JavaScript objects
   */
  function extractFromJavaScriptAPI() {
    // Check if the page exposes map data
    if (window.mapData || window.xdfData) {
      return window.mapData || window.xdfData;
    }

    // Try to access through global objects
    if (window.app && window.app.maps) {
      return window.app.maps.map(map => ({
        name: map.name,
        addressStart: map.startAddress,
        addressEnd: map.endAddress,
        dataType: map.type,
        size: map.size
      }));
    }

    return null;
  }

  /**
   * Example 6: Extracting from JSON embedded in the page
   */
  function extractFromEmbeddedJSON() {
    // Look for script tags containing JSON data
    const scripts = document.querySelectorAll('script[type="application/json"]');

    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.maps || data.mapData) {
          return data.maps || data.mapData;
        }
      } catch (e) {
        // Not valid JSON or not map data
        continue;
      }
    }

    return null;
  }

  /**
   * Main scan function - tries multiple strategies
   */
  function scanForMaps(sendResponse) {
    try {
      let count = 0;

      // Try different detection methods
      const methods = [
        () => document.querySelectorAll('.map-item, [data-map]').length,
        () => document.querySelectorAll('table tbody tr').length,
        () => document.querySelectorAll('li').length,
        () => {
          const data = extractFromJavaScriptAPI();
          return data ? data.length : 0;
        }
      ];

      for (const method of methods) {
        count = method();
        if (count > 0) break;
      }

      sendResponse({
        success: count > 0,
        count: count,
        message: count > 0
          ? `Found ${count} potential map elements`
          : 'No maps detected. You may need to customize the extraction logic.'
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Main extraction function - tries multiple strategies
   */
  function extractMapData(sendResponse) {
    try {
      extractedData = [];

      // Try extraction methods in order of reliability
      let data = extractFromJavaScriptAPI();
      if (!data) data = extractFromEmbeddedJSON();
      if (!data) data = extractFromTable();

      if (data && data.length > 0) {
        extractedData = data;
        sendResponse({
          success: true,
          count: data.length,
          data: data.slice(0, 5)
        });
      } else {
        sendResponse({
          success: false,
          error: 'Could not extract data. Please check the page structure.'
        });
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  // Helper function for delays
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  console.log('Advanced XDF Information Extractor loaded');
})();
