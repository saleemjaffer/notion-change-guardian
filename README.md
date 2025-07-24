# Notion Change Guardian

A Chrome extension that helps you avoid accidental edits on your Notion pages by displaying a banner when content changes and automatically hiding it when you revert back to the original. **The extension is disabled by default** and must be enabled per page for privacy and control.

## Features

- **Accidental Edit Prevention**: Shows a yellow banner when content on your Notion page is modified
- **Auto-Hide on Revert**: Banner automatically disappears when you undo changes back to the original state
- **Baseline Reset**: Dismiss the banner and accept current changes as the new baseline
- **Disabled by Default**: Extension only monitors pages when explicitly enabled
- **Per-Page Control**: Enable or disable monitoring for each Notion page independently
- **Clean Interface**: Simple one-button popup that shows status and allows toggle

## How It Works

The extension creates a snapshot of your Notion page content when first enabled, then continuously compares the current page state against this baseline. When differences are detected, a banner appears to alert you of changes. When you revert changes (undo back to original), the banner automatically disappears. You can reset the baseline at any time to make the current state your new "original."

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store listing](link-will-be-here)
2. Click "Add to Chrome"
3. Navigate to any Notion page and enable monitoring

### Manual Installation (Development)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your toolbar

## Usage

1. **Open any Notion page** - Extension is disabled by default
2. **Click the extension icon** - Shows a simple popup with current status
3. **Click "Enable"** - Starts monitoring the current page
4. **Make edits** - A yellow "Page Edited" banner appears at the top
5. **Undo changes** - Banner automatically disappears when you revert to original content
6. **Reset baseline** - Click "OK" in the banner to set current content as new baseline
7. **Disable monitoring** - Click extension icon and press "Disable" to stop monitoring

## Privacy

This extension:
- Only works on Notion domains
- Is disabled by default for maximum privacy
- Only monitors pages you explicitly enable
- Stores page content locally in your browser for comparison
- Does not send any data to external servers
- Does not track your browsing or personal information

## Support

For issues or feature requests, please visit [GitHub Issues](https://github.com/saleemjaffer/notion-change-guardian/issues).

## License

MIT License - see LICENSE file for details. 