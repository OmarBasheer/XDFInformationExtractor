# Customization Guide for Your XDF Mappack Viewer

This guide will help you customize the extension to work with your specific mappack viewer website.

## How the Automated Extraction Works

The extension now includes **automated map clicking and property extraction** that eliminates the need to manually right-click each map. Here's how it works:

### Extraction Strategies (in order of priority)

1. **JavaScript API Detection**: Checks if the website exposes map data through global variables (e.g., `window.mapData`, `window.xdfData`)

2. **Automated Clicking**:
   - Automatically clicks on each detected map element
   - Tries multiple interaction methods: click, right-click, double-click
   - Waits for properties panel/dialog to appear
   - Extracts all labels and input values from the properties display
   - Closes the dialog and moves to the next map

3. **Visible Elements Extraction**: Falls back to extracting data directly from visible page elements

### What Gets Extracted

The automated extraction looks for properties in multiple formats:
- **Label/Input pairs**: `<label>Address Start:</label><input value="0x1000">`
- **Definition lists**: `<dt>Address Start</dt><dd>0x1000</dd>`
- **Named inputs**: `<input name="addressStart" value="0x1000">`
- **Text patterns**: Any text matching "Label: Value" format
- **Data attributes**: Elements with `data-*` attributes

## Quick Diagnosis

Before customizing, let's figure out how your website is structured:

### Step 1: Open Your Website's Developer Tools

1. Navigate to your mappack viewer page (the one with 303 maps)
2. Press F12 or right-click and select "Inspect"
3. Go to the "Elements" or "Inspector" tab

### Step 2: Find Map Elements

Look for the structure containing your maps. Common patterns:

#### Pattern A: List View
```html
<ul class="map-list">
  <li class="map-item" data-id="1">Map 1</li>
  <li class="map-item" data-id="2">Map 2</li>
  ...
</ul>
```

#### Pattern B: Table View
```html
<table id="mapTable">
  <thead>...</thead>
  <tbody>
    <tr>
      <td>Map 1</td>
      <td>0x1000</td>
      <td>0x2000</td>
      ...
    </tr>
  </tbody>
</table>
```

#### Pattern C: Tree View
```html
<div class="tree">
  <div class="tree-item">
    <span class="name">Map 1</span>
    <span class="address">0x1000</span>
  </div>
  ...
</div>
```

### Step 3: Find the Properties Dialog

Right-click on a map and select "Properties". Then inspect the dialog:

1. Right-click on the properties dialog itself
2. Select "Inspect Element"
3. Note the class names or IDs

Common patterns:

```html
<!-- Pattern 1: Modal Dialog -->
<div class="modal" id="propertiesDialog">
  <div class="property">
    <label>Address Start:</label>
    <span>0x1000</span>
  </div>
  ...
</div>

<!-- Pattern 2: Definition List -->
<dl class="properties">
  <dt>Address Start</dt>
  <dd>0x1000</dd>
  <dt>Address End</dt>
  <dd>0x2000</dd>
</dl>

<!-- Pattern 3: Form Fields -->
<form class="properties-form">
  <input name="addressStart" value="0x1000" readonly>
  <input name="addressEnd" value="0x2000" readonly>
</form>
```

## Customization Based on Your Pattern

### For Pattern A (List View)

Edit `content.js`, find the `scanForMaps` function and update:

```javascript
function scanForMaps(sendResponse) {
  const maps = document.querySelectorAll('.map-item'); // ← Change this selector
  sendResponse({
    success: true,
    count: maps.length,
    message: `Found ${maps.length} maps`
  });
}
```

### For Pattern B (Table View)

Replace the `extractFromVisibleElements` function with:

```javascript
function extractFromVisibleElements(sendResponse) {
  const rows = document.querySelectorAll('#mapTable tbody tr'); // ← Change selector

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    extractedData.push({
      name: cells[0].textContent.trim(),          // ← Adjust column indices
      addressStart: cells[1].textContent.trim(),
      addressEnd: cells[2].textContent.trim(),
      dataType: cells[3].textContent.trim(),
      // Add more fields as needed
    });
  }

  sendResponse({
    success: true,
    count: extractedData.length,
    data: extractedData.slice(0, 5)
  });
}
```

