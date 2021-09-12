// GJS import system
declare var imports: any;

import * as tilespec from "./tilespec";
import { BoolSettingName, NumberSettingName, StringSettingName } from './settings_data';
import { log, setLoggingEnabled } from "./logging";

// Globals
export const SETTINGS_GRID_SIZES = 'grid-sizes';
export const SETTINGS_AUTO_CLOSE = 'auto-close';
export const SETTINGS_ANIMATION = 'animation';
export const SETTINGS_SHOW_ICON = 'show-icon';
export const SETTINGS_GLOBAL_PRESETS = 'global-presets';
export const SETTINGS_MOVERESIZE_ENABLED = 'moveresize-enabled';
export const SETTINGS_WINDOW_MARGIN = 'window-margin';
export const SETTINGS_SHOW_TABS = 'show-tabs';
export const SETTINGS_WINDOW_MARGIN_FULLSCREEN_ENABLED = 'window-margin-fullscreen-enabled';
export const SETTINGS_MAX_TIMEOUT = 'max-timeout';
export const SETTINGS_MAIN_WINDOW_SIZES = 'main-window-sizes';
export const SETTINGS_INSETS_PRIMARY = 'insets-primary';
export const SETTINGS_INSETS_PRIMARY_LEFT = 'insets-primary-left';
export const SETTINGS_INSETS_PRIMARY_RIGHT = 'insets-primary-right';
export const SETTINGS_INSETS_PRIMARY_TOP = 'insets-primary-top';
export const SETTINGS_INSETS_PRIMARY_BOTTOM = 'insets-primary-bottom';
export const SETTINGS_INSETS_SECONDARY = 'insets-secondary';
export const SETTINGS_INSETS_SECONDARY_LEFT = 'insets-secondary-left';
export const SETTINGS_INSETS_SECONDARY_RIGHT = 'insets-secondary-right';
export const SETTINGS_INSETS_SECONDARY_TOP = 'insets-secondary-top';
export const SETTINGS_INSETS_SECONDARY_BOTTOM = 'insets-secondary-bottom';
export const SETTINGS_DEBUG = 'debug';

export interface ParsedSettings {
    [SETTINGS_GRID_SIZES]: tilespec.GridSize[];
    [SETTINGS_AUTO_CLOSE]: any;
    [SETTINGS_ANIMATION]: any;
    [SETTINGS_SHOW_ICON]: any;
    [SETTINGS_SHOW_TABS]: boolean;
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

export const gridSettings: ParsedSettings = {
    [SETTINGS_GRID_SIZES]: [],
    [SETTINGS_AUTO_CLOSE]: null,
    [SETTINGS_ANIMATION]: null,
    [SETTINGS_SHOW_ICON]: null,
    [SETTINGS_SHOW_TABS]: null,
    [SETTINGS_GLOBAL_PRESETS]: null,
    [SETTINGS_MOVERESIZE_ENABLED]: null,
    [SETTINGS_WINDOW_MARGIN]: 0,
    [SETTINGS_WINDOW_MARGIN_FULLSCREEN_ENABLED]: false,
    [SETTINGS_MAX_TIMEOUT]: null,
    [SETTINGS_MAIN_WINDOW_SIZES]: [],
    [SETTINGS_SHOW_TABS]: true,
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


export interface SettingsObject {
    get_boolean(name: BoolSettingName): boolean | undefined;

    get_string(name: StringSettingName): string | undefined;

    get_int(name: NumberSettingName): number | undefined;

    connect(eventName: string, callback: () => void): any;

    disconnect(c: any): void;
};

let mainWindowSizes = new Array();
let settings: SettingsObject;
let settingsConnection: any = null;
let nbCols = 0;
let nbRows = 0;

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

export function getBoolSetting(settingName: BoolSettingName): boolean {
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

export function getIntSetting(settingsValue: NumberSettingName) {
    let iss = settings.get_int(settingsValue);
    if (iss === undefined) {
        log("Undefined settings " + settingsValue);
        return 0;
    } else {
        return iss;
    }
}

export function initSettings(changed_settings: () => void ) {
    settings = imports.misc.extensionUtils.getSettings();
    settingsConnection = settings.connect('changed', changed_settings);
    setLoggingEnabled(getBoolSetting(SETTINGS_DEBUG));

    log("Init settings");
    const gridSizes = settings.get_string(SETTINGS_GRID_SIZES) || '';
    log(SETTINGS_GRID_SIZES + " set to " + gridSizes);
    initGridSizes(gridSizes);

    getBoolSetting(SETTINGS_AUTO_CLOSE);
    getBoolSetting(SETTINGS_ANIMATION);
    getBoolSetting(SETTINGS_SHOW_ICON);
    getBoolSetting(SETTINGS_SHOW_TABS);
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
    let mainWindowSizesArray = mainWindowSizesString?.split(",");

    if(mainWindowSizesArray) {
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
    }

    log(SETTINGS_MAIN_WINDOW_SIZES + " set to " + mainWindowSizes);
    log("Init complete, nbCols " + nbCols + " nbRows " + nbRows);

}

export function deinitSettings()
{
    settings.disconnect(settingsConnection);
}
