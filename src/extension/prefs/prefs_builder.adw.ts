// Library imports
declare var imports: any;
const {
    Gio,
    Gtk,
    GObject,
} = imports.gi;

import * as SETTINGS from "../settings_data";

// Globals
const pretty_names = {
    [SETTINGS.PRESET_RESIZE_1]: 'Layout 1',
    [SETTINGS.PRESET_RESIZE_2]: 'Layout 2',
    [SETTINGS.PRESET_RESIZE_3]: 'Layout 3',
    [SETTINGS.PRESET_RESIZE_4]: 'Layout 4',
    [SETTINGS.PRESET_RESIZE_5]: 'Layout 5',
    [SETTINGS.PRESET_RESIZE_6]: 'Layout 6',
    [SETTINGS.PRESET_RESIZE_7]: 'Layout 7',
    [SETTINGS.PRESET_RESIZE_8]: 'Layout 8',
    [SETTINGS.PRESET_RESIZE_9]: 'Layout 9',
    [SETTINGS.PRESET_RESIZE_10]: 'Layout 10',
    [SETTINGS.PRESET_RESIZE_11]: 'Layout 11',
    [SETTINGS.PRESET_RESIZE_12]: 'Layout 12',
}

export class AdwPrefsBuilder {
    private settings: any;
    private _Adw = imports.gi.Adw;

    constructor() {
        this.settings = imports.misc.extensionUtils.getSettings();
    }

    basics() {
        const group = new this._Adw.PreferencesGroup({
            title: 'Basics'
        });

        this.add_check(group, SETTINGS.SHOW_ICON, "Show icon");
        this.add_check(group, SETTINGS.SHOW_TABS, "Show tabs");
        this.add_check(group, SETTINGS.MOVERESIZE_ENABLED, "Enable accelerators for moving and resizing windows");
        this.add_check(group, SETTINGS.USE_MODIFIER, "Hold CTRL to snap windows");
        this.add_check(group, SETTINGS.DEBUG,
            "Debug",
            "To see debug messages, in terminal run journalctl /usr/bin/gnome-shell -f");
        return group;
    }

    margins() {
        const group = new this._Adw.PreferencesGroup({
            title: 'Margins'
        });

        this.add_int(group, SETTINGS.WINDOW_MARGIN,
            "Window margin",
            0, 32, 1,
            "Window margins and invisible borders around screen.",
        );
        return group;
    }

    shortcuts() {
        const group = new this._Adw.PreferencesGroup({
            title: 'Shortcuts'
        });

        let model = new Gtk.ListStore();

        model.set_column_types([
            GObject.TYPE_STRING,
            GObject.TYPE_STRING,
            GObject.TYPE_INT,
            GObject.TYPE_INT
        ]);

        for (let key in pretty_names) {
            this.add_hotkey(model, key, (pretty_names as any)[key]);
        }

        const titleRenderer = new Gtk.CellRendererText();
        const titleColumn = new Gtk.TreeViewColumn({
            title: 'Shortcut',
            expand: true
        });

        titleColumn.pack_start(titleRenderer, true);
        titleColumn.add_attribute(titleRenderer, 'text', 1);

        const keybindingsCellRenderer = new Gtk.CellRendererAccel({
            editable: true,
            'accel-mode': Gtk.CellRendererAccelMode.GTK
        });

        const _settings = this.settings;
        keybindingsCellRenderer.connect('accel-cleared', function (_rend: any, str_iter: string) {
            let [success, iter] = model.get_iter_from_string(str_iter);

            if (!success) {
                throw new Error("Something be broken, yo.");
            }

            let name = model.get_value(iter, 0);
            model.set(iter, [3], [0]);
            _settings.set_strv(name, ['']);
        });

        keybindingsCellRenderer.connect('accel-edited', function (rend: any, str_iter: string, key: any, mods: any) {
            let value = Gtk.accelerator_name(key, mods);
            let [success, iter] = model.get_iter_from_string(str_iter);
            if (!success) {
                throw new Error("Something be broken, yo.");
            }

            let name = model.get_value(iter, 0);
            model.set(iter, [2, 3], [mods, key]);
            _settings.set_strv(name, [value]);
        });

        const keybindingsColumn = new Gtk.TreeViewColumn({
            title: 'Keybindings'
        });
        keybindingsColumn.pack_end(keybindingsCellRenderer, false);
        keybindingsColumn.add_attribute(keybindingsCellRenderer, 'accel-mods', 2);
        keybindingsColumn.add_attribute(keybindingsCellRenderer, 'accel-key', 3);

        const treeview = new Gtk.TreeView({
            model,
            hexpand: true
        });
        treeview.append_column(titleColumn);
        treeview.append_column(keybindingsColumn);
        group.add(treeview);
        return group;
    }


    info() {
        const group = new this._Adw.PreferencesGroup({
            title: 'gSnap'
        });

        this.add_linkbutton(
            group,
            'Project',
            'https://github.com/GnomeSnapExtensions/gSnap');
        this.add_linkbutton(
            group,
            'Report a bug',
            'https://github.com/GnomeSnapExtensions/gSnap/issues');

        return group;
    }

    public build(window: any) {
        // Create a preferences page and group
        const page = new this._Adw.PreferencesPage();

        page.add(this.info());
        page.add(this.basics());
        page.add(this.margins());
        page.add(this.shortcuts());

        // Add our page to the window
        window.add(page);
    }

    add_check(group: any, setting: string, title: string, subtitle: string | null = null) {
        const toggle = new Gtk.Switch({
            active: this.settings.get_boolean(setting),
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind(setting, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);

        const row = new this._Adw.ActionRow({
            title,
            subtitle,
            activatable_widget: toggle,
        });
        row.add_suffix(toggle);
        group.add(row);
    }

    add_int(group: any, setting: string, title: string, lower: number, upper: number, step_increment: number, subtitle: string | null = null) {
        const spin = Gtk.SpinButton.new_with_range(lower, upper, step_increment);
        spin.set_valign(Gtk.Align.CENTER);
        this.settings.bind(setting, spin.get_adjustment(), 'value', Gio.SettingsBindFlags.DEFAULT);

        const row = new this._Adw.ActionRow({
            title,
            subtitle,
            activatableWidget: spin
        });
        row.add_suffix(spin);
        group.add(row);
    }

    add_linkbutton(group: any, title: string, uri: string) {
        let button = new Gtk.LinkButton({
            uri: uri,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
        });
        const row = new this._Adw.ActionRow({
            title,
            activatable_widget: button,
        });
        row.add_suffix(button);
        group.add(row);
    }

    add_hotkey(model: any, name: string, pretty_name: string) {
        // ignore ok as failure treated as disabled
        const [_ok, key, mods] = Gtk.accelerator_parse(this.settings.get_strv(name)[0]);

        let row = model.insert(-1);
        model.set(row, [0, 1, 2, 3], [name, pretty_name, mods, key]);
    }
}
