import * as vscode from 'vscode';
import axios from 'axios';
import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';

let outputChannel: vscode.OutputChannel;
let pollingInterval: NodeJS.Timeout | null = null;
let calendarTreeProvider: CalendarTreeProvider;

// Azure AD Configuration
const CLIENT_ID = '7e3b9562-8bdd-4172-ab19-2b28a485bfba';
const TENANT = 'common'; // Supports both work/school and personal accounts
const REDIRECT_URI = 'http://localhost:3000';
const SCOPES = 'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read offline_access';

let tokenCache: { accessToken: string; expiresOn: Date } | null = null;

// Calendar Event interface
interface CalendarEvent {
    subject: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: { displayName?: string };
    webLink: string;
}

// Tree item types
class CalendarEventItem extends vscode.TreeItem {
    constructor(
        public readonly event: CalendarEvent,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(event.subject, collapsibleState);
        
        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
        
        this.description = `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        this.tooltip = `${event.subject}\n${startTime.toLocaleString()} - ${endTime.toLocaleString()}\n${event.location?.displayName || 'No location'}`;
        this.iconPath = new vscode.ThemeIcon('calendar');
        
        this.command = {
            command: 'outlook-calendar.openEvent',
            title: 'Open Event',
            arguments: [event.webLink]
        };
    }
}

class DateGroupItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly events: CalendarEvent[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.description = `${events.length} event${events.length !== 1 ? 's' : ''}`;
        this.iconPath = new vscode.ThemeIcon('calendar');
    }
}

// TreeView Provider
class CalendarTreeProvider implements vscode.TreeDataProvider<CalendarEventItem | DateGroupItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<CalendarEventItem | DateGroupItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    private events: CalendarEvent[] = [];
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    setEvents(events: CalendarEvent[]): void {
        this.events = events;
        this.refresh();
    }
    
    getTreeItem(element: CalendarEventItem | DateGroupItem): vscode.TreeItem {
        return element;
    }
    
    getChildren(element?: CalendarEventItem | DateGroupItem): Thenable<(CalendarEventItem | DateGroupItem)[]> {
        if (!tokenCache) {
            return Promise.resolve([]);
        }
        
        if (!element) {
            // Root level - group by date
            const grouped = this.groupEventsByDate(this.events);
            return Promise.resolve(grouped);
        }
        
        if (element instanceof DateGroupItem) {
            // Show events for this date
            return Promise.resolve(
                element.events.map(event => new CalendarEventItem(event, vscode.TreeItemCollapsibleState.None))
            );
        }
        
        return Promise.resolve([]);
    }
    
    private groupEventsByDate(events: CalendarEvent[]): DateGroupItem[] {
        const groups = new Map<string, CalendarEvent[]>();
        
        events.forEach(event => {
            const date = new Date(event.start.dateTime);
            const dateKey = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(event);
        });
        
        return Array.from(groups.entries()).map(([date, events]) => 
            new DateGroupItem(date, events, vscode.TreeItemCollapsibleState.Expanded)
        );
    }
}

// Generate PKCE challenge
function generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Outlook Calendar');
    outputChannel.appendLine('Outlook Calendar Viewer activated');
    
    // Set context for views
    vscode.commands.executeCommand('setContext', 'outlookCalendar.authenticated', false);
    
    // Initialize TreeView Provider
    calendarTreeProvider = new CalendarTreeProvider();
    const treeView = vscode.window.createTreeView('outlookCalendar', {
        treeDataProvider: calendarTreeProvider,
        showCollapseAll: true
    });

    // Command: Authenticate with OAuth using browser flow
    const authCommand = vscode.commands.registerCommand('outlook-calendar.authenticate', async () => {
        outputChannel.show();
        outputChannel.appendLine('=== Starting OAuth Authentication ===');
        
        try {
            const token = await authenticateWithBrowser();
            
            if (token) {
                tokenCache = {
                    accessToken: token,
                    expiresOn: new Date(Date.now() + 3600000) // 1 hour from now
                };
                
                // Update context
                vscode.commands.executeCommand('setContext', 'outlookCalendar.authenticated', true);
                
                outputChannel.appendLine('✅ Authentication successful!');
                vscode.window.showInformationMessage('✅ Successfully authenticated!');
                
                // Auto-fetch events after authentication
                await fetchCalendarEvents();
            }
        } catch (error: any) {
            outputChannel.appendLine(`❌ Authentication failed: ${error.message}`);
            vscode.window.showErrorMessage(`Authentication failed: ${error.message}`);
        }
    });

    // Command: Fetch events
    const fetchCommand = vscode.commands.registerCommand('outlook-calendar.fetchEvents', async () => {
        await fetchCalendarEvents();
    });
    
    // Command: Refresh calendar
    const refreshCommand = vscode.commands.registerCommand('outlook-calendar.refresh', async () => {
        await fetchCalendarEvents();
    });
    
    // Command: Open event in browser
    const openEventCommand = vscode.commands.registerCommand('outlook-calendar.openEvent', async (webLink: string) => {
        vscode.env.openExternal(vscode.Uri.parse(webLink));
    });

    context.subscriptions.push(authCommand, fetchCommand, refreshCommand, openEventCommand, treeView);
}

async function authenticateWithBrowser(): Promise<string> {
    return new Promise((resolve, reject) => {
        // Create local server to receive OAuth callback
        const server = http.createServer(async (req, res) => {
            outputChannel.appendLine(`\n=== Received Request ===`);
            outputChannel.appendLine(`URL: ${req.url}`);
            
            // Implicit flow returns token in URL fragment, we need to capture it via HTML
            if (req.url === '/' || req.url?.startsWith('/?')) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                    <body>
                        <h1>Processing authentication...</h1>
                        <script>
                            // Extract access token from URL fragment
                            const hash = window.location.hash.substring(1);
                            const params = new URLSearchParams(hash);
                            const accessToken = params.get('access_token');
                            const error = params.get('error');
                            
                            if (accessToken) {
                                // Send token to localhost server
                                fetch('/token?access_token=' + accessToken)
                                    .then(() => {
                                        document.body.innerHTML = '<h1>✅ Authentication Successful!</h1><p>You can close this window and return to VS Code.</p>';
                                    });
                            } else if (error) {
                                document.body.innerHTML = '<h1>❌ Authentication Failed</h1><p>' + params.get('error_description') + '</p>';
                            }
                        </script>
                    </body>
                    </html>
                `);
            } else if (req.url?.startsWith('/token?access_token=')) {
                const queryParams = url.parse(req.url, true).query;
                const token = queryParams.access_token as string;
                
                outputChannel.appendLine(`✅ Access token received: ${token.substring(0, 20)}...`);
                
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
                
                server.close();
                resolve(token);
            }
        });
        
        server.listen(3000, () => {
            outputChannel.appendLine('\n=== Starting OAuth Flow ===');
            outputChannel.appendLine('Local server started on http://localhost:3000');
            
            // Build authorization URL using implicit flow (no PKCE, returns token directly)
            const authUrl = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?` +
                `client_id=${CLIENT_ID}` +
                `&response_type=token` +
                `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                `&response_mode=fragment` +
                `&scope=${encodeURIComponent(SCOPES)}`;
            
            outputChannel.appendLine(`\nAuth URL: ${authUrl}\n`);
            vscode.env.openExternal(vscode.Uri.parse(authUrl));
            
            vscode.window.showInformationMessage('Browser opened. Please sign in with your Microsoft account.');
        });
        
        // Timeout after 5 minutes
        setTimeout(() => {
            server.close();
            reject(new Error('Authentication timeout'));
        }, 5 * 60 * 1000);
    });
}

