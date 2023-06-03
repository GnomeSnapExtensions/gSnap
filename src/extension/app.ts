// GJS import system
declare var imports: any;
declare var global: any;
import { log } from './logging';
import { ShellVersion } from './shellversion';
import { bind as bindHotkeys, unbind as unbindHotkeys, Bindings } from './hotkeys';
import { ZoneEditor, ZonePreview, TabbedZoneManager, EntryDialog, ZoneManager, MoveDirection } from "./editor";

const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Gettext = imports.gettext;
const _ = Gettext.gettext;
import {
    Display,
    Window,
    WindowType,
    WorkspaceManager as WorkspaceManagerInterface
} from "./gnometypes";

import {
    activeMonitors,
    getCurrentMonitorIndex,
    getWindowsOfMonitor,
} from './monitors';

import {
    deinitSettings,
    getBoolSetting,
    gridSettings,
    initSettings,
} from './settings';

import * as SETTINGS from './settings_data';

import { cloneLayout, Layout, LayoutsSettings, WorkspaceMonitorSettings } from './layouts';
import { LayoutsUtils } from './layouts_utils';
import ModifiersManager, { MODIFIERS_ENUM } from './modifiers';

/*****************************************************************

 This extension has been developed by micahosborne

 With the help of the gnome-shell community

 Edited by Kvis for gnome 3.8
 Edited by Lundal for gnome 3.18
 Edited by Sergey to add keyboard shortcuts and prefs dialog

 ******************************************************************/

/*****************************************************************
 CONST & VARS
 *****************************************************************/

// Library imports
const Main = imports.ui.main;
const GObject = imports.gi.GObject;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Getter for accesing "get_active_workspace" on GNOME <=2.28 and >= 2.30
const WorkspaceManager: WorkspaceManagerInterface = (
    global.screen || global.workspace_manager);

let launcher: GSnapStatusButtonClass | null;
let enabled = false;
let monitorsChangedConnect: any = false;
const trackedWindows: Window[] = global.trackedWindows = [];

const SHELL_VERSION = ShellVersion.defaultVersion();

const keyBindings: Bindings = new Map([
    [SETTINGS.MOVE_FOCUSED_UP, () => {
        globalApp.moveFocusedWindow(MoveDirection.Up)
    }],
    [SETTINGS.MOVE_FOCUSED_DOWN, () => {
        globalApp.moveFocusedWindow(MoveDirection.Down)
    }],
    [SETTINGS.MOVE_FOCUSED_LEFT, () => {
        globalApp.moveFocusedWindow(MoveDirection.Left)
    }],
    [SETTINGS.MOVE_FOCUSED_RIGHT, () => {
        globalApp.moveFocusedWindow(MoveDirection.Right)
    }],
]);

const key_bindings_presets: Bindings = new Map([
    [SETTINGS.PRESET_RESIZE_1, () => {
        globalApp.setLayout(0);
    }],
    [SETTINGS.PRESET_RESIZE_2, () => {
        globalApp.setLayout(1);
    }],
    [SETTINGS.PRESET_RESIZE_3, () => {
        globalApp.setLayout(2);
    }],
    [SETTINGS.PRESET_RESIZE_4, () => {
        globalApp.setLayout(3);
    }],
    [SETTINGS.PRESET_RESIZE_5, () => {
        globalApp.setLayout(4);
    }],
    [SETTINGS.PRESET_RESIZE_6, () => {
        globalApp.setLayout(5);
    }],
    [SETTINGS.PRESET_RESIZE_7, () => {
        globalApp.setLayout(6);
    }],
    [SETTINGS.PRESET_RESIZE_8, () => {
        globalApp.setLayout(7);
    }],
    [SETTINGS.PRESET_RESIZE_9, () => {
        globalApp.setLayout(8);
    }],
    [SETTINGS.PRESET_RESIZE_10, () => {
        globalApp.setLayout(9);
    }],
    [SETTINGS.PRESET_RESIZE_11, () => {
        globalApp.setLayout(10);
    }],
    [SETTINGS.PRESET_RESIZE_12, () => {
        globalApp.setLayout(11);
    }],
    [SETTINGS.PRESET_RESIZE_13, () => {
        globalApp.setLayout(12);
    }],
    [SETTINGS.PRESET_RESIZE_14, () => {

    }],
    [SETTINGS.PRESET_RESIZE_15, () => {

    }],
    [SETTINGS.PRESET_RESIZE_16, () => {

    }],
    [SETTINGS.PRESET_RESIZE_17, () => {

    }],
    [SETTINGS.PRESET_RESIZE_18, () => {

    }],
    [SETTINGS.PRESET_RESIZE_19, () => {

    }],
    [SETTINGS.PRESET_RESIZE_20, () => {

    }],
    [SETTINGS.PRESET_RESIZE_21, () => {

    }],
    [SETTINGS.PRESET_RESIZE_22, () => {

    }],
    [SETTINGS.PRESET_RESIZE_23, () => {

    }],
    [SETTINGS.PRESET_RESIZE_24, () => {

    }],
    [SETTINGS.PRESET_RESIZE_25, () => {

    }],
    [SETTINGS.PRESET_RESIZE_26, () => {

    }],
    [SETTINGS.PRESET_RESIZE_27, () => {

    }],
    [SETTINGS.PRESET_RESIZE_28, () => {

    }],
    [SETTINGS.PRESET_RESIZE_29, () => {

    }],
    [SETTINGS.PRESET_RESIZE_30, () => {

    }],
]);

