// GJS import system
declare var imports: any;

import * as SETTINGS from './settings_data';

import { log, setLoggingEnabled } from "./logging";

const ExtensionUtils = imports.misc.extensionUtils;

export const gridSettings = new SETTINGS.ParsedSettings();

export interface SettingsObject {
    get_boolean(name: SETTINGS.BoolSettingName): boolean | undefined;

    get_string(name: SETTINGS.StringSettingName): string | undefined;

    get_int(name: SETTINGS.NumberSettingName): number | undefined;

    connect(eventName: string, callback: () => void): any;

    disconnect(c: any): void;
};

let settings: SettingsObject;
let settingsConnection: any = null;

export function getBoolSetting(settingName: SETTINGS.BoolSettingName): boolean {
    const value = settings.get_boolean(settingName);
    if (value === undefined) {
        log("Undefined settings " + settingName);
        return false;
    }
    return value;
}

export function getIntSetting(settingsValue: SETTINGS.NumberSettingName) {
    let iss = settings.get_int(settingsValue);
    if (iss === undefined) {
        log("Undefined settings " + settingsValue);
        return 0;
    } else {
        return iss;
    }
}

export function initSettings(changed_settings: () => void) {
    settings = ExtensionUtils.getSettings();
    settingsConnection = settings.connect('changed', changed_settings);
    setLoggingEnabled(getBoolSetting(SETTINGS.DEBUG));

    log("Init settings");
    log(ExtensionUtils.getSettings());
    gridSettings[SETTINGS.SHOW_ICON] = getBoolSetting(SETTINGS.SHOW_ICON);
    gridSettings[SETTINGS.SHOW_TABS] = getBoolSetting(SETTINGS.SHOW_TABS);
    gridSettings[SETTINGS.WINDOW_MARGIN] = getIntSetting(SETTINGS.WINDOW_MARGIN);
    log("Init complete");
}

export function deinitSettings() {
    settings.disconnect(settingsConnection);
}
