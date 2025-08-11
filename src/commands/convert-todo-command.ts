import * as vscode from 'vscode';
import { COMMANDS, DEFAULTS } from '../constants';
import { DebtService } from '../services';
import { DebtFormProvider } from '../providers';
import { DebtCategory, DebtPriority, DebtSeverity, TechnicalDebt } from '../types';
import { getContextLines, getRelativePath } from '../utils';

export interface ConvertTodoArgs {
  uri: vscode.Uri;
  line: number; // zero-based
  marker?: string; // e.g., TODO, FIXME
  description?: string;
}

export function registerConvertTodoCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand(COMMANDS.CONVERT_TODO_TO_DEBT, async (args?: ConvertTodoArgs) => {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const document = args?.uri ? await vscode.workspace.openTextDocument(args.uri) : editor.document;
      const lineIndex = typeof args?.line === 'number' ? args.line : editor.selection.active.line;
      const lineText = document.lineAt(lineIndex).text;

      const markerAlternation = DEFAULTS.DEBT_MARKERS.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const markerRegex = new RegExp(`(?:^|[^\\w])(${markerAlternation})(?:\\b)\\s*[:\-]\\s*(.+)$`, 'i');
      const match = lineText.match(markerRegex);
      if (!match) {
        vscode.window.showInformationMessage('No TODO/FIXME-style marker found on this line.');
        return;
      }

      const marker = (args?.marker ?? match[1]).toUpperCase();
      const description = (args?.description ?? match[2]).trim();

      const absPath = document.uri.fsPath;
      const relPath = getRelativePath(absPath);
      const lineNumberOneBased = lineIndex + 1;
      const contextLines = getContextLines(absPath, lineIndex).join('\n');

      // Prefill sensible defaults
      const defaults: Partial<TechnicalDebt> = {
        title: `${marker}: ${description}`.slice(0, 100),
        description,
        filePath: relPath,
        lineNumber: lineNumberOneBased,
        severity: DebtSeverity.LOW,
        category: DebtCategory.CODE_QUALITY,
        priority: DebtPriority.NORMAL,
        tags: [marker],
        context: contextLines
      } as Partial<TechnicalDebt>;

      const debtService = new DebtService();
      await debtService.initialize();

      const form = new DebtFormProvider();
      await form.openWebview(debtService, context, defaults, async (created) => {
        try {
          await replaceCommentWithId(document.uri, lineIndex, created.id, marker, description);
        } catch {
          // ignore
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to convert comment: ${message}`);
    }
  });
}

async function replaceCommentWithId(uri: vscode.Uri, lineIndex: number, id: string, marker: string, originalDesc: string): Promise<void> {
  const editor = await showDocumentAtLine(uri, lineIndex);
  const line = editor.document.lineAt(lineIndex);
  const text = line.text;
  const replacementSuffix = ` [FixFlow:${id}]`;

  // Avoid duplicate replacement
  if (text.includes('[FixFlow:')) return;

  const updated = text.replace(/((?:^|[^\w])(?:TODO|FIXME|HACK|BUG|NOTE)(?:\b)\s*[:\-]\s*)(.+)$/i, (_m, prefix: string, desc: string) => {
    const baseDesc = desc.trim();
    return `${prefix}${baseDesc}${replacementSuffix}`;
  });

  if (updated !== text) {
    await editor.edit(editBuilder => {
      editBuilder.replace(line.range, updated);
    });
  }
}

async function showDocumentAtLine(uri: vscode.Uri, lineIndex: number): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, { selection: new vscode.Range(lineIndex, 0, lineIndex, 0), preserveFocus: false, preview: false });
  return editor;
}


