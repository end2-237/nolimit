import { NextRequest, NextResponse } from 'next/server';

const ADMIN_KEY = process.env.SITE_ADMIN_KEY || '';

export function corsHeaders(origin?: string | null) {
  // Allow any origin for admin routes — SNL can be on any domain
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Key',
  };
}

export function checkAdmin(req: NextRequest): NextResponse | null {
  const key = req.headers.get('x-admin-key');
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export function optionsResponse(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  });
}
