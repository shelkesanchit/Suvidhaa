import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Divider,
  Grid,
  Chip,
  Paper,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const APPLICATION_TYPE_LABELS = {
  new_connection: 'New Water Connection',
  complaint: 'Water Complaint Registration',
  bill_payment: 'Water Bill Payment',
  meter_reading: 'Water Meter Reading',
  disconnection: 'Water Disconnection Request',
  reconnection: 'Water Reconnection Request',
};

const EXCLUDE_KEYS = new Set([
  'password', 'otp', 'token', 'documents', 'agreed_to_terms', 'include_sewerage',
  'identity_document', 'residence_proof', 'ownership_document',
]);

/**
 * ApplicationReceipt — Receipt dialog after successful form submission for water services.
 *
 * Props:
 *  open             {boolean}
 *  onClose          {function}
 *  applicationNumber {string}
 *  applicationType  {string}
 *  formData         {object}  — application details to display
 *  email            {string}  — verified email
 *  submittedAt      {Date|string}
 */
const ApplicationReceipt = ({
  open,
  onClose,
  applicationNumber,
  applicationType,
  formData = {},
  email,
  submittedAt,
}) => {
  const receiptRef = useRef(null);

  const typeLabel = APPLICATION_TYPE_LABELS[applicationType]
    || (applicationType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const dateStr = submittedAt
    ? new Date(submittedAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

  // Fields to show in the receipt table
  const displayFields = Object.entries(formData)
    .filter(([k, v]) =>
      !EXCLUDE_KEYS.has(k) &&
      v !== null && v !== undefined && v !== '' &&
      typeof v !== 'object'
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
            .header { background: #0288d1; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0; }
            .header h1 { font-size: 22px; margin-bottom: 2px; }
            .header p { font-size: 12px; opacity: 0.85; }
            .app-number-box { background: #e1f5fe; border: 2px solid #0288d1; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0; }
            .app-number-box .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            .app-number-box .number { font-size: 32px; font-weight: bold; color: #0288d1; letter-spacing: 4px; }
            .section { margin-bottom: 16px; }
            .section-title { font-size: 13px; font-weight: bold; color: #0288d1; border-bottom: 2px solid #b3e5fc; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 6px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
            td:first-child { width: 40%; color: #666; }
            td:last-child { color: #333; font-weight: 500; }
            .status-badge { background: #e8f5e9; color: #2e7d32; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block; }
            .footer { margin-top: 24px; padding: 12px; background: #f5f5f5; border-radius: 4px; text-align: center; font-size: 11px; color: #999; }
            @media print {
              body { margin: 0; }
              .receipt-wrapper { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-wrapper">
            ${printContents}
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleEmailReceipt = async () => {
    if (!email) {
      toast.error('No verified email found.');
      return;
    }
    try {
      await api.post('/water/otp/send-receipt', {
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* Dialog Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0288d1, #039be5)',
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
        {/* Printable receipt body */}
        <Box ref={receiptRef} sx={{ px: 3, pt: 3, pb: 1 }}>
          {/* Print header (visible only in print) */}
          <Box className="header" sx={{ display: 'none' }}>
            <h1>SUVIDHA</h1>
            <p>Smart Utility Kiosk - Water Services – Government of India</p>
          </Box>

          {/* Application Number */}
          <Paper
            elevation={0}
            sx={{
              background: '#e1f5fe',
              border: '2px solid #0288d1',
              borderRadius: 2,
              py: 2, px: 3,
              textAlign: 'center',
              mb: 3,
            }}
          >
            <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Application Number
            </Typography>
            <Typography variant="h4" sx={{ color: '#0288d1', fontWeight: 800, letterSpacing: 3, mt: 0.5 }}>
              {applicationNumber}
            </Typography>
          </Paper>

          {/* Summary */}
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{ color: '#0288d1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, pb: 0.5, borderBottom: '2px solid', borderColor: '#b3e5fc' }}>
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
              <Typography variant="subtitle2" sx={{ color: '#0288d1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, pb: 0.5, borderBottom: '2px solid', borderColor: '#b3e5fc' }}>
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
          <Box sx={{ background: '#e1f5fe', borderRadius: 2, p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Next Steps</Typography>
            <Typography variant="body2" color="text.secondary" component="ol" sx={{ pl: 2, lineHeight: 2, m: 0 }}>
              <li>Application will be reviewed within <strong>7 working days</strong>.</li>
              <li>Track status using Application Number at the kiosk.</li>
              <li>A field inspection may be scheduled — keep premises accessible.</li>
              <li>For queries, contact our helpline: <strong>1916</strong></li>
            </Typography>
          </Box>

          {/* Computer generated note */}
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', pb: 1 }}>
            This is a computer-generated receipt. No signature required. | SUVIDHA Smart Utility Kiosk
          </Typography>
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        {email && (
          <Tooltip title={`Resend receipt to ${email}`}>
            <Button
              variant="outlined"
              startIcon={<EmailIcon />}
              onClick={handleEmailReceipt}
              sx={{ textTransform: 'none' }}
            >
              Email Receipt
            </Button>
          </Tooltip>
        )}
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{ textTransform: 'none' }}
        >
          Print Receipt
        </Button>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ ml: 'auto', textTransform: 'none', bgcolor: '#0288d1', '&:hover': { bgcolor: '#0277bd' } }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationReceipt;
