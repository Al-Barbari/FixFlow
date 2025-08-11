/**
 * FixFlow VS Code Extension
 * Track, manage, and resolve technical debt directly in VS Code
 */

import * as vscode from 'vscode';
import { COMMANDS, MESSAGES } from './constants';
import { showInfoMessage } from './utils';

/**
 * Activate the FixFlow extension
 */
export function activate(context: vscode.ExtensionContext): void {
  // Use VS Code's output channel instead of console.log
  const output = vscode.window.createOutputChannel('FixFlow');
  output.appendLine(MESSAGES.EXTENSION_ACTIVATED);

  // Register commands
  const commands = [
    vscode.commands.registerCommand(COMMANDS.CREATE_DEBT_ENTRY, createDebtEntry),
    vscode.commands.registerCommand(COMMANDS.OPEN_DEBT_BOARD, openDebtBoard),
    vscode.commands.registerCommand(COMMANDS.SCAN_FOR_DEBT, scanForDebt),
    vscode.commands.registerCommand(COMMANDS.EXPORT_REPORT, exportReport),
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
}

/**
 * Create a new technical debt entry
 */
async function createDebtEntry(): Promise<void> {
  // TODO: Implement debt entry creation
  showInfoMessage('Create debt entry command triggered');
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
  // TODO: Implement debt scanning
  showInfoMessage('Scan for debt command triggered');
}

/**
 * Export debt report
 */
async function exportReport(): Promise<void> {
  // TODO: Implement report export
  showInfoMessage('Export report command triggered');
}
