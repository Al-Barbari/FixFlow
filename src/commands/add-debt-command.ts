import * as vscode from 'vscode';
import { COMMANDS, MESSAGES } from '../constants';
import { DebtService } from '../services';
import { DebtFormProvider } from '../providers/debt-form-provider';

/**
 * Registers the Add Debt command which supports quick add from current line/selection
 * and opening a full form-based creation flow.
 */
export function registerAddDebtCommand(context: vscode.ExtensionContext): vscode.Disposable {
  const disposable = vscode.commands.registerCommand(COMMANDS.CREATE_DEBT_ENTRY, async () => {
    try {
      const debtService = new DebtService();
      await debtService.initialize();
      const provider = new DebtFormProvider();
      await provider.showQuickCreate(debtService, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`${MESSAGES.ERROR_CREATING_DEBT}: ${message}`);
    }
  });

  context.subscriptions.push(disposable);
  return disposable;
}


