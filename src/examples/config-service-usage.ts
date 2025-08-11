import { ConfigurationService } from '../services/config-service';
import { CONFIG_KEYS } from '../constants';

/**
 * Configuration Service Usage Examples
 * This file demonstrates various ways to use the ConfigurationService
 */

export class ConfigurationServiceExamples {
  private configService: ConfigurationService;

  constructor() {
    this.configService = new ConfigurationService();
  }

  /**
   * Example 1: Basic Configuration Management
   */
  async basicConfigurationExample(): Promise<void> {
    console.log('=== Basic Configuration Management ===');

    // Get current project configuration
    const config = this.configService.getProjectConfig();
    console.log('Current configuration:', config);

    // Update individual configuration values
    await this.configService.updateConfigValue(CONFIG_KEYS.ENABLED, false);
    await this.configService.updateConfigValue(CONFIG_KEYS.AUTO_SCAN, true);
    await this.configService.updateConfigValue(CONFIG_KEYS.DEBT_MARKERS, ['TODO', 'FIXME', 'HACK']);

    // Get updated configuration
    const updatedConfig = this.configService.getProjectConfig();
    console.log('Updated configuration:', updatedConfig);
  }

  /**
   * Example 2: Bulk Configuration Updates
   */
  async bulkConfigurationExample(): Promise<void> {
    console.log('=== Bulk Configuration Updates ===');

    // Update multiple configuration values at once
    const updates = {
      [CONFIG_KEYS.ENABLED]: true,
      [CONFIG_KEYS.AUTO_SCAN]: false,
      [CONFIG_KEYS.NOTIFICATIONS]: false,
      'fixflow.scanPatterns': ['**/*.{ts,js}', '**/*.py'],
      'fixflow.excludePatterns': ['**/node_modules/**', '**/dist/**']
    };

    await this.configService.updateMultipleConfigValues(updates);
    console.log('Bulk update completed');
  }

  /**
   * Example 3: Configuration Validation
   */
  async configurationValidationExample(): Promise<void> {
    console.log('=== Configuration Validation ===');

    // Validate individual configuration values
    const isValidEnabled = this.configService.isConfigValueValid(CONFIG_KEYS.ENABLED, true);
    const isValidMarkers = this.configService.isConfigValueValid(CONFIG_KEYS.DEBT_MARKERS, ['TODO']);
    const isInvalidMarkers = this.configService.isConfigValueValid(CONFIG_KEYS.DEBT_MARKERS, []);

    console.log('Enabled (true) is valid:', isValidEnabled);
    console.log('Debt markers (["TODO"]) is valid:', isValidMarkers);
    console.log('Debt markers ([]) is valid:', isInvalidMarkers);

    // Validate entire configuration
    const validation = this.configService.validateConfiguration();
    console.log('Configuration validation:', validation);

    if (!validation.isValid) {
      console.log('Validation errors:', validation.errors);
    }
  }

  /**
   * Example 4: Configuration Import/Export
   */
  async configurationImportExportExample(): Promise<void> {
    console.log('=== Configuration Import/Export ===');

    // Export current configuration
    const exportedConfig = this.configService.exportConfig();
    console.log('Exported configuration:', exportedConfig);

    // Create a custom configuration
    const customConfig = {
      enabled: false,
      autoScan: true,
      debtMarkers: ['CUSTOM', 'REVIEW'],
      storagePath: '.custom-fixflow',
      notifications: false,
      scanPatterns: ['**/*.custom'],
      excludePatterns: ['**/exclude/**']
    };

    // Import custom configuration
    await this.configService.importConfig(JSON.stringify(customConfig));
    console.log('Custom configuration imported');

    // Verify import
    const importedConfig = this.configService.getProjectConfig();
    console.log('Imported configuration:', importedConfig);
  }

  /**
   * Example 5: Configuration Analysis
   */
  async configurationAnalysisExample(): Promise<void> {
    console.log('=== Configuration Analysis ===');

    // Check if configuration has been modified from defaults
    const hasModifications = this.configService.hasModifiedDefaults();
    console.log('Configuration modified from defaults:', hasModifications);

    // Get configuration differences from defaults
    const differences = this.configService.getConfigDifferences();
    console.log('Configuration differences:', differences);

    // Get configuration metadata
    const metadata = this.configService.getConfigMetadata();
    console.log('Configuration metadata:', metadata);

    // Get configuration summary
    const summary = this.configService.getConfigSummary();
    console.log('Configuration summary:', summary);
  }

  /**
   * Example 6: Configuration Reset
   */
  async configurationResetExample(): Promise<void> {
    console.log('=== Configuration Reset ===');

    // Reset workspace configuration to defaults
    await this.configService.resetToDefaults('workspace');
    console.log('Workspace configuration reset to defaults');

    // Reset global configuration to defaults
    await this.configService.resetToDefaults('global');
    console.log('Global configuration reset to defaults');

    // Verify reset
    const config = this.configService.getProjectConfig();
    console.log('Configuration after reset:', config);
  }

