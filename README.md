# XDF Information Extractor

A browser extension that automates the extraction of XDF map data from mappack viewers and exports it to CSV format.

## Overview

This extension helps you extract XDF (eXtensible Data Format) map properties from web-based mappack viewers without manually right-clicking each map and viewing its properties. It can handle hundreds of maps automatically and export all the data to a CSV file.

## Features

- 🔍 **Intelligent Map Detection**: Uses 5 advanced detection strategies to find map elements
  - **Pattern Recognition**: Finds repeating DOM structures
  - **Keyword Analysis**: Detects XDF-specific terminology
  - **Interactive Elements**: Identifies clickable/selectable items
  - **Structured Data**: Recognizes tables, lists, and grids
  - **Visual Analysis**: Analyzes layout patterns and positioning
- 🤖 **Automated Clicking**: Automatically clicks each map and extracts properties without manual intervention
- 📊 **Batch Extraction**: Extracts data from multiple maps at once
- 🎯 **Multi-Method Extraction**: Tries click, right-click, and double-click to trigger property dialogs
- 💾 **CSV Export**: Downloads extracted data as a CSV file
- 👀 **Data Preview**: Shows a preview of extracted data before downloading
- 🛠️ **Debug Tools**: Built-in console commands for troubleshooting detection issues
- 🎨 **User-Friendly Interface**: Clean and intuitive popup interface

## Extracted Data Fields

The extension can extract the following properties from each map:
- Address Start
- Address End
- Data Type
- Map Name
- Size
- And any other custom properties available

## Installation

### Chrome / Edge / Brave

1. Download or clone this repository
2. Open your browser and navigate to:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked"
5. Select the `XDFInformationExtractor` folder
6. The extension icon should appear in your browser toolbar

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the `XDFInformationExtractor` folder and select the `manifest.json` file
5. The extension will be loaded temporarily (until you restart Firefox)

**Note**: For permanent installation in Firefox, the extension needs to be signed by Mozilla.

## Usage

### Basic Workflow

1. **Navigate to your mappack viewer webpage**
   - Open the website containing your XDF mappack (e.g., the one with 303 maps)

2. **Open the extension**
   - Click the extension icon in your browser toolbar

3. **Scan for maps**
   - Click the "Scan for Maps" button
   - The extension will search the page for map elements
   - You'll see how many maps were detected

4. **Extract data**
   - Click the "Extract Data" button
   - The extension will extract properties from all detected maps
   - A preview of the first few entries will be displayed

5. **Download CSV**
   - Click the "Download CSV" button
   - Choose where to save the `xdf_map_data.csv` file
   - Open the CSV file in Excel, Google Sheets, or any spreadsheet application

### How the Automated Extraction Works

The extension eliminates the need to manually right-click each map by:

1. **Detecting all map elements** on the page
2. **Automatically interacting with each map** using:
   - Regular click
   - Right-click (contextmenu)
   - Double-click
3. **Capturing the properties** that appear in dialogs/panels
4. **Extracting all label-value pairs** from:
   - Form labels and inputs
   - Definition lists
   - Text patterns (e.g., "Address Start: 0x1000")
   - Data attributes
5. **Closing dialogs** between maps to prepare for the next one

This means you can extract data from 300+ maps in seconds instead of manually clicking each one!

### Tips for Best Results

- **Ensure the page is fully loaded** before scanning for maps
- **If the initial scan doesn't detect maps**, try:
  - Refreshing the page
  - Opening/expanding the map list if it's collapsed
  - Making sure you're on the correct page section
- **For large mappacks (300+ maps)**, the extraction may take 30-60 seconds as it clicks through each map
- **Watch the browser console** (F12) to see extraction progress - it logs every 10 maps processed
- **If automated extraction fails**, the extension will fall back to visible element parsing

## Customization

The generic extraction logic may not work perfectly with all mappack viewers. If you need to customize the extension for your specific website:

### Modifying the Content Script

Edit `content.js` to adjust the extraction logic:

```javascript
// Modify selectors to match your website's structure
const possibleSelectors = [
  '[class*="map"]',      // Elements with "map" in class name
  '[id*="map"]',         // Elements with "map" in ID
  // Add your custom selectors here
];

// Modify extraction patterns to match your data format
const patterns = [
  /address\s*start[:\s]+([0-9a-fx]+)/i,
  /address\s*end[:\s]+([0-9a-fx]+)/i,
  // Add your custom patterns here
];
```

### Example Customizations

If your maps are in a table:
```javascript
const rows = document.querySelectorAll('table#mapTable tbody tr');
```

If your maps have specific data attributes:
```javascript
const addressStart = element.getAttribute('data-address-start');
const addressEnd = element.getAttribute('data-address-end');
```

## File Structure

```
XDFInformationExtractor/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup logic and UI interactions
├── content.js            # Content script for data extraction
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
├── create-icons.js       # Script to generate placeholder icons
└── README.md            # This file
```

## How It Works

1. **Content Script Injection**: When you visit a webpage, the content script (`content.js`) is injected and runs in the page context
2. **Map Detection**: The script scans the DOM for elements that might contain map data
3. **Automated Interaction**: When triggered, it automatically:
   - Clicks on each map element (using click, right-click, or double-click)
   - Waits for the properties panel/dialog to appear
   - Extracts all labels and input values from the properties display
   - Closes the dialog and moves to the next map
4. **Smart Extraction**: The extension uses multiple strategies:
   - JavaScript API detection (fastest)
   - Automated clicking with property extraction (most reliable)
   - Visible element parsing (fallback)
