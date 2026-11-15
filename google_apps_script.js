/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: COMPLETE EVENT TICKETING & CHECK-IN SYSTEM
 * ==============================================================================
 * 
 * 1. Automatic QR Code Ticket generation on Google Form submission.
 * 2. Automated email delivery with QR code displayed directly inside the email.
 * 3. Real-time Google Sheets tracking (Ticket ID, Check-in Status, Timestamp).
 * 4. Exact identical Scanner UI directly inside the Google Web App!
 */

// --- 1. CONFIGURATION ---
const CONFIG = {
  EVENT_NAME: "Annual Tech Conference 2026",
  ORGANIZER_NAME: "Event Operations Team",

  // Must match the question titles in your Google Form
  COL_NAME: "Full Name",
  COL_EMAIL: "Email Address",
  COL_ORG: "Organization",
  COL_PHONE: "Contact Number"
};

/**
 * --- 2. AUTOMATION: RUNS ON FORM SUBMISSION ---
 */
function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  ensureTrackingColumns(sheet, headers);

  const row = e ? e.range.getRow() : sheet.getLastRow();
  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Helper to extract non-empty value by matching column names
  function getVal(colNames) {
    if (!Array.isArray(colNames)) colNames = [colNames];
    const targets = colNames.map(s => s.toLowerCase());
    
    // Look through all columns matching any target name
    for (let i = 0; i < headers.length; i++) {
      const headerStr = String(headers[i]).trim().toLowerCase();
      if (targets.some(t => headerStr === t || headerStr.includes(t))) {
        const cellVal = String(rowData[i]).trim();
        if (cellVal) return cellVal; // return first non-empty match
      }
    }
    return "";
  }

  // 1. Get attendee details
  let fullName = getVal([CONFIG.COL_NAME, "Full Name", "Name", "Attendee Name"]) || "Attendee";
  let organization = getVal([CONFIG.COL_ORG, "Organization", "Company", "School"]) || "N/A";
  let contact = getVal([CONFIG.COL_PHONE, "Contact Number", "Phone", "Mobile", "Contact"]) || "N/A";

  // 2. Bulletproof Email Finder:
  // First try by column name, and if empty, scan all row cells for a valid '@' email address!
  let email = getVal([CONFIG.COL_EMAIL, "Email Address", "Email", "Username"]);

  if (!email || !email.includes("@")) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    for (let i = 0; i < rowData.length; i++) {
      const cellText = String(rowData[i]).trim();
      const match = cellText.match(emailRegex);
      if (match) {
        email = match[0];
        break;
      }
    }
  }

  if (!email) {
    Logger.log("⚠️ Could not find an email address in row " + row);
    return;
  }

  // 1. Generate Unique Ticket ID (e.g. TKT-7A3F9B2C)
  const uniqueHash = Utilities.getUuid().substring(0, 8).toUpperCase();
  const ticketId = "TKT-" + uniqueHash;

  // 2. Generate QR Code image URL (QuickChart renders directly in all email clients)
  const qrApiUrl = "https://quickchart.io/qr?text=" + encodeURIComponent(ticketId) + "&size=300&ecLevel=H";

  // 3. Send Confirmation Email (Displays picture directly, NO attachments tray)
  sendTicketEmail(fullName, email, ticketId, organization, qrApiUrl);

  // 4. Update Google Sheet
  const ticketIdColIdx = headers.indexOf("Ticket ID") + 1;
  const statusColIdx = headers.indexOf("Check-in Status") + 1;
  const timeColIdx = headers.indexOf("Check-in Timestamp") + 1;

  if (ticketIdColIdx > 0) sheet.getRange(row, ticketIdColIdx).setValue(ticketId);
  if (statusColIdx > 0) sheet.getRange(row, statusColIdx).setValue("NOT CHECKED IN");
  if (timeColIdx > 0) sheet.getRange(row, timeColIdx).setValue("");

  Logger.log("Processed registration for: " + email + " | Ticket: " + ticketId);
}

function ensureTrackingColumns(sheet, headers) {
  const required = ["Ticket ID", "Check-in Status", "Check-in Timestamp"];
  required.forEach(col => {
    if (headers.indexOf(col) === -1) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(col);
      headers.push(col);
    }
  });
}

