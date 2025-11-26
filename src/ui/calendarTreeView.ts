/**
 * Calendar TreeView Provider - UI component for displaying calendar events
 */

import * as vscode from 'vscode';
import { CalendarEvent } from '../models/types';

/**
 * Tree item for individual calendar events
 */
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

/**
 * Tree item for date groups
 */
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

/**
 * TreeView Provider for calendar events
 */
export class CalendarTreeProvider implements vscode.TreeDataProvider<CalendarEventItem | DateGroupItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<CalendarEventItem | DateGroupItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    private events: CalendarEvent[] = [];
    
    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Update events and refresh
     */
    setEvents(events: CalendarEvent[]): void {
        this.events = events;
        this.refresh();
    }
    
    /**
     * Get tree item
     */
    getTreeItem(element: CalendarEventItem | DateGroupItem): vscode.TreeItem {
        return element;
    }
    
    /**
     * Get children for tree item
     */
    getChildren(element?: CalendarEventItem | DateGroupItem): Thenable<(CalendarEventItem | DateGroupItem)[]> {
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
    
    /**
     * Group events by date
     */
    private groupEventsByDate(events: CalendarEvent[]): DateGroupItem[] {
        const groups = new Map<string, CalendarEvent[]>();
        
        events.forEach(event => {
            const date = new Date(event.start.dateTime);
            const dateKey = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
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
