(() => {
  // _worker.js
  var THAI_MONTHS = ["\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21", "\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C", "\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21", "\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19", "\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21", "\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19", "\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21", "\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21", "\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19", "\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21", "\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19", "\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21"];
  var THAI_MONTHS_SHORT = ["\u0E21.\u0E04.", "\u0E01.\u0E1E.", "\u0E21\u0E35.\u0E04.", "\u0E40\u0E21.\u0E22.", "\u0E1E.\u0E04.", "\u0E21\u0E34.\u0E22.", "\u0E01.\u0E04.", "\u0E2A.\u0E04.", "\u0E01.\u0E22.", "\u0E15.\u0E04.", "\u0E1E.\u0E22.", "\u0E18.\u0E04."];
  function isCheckedInCurrentMonth(lastcheckVal) {
    if (!lastcheckVal) return false;
    const s = String(lastcheckVal).trim();
    if (!s || s === "-" || s === "\u2014") return false;
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
    const now = /* @__PURE__ */ new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    return checkYear === curYear && checkMonth === curMonth;
  }
  function formatTankResponse(row) {
    if (!row) return {};
    const get = (key) => {
      if (row[key] !== void 0 && row[key] !== null) return row[key];
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const k of Object.keys(row)) {
        if (k.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanKey) {
          if (row[k] !== void 0 && row[k] !== null) return row[k];
        }
      }
      return "";
    };
    const fireTank = get("fire_tank") || get("FireTank") || get("firetank") || "";
    const lastcheck = get("lastcheck") || get("Lastcheck") || "";
    let tankCheck = get("tankcheck") || get("Tankcheck") || "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E0A\u0E47\u0E04";
    if (tankCheck === "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27") {
      if (!isCheckedInCurrentMonth(lastcheck)) {
        tankCheck = "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E0A\u0E47\u0E04";
      }
    }
    let readyOrNot = get("ready_or_not") || get("ReadyorNot") || "Not Ready";
    const tankStatusVal = get("tank_status") ?? get("TankStatus");
    let tankStatus = tankStatusVal !== "" && tankStatusVal !== void 0 ? Boolean(tankStatusVal) : readyOrNot === "Ready";
    if (tankCheck !== "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27") {
      readyOrNot = "Not Ready";
      tankStatus = false;
    }
    let weightVal = get("weight") || get("Weight (lb)") || get("Weight");
    if (weightVal !== "" && weightVal !== null && !isNaN(weightVal)) {
      weightVal = parseFloat(weightVal);
    } else {
      weightVal = null;
    }
    return {
      FireTank: String(fireTank).trim(),
      Types: String(get("types") || get("Types") || ""),
      "Weight (lb)": weightVal,
      Area: String(get("area") || get("Area") || ""),
      Inuse: String(get("inuse") || get("Inuse") || ""),
      Lastcheck: lastcheck ? String(lastcheck) : "",
      Tankcheck: tankCheck,
      ReadyorNot: readyOrNot,
      TankStatus: tankStatus,
      Exptank: String(get("exptank") || get("Exptank") || ""),
      PicTank: get("pic_tank") || get("PicTank") || null,
      PicArea: get("pic_area") || get("PicArea") || null,
      Inspector: String(get("inspector") || get("Inspector") || ""),
      Responsible: String(get("responsible") || get("Responsible") || ""),
      Remark: String(get("remark") || get("Remark") || ""),
      EqType: String(get("eq_type") || get("EqType") || "tank"),
      EqData: String(get("eq_data") || get("EqData") || "{}")
    };
  }
  function formatTankForSnapshot(t, overrides = {}) {
    let picTank = t.PicTank || "";
    let picArea = t.PicArea || "";
    if (typeof picTank === "string" && picTank.startsWith("data:")) picTank = "";
    if (typeof picArea === "string" && picArea.startsWith("data:")) picArea = "";
    return {
      Id: t.Id !== void 0 ? t.Id : "",
      FireTank: String(t.FireTank || "").trim(),
      Types: String(t.Types || ""),
      "Weight (lb)": t["Weight (lb)"] !== void 0 ? t["Weight (lb)"] : null,
      Area: String(t.Area || ""),
      Responsible: String(t.Responsible || ""),
      Inuse: t.Inuse ? String(t.Inuse) : "",
      Lastcheck: overrides.Lastcheck !== void 0 ? overrides.Lastcheck : t.Lastcheck ? String(t.Lastcheck) : "",
      Tankcheck: overrides.Tankcheck !== void 0 ? overrides.Tankcheck : t.Tankcheck || "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E0A\u0E47\u0E04",
      ReadyorNot: overrides.ReadyorNot !== void 0 ? overrides.ReadyorNot : t.ReadyorNot || "Ready",
      TankStatus: overrides.TankStatus !== void 0 ? overrides.TankStatus : Boolean(t.TankStatus),
      Exptank: String(t.Exptank || ""),
      Inspector: overrides.Inspector !== void 0 ? overrides.Inspector : String(t.Inspector || ""),
      Remark: overrides.Remark !== void 0 ? overrides.Remark : String(t.Remark || ""),
      PicTank: picTank,
      PicArea: picArea
    };
  }
  var _dbInitialized = false;
  async function ensureDatabase(db) {
    if (_dbInitialized || !db) return;
    try {
      await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT,
        rank TEXT DEFAULT 'P1',
        permit_do INTEGER DEFAULT 1,
        em_name TEXT
      )
    `).run();
      await db.prepare(`
      CREATE TABLE IF NOT EXISTS pending_users (
        username TEXT PRIMARY KEY,
        password TEXT,
        em_name TEXT,
        rank TEXT DEFAULT 'P1',
        permit_do INTEGER DEFAULT 1,
        registered_at TEXT
      )
    `).run();
      await db.prepare(`
      CREATE TABLE IF NOT EXISTS tanks (
        fire_tank TEXT PRIMARY KEY,
        types TEXT,
        weight REAL,
        area TEXT,
        inuse TEXT,
        lastcheck TEXT,
        tankcheck TEXT DEFAULT '\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E0A\u0E47\u0E04',
        ready_or_not TEXT DEFAULT 'Not Ready',
        tank_status INTEGER DEFAULT 0,
        exptank TEXT,
        pic_tank TEXT,
        pic_area TEXT,
        inspector TEXT,
        responsible TEXT,
        remark TEXT
      )
    `).run();
      await db.prepare(`
      CREATE TABLE IF NOT EXISTS fhc (
        eq_id TEXT PRIMARY KEY,
        types TEXT,
        area TEXT,
        inuse TEXT,
        lastcheck TEXT,
        tankcheck TEXT DEFAULT '\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E15\u0E23\u0E27\u0E08',
        ready_or_not TEXT DEFAULT 'Not Ready',
        tank_status INTEGER DEFAULT 0,
        exptank TEXT,
        pic_tank TEXT,
        pic_area TEXT,
        inspector TEXT,
        responsible TEXT,
        remark TEXT,
        eq_data TEXT
      )
    `).run();
      await db.prepare(`
      CREATE TABLE IF NOT EXISTS fh (
        eq_id TEXT PRIMARY KEY,
        types TEXT,
        area TEXT,
        inuse TEXT,
        lastcheck TEXT,
        tankcheck TEXT DEFAULT '\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E15\u0E23\u0E27\u0E08',
        ready_or_not TEXT DEFAULT 'Not Ready',
        tank_status INTEGER DEFAULT 0,
        exptank TEXT,
        pic_tank TEXT,
        pic_area TEXT,
        inspector TEXT,
        responsible TEXT,
        remark TEXT,
        eq_data TEXT
      )
    `).run();
      await db.prepare(`
      CREATE TABLE IF NOT EXISTS hd (
        eq_id TEXT PRIMARY KEY,
        types TEXT,
        area TEXT,
        inuse TEXT,
        lastcheck TEXT,
        tankcheck TEXT DEFAULT '\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E15\u0E23\u0E27\u0E08',
        ready_or_not TEXT DEFAULT 'Not Ready',
        tank_status INTEGER DEFAULT 0,
        exptank TEXT,
        pic_tank TEXT,
        pic_area TEXT,
        inspector TEXT,
        responsible TEXT,
        remark TEXT,
        eq_data TEXT
      )
    `).run();
      await db.prepare(`
      CREATE TABLE IF NOT EXISTS monthly_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_key TEXT NOT NULL UNIQUE,
        month_label TEXT NOT NULL,
        total_tanks INTEGER DEFAULT 0,
        checked_tanks INTEGER DEFAULT 0,
        not_checked_tanks INTEGER DEFAULT 0,
        ready_tanks INTEGER DEFAULT 0,
        not_ready_tanks INTEGER DEFAULT 0,
        snapshot_data TEXT NOT NULL,
        archived_at TEXT NOT NULL,
        is_closed INTEGER DEFAULT 1
      )
    `).run();
      await db.prepare(`
      CREATE TABLE IF NOT EXISTS system_migrations (
        id TEXT PRIMARY KEY,
        executed_at TEXT
      )
    `).run();
      const migCheck = await db.prepare("SELECT id FROM system_migrations WHERE id = 'seed_past_snapshots_2026_v2'").first().catch(() => null);
      if (!migCheck) {
        const tankQ = await db.prepare(`
          SELECT fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'tank' as eq_type, '' as eq_data FROM tanks
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fhc' as eq_type, eq_data FROM fhc
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fh' as eq_type, eq_data FROM fh
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'hd' as eq_type, eq_data FROM hd
`).all().catch(() => ({ results: [] }));
        const liveTanks = (tankQ.results || []).map(formatTankResponse);
        const total = liveTanks.length;
        if (total > 0) {
          for (let m = 1; m <= 9; m++) {
            const mStr = String(m).padStart(2, "0");
            const monthKey = `2026-${mStr}`;
            const thaiYear = 2026 + 543;
            const monthLabel = `${THAI_MONTHS[m - 1]} ${thaiYear}`;
            const checkDateStr = `01/${mStr}/2026`;
            const archDate = `2026-${mStr}-28 23:59:59`;
            const snapshotTanks = liveTanks.map((t) => formatTankForSnapshot(t, {
              Tankcheck: "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27",
              ReadyorNot: "Ready",
              TankStatus: true,
              Lastcheck: checkDateStr,
              Inspector: "SHE"
            }));
            const snapJson = JSON.stringify(snapshotTanks);
            await db.prepare(`
            INSERT OR IGNORE INTO monthly_snapshots 
            (month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, snapshot_data, archived_at, is_closed)
            VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?, 1)
          `).bind(monthKey, monthLabel, total, total, total, snapJson, archDate).run().catch(console.error);
          }
        }
        await db.prepare("INSERT OR IGNORE INTO system_migrations (id, executed_at) VALUES ('seed_past_snapshots_2026_v2', datetime('now'))").run().catch(console.error);
      }
      _dbInitialized = true;
    } catch (err) {
      console.error("ensureDatabase error:", err);
    }
  }
  function parseBase64Image(dataUrl) {
    if (typeof dataUrl !== "string") return null;
    const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!match) return null;
    const mimeType = match[1];
    const base64Data = match[2];
    try {
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return { mimeType, buffer: bytes.buffer };
    } catch (e) {
      console.error("parseBase64Image decode error:", e);
      return null;
    }
  }
  function getYearMonthFromDate(dateInput) {
    const now = /* @__PURE__ */ new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    if (dateInput) {
      if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
        y = dateInput.getFullYear();
        m = dateInput.getMonth() + 1;
      } else if (typeof dateInput === "string") {
        const s = dateInput.trim();
        if (/^(\d{4})-(\d{2})/.test(s)) {
          const match = s.match(/^(\d{4})-(\d{2})/);
          y = parseInt(match[1], 10);
          m = parseInt(match[2], 10);
        } else if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.test(s)) {
          const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          m = parseInt(match[2], 10);
          y = parseInt(match[3], 10);
        } else if (/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.test(s)) {
          const match = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
          y = parseInt(match[1], 10);
          m = parseInt(match[2], 10);
        }
      }
    }
    return {
      year: String(y),
      month: String(m).padStart(2, "0")
    };
  }
  async function saveImageToR2(env, imageInput, subFolder, tankId, dateInput) {
    if (!imageInput || typeof imageInput !== "string") return imageInput || null;
    const trimmed = imageInput.trim();
    if (!trimmed || trimmed === "-" || trimmed === "\u2014") return null;
    if (!trimmed.startsWith("data:")) {
      return trimmed;
    }
    if (!env.R2) {
      console.warn("saveImageToR2: env.R2 binding not configured in Worker runtime");
      return trimmed;
    }
    const parsed = parseBase64Image(trimmed);
    if (!parsed) return trimmed;
    const { year, month } = getYearMonthFromDate(dateInput);
    let ext = "jpg";
    if (parsed.mimeType.includes("png")) ext = "png";
    else if (parsed.mimeType.includes("webp")) ext = "webp";
    const safeTank = String(tankId || "TANK").replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const key = `${year}/${month}/${subFolder}/${safeTank}_${timestamp}.${ext}`;
    await env.R2.put(key, parsed.buffer, {
      httpMetadata: {
        contentType: parsed.mimeType,
        cacheControl: "public, max-age=31536000, immutable"
      }
    });
    return `/r2/${key}`;
  }
  function getRetentionYears() {
    const curYear = (/* @__PURE__ */ new Date()).getFullYear();
    const minKeepYear = curYear - 2;
    const keepYears = [];
    for (let y = minKeepYear; y <= curYear; y++) {
      keepYears.push(y);
    }
    return {
      curYear,
      minKeepYear,
      keepYears,
      deleteBeforeYear: minKeepYear
    };
  }
  async function purgeExpiredRetention(env) {
    const { minKeepYear, curYear, keepYears, deleteBeforeYear } = getRetentionYears();
    const result = {
      curYear,
      minKeepYear,
      keepYears,
      deleteBeforeYear,
      deletedSnapshotsD1: 0,
      deletedR2Objects: 0,
      details: []
    };
    if (env.DB) {
      try {
        const d1Res = await env.DB.prepare(`
        DELETE FROM monthly_snapshots 
        WHERE CAST(substr(month_key, 1, 4) AS INTEGER) < ?
      `).bind(minKeepYear).run();
        result.deletedSnapshotsD1 = d1Res.meta?.changes || 0;
        result.details.push(`D1: \u0E25\u0E1A\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E23\u0E2D\u0E1A\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E40\u0E01\u0E48\u0E32 (< ${minKeepYear}) \u0E2D\u0E2D\u0E01\u0E08\u0E33\u0E19\u0E27\u0E19 ${result.deletedSnapshotsD1} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23`);
      } catch (e) {
        console.error("Error purging D1 snapshots:", e);
        result.details.push(`D1 Error: ${e.message}`);
      }
    }
    if (env.R2) {
      try {
        let cursor = void 0;
        let totalDeleted = 0;
        do {
          const list = await env.R2.list({ cursor, limit: 500 });
          const toDeleteKeys = [];
          for (const obj of list.objects) {
            const parts = obj.key.split("/");
            const yearNum = parseInt(parts[0], 10);
            if (!isNaN(yearNum) && yearNum < minKeepYear) {
              toDeleteKeys.push(obj.key);
            }
          }
          if (toDeleteKeys.length > 0) {
            await env.R2.delete(toDeleteKeys);
            totalDeleted += toDeleteKeys.length;
          }
          cursor = list.truncated ? list.cursor : void 0;
        } while (cursor);
        result.deletedR2Objects = totalDeleted;
        result.details.push(`R2: \u0E25\u0E1A\u0E44\u0E1F\u0E25\u0E4C\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E40\u0E01\u0E48\u0E32 (< ${minKeepYear}) \u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01 Bucket 'r2jde' \u0E08\u0E33\u0E19\u0E27\u0E19 ${totalDeleted} \u0E44\u0E1F\u0E25\u0E4C`);
      } catch (e) {
        console.error("Error purging R2 objects:", e);
        result.details.push(`R2 Error: ${e.message}`);
      }
    }
    return result;
  }
  async function migrateImagesToR2(env) {
    const { minKeepYear } = getRetentionYears();
    const summary = {
      success: true,
      tanksMigrated: 0,
      snapshotsMigrated: 0,
      totalImagesUploaded: 0,
      deletedOldSnapshotsD1: 0,
      deletedOldR2Objects: 0,
      details: []
    };
    const purgeRes = await purgeExpiredRetention(env);
    summary.deletedOldSnapshotsD1 = purgeRes.deletedSnapshotsD1;
    summary.deletedOldR2Objects = purgeRes.deletedR2Objects;
    summary.details.push(...purgeRes.details);
    if (!env.R2) {
      summary.details.push("\u0E04\u0E33\u0E40\u0E15\u0E37\u0E2D\u0E19: \u0E44\u0E21\u0E48\u0E1E\u0E1A Binding R2 \u0E43\u0E19 Worker runtime \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E44\u0E1F\u0E25\u0E4C\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E44\u0E14\u0E49");
      return summary;
    }
    if (env.DB) {
      const tanksQ = await env.DB.prepare("SELECT fire_tank, pic_tank, pic_area, lastcheck FROM tanks").all().catch(() => ({ results: [] }));
      const tanks = tanksQ.results || [];
      for (const t of tanks) {
        let updatedPicTank = t.pic_tank;
        let updatedPicArea = t.pic_area;
        let changed = false;
        if (t.pic_tank && typeof t.pic_tank === "string" && t.pic_tank.startsWith("data:")) {
          updatedPicTank = await saveImageToR2(env, t.pic_tank, "tanks", t.fire_tank, t.lastcheck);
          changed = true;
          summary.totalImagesUploaded++;
        }
        if (t.pic_area && typeof t.pic_area === "string" && t.pic_area.startsWith("data:")) {
          updatedPicArea = await saveImageToR2(env, t.pic_area, "areas", t.fire_tank, t.lastcheck);
          changed = true;
          summary.totalImagesUploaded++;
        }
        if (changed) {
          await env.DB.prepare(`
          UPDATE tanks
          SET pic_tank = ?, pic_area = ?
          WHERE fire_tank = ?
        `).bind(updatedPicTank, updatedPicArea, t.fire_tank).run();
          summary.tanksMigrated++;
        }
      }
      summary.details.push(`\u0E15\u0E32\u0E23\u0E32\u0E07\u0E16\u0E31\u0E07\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19 (tanks): \u0E22\u0E49\u0E32\u0E22\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E Base64 \u0E44\u0E1B\u0E22\u0E31\u0E07 R2 \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 ${summary.tanksMigrated} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23`);
      const snapQ = await env.DB.prepare(`
      SELECT id, month_key, snapshot_data 
      FROM monthly_snapshots 
      WHERE CAST(substr(month_key, 1, 4) AS INTEGER) >= ?
    `).bind(minKeepYear).all().catch(() => ({ results: [] }));
      for (const snap of snapQ.results || []) {
        try {
          const list = JSON.parse(snap.snapshot_data);
          if (!Array.isArray(list)) continue;
          let snapChanged = false;
          for (const item of list) {
            const tankId = item.FireTank || "TANK";
            if (item.PicTank && typeof item.PicTank === "string" && item.PicTank.startsWith("data:")) {
              item.PicTank = await saveImageToR2(env, item.PicTank, "tanks", tankId, snap.month_key);
              snapChanged = true;
              summary.totalImagesUploaded++;
            }
            if (item.PicArea && typeof item.PicArea === "string" && item.PicArea.startsWith("data:")) {
              item.PicArea = await saveImageToR2(env, item.PicArea, "areas", tankId, snap.month_key);
              snapChanged = true;
              summary.totalImagesUploaded++;
            }
          }
          if (snapChanged) {
            await env.DB.prepare(`
            UPDATE monthly_snapshots 
            SET snapshot_data = ? 
            WHERE id = ?
          `).bind(JSON.stringify(list), snap.id).run();
            summary.snapshotsMigrated++;
          }
        } catch (e) {
          console.error(`Error migrating snapshot id ${snap.id}:`, e);
        }
      }
      summary.details.push(`\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E23\u0E2D\u0E1A\u0E40\u0E14\u0E37\u0E2D\u0E19 (monthly_snapshots): \u0E22\u0E49\u0E32\u0E22\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E Base64 \u0E44\u0E1B\u0E22\u0E31\u0E07 R2 \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 ${summary.snapshotsMigrated} \u0E23\u0E2D\u0E1A\u0E40\u0E14\u0E37\u0E2D\u0E19`);
    }
    return summary;
  }
  var worker_default = {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const method = request.method.toUpperCase();
      if (pathname.startsWith("/r2/")) {
        if (!env.R2) {
          return new Response('Cloudflare R2 binding "R2" is not configured', { status: 500 });
        }
        try {
          const key = decodeURIComponent(pathname.replace(/^\/r2\//, ""));
          const object = await env.R2.get(key);
          if (!object) {
            return new Response("Image Not Found in R2", { status: 404 });
          }
          const etag = object.httpEtag;
          if (request.headers.get("if-none-match") === etag) {
            return new Response(null, { status: 304 });
          }
          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set("etag", etag);
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
          headers.set("Access-Control-Allow-Origin", "*");
          return new Response(object.body, { headers });
        } catch (r2Err) {
          return new Response("Error retrieving image from R2: " + r2Err.message, { status: 500 });
        }
      }
      try {
        if (!env.DB && pathname.startsWith("/api/")) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Cloudflare D1 binding "DB" is not configured in env'
          }), { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } });
        }
        if (env.DB && (pathname === "/api/seed" || pathname === "/api/init")) {
          await ensureDatabase(env.DB);
          return new Response(JSON.stringify({ success: true, message: "Database initialized successfully" }), {
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        }
        if (pathname === "/api/auth") {
          if (method === "POST") {
            const { username, password } = await request.json();
            const uTrim = String(username || "").trim().toLowerCase();
            const pTrim = String(password || "").trim();
            const pending = await env.DB.prepare(
              "SELECT username FROM pending_users WHERE LOWER(username) = ?"
            ).bind(uTrim).first();
            if (pending) {
              return new Response(JSON.stringify({
                success: false,
                message: "\u26A0\uFE0F \u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A (Admin) \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A"
              }), { status: 403, headers: { "Content-Type": "application/json" } });
            }
            const user = await env.DB.prepare(
              "SELECT username, password, rank, permit_do, em_name FROM users WHERE LOWER(username) = ?"
            ).bind(uTrim).first();
            if (user && user.password === pTrim) {
              return new Response(JSON.stringify({
                success: true,
                user: {
                  Username: user.username,
                  Rank: user.rank,
                  PermitDo: user.permit_do,
                  EmName: user.em_name
                }
              }), { headers: { "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify({ success: false, message: "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
        if (pathname === "/api/check") {
          if (method === "POST") {
            const body = await request.json();
            const tankId = String(body.FireTank || "").trim().toUpperCase();
            if (!tankId) return new Response(JSON.stringify({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E23\u0E2B\u0E31\u0E2A\u0E16\u0E31\u0E07" }), { status: 400 });
            const tank = await env.DB.prepare("SELECT inuse FROM tanks WHERE UPPER(fire_tank) = ?").bind(tankId).first();
            if (!tank) return new Response(JSON.stringify({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E16\u0E31\u0E07\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38" }), { status: 404 });
            const now = /* @__PURE__ */ new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            const hours = String(now.getHours()).padStart(2, "0");
            const mins = String(now.getMinutes()).padStart(2, "0");
            const timeStr = `${year}-${month}-${day} ${hours}:${mins}`;
            let exptank = "";
            if (tank.inuse) {
              const match = String(tank.inuse).match(/\d{4}/);
              if (match) {
                const inuseYear = parseInt(match[0], 10);
                const diff = Math.max(0, year - inuseYear);
                exptank = `${diff}\u0E1B\u0E35`;
              }
            }
            const isReady = Boolean(body.isReady);
            const weightVal = body.weight ? parseFloat(body.weight) : null;
            const inspectorName = body.inspector || "";
            const newPic = body.newPic || null;
            const remark = body.remark || "";
            let picTankUrl = newPic;
            if (newPic && typeof newPic === "string" && newPic.startsWith("data:")) {
              picTankUrl = await saveImageToR2(env, newPic, "tanks", tankId, now);
            }
            await env.DB.prepare(`
            UPDATE tanks
            SET lastcheck = ?, tankcheck = '\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27', ready_or_not = ?, tank_status = ?,
                exptank = ?, inspector = ?, weight = COALESCE(?, weight),
                pic_tank = COALESCE(?, pic_tank), remark = ?
            WHERE UPPER(fire_tank) = ?
          `).bind(timeStr, isReady ? "Ready" : "Not Ready", isReady ? 1 : 0, exptank, inspectorName, weightVal, picTankUrl, remark, tankId).run();
            return new Response(JSON.stringify({
              success: true,
              data: { lastcheck: timeStr, exptank, ready_or_not: isReady ? "Ready" : "Not Ready", pic_tank: picTankUrl }
            }), { headers: { "Content-Type": "application/json" } });
          }
        }
        if (pathname === "/api/register") {
          if (method === "POST") {
            const { username, password, emName } = await request.json();
            const uTrim = String(username || "").trim().toLowerCase();
            const pTrim = String(password || "").trim();
            const nameTrim = String(emName || "").trim();
            if (!uTrim || !pTrim || !nameTrim) return new Response(JSON.stringify({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A" }), { status: 400 });
            const existingUser = await env.DB.prepare("SELECT username FROM users WHERE LOWER(username) = ?").bind(uTrim).first();
            if (existingUser) return new Response(JSON.stringify({ success: false, message: `\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49 "${uTrim}" \u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27` }), { status: 409 });
            const existingPending = await env.DB.prepare("SELECT username FROM pending_users WHERE LOWER(username) = ?").bind(uTrim).first();
            if (existingPending) return new Response(JSON.stringify({ success: false, message: `\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49 "${uTrim}" \u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27` }), { status: 409 });
            const now = /* @__PURE__ */ new Date();
            const dateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
            await env.DB.prepare(`
            INSERT INTO pending_users (username, password, em_name, rank, permit_do, registered_at)
            VALUES (?, ?, ?, 'P1', 1, ?)
          `).bind(uTrim, pTrim, nameTrim, dateStr).run();
            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
          }
        }
        if (pathname === "/api/tanks") {
          if (method === "GET") {
            await ensureDatabase(env.DB);
            let rows = [];
            try {
              const query = await env.DB.prepare(`
          SELECT fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'tank' as eq_type, '' as eq_data FROM tanks
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fhc' as eq_type, eq_data FROM fhc
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fh' as eq_type, eq_data FROM fh
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'hd' as eq_type, eq_data FROM hd
`).all();
              rows = query.results || [];
            } catch (dbErr) {
              if (String(dbErr.message).includes("no such table")) {
                await ensureDatabase(env.DB);
                const retryQ = await env.DB.prepare(`
          SELECT fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'tank' as eq_type, '' as eq_data FROM tanks
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fhc' as eq_type, eq_data FROM fhc
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fh' as eq_type, eq_data FROM fh
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'hd' as eq_type, eq_data FROM hd
`).all().catch(() => ({ results: [] }));
                rows = retryQ.results || [];
              } else {
                const tblQuery = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all().catch(() => ({ results: [] }));
                const tableList = (tblQuery.results || []).map((r) => r.name);
                const foundTable = tableList.find((t) => t.toLowerCase().includes("tank") || t.toLowerCase().includes("pump"));
                if (foundTable) {
                  const q2 = await env.DB.prepare(`SELECT * FROM "${foundTable}"`).all();
                  rows = q2.results || [];
                } else {
                  return new Response(JSON.stringify({
                    error: `Database query failed: ${dbErr.message}`,
                    availableTables: tableList
                  }), { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } });
                }
              }
            }
            const formatted = rows.map(formatTankResponse);
            formatted.sort((a, b) => (a.FireTank || "").localeCompare(b.FireTank || "", void 0, { numeric: true, sensitivity: "base" }));
            return new Response(JSON.stringify(formatted), {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "public, max-age=10, stale-while-revalidate=30"
              }
            });
          }
          if (method === "POST") {
            const body = await request.json();
            const tankId = String(body.FireTank || "").trim().toUpperCase();
            if (!tankId) return new Response(JSON.stringify({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E23\u0E2B\u0E31\u0E2A\u0E16\u0E31\u0E07" }), { status: 400 });
            const existing = await env.DB.prepare("SELECT fire_tank FROM tanks WHERE UPPER(fire_tank) = ?").bind(tankId).first();
            if (existing) return new Response(JSON.stringify({ success: false, message: `\u0E23\u0E2B\u0E31\u0E2A\u0E16\u0E31\u0E07 "${tankId}" \u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27` }), { status: 400 });
            const weightVal = body["Weight (lb)"] ? parseFloat(body["Weight (lb)"]) : null;
            const isReady = body.ReadyorNot === "Ready";
            let picTank = body.PicTank || null;
            let picArea = body.PicArea || null;
            if (picTank && typeof picTank === "string" && picTank.startsWith("data:")) {
              picTank = await saveImageToR2(env, picTank, "tanks", tankId, body.Lastcheck || /* @__PURE__ */ new Date());
            }
            if (picArea && typeof picArea === "string" && picArea.startsWith("data:")) {
              picArea = await saveImageToR2(env, picArea, "areas", tankId, body.Lastcheck || /* @__PURE__ */ new Date());
            }
            const eqType = body.EqType || "tank";
            if (eqType === "tank") {
              await env.DB.prepare(`
              INSERT INTO tanks (fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(tankId, body.Types || "", weightVal, body.Area || "", body.Inuse || "", body.Lastcheck || "", body.Tankcheck || "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E15\u0E23\u0E27\u0E08", body.ReadyorNot || "Not Ready", isReady ? 1 : 0, body.Exptank || "", picTank, picArea, body.Inspector || "", body.Responsible || "", body.Remark || "").run();
            } else {
              const tableName = eqType === "fhc" ? "fhc" : eqType === "fh" ? "fh" : "hd";
              await env.DB.prepare(`
              INSERT INTO ${tableName} (eq_id, types, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, eq_data)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(tankId, body.Types || "", body.Area || "", body.Inuse || "", body.Lastcheck || "", body.Tankcheck || "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E15\u0E23\u0E27\u0E08", body.ReadyorNot || "Not Ready", isReady ? 1 : 0, body.Exptank || "", picTank, picArea, body.Inspector || "", body.Responsible || "", body.Remark || "", body.EqData || "{}").run();
            }
            return new Response(JSON.stringify({ success: true, picTank, picArea }), { headers: { "Content-Type": "application/json" } });
          }
          if (method === "PUT") {
            const body = await request.json();
            const tankId = String(body.FireTank || "").trim().toUpperCase();
            if (!tankId) return new Response(JSON.stringify({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E23\u0E2B\u0E31\u0E2A\u0E16\u0E31\u0E07" }), { status: 400 });
            const weightVal = body["Weight (lb)"] ? parseFloat(body["Weight (lb)"]) : null;
            const isReady = body.ReadyorNot === "Ready";
            let picTank = body.PicTank || null;
            let picArea = body.PicArea || null;
            if (picTank && typeof picTank === "string" && picTank.startsWith("data:")) {
              picTank = await saveImageToR2(env, picTank, "tanks", tankId, body.Lastcheck || /* @__PURE__ */ new Date());
            }
            if (picArea && typeof picArea === "string" && picArea.startsWith("data:")) {
              picArea = await saveImageToR2(env, picArea, "areas", tankId, body.Lastcheck || /* @__PURE__ */ new Date());
            }
            await env.DB.prepare(`
            UPDATE tanks
            SET types = ?, weight = ?, area = ?, inuse = ?, lastcheck = ?,
                tankcheck = ?, ready_or_not = ?, tank_status = ?, exptank = ?,
                pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),
                inspector = ?, responsible = ?, remark = ?
            WHERE UPPER(fire_tank) = ?
          `).bind(body.Types || "", weightVal, body.Area || "", body.Inuse || "", body.Lastcheck || "", body.Tankcheck || "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E0A\u0E47\u0E04", body.ReadyorNot || "Not Ready", isReady ? 1 : 0, body.Exptank || "", picTank, picArea, body.Inspector || "", body.Responsible || "", body.Remark || "", body.EqType || "tank", body.EqData || "{}", tankId).run();
            return new Response(JSON.stringify({ success: true, picTank, picArea }), { headers: { "Content-Type": "application/json" } });
          }
          if (method === "DELETE") {
            const tankId = url.searchParams.get("id");
            if (!tankId) return new Response(JSON.stringify({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E23\u0E2B\u0E31\u0E2A\u0E16\u0E31\u0E07" }), { status: 400 });
            const upId = tankId.toUpperCase();
            await env.DB.prepare("DELETE FROM tanks WHERE UPPER(fire_tank) = ?").bind(upId).run();
            await env.DB.prepare("DELETE FROM fhc WHERE UPPER(eq_id) = ?").bind(upId).run();
            await env.DB.prepare("DELETE FROM fh WHERE UPPER(eq_id) = ?").bind(upId).run();
            await env.DB.prepare("DELETE FROM hd WHERE UPPER(eq_id) = ?").bind(upId).run();
            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
          }
        }
        if (pathname === "/api/approvals") {
          if (method === "GET") {
            const pendingQuery = await env.DB.prepare("SELECT username as Username, em_name as EmName, rank as Rank, permit_do as PermitDo, registered_at as RegisteredAt FROM pending_users").all();
            const usersQuery = await env.DB.prepare("SELECT username as Username, em_name as EmName, rank as Rank, permit_do as PermitDo FROM users").all();
            return new Response(JSON.stringify({ pending: pendingQuery.results || [], users: usersQuery.results || [] }), { headers: { "Content-Type": "application/json" } });
          }
          if (method === "POST") {
            const { username } = await request.json();
            const uTrim = String(username || "").trim();
            const pending = await env.DB.prepare("SELECT * FROM pending_users WHERE LOWER(username) = ?").bind(uTrim.toLowerCase()).first();
            if (!pending) return new Response(JSON.stringify({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1C\u0E39\u0E49\u0E2A\u0E21\u0E31\u0E04\u0E23" }), { status: 404 });
            await env.DB.prepare("DELETE FROM pending_users WHERE LOWER(username) = ?").bind(uTrim.toLowerCase()).run();
            await env.DB.prepare('INSERT OR REPLACE INTO users (username, password, rank, permit_do, em_name) VALUES (?, ?, "P1", 1, ?)').bind(pending.username, pending.password, pending.em_name).run();
            return new Response(JSON.stringify({ success: true, user: { Username: pending.username, EmName: pending.em_name } }), { headers: { "Content-Type": "application/json" } });
          }
          if (method === "PUT") {
            const body = await request.json();
            const targetUsername = String(body.username || "").trim();
            const newPermit = parseInt(body.permitDo, 10);
            const requestorPermit = parseInt(body.requestorPermitDo, 10);
            if (!targetUsername || isNaN(newPermit)) return new Response(JSON.stringify({ success: false, message: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19" }), { status: 400 });
            const targetUser = await env.DB.prepare("SELECT permit_do FROM users WHERE LOWER(username) = ?").bind(targetUsername.toLowerCase()).first();
            if (!targetUser) return new Response(JSON.stringify({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A" }), { status: 404 });
            if (requestorPermit < 3 && targetUser.permit_do >= 3) {
              return new Response(JSON.stringify({ success: false, message: "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E1B\u0E23\u0E31\u0E1A\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E47\u0E19 P3" }), { status: 403 });
            }
            const newRank = newPermit >= 3 ? "P3" : newPermit >= 2 ? "P2" : "P1";
            await env.DB.prepare("UPDATE users SET permit_do = ?, rank = ? WHERE LOWER(username) = ?").bind(newPermit, newRank, targetUsername.toLowerCase()).run();
            return new Response(JSON.stringify({ success: true, newPermit, newRank }), { headers: { "Content-Type": "application/json" } });
          }
          if (method === "DELETE") {
            const targetUsername = url.searchParams.get("username");
            const type = url.searchParams.get("type") || "pending";
            const requestorPermit = parseInt(url.searchParams.get("requestorPermit") || "0", 10);
            if (!targetUsername) return new Response(JSON.stringify({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49" }), { status: 400 });
            if (type === "user") {
              const targetUser = await env.DB.prepare("SELECT permit_do FROM users WHERE LOWER(username) = ?").bind(targetUsername.trim().toLowerCase()).first();
              if (!targetUser) return new Response(JSON.stringify({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49" }), { status: 404 });
              if (requestorPermit < 3 && targetUser.permit_do >= 3) {
                return new Response(JSON.stringify({ success: false, message: "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E25\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E47\u0E19 P3" }), { status: 403 });
              }
              await env.DB.prepare("DELETE FROM users WHERE LOWER(username) = ?").bind(targetUsername.trim().toLowerCase()).run();
            } else {
              await env.DB.prepare("DELETE FROM pending_users WHERE LOWER(username) = ?").bind(targetUsername.trim().toLowerCase()).run();
            }
            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
          }
        }
        if (pathname.startsWith("/api/history")) {
          const now = /* @__PURE__ */ new Date();
          const curYear = now.getFullYear();
          const curMonth = now.getMonth() + 1;
          const curMonthKey = `${curYear}-${String(curMonth).padStart(2, "0")}`;
          const curThaiYear = curYear + 543;
          const curMonthLabel = `${THAI_MONTHS[curMonth - 1]} ${curThaiYear}`;
          if (pathname === "/api/history/months") {
            const q = await env.DB.prepare("SELECT id, month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, archived_at, is_closed FROM monthly_snapshots ORDER BY month_key DESC").all().catch(() => ({ results: [] }));
            const snapshots = q.results || [];
            return new Response(JSON.stringify({
              current: {
                month_key: curMonthKey,
                month_label: `${curMonthLabel} (\u0E23\u0E2D\u0E1A\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19)`,
                is_current: true
              },
              history: snapshots
            }), {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "public, max-age=15, stale-while-revalidate=60"
              }
            });
          }
          if (pathname === "/api/history/snapshot") {
            const targetKey = url.searchParams.get("month");
            if (!targetKey) return new Response(JSON.stringify({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E14\u0E37\u0E2D\u0E19" }), { status: 400 });
            const row = await env.DB.prepare("SELECT * FROM monthly_snapshots WHERE month_key = ?").bind(targetKey).first();
            if (!row) return new Response(JSON.stringify({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E02\u0E2D\u0E07\u0E23\u0E2D\u0E1A\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38" }), { status: 404 });
            let parsedData = [];
            try {
              parsedData = JSON.parse(row.snapshot_data);
            } catch (e) {
            }
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
            }), { headers: { "Content-Type": "application/json" } });
          }
          if (pathname === "/api/history/yearly") {
            const yearParam = parseInt(url.searchParams.get("year") || curYear, 10);
            const qYear = await env.DB.prepare("SELECT month_key, total_tanks, ready_tanks, not_ready_tanks, checked_tanks, not_checked_tanks FROM monthly_snapshots WHERE month_key LIKE ?").bind(`${yearParam}-%`).all().catch(() => ({ results: [] }));
            const snapMap = {};
            (qYear.results || []).forEach((r) => {
              snapMap[r.month_key] = r;
            });
            let currentTankStats = null;
            if (yearParam === curYear) {
              const liveTanksQ = await env.DB.prepare("SELECT fire_tank, lastcheck, tankcheck, ready_or_not, tank_status FROM tanks").all().catch(() => ({ results: [] }));
              const liveTanks = (liveTanksQ.results || []).map(formatTankResponse);
              const tot = liveTanks.length;
              const chk = liveTanks.filter((t) => t.Tankcheck === "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27").length;
              const notChk = tot - chk;
              const rdy = liveTanks.filter((t) => t.Tankcheck === "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27" && t.ReadyorNot === "Ready" && t.TankStatus).length;
              const notRdy = liveTanks.filter((t) => t.Tankcheck === "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27" && (t.ReadyorNot === "Not Ready" || !t.TankStatus)).length;
              currentTankStats = {
                total_tanks: tot,
                ready_tanks: rdy,
                not_ready_tanks: notRdy,
                checked_tanks: chk,
                not_checked_tanks: notChk
              };
            }
            const monthsData = [];
            for (let m = 1; m <= 12; m++) {
              const mKey = `${yearParam}-${String(m).padStart(2, "0")}`;
              let stat = snapMap[mKey];
              if (!stat && mKey === curMonthKey && currentTankStats) {
                stat = currentTankStats;
              }
              const total = stat ? stat.total_tanks : m > curMonth && yearParam === curYear ? 0 : 0;
              const ready = stat ? stat.ready_tanks : 0;
              const notReady = stat ? stat.not_ready_tanks : 0;
              const checked = stat ? stat.checked_tanks : 0;
              const notChecked = stat ? stat.not_checked_tanks !== void 0 ? stat.not_checked_tanks : total - checked : 0;
              const pctReady = total > 0 ? Math.round(ready / total * 100) : 0;
              const pctNotReady = total > 0 ? Math.round(notReady / total * 100) : 0;
              const pctChecked = total > 0 ? Math.round(checked / total * 100) : 0;
              const pctNotChecked = total > 0 ? Math.round(notChecked / total * 100) : 0;
              monthsData.push({
                month: m,
                month_key: mKey,
                label: THAI_MONTHS_SHORT[m - 1],
                full_label: `${THAI_MONTHS[m - 1]} ${yearParam + 543}`,
                total,
                ready,
                not_ready: notReady,
                checked,
                not_checked: notChecked,
                percent_ready: pctReady,
                percent_not_ready: pctNotReady,
                percent_checked: pctChecked,
                percent_not_checked: pctNotChecked,
                has_data: Boolean(stat)
              });
            }
            return new Response(JSON.stringify({
              year: yearParam,
              thai_year: yearParam + 543,
              months: monthsData
            }), {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "public, max-age=15, stale-while-revalidate=60"
              }
            });
          }
          if (pathname === "/api/history/seed-month" && method === "POST") {
            const body = await request.json().catch(() => ({}));
            const permit = parseInt(body.requestorPermitDo, 10);
            if (permit < 3) {
              return new Response(JSON.stringify({ success: false, message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E30\u0E14\u0E31\u0E1A Super Admin (P3) \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19" }), { status: 403 });
            }
            const monthKey = String(body.monthKey || body.month || "").trim();
            const inspector = String(body.inspector || "SHE").trim();
            const tankQ = await env.DB.prepare(`
          SELECT fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'tank' as eq_type, '' as eq_data FROM tanks
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fhc' as eq_type, eq_data FROM fhc
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fh' as eq_type, eq_data FROM fh
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'hd' as eq_type, eq_data FROM hd
`).all().catch(() => ({ results: [] }));
            const liveTanks = (tankQ.results || []).map(formatTankResponse);
            const total = liveTanks.length;
            if (total === 0) {
              return new Response(JSON.stringify({ success: false, message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E31\u0E07\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E23\u0E49\u0E32\u0E07 Snapshot \u0E44\u0E14\u0E49" }), { status: 400 });
            }
            if (monthKey.includes("all_01_09")) {
              const y2 = parseInt(body.year || monthKey.split("-")[0] || 2026, 10);
              const yStr2 = String(y2);
              const thaiYear2 = y2 + 543;
              for (let m2 = 1; m2 <= 9; m2++) {
                const mStr2 = String(m2).padStart(2, "0");
                const curMKey = `${yStr2}-${mStr2}`;
                const curLabel = `${THAI_MONTHS[m2 - 1]} ${thaiYear2}`;
                const curCheckDateStr = `01/${mStr2}/${yStr2}`;
                const curArchDate = `${curMKey}-28 23:59:59`;
                const snapTanks = liveTanks.map((t) => formatTankForSnapshot(t, {
                  Tankcheck: "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27",
                  ReadyorNot: "Ready",
                  TankStatus: true,
                  Lastcheck: curCheckDateStr,
                  Inspector: inspector
                }));
                const sJson = JSON.stringify(snapTanks);
                await env.DB.prepare(`
                INSERT INTO monthly_snapshots 
                (month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, snapshot_data, archived_at, is_closed)
                VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?, 1)
                ON CONFLICT(month_key) DO UPDATE SET
                  month_label = excluded.month_label,
                  total_tanks = excluded.total_tanks,
                  checked_tanks = excluded.checked_tanks,
                  not_checked_tanks = excluded.not_checked_tanks,
                  ready_tanks = excluded.ready_tanks,
                  not_ready_tanks = excluded.not_ready_tanks,
                  snapshot_data = excluded.snapshot_data,
                  archived_at = excluded.archived_at,
                  is_closed = excluded.is_closed
              `).bind(curMKey, curLabel, total, total, total, sJson, curArchDate).run();
              }
              return new Response(JSON.stringify({
                success: true,
                message: `\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E04\u0E23\u0E1A 9 \u0E40\u0E14\u0E37\u0E2D\u0E19 (\u0E21.\u0E04. - \u0E01.\u0E22. ${thaiYear2}) \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22 (${total} \u0E16\u0E31\u0E07/\u0E40\u0E14\u0E37\u0E2D\u0E19)`,
                month_key: `${yStr2}-09`,
                month_label: `\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19 ${thaiYear2}`
              }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
            }
            if (!/^\d{4}-\d{2}$/.test(monthKey)) {
              return new Response(JSON.stringify({ success: false, message: "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 (\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 YYYY-MM \u0E40\u0E0A\u0E48\u0E19 2026-05)" }), { status: 400 });
            }
            const [yStr, mStr] = monthKey.split("-");
            const y = parseInt(yStr, 10);
            const m = parseInt(mStr, 10);
            if (m < 1 || m > 12) {
              return new Response(JSON.stringify({ success: false, message: "\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07" }), { status: 400 });
            }
            const thaiYear = y + 543;
            const monthLabel = `${THAI_MONTHS[m - 1]} ${thaiYear}`;
            const checkDateStr = `01/${mStr}/${yStr}`;
            const archDate = `${monthKey}-28 23:59:59`;
            const mode = body.mode || "100_percent";
            let checked = total;
            let ready = total;
            let notChecked = 0;
            let notReady = 0;
            let snapshotTanks = [];
            if (mode === "100_percent") {
              checked = total;
              ready = total;
              notChecked = 0;
              notReady = 0;
              snapshotTanks = liveTanks.map((t) => formatTankForSnapshot(t, {
                Tankcheck: "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27",
                ReadyorNot: "Ready",
                TankStatus: true,
                Lastcheck: checkDateStr,
                Inspector: inspector
              }));
            } else {
              ready = Math.min(total, Math.max(0, parseInt(body.readyCount !== void 0 ? body.readyCount : total, 10)));
              notReady = Math.min(total - ready, Math.max(0, parseInt(body.notReadyCount || 0, 10)));
              checked = ready + notReady;
              notChecked = Math.max(0, total - checked);
              let assignedReady = 0;
              let assignedNotReady = 0;
              snapshotTanks = liveTanks.map((t) => {
                if (assignedReady < ready) {
                  assignedReady++;
                  return formatTankForSnapshot(t, { Tankcheck: "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27", ReadyorNot: "Ready", TankStatus: true, Lastcheck: checkDateStr, Inspector: inspector });
                } else if (assignedNotReady < notReady) {
                  assignedNotReady++;
                  return formatTankForSnapshot(t, { Tankcheck: "\u0E40\u0E0A\u0E47\u0E04\u0E41\u0E25\u0E49\u0E27", ReadyorNot: "Not Ready", TankStatus: false, Lastcheck: checkDateStr, Inspector: inspector, Remark: "\u0E1E\u0E1A\u0E08\u0E38\u0E14\u0E1A\u0E01\u0E1E\u0E23\u0E48\u0E2D\u0E07" });
                } else {
                  return formatTankForSnapshot(t, { Tankcheck: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E0A\u0E47\u0E04", ReadyorNot: "Ready", TankStatus: true, Lastcheck: "", Inspector: "" });
                }
              });
            }
            const snapJson = JSON.stringify(snapshotTanks);
            await env.DB.prepare(`
            INSERT INTO monthly_snapshots 
            (month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, snapshot_data, archived_at, is_closed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(month_key) DO UPDATE SET
              month_label = excluded.month_label,
              total_tanks = excluded.total_tanks,
              checked_tanks = excluded.checked_tanks,
              not_checked_tanks = excluded.not_checked_tanks,
              ready_tanks = excluded.ready_tanks,
              not_ready_tanks = excluded.not_ready_tanks,
              snapshot_data = excluded.snapshot_data,
              archived_at = excluded.archived_at,
              is_closed = excluded.is_closed
          `).bind(monthKey, monthLabel, total, checked, notChecked, ready, notReady, snapJson, archDate).run();
            return new Response(JSON.stringify({
              success: true,
              message: `\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E23\u0E2D\u0E1A\u0E40\u0E14\u0E37\u0E2D\u0E19 ${monthLabel} \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 (${total} \u0E16\u0E31\u0E07)`,
              month_key: monthKey,
              month_label: monthLabel
            }), { headers: { "Content-Type": "application/json" } });
          }
          if (pathname === "/api/history/snapshot" && method === "DELETE") {
            const permit = parseInt(url.searchParams.get("requestorPermit") || "0", 10);
            if (permit < 3) {
              return new Response(JSON.stringify({ success: false, message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E30\u0E14\u0E31\u0E1A Super Admin (P3) \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19" }), { status: 403 });
            }
            const targetKey = url.searchParams.get("month");
            if (!targetKey) return new Response(JSON.stringify({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E14\u0E37\u0E2D\u0E19" }), { status: 400 });
            await env.DB.prepare("DELETE FROM monthly_snapshots WHERE month_key = ?").bind(targetKey).run();
            return new Response(JSON.stringify({ success: true, message: `\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E23\u0E2D\u0E1A\u0E40\u0E14\u0E37\u0E2D\u0E19 ${targetKey} \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08` }), { headers: { "Content-Type": "application/json" } });
          }
        }
        if (pathname.startsWith("/api/r2/")) {
          const { curYear, minKeepYear, keepYears, deleteBeforeYear } = getRetentionYears();
          if (pathname === "/api/r2/status") {
            let r2ObjectCount = 0;
            let r2Available = Boolean(env.R2);
            if (env.R2) {
              try {
                const list = await env.R2.list({ limit: 1e3 });
                r2ObjectCount = list.objects.length;
              } catch (e) {
                console.warn("R2 list error:", e);
              }
            }
            let base64TanksCount = 0;
            let r2TanksCount = 0;
            if (env.DB) {
              const countQ = await env.DB.prepare(`
              SELECT 
                SUM(CASE WHEN pic_tank LIKE 'data:%' OR pic_area LIKE 'data:%' THEN 1 ELSE 0 END) as base64_count,
                SUM(CASE WHEN pic_tank LIKE '/r2/%' OR pic_area LIKE '/r2/%' THEN 1 ELSE 0 END) as r2_count
              FROM tanks
            `).first().catch(() => null);
              if (countQ) {
                base64TanksCount = countQ.base64_count || 0;
                r2TanksCount = countQ.r2_count || 0;
              }
            }
            return new Response(JSON.stringify({
              success: true,
              bucket: "r2jde",
              r2Available,
              retention: {
                curYear,
                minKeepYear,
                keepYears,
                deleteBeforeYear,
                rule: `\u0E40\u0E01\u0E47\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1B\u0E35\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19 (${curYear}) \u0E41\u0E25\u0E30\u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07 2 \u0E1B\u0E35 (${keepYears.join(", ")}) \u0E25\u0E1A\u0E1B\u0E35\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32 (${deleteBeforeYear - 1} \u0E41\u0E25\u0E30\u0E40\u0E01\u0E48\u0E32\u0E01\u0E27\u0E48\u0E32) \u0E17\u0E31\u0E49\u0E07 D1 \u0E41\u0E25\u0E30 R2`
              },
              stats: {
                liveTanksWithBase64: base64TanksCount,
                liveTanksWithR2: r2TanksCount,
                r2ObjectsSample: r2ObjectCount
              }
            }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
          }
          if (pathname === "/api/r2/migrate" && method === "POST") {
            const body = await request.json().catch(() => ({}));
            const permit = parseInt(body.requestorPermitDo || "0", 10);
            if (permit < 3) {
              return new Response(JSON.stringify({ success: false, message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E30\u0E14\u0E31\u0E1A Super Admin (P3) \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19" }), { status: 403 });
            }
            const migrationResult = await migrateImagesToR2(env);
            return new Response(JSON.stringify(migrationResult), {
              headers: { "Content-Type": "application/json; charset=utf-8" }
            });
          }
          if ((pathname === "/api/r2/cleanup" || pathname === "/api/r2/retention") && method === "POST") {
            const body = await request.json().catch(() => ({}));
            const permit = parseInt(body.requestorPermitDo || "0", 10);
            if (permit < 3) {
              return new Response(JSON.stringify({ success: false, message: "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E30\u0E14\u0E31\u0E1A Super Admin (P3) \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19" }), { status: 403 });
            }
            const cleanupResult = await purgeExpiredRetention(env);
            return new Response(JSON.stringify({ success: true, ...cleanupResult }), {
              headers: { "Content-Type": "application/json; charset=utf-8" }
            });
          }
        }
        if (pathname.startsWith("/api/")) {
          return new Response(JSON.stringify({ success: false, message: `API route not found: [${method}] ${pathname}` }), {
            status: 404,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        }
      } catch (apiErr) {
        return new Response(JSON.stringify({ success: false, error: apiErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
      if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
        return await env.ASSETS.fetch(request);
      }
      return new Response("Not Found", { status: 404 });
    }
  };
})();
