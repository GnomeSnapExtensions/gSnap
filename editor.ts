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
    public parent: ZoneGroup | null = null;
    public _x: number = 0;
    public _y: number = 0;
    public _width: number = 0;
    public _height: number = 0;


    public contains(x: number, y: number, width: number = 1, height: number = 1): boolean {
        return (
            this.x() <= x &&
            this.y() <= y &&
            this.x() + this.width() >= x + width &&
            this.y() + this.height() >= y + height
        );
    }

    public margin: number = 0;
    public layoutItem: any;

    public totalWidth() {
        return (this.margin * 2) + this.width();
    }

    public totalHeight() {
        return (this.margin * 2) + this.height();
    }

    public positionChanged() {

    }

    public sizeChanged() {

    }

    public innerX(): number {
        return this.x() + this.margin;
    }

    public innerY(): number {
        return this.y() + this.margin;
    }

    public innerWidth(): number {
        return this.width() - (this.margin * 2);
    }

    public innerHeight(): number {
        return this.height() - (this.margin * 2);
    }

    public x(v: number | null = null): number {
        if (v == null) return this._x;
        this._x = v;
        this.positionChanged();
        return this._x;
    }

    public y(v: number | null = null): number {
        if (v == null) return this._y;
        this._y = v;
        this.positionChanged();
        return this._y;
    }

    public width(v: number | null = null): number {
        if (v == null) return this._width;

        this._width = v;
        this.sizeChanged();
        return this._width;
    }

    public height(v: number | null = null): number {
        if (v == null) return this._height;
        this._height = v;
        this.sizeChanged();
        return this._height;
    }

    public applyPercentages() {
        if (this.parent.layoutItem.type == 0) {

            let factor = this.parent.width() / this.width();
            this.layoutItem.length = 100 / factor;
        } else {
            let factor = this.parent.height() / this.height();
            this.layoutItem.length = 100 / factor;
        }
    }

    public destroy() {

    }

    public hide() {

    }

    public show() {

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

    public adjustWindows(windows: Window[]) {

    }
}

export class Zone extends ZoneBase {
    public widget: StWidget | null = null;


    constructor(styleClass: string = 'grid-preview') {
        super();

        this.createWidget(styleClass);
        Main.uiGroup.add_child(this.widget);
    }

    public createWidget(styleClass: string = 'grid-preview') {
        this.widget = new St.BoxLayout({style_class: styleClass});
    }

    positionChanged() {
        super.positionChanged();
        this.widget.x = this.innerX();
        this.widget.y = this.innerY();
    }

    sizeChanged() {
        super.sizeChanged();
        this.widget.height = this.innerHeight();
        this.widget.width = this.innerWidth();
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


}

export class TabbedZone extends Zone {
    public tabHeight: number = 50;
    public tabWidth: number = 200;
    public tabs: ZoneTab[] = [];

    innerX(): number {
        return super.innerX();
    }

    innerY(): number {
        if (this.tabs.length > 1) {
            return super.innerY() + this.tabHeight;
        }
        return super.innerY();
    }

    innerHeight(): number {
        if (this.tabs.length > 1) {
            return super.innerHeight() - this.tabHeight;
        }
        return super.innerHeight();
    }

    createWidget(styleClass: string = 'grid-preview') {
        this.widget = new St.BoxLayout({style_class: styleClass});
        this.widget.visible = false;
    }

    layoutTabs() {

    }

    destroy() {
        super.destroy();
        while (this.tabs.length > 0) {
            this.tabs[0].destroy();
        }
    }
    
