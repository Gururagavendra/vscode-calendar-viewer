/**
 * Data models and TypeScript interfaces
 */

export interface CalendarEvent {
    subject: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: { displayName?: string };
    webLink: string;
}

export interface TokenCache {
    accessToken: string;
    expiresOn: Date;
}

export interface AzureConfig {
    clientId: string;
    tenant: string;
    redirectUri: string;
    scopes: string;
}
