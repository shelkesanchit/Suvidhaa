import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Grid,
  Alert,
  Chip,
  TableHead,
  TableContainer,
  Card,
  CardContent,
} from '@mui/material';
import { 
  Calculate as CalculateIcon,
  BoltOutlined,
  InfoOutlined,
  TrendingUp,
  Receipt,
} from '@mui/icons-material';

const categories = [
  { value: 'residential', label: 'Residential', description: 'For household consumption' },
  { value: 'commercial', label: 'Commercial', description: 'For shops, offices, and businesses' },
  { value: 'industrial', label: 'Industrial', description: 'For factories and manufacturing units' },
  { value: 'agricultural', label: 'Agricultural', description: 'For farming and irrigation' },
];

const slabRates = {
  residential: [
    { min: 0, max: 100, rate: 6.42, label: '0-100 units' },
    { min: 101, max: 300, rate: 8.0, label: '101-300 units' },
    { min: 301, max: Infinity, rate: 9.5, label: 'Above 300 units' },
  ],
  commercial: [
    { min: 0, max: Infinity, rate: 10.5, label: 'All units' },
  ],
  industrial: [
    { min: 0, max: Infinity, rate: 9.0, label: 'All units' },
  ],
  agricultural: [
    { min: 0, max: Infinity, rate: 5.5, label: 'All units' },
  ],
};

