import { LayoutsSettings } from "./layouts";
import { log } from "./logging";
import { getStringSetting, setStringSetting } from "./settings";
import * as SETTINGS from './settings_data';

// GJS import system
declare var imports: any;
const GLib = imports.gi.GLib;
const Me = imports.misc.extensionUtils.getCurrentExtension();

export class LayoutsUtils {
    layoutsPath = `${Me.path}/layouts.json`;
    layoutsDefaultPath =`${Me.path}/layouts-default.json`;

    public resetToDefault() {
        log('Resetting default LayoutSettings');
        const defaults = this._getDefaultLayoutsV1();
        this.saveSettings(defaults);
    }

    public saveSettings(layouts: LayoutsSettings) {
        log('Saving LayoutSettings');
        log(JSON.stringify(layouts));
        setStringSetting(SETTINGS.LAYOUTS_V1, JSON.stringify(layouts));
    }

    public loadLayoutSettings(): LayoutsSettings {
        log('Loading LayoutSettings');
        let layoutsv1 = this._loadLayoutsV1();
        if (layoutsv1) {
            log('Found LayoutSettings v1');
            return layoutsv1;
        }

        layoutsv1 = this._loadLayoutsV1FromFile();
        if (layoutsv1) {
            log('Found LayoutSettings v1 from file');
            return layoutsv1;
        }

        log('Load default settings');
        layoutsv1 = this._getDefaultLayoutsV1();

        return layoutsv1;
    }

    private _loadLayoutsV1(): LayoutsSettings | null {
        let json = getStringSetting(SETTINGS.LAYOUTS_V1);
        if (!json || json.length === 0) {
            return null;
        }
        return JSON.parse(json);
    }

    private _loadLayoutsV1FromFile(): LayoutsSettings | null {
        try {
            let [ok, contents] = GLib.file_get_contents(this.layoutsPath);
            if (ok) {
                return JSON.parse(contents);
            }
        } catch (exception) {
            log(JSON.stringify(exception));
        }
        return null;
    }

    private _getDefaultLayoutsV1(): LayoutsSettings {
        return {
            workspaces: [[{ current: 2 }, { current: 3 }], [{ current: 2 }, { current: 3 }]],
            definitions: [
                {
                    name: "None", type: 0, length: 100, items: []
                },
                {
                    name: "1 Column", type: 0, length: 100,
                    items: [
                        { type: 1, length: 100, items: [] }
                    ]
                },
                {
                    name: "2 Column Split", type: 0, length: 100,
                    items: [
                        { type: 1, length: 50, items: [] },
                        { type: 1, length: 50, items: [] }
                    ]
                },
                {
                    name: "3 Column", type: 0, length: 100,
                    items: [
                        { type: 1, length: 33, items: [] },
                        { type: 1, length: 34, items: [] },
                        { type: 1, length: 33, items: [] }
                    ]
                },
                {
                    name: "3 Column (Focused)", type: 0, length: 100,
                    items: [
                        { type: 1, length: 25, items: [] },
                        { type: 1, length: 50, items: [] },
                        { type: 1, length: 25, items: [] }
                    ]
                },
                {
                    name: "3 Columns (Custom)", type: 0, length: 100,
                    items: [
                        { type: 1, length: 42, items: [] },
                        { type: 1, length: 16, items: [
                            { type: 0, length: 33, items: [] },
                            { type: 0, length: 34, items: [] },
                            { type: 0, length: 33, items: [] }
                        ]},
                        { type: 1, length: 42, items: [] }
                    ]
                }
            ]
        };
    }
}
