// GJS import system
declare var imports: any;
declare var global: any;
import {log, setLoggingEnabled} from './logging';
import {ShellVersion} from './shellversion';
import {bind as bindHotkeys, unbind as unbindHotkeys, Bindings} from './hotkeys';
import {snapToNeighbors} from './snaptoneighbors';
import * as tilespec from "./tilespec";
import {ZoneEditor, ZoneDisplay, ZonePreview, TabbedZoneManager, EntryDialog, ZoneManager} from "./editor";

const Gettext = imports.gettext;
const _ = Gettext.gettext;
import {
    StBoxLayout,
    ClutterActor,
    GridLayout,
    LayoutManager,
    MetaWindow,
    ShellApp,
    ShellWindowTracker,
    StBin,
    StButton,
    StLabel,
    StWidget,
    Window,
    WindowType,
    WorkspaceManager as WorkspaceManagerInterface
} from "./gnometypes";

import { 
    activeMonitors,
    getCurrentMonitorIndex,
    Monitor,
    workAreaRectByMonitorIndex
} from './monitors';

import { 
    deinitSettings, 
    gridSettings, 
    initSettings, 
    SETTINGS_GLOBAL_PRESETS, 
    SETTINGS_MOVERESIZE_ENABLED, 
    SETTINGS_SHOW_ICON,
    SETTINGS_SHOW_TABS,
    SETTINGS_WINDOW_MARGIN
} from './settings';

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
const St = imports.gi.St;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;
const Signals = imports.signals;
const Workspace = imports.ui.workspace;
const GLib = imports.gi.GLib;


// Getter for accesing "get_active_workspace" on GNOME <=2.28 and >= 2.30
const WorkspaceManager: WorkspaceManagerInterface = (
    global.screen || global.workspace_manager);

let launcher: GSnapStatusButtonInterface | null;
let tracker: ShellWindowTracker;
let focusMetaWindow: Window | null = null;
let focusConnect: any = false;

let keyControlBound: any = false;
let enabled = false;
let monitorsChangedConnect: any = false;

const SHELL_VERSION = ShellVersion.defaultVersion();

function getCurrentPath() {
    let stack = new Error().stack.split('\n');
    let extensionStackLine;

    // Search for an occurrence of an extension stack frame
    // Start at 1 because 0 is the stack frame of this function
    for (let i = 1; i < stack.length; i++) {
        if (stack[i].includes('/gnome-shell/extensions/')) {
            extensionStackLine = stack[i];
            break;
        }
    }
    if (!extensionStackLine)
        return null;

    // The stack line is like:
    //   init([object Object])@/home/user/data/gnome-shell/extensions/u@u.id/prefs.js:8
    //
    // In the case that we're importing from
    // module scope, the first field is blank:
    //   @/home/user/data/gnome-shell/extensions/u@u.id/prefs.js:8
    let match = new RegExp('@(.+):\\d+').exec(extensionStackLine);
    if (!match)
        return null;

    // local import, as the module is used from outside the gnome-shell process
    // as well (not this function though)
    let extensionManager = imports.ui.main.extensionManager;

    let path = match[1];
    return path.split(":")[0];
}

interface ResizeActionInfo {
    variantIndex: number;
    lastCallTime: Date;
    presetName: string;
    windowTitle: string;
};

const lastResizeInfo: ResizeActionInfo = {
    variantIndex: 0,
    lastCallTime: new Date(), // now
    presetName: '',
    windowTitle: '',
};

// Hangouts workaround
let excludedApplications = new Array(
    "Unknown"
);

const keyBindings: Bindings = new Map([
    ['show-toggle-tiling', () => {

    }],
    ['show-toggle-tiling-alt', () => {

    }],
]);

