/**
 * Email Service - Handles Microsoft Graph API calls for emails
 */

import * as vscode from 'vscode';
import axios from 'axios';
import { EmailMessage } from '../models/types';
import { AuthService } from './authService';

export class EmailService {
    private outputChannel: vscode.OutputChannel;
    private authService: AuthService;
    private readonly GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';

    constructor(outputChannel: vscode.OutputChannel, authService: AuthService) {
        this.outputChannel = outputChannel;
        this.authService = authService;
    }

    /**
     * Fetch recent emails from inbox
     */
    async fetchRecentEmails(count: number = 50): Promise<EmailMessage[]> {
        try {
            this.outputChannel.appendLine('Fetching emails...');
            
            const token = this.authService.getAccessToken();
            if (!token) {
                throw new Error('Not authenticated. Please sign in first.');
            }
            
            const response = await axios.get(`${this.GRAPH_API_ENDPOINT}/me/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: {
                    '$select': 'id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments,webLink,importance',
                    '$orderby': 'receivedDateTime desc',
                    '$top': count,
                    '$filter': "parentFolderId eq 'inbox'"
                }
            });

            const emails: EmailMessage[] = response.data.value;
            this.outputChannel.appendLine(`✅ Found ${emails.length} emails`);
            
            return emails;
            
        } catch (error: any) {
            this.outputChannel.appendLine(`❌ Error fetching emails: ${error.message}`);
            if (error.response) {
                this.outputChannel.appendLine(`Response: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    /**
     * Fetch unread emails only
     */
    async fetchUnreadEmails(count: number = 50): Promise<EmailMessage[]> {
        try {
            this.outputChannel.appendLine('Fetching unread emails...');
            
            const token = this.authService.getAccessToken();
            if (!token) {
                throw new Error('Not authenticated. Please sign in first.');
            }
            
            const response = await axios.get(`${this.GRAPH_API_ENDPOINT}/me/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: {
                    '$select': 'id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments,webLink,importance',
                    '$orderby': 'receivedDateTime desc',
                    '$top': count,
                    '$filter': "isRead eq false"
                }
            });

            const emails: EmailMessage[] = response.data.value;
            this.outputChannel.appendLine(`✅ Found ${emails.length} unread emails`);
            
            return emails;
            
        } catch (error: any) {
            this.outputChannel.appendLine(`❌ Error fetching unread emails: ${error.message}`);
            if (error.response) {
                this.outputChannel.appendLine(`Response: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    /**
     * Get full email details including body
     */
    async getEmailDetails(emailId: string): Promise<any> {
        try {
            const token = this.authService.getAccessToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await axios.get(
                `${this.GRAPH_API_ENDPOINT}/me/messages/${emailId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    params: {
                        '$select': 'id,subject,from,receivedDateTime,body,bodyPreview,isRead,hasAttachments,webLink,importance,toRecipients,ccRecipients'
                    }
                }
            );

            this.outputChannel.appendLine(`✅ Fetched email details for: ${emailId}`);
            return response.data;
        } catch (error: any) {
            this.outputChannel.appendLine(`❌ Error fetching email details: ${error.message}`);
            throw error;
        }
    }

    /**
     * Mark email as read
     */
    async markAsRead(emailId: string): Promise<void> {
        try {
            const token = this.authService.getAccessToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            await axios.patch(
                `${this.GRAPH_API_ENDPOINT}/me/messages/${emailId}`,
                { isRead: true },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            this.outputChannel.appendLine(`✅ Marked email as read: ${emailId}`);
        } catch (error: any) {
            this.outputChannel.appendLine(`❌ Error marking email as read: ${error.message}`);
            throw error;
        }
    }
}
