import * as vscode from 'vscode';
import axios from 'axios';

let outputChannel: vscode.OutputChannel;
let accessToken: string | null = null;
let pollingInterval: NodeJS.Timeout | null = null;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Outlook Calendar');
    outputChannel.appendLine('Outlook Calendar Viewer activated');

    // Command: Authenticate
    const authCommand = vscode.commands.registerCommand('outlook-calendar.authenticate', async () => {
        outputChannel.show();
        outputChannel.appendLine('=== AUTHENTICATE COMMAND CALLED ===');
        
        // Show a clear message first
        await vscode.window.showInformationMessage(
            'Get your token from Graph Explorer, then click OK',
            'OK'
        );
        
        try {
            outputChannel.appendLine('Showing input box...');
            const token = await vscode.window.showInputBox({
                prompt: 'Paste your access token here',
                password: true,
                placeHolder: 'Paste token and press Enter',
                ignoreFocusOut: true  // Don't close if user clicks elsewhere
            });
            
            outputChannel.appendLine(`Token received: ${token ? 'YES' : 'NO'}`);
            
            if (token && token.length > 10) {
                accessToken = token;
                outputChannel.appendLine('Token set successfully!');
                vscode.window.showInformationMessage('✅ Token set! Now run "Fetch Calendar Events"');
            } else {
                outputChannel.appendLine('No valid token provided');
                vscode.window.showWarningMessage('No token entered. Please try again.');
            }
        } catch (error: any) {
            outputChannel.appendLine(`Error: ${error.message}`);
            outputChannel.appendLine(`Stack: ${error.stack}`);
            vscode.window.showErrorMessage('Failed to set token');
        }
    });

    // Command: Fetch events
    const fetchCommand = vscode.commands.registerCommand('outlook-calendar.fetchEvents', async () => {
        if (!accessToken) {
            vscode.window.showWarningMessage('Please authenticate first');
            return;
        }
        await fetchCalendarEvents();
    });

    context.subscriptions.push(authCommand, fetchCommand);
}

async function fetchCalendarEvents() {
    try {
        outputChannel.appendLine('Fetching calendar events...');
        
        const now = new Date();
        const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
        
        const response = await axios.get('https://graph.microsoft.com/v1.0/me/calendar/events', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            params: {
                '$select': 'subject,start,end,location,webLink',
                '$orderby': 'start/dateTime',
                '$top': 10,
                '$filter': `start/dateTime ge '${now.toISOString()}' and start/dateTime le '${endDate.toISOString()}'`
            }
        });

        const events = response.data.value;
        outputChannel.appendLine(`Found ${events.length} events:`);
        outputChannel.appendLine(JSON.stringify(events, null, 2));
        
        vscode.window.showInformationMessage(`Found ${events.length} upcoming events`);
        
    } catch (error: any) {
        outputChannel.appendLine(`Error fetching events: ${error.message}`);
        if (error.response) {
            outputChannel.appendLine(`Response: ${JSON.stringify(error.response.data)}`);
        }
    }
}

function startPolling() {
    // Poll every 5 minutes
    pollingInterval = setInterval(async () => {
        if (accessToken) {
            outputChannel.appendLine('--- Polling for updates ---');
            await fetchCalendarEvents();
        }
    }, 5 * 60 * 1000);
}

export function deactivate() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
}
