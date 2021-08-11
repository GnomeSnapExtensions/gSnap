'use strict'
// Library imports
const GObject = imports.gi.GObject;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

// Extension imports
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

// Redefining globals from extension.js - do not know how to do it better :-(
const SETTINGS_GRID_SIZES = 'grid-sizes';
const SETTINGS_AUTO_CLOSE = 'auto-close';
const SETTINGS_ANIMATION = 'animation';
const SETTINGS_SHOW_ICON = 'show-icon';
const SETTINGS_GLOBAL_PRESETS = 'global-presets';
const SETTINGS_MOVERESIZE_ENABLED = 'moveresize-enabled';
const SETTINGS_WINDOW_MARGIN = 'window-margin';
const SETTINGS_WINDOW_MARGIN_FULLSCREEN_ENABLED = 'window-margin-fullscreen-enabled';
const SETTINGS_MAX_TIMEOUT = 'max-timeout';
const SETTINGS_PRESET_RESIZE = 'resize';
const SETTINGS_MAIN_WINDOW_SIZES = 'main-window-sizes';
const SETTINGS_DEBUG = 'debug';

const SETTINGS_INSETS_PRIMARY_LEFT = 'insets-primary-left';
const SETTINGS_INSETS_PRIMARY_RIGHT = 'insets-primary-right';
const SETTINGS_INSETS_PRIMARY_TOP = 'insets-primary-top';
const SETTINGS_INSETS_PRIMARY_BOTTOM = 'insets-primary-bottom';

const SETTINGS_INSETS_SECONDARY_LEFT = 'insets-secondary-left';
const SETTINGS_INSETS_SECONDARY_RIGHT = 'insets-secondary-right';
const SETTINGS_INSETS_SECONDARY_TOP = 'insets-secondary-top';
const SETTINGS_INSETS_SECONDARY_BOTTOM = 'insets-secondary-bottom';
// Globals
const pretty_names = {
    'preset-resize-1'         : 'Layout 1',
    'preset-resize-2'         : 'Layout 2',
    'preset-resize-3'         : 'Layout 3',
    'preset-resize-4'         : 'Layout 4',
    'preset-resize-5'         : 'Layout 5',
    'preset-resize-6'         : 'Layout 6',
    'preset-resize-7'         : 'Layout 7',
    'preset-resize-8'         : 'Layout 8',
    'preset-resize-9'         : 'Layout 9',
    'preset-resize-10'        : 'Layout 10',
    'preset-resize-11'        : 'Layout 11',
    'preset-resize-12'        : 'Layout 12',
  
}

function set_child(widget, child) {
    if (Gtk.get_major_version() >= 4) {
        widget.set_child(child);
    } else {
        widget.add(child);
    }
}

function box_append(box, child) {
    if (Gtk.get_major_version() >= 4) {
        box.append(child);
    } else {
        box.add(child);
    }
}

function init() {

}

