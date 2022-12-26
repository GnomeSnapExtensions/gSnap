// GJS import system
declare var imports: any;
declare var global: any;
import { log } from './logging';

import {
    ClutterActor,
    MetaWindow,
    StBoxLayout,
    StButton,
    StWidget,
    Window
} from "./gnometypes";

import { areEqual, getWorkAreaByMonitor, getWindowsOfMonitor, Monitor, WorkArea } from './monitors';

import { LayoutItem } from './layouts';

// Library imports
const St = imports.gi.St;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Clutter = imports.gi.Clutter;
const ModalDialog = imports.ui.modalDialog;

export class ZoneBase {
    private _x: number = 0;
    private _y: number = 0;
    private _width: number = 0;
    private _height: number = 0;
    public parent: ZoneGroup | null = null;
    public margin: number = 0;
    public layoutItem: LayoutItem;

    constructor(layoutItem: LayoutItem, parent: ZoneGroup | null) {
        this.layoutItem = layoutItem;
        this.parent = parent;
    }

    public contains(x: number, y: number, width: number = 1, height: number = 1): boolean {
        return (
            this.x <= x &&
            this.y <= y &&
            this.x + this.width >= x + width &&
            this.y + this.height >= y + height
        );
    }

    public get totalWidth() {
        return (this.margin * 2) + this.width;
    }

    public get totalHeight() {
        return (this.margin * 2) + this.height;
    }

    public get innerX(): number {
        return this.x + this.margin;
    }

    public get innerY(): number {
        return this.y + this.margin;
    }

    public get innerWidth(): number {
        return this.width - (this.margin * 2);
    }

    public get innerHeight(): number {
        return this.height - (this.margin * 2);
    }

    public get x() : number {
        return this._x;
    }

    public set x(v : number) {
        if(this._x !== v) {
        this._x = v;
        this.positionChanged();
        }
    }

    public get y() : number {
        return this._y;
    }
    
    public set y(v : number) {
        if(this._y !== v) {
        this._y = v;
        this.positionChanged();
        }
    }

    public get width() : number {
        return this._width;
    }

    public set width(v : number) {
        if(this._width !== v) {
        this._width = v;
        this.sizeChanged();
        }
    }

    public get height() : number {
        return this._height;
    }

    public set height(v : number) {
        if(this._height !== v) {
        this._height = v;
        this.sizeChanged();
        }
    }

    public applyPercentages() {
        if (this.parent) {
            if (this.parent.layoutItem.type == 0) {
                let factor = this.parent.width / this.width;
                this.layoutItem.length = 100 / factor;
            } else {
                let factor = this.parent.height / this.height;
                this.layoutItem.length = 100 / factor;
            }
        }
    }

    public destroy() {

    }

    public hide() {

    }

    public show() {

    }

    public positionChanged() {

    }

    public sizeChanged() {

    }

    sizeLeft(delta: number) {
        this.x += delta;
        this.width -= delta;
    }

    sizeRight(delta: number) {
        this.width += delta;
    }

    sizeTop(delta: number) {
        this.y += delta;
        this.height -= delta;
    }

    sizeBottom(delta: number) {
        this.height += delta;
    }

    public adjustWindows(windows: Window[]) {

    }
}

export class Zone extends ZoneBase {
    public widget!: StWidget;

    constructor(layoutItem: LayoutItem, parent: ZoneGroup | null) {
        super(layoutItem, parent);
        this.createWidget();
        Main.uiGroup.insert_child_above(this.widget, global.window_group);
    }

    public createWidget(styleClass: string = 'grid-preview') {
        this.widget = new St.BoxLayout({ style_class: styleClass });
        this.widget.visible = false;
    }

    positionChanged() {
        super.positionChanged();
        this.widget.x = this.innerX;
        this.widget.y = this.innerY;
    }

    sizeChanged() {
        super.sizeChanged();
        this.widget.height = this.innerHeight;
        this.widget.width = this.innerWidth;
    }

    public hide() {
        this.widget.visible = false;
        this.widget.remove_style_pseudo_class('activate');
    }

    public show() {
        this.widget.visible = true;
        this.widget.add_style_pseudo_class('activate');
    }

