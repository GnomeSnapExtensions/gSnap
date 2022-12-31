import { PrefsBuilder } from './prefs_builder.old'
import { AdwPrefsBuilder } from './prefs_builder.adw'


export function init() {

}

export function buildPrefsWidget() {
    let builder = new PrefsBuilder();
    return builder.build();
}

export function fillPreferencesWindow(window: any) {
    let builder = new AdwPrefsBuilder();
    return builder.build(window);
}
