import React from 'react';
import PaymentsPage from '../shared/PaymentsPage';
import api from '../../utils/water/api';

const WaterPayments = () => (
  <PaymentsPage
    deptColor="#0288d1"
    deptGradient="linear-gradient(135deg, #0288d1 0%, #4fc3f7 100%)"
    deptName="Water Department"
    consumerPrefix="W"
    api={api}
    billEndpoint="/water/admin/consumers"
    paymentEndpoint="/water/admin/payments"
  />
);

export default WaterPayments;
