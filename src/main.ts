import { debounce, Editor, Menu, Notice, Platform, Plugin, setIcon, ToggleComponent } from 'obsidian';
import { initializeDebounce, selectionField, selectionPlugin } from "./select";
import { DEFAULT_SETTINGS, FormatBrushPluginSettings, FormatBrushSettingTab } from "./settings";

export default class FormatBrushPlugin extends Plugin {
    isFormatBrushOn = false;
    settings: FormatBrushPluginSettings;
    statusBarEl: HTMLElement;

    cb: typeof debounce;

    async onload() {
        await this.registerSettings();
        this.registerEditorExtension([selectionField, selectionPlugin(this.select.bind(this))]);


        this.registerCommands();
        this.setupStatusBar();

        this.app.workspace.onLayoutReady(() => initializeDebounce(this.app));
    }

    select(editor: Editor) {
        const selection = editor.getSelection();
        if (selection.trim() && this.isFormatBrushOn) {
            const currentBrush = this.settings.lastBrush;
            const {prefix, suffix} = currentBrush.insert;
            // get trim content and also the space before and after the trim content
            const trimContent = selection.trim();
            const spaceBefore = selection.slice(0, selection.indexOf(trimContent));
            const spaceAfter = selection.slice(selection.indexOf(trimContent) + trimContent.length);
            let newSelection = '';
            // Check if the selection is already formatted
            if (trimContent.startsWith(prefix) && trimContent.endsWith(suffix)) {
                // Remove the prefix and suffix
                newSelection = `${spaceBefore}${trimContent}${spaceAfter}`;
            } else if (trimContent.startsWith(prefix) && !trimContent.endsWith(suffix)) {
                // Remove the prefix
                newSelection = `${spaceBefore}${trimContent}${suffix}${spaceAfter}`;
            } else if (!trimContent.startsWith(prefix) && trimContent.endsWith(suffix)) {
                // Remove the suffix
                newSelection = `${spaceBefore}${prefix}${trimContent}${spaceAfter}`;
            } else {
                // Add prefix and suffix
                newSelection = `${spaceBefore}${prefix}${trimContent}${suffix}${spaceAfter}`;
            }

            if (!(newSelection === selection)) editor.replaceSelection(newSelection);
        }
    }

    setupStatusBar() {
        if (!Platform.isDesktop) return;

        this.statusBarEl = this.addStatusBarItem();
        this.initializeStatusBarElements();
        this.updateStatusBar();

        this.registerDomEvent(this.statusBarEl, "click", this.handleStatusBarClick.bind(this));
    }

    /**
     * Initializes the elements for the status bar.
     */
    private initializeStatusBarElements() {
        this.statusBarEl.addClass("format-brush-statusbar-button");

        const iconEl = this.statusBarEl.createEl('span', {cls: "format-brush-icon"});
        setIcon(iconEl, 'paintbrush');

        this.statusBarEl.createEl('span', {cls: "format-brush-text"});
    }

    updateStatusBar() {
        const textEl = this.statusBarEl.querySelector('.format-brush-text') as HTMLElement;
        this.statusBarEl.toggleClass('format-brush-activated', this.isFormatBrushOn);
        textEl.textContent = this.isFormatBrushOn ? this.settings.lastBrush.name : '';
    }

    private handleStatusBarClick() {
        this.showFormatBrushMenu();
    }

    private callNotices() {
        new Notice(`Format brush is ${this.isFormatBrushOn ? 'on' : 'off'}`);
    }

    private toggleFormatBrush(state?: boolean) {
        this.isFormatBrushOn = state !== undefined ? state : !this.isFormatBrushOn;
        this.updateStatusBar();
    }

    private showFormatBrushMenu() {
        const statusBarRect =
            this.statusBarEl?.parentElement?.getBoundingClientRect();
        const statusBarIconRect = this.statusBarEl?.getBoundingClientRect();

        const menu = new Menu();

        for (const brush of this.settings.brushes) {
            menu.addItem((item) => {
                item.setTitle(brush.name).setIcon('paintbrush');
                const itemDom = (item as any).dom as HTMLElement;


                item.setChecked(
                    this.isFormatBrushOn && this.settings.lastBrush.name === brush.name
                ).onClick((e) => {
                    if (this.isFormatBrushOn && this.settings.lastBrush.name === brush.name) {
                        this.updateStatusBar();
                        this.toggleFormatBrush(false);
                        this.callNotices();
                    } else {
                        this.settings.lastBrush = brush;
                        this.updateStatusBar();
                        if (!this.isFormatBrushOn) {
                            this.toggleFormatBrush(true);
                            this.callNotices();
                        }
                    }
                    this.settings.lastBrush = brush;
                    this.saveSettings();
                });
            });
        }

        const menuDom = (menu as any).dom as HTMLElement;
        menuDom.addClass("format-brush-menu");

        menu.showAtPosition({
            // @ts-ignore
            x: statusBarIconRect.left - 5,
            // @ts-ignore
            y: statusBarRect?.top - 5,
        });
    }

    registerCommands() {
        this.getCommands();
    }


    getCommands() {
        const currentBrushes = this.settings.brushes.filter(brush => brush.enable);

        this.addCommand({
            id: 'toggle-format-brush',
            name: 'Toggle format brush',
            callback: () => {
                this.toggleFormatBrush();
                this.callNotices();
            }
        });

        for (const brush of currentBrushes) {
            this.addCommand({
                id: `switch-format-brush-${brush.name}`,
                name: `Use ${brush.name}`,
                callback: async () => {
                    this.toggleFormatBrush(true);
                    this.callNotices();
                    this.settings.lastBrush = brush;
                    await this.saveSettings();
                }
            });
        }
    }

    updateCommands = debounce(async () => {
        // @ts-ignore
        const commands = this.app.commands.listCommands();
        // Remove all previous commands
        const filteredCommands = commands.filter((command: any) => command.id.startsWith('format-brush'));
        filteredCommands.forEach((command: any) => {
            // @ts-ignore
            this.app.commands.removeCommand(command.id);
        });

        this.getCommands();
    }, 1000, true);

    async registerSettings() {
        await this.loadSettings();
        this.addSettingTab(new FormatBrushSettingTab(this.app, this));
    }

    onunload() {

    }


    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.updateCommands();
    }
}
