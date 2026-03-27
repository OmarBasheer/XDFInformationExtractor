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

  // Scan the page to find maps - NEW ROBUST APPROACH
  function scanForMaps(sendResponse) {
    try {
      console.log('=== XDF Map Detection Starting ===');
      mapElements = [];

      // Strategy 1: Analyze DOM structure for repeating patterns
      const patternCandidates = findRepeatingPatterns();
      console.log('Pattern candidates found:', patternCandidates.length);

      // Strategy 2: Look for elements with XDF-specific keywords
      const keywordCandidates = findElementsWithXDFKeywords();
      console.log('Keyword candidates found:', keywordCandidates.length);

      // Strategy 3: Find clickable/interactive elements
      const interactiveCandidates = findInteractiveElements();
      console.log('Interactive candidates found:', interactiveCandidates.length);

      // Strategy 4: Look for structured data (tables, lists, grids)
      const structuredCandidates = findStructuredDataElements();
      console.log('Structured data candidates found:', structuredCandidates.length);

      // Strategy 5: Analyze visual layout for grid/list patterns
      const visualCandidates = findVisualPatterns();
      console.log('Visual pattern candidates found:', visualCandidates.length);

      // Combine and score all candidates
      const allCandidates = [
        ...patternCandidates,
        ...keywordCandidates,
        ...interactiveCandidates,
        ...structuredCandidates,
        ...visualCandidates
      ];

      // Remove duplicates and score each element
      const scoredElements = scoreAndDeduplicateCandidates(allCandidates);
      console.log('Total unique candidates:', scoredElements.length);

      // Filter by score threshold and select the best set
      mapElements = selectBestMapElements(scoredElements);

      console.log('=== Detection Complete ===');
      console.log('Final map elements selected:', mapElements.length);

      // Log details about detected elements for debugging
      if (mapElements.length > 0) {
        logDetectionDetails(mapElements);
      } else {
        console.warn('No map elements detected. Try these debugging commands:');
        console.log('1. window.xdfDebugShowCandidates() - Show all candidate elements');
        console.log('2. window.xdfDebugAnalyzePage() - Analyze page structure');
        console.log('3. Click on an element and run: window.xdfDebugMarkElement($0) - Mark clicked element as map');
      }

      sendResponse({
        success: true,
        count: mapElements.length,
        message: `Found ${mapElements.length} potential map elements using intelligent detection`
      });
    } catch (error) {
      console.error('Map detection error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  // ============ NEW DETECTION STRATEGIES ============

  // Strategy 1: Find repeating patterns in DOM structure
  function findRepeatingPatterns() {
    const candidates = [];
    const elementsAnalyzed = new Map(); // tag -> array of elements

    // Group elements by tag name
    const commonTags = ['div', 'li', 'tr', 'span', 'a', 'article', 'section'];
    commonTags.forEach(tag => {
      const elements = Array.from(document.querySelectorAll(tag));
      if (elements.length >= 10 && elements.length <= 5000) {
        elementsAnalyzed.set(tag, elements);
      }
    });

    // Find elements with similar structure (same children, similar attributes)
    elementsAnalyzed.forEach((elements, tag) => {
      const similarGroups = groupBySimilarStructure(elements);

      // Keep groups with at least 10 similar elements
      similarGroups.forEach(group => {
        if (group.length >= 10) {
          candidates.push(...group);
        }
      });
    });

    return candidates;
  }

  // Group elements by similar DOM structure
  function groupBySimilarStructure(elements) {
    const groups = [];
    const signatures = new Map(); // signature -> array of elements

    elements.forEach(elem => {
      const sig = getElementStructureSignature(elem);
      if (!signatures.has(sig)) {
        signatures.set(sig, []);
      }
      signatures.get(sig).push(elem);
    });

    signatures.forEach(group => {
      if (group.length >= 10) {
        groups.push(group);
      }
    });

    return groups;
  }

  // Create a signature for an element's structure
  function getElementStructureSignature(elem) {
    const childTags = Array.from(elem.children).map(c => c.tagName).join(',');
    const classPattern = elem.className ? elem.className.split(' ').sort().join(' ') : '';
    const attrCount = elem.attributes.length;
    return `${elem.tagName}|${childTags}|${classPattern}|${attrCount}`;
  }

  // Strategy 2: Find elements with XDF/map-specific keywords
  function findElementsWithXDFKeywords() {
    const candidates = [];

    // Keywords that suggest XDF map data
    const strongKeywords = ['xdf', 'mappack', 'calibration', 'tuning', 'ecu'];
    const mediumKeywords = ['address', 'offset', 'hexadecimal', '0x', 'byte', 'word'];
    const weakKeywords = ['map', 'table', 'data', 'value', 'parameter'];

    // Search through all elements
    const allElements = document.querySelectorAll('*');

    allElements.forEach(elem => {
      if (elem.children.length > 20) return; // Skip container elements

      const text = (elem.textContent || '').toLowerCase();
      const attrs = Array.from(elem.attributes)
        .map(a => a.name + '=' + a.value)
        .join(' ')
        .toLowerCase();
      const content = text + ' ' + attrs;

      // Score based on keyword matches
      let score = 0;
      strongKeywords.forEach(kw => {
        if (content.includes(kw)) score += 10;
      });
      mediumKeywords.forEach(kw => {
        if (content.includes(kw)) score += 5;
      });
      weakKeywords.forEach(kw => {
        if (content.includes(kw)) score += 2;
      });

      // Bonus for hexadecimal patterns
      if (/0x[0-9a-f]+/i.test(content)) score += 5;

      if (score >= 7) {
        candidates.push(elem);
      }
    });

    return candidates;
  }

  // Strategy 3: Find interactive/clickable elements
  function findInteractiveElements() {
    const candidates = [];

    // Find elements with event listeners or interactive attributes
    const selectors = [
      '[onclick]',
      '[oncontextmenu]',
      '[ondblclick]',
      'a[href]',
      'button',
      '[role="button"]',
      '[role="row"]',
      '[role="gridcell"]',
      '[tabindex]',
      '.clickable',
      '.selectable',
      '[data-id]',
      '[data-key]'
    ];

    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(elem => {
          // Filter out navigation and common UI elements
          if (!isLikelyNavigationElement(elem)) {
            candidates.push(elem);
          }
        });
      } catch (e) {
        // Skip invalid selectors
      }
    });

    return candidates;
  }

  // Check if element is likely a navigation element
  function isLikelyNavigationElement(elem) {
    const text = (elem.textContent || '').toLowerCase();
    const navKeywords = ['home', 'menu', 'login', 'logout', 'settings', 'help', 'about', 'contact', 'search'];

    // Short text that matches nav keywords
    if (text.length < 50 && navKeywords.some(kw => text.includes(kw))) {
      return true;
    }

    // In header, nav, or footer
    const parent = elem.closest('header, nav, footer');
    if (parent) return true;

    return false;
  }

  // Strategy 4: Find structured data elements
  function findStructuredDataElements() {
    const candidates = [];

    // Table rows
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tbody tr');
      if (rows.length >= 10 && rows.length <= 10000) {
        // Check if rows contain data-like content
        const firstRow = rows[0];
        if (firstRow && seemsLikeDataRow(firstRow)) {
          candidates.push(...Array.from(rows));
        }
      }
    });

    // List items
    const lists = document.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const items = list.querySelectorAll('li');
      if (items.length >= 10 && items.length <= 10000) {
        const firstItem = items[0];
        if (firstItem && seemsLikeDataItem(firstItem)) {
          candidates.push(...Array.from(items));
        }
      }
    });

    // Grid layouts (divs with similar structure)
    const grids = document.querySelectorAll('[class*="grid"], [class*="list"], [class*="container"]');
    grids.forEach(grid => {
      const children = Array.from(grid.children);
      if (children.length >= 10 && children.length <= 10000) {
        // Check if children are similar
        const groups = groupBySimilarStructure(children);
        groups.forEach(group => {
          if (group.length >= 10) {
            candidates.push(...group);
          }
        });
      }
    });

    return candidates;
  }

  // Check if a table row seems to contain data
  function seemsLikeDataRow(row) {
    const cells = row.querySelectorAll('td, th');
    if (cells.length === 0) return false;

    // Check for data patterns
    let hasNumbers = false;
    let hasText = false;

    cells.forEach(cell => {
      const text = cell.textContent.trim();
      if (/[0-9]/.test(text)) hasNumbers = true;
      if (/[a-z]/i.test(text)) hasText = true;
    });

    return hasNumbers || hasText;
  }

  // Check if a list item seems to contain data
  function seemsLikeDataItem(item) {
    const text = item.textContent.trim();

    // Has some content
    if (text.length === 0) return false;

    // Not too long (probably not a paragraph)
    if (text.length > 500) return false;

    // Contains some structure (child elements or formatting)
    if (item.children.length > 0) return true;

    // Contains colon (key-value pair indicator)
    if (text.includes(':')) return true;

    return true;
  }

  // Strategy 5: Analyze visual patterns
  function findVisualPatterns() {
    const candidates = [];

    try {
      // Find elements that are positioned in a regular grid or list
      const allVisibleElements = Array.from(document.querySelectorAll('*')).filter(elem => {
        return isVisible(elem) && !isContainerElement(elem);
      });

      // Group by similar position patterns (Y-coordinate)
      const rows = groupByYPosition(allVisibleElements);

      // Find rows with many similar elements
      rows.forEach(row => {
        if (row.length >= 5) {
          // Check if elements in row are similar
          const groups = groupBySimilarStructure(row);
          groups.forEach(group => {
            if (group.length >= 5) {
              candidates.push(...group);
            }
          });
        }
      });
    } catch (e) {
      console.warn('Visual pattern detection error:', e);
    }

    return candidates;
  }

  // Group elements by Y position (rows)
  function groupByYPosition(elements) {
    const rows = new Map();
    const tolerance = 10; // pixels

    elements.forEach(elem => {
      try {
        const rect = elem.getBoundingClientRect();
        const y = Math.round(rect.top / tolerance) * tolerance;

        if (!rows.has(y)) {
          rows.set(y, []);
        }
        rows.get(y).push(elem);
      } catch (e) {
        // Skip elements that can't be measured
      }
    });

    return Array.from(rows.values());
  }

  // Check if element is a container (many children)
  function isContainerElement(elem) {
    return elem.children.length > 20;
  }

  // Score and deduplicate candidates
  function scoreAndDeduplicateCandidates(candidates) {
    const elementScores = new Map(); // element -> score object

    candidates.forEach(elem => {
      if (!elementScores.has(elem)) {
        elementScores.set(elem, {
          element: elem,
          score: 0,
          reasons: []
        });
      }

      const scoreObj = elementScores.get(elem);
      scoreObj.score += 1;
    });

    // Enhance scoring with additional factors
    elementScores.forEach((scoreObj, elem) => {
      // Boost score for elements with data attributes
      if (elem.dataset && Object.keys(elem.dataset).length > 0) {
        scoreObj.score += 2;
        scoreObj.reasons.push('has data attributes');
      }

      // Boost score for elements with specific classes
      const className = elem.className || '';
      if (/item|row|entry|record|map/i.test(className)) {
        scoreObj.score += 3;
        scoreObj.reasons.push('has relevant class name');
      }

      // Boost score for visible elements
      if (isVisible(elem)) {
        scoreObj.score += 2;
        scoreObj.reasons.push('is visible');
      }

      // Penalize very small elements
      try {
        const rect = elem.getBoundingClientRect();
        if (rect.width < 20 || rect.height < 10) {
          scoreObj.score -= 5;
          scoreObj.reasons.push('too small');
        }
      } catch (e) {
        // Skip
      }

      // Penalize elements with no text content
      if (!elem.textContent || elem.textContent.trim().length === 0) {
        scoreObj.score -= 3;
        scoreObj.reasons.push('no text content');
      }
    });

    return Array.from(elementScores.values());
  }

  // Select the best set of map elements
  function selectBestMapElements(scoredElements) {
    // Sort by score descending
    scoredElements.sort((a, b) => b.score - a.score);

    // Group by parent to find consistent sets
    const parentGroups = new Map();

    scoredElements.forEach(scoreObj => {
      const parent = scoreObj.element.parentElement;
      if (parent) {
        if (!parentGroups.has(parent)) {
          parentGroups.set(parent, []);
        }
        parentGroups.get(parent).push(scoreObj);
      }
    });

    // Find the largest group with good scores
    let bestGroup = [];
    let bestGroupScore = 0;

    parentGroups.forEach((group, parent) => {
      if (group.length >= 10) {
        const avgScore = group.reduce((sum, s) => sum + s.score, 0) / group.length;
        const groupScore = group.length * avgScore;

        if (groupScore > bestGroupScore) {
          bestGroup = group;
          bestGroupScore = groupScore;
        }
      }
    });

    // If we found a good group, use it
    if (bestGroup.length >= 10) {
      console.log('Selected group with', bestGroup.length, 'elements, avg score:',
                  (bestGroupScore / bestGroup.length).toFixed(2));
      return bestGroup.map(s => s.element);
    }

    // Otherwise, take top-scored elements that have decent scores
    const threshold = Math.max(5, scoredElements[0]?.score * 0.6 || 5);
    const selected = scoredElements
      .filter(s => s.score >= threshold)
      .slice(0, 1000) // Limit to reasonable number
      .map(s => s.element);

    return selected;
  }

  // Log details about detected elements
  function logDetectionDetails(elements) {
    console.log('=== Detection Details ===');
    console.log('Total elements:', elements.length);

    if (elements.length > 0) {
      const sample = elements[0];
      console.log('Sample element:', sample);
      console.log('Tag:', sample.tagName);
      console.log('Classes:', sample.className);
      console.log('Parent:', sample.parentElement?.tagName);
      console.log('Text preview:', sample.textContent?.substring(0, 100));
    }

    // Show element distribution
    const tagCounts = {};
    elements.forEach(elem => {
      const tag = elem.tagName;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    console.log('Element types:', tagCounts);
  }

  // ============ DEBUGGING FUNCTIONS ============

  // Make debugging functions available globally
  window.xdfDebugShowCandidates = function() {
    console.log('Analyzing page for all possible candidates...');

    const pattern = findRepeatingPatterns();
    const keyword = findElementsWithXDFKeywords();
    const interactive = findInteractiveElements();
    const structured = findStructuredDataElements();
    const visual = findVisualPatterns();

    console.log('Pattern candidates:', pattern.length, pattern);
    console.log('Keyword candidates:', keyword.length, keyword);
    console.log('Interactive candidates:', interactive.length, interactive);
    console.log('Structured candidates:', structured.length, structured);
    console.log('Visual candidates:', visual.length, visual);

    return {
      pattern,
      keyword,
      interactive,
      structured,
      visual
    };
  };

  window.xdfDebugAnalyzePage = function() {
    console.log('=== Page Structure Analysis ===');

    // Count element types
    const tags = {};
    document.querySelectorAll('*').forEach(elem => {
      const tag = elem.tagName;
      tags[tag] = (tags[tag] || 0) + 1;
    });
    console.log('Element counts:', tags);

    // Find large lists/tables
    console.log('\nLarge tables:');
    document.querySelectorAll('table').forEach(table => {
      const rows = table.querySelectorAll('tr').length;
      if (rows > 5) {
        console.log(`  - Table with ${rows} rows`, table);
      }
    });

    console.log('\nLarge lists:');
    document.querySelectorAll('ul, ol').forEach(list => {
      const items = list.querySelectorAll('li').length;
      if (items > 5) {
        console.log(`  - List with ${items} items`, list);
      }
    });

    return { tags };
  };

  window.xdfDebugMarkElement = function(element) {
    if (!element) {
      console.error('No element provided. In DevTools, click an element and run: xdfDebugMarkElement($0)');
      return;
    }

    console.log('Marking element as map:', element);
    element.style.outline = '3px solid red';
    element.setAttribute('data-xdf-map', 'true');

    // Try to find siblings
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => {
        return child.tagName === element.tagName &&
               child.className === element.className;
      });
      console.log(`Found ${siblings.length} similar siblings`);

      if (siblings.length > 1) {
        console.log('Marking all siblings...');
        siblings.forEach(sib => {
          sib.style.outline = '2px solid orange';
          sib.setAttribute('data-xdf-map', 'true');
        });
        mapElements = siblings;
        console.log(`Set ${siblings.length} elements as maps. Run extraction to process them.`);
      }
    }
  };

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
