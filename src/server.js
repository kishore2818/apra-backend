import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { uploadMemberPhoto } from '../config/cloudinary.js';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─────────────────────────────────────────────
// HELPER: Sync new member to Google Sheet
// ─────────────────────────────────────────────
async function syncToGoogleSheet(member, familyMembers = []) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'NEW_APPLICATION',
        data: {
          applicationNo:  member.application_no,
          receiptNo:      member.receipt_no,
          submissionDate: member.submission_date,
          residentType:   member.resident_type,
          fullName:       member.full_name,
          age:            member.age,
          gender:         member.gender,
          layoutPlotNo:   member.layout_plot_no,
          doorNoOld:      member.door_no_old,
          doorNoNew:      member.door_no_new,
          street:         member.street,
          mailingAddress: member.mailing_address,
          phone:          member.phone,
          landline:       member.landline,
          email:          member.email,
          status:         member.status,
          familyMembers:  familyMembers.map(f => ({
            name:         f.name,
            relationship: f.relationship,
            age:          f.age,
            gender:       f.gender
          }))
        }
      })
    });
    console.log('✅ Synced to Google Sheet:', member.full_name);
  } catch (err) {
    console.error('⚠️  Google Sheet sync failed (non-critical):', err.message);
  }
}

// ─────────────────────────────────────────────
// 0. Root Status
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'APRA Backend API Server',
    association: 'Association for Ponnappa Nadar Nagar Residents Amenity',
    regdNo: 'Regd. No. 25/2023',
    location: 'Ponnappa Nadar Nagar, Nagercoil - 629 004',
    database: isSupabaseConfigured ? 'Supabase PostgreSQL ✅' : '⚠️ Not configured',
    endpoints: {
      health:               'GET  /api/health',
      officeBearers:        'GET  /api/heads',
      members:              'GET  /api/members',
      register:             'POST /api/members',
      updateStatus:         'PATCH /api/members/:appNo/status',
      analytics:            'GET  /api/analytics'
    },
    timestamp: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────
// 1. Health Check
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'APRA Backend API',
    database: isSupabaseConfigured ? 'connected' : 'not configured',
    time: new Date().toISOString()
  });
});

// ─────────────────────────────────────────────
// 2. GET /api/heads — Office Bearers & Advisors
//    Source: Supabase → association_heads table
// ─────────────────────────────────────────────
app.get('/api/heads', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('association_heads')
      .select('*')
      .order('id');

    if (error) throw error;

    const mapped = data.map(h => ({
      id: h.id,
      name: h.name,
      role: h.role,
      roleTamil: h.role_tamil || h.roleTamil || '',
      phone: h.phone,
      category: h.category,
      badge: h.badge || '',
      avatar: h.avatar || '',
      note: h.note || ''
    }));

    // Group by category for frontend convenience
    const grouped = {
      success:     true,
      bearers:     mapped,
      Executive:   mapped.filter(h => h.category === 'Executive'),
      Secretaries: mapped.filter(h => h.category === 'Secretaries'),
      Advisors:    mapped.filter(h => h.category === 'Advisors'),
      all:         mapped
    };

    res.json(grouped);
  } catch (err) {
    console.error('GET /api/heads error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load association heads' });
  }
});

