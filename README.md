# Notion Change Guardian

A Chrome extension that keeps watch over your Notion page edits, displaying a banner when content changes and automatically hiding it when you revert back to the original.

## Features

- **Edit Awareness**: Shows a yellow banner when content on your Notion page is modified
- **Auto-Hide on Revert**: Banner automatically disappears when you undo changes back to the original state
- **Manual Reset**: Reset button to establish a new baseline from current page state
- **Multi-Domain Support**: Works across all Notion domains (.notion.so, .notion.site, notion.com)
- **Lightweight**: Runs quietly in the background without slowing down your workflow

## How It Works

1. **Baseline Tracking**: Records the original state of your Notion page
2. **Change Monitoring**: Watches for content modifications
3. **Visual Indicator**: Shows "Page Edited" banner when content differs from baseline
4. **Smart Recovery**: Banner disappears automatically when you undo back to original state

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store listing](link-will-be-here)
2. Click "Add to Chrome"
3. Navigate to any Notion page to start using

### Manual Installation (Development)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your toolbar

## Usage

1. **Open any Notion page** - The extension automatically starts monitoring
2. **Make edits** - A yellow "Page Edited" banner appears at the top
3. **Undo changes** - Banner automatically disappears when you revert to original content
4. **Reset baseline** - Click the extension icon and use "Reset Current Page" to set a new baseline

## Privacy

This extension:
- Only works on Notion domains
- Stores page content locally in your browser for comparison
- Does not send any data to external servers
- Does not track your browsing or personal information

## Support

For issues or feature requests, please visit [GitHub Issues](https://github.com/yourusername/notion-change-guardian/issues).

## License

MIT License - see LICENSE file for details. 