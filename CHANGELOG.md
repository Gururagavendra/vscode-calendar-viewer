# CHANGELOG

All notable changes to the "Outlook Calendar Viewer" extension will be documented in this file.

## [1.0.1] - 2025-11-26

### Fixed
- Fixed extension not activating when installed from marketplace
- Added explicit activation events for better reliability
- Included runtime dependencies in packaged extension
- Added better error logging for authentication flow

## [1.0.0] - 2025-11-26

### Added
- Initial release
- OAuth 2.0 authentication with Microsoft
- Microsoft Graph API integration for calendar access
- Sidebar tree view showing upcoming events
- Events grouped by date
- Click to open events in browser
- Refresh button for manual sync
- Support for both personal and work/school Microsoft accounts
- Clean architecture with separated services and UI components

### Features
- View calendar events for next 7 days
- Secure token management
- Welcome screen for unauthenticated users
- Event details showing time and location
- Beautiful VS Code native UI integration

## Future Enhancements
- Auto-refresh polling
- Create events from VS Code
- Event notifications
- Multiple calendar support
- Custom date range selection
