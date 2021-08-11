// GJS import system
declare var imports: any;
declare var global: any;
import {log, setLoggingEnabled} from './logging';
import {ShellVersion} from './shellversion';
import {bind as bindHotkeys, unbind as unbindHotkeys, Bindings} from './hotkeys';
import {snapToNeighbors} from './snaptoneighbors';
import * as tilespec from "./tilespec";

const Gettext = imports.gettext;
const _ = Gettext.gettext;
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
// Library imports
const St = imports.gi.St;
const Main = imports.ui.main;
const Shell = imports.gi.Shell;
const GObject = imports.gi.GObject;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;
const Signals = imports.signals;
const Workspace = imports.ui.workspace;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

// Getter for accesing "get_active_workspace" on GNOME <=2.28 and >= 2.30
const WorkspaceManager: WorkspaceManagerInterface = (
    global.screen || global.workspace_manager);

// Extension imports
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Me.imports.settings;

export class ZoneBase {
    public parent: ZoneBase | null = null;

    public contains(x: number, y: number, width: number = 1, height: number = 1): boolean {
        return (
            this.x() <= x &&
            this.y() <= y &&
            this.x() + this.width() >= x + width &&
            this.y() + this.height() >= y + height
        );
    }

    public layoutItem: any;

    public x(v: number | null = null): number {
        return 0;
    }

    public y(v: number | null = null): number {
        return 0;
    }

    public width(v: number | null = null): number {
        return 0;
    }

    public height(v: number | null = null): number {
        return 0;
    }

    public destroy() {

    }

    public hide() {

    }

    public show() {

    }

    public sizeRight(delta: number) {

    }

    public sizeLeft(delta: number) {

    }

    public sizeTop(delta: number) {

    }

    public sizeBottom(delta: number) {

    }
}

export class Zone extends ZoneBase {
    public widget: StWidget | null = null;

    constructor(styleClass: string = 'grid-preview') {
        super();
        this.widget = new St.BoxLayout({style_class: styleClass});

        Main.uiGroup.add_child(this.widget);
    }

    public x(v: number | null = null): number {
        if (v != null) {
            return this.widget.x = v;
        }
        return this.widget.x;
    }

    public y(v: number | null = null): number {
        if (v != null) {
            return this.widget.y = v;
        }
        return this.widget.y;
    }

    public width(v: number | null = null): number {
        if (v != null) {
            return this.widget.width = v;
        }
        return this.widget.width;
    }

    public height(v: number | null = null): number {
        if (v != null) {
            return this.widget.height = v;
        }
        return this.widget.height;
    }

    public hide() {
        this.widget.visible = false;
        this.widget.remove_style_pseudo_class('activate');
    }

    public show() {
        this.widget.visible = true;
        this.widget.add_style_pseudo_class('activate');
    }

    public destroy() {
        this.hide();
        Main.uiGroup.remove_actor(this.widget);
    }

    sizeLeft(delta: number) {
        this.x(this.x() + delta);
        this.width(this.width() - delta)
    }

    sizeRight(delta: number) {
        this.width(this.width() + delta)
    }

    sizeTop(delta: number) {
        this.y(this.y() + delta);
        this.height(this.height() - delta)
    }

    sizeBottom(delta: number) {
        this.height(this.height() + delta)
    }
}

export class ZoneGroup extends ZoneBase {
    public children: ZoneBase[] = [];
    public _x: number = 0;
    public _y: number = 0;
    public _width: number = 0;
    public _height: number = 0;

    contains(x: number, y: number, width: number = 1, height: number = 1): boolean {
        return false;
    }

    public x(v: number | null = null): number {
        if (v == null) return this._x;
        return this._x = v;
    }

    public y(v: number | null = null): number {
        if (v == null) return this._y;
        return this._y = v;
    }

    public width(v: number | null = null): number {
        if (v == null) return this._width;
        return this._width = v;
    }

    public height(v: number | null = null): number {
        if (v == null) return this._height;
        return this._height = v;
    }

