import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { DebtService } from '../services';
import { DebtCategory, DebtPriority, DebtSeverity, TechnicalDebt } from '../types';
import { MESSAGES, UI } from '../constants';
import {
  getActiveEditor,
  getCurrentFilePath,
  getCurrentLineNumber,
  getContextLines,
  getRelativePath,
  showErrorMessage,
  validateDebtEntry
} from '../utils';
import { DebtFormWebview } from '../webviews/debt-form-webview';

export class DebtFormProvider {
  private webviewPanel: vscode.WebviewPanel | null = null;

  public async showQuickCreate(debtService: DebtService, context: vscode.ExtensionContext): Promise<void> {
    const editor = getActiveEditor();
    if (!editor) {
      showErrorMessage('No active editor. Open a file to create a debt entry.');
      return;
    }

    const filePath = getCurrentFilePath();
    const absLine = getCurrentLineNumber();
    if (!filePath || absLine === undefined) {
      showErrorMessage('Could not determine file path or line number.');
      return;
    }

    const lineNumber = absLine + 1; // store as 1-based
    const contextLines = getContextLines(filePath, absLine);
    const relativePath = getRelativePath(filePath);

    const action = await vscode.window.showQuickPick([
      { label: 'Quick add', description: 'Enter minimal details inline' },
      { label: 'Open full form…', description: 'Use a webview form with more fields' }
    ], { placeHolder: 'How would you like to create the debt entry?' });

    if (!action) {
      return; // cancelled
    }

    if (action.label.startsWith('Open full')) {
      await this.openWebview(debtService, context, {
        filePath,
        lineNumber,
        context: contextLines.join('\n')
      });
      return;
    }

    const title = await vscode.window.showInputBox({
      title: UI.CREATE_DEBT_TITLE,
      prompt: 'Title',
      validateInput: (value: string) => value.trim().length === 0 ? 'Title is required' : undefined
    });
    if (!title) return;

    const description = await vscode.window.showInputBox({
      title: UI.CREATE_DEBT_TITLE,
      prompt: 'Description',
      validateInput: (value: string) => value.trim().length === 0 ? 'Description is required' : undefined
    });
    if (!description) return;

    const severityPick = await vscode.window.showQuickPick(
      Object.values(DebtSeverity),
      { placeHolder: 'Select severity', canPickMany: false }
    );
    if (!severityPick) return;

    const categoryPick = await vscode.window.showQuickPick(
      Object.values(DebtCategory),
      { placeHolder: 'Select category', canPickMany: false }
    );
    if (!categoryPick) return;

    const priorityPick = await vscode.window.showQuickPick(
      Object.values(DebtPriority),
      { placeHolder: 'Select priority', canPickMany: false }
    );
    if (!priorityPick) return;

    const ownerSuggestions = await this.getOwnerSuggestions(filePath, lineNumber);
    const assignee = await vscode.window.showQuickPick(
      ownerSuggestions.length > 0 ? ownerSuggestions : ['(skip)'],
      { placeHolder: ownerSuggestions.length > 0 ? 'Suggested owners (git blame)' : 'No owner suggestions found' }
    );

    const tagsInput = await vscode.window.showInputBox({
      prompt: 'Tags (comma-separated, optional)'
    });

    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];

    const partial: Partial<TechnicalDebt> = {
      title,
      description,
      filePath: relativePath,
      lineNumber,
      severity: severityPick as DebtSeverity,
      category: categoryPick as DebtCategory,
      priority: priorityPick as DebtPriority,
      context: contextLines.join('\n'),
      assignee: assignee && assignee !== '(skip)' ? assignee : undefined,
      tags
    } as Partial<TechnicalDebt>;

    const errors = validateDebtEntry(partial);
    if (errors.length > 0) {
      showErrorMessage(errors.join('; '));
      return;
    }

    await debtService.createDebt(partial as Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'>);
    vscode.window.showInformationMessage(`${MESSAGES.DEBT_CREATED}: ${title}`);
  }

  public async openWebview(
    debtService: DebtService,
    context: vscode.ExtensionContext,
    defaults?: Partial<Pick<TechnicalDebt, 'filePath' | 'lineNumber' | 'context'>>,
    onCreated?: (created: TechnicalDebt) => void | Promise<void>
  ): Promise<void> {
    if (this.webviewPanel) {
      this.webviewPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'fixflowCreateDebt',
      UI.CREATE_DEBT_TITLE,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    this.webviewPanel = panel;
    panel.onDidDispose(() => { this.webviewPanel = null; }, null, context.subscriptions);

    const webview = new DebtFormWebview(panel.webview);
    webview.render(defaults);

    panel.webview.onDidReceiveMessage(async (message: any) => {
      if (message?.type === 'submit') {
        try {
          const partial: Partial<TechnicalDebt> = {
            title: message.payload.title,
            description: message.payload.description,
            filePath: message.payload.filePath,
            lineNumber: message.payload.lineNumber,
            severity: message.payload.severity as DebtSeverity,
            category: message.payload.category as DebtCategory,
            priority: message.payload.priority as DebtPriority,
            tags: Array.isArray(message.payload.tags) ? message.payload.tags : [],
            assignee: message.payload.assignee || undefined,
            context: message.payload.context || undefined
          };

          const errors = validateDebtEntry(partial);
          if (errors.length > 0) {
            panel.webview.postMessage({ type: 'validationError', payload: errors });
            return;
          }

          const created = await debtService.createDebt(partial as Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'>);
          vscode.window.showInformationMessage(MESSAGES.DEBT_CREATED);
          if (onCreated) {
            try { await onCreated(created); } catch { /* ignore */ }
          }
          panel.dispose();
        } catch (error) {
          const messageText = error instanceof Error ? error.message : String(error);
          panel.webview.postMessage({ type: 'error', payload: messageText });
        }
      } else if (message?.type === 'requestOwnerSuggestions') {
        const suggestions = await this.getOwnerSuggestions(message.payload.filePath, message.payload.lineNumber);
        panel.webview.postMessage({ type: 'ownerSuggestions', payload: suggestions });
      }
    }, undefined, context.subscriptions);
  }

  private async getOwnerSuggestions(filePath: string, lineNumber: number): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        resolve([]);
        return;
      }

      // Use git blame to suggest the author of the specific line
      const blame = spawn('git', ['blame', `-L`, `${lineNumber},${lineNumber}`, '--line-porcelain', filePath], { cwd: workspaceRoot, shell: false });
      let stdout = '';
      let stderr = '';
      blame.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      blame.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      blame.on('close', () => {
        if (stderr.trim().length > 0) {
          resolve([]);
          return;
        }
        const authorMatch = stdout.match(/^author\s+(.+)$/m);
        const mailMatch = stdout.match(/^author-mail\s+<(.+)>$/m);
        const suggestions = new Set<string>();
        if (authorMatch) {
          const name = authorMatch[1].trim();
          const email = mailMatch ? mailMatch[1].trim() : '';
          suggestions.add(email ? `${name} <${email}>` : name);
        }
        resolve(Array.from(suggestions));
      });
      blame.on('error', () => resolve([]));
    });
  }
}


