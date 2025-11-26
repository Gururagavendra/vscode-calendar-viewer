/**
 * Authentication Service - Handles OAuth flow with Microsoft
 */

import * as vscode from 'vscode';
import * as http from 'http';
import * as url from 'url';
import { TokenCache, AzureConfig } from '../models/types';

export class AuthService {
    private tokenCache: TokenCache | null = null;
    private outputChannel: vscode.OutputChannel;
    private config: AzureConfig;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.config = {
            clientId: '7e3b9562-8bdd-4172-ab19-2b28a485bfba',
            tenant: 'common',
            redirectUri: 'http://localhost:3000',
            scopes: 'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read offline_access'
        };
    }

    /**
     * Authenticate user via OAuth implicit flow
     */
    async authenticate(): Promise<boolean> {
        this.outputChannel.appendLine('=== Starting OAuth Authentication ===');
        
        try {
            const token = await this.authenticateWithBrowser();
            
            if (token) {
                this.tokenCache = {
                    accessToken: token,
                    expiresOn: new Date(Date.now() + 3600000) // 1 hour from now
                };
                
                this.outputChannel.appendLine('✅ Authentication successful!');
                return true;
            }
            return false;
        } catch (error: any) {
            this.outputChannel.appendLine(`❌ Authentication failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get current access token
     */
    getAccessToken(): string | null {
        if (!this.tokenCache) {
            return null;
        }
        
        // Check if token is expired
        if (this.tokenCache.expiresOn < new Date()) {
            this.outputChannel.appendLine('❌ Token expired');
            return null;
        }
        
        return this.tokenCache.accessToken;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.getAccessToken() !== null;
    }

    /**
     * Clear authentication
     */
    signOut(): void {
        this.tokenCache = null;
        this.outputChannel.appendLine('User signed out');
    }

    /**
     * Private: Handle browser-based OAuth flow
     */
    private authenticateWithBrowser(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.outputChannel.appendLine('Creating HTTP server...');
            
            const server = http.createServer(async (req, res) => {
                this.outputChannel.appendLine(`\n=== Received Request ===`);
                this.outputChannel.appendLine(`URL: ${req.url}`);
                
                // Implicit flow returns token in URL fragment
                if (req.url === '/' || req.url?.startsWith('/?')) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                        <body>
                            <h1>Processing authentication...</h1>
                            <script>
                                const hash = window.location.hash.substring(1);
                                const params = new URLSearchParams(hash);
                                const accessToken = params.get('access_token');
                                const error = params.get('error');
                                
                                if (accessToken) {
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
                    
                    this.outputChannel.appendLine(`✅ Access token received: ${token.substring(0, 20)}...`);
                    
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('OK');
                    
                    server.close();
                    resolve(token);
                }
            });
            
            server.on('error', (err) => {
                this.outputChannel.appendLine(`❌ Server error: ${err.message}`);
                reject(err);
            });
            
            server.listen(3000, () => {
                this.outputChannel.appendLine('\n=== Starting OAuth Flow ===');
                this.outputChannel.appendLine('Local server started on http://localhost:3000');
                
                const authUrl = `https://login.microsoftonline.com/${this.config.tenant}/oauth2/v2.0/authorize?` +
                    `client_id=${this.config.clientId}` +
                    `&response_type=token` +
                    `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
                    `&response_mode=fragment` +
                    `&scope=${encodeURIComponent(this.config.scopes)}`;
                
                this.outputChannel.appendLine(`\nAuth URL: ${authUrl}\n`);
                vscode.env.openExternal(vscode.Uri.parse(authUrl));
            });
            
            // Timeout after 5 minutes
            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timeout'));
            }, 5 * 60 * 1000);
        });
    }
}
