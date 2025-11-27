/**
 * Outlook Calendar Viewer Extension
 * Main entry point - orchestrates services and UI components
 */

import * as vscode from 'vscode';
import { AuthService } from './services/authService';
import { CalendarService } from './services/calendarService';
import { EmailService } from './services/emailService';
import { CalendarTreeProvider } from './ui/calendarTreeView';
import { EmailTreeProvider } from './ui/emailTreeView';
import { EmailWebviewPanel } from './ui/emailWebview';
import { EmailMessage } from './models/types';

let outputChannel: vscode.OutputChannel;
let authService: AuthService;
let calendarService: CalendarService;
let emailService: EmailService;
let calendarTreeProvider: CalendarTreeProvider;
let emailTreeProvider: EmailTreeProvider;

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
    emailService = new EmailService(outputChannel, authService);
    
    // Initialize UI
    calendarTreeProvider = new CalendarTreeProvider();
    const calendarTreeView = vscode.window.createTreeView('outlookCalendar', {
        treeDataProvider: calendarTreeProvider,
        showCollapseAll: true
    });
    
    emailTreeProvider = new EmailTreeProvider();
    const emailTreeView = vscode.window.createTreeView('outlookEmail', {
        treeDataProvider: emailTreeProvider,
        showCollapseAll: true
    });
    
    // Set initial authentication state
    vscode.commands.executeCommand('setContext', 'outlookCalendar.authenticated', false);
    
    // Register commands
    registerCommands(context);
    
    context.subscriptions.push(calendarTreeView, emailTreeView);
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
                
                // Auto-fetch events and emails after authentication
                await fetchAndDisplayEvents();
                await fetchAndDisplayEmails();
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
        emailTreeProvider.setEmails([]);
        vscode.window.showInformationMessage('Signed out successfully');
    });
    
    // Command: Fetch emails
    const fetchEmailsCommand = vscode.commands.registerCommand('outlook-email.fetchEmails', async () => {
        await fetchAndDisplayEmails();
    });
    
    // Command: Refresh emails
    const refreshEmailsCommand = vscode.commands.registerCommand('outlook-email.refresh', async () => {
        await fetchAndDisplayEmails();
    });
    
    // Command: Open email in browser
    const openEmailCommand = vscode.commands.registerCommand('outlook-email.openEmail', async (item?: any) => {
        // Handle both webLink string and EmailItem object
        const webLink = typeof item === 'string' ? item : item?.email?.webLink || item?.resourceUri?.toString();
        if (webLink) {
            vscode.env.openExternal(vscode.Uri.parse(webLink));
        }
    });
    
    // Command: Open email in webview panel
    const openEmailInPanelCommand = vscode.commands.registerCommand('outlook-email.openEmailInPanel', async (email: EmailMessage) => {
        EmailWebviewPanel.createOrShow(email);
    });
    
    // Command: Fetch unread emails only
    const fetchUnreadEmailsCommand = vscode.commands.registerCommand('outlook-email.fetchUnread', async () => {
        await fetchAndDisplayEmails(true);
    });

    context.subscriptions.push(
        authCommand, 
        fetchCommand, 
        refreshCommand, 
        openEventCommand,
        signOutCommand,
        fetchEmailsCommand,
        refreshEmailsCommand,
        openEmailCommand,
        openEmailInPanelCommand,
        fetchUnreadEmailsCommand
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
 * Fetch emails and update UI
 */
async function fetchAndDisplayEmails(unreadOnly: boolean = false) {
    try {
        if (!authService.isAuthenticated()) {
            vscode.window.showWarningMessage('Please sign in first');
            return;
        }
        
        const emails = unreadOnly 
            ? await emailService.fetchUnreadEmails()
            : await emailService.fetchRecentEmails();
        
        emailTreeProvider.setEmails(emails);
        
        const unreadCount = emails.filter(e => !e.isRead).length;
        vscode.window.showInformationMessage(
            `✅ Found ${emails.length} emails (${unreadCount} unread)`
        );
        
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to fetch emails: ${error.message}`);
    }
}

/**
 * Extension deactivation
 */
export function deactivate() {
    outputChannel.appendLine('Outlook Calendar Viewer deactivated');
}