const key_bindings_tiling: Bindings = new Map([
    ['move-left', () => {

    }],
    ['move-right', () => {

    }],
    ['move-up', () => {

    }],
    ['move-down', () => {

    }],
    ['resize-left', () => {

    }],
    ['resize-right', () => {

    }],
    ['resize-up', () => {

    }],
    ['resize-down', () => {

    }],
    ['move-left-vi', () => {

    }],
    ['move-right-vi', () => {

    }],
    ['move-up-vi', () => {

    }],
    ['move-down-vi', () => {

    }],
    ['resize-left-vi', () => {

    }],
    ['resize-right-vi', () => {

    }],
    ['resize-up-vi', () => {

    }],
    ['resize-down-vi', () => {

    }],
    ['cancel-tiling', () => {
        keyCancelTiling();
    }],
    ['set-tiling', () => {

    }],
    ['change-grid-size', () => {

    }],
    ['autotile-main', () => {

    }],
    ['autotile-1', () => {

    }],
    ['autotile-2', () => {

    }],
    ['autotile-3', () => {

    }],
    ['autotile-4', () => {

    }],
    ['autotile-5', () => {

    }],
    ['autotile-6', () => {

    }],
    ['autotile-7', () => {

    }],
    ['autotile-8', () => {

    }],
    ['autotile-9', () => {

    }],
    ['autotile-10', () => {

    }],
    ['snap-to-neighbors', () => {
        snapToNeighborsBind();
    }],
    ['show-areas-bind', () => {

    }],
    ['hide-areas-bind', () => {

    }]
]);

const key_bindings_presets: Bindings = new Map([
    ['preset-resize-1', () => {
        globalApp.setLayout(0);
    }],
    ['preset-resize-2', () => {
        globalApp.setLayout(1);
    }],
    ['preset-resize-3', () => {
        globalApp.setLayout(2);
    }],
    ['preset-resize-4', () => {
        globalApp.setLayout(3);
    }],
    ['preset-resize-5', () => {
        globalApp.setLayout(4);
    }],
    ['preset-resize-6', () => {
        globalApp.setLayout(5);
    }],
    ['preset-resize-7', () => {
        globalApp.setLayout(6);
    }],
    ['preset-resize-8', () => {
        globalApp.setLayout(7);
    }],
    ['preset-resize-9', () => {
        globalApp.setLayout(8);
    }],
    ['preset-resize-10', () => {
        globalApp.setLayout(9);
    }],
    ['preset-resize-11', () => {
        globalApp.setLayout(10);
    }],
    ['preset-resize-12', () => {
        globalApp.setLayout(11);
    }],
    ['preset-resize-13', () => {
        globalApp.setLayout(12);
    }],
    ['preset-resize-14', () => {

    }],
    ['preset-resize-15', () => {

    }],
    ['preset-resize-16', () => {

    }],
    ['preset-resize-17', () => {

    }],
    ['preset-resize-18', () => {

    }],
    ['preset-resize-19', () => {

    }],
    ['preset-resize-20', () => {

    }],
    ['preset-resize-21', () => {

    }],
    ['preset-resize-22', () => {

    }],
    ['preset-resize-23', () => {

    }],
    ['preset-resize-24', () => {

    }],
    ['preset-resize-25', () => {

    }],
    ['preset-resize-26', () => {

    }],
    ['preset-resize-27', () => {

    }],
    ['preset-resize-28', () => {

    }],
    ['preset-resize-29', () => {

    }],
    ['preset-resize-30', () => {

    }],
]);

const keyBindingGlobalResizes: Bindings = new Map([
    ['action-change-tiling', () => {

    }],
    ['action-contract-bottom', () => {

    }],
    ['action-contract-left', () => {

    }],
    ['action-contract-right', () => {

    }],
    ['action-contract-top', () => {

    }],
    ['action-expand-bottom', () => {

    }],
    ['action-expand-left', () => {

    }],
    ['action-expand-right', () => {

    }],
    ['action-expand-top', () => {

    }],
    ['action-move-down', () => {

    }],
    ['action-move-left', () => {

    }],
    ['action-move-right', () => {

    }],
    ['action-move-up', () => {

    }],
    ['action-move-next-monitor', () => {
        moveWindowToNextMonitor();
    }],
]);

interface WorkspaceMonitorSettings {
    current: number
};

interface ZoneDefinition {
    length: number
};

interface LayoutDefinition {
    type: number,
    name: string,
    length: number,
    items: ZoneDefinition[]
};

