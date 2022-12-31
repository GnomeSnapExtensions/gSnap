// Library imports
declare var imports: any;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;

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

function set_child(widget: any, child: any) {
    if (Gtk.get_major_version() >= 4) {
        widget.set_child(child);
    } else {
        widget.add(child);
    }
}

function box_append(box: any, child: any) {
    if (Gtk.get_major_version() >= 4) {
        box.append(child);
    } else {
        box.add(child);
    }
}

export class PrefsBuilder {
    shortcuts_tab(notebook: any) {
        let settings = imports.misc.extensionUtils.getSettings();
        let ks_grid = new Gtk.Grid({
            column_spacing: 10,
            orientation: Gtk.Orientation.VERTICAL,
            row_spacing: 10,
        });

        ks_grid.set_margin_start(24);
        ks_grid.set_margin_top(24);

        let model = new Gtk.ListStore();

        model.set_column_types([
            GObject.TYPE_STRING,
            GObject.TYPE_STRING,
            GObject.TYPE_INT,
            GObject.TYPE_INT
        ]);

        for (let key in pretty_names) {
            this.append_hotkey(model, settings, key, (pretty_names as any)[key]);
        }

        let treeview = new Gtk.TreeView({
            'model': model,
            'hexpand': true
        });

        let col;
        let cellrend;

        cellrend = new Gtk.CellRendererText();

        col = new Gtk.TreeViewColumn({
            'title': 'Shortcut',
            'expand': true
        });

        col.pack_start(cellrend, true);
        col.add_attribute(cellrend, 'text', 1);

        treeview.append_column(col);

        cellrend = new Gtk.CellRendererAccel({
            'editable': true,
            'accel-mode': Gtk.CellRendererAccelMode.GTK
        });

        cellrend.connect('accel-cleared', function (_rend: any, str_iter: string) {
            let [success, iter] = model.get_iter_from_string(str_iter);

            if (!success) {
                throw new Error("Something be broken, yo.");
            }

            let name = model.get_value(iter, 0);
            model.set(iter, [3], [0]);
            settings.set_strv(name, ['']);
        });

        cellrend.connect('accel-edited', function (rend: any, str_iter: string, key: any, mods: any) {
            let value = Gtk.accelerator_name(key, mods);


            let [success, iter] = model.get_iter_from_string(str_iter);


            if (!success) {
                throw new Error("Something be broken, yo.");
            }

            let name = model.get_value(iter, 0);

            model.set(iter, [2, 3], [mods, key]);

            settings.set_strv(name, [value]);
        });

        col = new Gtk.TreeViewColumn({
            'title': 'Keybinding'
        });

        col.pack_end(cellrend, false);
        col.add_attribute(cellrend, 'accel-mods', 2);
        col.add_attribute(cellrend, 'accel-key', 3);

        treeview.append_column(col);

        let text = "Keyboard shortcuts. Arrows are used to move window and are not re-assignable.";
        ks_grid.attach_next_to(new Gtk.Label({
            label: text,
            halign: Gtk.Align.START,
            justify: Gtk.Justification.LEFT,
            use_markup: false,
            wrap: true,
        }), null, Gtk.PositionType.BOTTOM, 1, 1);
        ks_grid.attach_next_to(treeview, null, Gtk.PositionType.BOTTOM, 1, 1);

        let ks_window = new Gtk.ScrolledWindow({ 'vexpand': true });
        set_child(ks_window, ks_grid)
        let ks_label = new Gtk.Label({
            label: "Keybindings",
            halign: Gtk.Align.START,
            use_markup: false,
        });
        notebook.append_page(ks_window, ks_label);
    }

    basics_tab(notebook: any) {
        let settings = imports.misc.extensionUtils.getSettings();

        let bs_grid = new Gtk.Grid({
            column_spacing: 10,
            orientation: Gtk.Orientation.VERTICAL,
            row_spacing: 10,
        });

        bs_grid.set_margin_start(24);
        bs_grid.set_margin_top(24);


        this.add_check("Show icon", SETTINGS.SHOW_ICON, bs_grid, settings);
        this.add_check("Show tabs", SETTINGS.SHOW_TABS, bs_grid, settings);
        this.add_check("Enable accelerators for moving and resizing windows", SETTINGS.MOVERESIZE_ENABLED, bs_grid, settings);
        this.add_check("Hold CTRL to snap windows", SETTINGS.USE_MODIFIER, bs_grid, settings);
        this.add_check("Debug", SETTINGS.DEBUG, bs_grid, settings);
        let text = "To see debug messages, in terminal run journalctl /usr/bin/gnome-shell -f";
        bs_grid.attach_next_to(new Gtk.Label({
            label: text,
            halign: Gtk.Align.START,
            justify: Gtk.Justification.LEFT,
            use_markup: false,
            wrap: true,
        }), null, Gtk.PositionType.BOTTOM, 1, 1)

        let bs_window = new Gtk.ScrolledWindow({ 'vexpand': true });
        set_child(bs_window, bs_grid);
        let bs_label = new Gtk.Label({
            label: "Basic",
            halign: Gtk.Align.START,
            use_markup: false,
        });
        notebook.append_page(bs_window, bs_label);
    }

