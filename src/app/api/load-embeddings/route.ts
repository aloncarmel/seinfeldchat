import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import parquet from 'parquetjs-lite';

let cachedEmbeddings: any = null;

export async function GET() {
  if (cachedEmbeddings) {
    return NextResponse.json(cachedEmbeddings);
  }

  try {
    const parquetPath = path.join(process.cwd(), 'public', 'data', 'seinfeld_embeddings.parquet');
    const reader = await parquet.ParquetReader.openFile(parquetPath);
    
    const cursor = reader.getCursor();
    const records: { text: string; embedding: number[] }[] = [];
    
    let record = null;
    while (record = await cursor.next()) {
      records.push({
        text: record.text,
        embedding: record.embedding
      });
    }
    
    await reader.close();
    cachedEmbeddings = records;
    
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error loading embeddings:', error);
    return NextResponse.json({ error: 'Failed to load embeddings' }, { status: 500 });
  }
} 