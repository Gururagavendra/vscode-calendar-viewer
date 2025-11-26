/**
 * Calendar Service - Handles Microsoft Graph API calls
 */

import * as vscode from 'vscode';
import axios from 'axios';
import { CalendarEvent } from '../models/types';
import { AuthService } from './authService';

export class CalendarService {
    private outputChannel: vscode.OutputChannel;
    private authService: AuthService;
    private readonly GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';

    constructor(outputChannel: vscode.OutputChannel, authService: AuthService) {
        this.outputChannel = outputChannel;
        this.authService = authService;
    }

    /**
     * Fetch calendar events for the next 7 days
     */
    async fetchUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
        try {
            this.outputChannel.appendLine('Fetching calendar events...');
            
            const token = this.authService.getAccessToken();
            if (!token) {
                throw new Error('Not authenticated. Please sign in first.');
            }
            
            const now = new Date();
            const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            
            const response = await axios.get(`${this.GRAPH_API_ENDPOINT}/me/calendar/events`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: {
                    '$select': 'subject,start,end,location,webLink',
                    '$orderby': 'start/dateTime',
                    '$top': 50,
                    '$filter': `start/dateTime ge '${now.toISOString()}' and start/dateTime le '${endDate.toISOString()}'`
                }
            });

            const events: CalendarEvent[] = response.data.value;
            this.outputChannel.appendLine(`✅ Found ${events.length} events`);
            
            return events;
            
        } catch (error: any) {
            this.outputChannel.appendLine(`❌ Error fetching events: ${error.message}`);
            if (error.response) {
                this.outputChannel.appendLine(`Response: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    /**
     * Get user's calendar information
     */
    async getCalendarInfo(): Promise<any> {
        const token = this.authService.getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await axios.get(`${this.GRAPH_API_ENDPOINT}/me/calendar`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        return response.data;
    }
}
