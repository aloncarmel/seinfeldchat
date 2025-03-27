declare module 'parquetjs-lite' {
  export class ParquetReader {
    static openFile(path: string): Promise<ParquetReader>;
    getCursor(): Cursor;
    close(): Promise<void>;
  }

  export class Cursor {
    next(): Promise<any>;
  }
} 