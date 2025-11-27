/**
 * Authentication Service - Handles OAuth flow with Microsoft
 */

import * as vscode from 'vscode';
import * as http from 'http';
import * as url from 'url';
import * as net from 'net';
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
            scopes: 'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access'
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
    private async authenticateWithBrowser(): Promise<string> {
        const port = 3000;
        
        // Check if port is available, if not try to free it
        const isAvailable = await this.checkPortAvailable(port);
        if (!isAvailable) {
            this.outputChannel.appendLine(`⚠️ Port ${port} is in use, attempting to free it...`);
            const freed = await this.tryFreePort(port);
            
            if (!freed) {
                const message = `Port ${port} is in use by another application. Please close it or wait a moment and try again.`;
                this.outputChannel.appendLine(`❌ ${message}`);
                throw new Error(message);
            }
        }
        
        return new Promise((resolve, reject) => {
            this.outputChannel.appendLine('Creating HTTP server...');
            
            const server = http.createServer(async (req, res) => {
                this.outputChannel.appendLine(`\n=== Received Request ===`);
                this.outputChannel.appendLine(`URL: ${req.url}`);
                
                // Implicit flow returns token in URL fragment
                if (req.url === '/' || req.url?.startsWith('/?')) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Authentication</title>
                            <style>
                                * {
                                    margin: 0;
                                    padding: 0;
                                    box-sizing: border-box;
                                }
                                body {
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                    background: #f3f2f1;
                                    min-height: 100vh;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    padding: 20px;
                                }
                                .container {
                                    background: white;
                                    border: 1px solid #e1dfdd;
                                    padding: 48px;
                                    text-align: center;
                                    max-width: 440px;
                                    width: 100%;
                                }
                                .icon {
                                    font-size: 48px;
                                    margin-bottom: 24px;
                                }
                                h1 {
                                    color: #323130;
                                    font-size: 24px;
                                    font-weight: 600;
                                    margin-bottom: 8px;
                                }
                                p {
                                    color: #605e5c;
                                    font-size: 14px;
                                    line-height: 20px;
                                }
                                .error-text {
                                    color: #a4262c;
                                    margin-top: 16px;
                                    font-size: 13px;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="icon" id="icon">⏳</div>
                                <h1 id="title">Signing you in</h1>
                                <p id="message">Please wait...</p>
                                <p class="error-text" id="errorDetails" style="display: none;"></p>
                            </div>
                            <script>
                                const hash = window.location.hash.substring(1);
                                const params = new URLSearchParams(hash);
                                const accessToken = params.get('access_token');
                                const error = params.get('error');
                                const errorDesc = params.get('error_description');
                                
                                if (accessToken) {
                                    fetch('/token?access_token=' + accessToken)
                                        .then(() => {
                                            document.getElementById('icon').textContent = '✓';
                                            document.getElementById('icon').style.color = '#107c10';
                                            document.getElementById('title').textContent = 'Authentication successful';
                                            document.getElementById('message').textContent = 'You can close this window and return to VS Code.';
                                            setTimeout(() => window.close(), 2000);
                                        })
                                        .catch(() => {
                                            showError('Failed to complete authentication.');
                                        });
                                } else if (error) {
                                    showError(errorDesc || 'Authentication failed.');
                                }
                                
                                function showError(msg) {
                                    document.getElementById('icon').textContent = '✕';
                                    document.getElementById('icon').style.color = '#a4262c';
                                    document.getElementById('title').textContent = 'Authentication failed';
                                    document.getElementById('message').textContent = 'Something went wrong.';
                                    document.getElementById('errorDetails').textContent = msg;
                                    document.getElementById('errorDetails').style.display = 'block';
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
            
            server.on('error', (err: NodeJS.ErrnoException) => {
                this.outputChannel.appendLine(`❌ Server error: ${err.message}`);
                vscode.window.showErrorMessage(`Authentication server error: ${err.message}`);
                server.close();
                reject(err);
            });
            
            server.listen(port, () => {
                this.outputChannel.appendLine('\n=== Starting OAuth Flow ===');
                this.outputChannel.appendLine(`Local server started on http://localhost:${port}`);
                
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
                if (server.listening) {
                    server.close();
                    this.outputChannel.appendLine('⏱️ Authentication timeout - no response after 5 minutes');
                    vscode.window.showWarningMessage('Authentication timed out. Please try again.');
                    reject(new Error('Authentication timeout'));
                }
            }, 5 * 60 * 1000);
        });
    }

    /**
     * Try to free up a port (wait and retry)
     */
    private async tryFreePort(port: number): Promise<boolean> {
        // Wait 2 seconds for any previous server to fully close
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await this.checkPortAvailable(port);
    }

    /**
     * Check if a port is available
     */
    private checkPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', () => {
                resolve(false);
            });
            
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            
            server.listen(port, '127.0.0.1');
        });
    }
}
