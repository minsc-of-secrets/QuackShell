// Shared type definitions for QuackShell client

export interface ColumnSchema {
    name: string;
    type: string;
}

export interface TableSchema {
    name: string;
    type: 'table' | 'file';
    columns: ColumnSchema[];
}

export interface QueryResult {
    rows: Record<string, any>[];
    schema?: ColumnSchema[];
}

export interface SavedQuery {
    id: string;
    name: string;
    sql: string;
    timestamp: number;
}

export interface QueryTab {
    id: string;
    name: string;
    sql: string;
}