const keyBindingGlobalResizes: Bindings = new Map([

]);

class App {
    private editor: (ZoneEditor | null)[];
    private preview: (ZonePreview | null)[];
    private tabManager: (ZoneManager | null)[];
    private modifiersManager: ModifiersManager;
    private layoutsUtils: LayoutsUtils;
    private isGrabbing: boolean = false;

    private currentLayoutIdxPerMonitor: number[];
    public layouts: LayoutsSettings = {
        // [workspaceindex][monitorindex]
        workspaces: [
            [{ current: 0 }, { current: 0 }],
            [{ current: 0 }, { current: 0 }]
        ],
        definitions: [
            {
                type: 0,
                name: "2 Column",
                length: 100,
                items: [
                    { type: 0, length: 50, items: [] },
                    { type: 0, length: 50, items: [] }
                ]
            },
        ]
    };

    constructor() {
        const monitors = activeMonitors().length;
        this.editor = new Array<ZoneEditor>(monitors);
        this.preview = new Array<ZonePreview>(monitors);
        this.tabManager = new Array<ZoneManager>(monitors);
        this.currentLayoutIdxPerMonitor = new Array<number>(monitors);
        this.modifiersManager = new ModifiersManager();
        this.layoutsUtils = new LayoutsUtils();
    }

    private restackConnection: any;
    private workspaceSwitchedConnect: any;
    private workareasChangedConnect: any;

    setLayout(layoutIndex: number, monitorIndex = -1) {
        if (this.layouts.definitions.length <= layoutIndex) {
            return;
        }

        if (this.layouts.workspaces == null) {
            this.layouts.workspaces = [];
        }

        if (monitorIndex === -1) {
            monitorIndex = getCurrentMonitorIndex();
        }

        this.currentLayoutIdxPerMonitor[monitorIndex] = layoutIndex;

        let workspaceIndex = WorkspaceManager.get_active_workspace().index();

        this.trySetWorkspaceMonitorLayout(workspaceIndex, monitorIndex, layoutIndex);
        this.saveLayouts();

        this.tabManager[monitorIndex]?.destroy();
        this.tabManager[monitorIndex] = null;

        if (gridSettings[SETTINGS.SHOW_TABS]) {
            this.tabManager[monitorIndex] = new TabbedZoneManager(activeMonitors()[monitorIndex], this.layouts.definitions[layoutIndex], gridSettings[SETTINGS.WINDOW_MARGIN]);
        } else {
            this.tabManager[monitorIndex] = new ZoneManager(activeMonitors()[monitorIndex], this.layouts.definitions[layoutIndex], gridSettings[SETTINGS.WINDOW_MARGIN]);
        }

        this.tabManager[monitorIndex]?.layoutWindows();
        this.reloadMenu();
    }

    showLayoutPreview(monitorIndex: number, layout: Layout) {
        this.preview[monitorIndex]?.destroy();
        this.preview[monitorIndex] = null;

        this.preview[monitorIndex] = new ZonePreview(activeMonitors()[monitorIndex], layout, gridSettings[SETTINGS.WINDOW_MARGIN]);
        this.preview[monitorIndex]!.show();
    }

