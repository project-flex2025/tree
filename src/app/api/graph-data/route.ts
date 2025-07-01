import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const nodes = searchParams.get('nodes') || '50';
    const nodeCount = parseInt(nodes);
    // Handle year range
    const currentYear = new Date().getFullYear();
    const minYear = parseInt(searchParams.get('minYear') || `${currentYear}`);
    const maxYear = parseInt(searchParams.get('maxYear') || `${currentYear}`);
    let yearsParam = `${currentYear}`;
    if (!isNaN(minYear) && !isNaN(maxYear) && minYear <= maxYear) {
      const yearsArray = [];
      for (let y = minYear; y <= maxYear; y++) yearsArray.push(y);
      yearsParam = yearsArray.join(',');
    }
    // Always fetch from external API
    const externalResponse = await fetch(
      `https://api.publications.ai/dataset/?keyword=${encodeURIComponent(keyword)}&nodes=${nodeCount}&years=${yearsParam}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!externalResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch from external API' }, { status: 502 });
    }

    const externalData = await externalResponse.json();
    if (!externalData.nodes || !externalData.links) {
      return NextResponse.json({ error: 'Invalid data from external API' }, { status: 502 });
    }

    return NextResponse.json(externalData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load graph data', details: (error as any).message },
      { status: 500 }
    );
  }
}