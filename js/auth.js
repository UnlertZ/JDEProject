/**
 * auth.js — ระบบยืนยันตัวตน และจัดการสิทธิ์แบบ Real-time Cloudflare D1 SQL 100%
 * ไม่เก็บหรือ Fallback ข้อมูลบัญชีผู้ใช้ลง LocalStorage ของเครื่อง
 */

const AUTH_KEY = 'firetank_current_user';

// ล้างข้อมูลแคชผู้ใช้เก่าใน LocalStorage ออก เพื่อใช้ข้อมูลสดจาก Cloudflare D1
try {
  localStorage.removeItem('firetank_users');
  localStorage.removeItem('firetank_pending_users');
} catch (e) {}

// ดึง Session ผู้ใช้ที่กำลังล็อกอินอยู่ในเบราว์เซอร์ปัจจุบัน
function getCurrentUser() {
  const u = localStorage.getItem(AUTH_KEY);
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch (e) {
    return null;
  }
}

// ─── ลงทะเบียนสมาชิกใหม่ ส่งตรงเข้า Cloudflare D1 ───
async function registerUser(username, password, emName) {
  const uTrim = String(username || '').trim();
  const pTrim = String(password || '').trim();
  const nameTrim = String(emName || '').trim();

  if (!uTrim || !pTrim || !nameTrim) {
    return { success: false, message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' };
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uTrim, password: pTrim, emName: nameTrim })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true };
    } else {
      return { success: false, message: data.message || data.error || 'ลงทะเบียนไม่สำเร็จ' };
    }
  } catch (e) {
    return { success: false, message: `ไม่สามารถเชื่อมต่อ Cloudflare D1: ${e.message}` };
  }
}

// ─── เข้าสู่ระบบผ่าน Cloudflare D1 แบบ Real-time ───
async function login(username, password) {
  const uTrim = String(username || '').trim().toLowerCase();
  const pTrim = String(password || '').trim();

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uTrim, password: pTrim })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
      return { success: true, user: data.user };
    } else {
      return { success: false, message: data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
    }
  } catch (e) {
    return { success: false, message: `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Cloudflare ได้: ${e.message}` };
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'index.html';
}

// ─── ดึงรายชื่อผู้ใช้จาก Cloudflare D1 ───
async function fetchApprovalsData() {
  try {
    const res = await fetch('/api/approvals');
    if (res.ok) {
      const data = await res.json();
      return {
        pending: Array.isArray(data.pending) ? data.pending : [],
        users: Array.isArray(data.users) ? data.users : []
      };
    }
  } catch (e) {}
  return { pending: [], users: [] };
}

// Compatibility helper
function getPendingUsers() {
  return [];
}
function getUsers() {
  return [];
}

// ─── อนุมัติสมาชิก ───
async function approveUser(username) {
  try {
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, user: data.user || { Username: username } };
    }
    return { success: false, message: data.message || 'เกิดข้อผิดพลาดในการอนุมัติ' };
  } catch (e) {
    return { success: false, message: `การเชื่อมต่อขัดข้อง: ${e.message}` };
  }
}

// ─── ปฏิเสธสมาชิก ───
async function rejectUser(username) {
  try {
    const res = await fetch(`/api/approvals?username=${encodeURIComponent(username)}`, {
      method: 'DELETE'
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, message: data.message || 'เกิดข้อผิดพลาด' };
  } catch (e) {
    return { success: false, message: `การเชื่อมต่อขัดข้อง: ${e.message}` };
  }
}

// ─── ปรับระดับสิทธิ์ผู้ใช้ (Permit) ───
async function updateUserPermit(targetUsername, newPermit) {
  const currentUser = getCurrentUser();
  if (!currentUser) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };
  if (currentUser.PermitDo < 2) return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };

  try {
    const res = await fetch('/api/approvals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: targetUsername,
        permitDo: parseInt(newPermit, 10),
        requestorPermit: currentUser.PermitDo
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, message: data.message || 'เกิดข้อผิดพลาด' };
  } catch (e) {
    return { success: false, message: `การเชื่อมต่อขัดข้อง: ${e.message}` };
  }
}

