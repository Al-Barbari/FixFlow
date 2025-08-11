import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationService } from '../services/config-service';
import { CONFIG_KEYS, DEFAULTS } from '../constants';

// Mock VS Code workspace configuration
const mockWorkspaceConfig = {
  get: (key: string, defaultValue?: any) => defaultValue,
  update: async (key: string, value: any, target?: vscode.ConfigurationTarget) => Promise.resolve(),
  has: (key: string) => false,
  inspect: (key: string) => undefined
};

const mockGlobalConfig = {
  get: (key: string, defaultValue?: any) => defaultValue,
  update: async (key: string, value: any, target?: vscode.ConfigurationTarget) => Promise.resolve(),
  has: (key: string) => false,
  inspect: (key: string) => undefined
};

// Store original VS Code API methods
const originalGetConfiguration = vscode.workspace.getConfiguration;
const originalShowInformationMessage = vscode.window.showInformationMessage;
const originalShowErrorMessage = vscode.window.showErrorMessage;
const originalShowWarningMessage = vscode.window.showWarningMessage;

suite('ConfigurationService', () => {
  let configService: ConfigurationService;

  setup(() => {
    // Mock VS Code API methods
    (vscode.workspace as any).getConfiguration = (section: string, scope?: vscode.ConfigurationScope) => {
      if (scope === undefined) {
        return mockGlobalConfig;
      }
      return mockWorkspaceConfig;
    };

    (vscode.window as any).showInformationMessage = (message: string) => Promise.resolve(undefined);
    (vscode.window as any).showErrorMessage = (message: string) => Promise.resolve(undefined);
    (vscode.window as any).showWarningMessage = (message: string) => Promise.resolve(undefined);
    
    // Reset mock functions to default behavior
    mockWorkspaceConfig.get = (key: string, defaultValue?: any) => defaultValue;
    mockWorkspaceConfig.update = async (key: string, value: any, target?: vscode.ConfigurationTarget) => Promise.resolve();
    mockGlobalConfig.get = (key: string, defaultValue?: any) => defaultValue;
    mockGlobalConfig.update = async (key: string, value: any, target?: vscode.ConfigurationTarget) => Promise.resolve();
    
    configService = new ConfigurationService();
  });

  teardown(() => {
    // Restore original VS Code API methods
    (vscode.workspace as any).getConfiguration = originalGetConfiguration;
    (vscode.window as any).showInformationMessage = originalShowInformationMessage;
    (vscode.window as any).showErrorMessage = originalShowErrorMessage;
    (vscode.window as any).showWarningMessage = originalShowWarningMessage;
  });

  describe('constructor', () => {
    it('should initialize with workspace and global configurations', () => {
      assert.ok(configService);
    });
  });

  describe('getProjectConfig', () => {
    it('should return default configuration when no custom values are set', () => {
      const config = configService.getProjectConfig();
      
      assert.strictEqual(config.enabled, true);
      assert.strictEqual(config.autoScan, false);
      assert.deepStrictEqual(config.debtMarkers, DEFAULTS.DEBT_MARKERS);
      assert.strictEqual(config.storagePath, DEFAULTS.STORAGE_PATH);
      assert.strictEqual(config.notifications, true);
      assert.deepStrictEqual(config.scanPatterns, DEFAULTS.SCAN_PATTERNS);
      assert.deepStrictEqual(config.excludePatterns, DEFAULTS.EXCLUDE_PATTERNS);
    });

    it('should return custom configuration values when set', () => {
      // Mock custom values by overriding the get method
      const originalGet = mockWorkspaceConfig.get;
      mockWorkspaceConfig.get = (key: string, defaultValue?: any) => {
        switch (key) {
          case CONFIG_KEYS.ENABLED: return false;
          case CONFIG_KEYS.AUTO_SCAN: return true;
          case CONFIG_KEYS.DEBT_MARKERS: return ['CUSTOM'];
          case CONFIG_KEYS.STORAGE_PATH: return '.custom';
          case CONFIG_KEYS.NOTIFICATIONS: return false;
          case 'fixflow.scanPatterns': return ['**/*.custom'];
          case 'fixflow.excludePatterns': return ['**/exclude/**'];
          default: return defaultValue;
        }
      };

      const config = configService.getProjectConfig();
      
      assert.strictEqual(config.enabled, false);
      assert.strictEqual(config.autoScan, true);
      assert.deepStrictEqual(config.debtMarkers, ['CUSTOM']);
      assert.strictEqual(config.storagePath, '.custom');
      assert.strictEqual(config.notifications, false);
      assert.deepStrictEqual(config.scanPatterns, ['**/*.custom']);
      assert.deepStrictEqual(config.excludePatterns, ['**/exclude/**']);

      // Restore original get method
      mockWorkspaceConfig.get = originalGet;
    });
  });

  describe('updateConfigValue', () => {
    it('should update workspace configuration successfully', async () => {
      let updateCalled = false;
      mockWorkspaceConfig.update = async (key: string, value: any, target?: vscode.ConfigurationTarget) => {
        updateCalled = true;
        assert.strictEqual(key, CONFIG_KEYS.ENABLED);
        assert.strictEqual(value, false);
        assert.strictEqual(target, vscode.ConfigurationTarget.Workspace);
        return Promise.resolve();
      };
      
      await configService.updateConfigValue(CONFIG_KEYS.ENABLED, false);
      
      assert.strictEqual(updateCalled, true);
    });

    it('should update global configuration successfully', async () => {
      let updateCalled = false;
      mockGlobalConfig.update = async (key: string, value: any, target?: vscode.ConfigurationTarget) => {
        updateCalled = true;
        assert.strictEqual(key, CONFIG_KEYS.ENABLED);
        assert.strictEqual(value, false);
        assert.strictEqual(target, vscode.ConfigurationTarget.Global);
        return Promise.resolve();
      };
      
      await configService.updateConfigValue(CONFIG_KEYS.ENABLED, false, 'global');
      
      assert.strictEqual(updateCalled, true);
    });

    it('should throw error for invalid configuration value', async () => {
      await assert.rejects(
        async () => {
          await configService.updateConfigValue(CONFIG_KEYS.ENABLED, 'invalid');
        },
        /enabled must be a boolean value/
      );
    });

    it('should throw error when update fails', async () => {
      mockWorkspaceConfig.update = async () => {
        throw new Error('Update failed');
      };
      
      await assert.rejects(
        async () => {
          await configService.updateConfigValue(CONFIG_KEYS.ENABLED, false);
        },
        /Failed to update configuration enabled: Update failed/
      );
    });
  });

  describe('updateMultipleConfigValues', () => {
    it('should update multiple configuration values successfully', async () => {
      let updateCount = 0;
      mockWorkspaceConfig.update = async () => {
        updateCount++;
        return Promise.resolve();
      };
      
      const updates = {
        [CONFIG_KEYS.ENABLED]: false,
        [CONFIG_KEYS.AUTO_SCAN]: true
      };
      
      await configService.updateMultipleConfigValues(updates);
      
      assert.strictEqual(updateCount, 2);
    });

    it('should throw error when any value is invalid', async () => {
      const updates = {
        [CONFIG_KEYS.ENABLED]: false,
        [CONFIG_KEYS.AUTO_SCAN]: 'invalid'
      };
      
      await assert.rejects(
        async () => {
          await configService.updateMultipleConfigValues(updates);
        },
        /autoScan must be a boolean value/
      );
    });
  });

  describe('resetToDefaults', () => {
    it('should reset workspace configuration to defaults', async () => {
      let updateCount = 0;
      mockWorkspaceConfig.update = async () => {
        updateCount++;
        return Promise.resolve();
      };
      
      await configService.resetToDefaults('workspace');
      
      assert.strictEqual(updateCount, 5); // All config keys (ENABLED, AUTO_SCAN, DEBT_MARKERS, STORAGE_PATH, NOTIFICATIONS)
    });

    it('should reset global configuration to defaults', async () => {
      let updateCount = 0;
      mockGlobalConfig.update = async () => {
        updateCount++;
        return Promise.resolve();
      };
      
      await configService.resetToDefaults('global');
      
      assert.strictEqual(updateCount, 5); // All config keys
    });
  });

  describe('validateConfigValue', () => {
    it('should validate boolean values correctly', () => {
      // These should not throw
      configService['validateConfigValue'](CONFIG_KEYS.ENABLED, true);
      configService['validateConfigValue'](CONFIG_KEYS.ENABLED, false);
      
      // These should throw
      assert.throws(() => {
        configService['validateConfigValue'](CONFIG_KEYS.ENABLED, 'true');
      }, /enabled must be a boolean value/);
    });

    it('should validate array values correctly', () => {
      // These should not throw
      configService['validateConfigValue'](CONFIG_KEYS.DEBT_MARKERS, ['TODO', 'FIXME']);
      configService['validateConfigValue']('fixflow.scanPatterns', ['**/*.ts']);
      
      // These should throw
      assert.throws(() => {
        configService['validateConfigValue'](CONFIG_KEYS.DEBT_MARKERS, []);
      }, /debtMarkers cannot be empty/);
      
      assert.throws(() => {
        configService['validateConfigValue'](CONFIG_KEYS.DEBT_MARKERS, ['TODO', 123]);
      }, /debtMarkers must be an array of strings/);
    });

    it('should validate string values correctly', () => {
      // These should not throw
      configService['validateConfigValue'](CONFIG_KEYS.STORAGE_PATH, '.fixflow');
      configService['validateConfigValue'](CONFIG_KEYS.STORAGE_PATH, 'custom/path');
      
      // These should throw
      assert.throws(() => {
        configService['validateConfigValue'](CONFIG_KEYS.STORAGE_PATH, '');
      }, /storagePath must be a non-empty string/);
      
      assert.throws(() => {
        configService['validateConfigValue'](CONFIG_KEYS.STORAGE_PATH, 'path<with>invalid:chars');
      }, /storagePath contains invalid characters/);
    });
  });

  describe('isConfigValueValid', () => {
    it('should return true for valid values', () => {
      assert.strictEqual(configService.isConfigValueValid(CONFIG_KEYS.ENABLED, true), true);
      assert.strictEqual(configService.isConfigValueValid(CONFIG_KEYS.DEBT_MARKERS, ['TODO']), true);
      assert.strictEqual(configService.isConfigValueValid(CONFIG_KEYS.STORAGE_PATH, '.fixflow'), true);
    });

    it('should return false for invalid values', () => {
      assert.strictEqual(configService.isConfigValueValid(CONFIG_KEYS.ENABLED, 'true'), false);
      assert.strictEqual(configService.isConfigValueValid(CONFIG_KEYS.DEBT_MARKERS, []), false);
      assert.strictEqual(configService.isConfigValueValid(CONFIG_KEYS.STORAGE_PATH, ''), false);
    });
  });

  describe('getConfigMetadata', () => {
    it('should return metadata for all configuration keys', () => {
      const metadata = configService.getConfigMetadata();
      
      assert.ok(metadata[CONFIG_KEYS.ENABLED]);
      assert.ok(metadata[CONFIG_KEYS.AUTO_SCAN]);
      assert.ok(metadata[CONFIG_KEYS.DEBT_MARKERS]);
      assert.ok(metadata[CONFIG_KEYS.STORAGE_PATH]);
      assert.ok(metadata[CONFIG_KEYS.NOTIFICATIONS]);
      
      // Check metadata structure
      Object.values(metadata).forEach(item => {
        assert.ok(item.description);
        assert.ok(item.type);
        assert.ok(item.default !== undefined);
      });
    });
  });

  describe('exportConfig', () => {
    it('should export current configuration as JSON string', () => {
      const exported = configService.exportConfig();
      const parsed = JSON.parse(exported);
      
      assert.ok(parsed.enabled !== undefined);
      assert.ok(parsed.autoScan !== undefined);
      assert.ok(parsed.debtMarkers !== undefined);
      assert.ok(parsed.storagePath !== undefined);
      assert.ok(parsed.notifications !== undefined);
      assert.ok(parsed.scanPatterns !== undefined);
      assert.ok(parsed.excludePatterns !== undefined);
    });
  });

  describe('importConfig', () => {
    it('should import valid configuration successfully', async () => {
      const validConfig = {
        enabled: false,
        autoScan: true,
        debtMarkers: ['CUSTOM'],
        storagePath: '.custom',
        notifications: false,
        scanPatterns: ['**/*.custom'],
        excludePatterns: ['**/exclude/**']
      };
      
      let updateCount = 0;
      mockWorkspaceConfig.update = async () => {
        updateCount++;
        return Promise.resolve();
      };
      
      await configService.importConfig(JSON.stringify(validConfig));
      
      assert.strictEqual(updateCount, 5); // Only the config keys that exist in CONFIG_KEYS
    });

    it('should throw error for invalid JSON', async () => {
      await assert.rejects(
        async () => {
          await configService.importConfig('invalid json');
        },
        /Failed to import configuration/
      );
    });

    it('should throw error for invalid configuration values', async () => {
      const invalidConfig = {
        enabled: 'invalid'
      };
      
      await assert.rejects(
        async () => {
          await configService.importConfig(JSON.stringify(invalidConfig));
        },
        /Invalid configuration value for enabled/
      );
    });
  });

  describe('hasModifiedDefaults', () => {
    it('should return false when using default values', () => {
      assert.strictEqual(configService.hasModifiedDefaults(), false);
    });

    it('should return true when configuration has been modified', () => {
      // Mock modified values by overriding the get method
      const originalGet = mockWorkspaceConfig.get;
      mockWorkspaceConfig.get = (key: string, defaultValue?: any) => {
        if (key === CONFIG_KEYS.ENABLED) {
          return false; // Changed from true
        }
        return defaultValue;
      };

      assert.strictEqual(configService.hasModifiedDefaults(), true);

      // Restore original get method
      mockWorkspaceConfig.get = originalGet;
    });
  });

  describe('getConfigDifferences', () => {
    it('should return empty object when no differences exist', () => {
      const differences = configService.getConfigDifferences();
      assert.deepStrictEqual(differences, {});
    });

    it('should return differences when configuration has been modified', () => {
      // Mock modified values by overriding the get method
      const originalGet = mockWorkspaceConfig.get;
      mockWorkspaceConfig.get = (key: string, defaultValue?: any) => {
        if (key === CONFIG_KEYS.ENABLED) {
          return false; // Changed from true
        }
        if (key === CONFIG_KEYS.AUTO_SCAN) {
          return true; // Changed from false
        }
        return defaultValue;
      };

      const differences = configService.getConfigDifferences();
      
      assert.ok(differences[CONFIG_KEYS.ENABLED]);
      assert.ok(differences[CONFIG_KEYS.AUTO_SCAN]);
      assert.strictEqual(differences[CONFIG_KEYS.ENABLED].current, false);
      assert.strictEqual(differences[CONFIG_KEYS.ENABLED].default, true);
      assert.strictEqual(differences[CONFIG_KEYS.AUTO_SCAN].current, true);
      assert.strictEqual(differences[CONFIG_KEYS.AUTO_SCAN].default, false);

      // Restore original get method
      mockWorkspaceConfig.get = originalGet;
    });
  });

  describe('validateConfiguration', () => {
    it('should return valid for default configuration', () => {
      const validation = configService.validateConfiguration();
      
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.errors.length, 0);
    });

    it('should return invalid when auto-scan is enabled but no scan patterns exist', () => {
      // Mock problematic configuration by overriding the get method
      const originalGet = mockWorkspaceConfig.get;
      mockWorkspaceConfig.get = (key: string, defaultValue?: any) => {
        if (key === CONFIG_KEYS.AUTO_SCAN) {
          return true; // Enable auto-scan
        }
        if (key === 'fixflow.scanPatterns') {
          return []; // Empty scan patterns
        }
        return defaultValue;
      };

      const validation = configService.validateConfiguration();
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.includes('Auto-scan is enabled but no scan patterns are defined'));

      // Restore original get method
      mockWorkspaceConfig.get = originalGet;
    });

    it('should return invalid when storage path contains relative traversal', () => {
      // Mock problematic configuration by overriding the get method
      const originalGet = mockWorkspaceConfig.get;
      mockWorkspaceConfig.get = (key: string, defaultValue?: any) => {
        if (key === CONFIG_KEYS.STORAGE_PATH) {
          return '../path'; // Path with relative traversal
        }
        return defaultValue;
      };

      const validation = configService.validateConfiguration();
      
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.errors.includes('Storage path cannot contain relative path traversal'));

      // Restore original get method
      mockWorkspaceConfig.get = originalGet;
    });
  });

  describe('getConfigSummary', () => {
    it('should return formatted configuration summary', () => {
      const summary = configService.getConfigSummary();
      
      assert.ok(summary.includes('FixFlow Configuration Summary:'));
      assert.ok(summary.includes('Extension: Enabled'));
      assert.ok(summary.includes('Auto-scan: Disabled'));
      assert.ok(summary.includes('Configuration: Valid'));
    });

    it('should include validation errors in summary when configuration is invalid', () => {
      // Mock problematic configuration by overriding the get method
      const originalGet = mockWorkspaceConfig.get;
      mockWorkspaceConfig.get = (key: string, defaultValue?: any) => {
        if (key === CONFIG_KEYS.AUTO_SCAN) {
          return true; // Enable auto-scan
        }
        if (key === 'fixflow.scanPatterns') {
          return []; // Empty scan patterns
        }
        return defaultValue;
      };

      const summary = configService.getConfigSummary();
      
      assert.ok(summary.includes('Configuration: Invalid'));
      assert.ok(summary.includes('Validation Errors:'));
      assert.ok(summary.includes('• Auto-scan is enabled but no scan patterns are defined'));

      // Restore original get method
      mockWorkspaceConfig.get = originalGet;
    });
  });

  describe('dispose', () => {
    it('should not throw when disposing', () => {
      assert.doesNotThrow(() => {
        configService.dispose();
      });
    });
  });
});
