/**
 * storage.js — ตัวจัดการฐานข้อมูลแบบ Real-time Cloudflare D1 SQL 100%
 * ไม่บันทึกลง LocalStorage ของแต่ละเครื่อง เพื่อให้ทุกอุปกรณ์เห็นข้อมูลตรงกันตลอดเวลา
 */

// ล้างแคชเก่าใน LocalStorage ออกทันที ป้องกันข้อมูลค้างในเครื่อง
try {
  localStorage.removeItem('firetank_tanks_data');
} catch (e) {}

// ตัวแปรเก็บข้อมูลชั่วคราวใน RAM ของหน้านั้นๆ (In-Memory Cache) เพื่อความรวดเร็วในการเปิดดูรายละเอียด
let _memoryTanks = [];

// Helper: สกัดปี 4 หลัก
function extractYear(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length >= 3 && /^\d{4}/.test(parts[2])) {
      return parseInt(parts[2].slice(0, 4), 10);
    }
  }
  if (s.includes('-')) {
    const parts = s.split('-');
    if (/^\d{4}$/.test(parts[0])) {
      return parseInt(parts[0], 10);
    }
  }
  const digits = s.match(/\d{4}/);
  return digits ? parseInt(digits[0], 10) : null;
}

// Helper: สกัด Sort Key สำหรับรหัสถัง (เช่น EX01 -> EX000001)
function getTankSortKey(val) {
  if (!val) return '';
  const s = String(val).trim();
  const m = s.match(/^([A-Za-z]+)(\d+)$/);
  if (m) {
    return m[1].toUpperCase() + m[2].padStart(6, '0');
  }
  return s;
}

// Helper: ฟอร์แมตวันที่เริ่มใช้เป็น 01/01/YYYY
function formatInuseDate(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split('/');
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${d}/${m}/${y}`;
  }
  const y = extractYear(val);
  if (y) return `01/01/${y}`;
  return s;
}

// Helper: ฟอร์แมตวันที่ให้แสดงเฉพาะ dd/mm/yyyy (ไม่แสดง hh:mm:ss)
function formatDateOnly(val) {
  if (!val) return '—';
  const s = String(val).trim();
  if (!s || s === '-' || s === '—') return '—';

  const mIso = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (mIso) {
    const y = mIso[1];
    const m = mIso[2].padStart(2, '0');
    const d = mIso[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  const mDm = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (mDm) {
    const d = mDm[1].padStart(2, '0');
    const m = mDm[2].padStart(2, '0');
    const y = mDm[3];
    return `${d}/${m}/${y}`;
  }

  return s.split(' ')[0] || s;
}

// ─── ประวัติรอบเดือนและสถิติรายปี API Helpers ───
async function fetchMonthlyList() {
  try {
    const res = await fetch('/api/history/months');
    if (res.ok) return await res.json();
  } catch (e) {
    console.error('fetchMonthlyList error:', e);
  }
  return { current: null, history: [] };
}

async function fetchMonthSnapshot(monthKey) {
  try {
    const res = await fetch(`/api/history/snapshot?month=${encodeURIComponent(monthKey)}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.error('fetchMonthSnapshot error:', e);
  }
  return null;
}