interface Layouts {
    workspaces: WorkspaceMonitorSettings[][],
    definitions: LayoutDefinition[]
};

class App {
    private gridShowing: boolean = false;
    private widgets: StWidget[] = [];
    private layoutsFile: any[] = [];
    private editor: (ZoneEditor | null)[];
    private preview: (ZonePreview | null)[];
    private tabManager: (ZoneManager | null)[];

    private currentLayout: any = null;
    public layouts : Layouts = {
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
                    {length: 42},
                    {length: 42}
                ]
            },
        ]
    };

    constructor() {
        const monitors = activeMonitors().length;
        this.editor = new Array<ZoneEditor>(monitors);
        this.preview = new Array<ZonePreview>(monitors);
        this.tabManager = new Array<ZoneManager>(monitors);
    }
    
    private _monitorsChangedId: any;
    private restackConnection: any;
    private workspaceSwitchedConnect: any;
    private workareasChangedConnect: any;

    setLayout(layoutIndex: number, monitorIndex = -1) {
        if (this.layouts.definitions.length <= layoutIndex) {
            return;
        }
        
        this.currentLayout = this.layouts.definitions[layoutIndex];
        if (this.layouts.workspaces == null) {
            this.layouts.workspaces = [];
        }

        if(monitorIndex === -1 ) {
            monitorIndex = getCurrentMonitorIndex();
        }

        let workspaceIndex = WorkspaceManager.get_active_workspace().index();
        while(this.layouts.workspaces.length < workspaceIndex) {
            let wk = new Array<WorkspaceMonitorSettings>(activeMonitors().length);
            wk.fill({ current: layoutIndex });
            this.layouts.workspaces.push(wk);
        }

        this.layouts.workspaces[workspaceIndex][monitorIndex].current = layoutIndex;
        this.saveLayouts();
        
        this.tabManager[monitorIndex]?.destroy();
        this.tabManager[monitorIndex] = null;

        if (gridSettings[SETTINGS_SHOW_TABS]) {
            this.tabManager[monitorIndex] = new TabbedZoneManager(activeMonitors()[monitorIndex], this.currentLayout, gridSettings[SETTINGS_WINDOW_MARGIN]);
        } else {
            this.tabManager[monitorIndex] = new ZoneManager(activeMonitors()[monitorIndex], this.currentLayout, gridSettings[SETTINGS_WINDOW_MARGIN]);
        }
       
        this.tabManager[monitorIndex]?.layoutWindows();
        this.reloadMenu();
    }

    showLayoutPreview(monitorIndex: number, layout: LayoutDefinition) {
        this.preview[monitorIndex]?.destroy();
        this.preview[monitorIndex] = null;

        this.preview[monitorIndex] = new ZonePreview(activeMonitors()[monitorIndex], layout, gridSettings[SETTINGS_WINDOW_MARGIN]);
    }

    hideLayoutPreview() {
        activeMonitors().forEach(monitor => {
            this.preview[monitor.index]?.destroy();
            this.preview[monitor.index] = null;
        });
    }

    enable() {
        let file_info = getCurrentPath();
        this.gridShowing = false;
        tracker = Shell.WindowTracker.get_default();

        try {


            let [ok, contents] = GLib.file_get_contents(getCurrentPath().replace("/extension.js", "/layouts.json"));
            if (ok) {
                log("Loaded contents " + contents);
                this.layouts = JSON.parse(contents);
                log(JSON.stringify(this.layouts));
            }
        } catch (exception) {
            log(JSON.stringify(exception));
            let [ok, contents] = GLib.file_get_contents(getCurrentPath().replace("/extension.js", "/layouts-default.json"));
            if (ok) {
                this.layouts = JSON.parse(contents);
                this.saveLayouts();
            }
        }


        this.setToCurrentWorkspace();
        monitorsChangedConnect = Main.layoutManager.connect(
            'monitors-changed', () => {
                activeMonitors().forEach(m => {
                    this.tabManager[m.index]?.layoutWindows();
                });
                this.reloadMenu();
            });

        function validWindow(window: Window): boolean {
            return window != null
                && window.get_window_type() == WindowType.NORMAL;
        }

        //var display = getFocusWindow().get_display();
        global.display.connect('window-created', (_display, win, op) => {
            if(validWindow(win)) {
                activeMonitors().forEach(m => {
                    this.tabManager[m.index]?.layoutWindows();
                });
            }
        });
        
        global.display.connect('in-fullscreen-changed', (_display, win, op) => {
            if (global.display.get_monitor_in_fullscreen(0)) {
                activeMonitors().forEach(m => {
                    this.tabManager[m.index]?.destroy();
                    this.tabManager[m.index] = null;
                });
            } else {
                this.setToCurrentWorkspace();
            }
            
        });
        //in-fullscreen-changed
        global.display.connect('grab-op-begin', (_display, win, op) => {
            if(validWindow(win)) {
                // if (this.preview) {
                //     this.preview.destroy();
                //     this.preview = null;
                // }
                // this.preview = new ZonePreview(this.currentLayout, gridSettings[SETTINGS_WINDOW_MARGIN]);
                activeMonitors().forEach(m => {
                    this.tabManager[m.index]?.show();
                });
            }

        });


        global.display.connect('grab-op-end', (_display, win, op) => {
            if(validWindow(win)) {
                activeMonitors().forEach(m => {
                    this.tabManager[m.index]?.hide();
                    this.tabManager[m.index]?.moveWindowToWidgetAtCursor(win);
                    this.tabManager[m.index]?.layoutWindows();
                });
            }
        });
        this.restackConnection = global.display.connect('restacked', () => {
            activeMonitors().forEach(m => {
                this.tabManager[m.index]?.layoutWindows();
            });
        });
        this.workspaceSwitchedConnect = WorkspaceManager.connect('workspace-switched', () => {
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
        launcher = new GSnapStatusButton('tiling-icon');
        (<any>launcher).label = "Layouts";
        if (gridSettings[SETTINGS_SHOW_ICON]) {
            Main.panel.addToStatusArea("GSnapStatusButton", launcher);
            this.reloadMenu();
        }


        bindHotkeys(keyBindings);
        if (gridSettings[SETTINGS_GLOBAL_PRESETS]) {
            bindHotkeys(key_bindings_presets);
        }
        if (gridSettings[SETTINGS_MOVERESIZE_ENABLED]) {
            bindHotkeys(keyBindingGlobalResizes);
        }

        enabled = true;

        log("Extention enable completed");


    }

    reloadMenu() {
        if (launcher == null) return;
        (<any>launcher).menu.removeAll();
        let resetLayoutButton = new PopupMenu.PopupMenuItem(_("Reset Layout"));
        let editLayoutButton = new PopupMenu.PopupMenuItem(_("Edit Layout"));
        let saveLayoutButton = new PopupMenu.PopupMenuItem(_("Save Layout"));
        let cancelEditingButton = new PopupMenu.PopupMenuItem(_("Cancel Editing"));
        let newLayoutButton = new PopupMenu.PopupMenuItem(_("Create New Layout"));

        let renameLayoutButton = new PopupMenu.PopupMenuItem(_("Rename: " + this.currentLayout.name));

        let currentMonitorIndex = getCurrentMonitorIndex();
        if (this.editor[currentMonitorIndex] != null) {
            (<any>launcher).menu.addMenuItem(resetLayoutButton);
            (<any>launcher).menu.addMenuItem(saveLayoutButton);
            (<any>launcher).menu.addMenuItem(cancelEditingButton);
        } else {
            const monitorsCount = activeMonitors().length;
            for(let mI = 0; mI < monitorsCount; mI++)
            {
                if(monitorsCount > 1) {
                    let monitorName = new PopupMenu.PopupSubMenuMenuItem(_(`Monitor ${mI}`));
                    (<any>launcher).menu.addMenuItem(monitorName);

                    this.createLayoutMenuItems(mI).forEach(i => 
                        (<any>monitorName).menu.addMenuItem(i));
                } else {
                    this.createLayoutMenuItems(mI).forEach(i =>
                        (<any>launcher).menu.addMenuItem(i));
                }
            }

            let sep = new PopupMenu.PopupSeparatorMenuItem();
            (<any>launcher).menu.addMenuItem(sep);
            (<any>launcher).menu.addMenuItem(editLayoutButton);
            (<any>launcher).menu.addMenuItem(renameLayoutButton);
            (<any>launcher).menu.addMenuItem(newLayoutButton);
        }


        renameLayoutButton.connect('activate', () => {
            let dialog = new EntryDialog({
                label: "test"
            });
            dialog.label.text = "Rename Layout " + this.currentLayout.name;
            dialog.entry.text = this.currentLayout.name;
            dialog.onOkay = (text) => {
                this.currentLayout.name = text;
                this.saveLayouts();
                this.reloadMenu();
            }
            dialog.open(global.get_current_time());

        });
        newLayoutButton.connect('activate', () => {
            let dialog = new EntryDialog();
            dialog.label.text = "Create New Layout";
            dialog.onOkay = (text) => {
                this.layouts.definitions.push({
                    name: text,
                    type: 0,
                    length: 100,
                    items: [
                        {
                            length: 100
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
                this.editor[m.index]?.destroy();
                this.editor[m.index] = new ZoneEditor(activeMonitors()[m.index], this.currentLayout, gridSettings[SETTINGS_WINDOW_MARGIN]);
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
            //(<any>launcher).menu.removeMenuItem(item2);
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
                                length: 100
                            }
                        ]
                    }
                    editor.applyLayout(editor);
                    this.reloadMenu();
                }
            //(<any>launcher).menu.removeMenuItem(item2);
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
            //(<any>launcher).menu.removeMenuItem(item2);
        });
    }

    createLayoutMenuItems(monitorIndex: number) : Array<any> {
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
            this.editor[m.index]?.apply();
            this.editor[m.index]?.destroy();
            this.editor[m.index] = null;
        });
        GLib.file_set_contents(getCurrentPath().replace("/extension.js", "/layouts.json"), JSON.stringify(this.layouts));
        log(JSON.stringify(this.layouts));

        var windows = WorkspaceManager.get_active_workspace().list_windows();
        for (let i = 0; i < windows.length; i++) {
            windows[i].unminimize();
        }

    }

    disable() {
        log("Extension disable begin");
        enabled = false;
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

        if(this.workareasChangedConnect) {
            global.display.disconnect(this.workareasChangedConnect);
            this.workareasChangedConnect = false;
        }

        unbindHotkeys(keyBindings);
        unbindHotkeys(key_bindings_presets);
        unbindHotkeys(keyBindingGlobalResizes);
        if (keyControlBound) {
            unbindHotkeys(key_bindings_tiling);
            keyControlBound = false;
        }
        launcher?.destroy();
        launcher = null;
        resetFocusMetaWindow();
    }


    /**
     * onFocus is called when the global focus changes.
     */
    onFocus() {
        log("_onFocus ");
        resetFocusMetaWindow();
        const window = getFocusApp();


    }

    showMenu() {

    }

    private setToCurrentWorkspace() {
        let currentWorkspaceIdx = WorkspaceManager.get_active_workspace().index();
        activeMonitors().forEach(m => {
            let currentLayoutIdx = this.layouts.workspaces[currentWorkspaceIdx][m.index].current;
            this.setLayout(currentLayoutIdx, m.index);
        });
    }
}

