// Popup script for handling user interactions
document.addEventListener('DOMContentLoaded', function() {
  const scanBtn = document.getElementById('scanBtn');
  const extractBtn = document.getElementById('extractBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const status = document.getElementById('status');
  const stats = document.getElementById('stats');
  const mapCount = document.getElementById('mapCount');
  const preview = document.getElementById('preview');
  const previewContent = document.getElementById('previewContent');

  let extractedData = [];

  // Scan for maps on the page
  scanBtn.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      updateStatus('Scanning page for maps...', false);
      scanBtn.disabled = true;

      chrome.tabs.sendMessage(tab.id, { action: 'scanMaps' }, function(response) {
        if (chrome.runtime.lastError) {
          updateStatus('Error: Could not connect to page. Please refresh the page and try again.', true);
          scanBtn.disabled = false;
          return;
        }

        if (response.success) {
          mapCount.textContent = response.count;
          stats.style.display = 'block';
          updateStatus(response.message, false);
          extractBtn.disabled = false;
        } else {
          updateStatus('Error: ' + response.error, true);
        }
        scanBtn.disabled = false;
      });
    } catch (error) {
      updateStatus('Error: ' + error.message, true);
      scanBtn.disabled = false;
    }
  });

  // Extract data from maps
  extractBtn.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      updateStatus('Extracting map data...', false);
      extractBtn.disabled = true;

      chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, function(response) {
        if (chrome.runtime.lastError) {
          updateStatus('Error: Could not connect to page.', true);
          extractBtn.disabled = false;
          return;
        }

        if (response.success) {
          // Get the full data
          chrome.tabs.sendMessage(tab.id, { action: 'getData' }, function(dataResponse) {
            extractedData = dataResponse.data;

            updateStatus(`Successfully extracted data from ${response.count} maps!`, false);
            downloadBtn.disabled = false;

            // Show preview
            showPreview(response.data || extractedData.slice(0, 5));
          });
        } else {
          updateStatus('Error: ' + response.error, true);
          extractBtn.disabled = false;
        }
      });
    } catch (error) {
      updateStatus('Error: ' + error.message, true);
      extractBtn.disabled = false;
    }
  });

  // Download CSV
  downloadBtn.addEventListener('click', function() {
    if (extractedData.length === 0) {
      updateStatus('No data to download', true);
      return;
    }

    const csv = convertToCSV(extractedData);
    downloadCSV(csv, 'xdf_map_data.csv');
    updateStatus('CSV file downloaded successfully!', false);
  });

  // Update status message
  function updateStatus(message, isError) {
    status.querySelector('p').textContent = message;
    if (isError) {
      status.classList.add('error');
    } else {
      status.classList.remove('error');
    }
  }

  // Show preview of extracted data
  function showPreview(data) {
    if (data.length === 0) {
      previewContent.textContent = 'No data to preview';
      return;
    }

    preview.style.display = 'block';

    let previewText = 'Sample data (first 5 entries):\n\n';
    data.slice(0, 5).forEach((item, index) => {
      previewText += `Entry ${index + 1}:\n`;
      for (const [key, value] of Object.entries(item)) {
        previewText += `  ${key}: ${value}\n`;
      }
      previewText += '\n';
    });

    previewContent.textContent = previewText;
  }

  // Convert data to CSV format
  function convertToCSV(data) {
    if (data.length === 0) return '';

    // Get all unique keys from all objects
    const allKeys = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    // Create CSV header
    let csv = headers.map(escapeCSV).join(',') + '\n';

    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header] || '';
        return escapeCSV(value);
      });
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  // Escape CSV values
  function escapeCSV(value) {
    const stringValue = String(value);
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
  }

  // Download CSV file
  function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, function(downloadId) {
      // Clean up the blob URL after download starts
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
});
