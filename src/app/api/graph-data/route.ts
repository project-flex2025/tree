import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    // Path to your JSON file in the public folder
    const jsonDirectory = path.join(process.cwd(), 'public');
    const fileContents = await fs.readFile(jsonDirectory + '/data.json', 'utf8');
    const medicalDataset = JSON.parse(fileContents);
    
    return NextResponse.json(medicalDataset);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    return NextResponse.json(
      { error: 'Failed to load graph data' },
      { status: 500 }
    );
  }
}