// POST /api/heads - Add or reset office bearers
app.post('/api/heads', async (req, res) => {
  try {
    const body = req.body;
    if (body.action === 'RESET') {
      return res.json({ success: true, message: 'Office bearers reset to official records' });
    }
    const { data, error } = await supabase
      .from('association_heads')
      .insert({
        name: body.name,
        role: body.role,
        role_tamil: body.roleTamil || '',
        phone: body.phone,
        category: body.category || 'Executive',
        badge: body.badge || '',
        avatar: body.avatar || '',
        note: body.note || ''
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, bearer: data });
  } catch (err) {
    console.error('POST /api/heads error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/heads/:id - Update office bearer
app.patch('/api/heads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const updatePayload = {};
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.role !== undefined) updatePayload.role = body.role;
    if (body.roleTamil !== undefined) updatePayload.role_tamil = body.roleTamil;
    if (body.phone !== undefined) updatePayload.phone = body.phone;
    if (body.category !== undefined) updatePayload.category = body.category;
    if (body.badge !== undefined) updatePayload.badge = body.badge;
    if (body.avatar !== undefined) updatePayload.avatar = body.avatar;
    if (body.note !== undefined) updatePayload.note = body.note;

    const { data, error } = await supabase
      .from('association_heads')
      .update(updatePayload)
      .eq('id', Number(id))
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, bearer: data });
  } catch (err) {
    console.error('PATCH /api/heads error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/heads/:id - Delete office bearer
app.delete('/api/heads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('association_heads')
      .delete()
      .eq('id', Number(id));

    if (error) throw error;
    res.json({ success: true, message: 'Office bearer deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/heads error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─────────────────────────────────────────────
// 3. GET /api/members — Member List + Stats
//    Source: Supabase → members table
//    Query params: ?search=&status=&type=
// ─────────────────────────────────────────────
app.get('/api/members', async (req, res) => {
  try {
    const { search, status, type } = req.query;

    // Build query
    let query = supabase
      .from('members')
      .select('*, family_members(*)')
      .order('application_no', { ascending: false });

    // Filter by status
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    // Filter by resident type
    if (type && type !== 'ALL') {
      query = query.eq('resident_type', type);
    }

    // Search by name, phone, or street
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,phone.ilike.%${search}%,street.ilike.%${search}%`
      );
    }

    const { data: members, error } = await query;
    if (error) throw error;

    // Stats query (always on full dataset)
    const { data: allMembers, error: statsError } = await supabase
      .from('members')
      .select('status, resident_type');
    if (statsError) throw statsError;

    const total      = allMembers.length;
    const approved   = allMembers.filter(m => m.status === 'Approved').length;
    const pending    = allMembers.filter(m => m.status === 'Pending Verification' || m.status === 'Pending').length;
    const rejected   = allMembers.filter(m => m.status === 'Rejected').length;
    const ownersCount  = allMembers.filter(m => m.resident_type === 'Owner').length;
    const tenantsCount = allMembers.filter(m => m.resident_type === 'Tenant').length;
    const totalFeesCollected = approved * 100;

    const mappedMembers = members.map(m => ({
      ...m,
      applicationNo:  m.application_no,
      receiptNo:      m.receipt_no,
      submissionDate: m.submission_date,
      residentType:   m.resident_type,
      fullName:       m.full_name,
      layoutPlotNo:   m.layout_plot_no,
      doorNoOld:      m.door_no_old,
      doorNoNew:      m.door_no_new,
      mailingAddress: m.mailing_address,
      photoDataUrl:   m.photo_url,
      signatureName:  m.signature_name,
      declarationAccepted: m.declaration_accepted,
      rejectionReason: m.rejection_reason,
      familyMembers:  (m.family_members || []).map(f => ({
        id:           f.id,
        name:         f.name,
        gender:       f.gender,
        relationship: f.relationship,
        age:          f.age
      }))
    }));

    res.json({
      success: true,
      stats: { total, approved, pending, rejected, ownersCount, tenantsCount, totalFeesCollected },
      members: mappedMembers
    });
  } catch (err) {
    console.error('GET /api/members error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load members' });
  }
});

// ─────────────────────────────────────────────
// 4. POST /api/members — Register New Member
//    Saves to: Supabase DB + Google Sheet
// ─────────────────────────────────────────────
app.post('/api/members', async (req, res) => {
  try {
    const body = req.body;

    // Validation
    if (!body.fullName || !body.phone || !body.street) {
      return res.status(400).json({
        success: false,
        message: 'Full name, phone number, and street are required.'
      });
    }

    // Get next application & receipt numbers
    const { data: maxData } = await supabase
      .from('members')
      .select('application_no, receipt_no')
      .order('application_no', { ascending: false })
      .limit(1);

    const lastAppNo     = maxData?.[0]?.application_no || 0;
    const lastReceiptNo = maxData?.[0]?.receipt_no     || 0;
    const nextAppNo     = lastAppNo + 1;

    // Upload photo to Cloudinary if provided
    let finalPhotoUrl = body.photoDataUrl || '';
    if (finalPhotoUrl && finalPhotoUrl.startsWith('data:image')) {
      try {
        const cloudUrl = await uploadMemberPhoto(finalPhotoUrl, `member_${nextAppNo}`);
        if (cloudUrl) finalPhotoUrl = cloudUrl;
        // If cloudUrl is empty, keep the base64 as fallback
      } catch (uploadErr) {
        console.warn('⚠️ Cloudinary photo upload failed, storing base64 fallback:', uploadErr.message);
        // finalPhotoUrl remains as base64
      }
    }

    // ── Step 1: Insert main member record into Supabase ──
    const { data: newMember, error: memberError } = await supabase
      .from('members')
      .insert({
        application_no:      nextAppNo,
        receipt_no:          lastReceiptNo + 1,
        submission_date:     body.submissionDate || new Date().toISOString().split('T')[0],
        resident_type:       body.residentType || 'Owner',
        full_name:           body.fullName.toUpperCase().trim(),
        age:                 Number(body.age) || null,
        gender:              body.gender || 'Male',
        layout_plot_no:      body.layoutPlotNo || '',
        door_no_old:         body.doorNoOld || '',
        door_no_new:         body.doorNoNew || '',
        street:              body.street || '',
        mailing_address:     body.mailingAddress || '',
        phone:               body.phone,
        landline:            body.landline || '',
        email:               body.email || '',
        status:              'Pending Verification',
        photo_url:           finalPhotoUrl,
        signature_name:      body.signatureName || body.fullName || '',
        declaration_accepted: Boolean(body.declarationAccepted)
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // ── Step 2: Insert family members linked to this member ──
    let insertedFamily = [];
    if (body.familyMembers?.length > 0) {
      const familyRows = body.familyMembers.map(f => ({
        member_id:    newMember.id,
        application_no: newMember.application_no,
        name:         f.name || '',
        gender:       f.gender || '',
        relationship: f.relationship || '',
        age:          Number(f.age) || null
      }));

      const { data: familyData, error: familyError } = await supabase
        .from('family_members')
        .insert(familyRows)
        .select();

      if (familyError) console.error('Family insert error:', familyError.message);
      else insertedFamily = familyData;
    }

    // ── Step 3: Sync to Google Sheet (non-blocking) ──
    syncToGoogleSheet(newMember, insertedFamily);

    res.status(201).json({
      success: true,
      message: `Application #${newMember.application_no} registered successfully.`,
      data: { ...newMember, family_members: insertedFamily }
    });

  } catch (err) {
    console.error('POST /api/members error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// 4b. POST /api/upload-photo — Direct Cloudinary Upload
// ─────────────────────────────────────────────
app.post('/api/upload-photo', async (req, res) => {
  try {
    const { image, publicId } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image data is required.' });
    }
    const url = await uploadMemberPhoto(image, publicId);
    res.json({ success: true, url });
  } catch (err) {
    console.error('Photo upload error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─────────────────────────────────────────────
// 5. PATCH /api/members/:appNo/status — Approve / Reject
//    Source: Supabase → members table
// ─────────────────────────────────────────────
app.patch('/api/members/:appNo/status', async (req, res) => {
  try {
    const { appNo } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['Approved', 'Rejected', 'Pending Verification', 'Pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };
    if (reason) updateData.rejection_reason = reason;

    const { data, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('application_no', Number(appNo))
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Member not found' });

    res.json({ success: true, member: data });
  } catch (err) {
    console.error('PATCH /api/members status error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// 6. GET /api/analytics — Demographics
//    Source: Supabase → members table
// ─────────────────────────────────────────────
app.get('/api/analytics', async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('age, street, resident_type, gender, status');

    if (error) throw error;

    const ageGroups = { '18-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    const streetDistribution = {};
    const genderCount = { Male: 0, Female: 0, Other: 0 };

    members.forEach(m => {
      const age = Number(m.age) || 0;
      if (age >= 18 && age <= 35)      ageGroups['18-35']++;
      else if (age >= 36 && age <= 50) ageGroups['36-50']++;
      else if (age >= 51 && age <= 65) ageGroups['51-65']++;
      else if (age > 65)               ageGroups['65+']++;

      const street = m.street || 'Other';
      streetDistribution[street] = (streetDistribution[street] || 0) + 1;

      if (m.gender) genderCount[m.gender] = (genderCount[m.gender] || 0) + 1;
    });

    res.json({
      success: true,
      total: members.length,
      ageGroups,
      streetDistribution,
      genderCount
    });
  } catch (err) {
    console.error('GET /api/analytics error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load analytics' });
  }
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 APRA Backend API running at http://localhost:${PORT}`);
  console.log(`📊 Database: ${isSupabaseConfigured ? 'Supabase PostgreSQL ✅' : '⚠️ Not configured'}`);
  console.log(`📋 Google Sheet sync: ${process.env.GOOGLE_SHEET_WEBHOOK_URL ? 'Enabled ✅' : 'Disabled (no webhook URL)'}\n`);
});