function accel_tab(notebook) {
    let settings = Settings.get();
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
        append_hotkey(model, settings, key, pretty_names[key]);
    }

    let treeview = new Gtk.TreeView({
        'model': model,
        'hexpand': true
    });

    let col;
    let cellrend;

    cellrend = new Gtk.CellRendererText();

    col = new Gtk.TreeViewColumn({
        'title': 'Keybinding',
        'expand': true
    });

    col.pack_start(cellrend, true);
    col.add_attribute(cellrend, 'text', 1);

    treeview.append_column(col);

    cellrend = new Gtk.CellRendererAccel({
        'editable': true,
        'accel-mode': Gtk.CellRendererAccelMode.GTK
    });

    cellrend.connect('accel-cleared', function(rend, str_iter) {
        let [success, iter] = model.get_iter_from_string(str_iter);

        if (!success) {
            throw new Error("Something be broken, yo.");
        }

        let name = model.get_value(iter, 0);
        model.set(iter, [3], [0]);
        settings.set_strv(name, ['']);
    });

    cellrend.connect('accel-edited', function(rend, str_iter, key, mods) {
        let value = Gtk.accelerator_name(key, mods);


        let [success, iter] = model.get_iter_from_string(str_iter);


        if (!success) {
            throw new Error("Something be broken, yo.");
        }

        let name = model.get_value(iter, 0);

        model.set(iter, [ 2, 3 ], [ mods, key ]);

        settings.set_strv(name, [value]);
    });

    col = new Gtk.TreeViewColumn({
        'title': 'Accel'
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

    let ks_window = new Gtk.ScrolledWindow({'vexpand': true});
    set_child(ks_window, ks_grid)
    let ks_label = new Gtk.Label({
        label: "Accelerators",
        halign: Gtk.Align.START,
        use_markup: false,
    });
    notebook.append_page(ks_window, ks_label);
}

function basics_tab(notebook) {
    let settings = Settings.get();

    let bs_grid = new Gtk.Grid({
        column_spacing: 10,
        orientation: Gtk.Orientation.VERTICAL,
        row_spacing: 10,
    });

    bs_grid.set_margin_start(24);
    bs_grid.set_margin_top(24);


    add_check("Show icon",  SETTINGS_SHOW_ICON,  bs_grid, settings);
    add_check("Enable accelerators for moving and resizing windows", SETTINGS_MOVERESIZE_ENABLED  , bs_grid, settings);
    add_check("Debug", SETTINGS_DEBUG    , bs_grid, settings);
    let text = "To see debug messages, in terminal run journalctl /usr/bin/gnome-shell -f";
    bs_grid.attach_next_to(new Gtk.Label({
        label: text,
        halign: Gtk.Align.START,
        justify: Gtk.Justification.LEFT,
        use_markup: false,
        wrap: true,
    }), null, Gtk.PositionType.BOTTOM, 1, 1)

    let bs_window = new Gtk.ScrolledWindow({'vexpand': true});
    set_child(bs_window, bs_grid);
    let bs_label = new Gtk.Label({
        label: "Basic",
        halign: Gtk.Align.START,
        use_markup: false,
    });
    notebook.append_page(bs_window, bs_label);
}


function margins_tab(notebook) {
    let settings = Settings.get();
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
    
    add_int ("Window margin"            , SETTINGS_WINDOW_MARGIN           , mg_grid, settings, 0, 240, 1, 10);

    let mg_window = new Gtk.ScrolledWindow({'vexpand': true});
    set_child(mg_window, mg_grid);
    let mg_label = new Gtk.Label({
        label: "Margins",
        halign: Gtk.Align.START,
        use_markup: false,
    });
    notebook.append_page(mg_window, mg_label);
}

function help_tab(notebook) {
    let weblink = 'https://github.com/gSnap/gSnap/blob/master/README.md';
    let hl_link =  new Gtk.LinkButton({
        label: weblink,
        uri: weblink,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
    });
    let hl_label = new Gtk.Label({
        label: "Help",
        halign: Gtk.Align.START,
        use_markup: false,
    });
    notebook.append_page(hl_link, hl_label);
}

function buildPrefsWidget() {
   
    let notebook = new Gtk.Notebook();

    basics_tab(notebook);
    accel_tab(notebook);
    //presets_tab(notebook);
    margins_tab(notebook);
    help_tab(notebook);

    let main_vbox = new Gtk.Box({   orientation: Gtk.Orientation.VERTICAL,
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

function add_check(check_label, SETTINGS, grid, settings) {
    let check = new Gtk.CheckButton({ label: check_label, margin_top: 6 });
    settings.bind(SETTINGS, check, 'active', Gio.SettingsBindFlags.DEFAULT);
    grid.attach_next_to(check, null, Gtk.PositionType.BOTTOM, 1, 1);
}

function add_int(int_label, SETTINGS, grid, settings, minv, maxv, incre, page) {
    let item = new IntSelect(int_label);
    item.set_args(minv, maxv, incre, page);
    settings.bind(SETTINGS, item.spin, 'value', Gio.SettingsBindFlags.DEFAULT);
    grid.attach_next_to(item.actor, null, Gtk.PositionType.BOTTOM, 1, 1);
}
function add_text(text_label, SETTINGS, grid, settings, width) {
    let item = new TextEntry(text_label);
    item.set_args(width);
    settings.bind(SETTINGS, item.textentry, 'text', Gio.SettingsBindFlags.DEFAULT);
    grid.attach_next_to(item.actor, null, Gtk.PositionType.BOTTOM, 1, 1);
}

// grabbed from sysmonitor code

const IntSelect = new Lang.Class({
        Name: 'gSnap.IntSelect',

    _init: function(name) {
        this.label = new Gtk.Label({
            label: name + ":",
            halign: Gtk.Align.START
        });
        this.spin = new Gtk.SpinButton({
            halign: Gtk.Align.END
        });
        this.actor = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 10});
        this.actor.set_homogeneous(true);
        box_append(this.actor, this.label)
        box_append(this.actor, this.spin)
        this.spin.set_numeric(true);
    },
    set_args: function(minv, maxv, incre, page){
        this.spin.set_range(minv, maxv);
        this.spin.set_increments(incre, page);
    },
    set_value: function(value){
        this.spin.set_value(value);
    }
});

const TextEntry = new Lang.Class({
        Name: 'gSnap.TextEntry',

    _init: function(name) {
        this.label = new Gtk.Label({label: name + ":"});
        this.textentry = new Gtk.Entry();
        this.actor = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 10});
        this.actor.set_homogeneous(true);
        box_append(this.actor, this.label);
        box_append(this.actor, this.textentry);
        this.textentry.set_text("");
    },
    set_args: function(width){
        this.textentry.set_width_chars(width);
    },
    set_value: function(value){
        this.textentry.set_text(value);
    }
});


function append_hotkey(model, settings, name, pretty_name) {
    let _ok, key, mods;

    if (Gtk.get_major_version() >= 4) {
        // ignore ok as failure treated as disabled
        [_ok, key, mods] = Gtk.accelerator_parse(settings.get_strv(name)[0]);
    } else {
        [key, mods] = Gtk.accelerator_parse(settings.get_strv(name)[0]);
    }

    let row = model.insert(-1);

    model.set(row, [0, 1, 2, 3], [name, pretty_name, mods, key ]);
}
