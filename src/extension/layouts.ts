export interface WorkspaceMonitorSettings {
    current: number
};

export interface LayoutItem {
    type: number,
    length: number,
    items: LayoutItem[],
    x?: number,
    y?: number,
    w?: number,
    h?: number,
    blank?: boolean
};

export interface Layout extends LayoutItem {
    name: string,
};

export interface LayoutsSettings {
    workspaces: WorkspaceMonitorSettings[][],
    definitions: Layout[]
};


export function cloneLayoutItem(layoutItem: LayoutItem) : LayoutItem {
    return {
        ...layoutItem,
        items: layoutItem.items?.map(x => cloneLayoutItem(x)) ?? [],
    };
}

export function cloneLayout(layout: Layout) : Layout {
    return {
        ...layout,
        items: layout.items?.map(x => cloneLayoutItem(x)) ?? [],
    };
}