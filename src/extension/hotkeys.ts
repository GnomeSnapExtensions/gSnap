declare const global: any;
import {
    Main,
    Meta,
    Shell,
    ExtensionUtils
} from "../gnome/imports";

import { log } from './logging';
import { KeyBindingSettingName } from './settings_data';

/**
 * Bindings is a dictionary that maps a hotkey name to a function that handles
 * the press of the key that is bound to that action.
 */
export type Bindings = Map<KeyBindingSettingName, () => void>;

export type BindingsOld = {[name in KeyBindingSettingName]: () => void};

export function bind(keyBindings: Bindings) {
    // Globals
    let settings = ExtensionUtils.getSettings();
    log("Binding keys");
    keyBindings.forEach((callback: () => void, key: KeyBindingSettingName) => {
        //const key = keyString as KeyBindingSettingName;
        if (Main.wm.addKeybinding && Shell.ActionMode) { // introduced in 3.16
            Main.wm.addKeybinding(
                key,
                settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                callback
            );
        }
        else if (Main.wm.addKeybinding && Shell.KeyBindingMode) { // introduced in 3.7.5
            Main.wm.addKeybinding(
                key,
                settings,
                Meta.KeyBindingFlags.NONE,
                Shell.KeyBindingMode.NORMAL | Shell.KeyBindingMode.MESSAGE_TRAY,
                callback
            );
        }
        else {
            global.display.add_keybinding(
                key,
                settings,
                Meta.KeyBindingFlags.NONE,
                callback
            );
        }
    });
}

export function unbind(keyBindings: Bindings) {
    log("Unbinding keys");
    for (let key of keyBindings.keys()) {
        if (Main.wm.removeKeybinding) { // introduced in 3.7.2
            Main.wm.removeKeybinding(key);
        }
        else {
            global.display.remove_keybinding(key);
        }
    }
}
