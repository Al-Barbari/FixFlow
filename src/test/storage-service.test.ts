import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService, StorageData } from '../services/storage-service';
import { TechnicalDebt, DebtSeverity, DebtCategory, DebtStatus, DebtPriority } from '../types';

suite('StorageService Test Suite', () => {
  let storageService: StorageService;
  let testWorkspaceRoot: string;
  let testStorageDir: string;
  let testStorageFile: string;

  setup(async () => {
    // Create a temporary test workspace
    testWorkspaceRoot = path.join(__dirname, '../../test-workspace');
    testStorageDir = path.join(testWorkspaceRoot, '.fixflow');
    testStorageFile = path.join(testStorageDir, 'debts.json');

    // Mock vscode.workspace.workspaceFolders
    (vscode.workspace as any).workspaceFolders = [{
      uri: { fsPath: testWorkspaceRoot }
    }];

    // Clean up any existing test files
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }

    storageService = new StorageService();
  });

  teardown(async () => {
    // Clean up test files
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }

    // Dispose storage service
    storageService.dispose();
  });

  test('should initialize storage directory and file', async () => {
    await storageService.initialize();

    assert.strictEqual(fs.existsSync(testStorageDir), true);
    assert.strictEqual(fs.existsSync(testStorageFile), true);

    const data = await storageService.readData();
    assert.strictEqual(data.debts.length, 0);
    assert.strictEqual(data.metadata.version, '1.0.0');
    assert.strictEqual(data.metadata.totalDebts, 0);
    assert.strictEqual(data.settings.githubIntegration, false);
  });

  test('should add new debt entry', async () => {
    await storageService.initialize();

    const newDebt: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'Test Debt',
      description: 'Test description',
      filePath: 'test.ts',
      lineNumber: 10,
      severity: DebtSeverity.MEDIUM,
      category: DebtCategory.CODE_QUALITY,
      status: DebtStatus.OPEN,
      priority: DebtPriority.NORMAL,
      tags: ['test'],
      context: 'test context'
    };

    const addedDebt = await storageService.addDebt(newDebt);

    assert.strictEqual(addedDebt.title, newDebt.title);
    assert.strictEqual(addedDebt.description, newDebt.description);
    assert.strictEqual(addedDebt.id.match(/^debt-\d+-[a-z0-9]+$/), true);
    assert.strictEqual(addedDebt.createdAt instanceof Date, true);
    assert.strictEqual(addedDebt.updatedAt instanceof Date, true);

    const data = await storageService.readData();
    assert.strictEqual(data.debts.length, 1);
    assert.strictEqual(data.metadata.totalDebts, 1);
  });

  test('should update existing debt entry', async () => {
    await storageService.initialize();

    const newDebt: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'Test Debt',
      description: 'Test description',
      filePath: 'test.ts',
      lineNumber: 10,
      severity: DebtSeverity.MEDIUM,
      category: DebtCategory.CODE_QUALITY,
      status: DebtStatus.OPEN,
      priority: DebtPriority.NORMAL,
      tags: ['test']
    };

    const addedDebt = await storageService.addDebt(newDebt);
    const originalUpdatedAt = addedDebt.updatedAt;

    // Wait a bit to ensure updatedAt will be different
    await new Promise(resolve => setTimeout(resolve, 10));

    const updatedDebt = await storageService.updateDebt(addedDebt.id, {
      title: 'Updated Test Debt',
      status: DebtStatus.IN_PROGRESS
    });

    assert.strictEqual(updatedDebt.title, 'Updated Test Debt');
    assert.strictEqual(updatedDebt.status, DebtStatus.IN_PROGRESS);
    assert.strictEqual(updatedDebt.updatedAt.getTime() > originalUpdatedAt.getTime(), true);

    const data = await storageService.readData();
    assert.strictEqual(data.debts[0].title, 'Updated Test Debt');
  });

  test('should delete debt entry', async () => {
    await storageService.initialize();

    const newDebt: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'Test Debt',
      description: 'Test description',
      filePath: 'test.ts',
      lineNumber: 10,
      severity: DebtSeverity.MEDIUM,
      category: DebtCategory.CODE_QUALITY,
      status: DebtStatus.OPEN,
      priority: DebtPriority.NORMAL,
      tags: ['test']
    };

    const addedDebt = await storageService.addDebt(newDebt);
    assert.strictEqual((await storageService.readData()).debts.length, 1);

    await storageService.deleteDebt(addedDebt.id);

    const data = await storageService.readData();
    assert.strictEqual(data.debts.length, 0);
    assert.strictEqual(data.metadata.totalDebts, 0);
  });

  test('should get debt by ID', async () => {
    await storageService.initialize();

    const newDebt: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'Test Debt',
      description: 'Test description',
      filePath: 'test.ts',
      lineNumber: 10,
      severity: DebtSeverity.MEDIUM,
      category: DebtCategory.CODE_QUALITY,
      status: DebtStatus.OPEN,
      priority: DebtPriority.NORMAL,
      tags: ['test']
    };

    const addedDebt = await storageService.addDebt(newDebt);
    const retrievedDebt = await storageService.getDebt(addedDebt.id);

    assert.strictEqual(retrievedDebt?.id, addedDebt.id);
    assert.strictEqual(retrievedDebt?.title, addedDebt.title);

    // Test getting non-existent debt
    const nonExistentDebt = await storageService.getDebt('non-existent-id');
    assert.strictEqual(nonExistentDebt, null);
  });

  test('should get all debts', async () => {
    await storageService.initialize();

    const debts: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Debt 1',
        description: 'Description 1',
        filePath: 'test1.ts',
        lineNumber: 10,
        severity: DebtSeverity.LOW,
        category: DebtCategory.CODE_QUALITY,
        status: DebtStatus.OPEN,
        priority: DebtPriority.LOW,
        tags: ['test1']
      },
      {
        title: 'Debt 2',
        description: 'Description 2',
        filePath: 'test2.ts',
        lineNumber: 20,
        severity: DebtSeverity.HIGH,
        category: DebtCategory.PERFORMANCE,
        status: DebtStatus.OPEN,
        priority: DebtPriority.HIGH,
        tags: ['test2']
      }
    ];

    for (const debt of debts) {
      await storageService.addDebt(debt);
    }

    const allDebts = await storageService.getAllDebts();
    assert.strictEqual(allDebts.length, 2);
    assert.strictEqual(allDebts[0].title, 'Debt 1');
    assert.strictEqual(allDebts[1].title, 'Debt 2');
  });

  test('should get debts by file path', async () => {
    await storageService.initialize();

    const debts: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Debt 1',
        description: 'Description 1',
        filePath: 'test1.ts',
        lineNumber: 10,
        severity: DebtSeverity.LOW,
        category: DebtCategory.CODE_QUALITY,
        status: DebtStatus.OPEN,
        priority: DebtPriority.LOW,
        tags: ['test1']
      },
      {
        title: 'Debt 2',
        description: 'Description 2',
        filePath: 'test2.ts',
        lineNumber: 20,
        severity: DebtSeverity.HIGH,
        category: DebtCategory.PERFORMANCE,
        status: DebtStatus.OPEN,
        priority: DebtPriority.HIGH,
        tags: ['test2']
      },
      {
        title: 'Debt 3',
        description: 'Description 3',
        filePath: 'test1.ts',
        lineNumber: 30,
        severity: DebtSeverity.MEDIUM,
        category: DebtCategory.SECURITY,
        status: DebtStatus.OPEN,
        priority: DebtPriority.NORMAL,
        tags: ['test3']
      }
    ];

    for (const debt of debts) {
      await storageService.addDebt(debt);
    }

    const test1Debts = await storageService.getDebtsByFile('test1.ts');
    assert.strictEqual(test1Debts.length, 2);
    assert.strictEqual(test1Debts.every(debt => debt.filePath === 'test1.ts'), true);

    const test2Debts = await storageService.getDebtsByFile('test2.ts');
    assert.strictEqual(test2Debts.length, 1);
    assert.strictEqual(test2Debts[0].filePath, 'test2.ts');
  });

  test('should get debts by status', async () => {
    await storageService.initialize();

    const debts: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Debt 1',
        description: 'Description 1',
        filePath: 'test1.ts',
        lineNumber: 10,
        severity: DebtSeverity.LOW,
        category: DebtCategory.CODE_QUALITY,
        status: DebtStatus.OPEN,
        priority: DebtPriority.LOW,
        tags: ['test1']
      },
      {
        title: 'Debt 2',
        description: 'Description 2',
        filePath: 'test2.ts',
        lineNumber: 20,
        severity: DebtSeverity.HIGH,
        category: DebtCategory.PERFORMANCE,
        status: DebtStatus.IN_PROGRESS,
        priority: DebtPriority.HIGH,
        tags: ['test2']
      },
      {
        title: 'Debt 3',
        description: 'Description 3',
        filePath: 'test3.ts',
        lineNumber: 30,
        severity: DebtSeverity.MEDIUM,
        category: DebtCategory.SECURITY,
        status: DebtStatus.OPEN,
        priority: DebtPriority.NORMAL,
        tags: ['test3']
      }
    ];

    for (const debt of debts) {
      await storageService.addDebt(debt);
    }

    const openDebts = await storageService.getDebtsByStatus(DebtStatus.OPEN);
    assert.strictEqual(openDebts.length, 2);
    assert.strictEqual(openDebts.every(debt => debt.status === DebtStatus.OPEN), true);

    const inProgressDebts = await storageService.getDebtsByStatus(DebtStatus.IN_PROGRESS);
    assert.strictEqual(inProgressDebts.length, 1);
    assert.strictEqual(inProgressDebts[0].status, DebtStatus.IN_PROGRESS);
  });

  test('should update settings', async () => {
    await storageService.initialize();

    const newSettings = {
      githubIntegration: true,
      autoCommit: true,
      commitMessageTemplate: 'custom: {count} items'
    };

    await storageService.updateSettings(newSettings);

    const settings = await storageService.getSettings();
    assert.strictEqual(settings.githubIntegration, true);
    assert.strictEqual(settings.autoCommit, true);
    assert.strictEqual(settings.commitMessageTemplate, 'custom: {count} items');
    assert.strictEqual(settings.autoPush, false); // Should remain unchanged
  });

  test('should get metadata', async () => {
    await storageService.initialize();

    const metadata = await storageService.getMetadata();
    assert.strictEqual(metadata.version, '1.0.0');
    assert.strictEqual(metadata.totalDebts, 0);
    assert.strictEqual(typeof metadata.lastUpdated, 'string');
    assert.strictEqual(metadata.projectName, 'test-workspace');
  });

  test('should check if storage is accessible', async () => {
    // Before initialization
    assert.strictEqual(await storageService.isAccessible(), false);

    // After initialization
    await storageService.initialize();
    assert.strictEqual(await storageService.isAccessible(), true);
  });

  test('should get storage paths', () => {
    assert.strictEqual(storageService.getStoragePath(), testStorageFile);
    assert.strictEqual(storageService.getStorageDir(), testStorageDir);
  });

  test('should handle file locking', async () => {
    await storageService.initialize();

    // Create a second instance to test locking
    const storageService2 = new StorageService();

    // First service should be able to read
    await storageService.readData();

    // Second service should also be able to read (lock is released after each operation)
    await storageService2.readData();

    storageService2.dispose();
  });

  test('should validate data structure', async () => {
    await storageService.initialize();

    // Test with invalid data structure
    const invalidData: any = {
      debts: 'not an array',
      metadata: {},
      settings: {}
    };

    try {
      await storageService['writeData'](invalidData);
      assert.fail('Should have thrown an error for invalid data structure');
    } catch (error) {
      assert.strictEqual(error instanceof Error, true);
      assert.strictEqual((error as Error).message.includes('Invalid data structure'), true);
    }
  });

  test('should handle corrupted storage file', async () => {
    await storageService.initialize();

    // Corrupt the storage file
    fs.writeFileSync(testStorageFile, 'invalid json content');

    try {
      await storageService.readData();
      assert.fail('Should have thrown an error for corrupted file');
    } catch (error) {
      assert.strictEqual(error instanceof Error, true);
      assert.strictEqual((error as Error).message.includes('corrupted'), true);
    }
  });

  test('should generate unique debt IDs', async () => {
    await storageService.initialize();

    const debt1: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'Debt 1',
      description: 'Description 1',
      filePath: 'test1.ts',
      lineNumber: 10,
      severity: DebtSeverity.LOW,
      category: DebtCategory.CODE_QUALITY,
      status: DebtStatus.OPEN,
      priority: DebtPriority.LOW,
      tags: ['test1']
    };

    const debt2: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'Debt 2',
      description: 'Description 2',
      filePath: 'test2.ts',
      lineNumber: 20,
      severity: DebtSeverity.HIGH,
      category: DebtCategory.PERFORMANCE,
      status: DebtStatus.OPEN,
      priority: DebtPriority.HIGH,
      tags: ['test2']
    };

    const addedDebt1 = await storageService.addDebt(debt1);
    const addedDebt2 = await storageService.addDebt(debt2);

    assert.notStrictEqual(addedDebt1.id, addedDebt2.id);
    assert.strictEqual(addedDebt1.id.match(/^debt-\d+-[a-z0-9]+$/), true);
    assert.strictEqual(addedDebt2.id.match(/^debt-\d+-[a-z0-9]+$/), true);
  });

  test('should handle errors gracefully', async () => {
    // Test with no workspace folders
    (vscode.workspace as any).workspaceFolders = [];

    try {
      new StorageService();
      assert.fail('Should have thrown an error for no workspace folders');
    } catch (error) {
      assert.strictEqual(error instanceof Error, true);
      assert.strictEqual((error as Error).message.includes('No workspace folder found'), true);
    }

    // Restore mock
    (vscode.workspace as any).workspaceFolders = [{
      uri: { fsPath: testWorkspaceRoot }
    }];
  });
});