    hideLayoutPreview() {
        activeMonitors().forEach(monitor => {
            this.preview[monitor.index]?.destroy();
            this.preview[monitor.index] = null;
        });
    }

    enable() {
        this.layouts = this.layoutsUtils.loadLayoutSettings();
        log(JSON.stringify(this.layouts));
        if (this.refreshLayouts()) {
            this.saveLayouts();
        }

        this.setToCurrentWorkspace();
        monitorsChangedConnect = Main.layoutManager.connect(
            'monitors-changed', () => {
                activeMonitors().forEach(m => {
                    this.tabManager[m.index]?.layoutWindows();
                });
                this.reloadMenu();
            });

        const validWindow = (window: Window): boolean => window != null
            && window.get_window_type() == WindowType.NORMAL;

        global.display.connect('window-created', (_display: Display, win: Window) => {
            if (validWindow(win)) {
                activeMonitors().forEach(m => {
                    this.tabManager[m.index]?.layoutWindows();
                });
            }
        });

        global.display.connect('in-fullscreen-changed', (_display: Display) => {
            if (global.display.get_monitor_in_fullscreen(0)) {
                activeMonitors().forEach(m => {
                    this.tabManager[m.index]?.destroy();
                    this.tabManager[m.index] = null;
                });
            } else {
                this.setToCurrentWorkspace();
            }

        });

        global.display.connect('grab-op-begin', (_display: Display, win: Window) => {
            // only start isGrabbing if is a valid window to avoid conflict 
            // with dash-to-panel/appIcons.js:1021 where are emitting a grab-op-begin
            // without never emitting a grab-op-end
            if (!validWindow(win)) return;

            const useModifier = getBoolSetting(SETTINGS.USE_MODIFIER);
            this.isGrabbing = true;

            if (useModifier &&
                !this.modifiersManager.isHolding(MODIFIERS_ENUM.CONTROL))
                return;

            activeMonitors().forEach(m => {
                this.tabManager[m.index]?.show();
            });
        });

        global.display.connect('grab-op-end', (_display: Display, win: Window) => {
            const useModifier = getBoolSetting(SETTINGS.USE_MODIFIER);
            this.isGrabbing = false;

            if (!validWindow(win)) {
                return;
            }

            activeMonitors().forEach(m => {
                this.tabManager[m.index]?.hide();

                if (!useModifier || this.modifiersManager.isHolding(MODIFIERS_ENUM.CONTROL)) {
                    if (!trackedWindows.includes(win)) {
                        trackedWindows.push(win);
                    }

                    this.tabManager[m.index]?.moveWindowToWidgetAtCursor(win);
                    this.tabManager[m.index]?.layoutWindows();
                    return;
                }

                if (useModifier && !this.modifiersManager.isHolding(MODIFIERS_ENUM.CONTROL) && trackedWindows.includes(win)) {
                    trackedWindows.splice(trackedWindows.indexOf(win), 1);
                }
            });
        });

        if (getBoolSetting(SETTINGS.USE_MODIFIER)) {
            this.modifiersManager.connect("changed", () => {
                if (!this.isGrabbing) {
                    return;
                }

                if (this.modifiersManager.isHolding(MODIFIERS_ENUM.CONTROL)) {
                    activeMonitors().forEach(m => this.tabManager[m.index]?.show());
                } else {
                    activeMonitors().forEach(m => this.tabManager[m.index]?.hide());
                }
            });
        }

        this.restackConnection = global.display.connect('restacked', () => {
            activeMonitors().forEach(m => {
                this.tabManager[m.index]?.layoutWindows();
            });
        });

        this.workspaceSwitchedConnect = WorkspaceManager.connect('workspace-switched', () => {
            if (this.refreshLayouts()) {
                this.saveLayouts();
            }

            activeMonitors().forEach(m => {
                this.tabManager[m.index]?.destroy();
                this.tabManager[m.index] = null;
            });

            this.setToCurrentWorkspace();
        });

        this.workareasChangedConnect = global.display.connect('workareas-changed', () => {
            activeMonitors().forEach(m => {
                this.tabManager[m.index]?.reinit();
                this.tabManager[m.index]?.layoutWindows();
            });
        });

        launcher = new GSnapStatusButton('tiling-icon') as GSnapStatusButtonClass;
        launcher.label = "Layouts";
        if (gridSettings[SETTINGS.SHOW_ICON]) {
            Main.panel.addToStatusArea("GSnapStatusButton", launcher);
            this.reloadMenu();
        }

        bindHotkeys(keyBindings);
        if (gridSettings[SETTINGS.GLOBAL_PRESETS]) {
            bindHotkeys(key_bindings_presets);
        }
        if (gridSettings[SETTINGS.MOVERESIZE_ENABLED]) {
            bindHotkeys(keyBindingGlobalResizes);
        }

        this.modifiersManager.enable();

        enabled = true;

        log("Extension enable completed");
    }

