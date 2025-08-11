import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';

/**
 * Interface for GitHub Integration Service
 */
export interface IGitHubService {
    isGitRepository(): Promise<boolean>;
    add(files?: string[]): Promise<void>;
    commit(message: string): Promise<void>;
    push(): Promise<void>;
    authenticate(): Promise<void>;
    getStoragePreference(): Promise<'github' | 'local'>;
    dispose(): void;
}

/**
 * GitHubService handles git operations, authentication, and user storage preference.
 */
export class GitHubService implements IGitHubService {
    private workspaceRoot: string | undefined;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    /**
     * Detect if the current workspace is a git repository.
     */
    async isGitRepository(): Promise<boolean> {
        if (!this.workspaceRoot) return false;
        try {
            const fs = await import('fs/promises');
            const gitDir = path.join(this.workspaceRoot, '.git');
            const stats = await fs.stat(gitDir);
            return stats.isDirectory();
        } catch (err) {
            // Not a git repository or cannot access .git directory
            return false;
        }
    }

    /**
     * Add files to git staging area.
     */
    async add(files?: string[]): Promise<void> {
        if (!this.workspaceRoot) throw new Error('No workspace root found');
        const args = ['add'];
        if (files && files.length > 0) {
            args.push(...files);
        } else {
            args.push('.');
        }
        await this.runGit(args);
        vscode.window.showInformationMessage('Files added to git staging area.');
    }

    /**
     * Commit staged changes with a message.
     */
    async commit(message: string): Promise<void> {
        if (!this.workspaceRoot) throw new Error('No workspace root found');
        await this.runGit(['commit', '-m', message]);
        vscode.window.showInformationMessage('Changes committed to git.');
    }

    /**
     * Push commits to remote repository.
     */
    async push(): Promise<void> {
        if (!this.workspaceRoot) throw new Error('No workspace root found');
        await this.runGit(['push']);
        vscode.window.showInformationMessage('Changes pushed to remote repository.');
    }

    /**
     * Handle GitHub authentication if needed.
     */
    async authenticate(): Promise<void> {
        try {
            const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
            if (session) {
                vscode.window.showInformationMessage('GitHub authentication successful.');
            } else {
                vscode.window.showWarningMessage('GitHub authentication was not completed.');
            }
        } catch (err) {
            vscode.window.showErrorMessage('GitHub authentication failed: ' + (err instanceof Error ? err.message : String(err)));
        }
    }

    /**
     * Provide user choice for GitHub vs local-only storage.
     */
    async getStoragePreference(): Promise<'github' | 'local'> {
        const choice = await vscode.window.showQuickPick([
            { label: 'GitHub', description: 'Sync with GitHub (requires authentication)', value: 'github' },
            { label: 'Local', description: 'Store data locally only', value: 'local' }
        ], {
            placeHolder: 'Choose your preferred storage method for FixFlow data',
        });
        return (choice?.value as 'github' | 'local') || 'local';
    }

    dispose(): void {
        // No resources to dispose currently; method provided for API consistency
    }

    private async runGit(args: string[]): Promise<string> {
        if (!this.workspaceRoot) throw new Error('No workspace root found');
        return new Promise((resolve, reject) => {
            const child = spawn('git', args, { cwd: this.workspaceRoot, shell: false });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
            child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
            child.on('error', (error: Error) => {
                vscode.window.showErrorMessage('Git command failed to start: ' + error.message);
                reject(error);
            });
            child.on('close', (code: number) => {
                if (code !== 0) {
                    vscode.window.showErrorMessage('Git command failed: ' + stderr.trim());
                    reject(new Error(stderr.trim() || `Git exited with code ${code}`));
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }
}
