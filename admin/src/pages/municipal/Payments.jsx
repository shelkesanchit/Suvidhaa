import React from 'react';
import PaymentsPage from '../shared/PaymentsPage';
import api from '../../utils/municipal/api';

const MunicipalPayments = () => (
  <PaymentsPage
    deptColor="#2e7d32"
    deptGradient="linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)"
    deptName="Municipal Corporation"
    consumerPrefix="M"
    api={api}
    billEndpoint="/municipal/admin/consumers"
    paymentEndpoint="/municipal/payments"
  />
);

export default MunicipalPayments;
