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
    public outerX: number = 0;
    public outerY: number = 0;
    public outerWidth: number = 0;
    public outerHeight: number = 0;

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

    public x(v: number | null = null): number {
        return 0;
    }

    public y(v: number | null = null): number {
        return 0;
    }

    public applyPercentages() {
        if (this.parent.layoutItem.type == 0) {
            let factor = this.parent.width() / this.totalWidth();
            this.layoutItem.length = 100 / factor;
        } else {
            let factor = this.parent.height() / this.totalHeight();
            this.layoutItem.length = 100 / factor;
        }
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
       
        this.createWidget(styleClass);
        Main.uiGroup.add_child(this.widget);
    }
    public createWidget(styleClass: string = 'grid-preview') {
        this.widget = new St.BoxLayout({style_class: styleClass});
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
export class EditableZone extends Zone {
    createWidget(styleClass: string = 'grid-preview'){
        this.widget = new St.Button({style_class: styleClass});
        this.widget.connect('button-press-event', Lang.bind(this, (actor, event) => {
            var btn = event.get_button();
            if (btn == 1) {
                log("Splitting");
                if (this.layoutItem.items == null) {
                    this.layoutItem.items = [];
                }
                this.layoutItem.items.push({
                    type: this.layoutItem.type == 1 ? 0 : 1,
                    length: 50,
                });
                this.layoutItem.items.push({
                    type: this.layoutItem.type == 1 ? 0 : 1,
                    length: 50,
                });
                this.parent.root.applyLayout(this.parent.root);
                //this.parent.root.init();    
            }
            if (btn == 2) {
                this.parent.layoutItem.type =this.parent.layoutItem.type == 1 ? 0 : 1; 
                // var index = this.parent.layoutItem.items.indexOf(this.layoutItem);
                // log("Removing index " + index);
                // this.parent?.layoutItem.items.splice(index, 1);
                //this.parent.root.destroy();
                //this.parent.applyLayout(this.parent.root);
                this.parent.root.applyLayout(this.parent.root);

            }
            if (btn == 3) {
                this.parent.layoutItem.items = null;
                // var index = this.parent.layoutItem.items.indexOf(this.layoutItem);
                // log("Removing index " + index);
                // this.parent?.layoutItem.items.splice(index, 1);
                //this.parent.root.destroy();
                //this.parent.applyLayout(this.parent.root);
                this.parent.root.applyLayout(this.parent.root);
                
            }
        }));
    }
}
export class ZoneGroup extends ZoneBase {
    public children: ZoneBase[] = [];
    public _x: number = 0;
    public _y: number = 0;
    public _width: number = 0;
    public _height: number = 0;
    public root: ZoneDisplay;

    constructor(parent:ZoneGroup | null = null) {
        super();
        this.parent = parent;
    }
    
    contains(x: number, y: number, width: number = 1, height: number = 1): boolean {
        return false;
    }

    totalHeight(): number {
        return this.outerHeight;
    }

    totalWidth(): number {
        return this.outerWidth;
    }

    public applyLayout(root: ZoneDisplay) {
        this.destroy();
        this.root = root;
        let x = this.x();
        let y = this.y();
        for (let i = 0; i < this.layoutItem.items.length; i++) {
            let item = this.layoutItem.items[i];

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
            if (item.items) {

                let z = new ZoneGroup(this);
                z.margin = this.margin;
                z.layoutItem = item;
                z.outerX = x;
                z.outerY = y;
                z.outerWidth = w;
                z.outerHeight = h;

                z.x(x);
                z.y(y);
                z.width(w);
                z.height(h);
                z.parent = this;
                this.children.push(z);
                z.applyLayout(root);
             
            } else {
                let zone = root.createZone();
                zone.layoutItem = item;
                zone.margin = this.margin;
                zone.outerX = x;
                zone.outerY = y;
                zone.outerWidth = w;
                zone.outerHeight = h;
                zone.x(x + this.margin);
                zone.y(y + this.margin);
                zone.width(w - ( this.margin * 2));
                zone.height(h - ( this.margin * 2));
                zone.parent = this;
                this.children.push(zone);
                root.zoneCreated(zone);
            }
            
            if (this.layoutItem.type == 0) {
                x += length;
            } else {
                y += length;
            }
        }
        root.zoneGroupCreated(this);
        this.show();

    }
    protected zoneGroupCreated(z: ZoneGroup) {

    }

    protected zoneCreated(zone: Zone) {

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
        this.outerWidth = v + (this.margin * 2);
        return this._width = v;
    }

    public height(v: number | null = null): number {
        if (v == null) return this._height;
        this.outerHeight = v + (this.margin * 2);
        return this._height = v;
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


        } else {
            this.widget.y = this.zoneA.y() + this.zoneA.height();
            this.widget.x = this.zoneA.x();
            this.widget.height = this.margin * 2;
            this.widget.width = this.zoneA.width();

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
                win.move_frame(true, c[i].x(), c[i].y());
                win.move_resize_frame(true, c[i].x(), c[i].y(), c[i].width(), c[i].height());
            }
        }
    }

    protected createMarginItem(layout: any, h: number, startY: number, x: number, margin: number, w: number, y: number, startX: number) {

    }

    public createZoneWidget(layout: any, layoutItem: any, x: number, y: number, width: number, height: number) {

    }

    public totalWidth(): number {
        return this.width() + (this.margin * 2);
    }

    public totalHeight(): number {
        return this.height() + (this.margin * 2) + 30;
    }

    public init() {
        let [displayWidth, displayHeight] = global.display.get_size();
        this.x(this.margin);
        this.y(this.margin + 30);

        this.width(displayWidth - (this.margin * 2));
        this.height(displayHeight - 30 - (this.margin * 2));
        this.outerHeight = this.height();
        this.outerWidth = this.width();
        this.applyLayout(this);
        
    }
    public createZone() {
        return new Zone();
    }
  
}

export class ZoneEditor extends ZoneDisplay {
    public stage: StBoxLayout | null = null;
    public motionConnection = null;
    public anchors: ZoneAnchor[];
    public isMoving: boolean = false;

    public apply() {
        var c = this.recursiveChildren();
        for (var i = 0; i < c.length; i++) {
            c[i].applyPercentages();
        }
    }
    public createZone() {
        return new EditableZone();
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

            }
        );
    }

    public destroy() {
        global.stage.disconnect(this.motionConnection);
        super.destroy();
        for (let i = 0; i < this.anchors.length; i++) {
            this.anchors[i].destroy();
        }
        this.anchors = [];
       

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
            let zoneAnchor = new ZoneAnchor(z, z.children[i - 1], z.children[i], this.margin);
            this.anchors.push(zoneAnchor);
        }
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


