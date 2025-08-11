/**
 * Core types and interfaces for FixFlow extension
 */

export interface TechnicalDebt {
  id: string;
  title: string;
  description: string;
  filePath: string;
  lineNumber: number;
  severity: DebtSeverity;
  category: DebtCategory;
  status: DebtStatus;
  priority: DebtPriority;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  tags: string[];
  context?: string; // Selected code context
  assignee?: string;
  estimatedEffort?: string;
  notes?: string;
}

export enum DebtSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum DebtCategory {
  CODE_QUALITY = 'code-quality',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  ARCHITECTURE = 'architecture',
  REFACTORING = 'refactoring',
  OTHER = 'other'
}

export enum DebtStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum DebtPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface DebtFilter {
  severity?: DebtSeverity[];
  category?: DebtCategory[];
  status?: DebtStatus[];
  priority?: DebtPriority[];
  tags?: string[];
  assignee?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ProjectConfig {
  enabled: boolean;
  autoScan: boolean;
  debtMarkers: string[];
  storagePath: string;
  notifications: boolean;
  scanPatterns: string[];
  excludePatterns: string[];
}

export interface ScanResult {
  filePath: string;
  lineNumber: number;
  marker: string;
  content: string;
  suggestedDebt?: Partial<TechnicalDebt>;
}

export interface ExportOptions {
  format: 'markdown' | 'json' | 'csv';
  includeResolved: boolean;
  groupBy?: 'category' | 'severity' | 'status' | 'assignee';
  dateRange?: {
    start: Date;
    end: Date;
  };
}
