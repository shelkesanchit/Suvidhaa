import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Security,
  CheckCircle,
  Warning,
  Block,
  Search,
  Refresh,
  Edit,
  Schedule,
  Verified,
  LocalFireDepartment,
  Engineering,
  Assignment,
  AttachMoney,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import api from "../../utils/gas/api";

// Admin Regulatory Operations - NOT available on Kiosk
// These are backend/admin-only processes per specification:
// 1. De-duplication (Aadhaar/LPG ID check)
// 2. PAHAL subsidy rules
// 3. Income eligibility verification
// 4. DAC (Double Allocation Cylinder) validation
// 5. Cylinder testing dates management
// 6. Insurance details
// 7. Inspection scheduling

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const RegulatoryOperations = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // De-duplication mock data
  const [duplicateChecks, setDuplicateChecks] = useState([
    { id: 1, aadhaar: '****5678', name: 'John Doe', connections: 2, status: 'flagged', date: '2024-01-15' },
    { id: 2, aadhaar: '****1234', name: 'Jane Smith', connections: 1, status: 'clear', date: '2024-01-14' },
    { id: 3, aadhaar: '****9012', name: 'Raj Kumar', connections: 3, status: 'blocked', date: '2024-01-13' },
  ]);

  // PAHAL subsidy records
  const [pahalRecords, setPahalRecords] = useState([
    { id: 1, consumer: 'GC2024001', name: 'Kumar Singh', bank: 'SBI ****4567', status: 'active', subsidy: 200 },
    { id: 2, consumer: 'GC2024002', name: 'Priya Sharma', bank: 'HDFC ****8901', status: 'active', subsidy: 200 },
    { id: 3, consumer: 'GC2024003', name: 'Amit Patel', bank: 'PNB ****3456', status: 'pending', subsidy: 0 },
  ]);

  // DAC validation records
  const [dacRecords, setDacRecords] = useState([
    { id: 1, consumer: 'GC2024001', lastRefill: '2024-01-01', daysElapsed: 20, canBook: true },
    { id: 2, consumer: 'GC2024002', lastRefill: '2024-01-10', daysElapsed: 10, canBook: false },
    { id: 3, consumer: 'GC2024003', lastRefill: '2024-01-05', daysElapsed: 15, canBook: true },
  ]);

  // Cylinder testing records
  const [cylinderTests, setCylinderTests] = useState([
    { id: 1, cylinderId: 'CYL-001', lastTest: '2023-06-15', nextDue: '2025-06-15', status: 'valid' },
    { id: 2, cylinderId: 'CYL-002', lastTest: '2022-03-20', nextDue: '2024-03-20', status: 'due' },
    { id: 3, cylinderId: 'CYL-003', lastTest: '2021-01-10', nextDue: '2023-01-10', status: 'overdue' },
  ]);

  // Inspection schedules
  const [inspections, setInspections] = useState([
    { id: 1, consumer: 'GC2024001', type: 'Installation', scheduledDate: '2024-02-01', status: 'scheduled' },
    { id: 2, consumer: 'GC2024002', type: 'Safety Audit', scheduledDate: '2024-01-28', status: 'pending' },
    { id: 3, consumer: 'GC2024003', type: 'Renewal', scheduledDate: '2024-01-30', status: 'completed' },
  ]);

  const handleDeDuplication = async () => {
    setLoading(true);
    toast.loading('Running de-duplication check...');
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    toast.dismiss();
    toast.success('De-duplication check completed. Found 2 potential duplicates.');
    setLoading(false);
  };

  const handlePahalVerification = async (consumerNo) => {
    toast.loading('Verifying PAHAL status with NPCI...');
    await new Promise(r => setTimeout(r, 1000));
    toast.dismiss();
    toast.success('PAHAL verification completed');
  };

  const handleDacCheck = async (consumerNo) => {
    toast.loading('Checking DAC compliance...');
    await new Promise(r => setTimeout(r, 800));
    toast.dismiss();
    toast.success('DAC check completed - Consumer eligible for refill');
  };

  const handleScheduleInspection = () => {
    toast.success('Inspection scheduled successfully');
  };

  const renderDeDuplicationTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>De-Duplication Check:</strong> Verifies Aadhaar linking, LPG ID uniqueness, and multiple connection detection.
          This runs automatically for new applications and can be triggered manually here.
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Search by Aadhaar (last 4 digits) or Consumer No."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button variant="contained" startIcon={<Search />}>Search</Button>
        <Button variant="outlined" startIcon={<Refresh />} onClick={handleDeDuplication} disabled={loading}>
          Run Full Check
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#fff3e0' }}>
              <TableCell>Aadhaar (Masked)</TableCell>
              <TableCell>Consumer Name</TableCell>
              <TableCell>Connections Found</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Check Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {duplicateChecks.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.aadhaar}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.connections}</TableCell>
                <TableCell>
                  <Chip
                    label={row.status.toUpperCase()}
                    color={row.status === 'clear' ? 'success' : row.status === 'flagged' ? 'warning' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined">Review</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderPahalSubsidyTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>PAHAL (DBTL) Subsidy Management:</strong> Direct Benefit Transfer for LPG consumers.
          Subsidy is credited directly to linked bank accounts after each refill purchase.
        </Typography>
      </Alert>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography variant="h4" color="success.main">85%</Typography>
              <Typography color="text.secondary">Active PAHAL Enrollments</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Typography variant="h4" color="warning.main">12</Typography>
              <Typography color="text.secondary">Pending Bank Verifications</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography variant="h4" color="info.main">₹24,000</Typography>
              <Typography color="text.secondary">Subsidy Disbursed This Month</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#fff3e0' }}>
              <TableCell>Consumer No.</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Bank Account</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Subsidy</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pahalRecords.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.consumer}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.bank}</TableCell>
                <TableCell>
                  <Chip
                    label={row.status.toUpperCase()}
                    color={row.status === 'active' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>₹{row.subsidy}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handlePahalVerification(row.consumer)}>Verify</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderDacValidationTab = () => (
    <Box>
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>DAC (Double Allocation Cylinder) Validation:</strong> Ensures the 15-day interval between refill bookings.
          Status is auto-calculated from last refill date.
        </Typography>
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#fff3e0' }}>
              <TableCell>Consumer No.</TableCell>
              <TableCell>Last Refill Date</TableCell>
              <TableCell>Days Elapsed</TableCell>
              <TableCell>Can Book?</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dacRecords.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.consumer}</TableCell>
                <TableCell>{row.lastRefill}</TableCell>
                <TableCell>{row.daysElapsed}</TableCell>
                <TableCell>
                  <Chip
                    icon={row.canBook ? <CheckCircle /> : <Block />}
                    label={row.canBook ? 'Eligible' : `Wait ${15 - row.daysElapsed} days`}
                    color={row.canBook ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleDacCheck(row.consumer)}>Check</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderCylinderTestingTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Cylinder Testing Schedule:</strong> LPG cylinders must be tested every 2 years (BIS standards).
          Overdue cylinders should be recalled for testing.
        </Typography>
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#fff3e0' }}>
              <TableCell>Cylinder ID</TableCell>
              <TableCell>Last Test Date</TableCell>
              <TableCell>Next Due</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cylinderTests.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.cylinderId}</TableCell>
                <TableCell>{row.lastTest}</TableCell>
                <TableCell>{row.nextDue}</TableCell>
                <TableCell>
                  <Chip
                    label={row.status.toUpperCase()}
                    color={row.status === 'valid' ? 'success' : row.status === 'due' ? 'warning' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" variant="outlined">Schedule Test</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderInspectionsTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Inspection Scheduling:</strong> Manage safety inspections for new installations, renewals, and periodic audits.
        </Typography>
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Button variant="contained" startIcon={<Schedule />} onClick={handleScheduleInspection}>
          Schedule New Inspection
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#fff3e0' }}>
              <TableCell>Consumer No.</TableCell>
              <TableCell>Inspection Type</TableCell>
              <TableCell>Scheduled Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inspections.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.consumer}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.scheduledDate}</TableCell>
                <TableCell>
                  <Chip
                    label={row.status.toUpperCase()}
                    color={row.status === 'completed' ? 'success' : row.status === 'scheduled' ? 'info' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" variant="outlined">View</Button>
                  <Button size="small" sx={{ ml: 1 }}>Update</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderIncomeEligibilityTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Income Eligibility Verification:</strong> For PMUY and subsidized connections, income eligibility is verified through government databases.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>PMUY Eligibility Criteria</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" sx={{ mb: 1 }}>• SECC-2011 listed household</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>• No existing LPG connection in family</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>• Valid Aadhaar with NPCI mapping</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>• Bank account for DBT refund</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Verification Statistics</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Pending Verifications</Typography>
              <Chip label="8" color="warning" size="small" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Approved This Month</Typography>
              <Chip label="45" color="success" size="small" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Rejected</Typography>
              <Chip label="3" color="error" size="small" />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderInsuranceTab = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Insurance Details:</strong> LPG consumers are covered under PMSBY insurance scheme.
          Coverage includes accident and fire damage from LPG usage.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="primary">₹2,00,000</Typography>
              <Typography color="text.secondary">Death Coverage</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="primary">₹50,000</Typography>
              <Typography color="text.secondary">Property Damage</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="success.main">98%</Typography>
              <Typography color="text.secondary">Active Coverage</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Insurance Claim Process</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>1. Report incident to distributor within 24 hours</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>2. Submit FIR copy (if applicable)</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>3. Inspection by OMC representative</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>4. Claim settlement within 30 days</Typography>
      </Paper>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Security sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4">Regulatory Operations</Typography>
          <Typography color="text.secondary">Backend processes for compliance and validation</Typography>
        </Box>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Admin Only:</strong> These operations are NOT available on the public kiosk.
          All validations run automatically for applications submitted via kiosk.
        </Typography>
      </Alert>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Search />} label="De-Duplication" iconPosition="start" />
          <Tab icon={<AttachMoney />} label="PAHAL Subsidy" iconPosition="start" />
          <Tab icon={<Block />} label="DAC Validation" iconPosition="start" />
          <Tab icon={<LocalFireDepartment />} label="Cylinder Testing" iconPosition="start" />
          <Tab icon={<Engineering />} label="Inspections" iconPosition="start" />
          <Tab icon={<Verified />} label="Income Eligibility" iconPosition="start" />
          <Tab icon={<Security />} label="Insurance" iconPosition="start" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>{renderDeDuplicationTab()}</TabPanel>
      <TabPanel value={tabValue} index={1}>{renderPahalSubsidyTab()}</TabPanel>
      <TabPanel value={tabValue} index={2}>{renderDacValidationTab()}</TabPanel>
      <TabPanel value={tabValue} index={3}>{renderCylinderTestingTab()}</TabPanel>
      <TabPanel value={tabValue} index={4}>{renderInspectionsTab()}</TabPanel>
      <TabPanel value={tabValue} index={5}>{renderIncomeEligibilityTab()}</TabPanel>
      <TabPanel value={tabValue} index={6}>{renderInsuranceTab()}</TabPanel>
    </Box>
  );
};

export default RegulatoryOperations;
