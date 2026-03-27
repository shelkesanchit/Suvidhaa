import React from 'react';
import PaymentsPage from '../shared/PaymentsPage';
import api from '../../utils/gas/api';

const GasPayments = () => (
  <PaymentsPage
    deptColor="#ff6b35"
    deptGradient="linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)"
    deptName="Gas Department"
    consumerPrefix="G"
    api={api}
    billEndpoint="/gas/admin/consumers"
    paymentEndpoint="/gas/admin/payments"
  />
);

export default GasPayments;
