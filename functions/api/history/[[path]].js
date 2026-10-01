/**
 * functions/api/history/[[path]].js — Catch-all for /api/history/*
 */
import { onRequestGet as getMonths } from './months.js';
import { onRequestGet as getSnapshot, onRequestDelete as deleteSnapshot } from './snapshot.js';
import { onRequestGet as getYearly } from './yearly.js';
import { onRequestPost as postSeedMonth } from './seed-month.js';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/\/$/, '');
  const method = context.request.method.toUpperCase();

  if (path.endsWith('/months') && method === 'GET') {
    return getMonths(context);
  }
  if (path.endsWith('/snapshot')) {
    if (method === 'GET') return getSnapshot(context);
    if (method === 'DELETE') return deleteSnapshot(context);
  }
  if (path.endsWith('/yearly') && method === 'GET') {
    return getYearly(context);
  }
  if (path.endsWith('/seed-month') && method === 'POST') {
    return postSeedMonth(context);
  }

  return new Response(JSON.stringify({ success: false, message: 'API Route not found: ' + url.pathname }), {
    status: 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
