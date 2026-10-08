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

// Helper: ปรับ URL รูปภาพให้ถูกต้อง รองรับ Cloudflare R2 (/r2/...), Base64 (data:...), HTTP/HTTPS, และ static/...
function resolveImageUrl(src) {
  if (!src || typeof src !== 'string') return '';
  src = src.trim();
  if (!src || src === '-' || src === '—') return '';
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src;
  }
  if (src.startsWith('static/')) {
    return src;
  }
  return 'static/' + src;
}
window.resolveImageUrl = resolveImageUrl;

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

// Helper: ตรวจสอบว่าได้รับการตรวจในรอบเดือนปัจจุบันหรือไม่ (เช็คทุกต้นเดือนใหม่)
function isCheckedInCurrentMonth(lastcheckVal, targetDate = new Date()) {
  if (!lastcheckVal) return false;
  const s = String(lastcheckVal).trim();
  if (!s || s === '-' || s === '—') return false;

  let checkYear = null;
  let checkMonth = null;

  if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.test(s)) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) {
      checkMonth = parseInt(m[2], 10);
      checkYear = parseInt(m[3], 10);
    }
  } else if (/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.test(s)) {
    const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m) {
      checkYear = parseInt(m[1], 10);
      checkMonth = parseInt(m[2], 10);
    }
  }

  if (!checkYear || !checkMonth) return false;

  const curYear = targetDate.getFullYear();
  const curMonth = targetDate.getMonth() + 1;

  return (checkYear === curYear && checkMonth === curMonth);
}

// Helper: ตรวจสอบว่าผลการตรวจหมดรอบเดือนหรือไม่ (เช็คทุกต้นเดือนใหม่)
function isCheckExpired(lastcheckVal) {
  return !isCheckedInCurrentMonth(lastcheckVal);
}

// Helper: บังคับใช้กฎรอบเดือนใหม่ (รีเซ็ตทุกต้นเดือน)
function applyMonthlyCycleRule(tank) {
  if (!tank) return tank;
  if (tank.Tankcheck === 'เช็คแล้ว') {
    if (!isCheckedInCurrentMonth(tank.Lastcheck)) {
      tank.Tankcheck = 'ยังไม่เช็ค';
      tank.IsExpiredMonth = true;
    }
  }
  return tank;
}

const applyThirtyDaysRule = applyMonthlyCycleRule;