    adjustWindows(windows: Window[]) {
        super.adjustWindows(windows);
        while (this.tabs.length > 0) {
            this.tabs[0].destroy();
        }
        this.tabs = [];
        let x = this.x() + this.margin;
        for (let i = 0; i < windows.length; i++) {
            let metaWindow = windows[i];
            let outerRect = metaWindow.get_frame_rect();

            if (this.contains(outerRect.x, outerRect.y)) {
                let zoneTab = new ZoneTab(this, metaWindow);
                zoneTab.buttonWidget.height = this.tabHeight - (this.margin * 2);
                zoneTab.buttonWidget.width = this.tabWidth;
                zoneTab.buttonWidget.x = x;
                zoneTab.buttonWidget.y = this.y() + this.margin;
                zoneTab.buttonWidget.visible = true;
                x += zoneTab.buttonWidget.width + this.margin;
            }
        }
        for (let i = 0; i < windows.length; i++) {
            let metaWindow = windows[i];
            let outerRect = metaWindow.get_frame_rect();

            if (this.contains(outerRect.x, outerRect.y)) {
                metaWindow.move_frame(true, this.innerX(), this.innerY());
                metaWindow.move_resize_frame(true, this.innerX(), this.innerY(), this.innerWidth(), this.innerHeight());
            }
        }
        if (this.tabs.length < 2) {
            while (this.tabs.length > 0) {
                this.tabs[0].destroy();
            }
            this.tabs = [];
        }
        // for (var i = 0; i < this.tabs.length; i++) {
        //     var zoneTab = this.tabs[i];
        //    
        //  
        // }
        log("Adjusted zone with " + this.tabs.length + " with window count " + windows.length);
    }

}

export class ZoneTab {
    public window: Window | null = null;
    public buttonWidget: StButton | null = null;

    constructor(private tabZone: TabbedZone, metaWindow: Window) {
        tabZone.tabs.push(this);
        this.window = metaWindow;
        this.buttonWidget = new St.Button({style_class: 'tab-button'});
        this.buttonWidget.label = metaWindow.title;
        this.buttonWidget.connect('button-press-event', Lang.bind(this, (actor, event) => {
            Main.activateWindow(this.window);
        }));
        Main.uiGroup.add_child(this.buttonWidget);
    }

    destroy() {
        this.tabZone.tabs.splice(this.tabZone.tabs.indexOf(this), 1);
        this.buttonWidget.visible = false;
        Main.uiGroup.remove_child(this.buttonWidget);
    }
}

export class EditableZone extends Zone {


    positionChanged() {
        super.positionChanged();
        (<any>this.widget).label = this.layoutItem.length + "%";
    }

    sizeChanged() {
        super.sizeChanged();
        (<any>this.widget).label = this.layoutItem.length + "%";
    }

    createWidget(styleClass: string = 'grid-preview') {
        this.widget = new St.Button({style_class: styleClass});
        this.widget.connect('button-press-event', Lang.bind(this, (actor, event) => {
            var btn = event.get_button();
            if (btn == 1) {
                log("Splitting");
                this.parent.split(this);

                //this.parent.root.init();    
            }
            if (btn == 2) {
                this.parent.splitOtherDirection(this);


            }
            if (btn == 3) {
                this.parent.remove(this);

            }
        }));
    }
}

export class ZoneGroup extends ZoneBase {
    public children: ZoneBase[] = [];

    public root: ZoneDisplay;

    constructor(parent: ZoneGroup | null = null) {
        super();
        this.parent = parent;
    }

    contains(x: number, y: number, width: number = 1, height: number = 1): boolean {
        return false;
    }

    public remove(zone: Zone) {

        const index = this.layoutItem.items.indexOf(zone.layoutItem);
        if (index > -1) {


            if (index + 1 < this.layoutItem.items.length) {
                this.layoutItem.items[index + 1].length += zone.layoutItem.length;
                this.layoutItem.items.splice(index, 1);
            } else if (index - 1 > -1) {
                this.layoutItem.items[index - 1].length += zone.layoutItem.length;
                this.layoutItem.items.splice(index, 1);
            }
            if (this.layoutItem.items.length < 2) {

                if (this.layoutItem != this.root.layoutItem) {
                    this.layoutItem.items = null;
                }

            }
        }
        this.root.reinit();

    }

    public splitOtherDirection(zone: Zone) {
        zone.layoutItem.items = [];

        zone.layoutItem.type = this.layoutItem.type == 1 ? 0 : 1;

        zone.layoutItem.items.push(
            {
                length: 50
            }
        );
        zone.layoutItem.items.push(
            {
                length: 50
            }
        );
        log(JSON.stringify(this.root.layoutItem));
        this.root.reinit();
    }

    public split(zone: Zone) {
        let index = this.children.indexOf(zone);

        this.layoutItem.items.splice(index, 0, {
            length: zone.layoutItem.length / 2
        });
        zone.layoutItem.length = zone.layoutItem.length / 2;
        log(JSON.stringify(this.root.layoutItem));
        this.root.reinit();
    }