    public destroy() {

        super.destroy();
        this.hide();
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].destroy();
        }
    }
 
    public sizeLeft(delta: number) {
        this.x(this.x() + delta);
        this.width(this.width() - delta)
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].sizeLeft(delta);
        }
    }

    public sizeRight(delta: number) {
        this.width(this.width() + delta)
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].sizeRight(delta);
        }
    }

    public sizeTop(delta: number) {
        this.y(this.y() + delta);
        this.height(this.height() - delta)
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].sizeTop(delta);
        }
    }

    public sizeBottom(delta: number) {
        this.height(this.height() + delta)
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].sizeBottom(delta);
        }
    }

    public hide() {
        super.destroy();
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].hide();
        }
    }

    public show() {
        super.destroy();
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].show();
        }
    }

    public recursiveChildren(list: any[] = []): any[] {
        for (let i = 0; i < this.children.length; i++) {
            let item = <any>this.children[i];

            if (item.children) {
                item.recursiveChildren(list);
            }
            list.push(item);
        }
        return list;
    }
}

export class ZoneAnchor {

    private widget: StButton;
    public startX = 0;
    public startY = 0;
    public isMoving: boolean = false;
    public motionConnection = null;

    constructor(protected zoneGroup: ZoneGroup, protected zoneA: ZoneBase, protected zoneB: ZoneBase, protected margin: number) {
        //super();
        log("--- ZONE GROUP WITH " + zoneGroup.layoutItem.type);
        this.widget = new St.Button({style_class: 'size-button'});
        this.widget.label = " = ";
        this.widget.visible = true;
        this.adjustSizes();
        this.widget.connect('button-press-event', (actor: any, event: any) => {
            let [x, y] = global.get_pointer();
            this.startX = x;
            this.startY = y;
            this.isMoving = !this.isMoving;
        });
        this.widget.connect('button-release-event', (actor: any, event: any) => {
            //this.isMoving = false;

        });

        //this.widgets.push(sizeButton);
        Main.uiGroup.add_child(this.widget);
    }

    public adjustSizes() {
        if (this.zoneGroup.layoutItem.type == 0) {
            this.widget.x = this.zoneA.x() + this.zoneA.width();
            this.widget.y = this.zoneA.y();
            this.widget.width = this.margin * 2;
            this.widget.height = this.zoneA.height();
            log("Created Vertical anchor");

        } else {
            this.widget.y = this.zoneA.y() + this.zoneA.height();
            this.widget.x = this.zoneA.x();
            this.widget.height = this.margin * 2;
            this.widget.width = this.zoneA.width();
            log("Created Horizontal anchor");
        }
    }

    public x(v: number | null = null): number {
        if (v != null) {
            return this.widget.x = v;
        }
        return this.widget.x;
    }

    public y(v: number | null = null): number {
        if (v != null) {
            return this.widget.y = v;
        }
        return this.widget.y;
    }

    public width(v: number | null = null): number {
        if (v != null) {
            return this.widget.width = v;
        }
        return this.widget.width;
    }

    public height(v: number | null = null): number {
        if (v != null) {
            return this.widget.height = v;
        }
        return this.widget.height;
    }

    public hide() {
        this.widget.visible = false;
        this.widget.remove_style_pseudo_class('activate');
    }

    public show() {
        this.widget.visible = true;
        this.widget.add_style_pseudo_class('activate');
    }

    public destroy() {
        this.hide();
        log("Destroying Anchor");
        Main.uiGroup.remove_child(this.widget);
    }

    mouseMoved(x: any, y: any) {
        if (this.isMoving) {
            log(x + ", " + y);
            if (this.zoneGroup.layoutItem.type == 0) {
                var delta = x - this.startX;
                this.zoneA.sizeRight(delta);
                this.zoneB.sizeLeft(delta);
                this.startX = x;

            } else {
                var delta = y - this.startY;
                this.zoneA.sizeBottom(delta);
                this.zoneB.sizeTop(delta);
                this.startY = y;
            }
        }

    }
}

export class ZoneDisplay extends ZoneGroup {
    protected motionConnection: any;

    constructor(layout: any, protected margin: number) {
        super();
        this.layoutItem = layout;
        let [displayWidth, displayHeight] = global.display.get_size();
        this.init(displayWidth, displayHeight);

    }


    public destroy() {
        super.destroy();

    }

    public moveWindowToWidgetAtCursor(win: any) {
        let [x, y] = global.get_pointer();
        let c = this.recursiveChildren();
        for (let i = 0; i < c.length; i++) {
            c[i].hide();
            if (c[i].contains(x, y)) {
                win.move_frame(true, c[i].x(), c[i].y());
                win.move_resize_frame(true, c[i].x(), c[i].y(), c[i].width(), c[i].height());
            }
        }
    }