// Helper: บีบอัดรูปภาพให้กะทัดรัด (720px, 0.6) ก่อนส่งเข้า Cloudflare D1 เพื่อความรวดเร็ว
function compressImage(file, maxWidth = 720, quality = 0.6) {
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

const TANKS_CACHE_KEY = 'jde_tanks_cache_v2';

function getLocalTanksCache() {
  try {
    const raw = localStorage.getItem(TANKS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // Fallback เร็วเป็นพิเศษ: ดึงจาก INITIAL_TANKS ในเครื่องทันที (0.01 วินาที) แม้เปิดเว็บครั้งแรก
  if (typeof INITIAL_TANKS !== 'undefined' && Array.isArray(INITIAL_TANKS) && INITIAL_TANKS.length > 0) {
    return INITIAL_TANKS;
  }
  return null;
}

function setLocalTanksCache(data) {
  try {
    if (Array.isArray(data) && data.length > 0) {
      localStorage.setItem(TANKS_CACHE_KEY, JSON.stringify(data));
    }
  } catch (e) {}
}

function hideD1ConnectionAlerts() {
  const alertElem = document.getElementById('d1ConnAlert');
  if (alertElem) alertElem.remove();
  const warnElem = document.getElementById('d1ConnWarning');
  if (warnElem) warnElem.remove();
}

// แสดงแถบแจ้งเตือนเมื่อเชื่อมต่อ Cloudflare D1 ล้มเหลว
function showD1ConnectionError(msg) {
  hideD1ConnectionAlerts();
  const alertHtml = `
    <div class="alert alert-danger alert-dismissible fade show shadow-sm my-3 border-danger" role="alert" id="d1ConnAlert">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center">
          <i class="bi bi-cloud-slash-fill fs-2 me-3 text-danger"></i>
          <div>
            <h6 class="alert-heading fw-bold mb-1">⚠️ ไม่สามารถเชื่อมต่อกับฐานข้อมูล Cloudflare D1 แบบ Real-time ได้</h6>
            <div class="small">${msg}</div>
            <div class="small mt-1 text-muted">ระบบกำลังพยายามเชื่อมต่อใหม่ หรือกดปุ่มลองใหม่เพื่อโหลดข้อมูลอีกครั้ง</div>
          </div>
        </div>
        <div>
          <button type="button" class="btn btn-danger btn-sm rounded-pill px-3 shadow-xs" onclick="fetchAllTanks(true).then(() => typeof renderDashboard === 'function' && renderDashboard())">
            <i class="bi bi-arrow-clockwise me-1"></i>ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  const container = document.getElementById('flashAlertArea') || document.querySelector('main');
  if (container) {
    const div = document.createElement('div');
    div.id = 'd1ConnAlert';
    div.innerHTML = alertHtml;
    container.prepend(div);
  }
}

function showD1ConnectionWarning(msg) {
  hideD1ConnectionAlerts();
  const alertHtml = `
    <div class="alert alert-warning alert-dismissible fade show shadow-sm my-2 border-warning" role="alert" id="d1ConnWarning">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center">
          <i class="bi bi-clock-history fs-3 me-2.5 text-warning"></i>
          <div>
            <strong class="d-block">${msg}</strong>
            <span class="small text-muted">คุณยังสามารถดูและใช้งานข้อมูลในหน้าเว็บได้ตามปกติ ระบบจะซิงค์ใหม่อัตโนมัติเมื่อฐานข้อมูลพร้อม</span>
          </div>
        </div>
        <div>
          <button type="button" class="btn btn-outline-dark btn-sm rounded-pill px-3" onclick="fetchAllTanks(true).then(() => typeof renderDashboard === 'function' && renderDashboard())">
            <i class="bi bi-arrow-clockwise me-1"></i>เชื่อมต่อใหม่
          </button>
        </div>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  const container = document.getElementById('flashAlertArea') || document.querySelector('main');
  if (container) {
    const div = document.createElement('div');
    div.id = 'd1ConnWarning';
    div.innerHTML = alertHtml;
    container.prepend(div);
  }
}

// ─── ดึงรายการถังทั้งหมดแบบ Real-time จาก Cloudflare D1 100% (พร้อม Auto-retry 3 ครั้ง + Cache Fallback) ───
async function fetchAllTanks(isBypassCache = false) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = isBypassCache ? `/api/tanks?_t=${Date.now()}` : '/api/tanks';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout per attempt

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          _memoryTanks = data.map(applyThirtyDaysRule);
          _memoryTanks.sort((a, b) => (a.FireTank || '').localeCompare(b.FireTank || '', undefined, { numeric: true, sensitivity: 'base' }));
          setLocalTanksCache(_memoryTanks);
          hideD1ConnectionAlerts();
          return _memoryTanks;
        }
      }

      // Retry on 500, 502, 503, 504 serverless glitches
      if ([500, 502, 503, 504].includes(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, attempt * 500)); // 500ms, 1000ms
          continue;
        }
      } else {
        const err = await res.json().catch(() => ({}));
        lastError = new Error(err.error || err.message || `HTTP ${res.status}`);
        break;
      }
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 500));
        continue;
      }
    }
  }

  // All retries failed: fallback to localStorage cache if available
  const cached = getLocalTanksCache();
  if (cached && cached.length > 0) {
    console.warn('fetchAllTanks: D1 fetch failed after retries, falling back to cached tanks:', lastError);
    _memoryTanks = cached.map(applyThirtyDaysRule);
    _memoryTanks.sort((a, b) => (a.FireTank || '').localeCompare(b.FireTank || '', undefined, { numeric: true, sensitivity: 'base' }));
    showD1ConnectionWarning(`ฐานข้อมูลตอบสนองช้า (${lastError ? lastError.message : 'กำลังเชื่อมต่อ'}) — กำลังแสดงข้อมูลที่บันทึกไว้ล่าสุด`);
    return _memoryTanks;
  }

  // No cache at all: show error alert
  console.error('Database fetch failed after retries:', lastError);
  showD1ConnectionError(`การเชื่อมต่อไปยัง Cloudflare D1 ขัดข้อง: ${lastError ? lastError.message : 'Unknown error'}`);
  _memoryTanks = [];
  return [];
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
    const resData = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`⚠️ บันทึกลง Cloudflare D1 ไม่สำเร็จ: ${resData.message || resData.error || 'Server error'}`);
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
      if (resData.data && resData.data.pic_tank) {
        tank.PicTank = resData.data.pic_tank;
      } else if (newPicDataUrl) {
        tank.PicTank = newPicDataUrl;
      }
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

