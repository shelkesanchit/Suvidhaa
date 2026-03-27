/**
 * UDID Verification Service
 * Handles UDID verification with backend API and demo data
 */
import api from '../../utils/api';

// Demo UDID data for testing
const DEMO_UDID_DATA = {
  'BLIND12345': {
    full_name: 'Ramesh Kumar Sharma',
    father_name: 'Suresh Kumar Sharma',
    date_of_birth: '1990-05-15',
    gender: 'Male',
    age: 34,
    aadhaar_last4: '4523',
    aadhaar_number: 'XXXX-XXXX-4523',
    mobile: '9876543210',
    email: 'ramesh.sharma@example.com',
    address: {
      line1: 'Flat 12, Shanti Nagar',
      line2: 'Andheri East',
      ward: 'Ward 3',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400069'
    },
    disability_type: 'Visual Impairment',
    disability_percentage: 100,
    udid_number: 'BLIND12345',
    aadhaar_linked: true,
    previous_applications: []
  },
  'BLIND67890': {
    full_name: 'Sunita Devi',
    father_name: 'Ram Prasad',
    date_of_birth: '1985-08-20',
    gender: 'Female',
    age: 39,
    aadhaar_last4: '7890',
    aadhaar_number: 'XXXX-XXXX-7890',
    mobile: '8765432109',
    email: 'sunita.devi@example.com',
    address: {
      line1: 'House No. 23, Gandhi Nagar',
      line2: 'Civil Lines',
      ward: 'Ward 7',
      city: 'Nagpur',
      district: 'Nagpur',
      state: 'Maharashtra',
      pincode: '440001'
    },
    disability_type: 'Visual Impairment',
    disability_percentage: 80,
    udid_number: 'BLIND67890',
    aadhaar_linked: true,
    previous_applications: []
  }
};

/**
 * Verify UDID against backend API
 * Falls back to demo data if API is unavailable
 * @param {string} udid - The UDID to verify
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function verifyUDID(udid) {
  if (!udid) {
    return { success: false, error: 'UDID is required' };
  }

  const normalizedUdid = udid.toUpperCase().trim();

  // Check demo data first for testing
  const demoData = getDemoData(normalizedUdid);
  if (demoData) {
    return { success: true, data: demoData };
  }

  try {
    // Try backend API
    const response = await api.post('/accessibility/verify-udid', { udid: normalizedUdid });

    if (response.data.success && response.data.data) {
      return {
        success: true,
        data: response.data.data
      };
    }

    return {
      success: false,
      error: response.data.error || 'UDID not found'
    };
  } catch (error) {
    console.warn('UDID API error, checking demo data:', error.message);

    // Fallback to demo data
    if (demoData) {
      return { success: true, data: demoData };
    }

    return {
      success: false,
      error: error.response?.data?.error || 'UDID not found. Please check your ID and try again.'
    };
  }
}

/**
 * Get demo data for known test UDIDs
 * @param {string} udid - The UDID to lookup
 * @returns {object|null} - Demo data or null
 */
export function getDemoData(udid) {
  if (!udid) return null;
  const normalizedUdid = udid.toUpperCase().trim();
  return DEMO_UDID_DATA[normalizedUdid] || null;
}

/**
 * Check if a UDID is a known demo/test ID
 * @param {string} udid - The UDID to check
 * @returns {boolean}
 */
export function isDemoUDID(udid) {
  if (!udid) return false;
  const normalizedUdid = udid.toUpperCase().trim();
  return Object.keys(DEMO_UDID_DATA).includes(normalizedUdid);
}

/**
 * Map UDID data to form fields based on mapping configuration
 * @param {object} udidData - The verified UDID data
 * @param {object} mapping - Field name to UDID key mapping
 * @returns {object} - Mapped form data
 */
export function mapUDIDToFormData(udidData, mapping) {
  if (!udidData || !mapping) return {};

  const formData = {};

  for (const [formField, udidKey] of Object.entries(mapping)) {
    let value;

    if (udidKey.includes('.')) {
      // Handle nested keys like 'address.line1'
      const keys = udidKey.split('.');
      value = udidData;
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) break;
      }
    } else {
      value = udidData[udidKey];
    }

    if (value !== undefined && value !== null) {
      formData[formField] = value;
    }
  }

  return formData;
}

/**
 * Common field mappings for different form types
 */
export const FIELD_MAPPINGS = {
  // Water Department forms
  water_new_connection: {
    full_name: 'full_name',
    father_spouse_name: 'father_name',
    date_of_birth: 'date_of_birth',
    gender: 'gender',
    mobile: 'mobile',
    email: 'email',
    aadhaar_number: 'aadhaar_number',
    house_flat_no: 'address.line1',
    locality: 'address.line2',
    ward: 'address.ward',
    city: 'address.city',
    pincode: 'address.pincode',
    state: 'address.state',
    district: 'address.district'
  },

  // Electricity Department forms
  electricity_new_connection: {
    applicant_name: 'full_name',
    father_husband_name: 'father_name',
    date_of_birth: 'date_of_birth',
    gender: 'gender',
    contact_number: 'mobile',
    email: 'email',
    identity_number: 'aadhaar_number',
    premises_address: 'address.line1',
    locality: 'address.line2',
    city: 'address.city',
    pincode: 'address.pincode',
    state: 'address.state',
    district: 'address.district'
  },

  // Gas Department forms
  gas_new_connection: {
    applicant_name: 'full_name',
    father_spouse_name: 'father_name',
    date_of_birth: 'date_of_birth',
    gender: 'gender',
    mobile: 'mobile',
    email: 'email',
    aadhaar_number: 'aadhaar_number',
    address: 'address.line1',
    city: 'address.city',
    pincode: 'address.pincode',
    state: 'address.state'
  },

  // Municipal forms
  municipal_general: {
    fullName: 'full_name',
    fatherName: 'father_name',
    mobile: 'mobile',
    email: 'email',
    address: 'address.line1',
    ward: 'address.ward',
    city: 'address.city',
    pincode: 'address.pincode'
  },

  // Property Tax
  municipal_property_tax: {
    owner_name: 'full_name',
    contact_mobile: 'mobile',
    contact_email: 'email',
    ward_number: 'address.ward',
    property_address: 'address.line1'
  },

  // Complaint forms
  complaint_general: {
    contact_name: 'full_name',
    mobile: 'mobile',
    email: 'email',
    address: 'address.line1'
  }
};

/**
 * Get appropriate field mapping for a form type
 * @param {string} formType - The form type identifier
 * @returns {object} - Field mapping
 */
export function getFieldMapping(formType) {
  return FIELD_MAPPINGS[formType] || FIELD_MAPPINGS.municipal_general;
}

export default {
  verifyUDID,
  getDemoData,
  isDemoUDID,
  mapUDIDToFormData,
  getFieldMapping,
  FIELD_MAPPINGS
};