    margins_tab(notebook: any) {
        let settings = imports.misc.extensionUtils.getSettings();
        let mg_grid = new Gtk.Grid({
            column_spacing: 10,
            orientation: Gtk.Orientation.VERTICAL,
            row_spacing: 10,
        });

        mg_grid.set_margin_start(24);
        mg_grid.set_margin_top(24);

        let text = "Window margins and invisible borders around screen.";
        mg_grid.attach_next_to(new Gtk.Label({
            label: text,
            halign: Gtk.Align.START,
            justify: Gtk.Justification.LEFT,
            use_markup: false,
            wrap: true,
        }), null, Gtk.PositionType.BOTTOM, 1, 1)

        this.add_int("Window margin", SETTINGS.WINDOW_MARGIN, mg_grid, settings, 0, 240, 1, 10);

        let mg_window = new Gtk.ScrolledWindow({ 'vexpand': true });
        set_child(mg_window, mg_grid);
        let mg_label = new Gtk.Label({
            label: "Margins",
            halign: Gtk.Align.START,
            use_markup: false,
        });
        notebook.append_page(mg_window, mg_label);
    }

    info_tab(notebook: any) {
        let weblink = 'https://github.com/GnomeSnapExtensions/gSnap/issues';
        let hl_link = new Gtk.LinkButton({
            label: weblink,
            uri: weblink,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
        });
        let hl_label = new Gtk.Label({
            label: "Report a bug",
            halign: Gtk.Align.START,
            use_markup: false,
        });
        notebook.append_page(hl_link, hl_label);
    }

    public build() {
        let notebook = new Gtk.Notebook();

        this.basics_tab(notebook);
        this.shortcuts_tab(notebook);
        //presets_tab(notebook);
        this.margins_tab(notebook);
        this.info_tab(notebook);

        let main_vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 10
        });

        if (Gtk.get_major_version() >= 4) {
            main_vbox.prepend(notebook, true, true, 0);
        } else {
            main_vbox.pack_start(notebook, true, true, 0);
            main_vbox.show_all();
        }

        return main_vbox;
    }

    add_check(check_label: string, SETTINGS: string, grid: any, settings: any) {
        let check = new Gtk.CheckButton({ label: check_label, margin_top: 6 });
        settings.bind(SETTINGS, check, 'active', Gio.SettingsBindFlags.DEFAULT);
        grid.attach_next_to(check, null, Gtk.PositionType.BOTTOM, 1, 1);
    }

    add_int(int_label: string, SETTINGS: string, grid: any, settings: any, minv: number, maxv: number, incre: number, page: number) {
        let item = new IntSelect(int_label);
        item.set_args(minv, maxv, incre, page);
        settings.bind(SETTINGS, item.spin, 'value', Gio.SettingsBindFlags.DEFAULT);
        grid.attach_next_to(item.actor, null, Gtk.PositionType.BOTTOM, 1, 1);
    }

    add_text(text_label: string, SETTINGS: string, grid: any, settings: any, width: number) {
        let item = new TextEntry(text_label);
        item.set_args(width);
        settings.bind(SETTINGS, item.textentry, 'text', Gio.SettingsBindFlags.DEFAULT);
        grid.attach_next_to(item.actor, null, Gtk.PositionType.BOTTOM, 1, 1);
    }

    append_hotkey(model: any, settings: any, name: string, pretty_name: string) {
        let _ok, key, mods;

        if (Gtk.get_major_version() >= 4) {
            // ignore ok as failure treated as disabled
            [_ok, key, mods] = Gtk.accelerator_parse(settings.get_strv(name)[0]);
        } else {
            [key, mods] = Gtk.accelerator_parse(settings.get_strv(name)[0]);
        }

        let row = model.insert(-1);

        model.set(row, [0, 1, 2, 3], [name, pretty_name, mods, key]);
    }
}

// grabbed from sysmonitor code
class IntSelect {
    label: any; //Gtk.Label
    spin: any;  //Gtk.SpinButton
    actor: any; //Gtk.Box

    constructor(name: string) {
        this.label = new Gtk.Label({
            label: name + ":",
            halign: Gtk.Align.START
        });
        this.spin = new Gtk.SpinButton({
            halign: Gtk.Align.END
        });
        this.actor = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });
        this.actor.set_homogeneous(true);
        box_append(this.actor, this.label)
        box_append(this.actor, this.spin)
        this.spin.set_numeric(true);
    }

    set_args(minv: number, maxv: number, incre: number, page: number) {
        this.spin.set_range(minv, maxv);
        this.spin.set_increments(incre, page);
    }

    set_value(value: number) {
        this.spin.set_value(value);
    }
}

class TextEntry {
    label: any;     //Gtk.Label
    textentry: any; //Gtk.Entry
    actor: any;     //Gtk.Box

    constructor(name: string) {
        this.label = new Gtk.Label({ label: name + ":" });
        this.textentry = new Gtk.Entry();
        this.actor = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });
        this.actor.set_homogeneous(true);
        box_append(this.actor, this.label);
        box_append(this.actor, this.textentry);
        this.textentry.set_text("");
    }
    set_args(width: number) {
        this.textentry.set_width_chars(width);
    }
    set_value(value: string) {
        this.textentry.set_text(value);
    }
}

