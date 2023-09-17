// GJS import system
// @ts-nocheck 

import _St from 'gi://St';
import _GLib from 'gi://GLib';
import _Gio from 'gi://Gio';
import _Gtk from 'gi://Gtk';
import _GObject from 'gi://GObject';
import _Clutter from 'gi://Clutter';
export const St = _St;
export const GLib = _GLib;
export const Gio = _Gio;
export const Gtk = _Gtk;
export const GObject = _GObject;
export const Clutter = _Clutter;

import * as _Main from 'resource:///org/gnome/shell/ui/main.js';
import * as _PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as _PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as _ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
export const Main = _Main as any;
export const PanelMenu = _PanelMenu as any;
export const PopupMenu = _PopupMenu as any;
export const ModalDialog = _ModalDialog as any;

import _Meta from 'gi://Meta';
import _Shell from 'gi://Shell';
export const Meta = _Meta;
export const Shell = _Shell;

import { Extension, gettext } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as _Config from 'resource:///org/gnome/shell/misc/config.js';

export const Config = _Config;
export const Gettext = gettext;



export const GetExtensionSettings = function () {
    return Extension.getSettings();
}

export const DecodeText = function (contents: any) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(contents);
}

export class ExtensionUtils {
    static getCurrentExtension() {
        return { path: Extension.path };
    }
    static getSettings() {
        return Extension.getSettings();
    }
    static openPrefs() {
        Extension.openPreferences();
    }
}