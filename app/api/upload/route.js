import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const body = await req.json();
    const { chat } = body;

    if (!chat || typeof chat !== 'object') {
      return NextResponse.json({ error: 'Invalid chat data' }, { status: 400 });
    }

    const id = Date.now().toString(); // use timestamp as unique ID
    const fileName = `${id}.json`;
    const saveDir = path.join(process.cwd(), 'public', 'saved');

    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const filePath = path.join(saveDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));

    const publicUrl = `https://threadcub.com/saved/${fileName}`;
    return NextResponse.json({ success: true, url: publicUrl });

  } catch (err) {
    console.error('❌ Upload failed:', err);
    return NextResponse.json({ error: 'Failed to upload chat' }, { status: 500 });
  }
}
