/**
 * FixFlow VS Code Extension
 * Track, manage, and resolve technical debt directly in VS Code
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { COMMANDS, DEFAULTS, MESSAGES } from './constants';
import { showInfoMessage } from './utils';
import { DebtService, GitHubService, ScannerService } from './services';
import { DebtTreeProvider, DebtDecorationProvider } from './providers';
import { registerAddDebtCommand } from './commands';

/**
 * Activate the FixFlow extension
 */
let extensionContext: vscode.ExtensionContext;
let debtTreeProvider: DebtTreeProvider | null = null;
let decorationProvider: DebtDecorationProvider | null = null;

export function activate(context: vscode.ExtensionContext): void {
  extensionContext = context;
  // Use VS Code's output channel instead of console.log
  const output = vscode.window.createOutputChannel('FixFlow');
  output.appendLine(MESSAGES.EXTENSION_ACTIVATED);

  // Register commands
  const commands = [
    registerAddDebtCommand(context),
    vscode.commands.registerCommand(COMMANDS.OPEN_DEBT_BOARD, openDebtBoard),
    vscode.commands.registerCommand(COMMANDS.SCAN_FOR_DEBT, scanForDebt),
    vscode.commands.registerCommand(COMMANDS.EXPORT_REPORT, exportReport),
    vscode.commands.registerCommand(COMMANDS.RESOLVE_DEBT_ENTRY, resolveDebtEntry),
    vscode.commands.registerCommand(COMMANDS.DELETE_DEBT_ENTRY, deleteDebtEntry),
  ];

  // Add commands to subscriptions
  commands.forEach(command => context.subscriptions.push(command));

  // Initialize extension
  initializeExtension(context);
}

/**
 * Deactivate the FixFlow extension
 */
export function deactivate(): void {
  // Cleanup resources if needed
}

/**
 * Initialize the extension
 */
function initializeExtension(context: vscode.ExtensionContext): void {
  // TODO: Initialize storage, load existing debt data, etc.
  showInfoMessage('FixFlow initialized successfully');

  // Initialize GitHubService and check if workspace is a git repository
  const gitHubService = new GitHubService();
  gitHubService.isGitRepository().then(isGitRepo => {
    if (isGitRepo) {
      vscode.window.showInformationMessage('This workspace is a Git repository.');
    } else {
      vscode.window.showInformationMessage('This workspace is not a Git repository.');
    }
  }).catch(err => {
    vscode.window.showErrorMessage('Error checking Git repository: ' + err.message);
  });

  // Placeholder: Ask user for GitHub vs local storage preference in the future
  setupDebtBoard(context).catch(err => {
    vscode.window.showErrorMessage('Failed to initialize debt board: ' + (err instanceof Error ? err.message : String(err)));
  });

  // Initialize gutter decorations
  decorationProvider = new DebtDecorationProvider(context);
  decorationProvider.initialize().catch(() => {/* ignore */});
  context.subscriptions.push(decorationProvider);
}

/**
 * Open the debt board view
 */
async function openDebtBoard(): Promise<void> {
  // TODO: Implement debt board view
  showInfoMessage('Open debt board command triggered');
}

/**
 * Scan for technical debt in the workspace
 */
async function scanForDebt(): Promise<void> {
  try {
    const scanner = new ScannerService();
    const results = await scanner.scanWorkspace();
    if (results.length === 0) {
      showInfoMessage('No technical debt markers found');
      return;
    }

    // Basic summary notification for now
    showInfoMessage(`Scan completed: ${results.length} item(s) found`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Error scanning for technical debt: ${message}`);
  }
}

/**
 * Export debt report
 */
async function exportReport(): Promise<void> {
  // TODO: Implement report export
  showInfoMessage('Export report command triggered');
}

async function resolveDebtEntry(args?: { id: string }): Promise<void> {
  if (!args?.id) return;
  try {
    const service = new DebtService();
    await service.initialize();
    await service.updateDebt(args.id, { status:  'resolved' as any });
    vscode.window.showInformationMessage('Debt marked as resolved');
    debtTreeProvider?.refresh();
    decorationProvider?.refresh();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to resolve debt: ${message}`);
  }
}

async function deleteDebtEntry(args?: { id: string }): Promise<void> {
  if (!args?.id) return;
  try {
    const service = new DebtService();
    await service.initialize();
    await service.deleteDebt(args.id);
    vscode.window.showInformationMessage('Debt deleted');
    debtTreeProvider?.refresh();
    decorationProvider?.refresh();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to delete debt: ${message}`);
  }
}

async function setupDebtBoard(context: vscode.ExtensionContext): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    await vscode.commands.executeCommand('setContext', 'workspaceHasFixflowData', false);
    return;
  }

  // Initialize services and provider
  const debtService = new DebtService();
  await debtService.initialize();
  debtTreeProvider = new DebtTreeProvider(debtService);
  vscode.window.registerTreeDataProvider('fixflowDebtBoard', debtTreeProvider);

  // Set context so the view becomes visible
  await vscode.commands.executeCommand('setContext', 'workspaceHasFixflowData', true);

  // Watch the storage file for updates and refresh the view
  const pattern = new vscode.RelativePattern(workspaceRoot, `${DEFAULTS.STORAGE_PATH}/debts.json`);
  const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);
  watcher.onDidChange(() => { debtTreeProvider?.refresh(); decorationProvider?.refresh(); }, null, context.subscriptions);
  watcher.onDidCreate(() => { debtTreeProvider?.refresh(); decorationProvider?.refresh(); }, null, context.subscriptions);
  watcher.onDidDelete(async () => {
    debtTreeProvider?.refresh();
    decorationProvider?.refresh();
    await vscode.commands.executeCommand('setContext', 'workspaceHasFixflowData', false);
  }, null, context.subscriptions);

  context.subscriptions.push(watcher);
}