/**
 * --- 3. MESSAGING: SENDS HTML EMAIL WITH VISIBLE PICTURE ---
 */
function sendTicketEmail(name, email, ticketId, organization, qrApiUrl) {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; padding: 24px 10px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px 24px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
        
        <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 22px;">${CONFIG.EVENT_NAME}</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;">Your registration is confirmed! Present this QR code pass at check-in.</p>
        
        <!-- Ticket Box -->
        <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; display: inline-block; margin-bottom: 24px;">
          <img src="${qrApiUrl}" width="220" height="220" style="display: block; margin: 0 auto; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff;" alt="Event Ticket QR Code" />
          <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #4338ca; letter-spacing: 1.5px; margin-top: 12px;">
            ${ticketId}
          </div>
        </div>

        <!-- Details Card -->
        <div style="text-align: left; background: #f8fafc; border-radius: 10px; padding: 16px 20px; font-size: 13px; color: #334155; margin-bottom: 20px; border: 1px solid #f1f5f9;">
          <div style="margin-bottom: 8px;"><b>Attendee:</b> ${name}</div>
          <div style="margin-bottom: 8px;"><b>Email:</b> ${email}</div>
          <div style="margin-bottom: 8px;"><b>Organization:</b> ${organization}</div>
          <div><b>Admission:</b> Standard Pass</div>
        </div>

        <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.4;">
          Tip: Bookmark or take a screenshot of this ticket on your phone for quick entry at the entrance.
        </p>
      </div>
    </body>
    </html>
  `;

  MailApp.sendEmail({
    to: email,
    subject: `Your Admission Ticket - ${CONFIG.EVENT_NAME} [${ticketId}]`,
    htmlBody: htmlBody
  });
}

/**
 * --- 4. WEB APP: SCANNER & CHECK-IN API ---
 */
function doGet(e) {
  const ticketId = e && e.parameter ? e.parameter.ticket_id : null;
  const format = e && e.parameter ? e.parameter.format : null;

  // Direct Verification API (if ticket_id is passed)
  if (ticketId) {
    const result = processCheckIn(ticketId.trim());
    if (format === "json") {
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    return HtmlService.createHtmlOutput(renderResultHtml(result));
  }

  // Exact identical Scanner UI directly inside Google Web App
  return HtmlService.createHtmlOutput(getScannerHtml())
    .setTitle("Check-in Scanner - " + CONFIG.EVENT_NAME)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function processCheckIn(ticketId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const ticketColIdx = headers.indexOf("Ticket ID");
  const statusColIdx = headers.indexOf("Check-in Status");
  const timeColIdx = headers.indexOf("Check-in Timestamp");

  if (ticketColIdx === -1) {
    return { status: "error", message: "'Ticket ID' column not found in Google Sheet." };
  }

  function getAttendeeField(rowArr, keywords) {
    const targets = keywords.map(k => k.toLowerCase());
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i]).trim().toLowerCase();
      if (targets.some(t => h === t || h.includes(t))) {
        const val = String(rowArr[i]).trim();
        if (val) return val;
      }
    }
    return "";
  }

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][ticketColIdx]).trim().toUpperCase() === ticketId.toUpperCase()) {
      const attendeeName = getAttendeeField(data[r], [CONFIG.COL_NAME, "Full Name", "Name"]) || "Attendee";
      const org = getAttendeeField(data[r], [CONFIG.COL_ORG, "Organization", "Company"]) || "N/A";
      const currentStatus = data[r][statusColIdx];

      if (currentStatus === "CHECKED IN") {
        return {
          status: "already_checked_in",
          message: attendeeName + " was already checked in at " + data[r][timeColIdx],
          name: attendeeName,
          org: org,
          ticketId: ticketId,
          time: data[r][timeColIdx]
        };
      }

      // Mark Checked In
      const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      sheet.getRange(r + 1, statusColIdx + 1).setValue("CHECKED IN");
      sheet.getRange(r + 1, timeColIdx + 1).setValue(nowStr);

      return {
        status: "success",
        message: "Welcome, " + attendeeName + "!",
        name: attendeeName,
        org: org,
        ticketId: ticketId,
        time: nowStr
      };
    }
  }

  return { status: "not_found", message: "Ticket ID '" + ticketId + "' not found." };
}

function renderResultHtml(result) {
  let color = "#16a34a"; // green
  let title = "CHECK-IN APPROVED ✅";
  if (result.status === "already_checked_in") {
    color = "#d97706"; // amber
    title = "ALREADY CHECKED IN ⚠️";
  } else if (result.status !== "success") {
    color = "#dc2626"; // red
    title = "INVALID TICKET ❌";
  }

  return `
    <div style="font-family:sans-serif; text-align:center; padding:40px 20px; max-width:400px; margin:40px auto; border-radius:16px; border:2px solid ${color};">
      <h1 style="color:${color}; font-size:24px; margin-top:0;">${title}</h1>
      <p style="font-size:18px; font-weight:bold; color:#1e293b;">${result.message}</p>
      ${result.name ? `<p style="color:#64748b;">Attendee: <b>${result.name}</b></p>` : ''}
      <a href="javascript:history.back()" style="display:inline-block; margin-top:20px; padding:10px 20px; background:#4338ca; color:#fff; text-decoration:none; border-radius:8px; font-size:14px;">Scan Another</a>
    </div>
  `;
}

/**
 * EXACT IDENTICAL SCANNER UI
 */
function getScannerHtml() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Check-in Scanner</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-100 min-h-screen text-slate-800 p-4 flex flex-col items-center font-sans">

  <div class="max-w-md w-full space-y-4">
    
    <!-- Header -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-center">
      <div class="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full mb-2">
        <i class="fa-solid fa-qrcode text-2xl"></i>
      </div>
      <h1 class="text-xl font-bold text-slate-900">Event Check-in Scanner</h1>
      <p class="text-xs text-slate-500 mt-1">Live camera scanner connected to Google Sheets</p>
    </div>

    <!-- Live Camera Scanner Box -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
      <div class="relative bg-slate-900 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center">
        <div id="reader" class="w-full h-full"></div>
        <div id="cameraPlaceholder" class="text-center p-6 text-slate-400">
          <i class="fa-solid fa-camera text-4xl mb-2 text-slate-500"></i>
          <p class="text-xs">Click "Start Camera" below</p>
        </div>
      </div>

      <div class="flex gap-2">
        <button id="startBtn" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow">
          <i class="fa-solid fa-play"></i>
          <span>Start Camera</span>
        </button>
        <button id="stopBtn" class="hidden py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs transition flex items-center justify-center space-x-1.5">
          <i class="fa-solid fa-stop"></i>
          <span>Stop</span>
        </button>
      </div>

      <!-- Native Camera Snap Fallback (Always works on mobile even if live streaming is restricted) -->
      <div id="snapFallbackBox" class="pt-1">
        <label class="block cursor-pointer w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs text-center border border-slate-200 transition">
          <i class="fa-solid fa-camera-retro mr-1 text-slate-500"></i>
          <span>Snap QR Photo (Mobile Camera)</span>
          <input type="file" id="cameraSnapInput" accept="image/*" capture="environment" class="hidden">
        </label>
      </div>
    </div>

    <!-- Live Status Result Card -->
    <div id="resultCard" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-center hidden transition-all">
      <div id="resultIcon" class="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl mb-2"></div>
      <h2 id="resultTitle" class="text-base font-bold"></h2>
      <p id="resultMsg" class="text-xs mt-1"></p>
    </div>

    <!-- Manual Code Input Fallback -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <label class="block text-xs font-semibold text-slate-700 mb-1">
        ⌨️ Manual Ticket ID or USB Scanner
      </label>
      <form id="manualForm" class="flex gap-2">
        <input type="text" id="manualInput" placeholder="TKT-XXXXXXXX"
          class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase outline-none focus:ring-2 focus:ring-indigo-500">
        <button type="submit" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition">
          Verify
        </button>
      </form>
    </div>

  </div>

  <script>
    let html5QrCode = null;
    let isScanning = false;
    let cooldown = false;

    // Audio Chimes (Web Audio API)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playChime(type) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'duplicate') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    }

    // Camera Controls
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const placeholder = document.getElementById('cameraPlaceholder');

    startBtn.addEventListener('click', () => {
      html5QrCode = new Html5Qrcode('reader');
      placeholder.classList.add('hidden');

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (cooldown) return;
          cooldown = true;
          verifyTicket(decodedText);
          setTimeout(() => { cooldown = false; }, 2500);
        },
        (error) => {}
      ).then(() => {
        isScanning = true;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
      }).catch(err => {
        console.warn('Live stream restricted by iframe policy:', err);
        placeholder.classList.remove('hidden');
        alert('Browser security requires photo capture inside Google Web Apps. Please tap "Snap QR Photo" below!');
      });
    });

    stopBtn.addEventListener('click', () => {
      if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
          isScanning = false;
          startBtn.classList.remove('hidden');
          stopBtn.classList.add('hidden');
          placeholder.classList.remove('hidden');
        });
      }
    });

    // Snap QR Photo input
    document.getElementById('cameraSnapInput').addEventListener('change', async (e) => {
      if (e.target.files.length === 0) return;
      const file = e.target.files[0];
      const scanner = new Html5Qrcode('reader');
      try {
        const code = await scanner.scanFile(file, true);
        verifyTicket(code);
      } catch (err) {
        showResultCard('error', 'Could not read QR code', 'Please take a clearer photo of the ticket pass.');
      }
    });

    // Manual Input
    document.getElementById('manualForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const val = document.getElementById('manualInput').value.trim();
      if (val) {
        verifyTicket(val);
        document.getElementById('manualInput').value = '';
      }
    });

    // Verification Logic (Directly communicates with Google Apps Script)
    function verifyTicket(ticketId) {
      showResultCard('loading', 'Verifying Ticket...', ticketId);

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        // Native Google Apps Script execution
        google.script.run
          .withSuccessHandler((data) => handleCheckinResponse(data))
          .withFailureHandler((err) => showResultCard('error', 'Connection Error', 'Please check Google Sheets.'))
          .processCheckIn(ticketId);
      } else {
        // Fallback fetch
        const url = window.location.pathname + '?ticket_id=' + encodeURIComponent(ticketId) + '&format=json';
        fetch(url)
          .then(res => res.json())
          .then(data => handleCheckinResponse(data))
          .catch(err => showResultCard('error', 'Connection Error', 'Please check Google Sheets.'));
      }
    }

    function handleCheckinResponse(data) {
      if (data.status === 'success') {
        playChime('success');
        showResultCard('success', 'APPROVED ✅', data.message);
      } else if (data.status === 'already_checked_in') {
        playChime('duplicate');
        showResultCard('duplicate', 'ALREADY CHECKED IN ⚠️', data.message);
      } else {
        playChime('error');
        showResultCard('error', 'INVALID TICKET ❌', data.message);
      }
    }

    function showResultCard(type, title, msg) {
      const card = document.getElementById('resultCard');
      const icon = document.getElementById('resultIcon');
      const titleEl = document.getElementById('resultTitle');
      const msgEl = document.getElementById('resultMsg');

      card.classList.remove('hidden');

      if (type === 'loading') {
        card.className = 'bg-blue-50 border-2 border-blue-400 p-5 rounded-2xl text-center text-blue-900';
        icon.className = 'w-12 h-12 mx-auto rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl mb-2';
        icon.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      } else if (type === 'success') {
        card.className = 'bg-emerald-50 border-2 border-emerald-500 p-5 rounded-2xl text-center text-emerald-900';
        icon.className = 'w-12 h-12 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl mb-2';
        icon.innerHTML = '<i class="fa-solid fa-check"></i>';
      } else if (type === 'duplicate') {
        card.className = 'bg-amber-50 border-2 border-amber-500 p-5 rounded-2xl text-center text-amber-900';
        icon.className = 'w-12 h-12 mx-auto rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl mb-2';
        icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      } else {
        card.className = 'bg-rose-50 border-2 border-rose-500 p-5 rounded-2xl text-center text-rose-900';
        icon.className = 'w-12 h-12 mx-auto rounded-full bg-rose-500 text-white flex items-center justify-center text-2xl mb-2';
        icon.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      }

      titleEl.innerText = title;
      msgEl.innerText = msg;
    }
  </script>
</body>
</html>
  `;
}

/**
 * --- 5. ONE-CLICK TRIGGER SETUP ---
 */
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
  Logger.log("✅ Trigger setup complete!");
}