async function fetchCalendarEvents() {
    try {
        outputChannel.appendLine('Fetching calendar events...');
        
        if (!tokenCache) {
            vscode.window.showWarningMessage('Please authenticate first');
            outputChannel.appendLine('❌ No token available. Please run "Authenticate" command first.');
            return;
        }
        
        // Check if token is expired
        if (tokenCache.expiresOn < new Date()) {
            vscode.window.showWarningMessage('Token expired. Please authenticate again.');
            outputChannel.appendLine('❌ Token expired. Please re-authenticate.');
            return;
        }
        
        const now = new Date();
        const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
        
        const response = await axios.get('https://graph.microsoft.com/v1.0/me/calendar/events', {
            headers: {
                'Authorization': `Bearer ${tokenCache.accessToken}`,
            },
            params: {
                '$select': 'subject,start,end,location,webLink',
                '$orderby': 'start/dateTime',
                '$top': 50,
                '$filter': `start/dateTime ge '${now.toISOString()}' and start/dateTime le '${endDate.toISOString()}'`
            }
        });

        const events: CalendarEvent[] = response.data.value;
        outputChannel.appendLine(`✅ Found ${events.length} events`);
        
        // Update TreeView
        calendarTreeProvider.setEvents(events);
        
        vscode.window.showInformationMessage(`✅ Found ${events.length} upcoming events`);
        
    } catch (error: any) {
        outputChannel.appendLine(`❌ Error fetching events: ${error.message}`);
        if (error.response) {
            outputChannel.appendLine(`Response: ${JSON.stringify(error.response.data)}`);
        }
        vscode.window.showErrorMessage(`Failed to fetch events: ${error.message}`);
    }
}

function startPolling() {
    // Poll every 5 minutes
    pollingInterval = setInterval(async () => {
        outputChannel.appendLine('--- Polling for updates ---');
        await fetchCalendarEvents();
    }, 5 * 60 * 1000);
}

export function deactivate() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
}