async function fetchYearlyStats(year) {
  try {
    const y = year || new Date().getFullYear();
    const res = await fetch(`/api/history/yearly?year=${y}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.error('fetchYearlyStats error:', e);
  }
  return null;
}

// Helper: คำนวณอายุถัง เช่น "5ปี"
function calculateExptank(inuse, lastcheck) {
  const inuseYear = extractYear(inuse);
  const lastYear = extractYear(lastcheck) || new Date().getFullYear();
  if (inuseYear !== null) {
    const diff = Math.max(0, lastYear - inuseYear);
    return `${diff}ปี`;
  }
  return '';
}

// Helper: คำนวณจำนวนวันที่ผ่านไปนับจากวันตรวจล่าสุด
function getDaysSinceCheck(lastcheckVal) {
  if (!lastcheckVal) return null;
  const s = String(lastcheckVal).trim();
  if (!s) return null;

  let checkDate = null;
  if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.test(s)) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const y = parseInt(m[3], 10);
      const h = m[4] ? parseInt(m[4], 10) : 0;
      const mi = m[5] ? parseInt(m[5], 10) : 0;
      checkDate = new Date(y, mo, d, h, mi);
    }
  } else if (/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.test(s)) {
    const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      const h = m[4] ? parseInt(m[4], 10) : 0;
      const mi = m[5] ? parseInt(m[5], 10) : 0;
      checkDate = new Date(y, mo, d, h, mi);
    }
  }

  if (!checkDate || isNaN(checkDate.getTime())) {
    return null;
  }

  const now = new Date();
  const diffMs = now.getTime() - checkDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Helper: ตรวจสอบว่าผลการตรวจเกิน 30 วันหรือไม่
function isCheckExpired(lastcheckVal, daysThreshold = 30) {
  const days = getDaysSinceCheck(lastcheckVal);
  if (days === null) return false;
  return days >= daysThreshold;
}

// Helper: บังคับใช้กฎ 30 วัน
function applyThirtyDaysRule(tank) {
  if (!tank) return tank;
  if (tank.Tankcheck === 'เช็คแล้ว') {
    const days = getDaysSinceCheck(tank.Lastcheck);
    if (days !== null && days >= 30) {
      tank.Tankcheck = 'ยังไม่เช็ค';
      tank.IsExpired30Days = true;
      tank.DaysSinceCheck = days;
    }
  }
  return tank;
}

// Helper: บีบอัดรูปภาพก่อนส่งเข้า Cloudflare D1
function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
      const img = new Image();
      img.src = event.target.result;
      img.onload = function() {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = function(err) { resolve(event.target.result); };
    };
    reader.onerror = function(err) { reject(err); };
  });
}

// แสดงแถบแจ้งเตือนเมื่อเชื่อมต่อ Cloudflare D1 ล้มเหลว
function showD1ConnectionError(msg) {
  const alertHtml = `
    <div class="alert alert-danger alert-dismissible fade show shadow-sm my-3 border-danger" role="alert">
      <div class="d-flex align-items-center">
        <i class="bi bi-cloud-slash-fill fs-2 me-3 text-danger"></i>
        <div>
          <h6 class="alert-heading fw-bold mb-1">⚠️ ไม่สามารถเชื่อมต่อกับฐานข้อมูล Cloudflare D1 แบบ Real-time ได้</h6>
          <div class="small">${msg}</div>
          <div class="small mt-1 text-muted">กรุณาตรวจสอบว่าได้ตั้งค่า Binding ตัวแปรชื่อ <code>DB</code> ใน Cloudflare Pages แล้วหรือยัง</div>
        </div>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  const container = document.getElementById('flashAlertArea') || document.querySelector('main');
  if (container && !document.getElementById('d1ConnAlert')) {
    const div = document.createElement('div');
    div.id = 'd1ConnAlert';
    div.innerHTML = alertHtml;
    container.prepend(div);
  }
}

// ─── ดึงรายการถังทั้งหมดแบบ Real-time จาก Cloudflare D1 100% ───
async function fetchAllTanks() {
  try {
    const res = await fetch('/api/tanks');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error || err.message || `HTTP ${res.status}`;
      showD1ConnectionError(msg);
      _memoryTanks = [];
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      _memoryTanks = data.map(applyThirtyDaysRule);
      _memoryTanks.sort((a, b) => (a.FireTank || '').localeCompare(b.FireTank || '', undefined, { numeric: true, sensitivity: 'base' }));
      return _memoryTanks;
    }
    _memoryTanks = [];
    return [];
  } catch (err) {
    console.error('Database fetch failed:', err);
    showD1ConnectionError(`การเชื่อมต่อไปยัง Cloudflare D1 ขัดข้อง: ${err.message}`);
    _memoryTanks = [];
    return [];
  }
}

// ฟังก์ชันดึงถังจาก In-memory สำหรับหน้าเว็บปัจจุบัน
function getAllTanks() {
  return _memoryTanks;
}

// ดึงข้อมูลถังตาม ID
function getTankById(fireTankId) {
  if (!fireTankId) return null;
  const target = String(fireTankId).trim().toUpperCase();
  const tank = _memoryTanks.find(t => String(t.FireTank).trim().toUpperCase() === target);
  return tank ? applyThirtyDaysRule(tank) : null;
}

// ดึงข้อมูลถังตาม ID แบบ Async (มั่นใจว่าโหลดมาจาก D1 แน่นอน)
async function fetchTankById(fireTankId) {
  if (!_memoryTanks || _memoryTanks.length === 0) {
    await fetchAllTanks();
  }
  return getTankById(fireTankId);
}

// ─── บันทึกผลการตรวจเช็คสภาพถังแบบ Real-time ลง D1 ───
async function saveCheckResult(fireTankId, isReady, inspectorName, newPicDataUrl, newWeight, remark) {
  try {
    const res = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FireTank: fireTankId,
        isReady: isReady,
        inspector: inspectorName,
        newPic: newPicDataUrl,
        weight: newWeight,
        remark: remark || ''
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`⚠️ บันทึกลง Cloudflare D1 ไม่สำเร็จ: ${err.message || err.error || 'Server error'}`);
      return false;
    }

    // อัปเดตในหน่วยความจำของหน้าเว็บปัจจุบัน
    const tank = getTankById(fireTankId);
    if (tank) {
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      tank.Lastcheck = timeStr;
      tank.Tankcheck = 'เช็คแล้ว';
      tank.ReadyorNot = isReady ? 'Ready' : 'Not Ready';
      tank.TankStatus = Boolean(isReady);
      tank.Inspector = inspectorName || '';
      tank.Remark = remark || '';
      if (newWeight) tank['Weight (lb)'] = parseFloat(newWeight);
      if (newPicDataUrl) tank.PicTank = newPicDataUrl;
    }
    return true;
  } catch (e) {
    alert(`⚠️ ไม่สามารถติดต่อ Cloudflare D1 ได้: ${e.message}`);
    return false;
  }
}

