export interface WorkspaceMonitorSettings {
    current: number
};

export interface LayoutItem {
    type: number,
    length: number,
    items: LayoutItem[]
};

export interface Layout extends LayoutItem{
    name: string,
};

export interface LayoutsSettings {
    workspaces: WorkspaceMonitorSettings[][],
    definitions: Layout[]
};