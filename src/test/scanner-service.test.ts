import { strict as assert } from 'assert';
import { ScannerService } from '../services';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('ScannerService', () => {
  let testWorkspaceRoot: string;
  let testDir: string;
  let testFile: string;

  setup(async () => {
    testWorkspaceRoot = path.join(__dirname, '../../test-workspace');
    testDir = path.join(testWorkspaceRoot, 'src');
    testFile = path.join(testDir, 'sample.ts');

    // Mock workspace folder
    (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: testWorkspaceRoot } }];

    // Ensure directories
    fs.mkdirSync(testDir, { recursive: true });

    // Write a sample file with markers
    const content = [
      '// This is a file',
      '// TODO: Refactor this function',
      'function demo() {',
      '  // FIXME: handle edge cases',
      '  return 1;',
      '}',
    ].join('\n');
    fs.writeFileSync(testFile, content, 'utf8');
  });

  teardown(() => {
    if (fs.existsSync(testWorkspaceRoot)) {
      fs.rmSync(testWorkspaceRoot, { recursive: true, force: true });
    }
  });

  test('scanFile should find markers and suggest debts', async () => {
    const scanner = new ScannerService();
    const results = await scanner.scanFile(testFile);

    assert.ok(results.length >= 2);
    const todo = results.find(r => r.marker === 'TODO');
    const fixme = results.find(r => r.marker === 'FIXME');
    assert.ok(todo);
    assert.ok(fixme);
    assert.strictEqual(todo?.suggestedDebt?.filePath, 'src/sample.ts');
    assert.ok((todo?.suggestedDebt?.title || '').startsWith('TODO:'));
  });

  test('scanWorkspace should aggregate results', async () => {
    const scanner = new ScannerService();
    const results = await scanner.scanWorkspace();
    assert.ok(results.length >= 2);
  });
});


