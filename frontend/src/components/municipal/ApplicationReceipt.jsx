import React, { useRef } from 'react';
import {
  Dialog, DialogContent, DialogActions, Box, Typography, Button,
  Divider, Chip, Paper, Table, TableBody, TableRow, TableCell,
  IconButton, Tooltip,
} from '@mui/material';
import {
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const APPLICATION_TYPE_LABELS = {
  // Birth / Death / Marriage
  municipal_birth_certificate:      'Birth Certificate',
  municipal_death_certificate:      'Death Certificate',
  municipal_birth_death_correction: 'Birth / Death Record Correction',
  municipal_marriage_registration:   'Marriage Registration',
  municipal_marriage_correction:     'Marriage Record Correction',
  // Housing
  municipal_housing_application:    'Municipal Housing Application',
  municipal_quarter_rent_payment:   'Quarter Rent Payment',
  municipal_encroachment_report:    'Encroachment Report',
  // Property Tax
  property_tax_payment:             'Property Tax Payment',
  property_self_assessment:         'Property Self-Assessment',
  property_assessment_revision:     'Property Assessment Revision',
  property_mutation:                'Property Mutation',
  // Trade License
  new_trade_license:                'New Trade License',
  // Health & Environment
  health_hygiene_license:           'Health & Hygiene License',
  food_establishment_license:       'Food Establishment License',
  fogging_vector_control:           'Fogging / Vector Control Request',
  environmental_clearance:          'Environmental Clearance',
  // Admin Services
  noc_certificate:                  'NOC Certificate',
  domicile_certificate:             'Domicile Certificate',
  residence_certificate:            'Residence / Address Certificate',
  annual_subscription:              'Annual Subscription',
  advertisement_permit:             'Advertisement / Hoarding Permit',
  // Roads
  road_damage_complaint:            'Road Damage Complaint',
  streetlight_complaint:            'Streetlight Complaint',
  drain_manhole_complaint:          'Drain / Manhole Complaint',
  road_cutting_permit:              'Road Cutting Permit',
  // Sanitation
  garbage_complaint:                'Garbage Complaint',
  bulk_waste_pickup:                'Bulk Waste Pickup Request',
  sanitation_services_request:      'Sanitation Services Request',
  // Grievance
  grievance_lodge:                  'Grievance / Complaint',
  rti_application:                  'RTI Application',
  appointment_booking:              'Appointment Booking',
  // Building Permit
  building_plan_approval:           'Building Plan Approval',
  construction_commencement:        'Construction Commencement Notice',
  occupancy_certificate:            'Occupancy Certificate',
};

const EXCLUDE_KEYS = new Set([
  'password', 'otp', 'token', 'documents', 'agree_to_terms',
  'identity_document', 'residence_proof', 'ownership_document',
  'declaration', 'confirm_declaration',
]);

/**
 * ApplicationReceipt — Municipal receipt dialog after successful form submission.
 *
 * Props:
 *  open              {boolean}
 *  onClose           {function}
 *  applicationNumber {string}
 *  applicationType   {string}
 *  formData          {object}
 *  email             {string}
 *  submittedAt       {Date|string}
 */
const ApplicationReceipt = ({
  open, onClose,
  applicationNumber, applicationType,
  formData = {}, email, submittedAt,
}) => {
  const receiptRef = useRef(null);

  const typeLabel = APPLICATION_TYPE_LABELS[applicationType]
    || (applicationType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const dateStr = new Date(submittedAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const displayFields = Object.entries(formData)
    .filter(([k, v]) =>
      !EXCLUDE_KEYS.has(k) &&
      v !== null && v !== undefined && v !== '' &&
      typeof v !== 'object' && typeof v !== 'boolean'
    )
    .slice(0, 30)
    .map(([k, v]) => ({
      label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: String(v),
    }));

  const handlePrint = () => {
    const printContents = receiptRef.current?.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Application Receipt – ${applicationNumber}</title>
          <meta charset="utf-8"/>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; background: #fff; color: #333; font-size: 13px; }
            .receipt-wrapper { max-width: 700px; margin: 0 auto; padding: 20px; }
            .app-number-box { background: #e8f5e9; border: 2px solid #2e7d32; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0; }
            .app-number-box .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            .app-number-box .number { font-size: 28px; font-weight: bold; color: #2e7d32; letter-spacing: 3px; }
            .section-title { font-size: 12px; font-weight: bold; color: #2e7d32; border-bottom: 2px solid #e8f5e9; padding-bottom: 5px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; font-size: 12px; }
            td:first-child { width: 42%; color: #666; }
            td:last-child { color: #333; font-weight: 500; }
            .status-badge { background: #e8f5e9; color: #2e7d32; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; display: inline-block; }
            .footer { margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; text-align: center; font-size: 11px; color: #999; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="receipt-wrapper">
            <div style="background:#2e7d32;color:#fff;padding:18px 22px;border-radius:8px 8px 0 0">
              <div style="font-size:20px;font-weight:bold">SUVIDHA Municipal Services</div>
              <div style="font-size:12px;opacity:0.8;margin-top:2px">Smart Utility Kiosk – Government of India</div>
            </div>
            ${printContents}
            <div class="footer">Computer-generated receipt. No signature required. | SUVIDHA Smart Utility Kiosk</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleEmailReceipt = async () => {
    if (!email) { toast.error('No verified email found.'); return; }
    try {
      await api.post('/municipal/otp/send-receipt', {
        email,
        application_number: applicationNumber,
        application_type: applicationType,
        application_data: formData,
        submitted_at: submittedAt || new Date().toISOString(),
      });
      toast.success(`Receipt sent to ${email}`);
    } catch {
      toast.error('Failed to resend receipt email.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>

      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #2e7d32, #388e3c)',
        px: 3, py: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CheckCircleIcon sx={{ color: '#fff', fontSize: 32 }} />
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
              Application Submitted!
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Receipt &amp; confirmation below
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box ref={receiptRef} sx={{ px: 3, pt: 3, pb: 1 }}>

          {/* Application Number */}
          <Paper elevation={0} sx={{
            background: '#e8f5e9', border: '2px solid #2e7d32',
            borderRadius: 2, py: 2, px: 3, textAlign: 'center', mb: 3,
          }}>
            <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Application Number
            </Typography>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 800, letterSpacing: 3, mt: 0.5 }}>
              {applicationNumber}
            </Typography>
          </Paper>

          {/* Summary */}
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{
              color: '#2e7d32', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 0.5, mb: 1, pb: 0.5, borderBottom: '2px solid', borderColor: 'grey.200',
            }}>
              Application Summary
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ color: 'text.secondary', width: '42%', border: 'none', py: 0.8 }}>Service Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, border: 'none', py: 0.8 }}>{typeLabel}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ color: 'text.secondary', border: 'none', py: 0.8 }}>Date &amp; Time</TableCell>
                  <TableCell sx={{ border: 'none', py: 0.8 }}>{dateStr}</TableCell>
                </TableRow>
                {email && (
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary', border: 'none', py: 0.8 }}>Email</TableCell>
                    <TableCell sx={{ border: 'none', py: 0.8 }}>{email}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell sx={{ color: 'text.secondary', border: 'none', py: 0.8 }}>Status</TableCell>
                  <TableCell sx={{ border: 'none', py: 0.8 }}>
                    <Chip label="Submitted – Under Review" color="success" size="small" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>

          {/* Application Details */}
          {displayFields.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{
                color: '#2e7d32', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 0.5, mb: 1, pb: 0.5, borderBottom: '2px solid', borderColor: 'grey.200',
              }}>
                Submitted Details
              </Typography>
              <Table size="small">
                <TableBody>
                  {displayFields.map(({ label, value }) => (
                    <TableRow key={label}>
                      <TableCell sx={{ color: 'text.secondary', width: '42%', borderBottom: '1px solid', borderColor: 'grey.100', py: 0.7, fontSize: '0.82rem' }}>
                        {label}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid', borderColor: 'grey.100', py: 0.7, fontSize: '0.82rem', fontWeight: 500 }}>
                        {value.length > 80 ? value.substring(0, 80) + '…' : value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Next Steps */}
          <Box sx={{ background: '#f1f8e9', borderRadius: 2, p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Next Steps</Typography>
            <Typography variant="body2" color="text.secondary" component="ol" sx={{ pl: 2, lineHeight: 2, m: 0 }}>
              <li>Application will be reviewed within <strong>7 working days</strong>.</li>
              <li>Track status using your Application Number at the kiosk.</li>
              <li>You will be notified by SMS/email for any updates or inspection.</li>
            </Typography>
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', pb: 1 }}>
            Computer-generated receipt. No signature required. | SUVIDHA Smart Utility Kiosk
          </Typography>
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        {email && (
          <Tooltip title={`Resend receipt to ${email}`}>
            <Button variant="outlined" startIcon={<EmailIcon />} onClick={handleEmailReceipt}
              sx={{ textTransform: 'none', color: '#2e7d32', borderColor: '#2e7d32' }}>
              Email Receipt
            </Button>
          </Tooltip>
        )}
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}
          sx={{ textTransform: 'none', color: '#2e7d32', borderColor: '#2e7d32' }}>
          Print Receipt
        </Button>
        <Button variant="contained" onClick={onClose}
          sx={{ ml: 'auto', textTransform: 'none', background: '#2e7d32', '&:hover': { background: '#1b5e20' } }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationReceipt;
