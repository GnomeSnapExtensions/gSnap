// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GObject from 'gi://GObject';
// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import * as SETTINGS from "./settings_data";

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
    [SETTINGS.MOVE_FOCUSED_UP]: 'Move focused window up',
    [SETTINGS.MOVE_FOCUSED_DOWN]: 'Move focused window down',
    [SETTINGS.MOVE_FOCUSED_LEFT]: 'Move focused window left',
    [SETTINGS.MOVE_FOCUSED_RIGHT]: 'Move focused window right',
}

export default class GSnapPreferences extends ExtensionPreferences {
    private settings: any;

    fillPreferencesWindow(window: any) {
        this.settings = super.getSettings();
        window._settings = this.settings;

        const preferencesPage = new Adw.PreferencesPage({
            title: "Preferences",
            icon_name: "emblem-system-symbolic"
        });
        preferencesPage.add(this.basics());
        preferencesPage.add(this.miscSettings());
        window.add(preferencesPage);

        const shortcutsPage = new Adw.PreferencesPage({
            title: "Shortcuts",
            icon_name: "preferences-desktop-keyboard-symbolic"
        });
        shortcutsPage.add(this.shortcuts());
        window.add(shortcutsPage);

        const aboutPage = new Adw.PreferencesPage({
            title: "About",
            icon_name: "help-about-symbolic"
        });
        aboutPage.add(this.about());
        aboutPage.add(this.aboutLinks());
        window.add(aboutPage);
    }

    basics() {
        const group = new Adw.PreferencesGroup({
            title: 'Basics'
        });

        this.add_check(group, SETTINGS.SHOW_ICON, "Show icon");
        const show_tabs_check = this.add_check(group, SETTINGS.SHOW_TABS, 
            "Show tabs",
            "This feature is not supported if you have the \"Hold ALT to span multiple zones\" feature enabled");

        this.add_check(group, SETTINGS.MOVERESIZE_ENABLED, "Enable accelerators for moving and resizing windows");
        this.add_check(group, SETTINGS.USE_MODIFIER, "Hold CTRL to snap windows");
        const span_multiple_zones_check = this.add_check(group, SETTINGS.SPAN_MULTIPLE_ZONES,
             "Hold ALT to span multiple zones",
             "This feature is not supported if you have the \"Show tabs\" feature enabled");
        this.add_check(group, SETTINGS.PREVENT_SNAPPING, "Hold Super to prevent snapping windows");

        // disable "Span multiple zones" setting if "Show tabs" setting was already enabled
        if (this.settings.get_boolean(SETTINGS.SHOW_TABS)) {
            span_multiple_zones_check.set_sensitive(false);
        // disable "Show tabs" setting if "Span multiple zones" setting was already enabled
        } else if (this.settings.get_boolean(SETTINGS.SPAN_MULTIPLE_ZONES)) {
            show_tabs_check.set_sensitive(false);
        }

        // Watch for changes to the setting SETTINGS.SHOW_TABS
        this.settings.connect(`changed::${SETTINGS.SHOW_TABS}`, (settings: any, changed_key: string) => {
            // disable "Span multiple zones" setting if "Show tabs" setting is enabled by the user
            span_multiple_zones_check.set_sensitive(!settings.get_boolean(changed_key));
        });

        // Watch for changes to the setting SETTINGS.SPAN_MULTIPLE_ZONES
        this.settings.connect(`changed::${SETTINGS.SPAN_MULTIPLE_ZONES}`, (settings: any, changed_key: string) => {
            // disable "Show tabs" setting if "Span multiple zones" setting is enabled by the user
            show_tabs_check.set_sensitive(!settings.get_boolean(changed_key));
        });

        this.add_check(group, SETTINGS.ANIMATIONS_ENABLED, "Enable animations");

        this.add_int(group, SETTINGS.WINDOW_MARGIN,
            "Window margin",
            0, 32, 1,
            "Window margins and invisible borders around screen.",
        );

        return group;
    }

    miscSettings() {
        const group = new Adw.PreferencesGroup({
            title: 'Miscellaneous'
        });

        this.add_check(group, SETTINGS.DEBUG,
            "Debug",
            "To see debug messages, in terminal run journalctl /usr/bin/gnome-shell -f");

        return group;
    }

    shortcuts() {
        const group = new Adw.PreferencesGroup({
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

        const _settings = this.settings as any;
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

    about() {
        const group = new Adw.PreferencesGroup();

        var logo = new Gtk.Image({
            width_request: 150,
            height_request: 150,
        });
        logo.set_from_file(`${super.path}/images/icon.png`);

        const nameLabel = new Gtk.Label({
            label: `<b>gSnap</b>`,
            xalign: .5,
            margin_top: 10,
            margin_bottom: 5,
            hexpand: true,
            halign: Gtk.Align.CENTER,
            use_markup: true
        });


        const descriptionLabel = new Gtk.Label({
            label: `Organize windows in customizable snap zones like FancyZones on Windows.`,
            xalign: .5,
            margin_bottom: 20,
            hexpand: true,
            halign: Gtk.Align.CENTER,
            use_markup: true
        });

        group.add(logo);
        group.add(nameLabel);
        group.add(descriptionLabel);
        return group;
    }

    aboutLinks() {
        const group = new Adw.PreferencesGroup({
            title: 'Useful links'
        });

        this.add_linkbutton(
            group,
            'Contribute to the project',
            'https://github.com/GnomeSnapExtensions/gSnap');
        this.add_linkbutton(
            group,
            'Report a bug',
            'https://github.com/GnomeSnapExtensions/gSnap/issues');

        return group;
    }

    add_check(group: any, setting: string, title: string, subtitle: string | null = null) {
        const toggle = new Gtk.Switch({
            active: this.settings.get_boolean(setting),
            valign: Gtk.Align.CENTER,
        });
        this.settings.bind(setting, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);

        const row = new Adw.ActionRow({
            title,
            subtitle,
            activatable_widget: toggle,
        });
        row.add_suffix(toggle);
        group.add(row);
        return toggle;
    }

    add_int(group: any, setting: string, title: string, lower: number, upper: number, step_increment: number, subtitle: string | null = null) {
        const spin = Gtk.SpinButton.new_with_range(lower, upper, step_increment);
        spin.set_valign(Gtk.Align.CENTER);
        this.settings.bind(setting, spin.get_adjustment(), 'value', Gio.SettingsBindFlags.DEFAULT);

        const row = new Adw.ActionRow({
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
        const row = new Adw.ActionRow({
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
