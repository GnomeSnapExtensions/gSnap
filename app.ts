// GJS import system
declare var imports: any;
declare var global: any;
import {log, setLoggingEnabled} from './logging';
import {ShellVersion} from './shellversion';
import {bind as bindHotkeys, unbind as unbindHotkeys, Bindings} from './hotkeys';
import {snapToNeighbors} from './snaptoneighbors';
import * as tilespec from "./tilespec";
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
import {BoolSettingName, NumberSettingName, StringSettingName} from './settings_data';

/*****************************************************************

 This extension has been developed by vibou

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
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;
const Signals = imports.signals;
const Workspace = imports.ui.workspace;
// Getter for accesing "get_active_workspace" on GNOME <=2.28 and >= 2.30
const WorkspaceManager: WorkspaceManagerInterface = (
    global.screen || global.workspace_manager);

// Extension imports
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

interface WorkArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Globals
const SETTINGS_GRID_SIZES = 'grid-sizes';
const SETTINGS_AUTO_CLOSE = 'auto-close';
const SETTINGS_ANIMATION = 'animation';
const SETTINGS_SHOW_ICON = 'show-icon';
const SETTINGS_GLOBAL_PRESETS = 'global-presets';
const SETTINGS_MOVERESIZE_ENABLED = 'moveresize-enabled';
const SETTINGS_WINDOW_MARGIN = 'window-margin';
const SETTINGS_WINDOW_MARGIN_FULLSCREEN_ENABLED = 'window-margin-fullscreen-enabled';
const SETTINGS_MAX_TIMEOUT = 'max-timeout';
const SETTINGS_MAIN_WINDOW_SIZES = 'main-window-sizes';

const SETTINGS_INSETS_PRIMARY = 'insets-primary';
const SETTINGS_INSETS_PRIMARY_LEFT = 'insets-primary-left';
const SETTINGS_INSETS_PRIMARY_RIGHT = 'insets-primary-right';
const SETTINGS_INSETS_PRIMARY_TOP = 'insets-primary-top';
const SETTINGS_INSETS_PRIMARY_BOTTOM = 'insets-primary-bottom';
const SETTINGS_INSETS_SECONDARY = 'insets-secondary';
const SETTINGS_INSETS_SECONDARY_LEFT = 'insets-secondary-left';
const SETTINGS_INSETS_SECONDARY_RIGHT = 'insets-secondary-right';
const SETTINGS_INSETS_SECONDARY_TOP = 'insets-secondary-top';
const SETTINGS_INSETS_SECONDARY_BOTTOM = 'insets-secondary-bottom';
const SETTINGS_DEBUG = 'debug';


interface ParsedSettings {
    [SETTINGS_GRID_SIZES]: tilespec.GridSize[];
    [SETTINGS_AUTO_CLOSE]: any;
    [SETTINGS_ANIMATION]: any;
    [SETTINGS_SHOW_ICON]: any;
    [SETTINGS_GLOBAL_PRESETS]: any;
    [SETTINGS_MOVERESIZE_ENABLED]: any;
    [SETTINGS_WINDOW_MARGIN]: number;
    [SETTINGS_WINDOW_MARGIN_FULLSCREEN_ENABLED]: boolean;
    [SETTINGS_MAX_TIMEOUT]: any;
    [SETTINGS_MAIN_WINDOW_SIZES]: Array<string>;

    [SETTINGS_INSETS_PRIMARY]: number;
    [SETTINGS_INSETS_PRIMARY_LEFT]: number;
    [SETTINGS_INSETS_PRIMARY_RIGHT]: number;
    [SETTINGS_INSETS_PRIMARY_TOP]: number;
    [SETTINGS_INSETS_PRIMARY_BOTTOM]: number;
    [SETTINGS_INSETS_SECONDARY]: number;
    [SETTINGS_INSETS_SECONDARY_LEFT]: number;
    [SETTINGS_INSETS_SECONDARY_RIGHT]: number;
    [SETTINGS_INSETS_SECONDARY_TOP]: number;
    [SETTINGS_INSETS_SECONDARY_BOTTOM]: number;
    [SETTINGS_DEBUG]: any;
}

const gridSettings: ParsedSettings = {
    [SETTINGS_GRID_SIZES]: [],
    [SETTINGS_AUTO_CLOSE]: null,
    [SETTINGS_ANIMATION]: null,
    [SETTINGS_SHOW_ICON]: null,
    [SETTINGS_GLOBAL_PRESETS]: null,
    [SETTINGS_MOVERESIZE_ENABLED]: null,
    [SETTINGS_WINDOW_MARGIN]: 0,
    [SETTINGS_WINDOW_MARGIN_FULLSCREEN_ENABLED]: false,
    [SETTINGS_MAX_TIMEOUT]: null,
    [SETTINGS_MAIN_WINDOW_SIZES]: [],

    [SETTINGS_INSETS_PRIMARY]: 0,
    [SETTINGS_INSETS_PRIMARY_LEFT]: 0,
    [SETTINGS_INSETS_PRIMARY_RIGHT]: 0,
    [SETTINGS_INSETS_PRIMARY_TOP]: 0,
    [SETTINGS_INSETS_PRIMARY_BOTTOM]: 0,
    [SETTINGS_INSETS_SECONDARY]: 0,
    [SETTINGS_INSETS_SECONDARY_LEFT]: 0,
    [SETTINGS_INSETS_SECONDARY_RIGHT]: 0,
    [SETTINGS_INSETS_SECONDARY_TOP]: 0,
    [SETTINGS_INSETS_SECONDARY_BOTTOM]: 0,
    [SETTINGS_DEBUG]: null,
};

interface SettingsObject {
    get_boolean(name: BoolSettingName): boolean | undefined;

    get_string(name: StringSettingName): string | undefined;

    get_int(name: NumberSettingName): number | undefined;

    connect(eventName: string, callback: () => void): void;
};

let launcher: GSnapStatusButtonInterface | null;
let tracker: ShellWindowTracker;
let nbCols = 0;
let nbRows = 0;
let focusMetaWindow: Window | null = null;
let focusConnect: any = false;

let settings: SettingsObject = Settings.get();
settings.connect('changed', changed_settings);
let keyControlBound: any = false;
let enabled = false;
let mainWindowSizes = new Array();
;
let monitorsChangedConnect: any = false;

const SHELL_VERSION = ShellVersion.defaultVersion();

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
        globalApp.setLayout(globalApp.layouts[0]);
    }],
    ['preset-resize-2', () => {
        globalApp.setLayout(globalApp.layouts[1]);
    }],
    ['preset-resize-3', () => {
        globalApp.setLayout(globalApp.layouts[2]);
    }],
    ['preset-resize-4', () => {
        globalApp.setLayout(globalApp.layouts[3]);
    }],
    ['preset-resize-5', () => {
        globalApp.setLayout(globalApp.layouts[4]);
    }],
    ['preset-resize-6', () => {
        globalApp.setLayout(globalApp.layouts[5]);
    }],
    ['preset-resize-7', () => {
        globalApp.setLayout(globalApp.layouts[6]);
    }],
    ['preset-resize-8', () => {
        globalApp.setLayout(globalApp.layouts[7]);
    }],
    ['preset-resize-9', () => {
        globalApp.setLayout(globalApp.layouts[8]);
    }],
    ['preset-resize-10', () => {
        globalApp.setLayout(globalApp.layouts[9]);
    }],
    ['preset-resize-11', () => {
        globalApp.setLayout(globalApp.layouts[10]);
    }],
    ['preset-resize-12', () => {
        globalApp.setLayout(globalApp.layouts[11]);
    }],
    ['preset-resize-13', () => {
        globalApp.setLayout(globalApp.layouts[12]);
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

class App {
    private gridShowing: boolean = false;
    private widgets : StBoxLayout[] = [];
    private currentlayout =
        {
            type: 0, // 1 for col
            length: 100,
            items: [
                {type: 1, length: 40},
                {
                    type: 1, length: 20, items: [
                        {type: 0, length: 33},
                        {type: 0, length: 34},
                        {type: 0, length: 33},
                    ]
                },
                {type: 1, length: 40}
            ]
        };
    public layouts = [
        {
            type: 0, // 1 for col
            length: 100,
            items: [
                {type: 1, length: 40},
                {
                    type: 1, length: 20, items: [
                        {type: 0, length: 33},
                        {type: 0, length: 34},
                        {type: 0, length: 33},
                    ]
                },
                {type: 1, length: 40}
            ]
        },
        {
            type: 0, // 1 for col
            length: 100,
            items: [
                {type: 1, length: 40},
                {
                    type: 1, length: 20, items: [
                        {type: 0, length: 50},
                        {type: 0, length: 50},
                    ]
                },
                {type: 1, length: 40}
            ]
        },
        {
            type: 0, // 1 for col
            length: 100,
            items: [
                {type: 1, length: 60},
                {type: 1, length: 40}
            ]
        }
    ];
    createLayout(layout: any, startX: number, startY: number, width:number, height:number) {
        
        let x = startX;
        let y = startY;
        
        let margin = gridSettings[SETTINGS_WINDOW_MARGIN];
        
        for (let i = 0 ; i < layout.items.length; i++) {
            let item = layout.items[i];
         
            let factor = layout.type == 0 ? width : height;
            
            let length = (factor / 100) * item.length;
            let w = 0;
            let h = 0;
            if (layout.type == 0) {
                w = length;
                h = height;
            } else {
                h = length;
                w = width;
            }
            
            if (item.items) 
            {
                this.createLayout( item, x, y, w, h);
            } 
            else {
                let widget: StBoxLayout = (new St.BoxLayout({style_class: 'grid-preview'}));
                widget.x = x + margin;
                widget.y = y + margin;
                widget.width = w - (margin * 2);
                widget.height = h - (margin * 2);
                log("Created widget " + widget.x + ", " + widget.y + "," + w + ", " + h );
                Main.uiGroup.add_actor(widget);
                this.widgets.push(widget);
            }
            if (layout.type == 0) {
                x += length;
            } else {
                y += length;
            }
            
        }
    }

    setLayout(layout:any) {
        let [displayWidth, displayHeight] = global.display.get_size();
        for (var i = 0; i < this.widgets.length; i++) {
            Main.uiGroup.remove_actor(this.widgets[i]);
        }
        this.widgets = [];
        this.createLayout(layout, 0,35, displayWidth, displayHeight - 35);
    }
    
    enable() {
        this.gridShowing = false;
        tracker = Shell.WindowTracker.get_default();

        initSettings();

        this.setLayout(this.currentlayout);
        
        //var display = getFocusWindow().get_display();
        global.display.connect('grab-op-begin', (_display, win, op) => {
            log("Drag Operation Begin");
            if (win != null) {
                let [x, y] = global.get_pointer();
                for (let i = 0; i < this.widgets.length; i++) {
                    this.widgets[i].visible = true;
                    this.widgets[i].add_style_pseudo_class('activate');
                }    
            }
            
        });
        
        global.display.connect('grab-op-end', (_display, win, op) => {
            log("Drag Operation End");
            if (win != null) {
                let [x, y] = global.get_pointer();
                for (let i = 0; i < this.widgets.length; i++) {
                    this.widgets[i].visible = false;
                    this.widgets[i].remove_style_pseudo_class('activate');
                    if (this.contains(this.widgets[i], x, y)) {
                        moveResizeWindowWithMargins(win, this.widgets[i].x, this.widgets[i].y, this.widgets[i].width, this.widgets[i].height);
                    }
                }
            }
        });


        log("Create Button on Panel");
        launcher = new GSnapStatusButton('tiling-icon');

        if (gridSettings[SETTINGS_SHOW_ICON]) {
            Main.panel.addToStatusArea("GSnapStatusButton", launcher);
        }

        bindHotkeys(keyBindings);
        if (gridSettings[SETTINGS_GLOBAL_PRESETS]) {
            bindHotkeys(key_bindings_presets);
        }
        if (gridSettings[SETTINGS_MOVERESIZE_ENABLED]) {
            bindHotkeys(keyBindingGlobalResizes);
        }

        if (monitorsChangedConnect) {
            Main.layoutManager.disconnect(monitorsChangedConnect);
        }

        enabled = true;
        log("Extention enable completed");

    }

    contains(gridWidget: any, x: number, y: number, width: number = 1, height: number = 1): boolean {
        return (
            gridWidget.x <= x &&
            gridWidget.y <= y &&
            gridWidget.x + gridWidget.width >= x + width &&
            gridWidget.y + gridWidget.height >= y + height
        );
    }



    disable() {
        log("Extension disable begin");
        enabled = false;

        if (monitorsChangedConnect) {
            log("Disconnecting monitors-changed");
            Main.layoutManager.disconnect(monitorsChangedConnect);
            monitorsChangedConnect = false;
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

const GSnapStatusButton = new Lang.Class({
    Name: 'GSnapStatusButton',
    Extends: PanelMenu.Button,

    _init: function (classname: string) {
        this.parent(0.0, "gSnap", false);
        //Done by default in PanelMenuButton - Just need to override the method
        if (SHELL_VERSION.version_at_least_34()) {
            this.add_style_class_name(classname);
            this.connect('button-press-event', Lang.bind(this, this._onButtonPress));
        } else {
            this.actor.add_style_class_name(classname);
            this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPress));
        }
        log("GSnapStatusButton _init done");
    },

    reset: function () {
        this.activated = false;
        if (SHELL_VERSION.version_at_least_34()) {
            this.remove_style_pseudo_class('activate');
        } else {
            this.actor.remove_style_pseudo_class('activate');
        }
    },

    activate: function () {
        if (SHELL_VERSION.version_at_least_34()) {
            this.add_style_pseudo_class('activate');
        } else {
            this.actor.add_style_pseudo_class('activate');
        }
    },

    deactivate: function () {
        if (SHELL_VERSION.version_at_least_34()) {
            this.remove_style_pseudo_class('activate');
        } else {
            this.actor.remove_style_pseudo_class('activate');
        }
    },

    _onButtonPress: function (actor, event) {
        log(`_onButtonPress Click Toggle Status on system panel ${this}`);

    },

    _destroy: function () {
        this.activated = null;
    }

});

/*****************************************************************
 SETTINGS
 *****************************************************************/
