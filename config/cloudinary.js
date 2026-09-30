import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'iobbbixl',
  api_key: process.env.CLOUDINARY_API_KEY || '157951713862251',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'TZHmjB5KD0IOTYbQdkvA4acWCJA',
  secure: true
});

/**
 * Upload a base64 or image URL to Cloudinary
 * @param {string} fileStr - Base64 data URL or remote URL
 * @param {string} publicId - Optional public ID
 * @returns {Promise<string>} - Cloudinary secure URL
 */
export async function uploadMemberPhoto(fileStr, publicId = null) {
  if (!fileStr) return '';
  // If it's already a hosted URL, return it
  if (fileStr.startsWith('http://') || fileStr.startsWith('https://')) {
    return fileStr;
  }

  const folder = process.env.CLOUDINARY_FOLDER || 'apra-members-photos';

  try {
    // Try signed upload first
    const options = {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 500, height: 600, crop: 'limit', quality: 'auto:good' }
      ]
    };
    if (publicId) {
      options.public_id = publicId;
      options.overwrite = true;
    }

    const uploadResponse = await cloudinary.uploader.upload(fileStr, options);
    console.log('✅ Cloudinary upload success:', uploadResponse.secure_url);
    return uploadResponse.secure_url;
  } catch (err) {
    console.warn('⚠️ Signed upload failed, trying unsigned upload:', err.message);

    // Fallback: try unsigned upload
    try {
      const unsignedOptions = {
        folder,
        resource_type: 'image',
        upload_preset: 'ml_default' // Cloudinary default unsigned preset
      };
      if (publicId) unsignedOptions.public_id = publicId;

      const unsignedRes = await cloudinary.uploader.unsigned_upload(fileStr, 'ml_default', unsignedOptions);
      console.log('✅ Cloudinary unsigned upload success:', unsignedRes.secure_url);
      return unsignedRes.secure_url;
    } catch (unsignedErr) {
      console.error('❌ Cloudinary upload failed completely:', unsignedErr.message);
      // Return empty string — the base64 will be stored directly in the DB
      // This is not ideal but prevents total failure
      return '';
    }
  }
}

export default cloudinary;
