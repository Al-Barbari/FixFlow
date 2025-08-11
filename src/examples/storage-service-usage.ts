import { StorageService } from '../services/storage-service';
import { TechnicalDebt, DebtSeverity, DebtCategory, DebtStatus, DebtPriority } from '../types';

/**
 * Example usage of the StorageService
 * This file demonstrates how to use the storage service for common operations
 */

export class StorageServiceExample {
  private storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    try {
      await this.storageService.initialize();
      console.log('Storage service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize storage service:', error);
      throw error;
    }
  }

  /**
   * Example: Create a new technical debt entry
   */
  async createDebtExample(): Promise<TechnicalDebt> {
    const newDebt: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'Refactor legacy authentication code',
      description: 'The current authentication system uses deprecated methods and should be updated to use modern security practices.',
      filePath: 'src/auth/legacy-auth.ts',
      lineNumber: 45,
      severity: DebtSeverity.HIGH,
      category: DebtCategory.SECURITY,
      status: DebtStatus.OPEN,
      priority: DebtPriority.HIGH,
      tags: ['security', 'refactor', 'authentication'],
      context: '// TODO: Replace with modern OAuth2 implementation',
      assignee: 'john.doe@company.com',
      estimatedEffort: '2-3 days',
      notes: 'This is blocking the implementation of new SSO features.'
    };

    try {
      const createdDebt = await this.storageService.addDebt(newDebt);
      console.log('Created debt entry:', createdDebt);
      return createdDebt;
    } catch (error) {
      console.error('Failed to create debt entry:', error);
      throw error;
    }
  }

  /**
   * Example: Create multiple debt entries
   */
  async createMultipleDebtsExample(): Promise<TechnicalDebt[]> {
    const debts: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Add unit tests for user service',
        description: 'The user service lacks comprehensive test coverage, especially for edge cases.',
        filePath: 'src/services/user-service.ts',
        lineNumber: 120,
        severity: DebtSeverity.MEDIUM,
        category: DebtCategory.TESTING,
        status: DebtStatus.OPEN,
        priority: DebtPriority.NORMAL,
        tags: ['testing', 'coverage', 'unit-tests'],
        assignee: 'jane.smith@company.com',
        estimatedEffort: '1 day'
      },
      {
        title: 'Optimize database queries',
        description: 'Several database queries are not using proper indexes, causing performance issues.',
        filePath: 'src/database/queries.ts',
        lineNumber: 78,
        severity: DebtSeverity.MEDIUM,
        category: DebtCategory.PERFORMANCE,
        status: DebtStatus.OPEN,
        priority: DebtPriority.HIGH,
        tags: ['performance', 'database', 'optimization'],
        assignee: 'bob.wilson@company.com',
        estimatedEffort: '3-4 days'
      },
      {
        title: 'Update API documentation',
        description: 'API documentation is outdated and missing several new endpoints.',
        filePath: 'docs/api.md',
        lineNumber: 15,
        severity: DebtSeverity.LOW,
        category: DebtCategory.DOCUMENTATION,
        status: DebtStatus.OPEN,
        priority: DebtPriority.LOW,
        tags: ['documentation', 'api', 'maintenance'],
        assignee: 'alice.jones@company.com',
        estimatedEffort: '4-6 hours'
      }
    ];

    const createdDebts: TechnicalDebt[] = [];
    
    for (const debt of debts) {
      try {
        const createdDebt = await this.storageService.addDebt(debt);
        createdDebts.push(createdDebt);
        console.log(`Created debt: ${createdDebt.title}`);
      } catch (error) {
        console.error(`Failed to create debt "${debt.title}":`, error);
      }
    }

    return createdDebts;
  }

  /**
   * Example: Update an existing debt entry
   */
  async updateDebtExample(debtId: string): Promise<TechnicalDebt | null> {
    try {
      // First, get the current debt
      const currentDebt = await this.storageService.getDebt(debtId);
      if (!currentDebt) {
        console.log('Debt not found');
        return null;
      }

      console.log('Current debt:', currentDebt);

      // Update the debt
      const updatedDebt = await this.storageService.updateDebt(debtId, {
        status: DebtStatus.IN_PROGRESS,
        assignee: 'john.doe@company.com',
        notes: 'Started working on this refactor. Will complete by end of week.'
      });

      console.log('Updated debt:', updatedDebt);
      return updatedDebt;
    } catch (error) {
      console.error('Failed to update debt:', error);
      throw error;
    }
  }

  /**
   * Example: Get debts by various criteria
   */
  async queryDebtsExample(): Promise<void> {
    try {
      // Get all debts
      const allDebts = await this.storageService.getAllDebts();
      console.log(`Total debts: ${allDebts.length}`);

      // Get debts by file
      const authDebts = await this.storageService.getDebtsByFile('src/auth/legacy-auth.ts');
      console.log(`Debts in auth file: ${authDebts.length}`);

      // Get debts by status
      const openDebts = await this.storageService.getDebtsByStatus(DebtStatus.OPEN);
      console.log(`Open debts: ${openDebts.length}`);

      const inProgressDebts = await this.storageService.getDebtsByStatus(DebtStatus.IN_PROGRESS);
      console.log(`In-progress debts: ${inProgressDebts.length}`);

      // Get debts by severity
      const highSeverityDebts = allDebts.filter(debt => debt.severity === DebtSeverity.HIGH);
      console.log(`High severity debts: ${highSeverityDebts.length}`);

      // Get debts by category
      const securityDebts = allDebts.filter(debt => debt.category === DebtCategory.SECURITY);
      console.log(`Security-related debts: ${securityDebts.length}`);

      // Get debts by assignee
      const johnsDebts = allDebts.filter(debt => debt.assignee === 'john.doe@company.com');
      console.log(`John's assigned debts: ${johnsDebts.length}`);

    } catch (error) {
      console.error('Failed to query debts:', error);
      throw error;
    }
  }

  /**
   * Example: Update storage settings
   */
  async updateSettingsExample(): Promise<void> {
    try {
      // Enable GitHub integration
      await this.storageService.updateSettings({
        githubIntegration: true,
        autoCommit: true,
        commitMessageTemplate: 'chore: update technical debt tracking - {count} items'
      });

      console.log('Settings updated successfully');

      // Get current settings
      const currentSettings = await this.storageService.getSettings();
      console.log('Current settings:', currentSettings);

    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  /**
   * Example: Get storage metadata
   */
  async getMetadataExample(): Promise<void> {
    try {
      const metadata = await this.storageService.getMetadata();
      console.log('Storage metadata:', metadata);

      console.log(`Project: ${metadata.projectName}`);
      console.log(`Version: ${metadata.version}`);
      console.log(`Total debts: ${metadata.totalDebts}`);
      console.log(`Last updated: ${metadata.lastUpdated}`);

    } catch (error) {
      console.error('Failed to get metadata:', error);
      throw error;
    }
  }

  /**
   * Example: Delete a debt entry
   */
  async deleteDebtExample(debtId: string): Promise<void> {
    try {
      // First, verify the debt exists
      const debt = await this.storageService.getDebt(debtId);
      if (!debt) {
        console.log('Debt not found, nothing to delete');
        return;
      }

      console.log('Deleting debt:', debt.title);

      // Delete the debt
      await this.storageService.deleteDebt(debtId);
      console.log('Debt deleted successfully');

      // Verify deletion
      const deletedDebt = await this.storageService.getDebt(debtId);
      if (!deletedDebt) {
        console.log('Deletion verified');
      }

    } catch (error) {
      console.error('Failed to delete debt:', error);
      throw error;
    }
  }

  /**
   * Example: Complete workflow - create, update, and resolve a debt
   */
  async completeWorkflowExample(): Promise<void> {
    try {
      console.log('=== Starting Complete Workflow Example ===');

      // 1. Create a new debt
      const debt = await this.createDebtExample();
      console.log('1. Created debt:', debt.title);

      // 2. Update debt status to in-progress
      const updatedDebt = await this.updateDebtExample(debt.id);
      console.log('2. Updated debt status to in-progress');

      // 3. Update debt status to resolved
      if (updatedDebt) {
        const resolvedDebt = await this.storageService.updateDebt(updatedDebt.id, {
          status: DebtStatus.RESOLVED,
          notes: 'Successfully refactored authentication system to use modern OAuth2 implementation.'
        });
        console.log('3. Resolved debt:', resolvedDebt.title);
      }

      // 4. Show final state
      await this.queryDebtsExample();
      await this.getMetadataExample();

      console.log('=== Workflow Example Completed ===');

    } catch (error) {
      console.error('Workflow example failed:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.storageService.dispose();
  }
}

/**
 * Usage example:
 * 
 * const example = new StorageServiceExample();
 * 
 * try {
 *   await example.initialize();
 *   await example.completeWorkflowExample();
 * } catch (error) {
 *   console.error('Example failed:', error);
 * } finally {
 *   example.dispose();
 * }
 */
