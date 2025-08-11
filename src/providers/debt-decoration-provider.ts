import * as vscode from 'vscode';
import * as path from 'path';
import { DebtService } from '../services';
import { DebtSeverity, TechnicalDebt } from '../types';
import { getWorkspaceRoot } from '../utils';
import { COMMANDS } from '../constants';

/**
 * DebtDecorationProvider
 * - Shows gutter icons and line decorations for technical debt
 * - Provides hover tooltips with quick actions
 */
export class DebtDecorationProvider implements vscode.Disposable {
  private readonly context: vscode.ExtensionContext;
  private readonly debtService: DebtService;
  private readonly decorationTypes: Map<DebtSeverity, vscode.TextEditorDecorationType> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext, debtService?: DebtService) {
    this.context = context;
    this.debtService = debtService ?? new DebtService();
  }

  public async initialize(): Promise<void> {
    await this.debtService.initialize();
    this.createDecorationTypes();

    // Initial render
    this.refreshActiveEditor().catch(() => {/* noop */});

    // Listen to editor/document changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.refreshActiveEditor()),
      vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e)),
      vscode.workspace.onDidSaveTextDocument(() => this.refreshActiveEditor())
    );
  }

  public async refresh(): Promise<void> {
    await this.refreshActiveEditor();
  }

  public dispose(): void {
    for (const d of this.disposables) {
      try { d.dispose(); } catch { /* ignore */ }
    }
    for (const [, t] of this.decorationTypes) {
      try { t.dispose(); } catch { /* ignore */ }
    }
    this.disposables = [];
    this.decorationTypes.clear();
  }

  private onDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
    const active = vscode.window.activeTextEditor;
    if (!active) return;
    if (event.document.uri.toString() !== active.document.uri.toString()) return;
    // Re-apply to current document
    this.refreshActiveEditor().catch(() => {/* noop */});
  }

  private async refreshActiveEditor(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    await this.applyDecorations(editor);
  }

  private iconUri(fileName: string): vscode.Uri {
    return vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'icons', fileName);
  }

  private createDecorationTypes(): void {
    const base: vscode.DecorationRenderOptions = {
      isWholeLine: true,
      overviewRulerLane: vscode.OverviewRulerLane.Right
    };

    const types: Array<[DebtSeverity, vscode.DecorationRenderOptions]> = [
      [DebtSeverity.LOW, {
        ...base,
        gutterIconPath: this.iconUri('severity-low.svg'),
        overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
        border: '1px solid',
        borderColor: new vscode.ThemeColor('editorInfo.border')
      }],
      [DebtSeverity.MEDIUM, {
        ...base,
        gutterIconPath: this.iconUri('severity-medium.svg'),
        overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
        border: '1px solid',
        borderColor: new vscode.ThemeColor('editorWarning.border')
      }],
      [DebtSeverity.HIGH, {
        ...base,
        gutterIconPath: this.iconUri('severity-high.svg'),
        overviewRulerColor: new vscode.ThemeColor('editorWarning.foreground'),
        border: '2px solid',
        borderColor: new vscode.ThemeColor('editorWarning.border')
      }],
      [DebtSeverity.CRITICAL, {
        ...base,
        gutterIconPath: this.iconUri('severity-critical.svg'),
        overviewRulerColor: new vscode.ThemeColor('editorError.foreground'),
        border: '2px solid',
        borderColor: new vscode.ThemeColor('editorError.border')
      }],
    ];

    for (const [severity, opts] of types) {
      const type = vscode.window.createTextEditorDecorationType(opts);
      this.decorationTypes.set(severity, type);
      this.disposables.push(type);
    }
  }

  private buildHoverMarkdown(debt: TechnicalDebt): vscode.MarkdownString {
    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = true;
    const title = debt.title.replace(/\|/g, '\\|');
    const description = (debt.description || '').replace(/\|/g, '\\|');
    const fileInfo = `${debt.filePath}:${debt.lineNumber}`;

    // Command arguments
    const arg = encodeURIComponent(JSON.stringify({ id: debt.id }));
    const resolveCmd = `command:${COMMANDS.RESOLVE_DEBT_ENTRY}?${arg}`;
    const deleteCmd = `command:${COMMANDS.DELETE_DEBT_ENTRY}?${arg}`;

    md.appendMarkdown(`**FixFlow** — ${title}\n\n`);
    md.appendMarkdown(`${description}\n\n`);
    const details = [
      `- Severity: \\\`${debt.severity}\\\``,
      `- Priority: \\\`${debt.priority}\\\``,
      `- Location: \\\`${fileInfo}\\\``
    ].join('\n');
    md.appendMarkdown(details + '\n\n');
    md.appendMarkdown(`[Resolve](${resolveCmd}) • [Delete](${deleteCmd})`);
    return md;
  }

  private async applyDecorations(editor: vscode.TextEditor): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) return;

    const absFile = editor.document.uri.fsPath;
    const relFile = path.relative(workspaceRoot, absFile);

    let debts: TechnicalDebt[] = [];
    try {
      debts = await this.debtService.getAllDebts();
    } catch {
      debts = [];
    }

    const bySeverity: Map<DebtSeverity, vscode.DecorationOptions[]> = new Map();
    for (const sev of Object.values(DebtSeverity)) {
      bySeverity.set(sev, []);
    }

    for (const debt of debts) {
      if (debt.filePath !== relFile) continue;
      const lineIndex = Math.max(0, (debt.lineNumber ?? 1) - 1);
      const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
      const hoverMessage = this.buildHoverMarkdown(debt);
      const options: vscode.DecorationOptions = { range, hoverMessage };
      const bucket = bySeverity.get(debt.severity) ?? [];
      bucket.push(options);
      bySeverity.set(debt.severity, bucket);
    }

    for (const [severity, type] of this.decorationTypes.entries()) {
      const items = bySeverity.get(severity) ?? [];
      editor.setDecorations(type, items);
    }
  }
}