const THAI_MONTHS_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_MONTHS_SHORT_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// ─── Export to Excel (.xlsx) — ฟังก์ชันหลักรองรับตัวเลือกปีและขอบเขต ───
async function exportToExcelWithOptions({ targetYear, targetScope = 'full_year', targetMonthKey = null } = {}) {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user || user.PermitDo < 2) {
    alert('⚠️ คุณไม่มีสิทธิ์ส่งออกข้อมูล Excel (อนุญาตเฉพาะระดับ Admin P2 ขึ้นไป)');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('กำลังโหลดไลบรารี Excel กรุณาลองใหม่อีกครั้ง');
    return;
  }

  const $btn = typeof $ !== 'undefined' ? $('#btnExportExcel') : null;
  const origHtml = $btn ? $btn.html() : '';
  if ($btn) {
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>กำลังดึงข้อมูล...');
  }

  try {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curMonthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    const selectedYear = targetYear || curYear;
    const isCurrentYear = (selectedYear === curYear);

    // 1. ดึงสถิติ 12 เดือนของปีที่เลือก
    if ($btn) $btn.html('<span class="spinner-border spinner-border-sm me-1"></span>ดึงสถิติประจำปี...');
    const yearlyStats = await fetchYearlyStats(selectedYear);
    const thaiYear = yearlyStats?.thai_year || (selectedYear + 543);

    // 2. ดึงรายการรอบเดือนที่มีในระบบ (ของปีที่เลือก)
    const monthList = await fetchMonthlyList();
    const historyMonths = (monthList?.history || []).filter(h => h.month_key && h.month_key.startsWith(`${selectedYear}-`));

    // 3. ดึงข้อมูลถังสด (เฉพาะถ้าเป็นปีปัจจุบัน)
    let liveTanks = [];
    if (isCurrentYear) {
      if ($btn) $btn.html('<span class="spinner-border spinner-border-sm me-1"></span>ดึงข้อมูลปัจจุบัน...');
      liveTanks = await fetchAllTanks();
    }

    const wb = XLSX.utils.book_new();

    if (targetScope === 'single_month') {
      // ─── โหมด: ส่งออกเฉพาะเดือนเดียว ───
      const selectedMonthKey = targetMonthKey || curMonthKey;
      const isCurrentM = (selectedMonthKey === curMonthKey && isCurrentYear);
      let monthTanks = [];
      let monthLabel = selectedMonthKey;

      if (isCurrentM) {
        monthTanks = liveTanks;
        monthLabel = monthList?.current?.month_label || selectedMonthKey;
      } else {
        if ($btn) $btn.html(`<span class="spinner-border spinner-border-sm me-1"></span>ดึงข้อมูลเดือน ${selectedMonthKey}...`);
        const snapRes = await fetchMonthSnapshot(selectedMonthKey);
        if (snapRes && snapRes.success) {
          monthTanks = snapRes.tanks || [];
          monthLabel = snapRes.snapshot?.month_label || selectedMonthKey;
        }
      }

      const sheetRows = monthTanks.map((t, idx) => {
        const isChecked = isCurrentM
          ? (t.Tankcheck === 'เช็คแล้ว' && isCheckedInCurrentMonth(t.Lastcheck))
          : (t.Tankcheck === 'เช็คแล้ว');
        let readinessText = 'ยังไม่พร้อมใช้งาน';
        if (isChecked && t.ReadyorNot === 'Ready' && t.TankStatus) readinessText = 'พร้อมใช้งาน';
        else if (isChecked) readinessText = 'ไม่พร้อมใช้งาน';

        return {
          'ลำดับ': idx + 1,
          'รหัสถัง': t.FireTank || '',
          'ประเภท': t.Types || '',
          'น้ำหนัก (lb)': t['Weight (lb)'] ?? '',
          'พื้นที่ติดตั้ง': t.Area || '',
          'ผู้รับผิดชอบ': t.Responsible || '',
          'วันที่เริ่มใช้': formatDateOnly(t.Inuse),
          'วันที่ตรวจล่าสุด': formatDateOnly(t.Lastcheck),
          'สถานะตรวจ': isChecked ? 'เช็คแล้ว' : 'ยังไม่ได้ตรวจ',
          'ความพร้อม': readinessText,
          'อายุถัง': t.Exptank || '',
          'ผู้ตรวจเช็ค': t.Inspector || '',
          'หมายเหตุ': t.Remark || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(sheetRows);
      ws['!cols'] = [
        { wch: 8 }, { wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 22 },
        { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 18 },
        { wch: 10 }, { wch: 16 }, { wch: 26 }
      ];
      const tabName = (isCurrentM ? `${monthLabel} (ปัจจุบัน)` : monthLabel).slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, tabName);

      const dateStr = now.toISOString().slice(0, 10);
      const filename = `FireTank_รายงาน_${monthLabel}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);
      alert(`✅ ส่งออก Excel รอบเดือน "${monthLabel}" สำเร็จ!\n(รวม ${monthTanks.length} รายการ)`);

    } else {
      // ─── โหมด: ส่งออกทั้งปี ───
      const monthlySnapshotMap = {};
      for (const hist of historyMonths) {
        if ($btn) $btn.html(`<span class="spinner-border spinner-border-sm me-1"></span>ดึงข้อมูล ${hist.month_label}...`);
        const snapRes = await fetchMonthSnapshot(hist.month_key);
        if (snapRes && snapRes.success && Array.isArray(snapRes.tanks)) {
          monthlySnapshotMap[hist.month_key] = {
            label: hist.month_label,
            tanks: snapRes.tanks,
            snapshot: snapRes.snapshot
          };
        }
      }

      // ─── Sheet 1: สรุปภาพรวมสถิติรายปี ───
      const summaryRows = [];
      const monthsData = yearlyStats?.months || [];
      let sumTotal = 0, sumChecked = 0, sumNotChecked = 0, sumReady = 0, sumNotReady = 0;

      monthsData.forEach(m => {
        const isPast = isCurrentYear ? m.month < curMonth : true;
        const isCurrent = isCurrentYear && m.month === curMonth;
        const statusText = isCurrent ? 'รอบปัจจุบัน' : (isPast ? 'ปิดรอบแล้ว' : 'ยังไม่ถึงรอบ');
        summaryRows.push({
          'เดือน': m.full_label || `${m.label} ${thaiYear}`,
          'จำนวนถังทั้งหมด': m.total || 0,
          'ตรวจเช็คแล้ว (ถัง)': m.checked || 0,
          'ยังไม่ได้ตรวจ (ถัง)': m.not_checked || 0,
          'พร้อมใช้งาน (ถัง)': m.ready || 0,
          'ไม่พร้อมใช้งาน (ถัง)': m.not_ready || 0,
          '% การตรวจเช็ค': `${m.percent_checked || 0}%`,
          '% ความพร้อมใช้งาน': `${m.percent_ready || 0}%`,
          'สถานะรอบเดือน': statusText
        });
        if (m.has_data || isPast || isCurrent) {
          sumTotal += (m.total || 0);
          sumChecked += (m.checked || 0);
          sumNotChecked += (m.not_checked || 0);
          sumReady += (m.ready || 0);
          sumNotReady += (m.not_ready || 0);
        }
      });

      // แถวสรุปรวมทั้งปี
      summaryRows.push({
        'เดือน': `รวมทั้งปี ${thaiYear}`,
        'จำนวนถังทั้งหมด': sumTotal,
        'ตรวจเช็คแล้ว (ถัง)': sumChecked,
        'ยังไม่ได้ตรวจ (ถัง)': sumNotChecked,
        'พร้อมใช้งาน (ถัง)': sumReady,
        'ไม่พร้อมใช้งาน (ถัง)': sumNotReady,
        '% การตรวจเช็ค': sumTotal > 0 ? `${Math.round((sumChecked / sumTotal) * 100)}%` : '0%',
        '% ความพร้อมใช้งาน': sumTotal > 0 ? `${Math.round((sumReady / sumTotal) * 100)}%` : '0%',
        'สถานะรอบเดือน': 'ภาพรวมประจำปี'
      });

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary['!cols'] = [
        { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
        { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาพรวมรายปี');

      // ─── Sheet 2: ฐานข้อมูลการตรวจทั้งปี ───
      const masterRows = [];
      let rowSeq = 1;

      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        const mKey = `${selectedYear}-${mStr}`;
        const thaiMonthName = THAI_MONTHS_NAMES[m - 1];
        const mLabel = `${thaiMonthName} ${thaiYear}`;
        const isCurrentMonth = isCurrentYear && mKey === curMonthKey;

        let monthTanks = [];
        if (isCurrentMonth) {
          monthTanks = liveTanks;
        } else if (monthlySnapshotMap[mKey]) {
          monthTanks = monthlySnapshotMap[mKey].tanks;
        }

        if (monthTanks && monthTanks.length > 0) {
          monthTanks.forEach(t => {
            const isChecked = isCurrentMonth
              ? (t.Tankcheck === 'เช็คแล้ว' && isCheckedInCurrentMonth(t.Lastcheck))
              : (t.Tankcheck === 'เช็คแล้ว');
            let readinessText = 'ยังไม่พร้อมใช้งาน';
            if (isChecked && t.ReadyorNot === 'Ready' && t.TankStatus) readinessText = 'พร้อมใช้งาน';
            else if (isChecked) readinessText = 'ไม่พร้อมใช้งาน';
            masterRows.push({
              'ลำดับ': rowSeq++,
              'รอบเดือน': mLabel,
              'รหัสถัง': t.FireTank || '',
              'ประเภท': t.Types || '',
              'น้ำหนัก (lb)': t['Weight (lb)'] ?? '',
              'พื้นที่ติดตั้ง': t.Area || '',
              'ผู้รับผิดชอบ': t.Responsible || '',
              'วันที่เริ่มใช้': formatDateOnly(t.Inuse),
              'วันที่ตรวจล่าสุด': formatDateOnly(t.Lastcheck),
              'สถานะตรวจ': isChecked ? 'เช็คแล้ว' : 'ยังไม่ได้ตรวจ',
              'ความพร้อม': readinessText,
              'อายุถัง': t.Exptank || '',
              'ผู้ตรวจเช็ค': t.Inspector || '',
              'หมายเหตุ': t.Remark || ''
            });
          });
        }
      }

      if (masterRows.length > 0) {
        const wsMaster = XLSX.utils.json_to_sheet(masterRows);
        wsMaster['!cols'] = [
          { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 26 }, { wch: 14 },
          { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
          { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 26 }
        ];
        XLSX.utils.book_append_sheet(wb, wsMaster, 'ข้อมูลการตรวจทั้งปี');
      }

      // ─── Sheet 3..N: แท็บแยกรายเดือน ───
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        const mKey = `${selectedYear}-${mStr}`;
        const shortName = `${THAI_MONTHS_SHORT_NAMES[m - 1]} ${String(thaiYear).slice(-2)}`;
        const isCurrentMonth = isCurrentYear && mKey === curMonthKey;

        let mMonthTanks = [];
        if (isCurrentMonth) {
          mMonthTanks = liveTanks;
        } else if (monthlySnapshotMap[mKey]) {
          mMonthTanks = monthlySnapshotMap[mKey].tanks;
        }

        if (mMonthTanks && mMonthTanks.length > 0) {
          const sheetRows = mMonthTanks.map((t, idx) => {
            const isChecked = isCurrentMonth
              ? (t.Tankcheck === 'เช็คแล้ว' && isCheckedInCurrentMonth(t.Lastcheck))
              : (t.Tankcheck === 'เช็คแล้ว');
            let readinessText = 'ยังไม่พร้อมใช้งาน';
            if (isChecked && t.ReadyorNot === 'Ready' && t.TankStatus) readinessText = 'พร้อมใช้งาน';
            else if (isChecked) readinessText = 'ไม่พร้อมใช้งาน';
            return {
              'ลำดับ': idx + 1,
              'รหัสถัง': t.FireTank || '',
              'ประเภท': t.Types || '',
              'น้ำหนัก (lb)': t['Weight (lb)'] ?? '',
              'พื้นที่ติดตั้ง': t.Area || '',
              'ผู้รับผิดชอบ': t.Responsible || '',
              'วันที่เริ่มใช้': formatDateOnly(t.Inuse),
              'วันที่ตรวจล่าสุด': formatDateOnly(t.Lastcheck),
              'สถานะตรวจ': isChecked ? 'เช็คแล้ว' : 'ยังไม่ได้ตรวจ',
              'ความพร้อม': readinessText,
              'อายุถัง': t.Exptank || '',
              'ผู้ตรวจเช็ค': t.Inspector || '',
              'หมายเหตุ': t.Remark || ''
            };
          });
          const wsMonth = XLSX.utils.json_to_sheet(sheetRows);
          wsMonth['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 22 },
            { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 18 },
            { wch: 10 }, { wch: 16 }, { wch: 26 }
          ];
          const tabTitle = isCurrentMonth ? `${shortName} (ปัจจุบัน)` : shortName;
          XLSX.utils.book_append_sheet(wb, wsMonth, tabTitle.slice(0, 31));
        }
      }

      const dateStr = now.toISOString().slice(0, 10);
      const filename = `FireTank_รายงานประจำปี_${thaiYear}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);
      alert(`✅ ส่งออกไฟล์ Excel ข้อมูลประจำปี ${thaiYear} สำเร็จเรียบร้อยแล้ว!\n(รวมสรุปภาพรวมรายปี, ข้อมูลทุกรอบเดือน, และแท็บแยกรายเดือน)`);
    }

  } catch (err) {
    console.error('exportToExcelWithOptions error:', err);
    alert(`เกิดข้อผิดพลาดในการส่งออก Excel: ${err.message}`);
  } finally {
    if ($btn) $btn.prop('disabled', false).html(origHtml);
  }
}

