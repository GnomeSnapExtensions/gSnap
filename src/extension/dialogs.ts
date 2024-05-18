// @ts-ignore
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
// @ts-ignore
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
// @ts-ignore
import St from 'gi://St';
// @ts-ignore
import Clutter from 'gi://Clutter';


export class LayoutNameDialog {
    private _modalDialog: ModalDialog.ModalDialog;
    private _okayCallback: (text: string) => void;

    constructor(title: string, layoutName: string, okayCallback: (text: string) => void) {
        this._modalDialog = new ModalDialog.ModalDialog({});
        this._okayCallback = okayCallback;

        const listLayout = new Dialog.ListSection({ title });
        this._modalDialog.contentLayout.add_child(listLayout);

        const entry = new St.Entry({ text: layoutName });
        listLayout.add_child(entry);

        this._modalDialog.setButtons([
            {
                label: "Ok",
                key: Clutter.Return,
                action: () => {
                    this._okayCallback(entry.text);
                    this._modalDialog.close();
                },
            },
            {
                label: "Cancel",
                key: Clutter.Escape,
                action: () => this._modalDialog.close(),
            }]);
    }

    open() {
        this._modalDialog.open();
    }
}