    initLayout(zoneGroup: ZoneGroup, layout: any, startX: number, startY: number, width: number, height: number, margin: number = 4) {


        let x = startX;
        let y = startY;


        for (let i = 0; i < layout.items.length; i++) {
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

            if (item.items) {

                let z = new ZoneGroup();
                z.layoutItem = item;
                z.x(x + margin);
                z.y(y + margin);
                z.width(w - (margin * 2));
                z.height(h - (margin * 2));
                z.parent = zoneGroup;
                zoneGroup.children.push(z);
                this.initLayout(z, item, x, y, w, h);
                log("--- 1 ZONE GROUP WITH " + z.layoutItem.type);
                this.zoneGroupCreated(z);
            } else {
                let zone = new Zone();
                zone.layoutItem = item;

                zone.x(x + margin);
                zone.y(y + margin);
                zone.width(w - (margin * 2));
                zone.height(h - (margin * 2));
                zone.parent = zoneGroup;
                zoneGroup.children.push(zone);
                this.zoneCreated(zone);
            }
            if (i > 0) {
                //this.createMarginItem(layout, h, startY, x, margin, w, y, startX);
            }
            if (layout.type == 0) {
                x += length;
            } else {
                y += length;
            }

        }
        this.show();
    }

    protected createMarginItem(layout: any, h: number, startY: number, x: number, margin: number, w: number, y: number, startX: number) {

    }

    public createZoneWidget(layout: any, layoutItem: any, x: number, y: number, width: number, height: number) {

    }

    protected init(displayWidth: any, displayHeight: any) {

        this.initLayout(this, this.layoutItem, 0, 30 + this.margin, displayWidth, displayHeight - 30 - (this.margin * 2), this.margin);
        this.zoneGroupCreated(this);
    }

    protected zoneGroupCreated(z: ZoneGroup) {

    }

    protected zoneCreated(zone: Zone) {

    }
}

export class ZoneEditor extends ZoneDisplay {
    public stage: StBoxLayout | null = null;
    public motionConnection = null;
    public anchors: ZoneAnchor[];
    public isMoving: boolean = false;


    constructor(layout: any, margin: number) {
        super(layout, margin);
        let windows = WorkspaceManager.get_active_workspace().list_windows();
        for (let i = 0; i < windows.length; i++) {
            windows[i].minimize();
        }
        this.motionConnection = global.stage.connect("motion-event", (actor: any, event: any) => {
                let [x, y] = global.get_pointer();
                log(x + ", " + y);
                for (let i = 0; i < this.anchors.length; i++) {
                    this.anchors[i].mouseMoved(x, y);

                }
                for (let i = 0; i < this.anchors.length; i++) {
                    this.anchors[i].adjustSizes();
                }
            }
        );

    }


    protected init(displayWidth: any, displayHeight: any) {
        if (this.anchors == null) {
            this.anchors = [];
        }
        super.init(displayWidth, displayHeight);

        this.motionConnection = global.stage.connect("motion-event", (actor: any, event: any) => {
            let [pos_x, pos_y] = event.get_coords();
            if (this.isMoving) {
                log("Mouse moved " + pos_x);
            } else {

            }

        });

    }

    public destroy() {
        log("Destroying Editor " + this.anchors.length);
        global.stage.disconnect(this.motionConnection);
        super.destroy();
        for (let i = 0; i < this.anchors.length; i++) {
            this.anchors[i].destroy();
        }

        var windows = WorkspaceManager.get_active_workspace().list_windows();
        for (let i = 0; i < windows.length; i++) {
            windows[i].unminimize();
        }

    }


    protected zoneCreated(zone: Zone) {
        super.zoneCreated(zone);
    }

    protected zoneGroupCreated(z: ZoneGroup) {
        super.zoneGroupCreated(z);

        if (this.anchors == null) {
            this.anchors = [];
        }
        for (let i = 1; i < z.children.length; i++) {
            log("--- B ZONE GROUP WITH " + z.layoutItem.type);
            let zoneAnchor = new ZoneAnchor(z, z.children[i - 1], z.children[i], this.margin);
            this.anchors.push(zoneAnchor);
        }
        // let zoneAnchor = new ZoneAnchor(z, z.children[i - 1], z.children[z.children.length -1], this.margin);
        // this.anchors.push(zoneAnchor);
    }

    public hide() {
        super.hide();
        for (let i = 0; i < this.anchors.length; i++) {
            this.anchors[i].hide();
        }
    }

    public show() {
        super.show();

        for (let i = 0; i < this.anchors.length; i++) {
            this.anchors[i].show();
        }


    }

}

export class ZonePreview extends ZoneDisplay {
    constructor(layout: any, margin: number) {
        super(layout, margin);
    }

}


