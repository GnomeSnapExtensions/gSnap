// GJS import system
declare var global: any;
// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import St from 'gi://St';
// @ts-ignore
import GObject from 'gi://GObject';
// @ts-ignore
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
// @ts-ignore
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
// @ts-ignore
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
// @ts-ignore
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { log } from './logging';
import { ShellVersion } from './shellversion';
import { bind as bindHotkeys, unbind as unbindHotkeys, Bindings } from './hotkeys';
import { ZoneEditor, ZonePreview, TabbedZoneManager, EntryDialog, ZoneManager } from "./editor";

import {
    Display,
    MetaSizeChange,
    Rectangle,
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
    SettingsObject,
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

// Getter for accesing "get_active_workspace" on GNOME <=2.28 and >= 2.30
const WorkspaceManager: WorkspaceManagerInterface = (
    global.screen || global.workspace_manager);

let enabled = false;
let monitorsChangedConnect: any = false;
const trackedWindows: Window[] = global.trackedWindows = [];

const SHELL_VERSION = ShellVersion.defaultVersion();

enum MoveDirection {
    Up,
    Down,
    Left,
    Right
}

export default class App extends Extension {
    private metadata: any;
    private settings: SettingsObject | null = null;
    private indicator: PanelMenu.Button;
    private editor: (ZoneEditor | null)[];
    private preview: (ZonePreview | null)[];
    private tabManager: (ZoneManager | null)[];
    private modifiersManager: ModifiersManager;
    private layoutsUtils: LayoutsUtils;
    private isGrabbing: boolean = false;
    private minimizedWindows: Window[];

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


    private keyBindings: Bindings = new Map([
        [SETTINGS.MOVE_FOCUSED_UP, () => {
            this.moveFocusedWindow(MoveDirection.Up)
        }],
        [SETTINGS.MOVE_FOCUSED_DOWN, () => {
            this.moveFocusedWindow(MoveDirection.Down)
        }],
        [SETTINGS.MOVE_FOCUSED_LEFT, () => {
            this.moveFocusedWindow(MoveDirection.Left)
        }],
        [SETTINGS.MOVE_FOCUSED_RIGHT, () => {
            this.moveFocusedWindow(MoveDirection.Right)
        }],
    ]);
    
    private key_bindings_presets: Bindings = new Map([
        [SETTINGS.PRESET_RESIZE_1, () => {
            this.setLayout(0);
        }],
        [SETTINGS.PRESET_RESIZE_2, () => {
            this.setLayout(1);
        }],
        [SETTINGS.PRESET_RESIZE_3, () => {
            this.setLayout(2);
        }],
        [SETTINGS.PRESET_RESIZE_4, () => {
            this.setLayout(3);
        }],
        [SETTINGS.PRESET_RESIZE_5, () => {
            this.setLayout(4);
        }],
        [SETTINGS.PRESET_RESIZE_6, () => {
            this.setLayout(5);
        }],
        [SETTINGS.PRESET_RESIZE_7, () => {
            this.setLayout(6);
        }],
        [SETTINGS.PRESET_RESIZE_8, () => {
            this.setLayout(7);
        }],
        [SETTINGS.PRESET_RESIZE_9, () => {
            this.setLayout(8);
        }],
        [SETTINGS.PRESET_RESIZE_10, () => {
            this.setLayout(9);
        }],
        [SETTINGS.PRESET_RESIZE_11, () => {
            this.setLayout(10);
        }],
        [SETTINGS.PRESET_RESIZE_12, () => {
            this.setLayout(11);
        }],
        [SETTINGS.PRESET_RESIZE_13, () => {
            this.setLayout(12);
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
    
    private keyBindingGlobalResizes: Bindings = new Map([
    
    ]);

    constructor(metadata: any) {
        super(metadata);
        const monitors = activeMonitors().length;
        this.editor = new Array<ZoneEditor>(monitors);
        this.preview = new Array<ZonePreview>(monitors);
        this.tabManager = new Array<ZoneManager>(monitors);
        this.currentLayoutIdxPerMonitor = new Array<number>(monitors);
        this.modifiersManager = new ModifiersManager();
        this.layoutsUtils = new LayoutsUtils(super.path);
        this.minimizedWindows = new Array<Window>();
        this.metadata = metadata;
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
        
        const animationsEnabled = getBoolSetting(SETTINGS.ANIMATIONS_ENABLED);

        if (gridSettings[SETTINGS.SHOW_TABS]) {
            this.tabManager[monitorIndex] = new TabbedZoneManager(activeMonitors()[monitorIndex], this.layouts.definitions[layoutIndex], gridSettings[SETTINGS.WINDOW_MARGIN], animationsEnabled);
        } else {
            this.tabManager[monitorIndex] = new ZoneManager(activeMonitors()[monitorIndex], this.layouts.definitions[layoutIndex], gridSettings[SETTINGS.WINDOW_MARGIN], animationsEnabled);
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

    /** Returns true if the settings allow to span multiple zones and 
     *  the user is holding ALT. The user must enable it in the settings
     *  and it is not possible to span multiple zones in "tab" mode */
    canSpanMultipleZones() {
        return !getBoolSetting(SETTINGS.SHOW_TABS) &&
                getBoolSetting(SETTINGS.SPAN_MULTIPLE_ZONES) &&
                this.modifiersManager.isHolding(MODIFIERS_ENUM.ALT);
    }

    enable() {
        this.settings = super.getSettings() as SettingsObject;
        initSettings(this.settings, this.changed_settings);
        log("Extension enable begin");
        SHELL_VERSION.print_version();

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

            const spanMultipleZones = this.canSpanMultipleZones();

            const useModifier = getBoolSetting(SETTINGS.USE_MODIFIER);
            this.isGrabbing = true;

            if (useModifier &&
                !this.modifiersManager.isHolding(MODIFIERS_ENUM.CONTROL))
                return;
            
            activeMonitors().forEach(m => {
                this.tabManager[m.index]?.allow_multiple_zones_selection(spanMultipleZones);
                this.tabManager[m.index]?.show();
            });
        });

        global.display.connect('grab-op-end', (_display: Display, win: Window) => {
            const useModifier = getBoolSetting(SETTINGS.USE_MODIFIER);
            this.isGrabbing = false;

            if (!validWindow(win)) {
                return;
            }

            let selection: Rectangle | undefined;
            activeMonitors().forEach(m => {
                if (!useModifier || this.modifiersManager.isHolding(MODIFIERS_ENUM.CONTROL)) {
                    if (!trackedWindows.includes(win)) {
                        trackedWindows.push(win);
                    }
                    
                    if (!selection) { // ensure window is moved one time only
                        selection = this.tabManager[m.index]?.getSelectionRect();
                        // may be undefined if there are no zones selected in this monitor
                        if (selection) {
                            this.moveWindow(win, selection.x, selection.y, selection.width, selection.height);
                        }
                    }
                    
                    this.tabManager[m.index]?.hide(); // hide zones after the window was moved
                    this.tabManager[m.index]?.layoutWindows();
                    return;
                }

                this.tabManager[m.index]?.hide();
                if (useModifier && !this.modifiersManager.isHolding(MODIFIERS_ENUM.CONTROL) && trackedWindows.includes(win)) {
                    trackedWindows.splice(trackedWindows.indexOf(win), 1);
                }
            });
        });

        if (getBoolSetting(SETTINGS.USE_MODIFIER) || getBoolSetting(SETTINGS.SPAN_MULTIPLE_ZONES)) {
            // callback run when a modifier change state (e.g from not pressed to pressed)
            this.modifiersManager.connect("changed", () => {
                if (!this.isGrabbing) {
                    return;
                }

                const spanMultipleZones = getBoolSetting(SETTINGS.SPAN_MULTIPLE_ZONES);
                if (spanMultipleZones) {
                    const allow_multiple_selections = this.canSpanMultipleZones();
                    activeMonitors().forEach(m => {
                        this.tabManager[m.index]?.allow_multiple_zones_selection(allow_multiple_selections);
                    });
                }

                if (!getBoolSetting(SETTINGS.USE_MODIFIER)) return;

                if (this.modifiersManager.isHolding(MODIFIERS_ENUM.CONTROL)) {
                    activeMonitors().forEach(m => {
                        this.tabManager[m.index]?.show()
                    });
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

        this.createIndicator()

        bindHotkeys(this.keyBindings, this.settings);
        if (gridSettings[SETTINGS.GLOBAL_PRESETS]) {
            bindHotkeys(this.key_bindings_presets, this.settings);
        }
        if (gridSettings[SETTINGS.MOVERESIZE_ENABLED]) {
            bindHotkeys(this.keyBindingGlobalResizes, this.settings);
        }

        this.modifiersManager.enable();

        enabled = true;

        log("Extension enable completed");
    }

    changed_settings() {
        log("changed_settings");
        if (enabled) {
            this.disable();
            this.enable();
        }
        log("changed_settings complete");
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
            if (!trackedWindows.includes(focusedWindow)) {
                trackedWindows.push(focusedWindow);
            }
        }

        let zoneManager = this.tabManager[monitorIndex];
        if (!zoneManager) return;

        let frameRect = focusedWindow.get_frame_rect();
        // get window center position
        let x = frameRect.x + (frameRect.width / 2);
        let y = frameRect.y + (frameRect.height / 2);

        // add/remove 2 to avoid zone not being recognized due to rounding errors
        switch (direction) {
            case MoveDirection.Up:
                y = frameRect.y - (2 + zoneManager.margin);
                break;
            case MoveDirection.Down:
                y = frameRect.y + frameRect.height + (2 + zoneManager.margin);
                break;
            case MoveDirection.Left:
                x = frameRect.x - (2 + zoneManager.margin);
                break;
            case MoveDirection.Right:
                x = frameRect.x + frameRect.width + (2 + zoneManager.margin);
                break;
        }

        let layoutZones = zoneManager.recursiveChildren();
        for (let i = 0; i < layoutZones.length; i++) {
            let zone = layoutZones[i];
            log(`Zone: ${zone.x}/${zone.y}/${zone.width}/${zone.height} contains: ${x}, ${y}`);
            if (zone.contains(x, y)) {
                this.moveWindow(focusedWindow, zone.innerX, zone.innerY, zone.innerWidth, zone.innerHeight);
                this.tabManager[monitorIndex]?.layoutWindows();
                return;
            }
        }

    }

    private moveWindow(window: Window, x: number, y: number, width: number, height: number) {
        log(`moveWindow moving to x:${x}, y:${y}`);
        if (getBoolSetting(SETTINGS.ANIMATIONS_ENABLED)) {
            const windowActor = window.get_compositor_private();
            windowActor.remove_all_transitions();
            Main.wm._prepareAnimationInfo(
                global.window_manager,
                windowActor,
                window.get_frame_rect().copy(),
                MetaSizeChange.MAXIMIZE
            );
        }
        window.move_frame(true, x, y);
        window.move_resize_frame(true, x, y, width, height);
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

    minimizeAllWindows() {
        // we need to know what windows have been minimized by the user
        // so we don't accidentally restore them when calling unminimizeAllWindows()
        this.minimizedWindows = WorkspaceManager
            .get_active_workspace()
            .list_windows()
            .filter(x => !x.minimized);
        this.minimizedWindows.forEach(w => w.minimize());
    }

    unminimizeAllWindows() {
        this.minimizedWindows.forEach(w => w.unminimize());
        this.minimizedWindows = [];
    }

    createIndicator() {
        this.indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
        this.indicator.label = "Layouts";
        let icon = new St.Icon({ style_class: 'tiling-icon' });
        icon.gicon = Gio.icon_new_for_string(`${super.path}/images/tray.svg`);
        this.indicator.add_child(icon);

        if (gridSettings[SETTINGS.SHOW_ICON]) {
            Main.panel.addToStatusArea("GSnapStatusButton", this.indicator);
            this.reloadMenu();
        }
    }

    reloadMenu() {
        if (this.indicator == null) return;
        this.indicator.menu.removeAll();
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
            this.indicator.menu.addMenuItem(resetLayoutButton);
            this.indicator.menu.addMenuItem(saveLayoutButton);
            this.indicator.menu.addMenuItem(cancelEditingButton);
        } else {
            const monitorsCount = activeMonitors().length;
            for (let mI = 0; mI < monitorsCount; mI++) {
                if (monitorsCount > 1) {
                    let monitorName = new PopupMenu.PopupSubMenuMenuItem(_(`Monitor ${mI}`));
                    this.indicator.menu.addMenuItem(monitorName);

                    this.createLayoutMenuItems(mI).forEach(i =>
                        (<any>monitorName).menu.addMenuItem(i));
                } else {
                    this.createLayoutMenuItems(mI).forEach(i =>
                        this.indicator?.menu.addMenuItem(i));
                }
            }

            let sep = new PopupMenu.PopupSeparatorMenuItem();
            this.indicator.menu.addMenuItem(sep);
            this.indicator.menu.addMenuItem(editLayoutButton);
            this.indicator.menu.addMenuItem(renameLayoutButton);
            this.indicator.menu.addMenuItem(newLayoutButton);

            // Add an entry-point for more settings
            this.indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const settingsButton = this.indicator.menu.addAction('Settings',
                () => super.openPreferences());
            this.indicator.menu.addMenuItem(settingsButton);
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

            this.minimizeAllWindows();
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

            this.unminimizeAllWindows();
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
        this.unminimizeAllWindows();
    }

    disable() {
        log("Extension disable begin");
        deinitSettings();
        this.settings = null;
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

        unbindHotkeys(this.keyBindings);
        unbindHotkeys(this.key_bindings_presets);
        unbindHotkeys(this.keyBindingGlobalResizes);

        this.indicator?.destroy();
        this.indicator = null;
    }


    /**
     * onFocus is called when the global focus changes.
     */
    onFocus() { }

    private setToCurrentWorkspace() {
        let currentWorkspaceIdx = WorkspaceManager.get_active_workspace().index();
        activeMonitors().forEach(m => {
            let currentLayoutIdx = this.getWorkspaceMonitorCurrentLayoutOrDefault(currentWorkspaceIdx, m.index);
            this.setLayout(currentLayoutIdx, m.index);
        });
    }
}
