#!/bin/bash

echo "🚀 Quick Azure AD App Registration Guide"
echo "=========================================="
echo ""
echo "Option 1: Manual (Recommended for first time)"
echo "1. Visit: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
echo "2. Click 'New registration'"
echo "3. Name: 'VS Code Calendar Viewer'"
echo "4. Account types: 'Accounts in any organizational directory and personal Microsoft accounts'"
echo "5. Click 'Register'"
echo "6. Copy the Application (client) ID"
echo "7. Go to 'API permissions' → Add permission → Microsoft Graph → Delegated"
echo "8. Add: Calendars.Read and User.Read"
echo ""
echo "Option 2: Azure CLI (Quick)"
echo "Run these commands if you have Azure CLI installed:"
echo ""
echo "az ad app create --display-name 'VS Code Calendar Viewer' --sign-in-audience AzureADandPersonalMicrosoftAccount"
echo ""
echo "Then add Microsoft Graph API permissions manually in the portal."
echo ""
read -p "Press Enter when you have your Client ID..."
echo ""
read -p "Enter your Client ID: " CLIENT_ID

# Update the extension.ts file
sed -i "s/YOUR_CLIENT_ID/$CLIENT_ID/g" src/extension.ts

echo ""
echo "✅ Client ID updated in src/extension.ts"
echo ""
echo "Now compiling..."
npm run compile

echo ""
echo "✅ Ready to test!"
echo ""
echo "Next steps:"
echo "1. Press F5 in VS Code to launch extension"
echo "2. In the new window, press Ctrl+Shift+P"
echo "3. Run: 'Authenticate with Microsoft'"
echo "4. Follow the device code flow"
echo "5. Run: 'Fetch Calendar Events'"
echo "6. Check Output panel > Outlook Calendar"