function initGridSizes(configValue: string): void {
    let gridSizes = tilespec.parseGridSizesIgnoringErrors(configValue);
    if (gridSizes.length === 0) {
        gridSizes = [
            new tilespec.GridSize(8, 6),
            new tilespec.GridSize(6, 4),
            new tilespec.GridSize(4, 4),
        ];
    }
    gridSettings[SETTINGS_GRID_SIZES] = gridSizes;
}

function getBoolSetting(settingName: BoolSettingName): boolean {
    const value = settings.get_boolean(settingName);
    if (value === undefined) {
        log("Undefined settings " + settingName);
        gridSettings[settingName] = false;
        return false;
    } else {
        gridSettings[settingName] = value;
    }
    return value;
}

function getIntSetting(settingsValue: NumberSettingName) {
    let iss = settings.get_int(settingsValue);
    if (iss === undefined) {
        log("Undefined settings " + settingsValue);
        return 0;
    } else {
        return iss;
    }
}

function initSettings() {
    log("Init settings");
    const gridSizes = settings.get_string(SETTINGS_GRID_SIZES) || '';
    log(SETTINGS_GRID_SIZES + " set to " + gridSizes);
    initGridSizes(gridSizes);

    getBoolSetting(SETTINGS_AUTO_CLOSE);
    getBoolSetting(SETTINGS_ANIMATION);
    getBoolSetting(SETTINGS_SHOW_ICON);
    getBoolSetting(SETTINGS_GLOBAL_PRESETS);
    getBoolSetting(SETTINGS_MOVERESIZE_ENABLED);

    gridSettings[SETTINGS_WINDOW_MARGIN] = getIntSetting(SETTINGS_WINDOW_MARGIN);
    gridSettings[SETTINGS_WINDOW_MARGIN_FULLSCREEN_ENABLED] = getBoolSetting(SETTINGS_WINDOW_MARGIN_FULLSCREEN_ENABLED);

    gridSettings[SETTINGS_MAX_TIMEOUT] = getIntSetting(SETTINGS_MAX_TIMEOUT);

    // initialize these from settings, the first set of sizes
    if (nbCols == 0 || nbRows == 0) {
        nbCols = gridSettings[SETTINGS_GRID_SIZES][0].width;
        nbRows = gridSettings[SETTINGS_GRID_SIZES][0].height;
    }
    const mainWindowSizesString = settings.get_string(SETTINGS_MAIN_WINDOW_SIZES);
    log(SETTINGS_MAIN_WINDOW_SIZES + " settings found " + mainWindowSizesString);
    mainWindowSizes = []
    let mainWindowSizesArray = mainWindowSizesString.split(",");

    for (var i in mainWindowSizesArray) {
        let size = mainWindowSizesArray[i];
        if (size.includes("/")) {
            let fraction = size.split("/");
            let ratio = parseFloat(fraction[0]) / parseFloat(fraction[1]);
            mainWindowSizes.push(ratio);
        } else {
            mainWindowSizes.push(parseFloat(size));
        }
    }
    ;
    log(SETTINGS_MAIN_WINDOW_SIZES + " set to " + mainWindowSizes);
    log("Init complete, nbCols " + nbCols + " nbRows " + nbRows);

}

