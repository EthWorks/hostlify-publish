export interface File {
    name: string
    data: Buffer
}

export interface Files {
    [file: string]: File
}

export interface Inputs {
    files: string
    id: string
    serverUrl: string
    owner: string
    repo: string
    accessToken: string
    pullNumber: number
}
