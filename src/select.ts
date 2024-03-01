import { StateField } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { App, debounce, Editor, editorInfoField } from "obsidian";

export let updateSelectionDebounce: (arg0: Editor, arg1: (editor: Editor) => void) => void;

export function initializeDebounce(app: App) {
    // @ts-ignore
    const delayTime = app.plugins.getPlugin('format-brush')?.settings.delayTime || 300;

    updateSelectionDebounce = debounce(
        (editor: Editor, cb: (editor: Editor) => void) => {
            cb(editor);
        }, delayTime, true
    );
}

export const selectionField = StateField.define({
    create() {
        return;
    },
    update(selection, tr) {
        if (tr.selection) {
            return tr.selection;
        }

        return selection;
    }
});

export function selectionPlugin(cb: (editor: Editor) => void) {
    return EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.transactions.some(tr => tr.selection && tr.isUserEvent('select.pointer'))) {
            const selection = update.state.field(selectionField);
            const info = update.state.field(editorInfoField);
            if (info.editor && updateSelectionDebounce) updateSelectionDebounce(info.editor, cb);
        }
    });
}