type MonitorTier = 'primary' | 'secondary';

function getMonitorTier(monitor: Monitor): MonitorTier {
    return isPrimaryMonitor(monitor) ? 'primary' : 'secondary';
}

interface Insets {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

function getMonitorInsets(tier: MonitorTier): Insets {
    switch (tier) {
        case 'primary':
            return {
                top: getIntSetting(SETTINGS_INSETS_PRIMARY_TOP),
                bottom: getIntSetting(SETTINGS_INSETS_PRIMARY_BOTTOM),
                left: getIntSetting(SETTINGS_INSETS_PRIMARY_LEFT),
                right: getIntSetting(SETTINGS_INSETS_PRIMARY_RIGHT)
            }; // Insets on primary monitor
        case 'secondary':
            return {
                top: getIntSetting(SETTINGS_INSETS_SECONDARY_TOP),
                bottom: getIntSetting(SETTINGS_INSETS_SECONDARY_BOTTOM),
                left: getIntSetting(SETTINGS_INSETS_SECONDARY_LEFT),
                right: getIntSetting(SETTINGS_INSETS_SECONDARY_RIGHT)
            };
        default:
            throw new Error(`unknown monitor name ${JSON.stringify(tier)}`);
    }
}


/*****************************************************************
 FUNCTIONS
 *****************************************************************/
function init() {
}

export function enable() {
    setLoggingEnabled(getBoolSetting(SETTINGS_DEBUG));
    log("Extension enable begin");
    SHELL_VERSION.print_version();

    globalApp.enable();
}

export function disable() {
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

function getWindowsOfMonitor(monitor: Monitor) {
    const monitors = activeMonitors();
    let windows = global.get_window_actors().filter(function (w) {
        return w.meta_window.get_window_type() != Meta.WindowType.DESKTOP
            && w.meta_window.get_workspace() == WorkspaceManager.get_active_workspace()
            && w.meta_window.showing_on_its_workspace()
            && monitors[w.meta_window.get_monitor()] == monitor;
    });

    return windows;
}

function getMonitorKey(monitor: Monitor): string {
    return monitor.x + ":" + monitor.width + ":" + monitor.y + ":" + monitor.height;
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


// TODO: This type is incomplete. Its definition is based purely on usage in
// this file and may be missing methods from the Gnome object.
interface Monitor {
    x: number;
    y: number;
    height: number;
    width: number;
};

function activeMonitors(): Monitor[] {
    return Main.layoutManager.monitors;
}

/**
 * Determine if the given monitor is the primary monitor.
 * @param {Object} monitor The given monitor to evaluate.
 * @returns {boolean} True if the given monitor is the primary monitor.
 * */
function isPrimaryMonitor(monitor: Monitor): boolean {
    return Main.layoutManager.primaryMonitor.x == monitor.x && Main.layoutManager.primaryMonitor.y == monitor.y;
}

function getWorkAreaByMonitor(monitor: Monitor): WorkArea | null {
    const monitors = activeMonitors();
    for (let monitor_idx = 0; monitor_idx < monitors.length; monitor_idx++) {
        let mon = monitors[monitor_idx];
        if (mon.x == monitor.x && mon.y == monitor.y) {
            return getWorkArea(monitor, monitor_idx);
        }
    }
    return null;
}

/**
 * @deprecated Use {@link workAreaRectByMonitorIndex} instead.
 */
function getWorkAreaByMonitorIdx(monitor_idx: number): WorkArea {
    const monitors = activeMonitors();
    let monitor = monitors[monitor_idx];
    return getWorkArea(monitor, monitor_idx);
}

function workAreaRectByMonitorIndex(monitorIndex: number): tilespec.Rect | null {
    const monitor = activeMonitors()[monitorIndex];
    if (!monitor) {
        return null;
    }
    const waLegacy = getWorkArea(monitor, monitorIndex);

    return (new tilespec.Rect(
        new tilespec.XY(waLegacy.x, waLegacy.y),
        new tilespec.Size(waLegacy.width, waLegacy.height)));
}

/**
 * @deprecated Use {@link workAreaRectByMonitorIndex} instead.
 */
function getWorkArea(monitor: Monitor, monitor_idx: number): WorkArea {
    const wkspace = WorkspaceManager.get_active_workspace();
    const work_area = wkspace.get_work_area_for_monitor(monitor_idx);
    const insets = getMonitorInsets(getMonitorTier(monitor));
    return {
        x: work_area.x + insets.left,
        y: work_area.y + insets.top,
        width: work_area.width - insets.left - insets.right,
        height: work_area.height - insets.top - insets.bottom
    };
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

