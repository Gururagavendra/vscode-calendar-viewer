# Outlook Calendar Viewer - Minimal PoC

Minimal VS Code extension to test Microsoft Graph API connectivity and polling for Outlook calendar events.

## prerequistics

Validate that we can:
1. Authenticate with Microsoft Graph API
2. Fetch calendar events
3. Poll for updates

## Setup

### 1. Register Azure AD App

1. Go to [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click "New registration"
3. Name: `VS Code Calendar Viewer`
4. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
5. Redirect URI: Leave blank for now (we'll use device code flow)
6. Click "Register"
7. Copy the **Application (client) ID**

### 2. Configure App Permissions

1. Go to "API permissions"
2. Click "Add a permission" → "Microsoft Graph" → "Delegated permissions"
3. Add: `Calendars.Read` and `User.Read`
4. Click "Add permissions"

### 3. Update Extension Code

Open `src/extension.ts` and replace `YOUR_CLIENT_ID` with your actual client ID:

```typescript
const CLIENT_ID = 'your-client-id-here';
```

### 4. Compile and Run

```bash
npm run compile
# Press F5 to launch extension in debug mode
```

## Usage

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run: `Authenticate with Microsoft`
3. Follow the device code instructions (visit the URL and enter the code)
4. After auth, run: `Fetch Calendar Events`
5. Check "Output" panel → "Outlook Calendar" to see events

## What's Next

Once this works:
- Add sidebar tree view
- Improve error handling
- Add token caching
- Enable automatic polling
- Add status bar countdown
