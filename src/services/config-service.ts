import * as vscode from 'vscode';
import { CONFIG_KEYS, DEFAULTS, MESSAGES } from '../constants';
import { ProjectConfig } from '../types';

/**
 * Configuration service for managing FixFlow settings
 * Handles user preferences, workspace-specific settings, and validation
 */
export class ConfigurationService {
  private readonly extensionId: string = 'fixflow';
  private workspaceConfig: vscode.WorkspaceConfiguration;
  private globalConfig: vscode.WorkspaceConfiguration;

  constructor() {
    this.workspaceConfig = vscode.workspace.getConfiguration(this.extensionId);
    this.globalConfig = vscode.workspace.getConfiguration(this.extensionId, undefined);
  }

  /**
   * Get the current project configuration
   */
  public getProjectConfig(): ProjectConfig {
    return {
      enabled: this.getConfigValue(CONFIG_KEYS.ENABLED, true),
      autoScan: this.getConfigValue(CONFIG_KEYS.AUTO_SCAN, false),
      debtMarkers: [...this.getConfigValue(CONFIG_KEYS.DEBT_MARKERS, DEFAULTS.DEBT_MARKERS)],
      storagePath: this.getConfigValue(CONFIG_KEYS.STORAGE_PATH, DEFAULTS.STORAGE_PATH),
      notifications: this.getConfigValue(CONFIG_KEYS.NOTIFICATIONS, true),
      scanPatterns: [...this.getConfigValue('fixflow.scanPatterns', DEFAULTS.SCAN_PATTERNS)],
      excludePatterns: [...this.getConfigValue('fixflow.excludePatterns', DEFAULTS.EXCLUDE_PATTERNS)]
    };
  }

  /**
   * Get a configuration value with fallback to default
   */
  private getConfigValue<T>(key: string, defaultValue: T): T {
    return this.workspaceConfig.get(key, defaultValue);
  }