### For Properties Dialog Extraction

If you need to extract from the properties dialog, add this strategy:

```javascript
// 1. Find all map elements
const maps = document.querySelectorAll('.map-item');

// 2. For each map, simulate opening properties
for (const map of maps) {
  // Click or right-click the map
  map.click(); // or map.contextmenu()

  // Wait for dialog to appear
  await sleep(100);

  // Extract from dialog
  const dialog = document.querySelector('.properties-dialog'); // ← Change selector
  const properties = extractPropertiesFromDialog(dialog);

  extractedData.push(properties);

  // Close dialog
  document.querySelector('.close-button').click(); // ← Change selector
}
```

## Step-by-Step Customization Process

### Method 1: Using Browser Console (Easiest)

1. Open your mappack page
2. Press F12 and go to Console
3. Test selectors:

```javascript
// Test finding maps
document.querySelectorAll('.map-item').length
document.querySelectorAll('table tbody tr').length
document.querySelectorAll('li').length

// Test finding properties
document.querySelector('.properties')
document.querySelector('[role="dialog"]')
```

4. When you find the right selector, update `content.js`

### Method 2: Use JavaScript API (If Available)

Some websites expose data through JavaScript. Test in console:

```javascript
// Check for global variables
window.mapData
window.xdfData
window.app

// Inspect any found objects
console.log(window.mapData)
```

If data is available, add this to `extractMapData`:

```javascript
function extractMapData(sendResponse) {
  // Try to get data from JavaScript API
  if (window.mapData) {
    extractedData = window.mapData;
    sendResponse({
      success: true,
      count: extractedData.length,
      data: extractedData.slice(0, 5)
    });
    return;
  }
  // ... fallback to DOM extraction
}
```

### Method 3: Extract from Network Requests

1. Open Developer Tools → Network tab
2. Refresh the page
3. Look for JSON responses containing map data
4. If found, note the URL pattern

Then modify the extension to fetch that URL directly.

## Common Selectors to Try

If you're not sure what selector to use, try these in order:

```javascript
// For map elements:
'[data-map]'
'[data-id]'
'.map'
'.map-item'
'.item'
'li'
'tr'
'[class*="map"]'
'[id*="map"]'

// For properties:
'.properties'
'.property'
'[role="dialog"]'
'.modal'
'.dialog'
'#properties'
'dl'
'form'
```

## Testing Your Changes

1. Edit `content.js` with your custom selectors
2. Reload the extension:
   - Go to `chrome://extensions/`
   - Click the reload button on XDF Information Extractor
3. Go to your mappack page
4. Click the extension icon and test

## Still Having Issues?

If the generic approach doesn't work:

1. **Share your website URL** (if possible) for specific help
2. **Take screenshots** of:
   - Your mappack page structure
   - The properties dialog
   - Browser console showing element inspection
3. **Check the console** for error messages (F12 → Console)
4. **Try the advanced example**: Copy code from `content-advanced-example.js`

## Examples for Common XDF Tools

### TunerPro / WinOLS-style Viewers

Usually use tables:

```javascript
const rows = document.querySelectorAll('table.maps tbody tr');
```

### Tree-based Viewers

Usually use nested divs:

```javascript
const maps = document.querySelectorAll('.tree-item[data-type="map"]');
```

### Custom Web Viewers

May expose JavaScript API:

```javascript
const maps = window.xdfViewer.getAllMaps();
```

## Contact

If you need help customizing for your specific site, please:

1. Open an issue on GitHub
2. Include:
   - Website URL (if public)
   - Screenshots of the map list and properties dialog
   - HTML structure (from browser inspector)
   - Any error messages from the console

We'll help you create the right customization!
