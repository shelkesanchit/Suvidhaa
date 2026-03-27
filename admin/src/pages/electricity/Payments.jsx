import React from 'react';
import PaymentsPage from '../shared/PaymentsPage';
import api from '../../utils/api';

const ElectricityPayments = () => (
  <PaymentsPage
    deptColor="#1976d2"
    deptGradient="linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)"
    deptName="Electricity Department"
    consumerPrefix="E"
    api={api}
    billEndpoint="/admin/consumers"
    paymentEndpoint="/admin/payments"
  />
);

export default ElectricityPayments;