  /**
   * Update a configuration value
   */
  public async updateConfigValue<T>(key: string, value: T, target: 'workspace' | 'global' = 'workspace'): Promise<void> {
    try {
      const config = target === 'global' ? this.globalConfig : this.workspaceConfig;
      
      // Validate the value before updating
      this.validateConfigValue(key, value);
      
      await config.update(key, value, target === 'global' ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace);
      
      // Refresh the configuration
      if (target === 'global') {
        this.globalConfig = vscode.workspace.getConfiguration(this.extensionId, undefined);
      } else {
        this.workspaceConfig = vscode.workspace.getConfiguration(this.extensionId);
      }
      
      // Notify user of successful update
      vscode.window.showInformationMessage(`Configuration updated: ${key} = ${value}`);
    } catch (error) {
      const errorMessage = `Failed to update configuration ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update multiple configuration values at once
   */
  public async updateMultipleConfigValues(
    updates: Record<string, any>, 
    target: 'workspace' | 'global' = 'workspace'
  ): Promise<void> {
    try {
      const config = target === 'global' ? this.globalConfig : this.workspaceConfig;
      
      // Validate all values before updating
      for (const [key, value] of Object.entries(updates)) {
        this.validateConfigValue(key, value);
      }
      
      // Update each configuration value
      for (const [key, value] of Object.entries(updates)) {
        await config.update(key, value, target === 'global' ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace);
      }
      
      // Refresh the configuration
      if (target === 'global') {
        this.globalConfig = vscode.workspace.getConfiguration(this.extensionId, undefined);
      } else {
        this.workspaceConfig = vscode.workspace.getConfiguration(this.extensionId);
      }
      
      // Notify user of successful updates
      const updateCount = Object.keys(updates).length;
      vscode.window.showInformationMessage(`Updated ${updateCount} configuration value(s)`);
    } catch (error) {
      const errorMessage = `Failed to update configurations: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Reset configuration to default values
   */
  public async resetToDefaults(target: 'workspace' | 'global' = 'workspace'): Promise<void> {
    try {
      const config = target === 'global' ? this.globalConfig : this.workspaceConfig;
      const defaultValues = this.getDefaultConfigValues();
      
      // Reset each configuration value to default
      for (const [key, value] of Object.entries(defaultValues)) {
        await config.update(key, value, target === 'global' ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace);
      }
      
      // Refresh the configuration
      if (target === 'global') {
        this.globalConfig = vscode.workspace.getConfiguration(this.extensionId, undefined);
      } else {
        this.workspaceConfig = vscode.workspace.getConfiguration(this.extensionId);
      }
      
      vscode.window.showInformationMessage(`Configuration reset to defaults for ${target} scope`);
    } catch (error) {
      const errorMessage = `Failed to reset configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get default configuration values
   */
  private getDefaultConfigValues(): Record<string, any> {
    return {
      [CONFIG_KEYS.ENABLED]: true,
      [CONFIG_KEYS.AUTO_SCAN]: false,
      [CONFIG_KEYS.DEBT_MARKERS]: DEFAULTS.DEBT_MARKERS,
      [CONFIG_KEYS.STORAGE_PATH]: DEFAULTS.STORAGE_PATH,
      [CONFIG_KEYS.NOTIFICATIONS]: true,
      'fixflow.scanPatterns': DEFAULTS.SCAN_PATTERNS,
      'fixflow.excludePatterns': DEFAULTS.EXCLUDE_PATTERNS
    };
  }

  /**
   * Validate a configuration value
   */
  private validateConfigValue(key: string, value: any): void {
    switch (key) {
      case CONFIG_KEYS.ENABLED:
        if (typeof value !== 'boolean') {
          throw new Error('enabled must be a boolean value');
        }
        break;
        
      case CONFIG_KEYS.AUTO_SCAN:
        if (typeof value !== 'boolean') {
          throw new Error('autoScan must be a boolean value');
        }
        break;
        
      case CONFIG_KEYS.DEBT_MARKERS:
        if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
          throw new Error('debtMarkers must be an array of strings');
        }
        if (value.length === 0) {
          throw new Error('debtMarkers cannot be empty');
        }
        break;
        
      case CONFIG_KEYS.STORAGE_PATH:
        if (typeof value !== 'string' || value.trim() === '') {
          throw new Error('storagePath must be a non-empty string');
        }
        // Validate path doesn't contain invalid characters
        if (/[<>:"|?*]/.test(value)) {
          throw new Error('storagePath contains invalid characters');
        }
        break;
        
      case CONFIG_KEYS.NOTIFICATIONS:
        if (typeof value !== 'boolean') {
          throw new Error('notifications must be a boolean value');
        }
        break;
        
      case 'fixflow.scanPatterns':
        if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
          throw new Error('scanPatterns must be an array of strings');
        }
        if (value.length === 0) {
          throw new Error('scanPatterns cannot be empty');
        }
        break;
        
      case 'fixflow.excludePatterns':
        if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
          throw new Error('excludePatterns must be an array of strings');
        }
        break;
        
      default:
        // Unknown configuration key
        console.warn(`Unknown configuration key: ${key}`);
        break;
    }
  }

  /**
   * Check if a configuration value is valid
   */
  public isConfigValueValid(key: string, value: any): boolean {
    try {
      this.validateConfigValue(key, value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration metadata (description, type, etc.)
   */
  public getConfigMetadata(): Record<string, { description: string; type: string; default: any }> {
    return {
      [CONFIG_KEYS.ENABLED]: {
        description: 'Enable or disable the FixFlow extension',
        type: 'boolean',
        default: true
      },
      [CONFIG_KEYS.AUTO_SCAN]: {
        description: 'Automatically scan for technical debt when opening files',
        type: 'boolean',
        default: false
      },
      [CONFIG_KEYS.DEBT_MARKERS]: {
        description: 'Keywords to identify technical debt in code comments',
        type: 'array',
        default: DEFAULTS.DEBT_MARKERS
      },
      [CONFIG_KEYS.STORAGE_PATH]: {
        description: 'Directory path for storing FixFlow data',
        type: 'string',
        default: DEFAULTS.STORAGE_PATH
      },
      [CONFIG_KEYS.NOTIFICATIONS]: {
        description: 'Show notifications for FixFlow activities',
        type: 'boolean',
        default: true
      },
      'fixflow.scanPatterns': {
        description: 'File patterns to include when scanning for technical debt',
        type: 'array',
        default: DEFAULTS.SCAN_PATTERNS
      },
      'fixflow.excludePatterns': {
        description: 'File patterns to exclude when scanning for technical debt',
        type: 'array',
        default: DEFAULTS.EXCLUDE_PATTERNS
      }
    };
  }

  /**
   * Export current configuration to JSON
   */
  public exportConfig(): string {
    const config = this.getProjectConfig();
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public async importConfig(jsonConfig: string, target: 'workspace' | 'global' = 'workspace'): Promise<void> {
    try {
      const config = JSON.parse(jsonConfig);
      
      // Validate the imported configuration
      for (const [key, value] of Object.entries(config)) {
        if (!this.isConfigValueValid(key, value)) {
          throw new Error(`Invalid configuration value for ${key}`);
        }
      }
      
      // Update the configuration
      await this.updateMultipleConfigValues(config, target);
      
      vscode.window.showInformationMessage('Configuration imported successfully');
    } catch (error) {
      const errorMessage = `Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`;
      vscode.window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if configuration has been modified from defaults
   */
  public hasModifiedDefaults(): boolean {
    const currentConfig = this.getProjectConfig();
    const defaultConfig = this.getDefaultConfigValues();
    
    for (const [key, defaultValue] of Object.entries(defaultConfig)) {
      const currentValue = currentConfig[key as keyof ProjectConfig];
      if (JSON.stringify(currentValue) !== JSON.stringify(defaultValue)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get configuration differences from defaults
   */
  public getConfigDifferences(): Record<string, { current: any; default: any }> {
    const currentConfig = this.getProjectConfig();
    const defaultConfig = this.getDefaultConfigValues();
    const differences: Record<string, { current: any; default: any }> = {};
    
    for (const [key, defaultValue] of Object.entries(defaultConfig)) {
      const currentValue = currentConfig[key as keyof ProjectConfig];
      if (JSON.stringify(currentValue) !== JSON.stringify(defaultValue)) {
        differences[key] = {
          current: currentValue,
          default: defaultValue
        };
      }
    }
    
    return differences;
  }

  /**
   * Validate the entire configuration
   */
  public validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getProjectConfig();
    
    try {
      // Validate each configuration value
      for (const [key, value] of Object.entries(config)) {
        this.validateConfigValue(key, value);
      }
      
      // Additional validation logic
      if (config.enabled && config.autoScan && config.scanPatterns.length === 0) {
        errors.push('Auto-scan is enabled but no scan patterns are defined');
      }
      
      if (config.storagePath.includes('..')) {
        errors.push('Storage path cannot contain relative path traversal');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Get configuration summary for display
   */
  public getConfigSummary(): string {
    const config = this.getProjectConfig();
    const validation = this.validateConfiguration();
    
    let summary = `FixFlow Configuration Summary:\n`;
    summary += `├─ Extension: ${config.enabled ? 'Enabled' : 'Disabled'}\n`;
    summary += `├─ Auto-scan: ${config.autoScan ? 'Enabled' : 'Disabled'}\n`;
    summary += `├─ Debt Markers: ${config.debtMarkers.join(', ')}\n`;
    summary += `├─ Storage Path: ${config.storagePath}\n`;
    summary += `├─ Notifications: ${config.notifications ? 'Enabled' : 'Disabled'}\n`;
    summary += `├─ Scan Patterns: ${config.scanPatterns.length} patterns\n`;
    summary += `├─ Exclude Patterns: ${config.excludePatterns.length} patterns\n`;
    summary += `└─ Configuration: ${validation.isValid ? 'Valid' : 'Invalid'}`;
    
    if (!validation.isValid) {
      summary += `\n\nValidation Errors:\n`;
      validation.errors.forEach(error => {
        summary += `• ${error}\n`;
      });
    }
    
    return summary;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Configuration service doesn't hold any resources that need cleanup
  }
}