const globalApp = new App();

function changed_settings() {
    log("changed_settings");
    if (enabled) {
        disable();
        enable();
    }
    log("changed_settings complete");
}

interface GSnapStatusButtonInterface {
    activate(): void;

    deactivate(): void;

    destroy(): void;
};
const GSnapStatusButton = GObject.registerClass({
        GTypeName: 'GSnapStatusButton',
    }, class GSnapStatusButton extends PanelMenu.Button {
        _init(classname: string) {
            super._init(0.0, "gSnap", false);

            //Done by default in PanelMenuButton - Just need to override the method
            if (SHELL_VERSION.version_at_least_34()) {
                this.add_style_class_name(classname);
                this.connect('button-press-event', this._onButtonPress);
            } else {
                this.actor.add_style_class_name(classname);
                this.actor.connect('button-press-event', this._onButtonPress);
            }
            log("GSnapStatusButton _init done");
        }

        reset() {
            this.activated = false;
            if (SHELL_VERSION.version_at_least_34()) {
                this.remove_style_pseudo_class('activate');
            } else {
                this.actor.remove_style_pseudo_class('activate');
            }
        }

        activate() {
            if (SHELL_VERSION.version_at_least_34()) {
                this.add_style_pseudo_class('activate');
            } else {
                this.actor.add_style_pseudo_class('activate');
            }
        }

        deactivate() {
            if (SHELL_VERSION.version_at_least_34()) {
                this.remove_style_pseudo_class('activate');
            } else {
                this.actor.remove_style_pseudo_class('activate');
            }
        }

        _onButtonPress(actor, event) {
            log(`_onButtonPress Click Toggle Status on system panel ${this}`);
            globalApp.showMenu();
        }

        _destroy() {
            this.activated = null;
        }

    }
);

