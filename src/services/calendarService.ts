/**
 * Calendar Service - Handles Microsoft Graph API calls
 */

import axios from 'axios';
import { CalendarEvent } from '../models/types';
import { AuthService } from './authService';

export class CalendarService {
    private authService: AuthService;
    private readonly GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    /**
     * Fetch calendar events for the next 7 days
     */
    async fetchUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
        try {
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
            return events;
            
        } catch (error: any) {
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
