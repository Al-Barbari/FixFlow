import * as vscode from 'vscode';
import * as path from 'path';
import { ScanResult, TechnicalDebt, DebtSeverity, DebtCategory, DebtStatus, DebtPriority, ProjectConfig } from '../types';
import { DEFAULTS } from '../constants';
import { getContextLines, getRelativePath } from '../utils';
import { ConfigurationService } from './config-service';

/**
 * ScannerService
 * Scans workspace files for technical-debt markers (e.g., TODO, FIXME) and
 * suggests debt entries based on matches.
 */
export class ScannerService {
  private readonly configurationService: ConfigurationService;

  constructor(configurationService?: ConfigurationService) {
    this.configurationService = configurationService ?? new ConfigurationService();
  }

  /**
   * Scan the entire workspace using configured include/exclude patterns.
   */
  public async scanWorkspace(token?: vscode.CancellationToken): Promise<ScanResult[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    const config = this.configurationService.getProjectConfig();
    const includePatterns = config.scanPatterns.length > 0 ? config.scanPatterns : DEFAULTS.SCAN_PATTERNS;
    const excludePatterns = config.excludePatterns.length > 0 ? config.excludePatterns : DEFAULTS.EXCLUDE_PATTERNS;

    const excludeGlob: vscode.GlobPattern | undefined = excludePatterns.length > 0
      ? `{${excludePatterns.join(',')}}`
      : undefined;

    // Aggregate file URIs from all include patterns to a unique set
    const uriSet: Set<string> = new Set();
    const fileUris: vscode.Uri[] = [];

    for (const include of includePatterns) {
      const uris = await vscode.workspace.findFiles(include as vscode.GlobPattern, excludeGlob, undefined, token);
      for (const uri of uris) {
        if (!uriSet.has(uri.toString())) {
          uriSet.add(uri.toString());
          fileUris.push(uri);
        }
      }
    }

    const results: ScanResult[] = [];
    for (const uri of fileUris) {
      if (token?.isCancellationRequested) break;
      const fileResults = await this.scanFileUri(uri, config);
      results.push(...fileResults);
    }

    return results;
  }

  /**
   * Scan a single file by file system path.
   */
  public async scanFile(filePath: string): Promise<ScanResult[]> {
    const config = this.configurationService.getProjectConfig();
    const uri = vscode.Uri.file(filePath);
    return this.scanFileUri(uri, config);
  }

  private async scanFileUri(uri: vscode.Uri, config: ProjectConfig): Promise<ScanResult[]> {
    try {
      const documentBytes = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(documentBytes).toString('utf8');
      return this.extractScanResults(uri.fsPath, content, config);
    } catch {
      return [];
    }
  }

  /**
   * Extract scan results from a file's content using configured markers.
   */
  private extractScanResults(filePath: string, content: string, config: ProjectConfig): ScanResult[] {
    const markers = (config.debtMarkers && config.debtMarkers.length > 0)
      ? config.debtMarkers
      : DEFAULTS.DEBT_MARKERS;

    const markerAlternation = markers
      .map(m => this.escapeRegExp(m))
      .join('|');

    // Match comment markers followed by a colon or dash and capture the description text
    const markerRegex = new RegExp(`(?:^|[^\w])(${markerAlternation})(?:\b)\s*[:\-]\s*(.+)$`, 'i');

    const results: ScanResult[] = [];
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const match = line.match(markerRegex);
      if (!match) continue;

      const marker = match[1].toUpperCase();
      const description = match[2].trim();
      const lineNumberOneBased = index + 1;

      const suggestedDebt: Partial<TechnicalDebt> = this.buildSuggestedDebt(
        filePath,
        lineNumberOneBased,
        marker,
        description
      );

      results.push({
        filePath: getRelativePath(filePath),
        lineNumber: lineNumberOneBased,
        marker,
        content: line,
        suggestedDebt
      });
    }

    return results;
  }

  /**
   * Build a suggested TechnicalDebt object from a match.
   */
  private buildSuggestedDebt(
    filePath: string,
    lineNumber: number,
    marker: string,
    description: string
  ): Partial<TechnicalDebt> {
    const contextLines = getContextLines(filePath, lineNumber - 1, DEFAULTS.MAX_CONTEXT_LINES);
    const title = `${marker}: ${description}`.slice(0, 100);

    return {
      title,
      description,
      filePath: getRelativePath(filePath),
      lineNumber,
      severity: DebtSeverity.LOW,
      category: DebtCategory.CODE_QUALITY,
      status: DebtStatus.OPEN,
      priority: DebtPriority.NORMAL,
      tags: [marker]
    };
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}