// ─── เพิ่มถังใหม่แบบ Real-time ลง D1 ───
async function addTank(tankData) {
  try {
    const res = await fetch('/api/tanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tankData)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: data.message || data.error || 'บันทึกลง Cloudflare D1 ไม่สำเร็จ' };
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: `ไม่สามารถเชื่อมต่อ Cloudflare ได้: ${e.message}` };
  }
}

// ─── แก้ไขถังเดิมแบบ Real-time บน D1 ───
async function updateTank(tankId, tankData) {
  try {
    const res = await fetch('/api/tanks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tankData, FireTank: tankId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: data.message || data.error || 'อัปเดตข้อมูลบน Cloudflare D1 ไม่สำเร็จ' };
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: `ไม่สามารถเชื่อมต่อ Cloudflare ได้: ${e.message}` };
  }
}

// ─── ลบถังแบบ Real-time จาก D1 ───
async function deleteTank(tankId) {
  try {
    const res = await fetch(`/api/tanks?id=${encodeURIComponent(tankId)}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(`⚠️ ลบไม่สำเร็จ: ${data.message || data.error || 'Server error'}`);
      return false;
    }
    _memoryTanks = _memoryTanks.filter(t => String(t.FireTank).trim().toUpperCase() !== String(tankId).trim().toUpperCase());
    return true;
  } catch (e) {
    alert(`⚠️ ไม่สามารถเชื่อมต่อ Cloudflare ได้: ${e.message}`);
    return false;
  }
}

// ─── คืนค่าเริ่มต้น (Seed D1 บน Cloudflare) ───
async function resetDatabase() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user || user.PermitDo < 3) {
    alert('⚠️ เฉพาะผู้ดูแลระบบสูงสุด (Super Admin P3) เท่านั้นที่สามารถ Seed ฐานข้อมูลบน Cloudflare ได้');
    return;
  }
  if (confirm('⚠️ ต้องการ Reset & Seed ฐานข้อมูลผู้ใช้เริ่มต้นบน Cloudflare D1 หรือไม่?')) {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert('✅ Seed ข้อมูลบน Cloudflare D1 สำเร็จ');
        window.location.reload();
      } else {
        alert(`❌ ไม่สำเร็จ: ${data.message || 'Error'}`);
      }
    } catch (e) {
      alert(`เกิดข้อผิดพลาด: ${e.message}`);
    }
  }
}

// ─── Export to Excel (.xlsx) ดึงสดจาก Live D1 ───
async function exportToExcel() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user || user.PermitDo < 2) {
    alert('⚠️ คุณไม่มีสิทธิ์ส่งออกข้อมูล Excel (อนุญาตเฉพาะระดับ Admin P2 ขึ้นไป)');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('กำลังโหลดไลบรารี Excel กรุณาลองใหม่อีกครั้ง');
    return;
  }

  const tanks = await fetchAllTanks();
  if (tanks.length === 0) {
    alert('⚠️ ไม่มีข้อมูลถังในฐานข้อมูล หรือไม่สามารถเชื่อมต่อ Cloudflare D1 ได้');
    return;
  }

  const excelRows = tanks.map(t => ({
    'FireTank': t.FireTank,
    'Types': t.Types,
    'Weight (lb)': t['Weight (lb)'],
    'Area': t.Area,
    'Inuse': t.Inuse,
    'Lastcheck': t.Lastcheck,
    'Tankcheck': t.Tankcheck,
    'ReadyorNot': t.ReadyorNot,
    'TankStatus': t.TankStatus,
    'Exptank': t.Exptank,
    'PicTank': t.PicTank && t.PicTank.startsWith('data:') ? '[รูปถ่ายใหม่]' : t.PicTank,
    'PicArea': t.PicArea && t.PicArea.startsWith('data:') ? '[รูปถ่ายใหม่]' : t.PicArea,
    'Inspector': t.Inspector || '',
    'Responsible': t.Responsible || '',
    'Remark': t.Remark || ''
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows);
  XLSX.utils.book_append_sheet(wb, ws, 'FirePump');

  const now = new Date();
  const filename = `FirePump_D1_Export_${now.toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ─── Import from Excel (.xlsx) ส่งตรงเข้า D1 ───
function importFromExcel(file, callback) {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user || user.PermitDo < 2) {
    alert('⚠️ เฉพาะผู้ดูแลระบบ (Admin P2) เท่านั้นที่สามารถนำเข้าไฟล์ Excel ได้');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('ไลบรารี Excel ยังไม่พร้อม');
    return;
  }
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json && json.length > 0) {
        const importedTanks = json.map(r => ({
          FireTank: r.FireTank || r['FireTank'] || '',
          Types: r.Types || '',
          'Weight (lb)': r['Weight (lb)'] || r.Weight || null,
          Area: r.Area || '',
          Inuse: formatInuseDate(r.Inuse),
          Lastcheck: r.Lastcheck ? String(r.Lastcheck) : '',
          Tankcheck: r.Tankcheck || 'ยังไม่เช็ค',
          ReadyorNot: r.ReadyorNot || 'Not Ready',
          TankStatus: r.TankStatus === true || r.ReadyorNot === 'Ready',
          Exptank: r.Exptank || calculateExptank(r.Inuse, r.Lastcheck),
          PicTank: r.PicTank || null,
          PicArea: r.PicArea || null,
          Inspector: r.Inspector || '',
          Responsible: r.Responsible || '',
          Remark: r.Remark || ''
        })).filter(t => t.FireTank);

        let successCount = 0;
        for (const t of importedTanks) {
          try {
            const res = await fetch('/api/tanks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(t)
            });
            if (res.ok) successCount++;
          } catch (err) {}
        }

        await fetchAllTanks();
        if (callback) callback({ success: true, count: successCount });
      } else {
        if (callback) callback({ success: false, message: 'ไม่พบข้อมูลในไฟล์ Excel' });
      }
    } catch (err) {
      console.error(err);
      if (callback) callback({ success: false, message: 'รูปแบบไฟล์ไม่ถูกต้อง: ' + err.message });
    }
  };
  reader.readAsArrayBuffer(file);
}
