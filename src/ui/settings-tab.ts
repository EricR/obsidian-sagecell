import {App, Setting, PluginSettingTab } from 'obsidian';
import SageCellPlugin from '../main'

export default class SageCellSettingsTab extends PluginSettingTab {
  plugin: SageCellPlugin

  constructor(app: App, plugin: SageCellPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Server URL')
      .setDesc('The URL of the SageMathCell server.')
      .addText(text => text
        .setValue(this.plugin.settings.serverUrl)
        .onChange(async (value) => {
          this.plugin.settings.serverUrl = value;
          await this.plugin.saveData(this.plugin.settings);
        }));
  }
}
