/**
 * functions/api/history/snapshot.js — Cloudflare Pages Functions
 * API: 
 *   GET /api/history/snapshot?month=YYYY-MM
 *   DELETE /api/history/snapshot?month=YYYY-MM&requestorPermit=3
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const targetKey = url.searchParams.get('month');
    if (!targetKey) {
      return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุเดือน' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const row = await env.DB.prepare('SELECT * FROM monthly_snapshots WHERE month_key = ?').bind(targetKey).first();
    if (!row) {
      return new Response(JSON.stringify({ success: false, message: 'ไม่พบข้อมูลของรอบเดือนที่ระบุ' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    let parsedData = [];
    try {
      parsedData = JSON.parse(row.snapshot_data);
    } catch(e) {}

    return new Response(JSON.stringify({
      success: true,
      snapshot: {
        month_key: row.month_key,
        month_label: row.month_label,
        total_tanks: row.total_tanks,
        checked_tanks: row.checked_tanks,
        not_checked_tanks: row.not_checked_tanks,
        ready_tanks: row.ready_tanks,
        not_ready_tanks: row.not_ready_tanks,
        archived_at: row.archived_at,
        is_closed: Boolean(row.is_closed)
      },
      tanks: parsedData
    }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const permit = parseInt(url.searchParams.get('requestorPermit') || '0', 10);
    if (permit < 3) {
      return new Response(JSON.stringify({ success: false, message: 'เฉพาะผู้ดูแลระบบระดับ Super Admin (P3) เท่านั้น' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    const targetKey = url.searchParams.get('month');
    if (!targetKey) {
      return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุเดือน' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    await env.DB.prepare('DELETE FROM monthly_snapshots WHERE month_key = ?').bind(targetKey).run();
    return new Response(JSON.stringify({ success: true, message: `ลบข้อมูลรอบเดือน ${targetKey} สำเร็จ` }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
