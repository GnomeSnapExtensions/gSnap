// GENERATED CODE: DO NOT EDIT
//
// Run extract_settings_type_definitions instead.


// Valid boolean settings
export type BoolSettingName = (
    "debug" |
    "global-presets" |
    "moveresize-enabled" |
    "show-icon" |
    "show-tabs");

// A setting name for a number-valued setting.
export type NumberSettingName = (
    "insets-primary-bottom" |
    "insets-primary-left" |
    "insets-primary-right" |
    "insets-primary-top" |
    "insets-secondary-bottom" |
    "insets-secondary-left" |
    "insets-secondary-right" |
    "insets-secondary-top" |
    "window-margin");

// A setting for a key binding i.e. a 'preset' in the app.ts code.
export type KeyBindingSettingName = (
    "drag-modifier" |
    "preset-resize-1" |
    "preset-resize-10" |
    "preset-resize-11" |
    "preset-resize-12" |
    "preset-resize-13" |
    "preset-resize-14" |
    "preset-resize-15" |
    "preset-resize-16" |
    "preset-resize-17" |
    "preset-resize-18" |
    "preset-resize-19" |
    "preset-resize-2" |
    "preset-resize-20" |
    "preset-resize-21" |
    "preset-resize-22" |
    "preset-resize-23" |
    "preset-resize-24" |
    "preset-resize-25" |
    "preset-resize-26" |
    "preset-resize-27" |
    "preset-resize-28" |
    "preset-resize-29" |
    "preset-resize-3" |
    "preset-resize-30" |
    "preset-resize-4" |
    "preset-resize-5" |
    "preset-resize-6" |
    "preset-resize-7" |
    "preset-resize-8" |
    "preset-resize-9");

// A setting name for a string-valued setting.
export type StringSettingName = (
    "");

// Any valid setting name.
export type AnySettingName = (
    "debug" |
    "drag-modifier" |
    "global-presets" |
    "insets-primary-bottom" |
    "insets-primary-left" |
    "insets-primary-right" |
    "insets-primary-top" |
    "insets-secondary-bottom" |
    "insets-secondary-left" |
    "insets-secondary-right" |
    "insets-secondary-top" |
    "moveresize-enabled" |
    "preset-resize-1" |
    "preset-resize-10" |
    "preset-resize-11" |
    "preset-resize-12" |
    "preset-resize-13" |
    "preset-resize-14" |
    "preset-resize-15" |
    "preset-resize-16" |
    "preset-resize-17" |
    "preset-resize-18" |
    "preset-resize-19" |
    "preset-resize-2" |
    "preset-resize-20" |
    "preset-resize-21" |
    "preset-resize-22" |
    "preset-resize-23" |
    "preset-resize-24" |
    "preset-resize-25" |
    "preset-resize-26" |
    "preset-resize-27" |
    "preset-resize-28" |
    "preset-resize-29" |
    "preset-resize-3" |
    "preset-resize-30" |
    "preset-resize-4" |
    "preset-resize-5" |
    "preset-resize-6" |
    "preset-resize-7" |
    "preset-resize-8" |
    "preset-resize-9" |
    "show-icon" |
    "show-tabs" |
    "window-margin");

export class ParsedSettings {
    /** Put debug lines into global.log. To see, run journalctl /usr/bin/gnome-shell -f in terminal */
    ["debug"]: boolean = false;

    /** Drag modifier */
    ["drag-modifier"]: string[] = ['<Super>Q'];

    /** Keyboard presets are always active (as opposed active only when tiling window is visible). */
    ["global-presets"]: boolean = true;

    /** Bottom gap around border of screen for primary monitor */
    ["insets-primary-bottom"]: number = 0;

    /** Left gap around border of screen for primary monitor */
    ["insets-primary-left"]: number = 0;

    /** Right gap around border of screen for primary monitor */
    ["insets-primary-right"]: number = 0;

    /** Top gap around border of screen for primary monitor */
    ["insets-primary-top"]: number = 0;

    /** Bottom gap around border of screen for secondary monitor */
    ["insets-secondary-bottom"]: number = 0;

    /** Left gap around border of screen for secondary monitor */
    ["insets-secondary-left"]: number = 0;

    /** Right gap around border of screen for secondary monitor */
    ["insets-secondary-right"]: number = 0;

    /** Top gap around border of screen for secondary monitor */
    ["insets-secondary-top"]: number = 0;

    /** Enables shortcuts for moving and resizing the current window. */
    ["moveresize-enabled"]: boolean = true;

    /** Preset resize 1. */
    ["preset-resize-1"]: string[] = ['<Super><Alt>KP_1'];

    /** Preset resize 1. */
    ["preset-resize-10"]: string[] = [''];

    /** Preset resize 11. */
    ["preset-resize-11"]: string[] = ['<Super><Control>KP_1'];

    /** Preset resize 12. */
    ["preset-resize-12"]: string[] = ['<Super><Control>KP_2'];

    /** Preset resize 13. */
    ["preset-resize-13"]: string[] = ['<Super><Control>KP_3'];

    /** Preset resize 14. */
    ["preset-resize-14"]: string[] = ['<Super><Control>KP_4'];

    /** Preset resize 15. */
    ["preset-resize-15"]: string[] = ['<Super><Control>KP_5'];

    /** Preset resize 16. */
    ["preset-resize-16"]: string[] = ['<Super><Control>KP_6'];

    /** Preset resize 17. */
    ["preset-resize-17"]: string[] = ['<Super><Control>KP_7'];