    refreshLayouts(): boolean {
        let changed = false;

        // A workspace could have been added. Populate the layouts.workspace array
        let nWorkspaces = WorkspaceManager.get_n_workspaces();
        let nMonitors = activeMonitors().length;
        log(`refreshLayouts ${this.layouts.workspaces.length} ${nWorkspaces} ${nMonitors}`)
        while (this.layouts.workspaces.length < nWorkspaces) {
            let wk = new Array<WorkspaceMonitorSettings>(nMonitors);
            wk.fill({ current: 0 });
            this.layouts.workspaces.push(wk);
            changed = true;
        }

        return changed;
    }

    moveFocusedWindow(direction: MoveDirection) {
        let monitorIndex = getCurrentMonitorIndex();
        const monitor = activeMonitors()[monitorIndex];
        if (!monitor) return;

        let windows = getWindowsOfMonitor(monitor).filter(w => w.has_focus());
        if (windows.length <= 0) return;
        let focusedWindow = windows[0];

        log(`Move ${focusedWindow.title} ${direction}`);

        const useModifier = getBoolSetting(SETTINGS.USE_MODIFIER);
        if (useModifier) {
            const trackedWindows = global.trackedWindows;
            if (!trackedWindows.includes(focusedWindow)) {
                trackedWindows.push(focusedWindow);
            }
        }

        this.tabManager[monitorIndex]?.moveWindowAtDirection(focusedWindow, direction);
        this.tabManager[monitorIndex]?.layoutWindows();
    }

    private getWorkspaceMonitorSettings(workspaceIdx: number): Array<WorkspaceMonitorSettings> {
        if (this.layouts.workspaces[workspaceIdx] === undefined) {
            let wk = new Array<WorkspaceMonitorSettings>(activeMonitors().length);
            wk.fill({ current: 0 });
            this.layouts.workspaces[workspaceIdx] = wk;
        }
        return this.layouts.workspaces[workspaceIdx];
    }

    private getWorkspaceMonitorCurrentLayoutOrDefault(workspaceIdx: number, monitorIdx: number): number {
        let workspaceMonitorSettings = this.getWorkspaceMonitorSettings(workspaceIdx);
        return workspaceMonitorSettings[monitorIdx]
            ? workspaceMonitorSettings[monitorIdx].current
            : 0;
    }

    private trySetWorkspaceMonitorLayout(workspaceIdx: number, monitorIdx: number, currentLayout: number) {
        let workspaceMonitorSettings = this.getWorkspaceMonitorSettings(workspaceIdx);
        if (workspaceMonitorSettings[monitorIdx]) {
            workspaceMonitorSettings[monitorIdx].current = currentLayout;
        }
    }

