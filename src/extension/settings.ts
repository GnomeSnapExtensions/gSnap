// GJS import system

import * as SETTINGS from './settings_data';

import { log, setLoggingEnabled } from "./logging";

export var gridSettings: SETTINGS.ParsedSettings;

export interface SettingsObject {
    get_boolean(name: SETTINGS.BoolSettingName): boolean | undefined;

    get_string(name: SETTINGS.StringSettingName): string | undefined;

    get_int(name: SETTINGS.NumberSettingName): number | undefined;

    connect(eventName: string, callback: () => void): any;

    disconnect(c: any): void;
};

let _settings: SettingsObject;
let _settingsConnection: any = null;

export function getBoolSetting(settingName: SETTINGS.BoolSettingName): boolean {
    const value = _settings.get_boolean(settingName);
    if (value === undefined) {
        log("Undefined settings " + settingName);
        return false;
    }
    return value;
}

export function getIntSetting(settingsValue: SETTINGS.NumberSettingName) {
    let iss = _settings.get_int(settingsValue);
    if (iss === undefined) {
        log("Undefined settings " + settingsValue);
        return 0;
    } else {
        return iss;
    }
}

export function initSettings(settings: SettingsObject, changed_settings: () => void) {
    _settings = settings;
    _settingsConnection = _settings.connect('changed', changed_settings);
    setLoggingEnabled(getBoolSetting(SETTINGS.DEBUG));

    log("Init settings");
    gridSettings = new SETTINGS.ParsedSettings();
    gridSettings[SETTINGS.SHOW_ICON] = getBoolSetting(SETTINGS.SHOW_ICON);
    gridSettings[SETTINGS.SHOW_TABS] = getBoolSetting(SETTINGS.SHOW_TABS);
    gridSettings[SETTINGS.WINDOW_MARGIN] = getIntSetting(SETTINGS.WINDOW_MARGIN);
    gridSettings[SETTINGS.ANIMATIONS_ENABLED] = getBoolSetting(SETTINGS.ANIMATIONS_ENABLED);
    log("Init complete");
}

export function deinitSettings() {
    _settings.disconnect(_settingsConnection);
}