// ─── ลบผู้ใช้งานที่ได้รับอนุมัติแล้ว ───
async function deleteActiveUser(targetUsername) {
  const currentUser = getCurrentUser();
  if (!currentUser) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };
  if (currentUser.PermitDo < 2) return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };

  try {
    const res = await fetch(`/api/approvals?username=${encodeURIComponent(targetUsername)}&type=user&requestorPermit=${currentUser.PermitDo}`, {
      method: 'DELETE'
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, message: data.message || 'เกิดข้อผิดพลาด' };
  } catch (e) {
    return { success: false, message: `การเชื่อมต่อขัดข้อง: ${e.message}` };
  }
}

// ─── ตรวจสอบสิทธิ์การเข้าถึงหน้าเว็บ ───
function requireAuth(minPermit = 1) {
  const user = getCurrentUser();
  if (!user) {
    sessionStorage.setItem('flash_msg', JSON.stringify({ type: 'warning', text: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }));
    window.location.href = 'login.html';
    return false;
  }
  if (user.PermitDo < minPermit) {
    sessionStorage.setItem('flash_msg', JSON.stringify({ type: 'danger', text: 'คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้' }));
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ─── แสดงข้อมูลผู้ใช้บน Navbar ───
async function renderNavbarAuth() {
  const user = getCurrentUser();
  const authNav = document.getElementById('navbarAuthArea');
  if (!authNav) return;

  if (user) {
    const isAdmin = user.PermitDo >= 2;
    const isP3   = user.PermitDo >= 3;
    let pendingCount = 0;

    if (isAdmin) {
      try {
        const res = await fetch('/api/approvals');
        if (res.ok) {
          const data = await res.json();
          if (data && data.pending) pendingCount = data.pending.length;
        }
      } catch (e) {}
    }

    let adminBadgeHtml = '';
    if (isAdmin) {
      adminBadgeHtml = `
        <a href="approvals.html" class="btn btn-outline-warning btn-sm fw-semibold position-relative me-2" title="อนุมัติสมาชิกใหม่">
          <i class="bi bi-person-check-fill me-1"></i>อนุมัติสมาชิก
          ${pendingCount > 0 ? `<span class="badge bg-danger rounded-pill ms-1">${pendingCount}</span>` : ''}
        </a>
      `;
    }

    const rankBadgeClass = isP3 ? 'bg-purple text-white' : isAdmin ? 'bg-danger' : 'bg-warning text-dark';
    const rankStyle = isP3 ? 'style="background:#6f42c1;"' : '';

    authNav.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        ${adminBadgeHtml}
        <span class="navbar-text text-white small d-none d-md-inline">
          <i class="bi bi-person-circle me-1 text-warning"></i>
          <strong>${user.EmName || user.Username}</strong>
          <span class="badge ${rankBadgeClass} ms-1" ${rankStyle}>${user.Rank || 'P1'}</span>
        </span>
        <button onclick="logout()" class="btn btn-outline-light btn-sm">
          <i class="bi bi-box-arrow-right me-1"></i>ออกจากระบบ
        </button>
      </div>
    `;
  } else {
    authNav.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <a href="register.html" class="btn btn-outline-light btn-sm fw-semibold">
          <i class="bi bi-person-plus me-1"></i>ลงทะเบียน
        </a>
        <a href="login.html" class="btn btn-warning btn-sm fw-bold">
          <i class="bi bi-box-arrow-in-right me-1"></i>เข้าสู่ระบบ
        </a>
      </div>
    `;
  }
}

function checkFlashMessage() {
  const msg = sessionStorage.getItem('flash_msg');
  if (msg) {
    try {
      const data = JSON.parse(msg);
      const container = document.getElementById('flashAlertArea');
      if (container) {
        container.innerHTML = `
          <div class="alert alert-${data.type} alert-dismissible fade show shadow-sm" role="alert">
            ${data.text}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        `;
        setTimeout(() => {
          const alertEl = container.querySelector('.alert');
          if (alertEl) {
            const bsAlert = new bootstrap.Alert(alertEl);
            bsAlert.close();
          }
        }, 5000);
      }
    } catch (e) {}
    sessionStorage.removeItem('flash_msg');
  }
}

function initAuthUI() {
  renderNavbarAuth();
  checkFlashMessage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthUI);
} else {
  initAuthUI();
}
