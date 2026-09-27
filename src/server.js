import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const HEADS_FILE = path.join(__dirname, '..', 'data', 'association_heads.json');
const MEMBERS_FILE = path.join(__dirname, '..', 'data', 'members_db.json');

// Helper to read JSON
function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return null;
  }
}

// Helper to write JSON
function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// 0. Root Welcome / Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'APRA Backend API Server',
    association: 'Association for Ponnappa Nadar Nagar Residents Amenity (பொன்னப்ப நாடார் நகர் குடியிருப்பு வசதி மேம்பாட்டு சங்கம்)',
    regdNo: 'Regd. No. 25/2023',
    location: 'Ponnappa Nadar Nagar, Nagercoil - 629 004',
    endpoints: {
      health: '/api/health',
      officeBearers: '/api/heads',
      members: '/api/members',
      membershipRegistration: 'POST /api/membership',
      statusUpdate: 'PATCH /api/admin/status'
    },
    documentation: 'https://github.com/kishore2818/apra-backend',
    timestamp: new Date().toISOString()
  });
});

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'APRA Backend API',
    association: 'Association for Ponnappa Nadar Nagar Residents Amenity',
    regdNo: '25/2023',
    time: new Date().toISOString()
  });
});

// 2. Association Heads & Advisors (Extracted from Document 1)
app.get('/api/heads', (req, res) => {
  const data = readJson(HEADS_FILE);
  if (!data) return res.status(500).json({ error: 'Could not load association heads' });
  res.json(data);
});

// 3. Member list & Statistics
app.get('/api/members', (req, res) => {
  const members = readJson(MEMBERS_FILE) || [];
  const { search, status, type } = req.query;

  let filtered = [...members];

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(m => 
      m.fullName?.toLowerCase().includes(s) ||
      m.phone?.includes(s) ||
      m.street?.toLowerCase().includes(s) ||
      String(m.applicationNo).includes(s)
    );
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter(m => m.status === status);
  }

  if (type && type !== 'ALL') {
    filtered = filtered.filter(m => m.residentType === type);
  }

  // Summary stats
  const total = members.length;
  const approved = members.filter(m => m.status === 'Approved').length;
  const pending = members.filter(m => m.status === 'Pending Verification' || m.status === 'Pending').length;
  const rejected = members.filter(m => m.status === 'Rejected').length;
  const ownersCount = members.filter(m => m.residentType === 'Owner').length;
  const tenantsCount = members.filter(m => m.residentType === 'Tenant').length;
  const totalFeesCollected = approved * 100;

  res.json({
    success: true,
    stats: {
      total,
      approved,
      pending,
      rejected,
      ownersCount,
      tenantsCount,
      totalFeesCollected
    },
    members: filtered
  });
});

// 4. Register New Membership Application (Document 2 Form)
app.post('/api/members', async (req, res) => {
  try {
    const body = req.body;
    if (!body.fullName || !body.phone || !body.street) {
      return res.status(400).json({
        success: false,
        message: 'Applicant name, mobile number, and street name are mandatory.'
      });
    }

    const members = readJson(MEMBERS_FILE) || [];
    const maxApp = members.reduce((m, item) => Math.max(m, Number(item.applicationNo) || 0), 0);
    const maxReceipt = members.reduce((m, item) => Math.max(m, Number(item.receiptNo) || 0), 0);

    const newRecord = {
      applicationNo: maxApp + 1,
      receiptNo: maxReceipt + 1,
      submissionDate: body.submissionDate || new Date().toISOString().split('T')[0],
      residentType: body.residentType || 'Owner',
      fullName: body.fullName.toUpperCase().trim(),
      age: Number(body.age) || null,
      gender: body.gender || 'Male',
      layoutPlotNo: body.layoutPlotNo || '',
      doorNoOld: body.doorNoOld || '',
      doorNoNew: body.doorNoNew || '',
      street: body.street || '',
      mailingAddress: body.mailingAddress || '',
      phone: body.phone,
      landline: body.landline || '',
      email: body.email || '',
      admissionFee: 100,
      status: 'Pending Verification',
      photoUrl: body.photoDataUrl || '',
      familyMembers: body.familyMembers || [],
      declarationAccepted: Boolean(body.declarationAccepted),
      createdAt: new Date().toISOString()
    };

    members.unshift(newRecord);
    writeJson(MEMBERS_FILE, members);

    // Optional forward to Google Sheet Webhook if configured
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'NEW_APPLICATION', member: newRecord })
        });
      } catch (err) {
        console.error('Webhook sync failed:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Application recorded successfully.',
      data: newRecord
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Update status (Approve / Reject)
app.patch('/api/members/:appNo/status', (req, res) => {
  const { appNo } = req.params;
  const { status, reason } = req.body;

  const members = readJson(MEMBERS_FILE) || [];
  const index = members.findIndex(m => String(m.applicationNo) === String(appNo));

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }

  members[index].status = status;
  if (reason) members[index].rejectionReason = reason;
  members[index].updatedAt = new Date().toISOString();

  writeJson(MEMBERS_FILE, members);
  res.json({ success: true, member: members[index] });
});

// 6. Demographics Analytics
app.get('/api/analytics', (req, res) => {
  const members = readJson(MEMBERS_FILE) || [];

  const ageGroups = { '18-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
  const streetDistribution = {};

  members.forEach(m => {
    const age = Number(m.age) || 0;
    if (age >= 18 && age <= 35) ageGroups['18-35']++;
    else if (age >= 36 && age <= 50) ageGroups['36-50']++;
    else if (age >= 51 && age <= 65) ageGroups['51-65']++;
    else if (age > 65) ageGroups['65+']++;

    const street = m.street || 'Other';
    streetDistribution[street] = (streetDistribution[street] || 0) + 1;
  });

  res.json({
    success: true,
    total: members.length,
    ageGroups,
    streetDistribution
  });
});

app.listen(PORT, () => {
  console.log(`APRA Backend API running at http://localhost:${PORT}`);
});
