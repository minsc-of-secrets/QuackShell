// Shared type definitions for QuackShell server

export interface ColumnSchema {
    name: string;
    type: string;
}

export interface TableSchema {
    name: string;
    columns: ColumnSchema[];
    type: 'table' | 'file';
}

export interface SchemaRow {
    table_name: string;
    column_name: string;
    data_type: string;
}

export interface DescribeRow {
    column_name: string;
    column_type: string;
}

export interface ErrorResponse {
    error: string;
}
