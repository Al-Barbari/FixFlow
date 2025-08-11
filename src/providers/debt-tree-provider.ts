import * as vscode from 'vscode';
import * as path from 'path';
import { DebtService } from '../services';
import { DebtPriority, DebtSeverity, TechnicalDebt } from '../types';
import { getWorkspaceRoot } from '../utils';

type NodeType = 'project' | 'file' | 'severity' | 'debt';

interface BaseNode {
  type: NodeType;
  id: string;
  label: string;
}

interface ProjectNode extends BaseNode {
  type: 'project';
}

interface FileNode extends BaseNode {
  type: 'file';
  filePath: string; // relative to workspace
}

interface SeverityNode extends BaseNode {
  type: 'severity';
  filePath: string; // relative
  severity: DebtSeverity;
}

interface DebtNode extends BaseNode {
  type: 'debt';
  debt: TechnicalDebt;
}

type TreeNode = ProjectNode | FileNode | SeverityNode | DebtNode;

export interface DebtBoardFilter {
  severities?: DebtSeverity[];
  priorities?: DebtPriority[];
  text?: string; // search substring across title/description/tags
}

export class DebtTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<TreeNode | void>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private filter: DebtBoardFilter = {};

  constructor(private readonly debtService: DebtService) {}

  public refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  public setFilter(filter: DebtBoardFilter): void {
    this.filter = filter;
    this.refresh();
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!element) {
      const project: ProjectNode = {
        type: 'project',
        id: 'project-root',
        label: await this.getProjectLabel()
      };
      return [project];
    }

    if (element.type === 'project') {
      const debts = await this.getFilteredDebts();
      const files = Array.from(new Set(debts.map(d => d.filePath)));
      files.sort((a, b) => a.localeCompare(b));
      return files.map((filePathRel): FileNode => ({
        type: 'file',
        id: `file:${filePathRel}`,
        label: filePathRel,
        filePath: filePathRel
      }));
    }

    if (element.type === 'file') {
      const debts = await this.getFilteredDebts();
      const forFile = debts.filter(d => d.filePath === element.filePath);
      const severities = Array.from(new Set(forFile.map(d => d.severity)));
      severities.sort((a, b) => this.severityOrder(a) - this.severityOrder(b));
      return severities.map((sev): SeverityNode => ({
        type: 'severity',
        id: `sev:${element.filePath}:${sev}`,
        label: sev,
        filePath: element.filePath,
        severity: sev
      }));
    }

    if (element.type === 'severity') {
      const debts = await this.getFilteredDebts();
      const items = debts.filter(d => d.filePath === element.filePath && d.severity === element.severity);
      items.sort((a, b) => this.compareDebts(a, b));
      return items.map((debt): DebtNode => ({
        type: 'debt',
        id: `debt:${debt.id}`,
        label: debt.title,
        debt
      }));
    }

    return [];
  }

  async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
    switch (element.type) {
      case 'project': {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
        item.contextValue = 'projectNode';
        item.iconPath = new vscode.ThemeIcon('project');
        return item;
      }
      case 'file': {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.contextValue = 'fileNode';
        item.iconPath = new vscode.ThemeIcon('file');
        item.tooltip = element.filePath;
        return item;
      }
      case 'severity': {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.contextValue = 'severityNode';
        item.iconPath = this.iconForSeverity(element.severity);
        return item;
      }
      case 'debt': {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        item.contextValue = 'debtNode';
        item.description = `${element.debt.priority} • line ${element.debt.lineNumber}`;
        item.tooltip = element.debt.description;
        item.iconPath = new vscode.ThemeIcon('issue-opened');

        const root = getWorkspaceRoot();
        if (root) {
          const full = path.join(root, element.debt.filePath);
          item.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [
              vscode.Uri.file(full),
              <vscode.TextDocumentShowOptions>{
                selection: new vscode.Range(
                  new vscode.Position(Math.max(0, element.debt.lineNumber - 1), 0),
                  new vscode.Position(Math.max(0, element.debt.lineNumber - 1), 0)
                )
              }
            ]
          };
        }
        return item;
      }
    }
  }

  private async getFilteredDebts(): Promise<TechnicalDebt[]> {
    const debts = await this.debtService.getAllDebts();
    const f = this.filter;
    return debts.filter(d => {
      if (f.severities && f.severities.length > 0 && !f.severities.includes(d.severity)) return false;
      if (f.priorities && f.priorities.length > 0 && !f.priorities.includes(d.priority)) return false;
      if (f.text && f.text.trim().length > 0) {
        const q = f.text.toLowerCase();
        const hay = [d.title, d.description, ...(d.tags || [])].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  private async getProjectLabel(): Promise<string> {
    try {
      // Try to get project name from metadata via debtService's storage
      const all = await this.debtService.getAllDebts();
      const root = getWorkspaceRoot();
      return root ? path.basename(root) : 'Project';
    } catch {
      const root = getWorkspaceRoot();
      return root ? path.basename(root) : 'Project';
    }
  }

  private severityOrder(s: DebtSeverity): number {
    const order: DebtSeverity[] = [
      DebtSeverity.CRITICAL,
      DebtSeverity.HIGH,
      DebtSeverity.MEDIUM,
      DebtSeverity.LOW
    ];
    return order.indexOf(s);
  }

  private priorityOrder(p: DebtPriority): number {
    const order: DebtPriority[] = [
      DebtPriority.URGENT,
      DebtPriority.HIGH,
      DebtPriority.NORMAL,
      DebtPriority.LOW
    ];
    return order.indexOf(p);
  }

  private compareDebts(a: TechnicalDebt, b: TechnicalDebt): number {
    const byPriority = this.priorityOrder(a.priority) - this.priorityOrder(b.priority);
    if (byPriority !== 0) return byPriority;
    const aTime = (a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt as unknown as string)).getTime();
    const bTime = (b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt as unknown as string)).getTime();
    return bTime - aTime; // recent first
  }

  private iconForSeverity(sev: DebtSeverity): vscode.ThemeIcon {
    switch (sev) {
      case DebtSeverity.CRITICAL: return new vscode.ThemeIcon('flame');
      case DebtSeverity.HIGH: return new vscode.ThemeIcon('warning');
      case DebtSeverity.MEDIUM: return new vscode.ThemeIcon('alert');
      case DebtSeverity.LOW: return new vscode.ThemeIcon('info');
      default: return new vscode.ThemeIcon('symbol-misc');
    }
  }
}