/*****************************************************************
 FUNCTIONS
 *****************************************************************/
function init() {
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

function resetFocusMetaWindow() {
    log("resetFocusMetaWindow");
    focusMetaWindow = null;
}

function reset_window(metaWindow: Window) {
    metaWindow.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
    metaWindow.unmaximize(Meta.MaximizeFlags.VERTICAL);
    metaWindow.unmaximize(Meta.MaximizeFlags.BOTH);
}

function _getInvisibleBorderPadding(metaWindow: Window) {
    let outerRect = metaWindow.get_frame_rect();
    let inputRect = metaWindow.get_buffer_rect();
    let borderX = outerRect.x - inputRect.x;
    let borderY = outerRect.y - inputRect.y;

    return [borderX, borderY];
}

function _getVisibleBorderPadding(metaWindow: Window) {
    let clientRect = metaWindow.get_frame_rect();
    let outerRect = metaWindow.get_frame_rect();

    let borderX = outerRect.width - clientRect.width
    let borderY = outerRect.height - clientRect.height;

    return [borderX, borderY];
}

function move_maximize_window(metaWindow: Window, x: number, y: number) {
    const [borderX, borderY] = _getInvisibleBorderPadding(metaWindow);

    x = x - borderX;
    y = y - borderY;


    metaWindow.move_frame(true, x, y);
    metaWindow.maximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
}

/**
 * Resizes window considering margin settings
 * @param metaWindow
 * @param x
 * @param y
 * @param width
 * @param height
 */
function moveResizeWindowWithMargins(metaWindow: Window, x: number, y: number, width: number, height: number): void {

    let [borderX, borderY] = _getInvisibleBorderPadding(metaWindow);
    let [vBorderX, vBorderY] = _getVisibleBorderPadding(metaWindow);

    log("move_resize_window_with_margins " + metaWindow.get_title() + " " + x + ":" + y + " - " + width
        + ":" + height + " margin " + gridSettings[SETTINGS_WINDOW_MARGIN] + " borders invisible " +
        borderX + ":" + borderY + " visible " + vBorderX + ":" + vBorderY);

    x = x + gridSettings[SETTINGS_WINDOW_MARGIN];
    y = y + gridSettings[SETTINGS_WINDOW_MARGIN];
    width = width - gridSettings[SETTINGS_WINDOW_MARGIN] * 2;
    height = height - gridSettings[SETTINGS_WINDOW_MARGIN] * 2;

    x = x + vBorderX;
    y = y + vBorderY;
    width = width - 2 * vBorderX;
    height = height - 2 * vBorderY;
    log("After margins and visible border window is " + x + ":" + y + " - " + width + ":" + height);

    metaWindow.move_frame(true, x, y);
    metaWindow.move_resize_frame(true, x, y, width, height);
}

function getNotFocusedWindowsOfMonitor(monitor: Monitor) {
    const monitors = activeMonitors();
    let windows = global.get_window_actors().filter(function (w) {
        let app = tracker.get_window_app(w.meta_window);

        if (app == null) {
            return false;
        }

        let appName = app.get_name();


        return !contains(excludedApplications, appName)
            && w.meta_window.get_window_type() == Meta.WindowType.NORMAL
            && w.meta_window.get_workspace() == WorkspaceManager.get_active_workspace()
            && w.meta_window.showing_on_its_workspace()
            && monitors[w.meta_window.get_monitor()] == monitor
            && focusMetaWindow != w.meta_window;
    });

    return windows;
}

function contains<T>(a: Array<T>, obj: T) {
    var i = a.length;
    while (i--) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
}

/**
 * Get focused window by iterating though the windows on the active workspace.
 * @returns {Object} The focussed window object. False if no focussed window was found.
 */
function getFocusApp(): Window | null {
    if (tracker.focus_app == null) {
        return null;
    }

    let focusedAppName = tracker.focus_app.get_name();

    if (contains(excludedApplications, focusedAppName)) {
        return null;
    }

    return WorkspaceManager.get_active_workspace().list_windows().find(
        (window: Window): boolean => window.has_focus()
    ) || null;
}

function getFocusWindow(): any {
    const focus_app = tracker.focus_app;
    if (!focus_app || excludedApplications[focus_app.get_name()]) {
        return null;
    }

    return WorkspaceManager.get_active_workspace().list_windows()
        .find(w => w.has_focus());
}

function bindKeyControls() {
    if (!keyControlBound) {
        bindHotkeys(key_bindings_tiling);
        if (focusConnect) {
            global.display.disconnect(focusConnect);
        }
        focusConnect = global.display.connect('notify::focus-window', () => globalApp.onFocus());
        if (!gridSettings[SETTINGS_GLOBAL_PRESETS]) {
            bindHotkeys(key_bindings_presets);
        }
        keyControlBound = true;
    }
}

function unbindKeyControls() {
    if (keyControlBound) {
        unbindHotkeys(key_bindings_tiling);
        if (focusConnect) {
            log("Disconnect notify:focus-window");
            global.display.disconnect(focusConnect);
            focusConnect = false;
        }
        if (!gridSettings[SETTINGS_GLOBAL_PRESETS]) {
            unbindHotkeys(key_bindings_presets);
        }
        if (!gridSettings[SETTINGS_MOVERESIZE_ENABLED]) {
            unbindHotkeys(keyBindingGlobalResizes);
        }
        keyControlBound = false;
    }
}

function keyCancelTiling() {
    log("Cancel key event");

}

// Move the window to the next monitor.
function moveWindowToNextMonitor(): void {
    log("moveWindowToNextMonitor");
    let window = getFocusWindow();
    if (!window) {
        log("No focused window - ignoring keyboard shortcut to move window");
        return;
    }

    reset_window(window);

    const numMonitors = activeMonitors().length;
    if (numMonitors == 0) {
        return;
    }

    const ts = tilespec.parsePreset("5x5 1:1 3:3")[0];

    const srcMonitorIndex = window.get_monitor();
    const dstMonitorIndex = (srcMonitorIndex + 1) % numMonitors;

    const workArea = workAreaRectByMonitorIndex(dstMonitorIndex);
    if (!workArea) {
        log(`Failed to get active work area for window while moving it to the next monitor.`);
        return;
    }
    const rect = ts.toFrameRect(workArea);
    moveWindowToRect(window, rect);
}

/**
 * Moves a window to the specified region. This may resize the window as well as
 * move its origin.
 */
function moveWindowToRect(window: any, rect: tilespec.Rect) {
    // The move_frame line is a workaround for a bug affecting gnome terminal
    // windows. See https://github.com/gSnap/gSnap/issues/176#issue-751198339.
    window.move_frame(true, rect.origin.x, rect.origin.y);
    window.move_resize_frame(
        true,
        rect.origin.x,
        rect.origin.y,
        rect.size.width,
        rect.size.height);
}


function snapToNeighborsBind() {
    log("SnapToNeighbors keybind invoked");
    let window = getFocusApp();
    if (!window) {
        log("No focused window - ignoring keyboard shortcut SnapToNeighbors");
        return;
    }

    snapToNeighbors(window);
}


