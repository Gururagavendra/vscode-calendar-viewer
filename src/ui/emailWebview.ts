/**
 * Email Webview - Display email content in VS Code panel
 */

import * as vscode from 'vscode';
import { EmailMessage } from '../models/types';

export class EmailWebviewPanel {
    private static currentPanel: EmailWebviewPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private currentEmail: EmailMessage;

    private constructor(panel: vscode.WebviewPanel, email: EmailMessage) {
        this.panel = panel;
        this.currentEmail = email;
        this.update(email);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'openOutlook':
                        // Open Outlook using system command
                        if (process.platform === 'win32') {
                            vscode.env.openExternal(vscode.Uri.parse('outlook:'));
                        } else if (process.platform === 'darwin') {
                            vscode.env.openExternal(vscode.Uri.parse('ms-outlook://'));
                        } else {
                            // Fallback to web for Linux
                            vscode.env.openExternal(vscode.Uri.parse(this.currentEmail.webLink));
                        }
                        return;
                }
            },
            null,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    /**
     * Create or show email webview
     */
    public static createOrShow(email: EmailMessage) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (EmailWebviewPanel.currentPanel) {
            EmailWebviewPanel.currentPanel.panel.reveal(column);
            EmailWebviewPanel.currentPanel.update(email);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'outlookEmail',
            'Email',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        EmailWebviewPanel.currentPanel = new EmailWebviewPanel(panel, email);
    }

    /**
     * Update webview content with email
     */
    private update(email: EmailMessage) {
        this.currentEmail = email;
        this.panel.title = email.subject || '(No Subject)';
        this.panel.webview.html = this.getHtmlContent(email);
    }

    /**
     * Generate HTML content for email
     */
    private getHtmlContent(email: EmailMessage): string {
        const receivedDate = new Date(email.receivedDateTime);
        const formattedDate = receivedDate.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const unreadBadge = !email.isRead 
            ? '<span class="badge unread">●</span>' 
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(email.subject || '(No Subject)')}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Segoe UI', 'Segoe UI Web', Tahoma, Arial, sans-serif;
            background-color: #faf9f8;
            color: #323130;
            line-height: 1.5;
        }
        .email-header {
            background-color: #0078d4;
            color: white;
            padding: 16px 24px;
            border-bottom: 1px solid #005a9e;
        }
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .outlook-icon {
            font-size: 20px;
            font-weight: 600;
        }
        .email-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
        }
        .subject-bar {
            padding: 20px 32px;
            border-bottom: 1px solid #edebe9;
            background: white;
        }
        .subject {
            font-size: 20px;
            font-weight: 600;
            color: #323130;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .badge {
            font-size: 16px;
        }
        .badge.unread {
            color: #0078d4;
        }
        .message-header {
            padding: 24px 32px;
            border-bottom: 1px solid #edebe9;
            background: white;
        }
        .sender-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
        }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #0078d4;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 16px;
            flex-shrink: 0;
        }
        .sender-info {
            flex: 1;
        }
        .sender-name {
            font-weight: 600;
            font-size: 15px;
            color: #323130;
            margin-bottom: 2px;
        }
        .sender-email {
            font-size: 13px;
            color: #605e5c;
        }
        .message-date {
            font-size: 13px;
            color: #605e5c;
            margin-top: 8px;
        }
        .importance-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-top: 8px;
        }
        .importance-high {
            background: #fef6f6;
            color: #d13438;
            border: 1px solid #d13438;
        }
        .attachment-indicator {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            color: #605e5c;
            margin-top: 8px;
        }
        .email-body {
            padding: 24px 32px;
            background: white;
            min-height: 200px;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.6;
            color: #323130;
        }
        .actions-bar {
            padding: 16px 32px;
            background: #faf9f8;
            border-top: 1px solid #edebe9;
            display: flex;
            gap: 8px;
        }
        .action-button {
            background-color: #0078d4;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.15s;
        }
        .action-button:hover {
            background-color: #106ebe;
        }
        .note {
            padding: 16px 32px;
            background: #fff4ce;
            border-left: 3px solid #ffb900;
            margin: 16px 0;
            font-size: 13px;
            color: #323130;
        }
    </style>
</head>
<body>
    <div class="email-header">
        <div class="header-content">
            <span class="outlook-icon">📧</span>
            <span>Outlook</span>
        </div>
    </div>

    <div class="email-container">
        <div class="subject-bar">
            <div class="subject">
                ${unreadBadge}
                ${this.escapeHtml(email.subject || '(No Subject)')}
            </div>
        </div>

        <div class="message-header">
            <div class="sender-row">
                <div class="avatar">${this.getInitials(email.from.emailAddress.name)}</div>
                <div class="sender-info">
                    <div class="sender-name">${this.escapeHtml(email.from.emailAddress.name)}</div>
                    <div class="sender-email">${this.escapeHtml(email.from.emailAddress.address)}</div>
                    <div class="message-date">${formattedDate}</div>
                    ${email.importance === 'high' ? '<div class="importance-badge importance-high">❗ High importance</div>' : ''}
                    ${email.hasAttachments ? '<div class="attachment-indicator">📎 This message has attachments</div>' : ''}
                </div>
            </div>
        </div>

        <div class="email-body">
            ${this.escapeHtml(email.bodyPreview)}
        </div>

        <div class="actions-bar">
            <a href="https://outlook.com" target="_blank" class="action-button">
                Open in Outlook
            </a>
        </div>

        <div class="note">
            <strong>Note:</strong> This is a preview. Click "Open in Outlook" to view the full message with formatting and attachments.
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Get initials from name for avatar
     */
    private getInitials(name: string): string {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    /**
     * Dispose of the panel
     */
    public dispose() {
        EmailWebviewPanel.currentPanel = undefined;
        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
