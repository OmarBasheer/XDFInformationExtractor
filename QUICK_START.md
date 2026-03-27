# Quick Start Guide

## 1. Installation (2 minutes)

### Chrome / Edge / Brave

1. Download this repository as ZIP and extract it
2. Open `chrome://extensions/` (or `edge://extensions/` or `brave://extensions/`)
3. Turn ON "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the extracted `XDFInformationExtractor` folder
6. Done! The extension icon will appear in your toolbar

### Firefox

1. Download this repository as ZIP and extract it
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the folder and select `manifest.json`
5. Done! (Note: Will unload when you close Firefox)

## 2. Usage (3 steps)

### Step 1: Go to Your Mappack Page
- Open the website with your XDF mappack
- Make sure all maps are visible (expand lists if needed)

### Step 2: Run the Extension
- Click the extension icon in your toolbar
- Click "Scan for Maps" → See how many maps were found
- Click "Extract Data" → Preview the data
- Click "Download CSV" → Save the file

### Step 3: Open Your CSV
- Open the downloaded `xdf_map_data.csv` in Excel or Google Sheets
- Your map data is ready to use!

## Troubleshooting

**No maps found?**
- Make sure you're on the right page
- Try refreshing the page
- The page might need customization (see CUSTOMIZATION.md)

**Data looks wrong?**
- The generic extraction might not match your site
- See CUSTOMIZATION.md for how to adapt it

**Extension won't load?**
- Make sure Developer Mode is enabled
- Try refreshing the extension page
- Check browser console for errors

## Need Help?

1. Read the full [README.md](README.md)
2. Check [CUSTOMIZATION.md](CUSTOMIZATION.md) for site-specific setup
3. Open an issue on GitHub with your problem

---

**That's it!** You should now be able to extract your XDF map data automatically instead of manually checking 303 properties dialogs. 🎉
