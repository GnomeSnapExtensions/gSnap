// @ts-ignore
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
// @ts-ignore
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
// @ts-ignore
import St from 'gi://St';
// @ts-ignore
import Clutter from 'gi://Clutter';
// @ts-ignore
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
// @ts-ignore
import * as Main from 'resource:///org/gnome/shell/ui/main.js';


export class LayoutNameDialog {
    private _modalDialog: ModalDialog.ModalDialog;
    private _okayCallback: (text: string, isCanvas: boolean) => void;
    private _menu: any = null;
    private _menuManager: any = null;

    constructor(title: string, layoutName: string, showTypeSelection: boolean, okayCallback: (text: string, isCanvas: boolean) => void) {
        this._modalDialog = new ModalDialog.ModalDialog({});
        this._okayCallback = okayCallback;

        const listLayout = new Dialog.ListSection({ title });
        this._modalDialog.contentLayout.add_child(listLayout);

        const entry = new St.Entry({ text: layoutName });
        listLayout.add_child(entry);

        let isCanvas = false;
        if (showTypeSelection) {
            const row = new St.BoxLayout({
                vertical: false,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'margin-top: 10px;'
            });

            const label = new St.Label({
                text: "Layout Type:  ",
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true
            });
            row.add_child(label);

            const dropdownButton = new St.Button({
                label: "Grid Layout ▾",
                style_class: "button",
                can_focus: true,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER
            });
            dropdownButton.set_style('padding: 6px 12px; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; min-width: 150px; text-align: center;');
            row.add_child(dropdownButton);

            this._menu = new PopupMenu.PopupMenu(dropdownButton, 0.5, St.Side.BOTTOM);
            Main.uiGroup.add_child(this._menu.actor);
            this._menu.actor.hide();

            this._menuManager = new PopupMenu.PopupMenuManager(this);
            this._menuManager.addMenu(this._menu);

            const gridItem = new PopupMenu.PopupMenuItem("Grid Layout");
            gridItem.connect('activate', () => {
                isCanvas = false;
                dropdownButton.label = "Grid Layout ▾";
                this._menu.close();
            });
            this._menu.addMenuItem(gridItem);

            const canvasItem = new PopupMenu.PopupMenuItem("Canvas Layout");
            canvasItem.connect('activate', () => {
                isCanvas = true;
                dropdownButton.label = "Canvas Layout ▾";
                this._menu.close();
            });
            this._menu.addMenuItem(canvasItem);

            dropdownButton.connect('clicked', () => {
                this._menu.toggle();
            });

            listLayout.add_child(row);
        }

        this._modalDialog.setButtons([
            {
                label: "Ok",
                key: Clutter.Return,
                action: () => {
                    this._okayCallback(entry.text, isCanvas);
                    this.destroyMenu();
                    this._modalDialog.close();
                },
            },
            {
                label: "Cancel",
                key: Clutter.Escape,
                action: () => {
                    this.destroyMenu();
                    this._modalDialog.close();
                },
            }]);
    }

    destroyMenu() {
        if (this._menu) {
            this._menu.destroy();
            this._menu = null;
        }
        this._menuManager = null;
    }

    open() {
        this._modalDialog.open();
    }
}