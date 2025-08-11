import * as vscode from 'vscode';
import { COMMANDS, DEFAULTS } from '../constants';

export class TodoConversionCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] | undefined {
    try {
      const lineIndex = range.start.line;
      const lineText = document.lineAt(lineIndex).text;
      const markerAlternation = DEFAULTS.DEBT_MARKERS.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const markerRegex = new RegExp(`(?:^|[^\\w])(${markerAlternation})(?:\\b)\\s*[:\-]\\s*(.+)$`, 'i');
      const match = lineText.match(markerRegex);
      if (!match) return undefined;

      const marker = match[1].toUpperCase();
      const description = match[2].trim();
      const title = `FixFlow: Convert ${marker} to Debt`;
      const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
      const args = { uri: document.uri, line: lineIndex, marker, description };
      action.command = { command: COMMANDS.CONVERT_TODO_TO_DEBT, title, arguments: [args] };
      return [action];
    } catch {
      return undefined;
    }
  }
}

export class TodoConversionHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    try {
      const lineIndex = position.line;
      const lineText = document.lineAt(lineIndex).text;
      const markerAlternation = DEFAULTS.DEBT_MARKERS.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const markerRegex = new RegExp(`(?:^|[^\\w])(${markerAlternation})(?:\\b)\\s*[:\-]\\s*(.+)$`, 'i');
      const match = lineText.match(markerRegex);
      if (!match) return undefined;
      const marker = match[1].toUpperCase();
      const description = match[2].trim();
      const args = encodeURIComponent(JSON.stringify({ uri: document.uri, line: lineIndex, marker, description }));
      const cmdLink = `command:${COMMANDS.CONVERT_TODO_TO_DEBT}?${args}`;
      const md = new vscode.MarkdownString(undefined, true);
      md.isTrusted = true;
      md.appendMarkdown(`Convert ${marker} to a FixFlow debt: [Create](${cmdLink})`);
      return new vscode.Hover(md);
    } catch {
      return undefined;
    }
  }
}