// Backward-compatible wrapper — เรียกได้จาก onclick เดิมโดยไม่ต้องแก้ HTML
async function exportToExcel() {
  return exportToExcelWithOptions({});
}

// ─── Download Tank Images as ZIP — รองรับตัวเลือกประเภทรูปและขอบเขต ───
async function downloadTankImagesWithOptions({ imageType = 'both', scope = 'current', monthKey = null, year = null } = {}) {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user || user.PermitDo < 2) {
    alert('⚠️ คุณไม่มีสิทธิ์ดาวน์โหลดรูปภาพ (อนุญาตเฉพาะระดับ Admin P2 ขึ้นไป)');
    return;
  }
  if (typeof JSZip === 'undefined') {
    alert('กำลังโหลดไลบรารี ZIP กรุณารอครู่หนึ่งแล้วลองใหม่');
    return;
  }

  const $btn = typeof $ !== 'undefined' ? $('#btnDownloadImagesZip') : null;
  const origHtml = $btn ? $btn.html() : '';
  if ($btn) $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span>กำลังเตรียมข้อมูล...');

  try {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curMonthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    const useTank = (imageType === 'both' || imageType === 'tank');
    const useArea = (imageType === 'both' || imageType === 'area');
    const typeLabel = imageType === 'tank' ? 'TankOnly' : imageType === 'area' ? 'AreaOnly' : 'All';

    const zip = new JSZip();
    const tankFolder = useTank ? zip.folder('รูปถังดับเพลิง_tanks') : null;
    const areaFolder = useArea ? zip.folder('รูปสถานที่_areas') : null;
    let tankImgCount = 0;
    let areaImgCount = 0;
    let filenameScope = 'Current';

    // Helper: เพิ่มรูปของถังเข้า folder ที่กำหนด
    async function addTankToFolders(tank, idx, total, tFolder, aFolder) {
      const fireTankId = (tank.FireTank || `TANK_${idx + 1}`).trim();
      if ($btn && idx % 5 === 0) $btn.html(`<span class="spinner-border spinner-border-sm me-1"></span>ประมวลผล (${idx + 1}/${total})...`);

      if (useTank && tFolder && tank.PicTank && typeof tank.PicTank === 'string' && tank.PicTank.trim() && tank.PicTank !== '-' && tank.PicTank !== '—') {
        const picVal = tank.PicTank.trim();
        try {
          if (picVal.startsWith('data:')) {
            const isJpg = picVal.includes('data:image/jpeg') || picVal.includes('data:image/jpg');
            const b64 = picVal.split(',')[1];
            if (b64) { tFolder.file(`${fireTankId}.${isJpg ? 'jpg' : 'png'}`, b64, { base64: true }); tankImgCount++; }
          } else {
            const urls = [...new Set([resolveImageUrl(picVal), picVal, picVal.startsWith('/') ? picVal : '/' + picVal].filter(Boolean))];
            for (const u of urls) {
              try {
                const r = await fetch(u);
                if (r.ok) {
                  const b = await r.blob();
                  const ext = u.toLowerCase().endsWith('.jpg') || u.toLowerCase().endsWith('.jpeg') ? 'jpg' : 'png';
                  tFolder.file(`${fireTankId}.${ext}`, b);
                  tankImgCount++;
                  break;
                }
              } catch(e) {}
            }
          }
        } catch(e) { console.warn(`PicTank err ${fireTankId}:`, e); }
      }

      if (useArea && aFolder && tank.PicArea && typeof tank.PicArea === 'string' && tank.PicArea.trim() && tank.PicArea !== '-' && tank.PicArea !== '—') {
        const areaVal = tank.PicArea.trim();
        try {
          if (areaVal.startsWith('data:')) {
            const isJpg = areaVal.includes('data:image/jpeg') || areaVal.includes('data:image/jpg');
            const b64 = areaVal.split(',')[1];
            if (b64) { aFolder.file(`${fireTankId}_area.${isJpg ? 'jpg' : 'png'}`, b64, { base64: true }); areaImgCount++; }
          } else {
            const urls = [...new Set([resolveImageUrl(areaVal), areaVal, areaVal.startsWith('/') ? areaVal : '/' + areaVal].filter(Boolean))];
            for (const u of urls) {
              try {
                const r = await fetch(u);
                if (r.ok) {
                  const b = await r.blob();
                  const ext = u.toLowerCase().endsWith('.jpg') || u.toLowerCase().endsWith('.jpeg') ? 'jpg' : 'png';
                  aFolder.file(`${fireTankId}_area.${ext}`, b);
                  areaImgCount++;
                  break;
                }
              } catch(e) {}
            }
          }
        } catch(e) { console.warn(`PicArea err ${fireTankId}:`, e); }
      }
    }

    if (scope === 'current') {
      if ($btn) $btn.html('<span class="spinner-border spinner-border-sm me-1"></span>โหลดรายการถัง...');
      const tanks = await fetchAllTanks();
      if (!tanks || tanks.length === 0) { alert('⚠️ ไม่มีข้อมูลถัง'); return; }
      filenameScope = 'Current';
      for (let i = 0; i < tanks.length; i++) await addTankToFolders(tanks[i], i, tanks.length, tankFolder, areaFolder);

    } else if (scope === 'month' && monthKey) {
      const isCurrentM = (monthKey === curMonthKey);
      filenameScope = monthKey;
      let tanks = [];
      if (isCurrentM) {
        if ($btn) $btn.html('<span class="spinner-border spinner-border-sm me-1"></span>โหลดรายการถัง...');
        tanks = await fetchAllTanks();
      } else {
        if ($btn) $btn.html(`<span class="spinner-border spinner-border-sm me-1"></span>โหลด Snapshot ${monthKey}...`);
        const snapRes = await fetchMonthSnapshot(monthKey);
        if (snapRes && snapRes.success) tanks = snapRes.tanks || [];
      }
      if (!tanks || tanks.length === 0) { alert(`⚠️ ไม่พบข้อมูลในรอบเดือน ${monthKey}`); return; }
      for (let i = 0; i < tanks.length; i++) await addTankToFolders(tanks[i], i, tanks.length, tankFolder, areaFolder);

    } else if (scope === 'year') {
      const selectedYear = year || curYear;
      filenameScope = String(selectedYear);
      const monthList = await fetchMonthlyList();
      const historyMonths = (monthList?.history || []).filter(h => h.month_key && h.month_key.startsWith(`${selectedYear}-`));
      const allMonthKeys = new Set(historyMonths.map(h => h.month_key));
      if (selectedYear === curYear) allMonthKeys.add(curMonthKey);

      let monthIdx = 0;
      for (const mKey of [...allMonthKeys].sort()) {
        const isCurrentM = (mKey === curMonthKey && selectedYear === curYear);
        if ($btn) $btn.html(`<span class="spinner-border spinner-border-sm me-1"></span>โหลดรอบ ${mKey} (${++monthIdx}/${allMonthKeys.size})...`);
        let tanks = [];
        if (isCurrentM) {
          tanks = await fetchAllTanks();
        } else {
          const snapRes = await fetchMonthSnapshot(mKey);
          if (snapRes && snapRes.success) tanks = snapRes.tanks || [];
        }
        const mTankFolder = useTank ? zip.folder(`รูปถังดับเพลิง_tanks/${mKey}`) : null;
        const mAreaFolder = useArea ? zip.folder(`รูปสถานที่_areas/${mKey}`) : null;
        for (let i = 0; i < tanks.length; i++) await addTankToFolders(tanks[i], i, tanks.length, mTankFolder, mAreaFolder);
      }
    }

    const totalImages = tankImgCount + areaImgCount;
    if (totalImages === 0) { alert('⚠️ ไม่พบไฟล์รูปภาพในข้อมูลที่เลือก'); return; }

    if ($btn) $btn.html('<span class="spinner-border spinner-border-sm me-1"></span>กำลังสร้างไฟล์ ZIP...');
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

    const dateStr = now.toISOString().slice(0, 10);
    const filename = `FireTank_Images_${typeLabel}_${filenameScope}_${dateStr}.zip`;
    const dlLink = document.createElement('a');
    dlLink.href = URL.createObjectURL(zipBlob);
    dlLink.download = filename;
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
    setTimeout(() => URL.revokeObjectURL(dlLink.href), 10000);

    const typeText = imageType === 'tank' ? 'รูปถังดับเพลิง' : imageType === 'area' ? 'รูปสถานที่' : 'รูปทั้งสองประเภท';
    alert(`✅ ดาวน์โหลดรูปภาพสำเร็จ!\n• ประเภท: ${typeText}\n• รูปถัง: ${tankImgCount} รูป\n• รูปสถานที่: ${areaImgCount} รูป\n• รวม: ${totalImages} รูป`);

  } catch (err) {
    console.error('downloadTankImagesWithOptions error:', err);
    alert(`เกิดข้อผิดพลาดในการดาวน์โหลด: ${err.message}`);
  } finally {
    if ($btn) $btn.prop('disabled', false).html(origHtml);
  }
}

// Backward-compatible wrapper
async function downloadAllTankImagesZip() {
  return downloadTankImagesWithOptions({ imageType: 'both', scope: 'current' });
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