    public adjustLayout(root: ZoneDisplay) {
        this.root = root;
        let x = this.x();
        let y = this.y();

        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            let item = child.layoutItem;
            let factor = this.layoutItem.type == 0 ? this.width() : this.height();
            let length = (factor / 100) * item.length;

            let w = 0;
            let h = 0;
            if (this.layoutItem.type == 0) {
                w = length;
                h = this.height();
            } else {
                h = length;
                w = this.width();
            }
            if (child instanceof ZoneGroup) {
                child.layoutItem = item;
                child.x(x);
                child.y(y);
                child.width(w);
                child.height(h);
                (<ZoneGroup>child).adjustLayout(root);
            } else {

                child.x(x);
                child.y(y);
                child.width(w);
                child.height(h);
            }

            if (this.layoutItem.type == 0) {
                x += length;
            } else {
                y += length;
            }
        }


    }

    public applyLayout(root: ZoneDisplay) {
        this.destroy();
        this.root = root;
        this.children = [];
        for (let i = 0; i < this.layoutItem.items.length; i++) {
            let item = this.layoutItem.items[i];
            if (item.items) {
                let z = new ZoneGroup(this);
                z.layoutItem = item;
                z.parent = this;
                this.children.push(z);
                z.applyLayout(root);
            } else {
                let zone = root.createZone();
                zone.layoutItem = item;
                zone.margin = root.margin;
                zone.parent = this;
                this.children.push(zone);
                root.zoneCreated(zone);
            }
        }
        root.zoneGroupCreated(this);
    }

    protected zoneGroupCreated(z: ZoneGroup) {

    }

    protected zoneCreated(zone: Zone) {

    }

    public destroy() {

        super.destroy();
        this.hide();
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].destroy();
        }
        this.children = [];
    }

    public sizeLeft(delta: number) {
        super.sizeLeft(delta);
        this.adjustLayout(this.root);
    }

    public sizeRight(delta: number) {
        super.sizeRight(delta);
        this.adjustLayout(this.root);
    }

    public sizeTop(delta: number) {
        super.sizeTop(delta);
        this.adjustLayout(this.root);
    }

    public sizeBottom(delta: number) {
        super.sizeBottom(delta);
        this.adjustLayout(this.root);
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

        this.widget = new St.Button({style_class: 'size-button'});
        this.widget.label = " = ";
        this.widget.visible = true;
        this.adjustSizes();
        this.widget.connect('button-press-event', (actor: any, event: any) => {
            let [x, y] = global.get_pointer();
            this.startX = x;
            this.startY = y;
            this.isMoving = !this.isMoving;
            let a = this.zoneA instanceof ZoneGroup ? "zg" : "z";
            let b = this.zoneB instanceof ZoneGroup ? "zg" : "z";
            if (!this.isMoving) {

            }
            log("sizing " + a + ", " + b);
        });
        this.widget.connect('button-release-event', (actor: any, event: any) => {
            //this.isMoving = false;

        });

        //this.widgets.push(sizeButton);
        Main.uiGroup.add_child(this.widget);
    }

    public adjustSizes() {
        if (this.zoneGroup.layoutItem.type == 0) {
            this.widget.x = this.zoneA.x() + this.zoneA.width() - this.margin;
            this.widget.y = this.zoneA.y() + this.margin;
            this.widget.width = this.margin * 2;
            this.widget.height = this.zoneA.height() - (this.margin * 2);


        } else {
            this.widget.y = this.zoneA.y() + this.zoneA.height() - this.margin;
            this.widget.x = this.zoneA.x() + this.margin;
            this.widget.height = this.margin * 2;
            this.widget.width = this.zoneA.width() - (this.margin * 2);

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
        Main.uiGroup.remove_child(this.widget);
    }

    mouseMoved(x: any, y: any) {
        if (this.isMoving) {

            if (this.zoneGroup.layoutItem.type == 0) {
                let delta = x - this.startX;
                this.zoneA.sizeRight(delta);
                this.zoneB.sizeLeft(delta);
                this.startX = x;

            } else {
                let delta = y - this.startY;
                this.zoneA.sizeBottom(delta);
                this.zoneB.sizeTop(delta);
                this.startY = y;
            }
        }

    }
}