  /**
   * Example 7: Error Handling
   */
  async errorHandlingExample(): Promise<void> {
    console.log('=== Error Handling ===');

    try {
      // Try to update with invalid value
      await this.configService.updateConfigValue(CONFIG_KEYS.ENABLED, 'invalid');
    } catch (error) {
      console.log('Caught error:', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // Try to import invalid configuration
      await this.configService.importConfig('invalid json');
    } catch (error) {
      console.log('Caught import error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Example 8: Configuration Scenarios
   */
  async configurationScenariosExample(): Promise<void> {
    console.log('=== Configuration Scenarios ===');

    // Scenario 1: Development environment
    console.log('--- Development Environment ---');
    const devConfig = {
      [CONFIG_KEYS.ENABLED]: true,
      [CONFIG_KEYS.AUTO_SCAN]: true,
      [CONFIG_KEYS.DEBT_MARKERS]: ['TODO', 'FIXME', 'HACK', 'BUG'],
      [CONFIG_KEYS.NOTIFICATIONS]: true,
      'fixflow.scanPatterns': ['**/*.{ts,js,tsx,jsx}'],
      'fixflow.excludePatterns': ['**/node_modules/**', '**/dist/**', '**/coverage/**']
    };
    await this.configService.updateMultipleConfigValues(devConfig);
    console.log('Development configuration applied');

    // Scenario 2: Production environment
    console.log('--- Production Environment ---');
    const prodConfig = {
      [CONFIG_KEYS.ENABLED]: true,
      [CONFIG_KEYS.AUTO_SCAN]: false,
      [CONFIG_KEYS.NOTIFICATIONS]: false,
      'fixflow.scanPatterns': ['**/*.{ts,js}'],
      'fixflow.excludePatterns': ['**/node_modules/**', '**/dist/**', '**/build/**']
    };
    await this.configService.updateMultipleConfigValues(prodConfig);
    console.log('Production configuration applied');

    // Scenario 3: Minimal configuration
    console.log('--- Minimal Configuration ---');
    const minimalConfig = {
      [CONFIG_KEYS.ENABLED]: true,
      [CONFIG_KEYS.AUTO_SCAN]: false,
      [CONFIG_KEYS.DEBT_MARKERS]: ['TODO'],
      [CONFIG_KEYS.NOTIFICATIONS]: false
    };
    await this.configService.updateMultipleConfigValues(minimalConfig);
    console.log('Minimal configuration applied');
  }

  /**
   * Example 9: Configuration Monitoring
   */
  async configurationMonitoringExample(): Promise<void> {
    console.log('=== Configuration Monitoring ===');

    // Monitor configuration changes
    const initialConfig = this.configService.getProjectConfig();
    console.log('Initial configuration:', initialConfig);

    // Simulate configuration changes
    await this.configService.updateConfigValue(CONFIG_KEYS.AUTO_SCAN, true);
    
    const updatedConfig = this.configService.getProjectConfig();
    console.log('Updated configuration:', updatedConfig);

    // Check what changed
    const differences = this.configService.getConfigDifferences();
    console.log('Configuration differences:', differences);

    // Validate configuration after changes
    const validation = this.configService.validateConfiguration();
    console.log('Configuration validation after changes:', validation);
  }

  /**
   * Example 10: Configuration Best Practices
   */
  async bestPracticesExample(): Promise<void> {
    console.log('=== Configuration Best Practices ===');

    // 1. Always validate before updating
    const newMarkers = ['TODO', 'FIXME', 'REVIEW'];
    if (this.configService.isConfigValueValid(CONFIG_KEYS.DEBT_MARKERS, newMarkers)) {
      await this.configService.updateConfigValue(CONFIG_KEYS.DEBT_MARKERS, newMarkers);
      console.log('Debt markers updated successfully');
    } else {
      console.log('Invalid debt markers configuration');
    }

    // 2. Use bulk updates for multiple changes
    const multipleUpdates = {
      [CONFIG_KEYS.ENABLED]: true,
      [CONFIG_KEYS.NOTIFICATIONS]: true
    };
    await this.configService.updateMultipleConfigValues(multipleUpdates);
    console.log('Multiple configuration values updated');

    // 3. Regular validation
    const validation = this.configService.validateConfiguration();
    if (!validation.isValid) {
      console.log('Configuration validation failed:', validation.errors);
      // Consider resetting to defaults or fixing issues
    } else {
      console.log('Configuration is valid');
    }

    // 4. Export configuration for backup
    const backup = this.configService.exportConfig();
    console.log('Configuration backup created');
  }

  /**
   * Run all examples
   */
  async runAllExamples(): Promise<void> {
    console.log('Starting Configuration Service Examples...\n');

    try {
      await this.basicConfigurationExample();
      console.log('\n');
      
      await this.bulkConfigurationExample();
      console.log('\n');
      
      this.configurationValidationExample();
      console.log('\n');
      
      await this.configurationImportExportExample();
      console.log('\n');
      
      this.configurationAnalysisExample();
      console.log('\n');
      
      await this.configurationResetExample();
      console.log('\n');
      
      this.errorHandlingExample();
      console.log('\n');
      
      await this.configurationScenariosExample();
      console.log('\n');
      
      await this.configurationMonitoringExample();
      console.log('\n');
      
      await this.bestPracticesExample();
      console.log('\n');

      console.log('All examples completed successfully!');
    } catch (error) {
      console.error('Error running examples:', error);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.configService.dispose();
  }
}

// Example usage
if (require.main === module) {
  const examples = new ConfigurationServiceExamples();
  examples.runAllExamples().finally(() => {
    examples.dispose();
  });
}
