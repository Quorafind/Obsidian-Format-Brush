import { App, debounce, ExtraButtonComponent, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import FormatBrushPlugin from "./main";

interface Brush {
    name: string;
    enable: boolean;
    insert: {
        prefix: string;
        suffix: string;
    };

}

export interface FormatBrushPluginSettings {
    brushes: Brush[];
    lastBrush: Brush;
    delayTime: number;
}

export const DEFAULT_SETTINGS: FormatBrushPluginSettings = {
    brushes: [{
        name: 'default',
        enable: true,
        insert: {
            prefix: '==',
            suffix: '==',
        }
    }],
    lastBrush: {
        name: 'default',
        enable: true,
        insert: {
            prefix: '==',
            suffix: '==',
        }
    },
    delayTime: 300,
};

export class FormatBrushSettingTab extends PluginSettingTab {
    plugin: FormatBrushPlugin;

    constructor(app: App, plugin: FormatBrushPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    applySettingsUpdate = debounce(async () => {
        await this.plugin.saveSettings();
    }, 200, true);


    display(): void {
        const {containerEl} = this;
        const {settings} = this.plugin;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Format Brush'});

        new Setting(containerEl)
            .setName('Delay time')
            .setDesc('The delay time of the format brush')
            .addSlider((slider) => {
                slider.setLimits(300, 1000, 100);
                slider.setValue(this.plugin.settings.delayTime);
                slider.onChange(async (value) => {
                    this.plugin.settings.delayTime = value;
                    await this.plugin.saveSettings();
                });
                slider.setDynamicTooltip();
            });

        new Setting(containerEl)
            .setName('Add new brush')
            .setDesc('Create a new format brush')
            .addButton((button) => button
                .setButtonText('+')
                .onClick(async () => {
                    settings.brushes.push({
                        name: `Brush ${settings.brushes.length + 1}`,
                        enable: false,
                        insert: {
                            prefix: '',
                            suffix: '',
                        }
                    });
                    this.applySettingsUpdate();

                    setTimeout(() => {
                        this.display();
                    }, 200);
                }));

        this.displayMacroSettings();
    }

    displayMacroSettings(): void {
        const {containerEl} = this;
        const {settings} = this.plugin;

        settings.brushes.forEach((brush, index) => {
            const topLevelSetting = new Setting(containerEl).setClass('brush-setting');
            topLevelSetting.settingEl.empty();

            const headerEl = topLevelSetting.settingEl.createEl('div', 'brush-setting-header ');

            const nameComponentEl = headerEl.createEl('div', 'brush-setting-name-component setting-item-info');
            const nameEl = nameComponentEl.createEl('span', {
                cls: "brush-setting-name",
                text: brush.name || `Brush #${index}`
            });
            const deleteButtonEl = nameComponentEl.createEl('span');
            index !== 0 && new ExtraButtonComponent(deleteButtonEl).setTooltip('Delete brush').setIcon('trash').onClick(
                () => {
                    settings.brushes.splice(index, 1);
                    this.applySettingsUpdate();

                    setTimeout(() => {
                        this.display();
                    }, 200);
                }
            );

            const toggleComponentEl = headerEl.createEl('div', 'brush-setting-toggle setting-item-control');

            const toggleEl = toggleComponentEl.createEl('div', 'brush-setting-toggle');
            new ToggleComponent(toggleEl).setValue(brush.enable).onChange((value) => {
                settings.brushes[index] = {...brush, enable: value};
                this.applySettingsUpdate();
            });

            const mainSettingsEl = topLevelSetting.settingEl.createEl('div', 'brush-main-settings');

            const brushNameEl = mainSettingsEl.createEl('div', 'brush-main-settings-name');
            brushNameEl.createEl('label', {text: 'Brush name'});
            brushNameEl.createEl('input', {
                cls: 'name-input',
                type: 'text',
                value: brush.name,
            }).on('change', '.name-input', async (evt: Event) => {
                const target = evt.target as HTMLInputElement;
                settings.brushes[index] = {...brush, name: target.value};
                this.applySettingsUpdate();
            });

            const insertPrefixEl = mainSettingsEl.createEl('div', 'brush-main-settings-prefix');
            insertPrefixEl.createEl('label', {text: 'Prefix'});
            insertPrefixEl.createEl('input', {
                cls: 'prefix-input',
                type: 'text',
                value: brush.insert.prefix,
            }).on('change', '.prefix-input', async (evt: Event) => {
                const target = evt.target as HTMLInputElement;
                settings.brushes[index] = {...brush, insert: {...brush.insert, prefix: target.value}};
                this.applySettingsUpdate();
            });

            const insertSuffixEl = mainSettingsEl.createEl('div', 'brush-main-settings-suffix');
            insertSuffixEl.createEl('label', {text: 'Suffix'});
            insertSuffixEl.createEl('input', {
                cls: 'suffix-input',
                type: 'text',
                value: brush.insert.suffix,
            }).on('change', '.suffix-input', async (evt: Event) => {
                const target = evt.target as HTMLInputElement;
                settings.brushes[index] = {...brush, insert: {...brush.insert, suffix: target.value}};
                this.applySettingsUpdate();
            });


        });
    }
}
