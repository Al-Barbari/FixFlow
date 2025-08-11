import * as vscode from 'vscode';
import { DebtCategory, DebtPriority, DebtSeverity, TechnicalDebt } from '../types';

export class DebtFormWebview {
  private readonly webview: vscode.Webview;

  constructor(webview: vscode.Webview) {
    this.webview = webview;
  }

  public render(defaults?: Partial<Pick<TechnicalDebt, 'filePath' | 'lineNumber' | 'context'>>): void {
    this.webview.html = this.getHtml(defaults);
  }

  private getHtml(defaults?: Partial<Pick<TechnicalDebt, 'filePath' | 'lineNumber' | 'context'>>): string {
    const esc = (s: string | undefined) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const filePath = esc(defaults?.filePath);
    const lineNumber = defaults?.lineNumber ?? '';
    const context = esc(defaults?.context);

    const severityOptions = Object.values(DebtSeverity).map(v => `<option value="${v}">${v}</option>`).join('');
    const categoryOptions = Object.values(DebtCategory).map(v => `<option value="${v}">${v}</option>`).join('');
    const priorityOptions = Object.values(DebtPriority).map(v => `<option value="${v}">${v}</option>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Create Technical Debt</title>
  <style>
    body { font-family: var(--vscode-font-family); padding: 12px; color: var(--vscode-foreground); }
    .row { margin-bottom: 10px; }
    label { display: block; margin-bottom: 4px; }
    input[type=text], textarea, select { width: 100%; padding: 6px; box-sizing: border-box; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
    textarea { min-height: 80px; }
    .error { color: var(--vscode-errorForeground); margin: 8px 0; }
    .actions { margin-top: 14px; display: flex; gap: 8px; }
    button { padding: 6px 12px; }
  </style>
  </head>
  <body>
    <h2>Create Technical Debt</h2>
    <div id="errors" class="error" style="display:none"></div>
    <div class="row">
      <label>Title</label>
      <input id="title" type="text" />
    </div>
    <div class="row">
      <label>Description</label>
      <textarea id="description"></textarea>
    </div>
    <div class="row">
      <label>File path (relative)</label>
      <input id="filePath" type="text" value="${filePath}" />
    </div>
    <div class="row">
      <label>Line number</label>
      <input id="lineNumber" type="text" value="${lineNumber}" />
    </div>
    <div class="row">
      <label>Severity</label>
      <select id="severity">${severityOptions}</select>
    </div>
    <div class="row">
      <label>Category</label>
      <select id="category">${categoryOptions}</select>
    </div>
    <div class="row">
      <label>Priority</label>
      <select id="priority">${priorityOptions}</select>
    </div>
    <div class="row">
      <label>Assignee</label>
      <div style="display:flex; gap:6px;">
        <input id="assignee" type="text" />
        <button id="suggestOwners">Suggest</button>
      </div>
    </div>
    <div class="row">
      <label>Tags (comma separated)</label>
      <input id="tags" type="text" />
    </div>
    <div class="row">
      <label>Context</label>
      <textarea id="context">${context}</textarea>
    </div>
    <div class="actions">
      <button id="submit">Create</button>
      <button id="cancel">Cancel</button>
    </div>
    <script>
      const vscode = acquireVsCodeApi();
      const errorsEl = document.getElementById('errors');
      function getValue(id){ return document.getElementById(id).value; }
      function showErrors(list){
        if (!list || list.length === 0) { errorsEl.style.display='none'; errorsEl.textContent=''; return; }
        errorsEl.style.display='block';
        errorsEl.textContent = list.join('; ');
      }
      document.getElementById('submit').addEventListener('click', () => {
        const payload = {
          title: getValue('title'),
          description: getValue('description'),
          filePath: getValue('filePath'),
          lineNumber: Number(getValue('lineNumber')),
          severity: getValue('severity'),
          category: getValue('category'),
          priority: getValue('priority'),
          assignee: getValue('assignee'),
          tags: getValue('tags').split(',').map(s => s.trim()).filter(Boolean),
          context: getValue('context')
        };
        vscode.postMessage({ type: 'submit', payload });
      });
      document.getElementById('cancel').addEventListener('click', () => {
        vscode.postMessage({ type: 'cancel' });
      });
      document.getElementById('suggestOwners').addEventListener('click', () => {
        vscode.postMessage({ type: 'requestOwnerSuggestions', payload: { filePath: getValue('filePath'), lineNumber: Number(getValue('lineNumber')) } });
      });
      window.addEventListener('message', event => {
        const { type, payload } = event.data || {};
        if (type === 'validationError') {
          showErrors(payload);
        } else if (type === 'error') {
          showErrors([String(payload)]);
        } else if (type === 'ownerSuggestions') {
          if (Array.isArray(payload) && payload.length) {
            const field = document.getElementById('assignee');
            if (field && !field.value) field.value = payload[0];
          }
        }
      });
    </script>
  </body>
</html>`;
  }
}


