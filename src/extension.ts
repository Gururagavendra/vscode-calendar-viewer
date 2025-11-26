/**
 * Outlook Calendar Viewer Extension
 * Main entry point - orchestrates services and UI components
 */

import * as vscode from 'vscode';
import { AuthService } from './services/authService';
import { CalendarService } from './services/calendarService';
import { CalendarTreeProvider } from './ui/calendarTreeView';

let outputChannel: vscode.OutputChannel;
let authService: AuthService;
let calendarService: CalendarService;
let calendarTreeProvider: CalendarTreeProvider;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('=== OUTLOOK CALENDAR EXTENSION ACTIVATING ===');
    
    outputChannel = vscode.window.createOutputChannel('Outlook Calendar');
    outputChannel.appendLine('Outlook Calendar Viewer activated');
    outputChannel.appendLine(`Extension path: ${context.extensionPath}`);
    outputChannel.show();
    
    console.log('Output channel created');
    
    // Initialize services
    authService = new AuthService(outputChannel);
    calendarService = new CalendarService(outputChannel, authService);
    
    // Initialize UI
    calendarTreeProvider = new CalendarTreeProvider();
    const treeView = vscode.window.createTreeView('outlookCalendar', {
        treeDataProvider: calendarTreeProvider,
        showCollapseAll: true
    });
    
    // Set initial authentication state
    vscode.commands.executeCommand('setContext', 'outlookCalendar.authenticated', false);
    
    // Register commands
    registerCommands(context);
    
    context.subscriptions.push(treeView);
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
    // Command: Authenticate
    const authCommand = vscode.commands.registerCommand('outlook-calendar.authenticate', async () => {
        outputChannel.show();
        outputChannel.appendLine('\n=== Authentication Command Triggered ===');
        
        try {
            outputChannel.appendLine('Calling authService.authenticate()...');
            const success = await authService.authenticate();
            
            outputChannel.appendLine(`Authentication result: ${success}`);
            
            if (success) {
                // Update context for view visibility
                vscode.commands.executeCommand('setContext', 'outlookCalendar.authenticated', true);
                
                vscode.window.showInformationMessage('✅ Successfully authenticated!');
                
                // Auto-fetch events after authentication
                await fetchAndDisplayEvents();
            } else {
                vscode.window.showErrorMessage('Authentication failed - no token received');
            }
        } catch (error: any) {
            outputChannel.appendLine(`❌ Error caught: ${error.message}`);
            outputChannel.appendLine(`Stack: ${error.stack}`);
            
            // Don't show error message if it's already been handled (like EADDRINUSE)
            if (error.code !== 'EADDRINUSE') {
                vscode.window.showErrorMessage(`Authentication failed: ${error.message}`);
            }
        }
    });

    // Command: Fetch events
    const fetchCommand = vscode.commands.registerCommand('outlook-calendar.fetchEvents', async () => {
        await fetchAndDisplayEvents();
    });
    
    // Command: Refresh calendar
    const refreshCommand = vscode.commands.registerCommand('outlook-calendar.refresh', async () => {
        await fetchAndDisplayEvents();
    });
    
    // Command: Open event in browser
    const openEventCommand = vscode.commands.registerCommand('outlook-calendar.openEvent', async (webLink: string) => {
        vscode.env.openExternal(vscode.Uri.parse(webLink));
    });
    
    // Command: Sign out
    const signOutCommand = vscode.commands.registerCommand('outlook-calendar.signOut', async () => {
        authService.signOut();
        vscode.commands.executeCommand('setContext', 'outlookCalendar.authenticated', false);
        calendarTreeProvider.setEvents([]);
        vscode.window.showInformationMessage('Signed out successfully');
    });

    context.subscriptions.push(
        authCommand, 
        fetchCommand, 
        refreshCommand, 
        openEventCommand,
        signOutCommand
    );
}

/**
 * Fetch events and update UI
 */
async function fetchAndDisplayEvents() {
    try {
        if (!authService.isAuthenticated()) {
            vscode.window.showWarningMessage('Please sign in first');
            return;
        }
        
        const events = await calendarService.fetchUpcomingEvents();
        calendarTreeProvider.setEvents(events);
        
        vscode.window.showInformationMessage(`✅ Found ${events.length} upcoming events`);
        
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to fetch events: ${error.message}`);
    }
}

/**
 * Extension deactivation
 */
export function deactivate() {
    outputChannel.appendLine('Outlook Calendar Viewer deactivated');
}