5. **CSV Generation**: The popup script converts the extracted data to CSV format
6. **File Download**: The browser's download API saves the CSV file to your chosen location

## Troubleshooting

### Using Built-in Debug Tools

If maps aren't being detected, open your browser's console (press F12) and use these debugging commands:

#### 1. Analyze Page Structure
```javascript
window.xdfDebugAnalyzePage()
```
This shows:
- Count of all element types on the page
- Large tables and lists that might contain map data
- Overall page structure

#### 2. View All Detection Candidates
```javascript
window.xdfDebugShowCandidates()
```
This runs all 5 detection strategies and shows what each found:
- Pattern candidates (repeating structures)
- Keyword candidates (XDF-related content)
- Interactive candidates (clickable elements)
- Structured data candidates (tables/lists)
- Visual pattern candidates (layout-based detection)

#### 3. Manually Mark Map Elements
If you can see the maps but the extension can't detect them:
1. Right-click on a map element and select "Inspect"
2. In the console, type:
```javascript
window.xdfDebugMarkElement($0)
```
This will:
- Mark the element with a red outline
- Find all similar sibling elements
- Automatically set them as map elements
- You can then run extraction normally

### "Could not connect to page" error
- Refresh the webpage and try again
- Make sure you're on the correct website/page
- Check that the extension has permission to access the current site

### No maps detected
- Use the debug tools above to investigate
- Verify you're on the page showing the mappack
- Try expanding or scrolling through the map list
- The page structure might need custom selectors (see Customization)
- Check browser console (F12) for detection statistics

### Data extraction returns empty results
- The website might use dynamic content loading
- Custom extraction logic might be needed for your specific site
- Check browser console (F12) for any error messages

### CSV file is empty or incomplete
- Ensure maps were successfully extracted (check the preview)
- Try extracting again
- Verify the page structure matches expected patterns

## Development

### Requirements
- Node.js (for creating icons, optional)
- Modern web browser (Chrome, Firefox, Edge, or Brave)

### Making Changes

1. Edit the relevant files
2. Reload the extension in your browser:
   - Go to `chrome://extensions/` (or equivalent)
   - Click the refresh icon on the extension card
3. Test your changes on the target website

### Adding New Features

To add new data fields to extract:
1. Update the extraction patterns in `content.js`
2. The CSV export will automatically include new fields

## Privacy & Permissions

This extension requires the following permissions:

- **activeTab**: Access the currently active tab to extract data
- **scripting**: Inject the content script into webpages
- **downloads**: Save the CSV file to your computer

**Privacy Note**: This extension:
- Does NOT send any data to external servers
- Does NOT collect or store personal information
- Only processes data from the current webpage locally
- Only accesses pages when you explicitly trigger it

## Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome  | ✅ Supported | Manifest V3 |
| Edge    | ✅ Supported | Manifest V3 |
| Brave   | ✅ Supported | Manifest V3 |
| Firefox | ⚠️  Temporary | Requires temporary loading or signing |
| Opera   | ✅ Supported | Manifest V3 |

## Known Limitations

- Some websites may use custom UI frameworks that require specific selectors
- Automated clicking may need timing adjustments for slow-loading properties dialogs
- Some context menus may be browser-restricted and won't respond to programmatic right-clicks
- Firefox requires manual reload after browser restart (or proper signing)
- Very large mappacks (1000+ maps) may take several minutes to process

## Future Enhancements

Potential improvements for future versions:
- [ ] Configurable timing delays for different website speeds
- [ ] Progress bar in the popup during extraction
- [ ] Support for additional export formats (JSON, Excel)
- [ ] Custom field mapping UI
- [ ] Preset configurations for popular XDF tools
- [ ] Parallel extraction for faster processing

## Contributing

Contributions are welcome! If you have improvements or bug fixes:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter issues or need help:

1. Check the Troubleshooting section above
2. Review the browser console for error messages
3. Open an issue on GitHub with:
   - Browser version
   - Extension version
   - Description of the problem
   - Steps to reproduce

## License

This project is provided as-is for extracting XDF map data from web-based mappack viewers.

## Changelog

### Version 1.1.0 (Robust Detection Update)
- **Complete rewrite of map detection system from scratch**
- **5 intelligent detection strategies**:
  - Pattern recognition: Finds repeating DOM structures
  - Keyword analysis: Detects XDF/calibration-specific terminology
  - Interactive element detection: Identifies clickable/selectable items
  - Structured data recognition: Analyzes tables, lists, and grids
  - Visual pattern analysis: Uses layout and positioning
- **Smart scoring system**: Combines results from all strategies
- **Built-in debugging tools**:
  - `window.xdfDebugAnalyzePage()` - Analyze page structure
  - `window.xdfDebugShowCandidates()` - View all detection candidates
  - `window.xdfDebugMarkElement($0)` - Manually mark map elements
- **Detailed console logging** with statistics for each detection strategy
- **Automatic fallback** to best-scoring elements when no perfect match found

### Version 1.0.0 (Initial Release)
- Basic map scanning and detection
- **Automated map clicking and property extraction**
- **Multi-method interaction** (click, right-click, double-click)
- **Intelligent property dialog detection** with multiple selector strategies
- **Smart extraction** from labels, inputs, definition lists, and text patterns
- Data extraction from webpage elements
- CSV export functionality
- User-friendly popup interface
- Support for Chrome, Edge, Brave, and Firefox

---

**Note**: This extension provides a generic framework for extracting XDF map data. Depending on your specific mappack viewer's implementation, you may need to customize the extraction logic in `content.js` to match your website's structure.
