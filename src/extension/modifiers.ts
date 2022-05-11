declare var imports: any;
declare var global: any;

import {log} from './logging';

const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;

export enum MODIFIERS_ENUM {
    SHIFT,
    CONTROL = 2,
    ALT = 3,
    SUPER = 6
}

export const MODIFIERS: {[key: number]: MODIFIERS_ENUM} = {
    0: MODIFIERS_ENUM.SHIFT,
    2: MODIFIERS_ENUM.CONTROL,
    3: MODIFIERS_ENUM.ALT,
    6: MODIFIERS_ENUM.SUPER
};

export default class ModifiersManager {
    private modifiers: MODIFIERS_ENUM[] = [];

    private state: any;
    private previousState: any;

    private latch: any;
    private previousLatch: any;

    private lock: any;
    private previousLock: any;

    private seat: any;

    constructor() {
        try {
            this.seat = Clutter.get_default_backend().get_default_seat();
        } catch (e) {
            this.seat = Clutter.DeviceManager.get_default();
        };
        
        if (this.seat) {
            this.seat.connect("kbd-a11y-mods-state-changed", this.a11yModsUpdate.bind(this));
        };

        Mainloop.timeout_add(200, this.update.bind(this));
    }

    public isHolding(modifier: MODIFIERS_ENUM): boolean {
        return this.modifiers.includes(modifier);
    }

    private a11yModsUpdate(o: any, latch: any, lock: any): void {
        if (typeof latch !== 'undefined') {
            this.latch = latch;
        };

        if (typeof lock !== 'undefined') {
            this.lock = lock;
        };
    }

    private update(): boolean {
        const [x, y, m] = global.get_pointer();

        if (typeof m !== 'undefined') {
            this.state = m;
        };

        if (this.state === this.previousState && this.latch === this.previousLatch && this.lock === this.previousLock) {
            return true;
        }

        for (let i = 0; i < 6; i++) {
            if ((this.state & 1 << i || this.lock & 1 << i) && MODIFIERS[i] !== undefined) {
                this.modifiers.push(MODIFIERS[i]);
            }
        }

        this.previousState = this.state;
        this.previousLatch = this.latch;
        this.previousLock = this.lock;

        return true;
    }
}