# Outlook Calendar Viewer for VS Code

View and sync your Outlook calendar events directly in Visual Studio Code with OAuth 2.0 authentication.

## Features

- 🔐 **Secure OAuth 2.0 Authentication** - Sign in with your Microsoft account
- 📅 **Real-time Calendar Sync** - View upcoming events for the next 7 days
- 🎨 **Beautiful Sidebar UI** - Events organized by date in a clean tree view
- 🔄 **Easy Refresh** - One-click refresh to get latest events
- 🌐 **Click to Open** - Open events in your browser with one click
- 💼 **Works with Both** - Personal Microsoft accounts and work/school accounts

## Installation

1. Install from VS Code Marketplace
2. Click the calendar icon in the Activity Bar
3. Click "Sign In with Microsoft"
4. Authorize the extension
5. View your calendar events!

## Usage

### Sign In
1. Click the calendar (📅) icon in the Activity Bar
2. Click "Sign In with Microsoft" button
3. Complete authentication in browser
4. Return to VS Code to see your events

### Refresh Events
Click the refresh button (🔄) in the sidebar toolbar to fetch latest events.

### Open Event
Click any event to open it in your default browser.

## Requirements

- VS Code 1.80.0 or higher
- Microsoft account (personal or work/school)
- Internet connection for authentication and syncing

## Extension Settings

This extension contributes the following settings:

* Calendar events are fetched for the next 7 days
* Auto-refresh available via the refresh button
* OAuth tokens are securely stored by VS Code

## Known Issues

- Token expires after 1 hour (re-authentication required)
- Maximum 50 events displayed at once

## Privacy

This extension:
- Only requests calendar read permissions
- Does not store your credentials
- Uses OAuth 2.0 for secure authentication
- Does not share your data with third parties

## Release Notes

### 1.0.0

Initial release:
- OAuth 2.0 authentication
- Calendar event viewing
- Sidebar tree view
- Event grouping by date

## Contributing

Contributions welcome! Please open an issue or submit a PR on [GitHub](https://github.com/Gururagavendra/vscode-calendar-viewer).

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

For issues and feature requests, please visit the [GitHub repository](https://github.com/Gururagavendra/vscode-calendar-viewer/issues).

---

**Enjoy!** 🎉
