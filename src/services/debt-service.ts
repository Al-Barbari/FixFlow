import { TechnicalDebt, DebtStatus } from '../types';
import { StorageService } from './storage-service';
import { validateDebtEntry } from '../utils';

export class DebtService {
  private readonly storageService: StorageService;

  private static readonly allowedStatusTransitions: Record<DebtStatus, DebtStatus[]> = {
    [DebtStatus.OPEN]: [DebtStatus.IN_PROGRESS, DebtStatus.REVIEW, DebtStatus.RESOLVED, DebtStatus.CLOSED],
    [DebtStatus.IN_PROGRESS]: [DebtStatus.REVIEW, DebtStatus.RESOLVED, DebtStatus.OPEN],
    [DebtStatus.REVIEW]: [DebtStatus.RESOLVED, DebtStatus.IN_PROGRESS, DebtStatus.OPEN],
    [DebtStatus.RESOLVED]: [DebtStatus.CLOSED, DebtStatus.OPEN],
    [DebtStatus.CLOSED]: [DebtStatus.OPEN],
  };

  constructor(storageService?: StorageService) {
    this.storageService = storageService ?? new StorageService();
  }

  public async initialize(): Promise<void> {
    await this.storageService.initialize();
  }

  public async createDebt(
    debt: Omit<TechnicalDebt, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TechnicalDebt> {
    const validationErrors = validateDebtEntry(debt);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid debt entry: ${validationErrors.join('; ')}`);
    }
    return await this.storageService.addDebt(debt);
  }

  public async getDebt(id: string): Promise<TechnicalDebt | null> {
    return await this.storageService.getDebt(id);
  }

  public async getAllDebts(): Promise<TechnicalDebt[]> {
    return await this.storageService.getAllDebts();
  }

  public async updateDebt(
    id: string,
    updates: Partial<Omit<TechnicalDebt, 'id' | 'createdAt'>>
  ): Promise<TechnicalDebt> {
    const existing = await this.storageService.getDebt(id);
    if (!existing) {
      throw new Error(`Debt with id ${id} not found`);
    }

    const merged: Partial<TechnicalDebt> = { ...existing, ...updates };
    const validationErrors = validateDebtEntry(merged);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid update: ${validationErrors.join('; ')}`);
    }

    return await this.storageService.updateDebt(id, updates);
  }

  public async deleteDebt(id: string): Promise<void> {
    await this.storageService.deleteDebt(id);
  }

  public async transitionStatus(id: string, newStatus: DebtStatus): Promise<TechnicalDebt> {
    const debt = await this.storageService.getDebt(id);
    if (!debt) {
      throw new Error(`Debt with id ${id} not found`);
    }

    const allowed = DebtService.allowedStatusTransitions[debt.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from '${debt.status}' to '${newStatus}'`);
    }

    return await this.storageService.updateDebt(id, { status: newStatus });
  }

  public async getDebtsByFile(filePath: string): Promise<TechnicalDebt[]> {
    return await this.storageService.getDebtsByFile(filePath);
  }
}