    /** Preset resize 18. */
    ["preset-resize-18"]: string[] = ['<Super><Control>KP_8'];

    /** Preset resize 19. */
    ["preset-resize-19"]: string[] = ['<Super><Control>KP_9'];

    /** Preset resize 2. */
    ["preset-resize-2"]: string[] = ['<Super><Alt>KP_2'];

    /** Preset resize 20. */
    ["preset-resize-20"]: string[] = [''];

    /** Preset resize 21. */
    ["preset-resize-21"]: string[] = ['<Super><Shift>KP_1'];

    /** Preset resize 22. */
    ["preset-resize-22"]: string[] = ['<Super><Shift>KP_2'];

    /** Preset resize 23. */
    ["preset-resize-23"]: string[] = ['<Super><Shift>KP_3'];

    /** Preset resize 24. */
    ["preset-resize-24"]: string[] = ['<Super><Shift>KP_4'];

    /** Preset resize 25. */
    ["preset-resize-25"]: string[] = ['<Super><Shift>KP_5'];

    /** Preset resize 26. */
    ["preset-resize-26"]: string[] = ['<Super><Shift>KP_6'];

    /** Preset resize 27. */
    ["preset-resize-27"]: string[] = ['<Super><Shift>KP_7'];

    /** Preset resize 28. */
    ["preset-resize-28"]: string[] = ['<Super><Shift>KP_8'];

    /** Preset resize 29. */
    ["preset-resize-29"]: string[] = ['<Super><Shift>KP_9'];

    /** Preset resize 3. */
    ["preset-resize-3"]: string[] = ['<Super><Alt>KP_3'];

    /** Preset resize 30. */
    ["preset-resize-30"]: string[] = [''];

    /** Preset resize 4. */
    ["preset-resize-4"]: string[] = ['<Super><Alt>KP_4'];

    /** Preset resize 5. */
    ["preset-resize-5"]: string[] = ['<Super><Alt>KP_5'];

    /** Preset resize 6. */
    ["preset-resize-6"]: string[] = ['<Super><Alt>KP_6'];

    /** Preset resize 7. */
    ["preset-resize-7"]: string[] = ['<Super><Alt>KP_7'];

    /** Preset resize 8. */
    ["preset-resize-8"]: string[] = ['<Super><Alt>KP_8'];

    /** Preset resize 9. */
    ["preset-resize-9"]: string[] = ['<Super><Alt>KP_9'];

    /** Show gSnap icon on a panel. */
    ["show-icon"]: boolean = true;

    /** Show tabs for windows in each zone. */
    ["show-tabs"]: boolean = true;

    /** Gaps between windows in the middle of screen */
    ["window-margin"]: number = 0;
}

export const DEBUG = "debug";
export const DRAG_MODIFIER = "drag-modifier";
export const GLOBAL_PRESETS = "global-presets";
export const INSETS_PRIMARY_BOTTOM = "insets-primary-bottom";
export const INSETS_PRIMARY_LEFT = "insets-primary-left";
export const INSETS_PRIMARY_RIGHT = "insets-primary-right";
export const INSETS_PRIMARY_TOP = "insets-primary-top";
export const INSETS_SECONDARY_BOTTOM = "insets-secondary-bottom";
export const INSETS_SECONDARY_LEFT = "insets-secondary-left";
export const INSETS_SECONDARY_RIGHT = "insets-secondary-right";
export const INSETS_SECONDARY_TOP = "insets-secondary-top";
export const MOVERESIZE_ENABLED = "moveresize-enabled";
export const PRESET_RESIZE_1 = "preset-resize-1";
export const PRESET_RESIZE_10 = "preset-resize-10";
export const PRESET_RESIZE_11 = "preset-resize-11";
export const PRESET_RESIZE_12 = "preset-resize-12";
export const PRESET_RESIZE_13 = "preset-resize-13";
export const PRESET_RESIZE_14 = "preset-resize-14";
export const PRESET_RESIZE_15 = "preset-resize-15";
export const PRESET_RESIZE_16 = "preset-resize-16";
export const PRESET_RESIZE_17 = "preset-resize-17";
export const PRESET_RESIZE_18 = "preset-resize-18";
export const PRESET_RESIZE_19 = "preset-resize-19";
export const PRESET_RESIZE_2 = "preset-resize-2";
export const PRESET_RESIZE_20 = "preset-resize-20";
export const PRESET_RESIZE_21 = "preset-resize-21";
export const PRESET_RESIZE_22 = "preset-resize-22";
export const PRESET_RESIZE_23 = "preset-resize-23";
export const PRESET_RESIZE_24 = "preset-resize-24";
export const PRESET_RESIZE_25 = "preset-resize-25";
export const PRESET_RESIZE_26 = "preset-resize-26";
export const PRESET_RESIZE_27 = "preset-resize-27";
export const PRESET_RESIZE_28 = "preset-resize-28";
export const PRESET_RESIZE_29 = "preset-resize-29";
export const PRESET_RESIZE_3 = "preset-resize-3";
export const PRESET_RESIZE_30 = "preset-resize-30";
export const PRESET_RESIZE_4 = "preset-resize-4";
export const PRESET_RESIZE_5 = "preset-resize-5";
export const PRESET_RESIZE_6 = "preset-resize-6";
export const PRESET_RESIZE_7 = "preset-resize-7";
export const PRESET_RESIZE_8 = "preset-resize-8";
export const PRESET_RESIZE_9 = "preset-resize-9";
export const SHOW_ICON = "show-icon";
export const SHOW_TABS = "show-tabs";
export const WINDOW_MARGIN = "window-margin";
