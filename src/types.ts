export interface File {
    name: string
    data: string
}

export interface Files {
    [file: string]: File
}