    public set hover(hovering: boolean) {
        if(!this.widget) return;
        
        // this is needed to highlight windows on hover
        // while dragging a window in the zone
        hovering
            ? this.widget.add_style_pseudo_class('hover')
            : this.widget.remove_style_pseudo_class('hover');
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

    get innerY(): number {
        if (this.tabs.length > 1) {
            return super.innerY + this.tabHeight;
        }
        return super.innerY;
    }

    get innerHeight(): number {
        if (this.tabs.length > 1) {
            return super.innerHeight - this.tabHeight;
        }
        return super.innerHeight;
    }

    createWidget(styleClass: string = 'grid-preview') {
        this.widget = new St.BoxLayout({ style_class: styleClass });
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
        let x = this.x + this.margin;
        for (let i = 0; i < windows.length; i++) {
            let metaWindow = windows[i];
            let outerRect = metaWindow.get_frame_rect();

            let midX = outerRect.x + (outerRect.width / 2);
            let midY = outerRect.y + (outerRect.height / 2);
            
            if (this.contains(midX, midY)) {
                let zoneTab = new ZoneTab(this, metaWindow);
                zoneTab.buttonWidget.height = this.tabHeight - (this.margin * 2);
                zoneTab.buttonWidget.width = this.tabWidth;
                zoneTab.buttonWidget.x = x;
                zoneTab.buttonWidget.y = this.y + this.margin;
                zoneTab.buttonWidget.visible = true;
                x += zoneTab.buttonWidget.width + this.margin;
            }
        }
        for (let i = 0; i < windows.length; i++) {
            let metaWindow = windows[i];
            let outerRect = metaWindow.get_frame_rect();
            let midX = outerRect.x + (outerRect.width / 2);
            let midY = outerRect.y + (outerRect.height / 2);
            if (this.contains(midX, midY)) {
                metaWindow.move_frame(true, this.innerX, this.innerY);
                metaWindow.move_resize_frame(true, this.innerX, this.innerY, this.innerWidth, this.innerHeight);
            }
        }

        if (this.tabs.length < 2) {
            while (this.tabs.length > 0) {
                this.tabs[0].destroy();
            }
            this.tabs = [];
        }

        log("Adjusted zone with " + this.tabs.length + " with window count " + windows.length);
    }

}

export class ZoneTab {
    public window: Window;
    public buttonWidget: StButton;

    constructor(private tabZone: TabbedZone, metaWindow: Window) {
        tabZone.tabs.push(this);
        this.window = metaWindow;
        this.buttonWidget = new St.Button({ style_class: 'tab-button' });
        this.buttonWidget.label = metaWindow.title;
        this.buttonWidget.connect('button-press-event', () => {
            Main.activateWindow(this.window);
        });
        Main.uiGroup.insert_child_above(this.buttonWidget, global.window_group);
    }

    destroy() {
        this.tabZone.tabs.splice(this.tabZone.tabs.indexOf(this), 1);
        this.buttonWidget.visible = false;
        Main.uiGroup.remove_child(this.buttonWidget);
    }
}

function toRoundedString(val: number, places = 0) {
    const factor = Math.pow(10, places);
    return (Math.round((val + Number.EPSILON) * factor) / factor).toFixed(places);
}

export class EditableZone extends Zone {
    positionChanged() {
        super.positionChanged();
        this.widget.label = `${toRoundedString(this.innerWidth)}x${toRoundedString(this.innerHeight)}\n(${toRoundedString(this.layoutItem.length,2)}%)`;
    }

    sizeChanged() {
        super.sizeChanged();
        this.widget.label = `${toRoundedString(this.innerWidth)}x${toRoundedString(this.innerHeight)}\n(${toRoundedString(this.layoutItem.length,2)}%)`;
    }

    createWidget(styleClass: string = 'grid-preview') {
        this.widget = new St.Button({ style_class: styleClass });
        this.widget.connect('button-press-event', (_actor: ClutterActor, event: any) => {
            var btn = event.get_button();
            if (btn == 1) {
                log("Splitting");
                this.parent?.split(this);
            }

            if (btn == 2) {
                this.parent?.splitOtherDirection(this);
            }

            if (btn == 3) {
                this.parent?.remove(this);
            }
        });
        this.widget;
    }
}

export class ZoneGroup extends ZoneBase {
    public children: ZoneBase[] = [];
    public root!: ZoneDisplay;

    constructor(layoutItem: LayoutItem, parent: ZoneGroup | null) {
        super(layoutItem, parent);
    }

    contains(x: number, y: number, width: number = 1, height: number = 1): boolean {
        return false;
    }

