import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Visibility,
  CheckCircle,
  Cancel,
  Refresh,
  Search,
  Description,
  PictureAsPdf,
  Image,
  Download,
  ZoomIn,
  CreditCard,
  Home,
  Person,
  VerifiedUser,
} from '@mui/icons-material';
import api from "../../utils/gas/api";
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ManageApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await api.get('/gas/admin/applications', { params });
      setApplications(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (applicationNumber) => {
    try {
      setLoadingDocs(true);
      const response = await api.get(`/gas/applications/documents/${applicationNumber}`);
      setDocuments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleViewDetails = (app) => {
    setSelectedApp(app);
    setTabValue(0);
    setDetailsOpen(true);
    // Fetch documents for this application
    fetchDocuments(app.application_number);
  };

  const handlePreviewDocument = (doc) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const getDocumentIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return <PictureAsPdf color="error" />;
    if (mimeType?.includes('image')) return <Image color="primary" />;
    return <Description />;
  };
  const getDocumentTypeLabel = (type) => {
    const labels = {
      'aadhaar': 'Aadhaar Card',
      'aadhaar_doc': 'Aadhaar Card',
      'pan': 'PAN Card',
      'pan_doc': 'PAN Card',
      'photo': 'Passport Photo',
      'address_proof': 'Address Proof',
      'property_doc': 'Property Document',
      'ownership_doc': 'Ownership Proof / NOC',
      'fire_noc': 'Fire NOC',
      'fire_noc_doc': 'Fire NOC',
      'gst': 'GST Certificate',
      'trade_license': 'Trade License',
      'other': 'Other Document'
    };
    return labels[type] || type?.replace(/_/g, ' ').toUpperCase() || 'Document';
  };

  const getDocumentTypeIcon = (type) => {
    if (type?.includes('aadhaar')) return <CreditCard />;
    if (type?.includes('property') || type?.includes('address')) return <Home />;
    if (type?.includes('photo')) return <Person />;
    return <VerifiedUser />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleStatusUpdate = async (appId, newStatus, remarks = '') => {
    try {
      setProcessing(true);
      await api.put(`/gas/admin/applications/${appId}/status`, {
        status: newStatus,
        remarks,
      });
      toast.success(`Application ${newStatus} successfully`);
      fetchApplications();
      setDetailsOpen(false);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    { field: 'application_number', headerName: 'App No.', width: 150 },
    { field: 'applicant_name', headerName: 'Applicant', width: 180 },
    { field: 'applicant_phone', headerName: 'Mobile', width: 130 },
    { field: 'application_type', headerName: 'Type', width: 120 },
    { field: 'gas_type', headerName: 'Gas Type', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value?.replace(/_/g, ' ')}
          size="small"
          color={
            params.value === 'approved' || params.value === 'completed' ? 'success' :
            params.value === 'rejected' ? 'error' :
            params.value === 'submitted' || params.value === 'pending' ? 'warning' : 'default'
          }
        />
      ),
    },
    {
      field: 'submission_date',
      headerName: 'Applied On',
      width: 120,
      valueFormatter: (params) => {
        try {
          return format(new Date(params.value), 'dd/MM/yyyy');
        } catch {
          return params.value;
        }
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton onClick={() => handleViewDetails(params.row)} size="small">
              <Visibility />
            </IconButton>
          </Tooltip>
          {params.row.status === 'pending' && (
            <>
              <Tooltip title="Approve">
                <IconButton
                  onClick={() => handleStatusUpdate(params.row.id, 'approved')}
                  size="small"
                  color="success"
                >
                  <CheckCircle />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton
                  onClick={() => handleStatusUpdate(params.row.id, 'rejected')}
                  size="small"
                  color="error"
                >
                  <Cancel />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  const filteredApplications = applications.filter(app =>
    app.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.application_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.applicant_phone?.includes(searchTerm)
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Manage Applications
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, app no., or mobile"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              startIcon={<Refresh />}
              onClick={fetchApplications}
              variant="outlined"
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredApplications}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          getRowId={(row) => row.id || row.application_number}
        />
      </Paper>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Application Details - {selectedApp?.application_number}
        </DialogTitle>
        <DialogContent dividers>
          {selectedApp && (
            <>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Application Info" />
                <Tab label={`Documents (${documents.length})`} />
                <Tab label="Aadhaar Details" />
              </Tabs>

              {/* Tab 0: Application Info */}
              {tabValue === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Application Number</Typography>
                    <Typography variant="body1" gutterBottom fontWeight={500}>{selectedApp.application_number}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip label={selectedApp.status?.replace(/_/g, ' ')} color={selectedApp.status === 'approved' ? 'success' : selectedApp.status === 'rejected' ? 'error' : 'warning'} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Applicant Name</Typography>
                    <Typography variant="body1" gutterBottom>{selectedApp.full_name || selectedApp.applicant_name}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Mobile</Typography>
                    <Typography variant="body1" gutterBottom>{selectedApp.applicant_phone}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                    <Typography variant="body1" gutterBottom>{selectedApp.email || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Gas Type</Typography>
                    <Typography variant="body1" gutterBottom>{selectedApp.gas_type?.toUpperCase()}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Property Type</Typography>
                    <Typography variant="body1" gutterBottom>{selectedApp.property_type}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Ownership Status</Typography>
                    <Typography variant="body1" gutterBottom>{selectedApp.ownership_status}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                    <Typography variant="body1" gutterBottom>{selectedApp.address}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>Fee Details</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Application Fee</Typography>
                    <Typography variant="body1">₹{selectedApp.application_fee || 0}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Connection Fee</Typography>
                    <Typography variant="body1">₹{selectedApp.connection_fee || 0}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Security Deposit</Typography>
                    <Typography variant="body1">₹{selectedApp.security_deposit || 0}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">Total Fee</Typography>
                    <Typography variant="body1" fontWeight={600} color="primary">₹{selectedApp.total_fee || 0}</Typography>
                  </Grid>
                </Grid>
              )}

              {/* Tab 1: Documents */}
              {tabValue === 1 && (
                <Box>
                  {loadingDocs ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : documents.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      No documents uploaded for this application yet.
                    </Alert>
                  ) : (
                    <List>
                      {documents.map((doc, index) => (
                        <React.Fragment key={doc.id || index}>
                          <ListItem
                            sx={{
                              bgcolor: 'grey.50',
                              borderRadius: 1,
                              mb: 1,
                              '&:hover': { bgcolor: 'grey.100' }
                            }}
                          >
                            <ListItemIcon>
                              {getDocumentIcon(doc.type)}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {getDocumentTypeIcon(doc.documentType)}
                                  <Typography fontWeight={500}>
                                    {getDocumentTypeLabel(doc.documentType)}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {doc.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatFileSize(doc.size)} • Uploaded: {doc.uploadedAt ? format(new Date(doc.uploadedAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title="Preview">
                                <IconButton
                                  edge="end"
                                  onClick={() => handlePreviewDocument(doc)}
                                  sx={{ mr: 1 }}
                                >
                                  <ZoomIn />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download">
                                <IconButton
                                  edge="end"
                                  component="a"
                                  href={doc.url}
                                  download={doc.name}
                                  target="_blank"
                                >
                                  <Download />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* Tab 2: Aadhaar Details */}
              {tabValue === 2 && (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Aadhaar Number
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {selectedApp.aadhaar_number 
                            ? `XXXX-XXXX-${selectedApp.aadhaar_number.slice(-4)}` 
                            : 'Not Provided'}
                        </Typography>
                        {selectedApp.aadhaar_number && (
                          <Button 
                            size="small" 
                            sx={{ mt: 1 }}
                            onClick={() => {
                              toast.success(`Full Aadhaar: ${selectedApp.aadhaar_number}`);
                            }}
                          >
                            Show Full Number
                          </Button>
                        )}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Father/Spouse Name
                        </Typography>
                        <Typography variant="h6">
                          {selectedApp.father_spouse_name || 'Not Provided'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12}>
                      <Alert severity="info" icon={<VerifiedUser />}>
                        <Typography variant="body2">
                          <strong>Verification Status:</strong> Documents need to be verified manually. 
                          Check the "Documents" tab to view uploaded Aadhaar card and other ID proofs.
                        </Typography>
                      </Alert>
                    </Grid>
                    {documents.filter(d => d.documentType?.includes('aadhaar')).length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          Aadhaar Document Preview
                        </Typography>
                        {documents.filter(d => d.documentType?.includes('aadhaar')).map((doc) => (
                          <Card key={doc.id} sx={{ display: 'inline-block', mr: 2 }}>
                            <CardContent sx={{ p: 1 }}>
                              {doc.type?.includes('image') ? (
                                <img
                                  src={doc.url}
                                  alt="Aadhaar"
                                  style={{ maxWidth: 300, maxHeight: 200, objectFit: 'contain', cursor: 'pointer' }}
                                  onClick={() => handlePreviewDocument(doc)}
                                />
                              ) : (
                                <Button
                                  startIcon={<PictureAsPdf />}
                                  onClick={() => handlePreviewDocument(doc)}
                                >
                                  View Aadhaar PDF
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          {(selectedApp?.status === 'pending' || selectedApp?.status === 'submitted') && (
            <>
              <Button
                onClick={() => handleStatusUpdate(selectedApp.id, 'approved')}
                color="success"
                variant="contained"
                disabled={processing}
              >
                Approve
              </Button>
              <Button
                onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')}
                color="error"
                variant="contained"
                disabled={processing}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Document Preview - {previewDoc && getDocumentTypeLabel(previewDoc.documentType)}
        </DialogTitle>
        <DialogContent>
          {previewDoc && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              {previewDoc.type?.includes('image') ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              ) : previewDoc.type?.includes('pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  width="100%"
                  height="600px"
                  style={{ border: 'none' }}
                />
              ) : (
                <Alert severity="info">
                  Cannot preview this file type. Please download to view.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          {previewDoc && (
            <Button
              component="a"
              href={previewDoc.url}
              download={previewDoc.name}
              target="_blank"
              startIcon={<Download />}
              variant="contained"
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageApplications;
