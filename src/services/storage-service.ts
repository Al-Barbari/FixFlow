import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TechnicalDebt } from '../types';
import { DEFAULTS, ERROR_CODES, MESSAGES } from '../constants';

/**
 * Interface for the storage file structure
 */
export interface StorageData {
  debts: TechnicalDebt[];
  metadata: {
    version: string;
    lastUpdated: string;
    totalDebts: number;
    projectName?: string;
  };
  settings: {
    githubIntegration: boolean;
    autoCommit: boolean;
    autoPush: boolean;
    commitMessageTemplate: string;
  };
}

/**
 * Storage service for managing FixFlow data
 * Handles CRUD operations for .fixflow/debts.json file
 */
export class StorageService {
  private readonly workspaceRoot: string;
  private readonly storageDir: string;
  private readonly storageFile: string;
  private readonly lockFile: string;
  private isLocked: boolean = false;

  constructor() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder found');
    }

    this.workspaceRoot = workspaceFolders[0].uri.fsPath;
    this.storageDir = path.join(this.workspaceRoot, DEFAULTS.STORAGE_PATH);
    this.storageFile = path.join(this.storageDir, 'debts.json');
    this.lockFile = path.join(this.storageDir, '.lock');
  }

  /**
   * Initialize the storage directory and file
   */
  public async initialize(): Promise<void> {
    try {
      // Create .fixflow directory if it doesn't exist
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }

      // Create initial storage file if it doesn't exist
      if (!fs.existsSync(this.storageFile)) {
        const initialData: StorageData = {
          debts: [],
          metadata: {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            totalDebts: 0,
            projectName: path.basename(this.workspaceRoot)
          },
          settings: {
            githubIntegration: false,
            autoCommit: false,
            autoPush: false,
            commitMessageTemplate: 'fix: update technical debt - {count} items'
          }
        };

        await this.writeData(initialData);
      }

      // Validate existing storage file
      await this.validateStorageFile();
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Acquire a lock on the storage file to prevent concurrent access
   */
  private async acquireLock(): Promise<void> {
    if (this.isLocked) {
      throw new Error('Storage is already locked');
    }

    try {
      // Check if lock file exists and is stale (older than 30 seconds)
      if (fs.existsSync(this.lockFile)) {
        const lockStats = fs.statSync(this.lockFile);
        const lockAge = Date.now() - lockStats.mtime.getTime();
        
        if (lockAge < 30000) { // 30 seconds
          throw new Error('Storage is locked by another process');
        }
        
        // Remove stale lock
        fs.unlinkSync(this.lockFile);
      }

      // Create lock file
      fs.writeFileSync(this.lockFile, process.pid.toString());
      this.isLocked = true;
    } catch (error) {
      throw new Error(`Failed to acquire lock: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Release the lock on the storage file
   */
  private async releaseLock(): Promise<void> {
    if (!this.isLocked) {
      return;
    }

    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }
      this.isLocked = false;
    } catch (error) {
      // Log error but don't throw to ensure lock is released
      console.error('Failed to release lock:', error);
      this.isLocked = false;
    }
  }

  /**
   * Read data from the storage file
   */
  public async readData(): Promise<StorageData> {
    try {
      await this.acquireLock();
      
      if (!fs.existsSync(this.storageFile)) {
        throw new Error('Storage file not found');
      }

      const fileContent = fs.readFileSync(this.storageFile, 'utf8');
      const data = JSON.parse(fileContent) as StorageData;
      
      // Validate the data structure
      this.validateDataStructure(data);
      
      return data;
    } catch (error) {
      throw new Error(`Failed to read storage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Write data to the storage file
   */
  public async writeData(data: StorageData): Promise<void> {
    try {
      await this.acquireLock();
      
      // Validate data before writing
      this.validateDataStructure(data);
      
      // Update metadata
      data.metadata.lastUpdated = new Date().toISOString();
      data.metadata.totalDebts = data.debts.length;
      
      // Ensure directory exists
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
      
      // Write data with pretty formatting
      const jsonContent = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.storageFile, jsonContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write storage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Add a new debt entry
   */
  public async addDebt(debt: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'>): Promise<TechnicalDebt> {
    try {
      const data = await this.readData();
      
      const newDebt: TechnicalDebt = {
        ...debt,
        id: this.generateDebtId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      data.debts.push(newDebt);
      await this.writeData(data);
      
      return newDebt;
    } catch (error) {
      throw new Error(`Failed to add debt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing debt entry
   */
  public async updateDebt(id: string, updates: Partial<Omit<TechnicalDebt, 'id' | 'createdAt'>>): Promise<TechnicalDebt> {
    try {
      const data = await this.readData();
      const debtIndex = data.debts.findIndex(debt => debt.id === id);
      
      if (debtIndex === -1) {
        throw new Error(`Debt with id ${id} not found`);
      }
      
      const updatedDebt: TechnicalDebt = {
        ...data.debts[debtIndex],
        ...updates,
        updatedAt: new Date()
      };
      
      data.debts[debtIndex] = updatedDebt;
      await this.writeData(data);
      
      return updatedDebt;
    } catch (error) {
      throw new Error(`Failed to update debt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a debt entry
   */
  public async deleteDebt(id: string): Promise<void> {
    try {
      const data = await this.readData();
      const debtIndex = data.debts.findIndex(debt => debt.id === id);
      
      if (debtIndex === -1) {
        throw new Error(`Debt with id ${id} not found`);
      }
      
      data.debts.splice(debtIndex, 1);
      await this.writeData(data);
    } catch (error) {
      throw new Error(`Failed to delete debt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a debt entry by ID
   */
  public async getDebt(id: string): Promise<TechnicalDebt | null> {
    try {
      const data = await this.readData();
      return data.debts.find(debt => debt.id === id) || null;
    } catch (error) {
      throw new Error(`Failed to get debt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all debt entries with optional filtering
   */
  public async getAllDebts(): Promise<TechnicalDebt[]> {
    try {
      const data = await this.readData();
      return data.debts;
    } catch (error) {
      throw new Error(`Failed to get all debts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get debt entries by file path
   */
  public async getDebtsByFile(filePath: string): Promise<TechnicalDebt[]> {
    try {
      const data = await this.readData();
      return data.debts.filter(debt => debt.filePath === filePath);
    } catch (error) {
      throw new Error(`Failed to get debts by file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get debt entries by status
   */
  public async getDebtsByStatus(status: string): Promise<TechnicalDebt[]> {
    try {
      const data = await this.readData();
      return data.debts.filter(debt => debt.status === status);
    } catch (error) {
      throw new Error(`Failed to get debts by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update storage settings
   */
  public async updateSettings(settings: Partial<StorageData['settings']>): Promise<void> {
    try {
      const data = await this.readData();
      data.settings = { ...data.settings, ...settings };
      await this.writeData(data);
    } catch (error) {
      throw new Error(`Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current storage settings
   */
  public async getSettings(): Promise<StorageData['settings']> {
    try {
      const data = await this.readData();
      return data.settings;
    } catch (error) {
      throw new Error(`Failed to get settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get storage metadata
   */
  public async getMetadata(): Promise<StorageData['metadata']> {
    try {
      const data = await this.readData();
      return data.metadata;
    } catch (error) {
      throw new Error(`Failed to get metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if storage is accessible
   */
  public async isAccessible(): Promise<boolean> {
    try {
      await this.readData();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage file path
   */
  public getStoragePath(): string {
    return this.storageFile;
  }

  /**
   * Get storage directory path
   */
  public getStorageDir(): string {
    return this.storageDir;
  }

  /**
   * Generate a unique debt ID
   */
  private generateDebtId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${DEFAULTS.DEBT_ID_PREFIX}-${timestamp}-${random}`;
  }

  /**
   * Validate the storage file structure
   */
  private async validateStorageFile(): Promise<void> {
    try {
      if (!fs.existsSync(this.storageFile)) {
        return; // File doesn't exist, will be created
      }

      const fileContent = fs.readFileSync(this.storageFile, 'utf8');
      const data = JSON.parse(fileContent);
      this.validateDataStructure(data);
    } catch (error) {
      // If validation fails, backup the corrupted file and create a new one
      await this.backupCorruptedFile();
      throw new Error('Storage file is corrupted and has been backed up');
    }
  }

  /**
   * Validate data structure
   */
  private validateDataStructure(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure: data must be an object');
    }

    if (!Array.isArray(data.debts)) {
      throw new Error('Invalid data structure: debts must be an array');
    }

    if (!data.metadata || typeof data.metadata !== 'object') {
      throw new Error('Invalid data structure: metadata must be an object');
    }

    if (!data.settings || typeof data.settings !== 'object') {
      throw new Error('Invalid data structure: settings must be an object');
    }

    // Validate each debt entry
    for (const debt of data.debts) {
      this.validateDebtStructure(debt);
    }
  }

  /**
   * Validate individual debt structure
   */
  private validateDebtStructure(debt: any): void {
    const requiredFields = ['id', 'title', 'description', 'filePath', 'lineNumber', 'severity', 'category', 'status', 'priority'];
    
    for (const field of requiredFields) {
      if (!(field in debt)) {
        throw new Error(`Invalid debt structure: missing required field '${field}'`);
      }
    }

    if (typeof debt.id !== 'string' || debt.id.trim() === '') {
      throw new Error('Invalid debt structure: id must be a non-empty string');
    }

    if (typeof debt.title !== 'string' || debt.title.trim() === '') {
      throw new Error('Invalid debt structure: title must be a non-empty string');
    }

    if (typeof debt.filePath !== 'string' || debt.filePath.trim() === '') {
      throw new Error('Invalid debt structure: filePath must be a non-empty string');
    }

    if (typeof debt.lineNumber !== 'number' || debt.lineNumber < 1) {
      throw new Error('Invalid debt structure: lineNumber must be a positive number');
    }
  }

  /**
   * Backup corrupted storage file
   */
  private async backupCorruptedFile(): Promise<void> {
    try {
      if (fs.existsSync(this.storageFile)) {
        const backupPath = `${this.storageFile}.backup.${Date.now()}`;
        fs.copyFileSync(this.storageFile, backupPath);
        
        // Notify user about the backup
        vscode.window.showWarningMessage(
          `Storage file corrupted. Backup created at: ${backupPath}`,
          'OK'
        );
      }
    } catch (error) {
      console.error('Failed to backup corrupted file:', error);
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Release lock if still held
    if (this.isLocked) {
      this.releaseLock();
    }
  }
}