const BillCalculator = ({ onClose }) => {
  const [formData, setFormData] = useState({
    category: 'residential',
    units: '',
    sanctioned_load: '5',
    billing_month: new Date().toISOString().slice(0, 7),
  });
  const [calculation, setCalculation] = useState(null);
  const [slabBreakdown, setSlabBreakdown] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateBill = () => {
    const units = parseFloat(formData.units) || 0;
    const load = parseFloat(formData.sanctioned_load) || 0;
    let energyCharges = 0;
    let fixedCharges = 0;
    const breakdown = [];

    // Calculate based on category with slab-wise breakdown
    if (formData.category === 'residential') {
      if (units <= 100) {
        energyCharges = units * 6.42;
        breakdown.push({ slab: '0-100 units', units: units, rate: 6.42, amount: energyCharges });
      } else if (units <= 300) {
        const slab1 = 100 * 6.42;
        const slab2 = (units - 100) * 8.0;
        energyCharges = slab1 + slab2;
        breakdown.push({ slab: '0-100 units', units: 100, rate: 6.42, amount: slab1 });
        breakdown.push({ slab: '101-300 units', units: units - 100, rate: 8.0, amount: slab2 });
      } else {
        const slab1 = 100 * 6.42;
        const slab2 = 200 * 8.0;
        const slab3 = (units - 300) * 9.5;
        energyCharges = slab1 + slab2 + slab3;
        breakdown.push({ slab: '0-100 units', units: 100, rate: 6.42, amount: slab1 });
        breakdown.push({ slab: '101-300 units', units: 200, rate: 8.0, amount: slab2 });
        breakdown.push({ slab: 'Above 300 units', units: units - 300, rate: 9.5, amount: slab3 });
      }
      fixedCharges = 100;
    } else if (formData.category === 'commercial') {
      energyCharges = units * 10.5;
      breakdown.push({ slab: 'All units', units: units, rate: 10.5, amount: energyCharges });
      fixedCharges = 250;
    } else if (formData.category === 'industrial') {
      energyCharges = units * 9.0;
      breakdown.push({ slab: 'All units', units: units, rate: 9.0, amount: energyCharges });
      fixedCharges = load * 120;
    } else if (formData.category === 'agricultural') {
      energyCharges = units * 5.5;
      breakdown.push({ slab: 'All units', units: units, rate: 5.5, amount: energyCharges });
      fixedCharges = load * 60;
    }

    const subtotal = energyCharges + fixedCharges;
    const electricityDuty = subtotal * 0.05; // 5% electricity duty
    const tax = subtotal * 0.06; // 6% tax
    const total = subtotal + electricityDuty + tax;

    setSlabBreakdown(breakdown);
    setCalculation({
      units,
      category: formData.category,
      energy_charges: energyCharges.toFixed(2),
      fixed_charges: fixedCharges.toFixed(2),
      subtotal: subtotal.toFixed(2),
      electricity_duty: electricityDuty.toFixed(2),
      tax_amount: tax.toFixed(2),
      total_amount: total.toFixed(2),
      per_unit_avg: (total / units).toFixed(2),
    });
  };

  return (
    <Box>
      
      <DialogContent sx={{ mt: 2 }}>
        {/* Input Section */}
        <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
            Consumption Details
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Consumer Category *"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                {categories.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box>
                      <Typography variant="body1">{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Billing Month"
                name="billing_month"
                type="month"
                value={formData.billing_month}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Units Consumed *"
                name="units"
                type="number"
                value={formData.units}
                onChange={handleChange}
                helperText="Enter the number of units (kWh) consumed"
                InputProps={{
                  startAdornment: <BoltOutlined sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sanctioned Load (KW) *"
                name="sanctioned_load"
                type="number"
                value={formData.sanctioned_load}
                onChange={handleChange}
                helperText="Your approved load in kilowatts"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={calculateBill}
                fullWidth
                size="large"
                disabled={!formData.units || formData.units <= 0}
                startIcon={<CalculateIcon />}
              >
                Calculate Bill Amount
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Tariff Information */}
        {!calculation && (
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'info.lighter', borderRadius: 2, border: '1px solid', borderColor: 'info.light' }}>
            <Box display="flex" alignItems="flex-start" gap={2}>
              <InfoOutlined color="info" />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Current Tariff Rates for {categories.find(c => c.value === formData.category)?.label}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {slabRates[formData.category].map((slab, index) => (
                    <Chip
                      key={index}
                      label={`${slab.label}: ₹${slab.rate}/unit`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  * Rates are indicative and may vary. Please check official tariff schedule for exact rates.
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Calculation Results */}
        {calculation && (
          <Box>
            {/* Summary Card */}
            <Card elevation={3} sx={{ mb: 3, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.9 }}>
                      Estimated Bill Amount
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      ₹{calculation.total_amount}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                      For {calculation.units} units • {calculation.category.charAt(0).toUpperCase() + calculation.category.slice(1)}
                    </Typography>
                  </Box>
                  <Receipt sx={{ fontSize: 80, opacity: 0.2 }} />
                </Box>
              </CardContent>
            </Card>

            {/* Slab-wise Breakdown */}
            {slabBreakdown.length > 0 && (
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                  Slab-wise Energy Charges Breakdown
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Slab</strong></TableCell>
                        <TableCell align="center"><strong>Units</strong></TableCell>
                        <TableCell align="center"><strong>Rate (₹/unit)</strong></TableCell>
                        <TableCell align="right"><strong>Amount (₹)</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {slabBreakdown.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.slab}</TableCell>
                          <TableCell align="center">{item.units}</TableCell>
                          <TableCell align="center">₹{item.rate}</TableCell>
                          <TableCell align="right">₹{item.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Detailed Bill Breakdown */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
                Detailed Bill Breakdown
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>Units Consumed</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{calculation.units} kWh</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>Consumer Category</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={calculation.category.charAt(0).toUpperCase() + calculation.category.slice(1)}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}><Divider sx={{ my: 1 }} /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Energy Charges</TableCell>
                    <TableCell align="right">₹{calculation.energy_charges}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Fixed Charges</TableCell>
                    <TableCell align="right">₹{calculation.fixed_charges}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>Subtotal</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>₹{calculation.subtotal}</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}><Divider sx={{ my: 1 }} /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Electricity Duty (5%)</TableCell>
                    <TableCell align="right">₹{calculation.electricity_duty}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Tax (6%)</TableCell>
                    <TableCell align="right">₹{calculation.tax_amount}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                    <TableCell>
                      <Typography variant="h6" fontWeight={700} color="primary">Total Amount</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" fontWeight={700} color="primary">
                        ₹{calculation.total_amount}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">Average Cost per Unit</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">₹{calculation.per_unit_avg}/kWh</Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>

            {/* Energy Saving Tips */}
            <Alert severity="success" icon={<TrendingUp />}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Energy Saving Tips
              </Typography>
              <Typography variant="body2">
                • Use LED bulbs and energy-efficient appliances
                <br />
                • Turn off lights and electronics when not in use
                <br />
                • Regular maintenance of AC and refrigerator
                <br />
                • Use natural light during daytime
              </Typography>
            </Alert>

            <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: 'warning.lighter', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Disclaimer:</strong> This is an estimated calculation based on standard tariff rates. 
                Actual bill amount may vary based on current tariff schedule, applicable surcharges, subsidies, 
                and other factors. Please refer to your official electricity bill for accurate charges.
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        {calculation && (
          <Button 
            onClick={() => {
              setCalculation(null);
              setSlabBreakdown([]);
            }}
            variant="contained"
          >
            Calculate Again
          </Button>
        )}
      </DialogActions>
    </Box>
  );
};

export default BillCalculator;
