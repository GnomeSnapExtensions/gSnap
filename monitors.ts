// GJS import system
declare var imports: any;
declare var global: any;

const Main = imports.ui.main;
import {
    Window,
    WindowType,
    WorkspaceManager as WorkspaceManagerInterface
} from "./gnometypes";
import { log } from "./logging";
import { getIntSetting, SETTINGS_INSETS_PRIMARY_BOTTOM, SETTINGS_INSETS_PRIMARY_LEFT, SETTINGS_INSETS_PRIMARY_RIGHT, SETTINGS_INSETS_PRIMARY_TOP, SETTINGS_INSETS_SECONDARY_BOTTOM, SETTINGS_INSETS_SECONDARY_LEFT, SETTINGS_INSETS_SECONDARY_RIGHT, SETTINGS_INSETS_SECONDARY_TOP, } from "./settings";
import * as tilespec from "./tilespec";

// Getter for accesing "get_active_workspace" on GNOME <=2.28 and >= 2.30
const WorkspaceManager: WorkspaceManagerInterface = (
    global.screen || global.workspace_manager);

export interface WorkArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function areEqual(a: WorkArea, b: WorkArea): boolean
{
    return a.x == b.x 
      && a.y == b.y
      && a.width == b.width
      && a.height == b.height;
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

export function getWindowsOfMonitor(monitor: Monitor) : Window[] {
    let monitors = activeMonitors();
    
    let windows = WorkspaceManager
        .get_active_workspace()
        .list_windows()
        .filter(w => w.get_window_type() == WindowType.NORMAL
                  && !w.is_hidden()
                  && monitors[w.get_monitor()] == monitor);
    return windows;
}

function getMonitorKey(monitor: Monitor): string {
    return monitor.x + ":" + monitor.width + ":" + monitor.y + ":" + monitor.height;
}


// TODO: This type is incomplete. Its definition is based purely on usage in
// this file and may be missing methods from the Gnome object.
export interface Monitor {
    index: number;
    x: number;
    y: number;
    height: number;
    width: number;
};

export function activeMonitors(): Monitor[] {
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
export function getWorkAreaByMonitor(monitor: Monitor): WorkArea | null {
    const monitors = activeMonitors();

    for (let i = 0; i < monitors.length; i++) {
        let mon = monitors[i];
        if (mon.x == monitor.x && mon.y == monitor.y) {
            return getWorkArea(monitor);
        }
    }

    return null;
}

export function workAreaRectByMonitorIndex(monitorIndex: number): tilespec.Rect | null {
    const monitor = activeMonitors()[monitorIndex];
    if (!monitor) {
        return null;
    }
    const waLegacy = getWorkAreaByMonitor(monitor);
    if(!waLegacy) {
        return null;
    }

    return (new tilespec.Rect(
        new tilespec.XY(waLegacy.x, waLegacy.y),
        new tilespec.Size(waLegacy.width, waLegacy.height)));
}

function getWorkArea(monitor: Monitor): WorkArea {
    const wkspace = WorkspaceManager.get_active_workspace();
    const work_area = wkspace.get_work_area_for_monitor(monitor.index);
    const insets = getMonitorInsets(getMonitorTier(monitor));

    const result = {
        x: work_area.x + insets.left,
        y: work_area.y + insets.top,
        width: work_area.width - insets.left - insets.right,
        height: work_area.height - insets.top - insets.bottom
    };

    log(`getWorkArea m:${monitor.index}, x: ${result.x} y:${result.y} w:${result.width} h:${result.height}`);

    return result;
}

export function getCurrentMonitorIndex() : number {
    return global.display.get_current_monitor();
}