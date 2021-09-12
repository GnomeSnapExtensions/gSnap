// GJS import system
declare var imports: any;
declare var global: any;

const Main = imports.ui.main;
const Meta = imports.gi.Meta;
import {
    WorkspaceManager as WorkspaceManagerInterface
} from "./gnometypes";
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

function getWindowsOfMonitor(monitor: Monitor) {
    const monitors = activeMonitors();
    let windows = global.get_window_actors().filter(function (w: any) {
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


// TODO: This type is incomplete. Its definition is based purely on usage in
// this file and may be missing methods from the Gnome object.
export interface Monitor {
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

export function workAreaRectByMonitorIndex(monitorIndex: number): tilespec.Rect | null {
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