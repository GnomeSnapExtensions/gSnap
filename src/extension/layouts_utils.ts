import {
    GLib,
    ExtensionUtils,
    ByteArray
} from "../gnome/imports";

import { LayoutsSettings } from "./layouts";
import { log } from "./logging";
import { ShellVersion } from "./shellversion";

const Me = ExtensionUtils.getCurrentExtension();

export class LayoutsUtils {
    get configPath() {
        return GLib.build_pathv('/', [GLib.get_user_config_dir(), 'gSnap']);
    }

    get layoutsPath() {
        return GLib.build_filenamev([this.configPath, 'layouts.json']);
    }

    public resetToDefault() {
        log('Resetting default LayoutSettings');
        const defaults = this._getDefaultLayoutsV1();
        this.saveSettings(defaults);
    }

    public saveSettings(layouts: LayoutsSettings) {
        log('Saving LayoutSettings');
        log(JSON.stringify(layouts));

        // 493 dec is 755 octal
        if(GLib.mkdir_with_parents(this.configPath, 493) === 0) {
            GLib.file_set_contents(this.layoutsPath, JSON.stringify(layouts));
        };
    }

    public loadLayoutSettings(): LayoutsSettings {
        log('Loading LayoutSettings');
        let layoutsv1 = this._loadLayoutsV1();
        if (layoutsv1) return layoutsv1;

        layoutsv1 = this._loadLayoutsV1FromExtensionDir();
        if (layoutsv1) return layoutsv1;

        layoutsv1 = this._getDefaultLayoutsV1();

        return layoutsv1;
    }

    private _loadLayoutsV1(): LayoutsSettings | null {
        return this._loadFromJsonFile(this.layoutsPath);
    }

    private _loadLayoutsV1FromExtensionDir(): LayoutsSettings | null {
        const oldLayoutsPath = GLib.build_filenamev([Me.path, 'layouts.json']);
        return this._loadFromJsonFile(oldLayoutsPath);
    }

    private _loadFromJsonFile(filePath: string): LayoutsSettings | null
    {
        try {
            if(!GLib.file_test(filePath, GLib.FileTest.EXISTS)) return null;

            let [ok, contents] = GLib.file_get_contents(filePath);

            if (ok) {
                log(`Found in ${filePath}`);

                let contentsString = '';
                if(ShellVersion.defaultVersion().version_at_least_41()) {
                    const decoder = new TextDecoder('utf-8');
                    contentsString = decoder.decode(contents);
                } else {
                    contentsString = ByteArray.toString(contents);
                }

                return JSON.parse(contentsString);
            }
        } catch (exception) {
            log(JSON.stringify(exception));
        }
        return null;
    }

    private _getDefaultLayoutsV1(): LayoutsSettings {
        log('Loading default layouts');
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