    reloadMenu() {
        if (launcher == null) return;
        launcher.menu.removeAll();
        let resetLayoutButton = new PopupMenu.PopupMenuItem(_("Reset Layout"));
        let editLayoutButton = new PopupMenu.PopupMenuItem(_("Edit Layout"));
        let saveLayoutButton = new PopupMenu.PopupMenuItem(_("Save Layout"));
        let cancelEditingButton = new PopupMenu.PopupMenuItem(_("Cancel Editing"));
        let newLayoutButton = new PopupMenu.PopupMenuItem(_("Create New Layout"));

        const currentMonitorLayoutIdx = this.currentLayoutIdxPerMonitor[getCurrentMonitorIndex()];
        const currentLayout = this.layouts.definitions[currentMonitorLayoutIdx];
        let renameLayoutButton = new PopupMenu.PopupMenuItem(_("Rename: " + currentLayout.name));

        let currentMonitorIndex = getCurrentMonitorIndex();
        if (this.editor[currentMonitorIndex] != null) {
            launcher.menu.addMenuItem(resetLayoutButton);
            launcher.menu.addMenuItem(saveLayoutButton);
            launcher.menu.addMenuItem(cancelEditingButton);
        } else {
            const monitorsCount = activeMonitors().length;
            for (let mI = 0; mI < monitorsCount; mI++) {
                if (monitorsCount > 1) {
                    let monitorName = new PopupMenu.PopupSubMenuMenuItem(_(`Monitor ${mI}`));
                    launcher.menu.addMenuItem(monitorName);

                    this.createLayoutMenuItems(mI).forEach(i =>
                        (<any>monitorName).menu.addMenuItem(i));
                } else {
                    this.createLayoutMenuItems(mI).forEach(i =>
                        launcher?.menu.addMenuItem(i));
                }
            }

            let sep = new PopupMenu.PopupSeparatorMenuItem();
            launcher.menu.addMenuItem(sep);
            launcher.menu.addMenuItem(editLayoutButton);
            launcher.menu.addMenuItem(renameLayoutButton);
            launcher.menu.addMenuItem(newLayoutButton);

            // Add an entry-point for more settings
            launcher.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const settingsButton = launcher.menu.addAction('Settings',
                () => ExtensionUtils.openPrefs());
            launcher.menu.addMenuItem(settingsButton);
        }


        renameLayoutButton.connect('activate', () => {
            const currentMonitorLayoutIdx = this.currentLayoutIdxPerMonitor[getCurrentMonitorIndex()];
            const currentMonitorLayout = this.layouts.definitions[currentMonitorLayoutIdx];
            let dialog = new EntryDialog({
                label: "test"
            });
            dialog.label.text = "Rename Layout " + currentMonitorLayout.name;
            dialog.entry.text = currentMonitorLayout.name;
            dialog.onOkay = (text: string) => {
                currentMonitorLayout.name = text;
                this.saveLayouts();
                this.reloadMenu();
            }
            dialog.open(global.get_current_time());
        });

        newLayoutButton.connect('activate', () => {
            let dialog = new EntryDialog();
            dialog.label.text = "Create New Layout";
            dialog.onOkay = (text: string) => {
                this.layouts.definitions.push({
                    name: text,
                    type: 0,
                    length: 100,
                    items: [
                        {
                            type: 0,
                            length: 100,
                            items: []
                        }
                    ]
                });
                this.setLayout(this.layouts.definitions.length - 1);
                this.saveLayouts();
                this.reloadMenu();
            }
            dialog.open(global.get_current_time());
        });

        editLayoutButton.connect('activate', () => {
            activeMonitors().forEach(m => {
                const currentMonitorLayoutIdx = this.currentLayoutIdxPerMonitor[m.index];
                const currentMonitorLayout = this.layouts.definitions[currentMonitorLayoutIdx];
                const editLayout = cloneLayout(currentMonitorLayout);

                this.editor[m.index]?.destroy();
                this.editor[m.index] = new ZoneEditor(activeMonitors()[m.index], editLayout, gridSettings[SETTINGS.WINDOW_MARGIN]);
                this.editor[m.index]?.init();
                this.editor[m.index]?.show();
            });

            var windows = WorkspaceManager.get_active_workspace().list_windows();
            for (let i = 0; i < windows.length; i++) {
                windows[i].minimize();
            }
            this.reloadMenu();
        });

        saveLayoutButton.connect('activate', () => {
            this.saveLayouts();
            this.setToCurrentWorkspace();
            this.reloadMenu();
        });

        resetLayoutButton.connect('activate', () => {
            activeMonitors().forEach(m => {
                let editor = this.editor[m.index];
                if (editor) {
                    editor.destroy();
                    editor.layoutItem = {
                        type: 0,
                        length: 100,
                        items: [
                            {
                                type: 0,
                                length: 100,
                                items: [],
                            }
                        ]
                    }
                    editor.applyLayout(editor);
                    this.reloadMenu();
                }
            });
        });

        cancelEditingButton.connect('activate', () => {
            activeMonitors().forEach(m => {
                this.editor[m.index]?.destroy();
                this.editor[m.index] = null;
            });

            var windows = WorkspaceManager.get_active_workspace().list_windows();
            for (let i = 0; i < windows.length; i++) {
                windows[i].unminimize();
            }
            this.reloadMenu();
        });
    }

