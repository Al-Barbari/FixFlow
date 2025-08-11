

export const EXTENSION_ID = 'fixflow';
export const EXTENSION_NAME = 'FixFlow';
export const EXTENSION_VERSION = '0.0.1';

// Command IDs
export const COMMANDS = {
  CREATE_DEBT_ENTRY: 'fixflow.createDebtEntry',
  OPEN_DEBT_BOARD: 'fixflow.openDebtBoard',
  SCAN_FOR_DEBT: 'fixflow.scanForDebt',
  EXPORT_REPORT: 'fixflow.exportReport',
  RESOLVE_DEBT_ENTRY: 'fixflow.resolveDebtEntry',
  DELETE_DEBT_ENTRY: 'fixflow.deleteDebtEntry',
} as const;

// View IDs
export const VIEWS = {
  DEBT_BOARD: 'fixflowDebtBoard',
} as const;

// Configuration keys
export const CONFIG_KEYS = {
  ENABLED: 'fixflow.enabled',
  AUTO_SCAN: 'fixflow.autoScan',
  DEBT_MARKERS: 'fixflow.debtMarkers',
  STORAGE_PATH: 'fixflow.storagePath',
  NOTIFICATIONS: 'fixflow.notifications',
} as const;

// Default values
export const DEFAULTS = {
  STORAGE_PATH: '.fixflow',
  DEBT_MARKERS: ['TODO', 'FIXME', 'HACK', 'BUG', 'NOTE'],
  SCAN_PATTERNS: ['**/*.{js,jsx,ts,tsx,py,java,cpp,c,cs,php,rb,go,rs}'],
  EXCLUDE_PATTERNS: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
  MAX_CONTEXT_LINES: 5,
  DEBT_ID_PREFIX: 'debt',
} as const;

// File extensions
export const SUPPORTED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
  '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj'
];

// Regex patterns
export const PATTERNS = {
  DEBT_MARKER: /(TODO|FIXME|HACK|BUG|NOTE|XXX|HACK|WARN|PERF|OPTIMIZE):\s*(.+)/i,
  LINE_COMMENT: /^\s*\/\/\s*(.+)$/,
  BLOCK_COMMENT_START: /^\s*\/\*\s*(.+)$/,
  BLOCK_COMMENT_END: /(.+)\s*\*\/\s*$/,
} as const;

// Status messages
export const MESSAGES = {
  EXTENSION_ACTIVATED: 'FixFlow extension is now active',
  DEBT_CREATED: 'Technical debt entry created successfully',
  DEBT_UPDATED: 'Technical debt entry updated successfully',
  DEBT_DELETED: 'Technical debt entry deleted successfully',
  SCAN_COMPLETED: 'Technical debt scan completed',
  EXPORT_COMPLETED: 'Debt report exported successfully',
  NO_DEBT_FOUND: 'No technical debt found in the current selection',
  ERROR_CREATING_DEBT: 'Error creating technical debt entry',
  ERROR_UPDATING_DEBT: 'Error updating technical debt entry',
  ERROR_DELETING_DEBT: 'Error deleting technical debt entry',
  ERROR_SCANNING: 'Error scanning for technical debt',
  ERROR_EXPORTING: 'Error exporting debt report',
} as const;

// Error codes
export const ERROR_CODES = {
  INVALID_SELECTION: 'INVALID_SELECTION',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_DATA: 'INVALID_DATA',
  STORAGE_ERROR: 'STORAGE_ERROR',
  SCAN_ERROR: 'SCAN_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
} as const;

// UI constants
export const UI = {
  DEBT_BOARD_TITLE: 'FixFlow Debt Board',
  CREATE_DEBT_TITLE: 'Create Technical Debt Entry',
  EDIT_DEBT_TITLE: 'Edit Technical Debt Entry',
  DEBT_DETAILS_TITLE: 'Technical Debt Details',
  CONFIRM_DELETE_TITLE: 'Confirm Delete',
  CONFIRM_DELETE_MESSAGE: 'Are you sure you want to delete this technical debt entry?',
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NOTES_LENGTH: 1000,
} as const;