export class ZoneDisplay extends ZoneGroup {
    protected motionConnection: any;

    public apply() {
        var c = this.recursiveChildren();
        for (var i = 0; i < c.length; i++) {
            c[i].applyPercentages();
        }
    }

    constructor(layout: any, margin: number) {
        super();
        this.margin = margin;
        this.layoutItem = layout;


        this.init();
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
                win.move_frame(true, c[i].innerX(), c[i].innerY());
                win.move_resize_frame(true, c[i].innerX(), c[i].innerY(), c[i].innerWidth(), c[i].innerHeight());
            }
        }
    }

    protected createMarginItem(layout: any, h: number, startY: number, x: number, margin: number, w: number, y: number, startX: number) {

    }

    public createZoneWidget(layout: any, layoutItem: any, x: number, y: number, width: number, height: number) {

    }


    public init() {
        let [displayWidth, displayHeight] = global.display.get_size();
        this.x(this.margin);
        this.y(30 + this.margin);

        this.width(displayWidth - (this.margin * 2));
        this.height(displayHeight - 30 - (this.margin * 2));
        this.applyLayout(this);
        this.adjustLayout(this);

    }


    public createZone() {
        return new Zone();
    }

    public reinit() {

        //this.apply();
        this.applyLayout(this);
        this.adjustLayout(this);
    }
}

export class ZoneEditor extends ZoneDisplay {
    public stage: StBoxLayout | null = null;
    public motionConnection = null;
    public anchors: ZoneAnchor[];
    public isMoving: boolean = false;


    public createZone() {
        var zone = new EditableZone();

        return zone;
    }

    constructor(layout: any, margin: number) {
        super(layout, margin);
        // let windows = WorkspaceManager.get_active_workspace().list_windows();
        // for (let i = 0; i < windows.length; i++) {
        //     windows[i].minimize();
        // }


    }


    public init() {
        if (this.anchors == null) {
            this.anchors = [];
        }
        super.init();
        this.motionConnection = global.stage.connect("motion-event", (actor: any, event: any) => {
                let [x, y] = global.get_pointer();
                for (let i = 0; i < this.anchors.length; i++) {
                    this.anchors[i].mouseMoved(x, y);

                }
                for (let i = 0; i < this.anchors.length; i++) {
                    this.anchors[i].adjustSizes();
                }
                this.apply();
            }
        );
    }

    public destroy() {
        global.stage.disconnect(this.motionConnection);
        for (let i = 0; i < this.anchors.length; i++) {
            this.anchors[i].destroy();
        }
        this.anchors = [];

        super.destroy();


    }


    protected zoneCreated(zone: Zone) {
        super.zoneCreated(zone);

    }

    protected zoneGroupCreated(z: ZoneGroup) {
        super.zoneGroupCreated(z);
        //
        if (this.anchors == null) {
            this.anchors = [];
        }
        for (let i = 1; i < z.children.length; i++) {
            let before = z.children[i - 1];
            let after = z.children[i];
            if (before == null) {
                log("--- --- BEFORE IS NULL --- ---" + i);
                log(JSON.stringify(z.children));
            }
            if (after == null) {
                log("--- --- AFTER IS NULL --- ---" + i);
                log(JSON.stringify(z.children));
            }
            let zoneAnchor = new ZoneAnchor(z, before, after, this.margin);
            this.anchors.push(zoneAnchor);
        }
    }

    applyLayout(root: ZoneDisplay) {
        super.applyLayout(root);
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

export class TabbedZoneManager extends ZoneDisplay {
    constructor(layout: any, margin: number) {
        super(layout, margin);
    }

    public createZone() {
        let zone = new TabbedZone();

        return zone;
    }

    adjustLayout(root: ZoneDisplay) {
        super.adjustLayout(root);
        this.layoutWindows();
    }

    public layoutWindows() {
        
        let wsm: WorkspaceManagerInterface = (  global.workspace_manager);
        let ws = wsm.get_n_workspaces();
        log("Workspace Index " + ws );
        let windows = wsm.get_active_workspace().list_windows();
        
        for (let c = 0; c < this.children.length; c++) {
            let child = this.children[c];
            child.adjustWindows(windows);
    
        }
    }

}
