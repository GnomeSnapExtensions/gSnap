declare var global: any;
// @ts-ignore
import St from 'gi://St';
// @ts-ignore
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Clutter from 'gi://Clutter';

import { log } from './logging';

import {
    ClutterActor,
    StButton,
    StWidget,
    Rectangle,
    Window
} from "./gnometypes";

import { areEqual, getWorkAreaByMonitor, getTrackedWindowsOfMonitor, Monitor, WorkArea } from './monitors';

import { Layout, LayoutItem } from './layouts';

const ANIMATION_SPEED = 100; // animation speed of zones' fade-in, fade-out, position and size changes

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

    public get minWidth() {
        return 100 + this.margin * 2;
    }

    public get minHeight() {
        return 100 + this.margin * 2;
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
    private _selected: boolean = false;
    public widget!: StWidget;
    public stage: ClutterActor;

    constructor(layoutItem: LayoutItem, parent: ZoneGroup | null, stage: ClutterActor) {
        super(layoutItem, parent);
        this.createWidget();
        this.stage = stage;
        this.stage.add_child(this.widget);
    }

    // the CSS class "tile-preview" is declared by GNOME shell. It is used by
    // GNOME edge-tiling system. More info here: https://github.com/GNOME/gnome-shell/blob/7c4b1d4ae62cfc6c5b0637819d465ce8968bd944/js/ui/windowManager.js#L388
    public createWidget(styleClass: string = 'tile-preview grid-preview') {
        this.widget = new St.BoxLayout({ style_class: styleClass });
        this.widget.visible = false;
    }

    positionChanged() {
        super.positionChanged();
        this.widget.x = Math.max(0, this.innerX);
        this.widget.y = Math.max(0, this.innerY);
    }

    sizeChanged() {
        super.sizeChanged();
        this.widget.height = Math.max(0, this.innerHeight);
        this.widget.width = Math.max(0, this.innerWidth);
    }

    public hide() {
        this._selected = false;
        (this.widget as any).ease({
            opacity: 0,
            duration: ANIMATION_SPEED,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => this.widget.visible = false
        });
        this.widget.remove_style_pseudo_class('activate');
    }

    public show() {
        this.widget.visible = true;
        (this.widget as any).ease({
            opacity: 255,
            duration: ANIMATION_SPEED,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
        this.widget.add_style_pseudo_class('activate');
    }

    public set selected(value: boolean) {
        this._selected = value;
    }

    public get selected() {
        return this._selected;
    }

    public destroy() {
        this.hide();
        this.stage.remove_child(this.widget);
    }
}

export class SelectionZone extends Zone {
    private animationRunning: boolean = false;

    constructor(layoutItem: LayoutItem, parent: ZoneGroup | null, stage: ClutterActor) {
        super(layoutItem, parent, stage);
        const color = this.widget.get_theme_node().get_background_color();
        let newAlpha = Math.min(color.alpha + 35, 255);
        // since an alpha value lower than 160 is not so much visible, enforce a minimum value of 160
        if (newAlpha < 160) newAlpha = 160;
        // The final alpha value is divided by 255 since CSS needs a value from 0 to 1, but ClutterColor expresses alpha from 0 to 255
        this.widget.set_style(`
            background-color: rgba(${color.red}, ${color.green}, ${color.blue}, ${newAlpha / 255}) !important;
        `);
    }

    public move(newX: number, newY: number, newWidth: number, newHeight: number, ease: boolean = true) {
        if (this.animationRunning) return; // if the animation is still running, do not animate again

        // if both position and widths are not changed
        // then there is nothing to move o  r resize
        if (newX == this.x && 
            newY == this.y &&
            newWidth == this.width &&
            newHeight == this.height) {
            return;
        }
        
        // if the zone was never shown before, start the animation from cursor's coordinates
        if (this.innerWidth <= 0) {
            let [x, y] = global.get_pointer();
            this.widget.x = x;
            this.widget.y = y;
            this.widget.width = 0;
            this.widget.height = 0;
        }

        // update location
        this.x = newX;
        this.y = newY;
        // update sizes
        this.width = newWidth;
        this.height = newHeight;

        this.widget.visible = true;
        if (ease) { // animate with easing
            this.animationRunning = true;
            (this.widget as any).ease({
                duration: ANIMATION_SPEED,
                x: Math.max(0, this.innerX),
                y: Math.max(0, this.innerY),
                width: Math.max(0, this.innerWidth),
                height: Math.max(0, this.innerHeight),
                opacity: 255,
                transition: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => this.animationRunning = false
            });
        } else { // do not animate
            this.widget.x = Math.max(0, this.innerX);
            this.widget.y = Math.max(0, this.innerY);
            this.widget.width = Math.max(0, this.innerWidth);
            this.widget.height = Math.max(0, this.innerHeight);
            this.widget.opacity = 255;
            this.animationRunning = false;
        }
    }

    // avoid updating position automatically. Call easeMove method instead
    positionChanged() {

    }

    // avoid updating sizes automatically. Call easeMove method instead
    sizeChanged() {

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

    // the CSS class "tile-preview" is declared by GNOME shell. It is used by
    // GNOME edge-tiling system. More info here: https://github.com/GNOME/gnome-shell/blob/7c4b1d4ae62cfc6c5b0637819d465ce8968bd944/js/ui/windowManager.js#L388
    createWidget(styleClass: string = 'tile-preview grid-preview') {
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
    constructor(layoutItem: LayoutItem, parent: ZoneGroup | null, stage: ClutterActor) {
        super(layoutItem, parent, stage);
    }
    positionChanged() {
        super.positionChanged();
        this.widget.label = `${toRoundedString(this.innerWidth)}x${toRoundedString(this.innerHeight)}\n(${toRoundedString(this.layoutItem.length,2)}%)`;
    }

    sizeChanged() {
        super.sizeChanged();
        this.widget.label = `${toRoundedString(this.innerWidth)}x${toRoundedString(this.innerHeight)}\n(${toRoundedString(this.layoutItem.length,2)}%)`;
    }

    // the CSS class "tile-preview" is declared by GNOME shell. It is used by
    // GNOME edge-tiling system. More info here: https://github.com/GNOME/gnome-shell/blob/7c4b1d4ae62cfc6c5b0637819d465ce8968bd944/js/ui/windowManager.js#L388
    createWidget(styleClass: string = 'tile-preview grid-preview') {
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

        const layoutType = this.layoutItem.type == 1 ? 0 : 1;
        if(layoutType === 0 && Math.floor(zone.width / 2) < zone.minWidth) return;
        if(layoutType === 1 && Math.floor(zone.height / 2) < zone.minHeight) return;

        zone.layoutItem.type = layoutType;
        zone.layoutItem.items.push({ type: 0, length: 50, items: [] });
        zone.layoutItem.items.push({ type: 0, length: 50, items: [] });
        log(JSON.stringify(this.root.layoutItem));
        this.root.reinit();
    }

    public split(zone: Zone) {
        if(zone.layoutItem.type === 0 && Math.floor(zone.width / 2) < zone.minWidth) return;
        if(zone.layoutItem.type === 1 && Math.floor(zone.height / 2) < zone.minHeight) return;

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
        this.root = root;

        for (let i = 0; i < this.children.length; i++) {
            this.children[i].destroy();
        }
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

    constructor(protected zoneGroup: ZoneGroup, protected zoneA: ZoneBase, protected zoneB: ZoneBase, protected margin: number, protected stage: ClutterActor) {
        this.widget = new St.Button({ style_class: 'size-button' });
        this.widget.label = " = ";
        this.widget.visible = true;
        this.adjustSizes();
        this.widget.connect('button-press-event', () => {
            let [x, y] = global.get_pointer();
            this.startX = Math.floor(x);
            this.startY = Math.floor(y);
            this.isMoving = !this.isMoving;
        });

        this.stage.add_child(this.widget);
    }

    public adjustSizes() {
        if (this.zoneGroup.layoutItem.type == 0) {
            this.widget.x = Math.floor(this.zoneA.x + this.zoneA.width - (this.widget.width/2));
            this.widget.y = Math.floor(this.zoneA.y + (this.zoneA.height / 2) - (this.widget.height / 2));
        } else {
            this.widget.y = Math.floor(this.zoneA.y + this.zoneA.height - (this.widget.height/2));
            this.widget.x = Math.floor(this.zoneA.x + (this.zoneA.width / 2) - (this.widget.width/2));
        }
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
        this.stage.remove_child(this.widget);
    }

    mouseMoved(x: number, y: number) {
        if (this.isMoving) {
            if (this.zoneGroup.layoutItem.type == 0) {
                let delta = x - this.startX;
                if(delta < 0) {
                    if(this.zoneA.width + delta < this.zoneA.minWidth) { return; }
                } else {
                    if(this.zoneB.width - delta < this.zoneB.minWidth) { return; }
                }
                this.zoneA.sizeRight(delta);
                this.zoneB.sizeLeft(delta);
                this.startX = x;
            } else {
                let delta = y - this.startY;
                if(delta < 0) {
                    if(this.zoneA.height + delta < this.zoneA.minHeight) { return; }
                } else {
                    if(this.zoneB.height - delta < this.zoneB.minHeight) { return; }
                }
                
                this.zoneA.sizeBottom(delta);
                this.zoneB.sizeTop(delta);
                this.startY = y;
            }
        }
    }
}

export class ZoneDisplay extends ZoneGroup {
    protected stage: ClutterActor;
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
        this.stage = new Clutter.Actor({
            name: 'gsnap-stage',
            visible: false,
            width: 1000,
            height: 1000,
            x: 0,
            y: 0,
        });
        Main.uiGroup.insert_child_above(this.stage, global.window_group);

        this.init();
    }


    public destroy() {
        super.destroy();
        if(Main.uiGroup.get_children().indexOf(this.stage) >= 0) {
            Main.uiGroup.remove_child(this.stage);
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
        return new Zone(layout, parent, this.stage);
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

    public show(): void {
        super.show();
        this.stage.visible = true;
    }
    
    public hide(): void {
        super.hide();
        this.stage.visible = false;
    }
}

export class ZoneEditor extends ZoneDisplay {
    public motionConnection = null;
    public anchors: ZoneAnchor[];
    public isMoving: boolean = false;


    public createZone(layout: LayoutItem, parent: ZoneGroup) {
        return new EditableZone(layout, parent, this.stage);
    }

    constructor(monitor: Monitor, public layout: Layout, margin: number) {
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
            let zoneAnchor = new ZoneAnchor(z, before, after, this.margin, this.stage);
            this.anchors.push(zoneAnchor);
        }
    }

    applyLayout(root: ZoneDisplay) {
        this.stage.remove_all_children();
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
    private trackCursorTimeoutId: number | null = null;
    private isShowing: boolean = false;
    private _select_multiple_zones: boolean = false;
    private _last_selection_zone: SelectionZone;
    private animationsEnabled: boolean = true;

    constructor(monitor: Monitor, layout: LayoutItem, margin: number, animationsEnabled: boolean) {
        super(monitor, layout, margin);
        this._last_selection_zone = new SelectionZone(layout, this.parent, this.stage);
        this._last_selection_zone.margin = this.margin;
        this.animationsEnabled = animationsEnabled;
    }

    adjustLayout(root: ZoneDisplay) {
        super.adjustLayout(root);
        this.layoutWindows();
    }

    public layoutWindows() {
        let windows = getTrackedWindowsOfMonitor(this.monitor);

        for (let c = 0; c < this.children.length; c++) {
            let child = this.children[c];
            child.adjustWindows(windows);
        }
    }

    public getSelectionRect(): Rectangle | undefined {
        let [x, y] = global.get_pointer();
        // if the cursor is not inside the last selected zone,
        // then no zones have been selected since the last
        // selection were performed
        if (!this._last_selection_zone.contains(x, y)) 
            return undefined;

        return { 
            x : this._last_selection_zone.innerX, 
            y: this._last_selection_zone.innerY, 
            width: this._last_selection_zone.innerWidth, 
            height: this._last_selection_zone.innerHeight 
        } as Rectangle;
    }

    public highlightZonesUnderCursor() {
        let [x, y] = global.get_pointer();
        let children = this.recursiveChildren();
        let smallestX = x, smallestY = y, biggestX = x, biggestY = y;
        for (let i = 0; i < children.length; i++) {
            let zone = (children[i] as Zone);
            let contained = zone.contains(x, y);
            zone.selected = contained || (this._select_multiple_zones && (zone as Zone).selected);
            if (!zone.selected) continue;

            if (zone.x < smallestX) smallestX = zone.x;
            if (zone.y < smallestY) smallestY = zone.y;

            if (zone.x + zone.width > biggestX)  
                biggestX  = zone.x + zone.width;
            if (zone.y + zone.height > biggestY) 
                biggestY  = zone.y + zone.height;
        }

        if (biggestX - smallestX == 0 || biggestY - smallestY == 0) {
            return;
        }

        this._last_selection_zone.move(
            smallestX, 
            smallestY, 
            biggestX - smallestX,
            biggestY - smallestY,
            this.animationsEnabled
        );
    }

    reset_selection_zone() {
        this._last_selection_zone.x = 0;
        this._last_selection_zone.y = 0;
        this._last_selection_zone.width = 0;
        this._last_selection_zone.height = 0;
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
            this.reset_selection_zone();
            this._last_selection_zone.hide();
        }
    }

    public allow_multiple_zones_selection(value: boolean) {
        this._select_multiple_zones = value;
    }
}

export class TabbedZoneManager extends ZoneManager {
    constructor(monitor: Monitor, layout: LayoutItem, margin: number, animationsEnabled: boolean) {
        super(monitor, layout, margin, animationsEnabled);
    }

    public createZone(layout: LayoutItem, parent: ZoneGroup) {
        return new TabbedZone(layout, parent, this.stage);
    }
}