    createLayoutMenuItems(monitorIndex: number): Array<any> {
        let items = [];
        for (let i = 0; i < this.layouts.definitions.length; i++) {
            let item = new PopupMenu.PopupMenuItem(_(this.layouts.definitions[i].name == null ? "Layout " + i : this.layouts.definitions[i].name));
            item.connect('activate', () => {
                this.setLayout(i, monitorIndex);
                this.hideLayoutPreview();
            });
            item.actor.connect('enter-event', () => {
                this.showLayoutPreview(monitorIndex, this.layouts.definitions[i]);
            });
            item.actor.connect('leave-event', () => {
                this.hideLayoutPreview();
            });
            items.push(item);
        }
        return items;
    }

    saveLayouts() {
        activeMonitors().forEach(m => {
            const idx = this.currentLayoutIdxPerMonitor[m.index];
            const editor = this.editor[m.index];
            if (editor) {
                if (editor.layout) {
                    this.layouts.definitions[idx] = editor.layout;
                }
                editor.apply();
                editor.destroy();
            }
            this.editor[m.index] = null;
        });

        this.layoutsUtils.saveSettings(this.layouts);

        var windows = WorkspaceManager.get_active_workspace().list_windows();
        for (let i = 0; i < windows.length; i++) {
            windows[i].unminimize();
        }
    }

    disable() {
        log("Extension disable begin");
        enabled = false;
        this.modifiersManager.destroy();
        this.preview?.forEach(p => { p?.destroy(); p = null });
        this.editor?.forEach(e => { e?.destroy(); e = null; });
        this.tabManager?.forEach(t => { t?.destroy(); t = null });

        if (this.workspaceSwitchedConnect) {
            WorkspaceManager.disconnect(this.workspaceSwitchedConnect);
            this.workspaceSwitchedConnect = false;
        }
        if (this.restackConnection) {
            global.display.disconnect(this.restackConnection);
            this.restackConnection = false;
        }
        if (monitorsChangedConnect) {
            log("Disconnecting monitors-changed");
            Main.layoutManager.disconnect(monitorsChangedConnect);
            monitorsChangedConnect = false;
        }

        if (this.workareasChangedConnect) {
            global.display.disconnect(this.workareasChangedConnect);
            this.workareasChangedConnect = false;
        }

        unbindHotkeys(keyBindings);
        unbindHotkeys(key_bindings_presets);
        unbindHotkeys(keyBindingGlobalResizes);

        launcher?.destroy();
        launcher = null;
    }


    /**
     * onFocus is called when the global focus changes.
     */
    onFocus() { }

    showMenu() { }

    private setToCurrentWorkspace() {
        let currentWorkspaceIdx = WorkspaceManager.get_active_workspace().index();
        activeMonitors().forEach(m => {
            let currentLayoutIdx = this.getWorkspaceMonitorCurrentLayoutOrDefault(currentWorkspaceIdx, m.index);
            this.setLayout(currentLayoutIdx, m.index);
        });
    }
}

const globalApp = new App();

class GSnapStatusButtonClass extends PanelMenu.Button {
    _init() {
        super._init(0.0, "gSnap", false);

        this._icon = new St.Icon({ style_class: 'tiling-icon' });
        this._icon.gicon = Gio.icon_new_for_string(`${Me.path}/images/tray.svg`);
        this.add_actor(this._icon);
        this.connect('button-press-event', this._onButtonPress);
        log("GSnapStatusButton _init done");
    }


    _onButtonPress(_actor: any, _event: any) {
        log(`_onButtonPress Click Toggle Status on system panel ${this}`);
        globalApp.showMenu();
    }
}

const GSnapStatusButton = GObject.registerClass({
    GTypeName: 'GSnapStatusButton',
}, GSnapStatusButtonClass
);

function changed_settings() {
    log("changed_settings");
    if (enabled) {
        disable();
        enable();
    }
    log("changed_settings complete");
}

export function enable() {
    initSettings(changed_settings);
    log("Extension enable begin");
    SHELL_VERSION.print_version();

    globalApp.enable();
}

export function disable() {
    deinitSettings();
    globalApp.disable();
}