    adjustWindows(windows: Window[]) {
        super.adjustWindows(windows);

        for (var i = 0; i < this.children.length; i++) {
            this.children[i].adjustWindows(windows);
        }
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
                    this.layoutItem.items = [];
                }
            }
        }
        this.root.reinit();
    }

    public splitOtherDirection(zone: Zone) {
        zone.layoutItem.items = [];

        zone.layoutItem.type = this.layoutItem.type == 1 ? 0 : 1;
        zone.layoutItem.items.push({ type: 0, length: 50, items: [] });
        zone.layoutItem.items.push({ type: 0, length: 50, items: [] });
        log(JSON.stringify(this.root.layoutItem));
        this.root.reinit();
    }

    public split(zone: Zone) {
        let index = this.children.indexOf(zone);

        this.layoutItem.items.splice(index, 0, {
            type: 0,
            length: zone.layoutItem.length / 2,
            items: []
        });
        zone.layoutItem.length = zone.layoutItem.length / 2;
        log(JSON.stringify(this.root.layoutItem));
        this.root.reinit();
    }

    public adjustLayout(root: ZoneDisplay) {
        this.root = root;
        let x = this.x;
        let y = this.y;

        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            let item = child.layoutItem;
            let factor = this.layoutItem.type == 0 ? this.width : this.height;
            let length = (factor / 100) * item.length;

            let w = 0;
            let h = 0;
            if (this.layoutItem.type == 0) {
                w = length;
                h = this.height;
            } else {
                h = length;
                w = this.width;
            }
            if (child instanceof ZoneGroup) {
                child.layoutItem = item;
                child.x = x;
                child.y = y;
                child.width = w;
                child.height = h;
                (<ZoneGroup>child).adjustLayout(root);
            } else {
                child.x = x;
                child.y = y;
                child.width = w;
                child.height = h;
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
            if (item.items && item.items.length > 0) {
                let z = new ZoneGroup(item, this);
                this.children.push(z);
                z.applyLayout(root);
            } else {
                let zone = root.createZone(item, this);
                zone.margin = root.margin;
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

    public recursiveChildren(list: any[] = []): ZoneBase[] {
        for (let i = 0; i < this.children.length; i++) {
            let item = this.children[i];

            if (item instanceof ZoneGroup) {
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
        this.widget = new St.Button({ style_class: 'size-button' });
        this.widget.label = " = ";
        this.widget.visible = true;
        this.adjustSizes();
        this.widget.connect('button-press-event', () => {
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
        this.widget.connect('button-release-event', () => {
            //this.isMoving = false;

        });

        //this.widgets.push(sizeButton);
        Main.uiGroup.insert_child_above(this.widget, global.window_group);
    }

    public adjustSizes() {
        if (this.zoneGroup.layoutItem.type == 0) {
            this.widget.x = this.zoneA.x + this.zoneA.width - this.margin;
            this.widget.y = this.zoneA.y + this.margin;
            this.widget.width = this.margin * 2;
            this.widget.height = this.zoneA.height - (this.margin * 2);


        } else {
            this.widget.y = this.zoneA.y + this.zoneA.height - this.margin;
            this.widget.x = this.zoneA.x + this.margin;
            this.widget.height = this.margin * 2;
            this.widget.width = this.zoneA.width - (this.margin * 2);

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

    mouseMoved(x: number, y: number) {
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
    protected workArea: WorkArea | null;
    protected monitor: Monitor;

    public apply() {
        var c = this.recursiveChildren();
        for (var i = 0; i < c.length; i++) {
            c[i].applyPercentages();
        }
    }

    constructor(monitor: Monitor, layout: LayoutItem, margin: number) {
        super(layout, null);
        this.monitor = monitor;
        this.margin = margin;

        this.workArea = getWorkAreaByMonitor(this.monitor);
        this.init();
    }


    public destroy() {
        super.destroy();

    }

    public moveWindowToWidgetAtCursor(win: Window) {
        let [x, y] = global.get_pointer();
        let c = this.recursiveChildren();
        for (let i = 0; i < c.length; i++) {
            c[i].hide();
            if (c[i].contains(x, y)) {
                win.move_frame(true, c[i].innerX, c[i].innerY);
                win.move_resize_frame(true, c[i].innerX, c[i].innerY, c[i].innerWidth, c[i].innerHeight);
            }
        }
    }

    protected createMarginItem() {

    }

    public createZoneWidget() {

    }

    public init() {
        if (!this.workArea) {
            log(`Could not get workArea for monitor ${this.monitor.index}`);
            return;
        }

        this.x = this.margin + this.workArea.x;
        this.y = this.margin + this.workArea.y;

        this.width = this.workArea.width - (this.margin * 2);
        this.height = this.workArea.height - (this.margin * 2);
        this.applyLayout(this);
        this.adjustLayout(this);
    }


    public createZone(layout: LayoutItem, parent: ZoneGroup) {
        return new Zone(layout, parent);
    }

    public reinit() {
        let wa = getWorkAreaByMonitor(this.monitor);
        if (!this.workArea || !wa) {
            log(`Could not get workArea for monitor ${this.monitor.index}`);
            return;
        }

        if (!areEqual(this.workArea, wa)) {
            this.workArea = wa;
            this.init();
        } else {
            this.applyLayout(this);
            this.adjustLayout(this);
        }
    }
}

export class ZoneEditor extends ZoneDisplay {
    public stage: StBoxLayout | null = null;
    public motionConnection = null;
    public anchors: ZoneAnchor[];
    public isMoving: boolean = false;


    public createZone(layout: LayoutItem, parent: ZoneGroup) {
        return new EditableZone(layout, parent);
    }

    constructor(monitor: Monitor, layout: LayoutItem, margin: number) {
        super(monitor, layout, margin);
        this.anchors = [];
    }


    public init() {
        if (this.anchors == null) {
            this.anchors = [];
        }
        super.init();
        this.motionConnection = global.stage.connect("motion-event", () => {
            let [x, y] = global.get_pointer();
            for (let i = 0; i < this.anchors.length; i++) {
                this.anchors[i].mouseMoved(x, y);

            }
            for (let i = 0; i < this.anchors.length; i++) {
                this.anchors[i].adjustSizes();
            }
            this.apply();
        });
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
    constructor(monitor: Monitor, layout: LayoutItem, margin: number) {
        super(monitor, layout, margin);
    }
}

export class ZoneManager extends ZoneDisplay {
    private isShowing: boolean = false;
    private trackCursorTimeoutId: number | null = null;

    constructor(monitor: Monitor, layout: LayoutItem, margin: number) {
        super(monitor, layout, margin);
    }

    adjustLayout(root: ZoneDisplay) {
        super.adjustLayout(root);
        this.layoutWindows();
    }

    public layoutWindows() {
        let windows = getWindowsOfMonitor(this.monitor);

        for (let c = 0; c < this.children.length; c++) {
            let child = this.children[c];
            child.adjustWindows(windows);
        }
    }

    public highlightZonesUnderCursor() {
        let [x, y] = global.get_pointer();
        var children = this.recursiveChildren();
        for (const zone of children) {
            let contained = zone.contains(x, y);
            (zone as Zone).hover = contained;
        }
    }

    public show() {
        this.isShowing = true;
        super.show();
        this.trackCursorUpdates();
    }

    public hide() {
        this.isShowing = false;
        super.hide();
        this.cleanupTrackCursorUpdates();
    }

    public destroy() {
        super.destroy();
        this.cleanupTrackCursorUpdates();
    }

    private trackCursorUpdates() {
        this.trackCursorTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 25, () => {
            if (!this.isShowing) {
                return GLib.SOURCE_REMOVE;
            }
            this.highlightZonesUnderCursor();
            return GLib.SOURCE_CONTINUE;
        });
    }

    private cleanupTrackCursorUpdates() {
        if (this.trackCursorTimeoutId) {
            GLib.Source.remove(this.trackCursorTimeoutId);
            this.trackCursorTimeoutId = null;
        }
    }
}

export class TabbedZoneManager extends ZoneManager {
    constructor(monitor: Monitor, layout: LayoutItem, margin: number) {
        super(monitor, layout, margin);
    }

    public createZone(layout: LayoutItem, parent: ZoneGroup) {
        return new TabbedZone(layout, parent);
    }
}

class EntryDialogClass extends ModalDialog.ModalDialog {

    public entry: any | null;
    public label: any | null;
    public onOkay: any | null;

    public _onClose() {

        try {
            this.onOkay(this.entry.text);
        } catch (e) {

            throw e;
        }
    }
    
    constructor(params: any) {
        super(params);
        log(JSON.stringify(params));
    }

    public _init() {

        super._init({});
        this.setButtons([{
            label: "OK",
            action: () => {
                this.onOkay(this.entry.text);
                this.close(global.get_current_time());
            },
            key: Clutter.Escape
        }]);

        let box = new St.BoxLayout({ vertical: true });
        this.contentLayout.add(box);

        // const MySelf = ExtensionUtils.getCurrentExtension();
        // let gicon = new Gio.FileIcon({file: Gio.file_new_for_path(MySelf.path + "/icons/icon.png")});
        // let icon = new St.Icon({gicon: gicon});
        // box.add(icon);

        this.label = new St.Label({ text: "" });
        box.add(this.label);
        box.add(this.entry = new St.Entry({ text: "" }));

    }
}

export const EntryDialog = GObject.registerClass({
    GTypeName: 'EntryDialogClass',
}, EntryDialogClass
);
