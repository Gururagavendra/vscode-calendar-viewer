/**
 * Email TreeView Provider - UI component for displaying emails
 */

import * as vscode from 'vscode';
import { EmailMessage } from '../models/types';

/**
 * Tree item for individual email messages
 */
class EmailItem extends vscode.TreeItem {
    constructor(
        public readonly email: EmailMessage,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(email.subject || '(No Subject)', collapsibleState);
        
        const receivedDate = new Date(email.receivedDateTime);
        const now = new Date();
        const isToday = receivedDate.toDateString() === now.toDateString();
        
        // Format time display
        let timeDisplay: string;
        if (isToday) {
            timeDisplay = receivedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else {
            timeDisplay = receivedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        this.description = `${email.from.emailAddress.name} • ${timeDisplay}`;
        this.tooltip = new vscode.MarkdownString();
        this.tooltip.appendMarkdown(`**From:** ${email.from.emailAddress.name} (${email.from.emailAddress.address})\n\n`);
        this.tooltip.appendMarkdown(`**Received:** ${receivedDate.toLocaleString()}\n\n`);
        this.tooltip.appendMarkdown(`**Preview:** ${email.bodyPreview}\n\n`);
        if (email.hasAttachments) {
            this.tooltip.appendMarkdown(`📎 Has attachments\n\n`);
        }
        
        // Set icon based on read status and importance
        if (!email.isRead) {
            this.iconPath = new vscode.ThemeIcon('mail', new vscode.ThemeColor('charts.blue'));
            this.contextValue = 'unreadEmail';
        } else {
            this.iconPath = new vscode.ThemeIcon('mail-read');
            this.contextValue = 'readEmail';
        }
        
        if (email.importance === 'high') {
            this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.red'));
        }
        
        // Store webLink for context menu access
        this.resourceUri = vscode.Uri.parse(email.webLink);
        
        this.command = {
            command: 'outlook-email.openEmailInPanel',
            title: 'Open Email',
            arguments: [email]
        };
    }
}

/**
 * Tree item for category groups
 */
class EmailCategoryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly emails: EmailMessage[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.description = `${emails.length} email${emails.length !== 1 ? 's' : ''}`;
        this.iconPath = new vscode.ThemeIcon('inbox');
    }
}

/**
 * TreeView Provider for emails
 */
export class EmailTreeProvider implements vscode.TreeDataProvider<EmailItem | EmailCategoryItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<EmailItem | EmailCategoryItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    private emails: EmailMessage[] = [];
    private groupByUnread: boolean = true;
    
    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Update emails and refresh
     */
    setEmails(emails: EmailMessage[]): void {
        this.emails = emails;
        this.refresh();
    }
    
    /**
     * Toggle grouping by unread status
     */
    toggleGrouping(): void {
        this.groupByUnread = !this.groupByUnread;
        this.refresh();
    }
    
    /**
     * Get tree item
     */
    getTreeItem(element: EmailItem | EmailCategoryItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Get children for tree item
     */
    getChildren(element?: EmailItem | EmailCategoryItem): Thenable<(EmailItem | EmailCategoryItem)[]> {
        if (!element) {
            // Root level - optionally group by unread status
            if (this.groupByUnread && this.emails.length > 0) {
                const grouped = this.groupEmailsByReadStatus(this.emails);
                return Promise.resolve(grouped);
            } else {
                // Show all emails without grouping
                return Promise.resolve(
                    this.emails.map(email => new EmailItem(email, vscode.TreeItemCollapsibleState.None))
                );
            }
        }
        
        if (element instanceof EmailCategoryItem) {
            // Show emails for this category
            return Promise.resolve(
                element.emails.map(email => new EmailItem(email, vscode.TreeItemCollapsibleState.None))
            );
        }
        
        return Promise.resolve([]);
    }
    
    /**
     * Group emails by read/unread status
     */
    private groupEmailsByReadStatus(emails: EmailMessage[]): EmailCategoryItem[] {
        const unreadEmails = emails.filter(e => !e.isRead);
        const readEmails = emails.filter(e => e.isRead);
        
        const groups: EmailCategoryItem[] = [];
        
        if (unreadEmails.length > 0) {
            groups.push(new EmailCategoryItem(
                '📬 Unread',
                unreadEmails,
                vscode.TreeItemCollapsibleState.Expanded
            ));
        }
        
        if (readEmails.length > 0) {
            groups.push(new EmailCategoryItem(
                '📭 Read',
                readEmails,
                vscode.TreeItemCollapsibleState.Collapsed
            ));
        }
        
        return groups;
    }
}
