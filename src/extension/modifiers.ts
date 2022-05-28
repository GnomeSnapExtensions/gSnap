declare var imports: any;
declare var global: any;

import {log} from './logging';

const Mainloop = imports.mainloop;

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
    private connected: {[key: string]: Function[]} = {};
    private modifiers: MODIFIERS_ENUM[] = [];

    private state: any;
    private previousState: any;

    constructor() {
        Mainloop.timeout_add(20, this.update.bind(this));
    }

    public isHolding(modifier: MODIFIERS_ENUM): boolean {
        return this.modifiers.includes(modifier);
    }

    public connect(name: string, callback: Function): number {
        if (this.connected[name] === undefined) {
            this.connected[name] = [];
        }

        return this.connected[name].push(callback);
    }

    private update(): boolean {
        const [x, y, m] = global.get_pointer();

        if (m === undefined) {
            log('m === undefined');
            return false;
        }

        this.state = m;
        if (this.state === this.previousState) {
            return true;
        }

        this.modifiers = [];

        for (let i = 0; i < 6; i++) {
            if (this.state & 1 << i && MODIFIERS[i] !== undefined) {
                this.modifiers.push(MODIFIERS[i]);
            }
        }

        for (const callback of this.connected["changed"]) {
            try {
                callback();
            } catch (e) {
                log(`error: ${e}`);
            }
        }

        this.previousState = this.state;

        return true;
    }
}