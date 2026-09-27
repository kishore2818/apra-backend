/**
 * APRA Association Google Sheets Automation Script
 * Association for Ponnappa Nadar Nagar Residents Amenity (Regd. No. 25/2023)
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Replace all existing text with this code.
 * 4. Click 'Deploy' > 'New Deployment'.
 * 5. Select type: 'Web App'.
 * 6. Set 'Execute as': 'Me' and 'Who has access': 'Anyone'.
 * 7. Copy the Web App URL and place it in your .env as GOOGLE_SHEET_WEBHOOK_URL.
 */

function setupSheetHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
    "Door No (Old/New)",
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
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    sheet.setFrozenRows(1);
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    setupSheetHeaders();

    var payload = JSON.parse(e.postData.contents);
    var item = payload.data || payload.member || payload;

    var familySummary = "";
    if (item.familyMembers && Array.isArray(item.familyMembers)) {
      familySummary = item.familyMembers.map(function(f) {
        return f.name + " (" + (f.relationship || "Member") + ", " + (f.age || "") + "y)";
      }).join("; ");
    } else if (item.familyDetails) {
      familySummary = item.familyDetails;
    }

    var row = [
      new Date().toLocaleString(),
      item.applicationNo || "",
      item.receiptNo || "",
      item.submissionDate || "",
      item.residentType || "",
      item.fullName || "",
      item.age || "",
      item.gender || "",
      item.layoutPlotNo || item.plotNo || "",
      (item.doorNoOld || "") + " / " + (item.doorNoNew || ""),
      item.street || "",
      item.mailingAddress || "",
      item.phone || "",
      item.email || "",
      item.status || "Pending Verification",
      "₹" + (item.admissionFee || 100),
      (item.familyMembers ? item.familyMembers.length : 0),
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
  return ContentService.createTextOutput("APRA Google Apps Script Webhook is active and healthy.");
}
