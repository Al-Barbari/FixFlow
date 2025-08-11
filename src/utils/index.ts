/**
 * Utility functions for FixFlow extension
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TechnicalDebt, DebtSeverity, DebtCategory, DebtStatus, DebtPriority } from '../types';
import { DEFAULTS, PATTERNS, SUPPORTED_EXTENSIONS } from '../constants';

/**
 * Generate a unique ID for debt entries
 */
export function generateDebtId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${DEFAULTS.DEBT_ID_PREFIX}_${timestamp}_${random}`;
}

/**
 * Get the current workspace root path
 */
export function getWorkspaceRoot(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  return workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Get the current active editor
 */
export function getActiveEditor(): vscode.TextEditor | undefined {
  return vscode.window.activeTextEditor;
}

/**
 * Get the current selection text from active editor
 */
export function getCurrentSelection(): string | undefined {
  const editor = getActiveEditor();
  if (!editor) return undefined;

  const selection = editor.selection;
  if (selection.isEmpty) return undefined;

  return editor.document.getText(selection);
}

/**
 * Get the current file path
 */
export function getCurrentFilePath(): string | undefined {
  const editor = getActiveEditor();
  return editor?.document.uri.fsPath;
}

/**
 * Get the current line number
 */
export function getCurrentLineNumber(): number | undefined {
  const editor = getActiveEditor();
  return editor?.selection.active.line;
}

/**
 * Check if a file path is supported by FixFlow
 */
export function isSupportedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Get the relative path from workspace root
 */
export function getRelativePath(filePath: string): string {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) return filePath;
  
  return path.relative(workspaceRoot, filePath);
}

/**
 * Ensure the storage directory exists
 */
export function ensureStorageDirectory(storagePath: string): void {
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
}

/**
 * Get the storage directory path
 */
export function getStoragePath(): string {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    throw new Error('No workspace found');
  }
  
  return path.join(workspaceRoot, DEFAULTS.STORAGE_PATH);
}

/**
 * Parse debt markers from text content
 */
export function parseDebtMarkers(content: string, lineNumber: number): Array<{
  marker: string;
  description: string;
  line: number;
}> {
  const lines = content.split('\n');
  const markers: Array<{ marker: string; description: string; line: number }> = [];

  lines.forEach((line, index) => {
    const match = line.match(PATTERNS.DEBT_MARKER);
    if (match) {
      markers.push({
        marker: match[1].toUpperCase(),
        description: match[2].trim(),
        line: lineNumber + index
      });
    }
  });

  return markers;
}

/**
 * Get context lines around a specific line
 */
export function getContextLines(filePath: string, lineNumber: number, contextLines: number = DEFAULTS.MAX_CONTEXT_LINES): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const start = Math.max(0, lineNumber - contextLines);
    const end = Math.min(lines.length, lineNumber + contextLines + 1);
    
    return lines.slice(start, end);
  } catch (error) {
    return [];
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Validate debt entry data
 */
export function validateDebtEntry(debt: Partial<TechnicalDebt>): string[] {
  const errors: string[] = [];

  if (!debt.title || debt.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!debt.description || debt.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!debt.filePath) {
    errors.push('File path is required');
  }

  if (debt.lineNumber === undefined || debt.lineNumber < 0) {
    errors.push('Valid line number is required');
  }

  if (debt.title && debt.title.length > 100) {
    errors.push('Title must be 100 characters or less');
  }

  if (debt.description && debt.description.length > 500) {
    errors.push('Description must be 500 characters or less');
  }

  return errors;
}

/**
 * Show information message
 */
export function showInfoMessage(message: string): void {
  vscode.window.showInformationMessage(message);
}

/**
 * Show error message
 */
export function showErrorMessage(message: string): void {
  vscode.window.showErrorMessage(message);
}

/**
 * Show warning message
 */
export function showWarningMessage(message: string): void {
  vscode.window.showWarningMessage(message);
}

/**
 * Show confirmation dialog
 */
export async function showConfirmation(message: string, detail?: string): Promise<boolean> {
  const result = await vscode.window.showInformationMessage(
    message,
    { detail },
    'Yes',
    'No'
  );
  return result === 'Yes';
}

/**
 * Get configuration value
 */
export function getConfig<T>(key: string, defaultValue: T): T {
  return vscode.workspace.getConfiguration().get(key, defaultValue);
}

/**
 * Update configuration value
 */
export async function updateConfig(key: string, value: any): Promise<void> {
  await vscode.workspace.getConfiguration().update(key, value, vscode.ConfigurationTarget.Workspace);
}
