/**
 * APRA Association Google Sheets Automation Script
 * Association for Ponnappa Nadar Nagar Residents Amenity (Regd. No. 25/2023)
 *
 * SETUP STEPS:
 * 1. Create a Google Sheet at sheets.google.com
 * 2. Copy its ID from the URL and paste it below as SHEET_ID
 * 3. Click 'Deploy' → 'New Deployment' → Web App → Anyone → Deploy
 * 4. Copy the Web App URL → paste in backend/.env as GOOGLE_SHEET_WEBHOOK_URL
 */

// ✅ APRA Members Google Sheet ID
var SHEET_ID = '1eH2WP9cI0g_tZGhmlecsuep_uj5sV8V3L6ebrN8c_Ck';

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheets()[0]; // uses the first sheet tab
}

function setupSheetHeaders() {
  var sheet = getSheet();
  var headers = [
    "Timestamp",
    "Application No",
    "Receipt No",
    "Date",
    "Resident Type",
    "Full Name",
    "Age",
    "Gender",
    "Plot No",
    "Door No (Old / New)",
    "Street",
    "Mailing Address",
    "Phone Number",
    "Email",
    "Status",
    "Admission Fee",
    "Family Members Count",
    "Family Members List"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#1a3a5c")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
}

function doPost(e) {
  try {
    var sheet = getSheet();
    setupSheetHeaders();

    var payload = JSON.parse(e.postData.contents);
    var item = payload.data || payload.member || payload;

    // Build family members summary
    var familySummary = "";
    if (item.familyMembers && Array.isArray(item.familyMembers)) {
      familySummary = item.familyMembers.map(function(f) {
        return f.name + " (" + (f.relationship || "Member") + ", " + (f.age || "") + "y)";
      }).join("; ");
    }

    var row = [
      new Date().toLocaleString(),
      item.applicationNo  || "",
      item.receiptNo      || "",
      item.submissionDate || "",
      item.residentType   || "",
      item.fullName       || "",
      item.age            || "",
      item.gender         || "",
      item.layoutPlotNo   || item.plotNo || "",
      (item.doorNoOld || "") + " / " + (item.doorNoNew || ""),
      item.street         || "",
      item.mailingAddress || "",
      item.phone          || "",
      item.email          || "",
      item.status         || "Pending Verification",
      "₹" + (item.admissionFee || 100),
      item.familyMembers  ? item.familyMembers.length : 0,
      familySummary
    ];

    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Row added for " + item.fullName,
      applicationNo: item.applicationNo
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    "APRA Google Apps Script Webhook is active and healthy."
  );
}
