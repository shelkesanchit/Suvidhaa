import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LandingPage from './pages/LandingPage';
import ElectricityServicesPage from './pages/electricity/ElectricityServicesPage';
import MobileUploadPage from './pages/electricity/MobileUploadPage';
import GasServicesPage from './pages/gas/GasServicesPage';
import MunicipalServicesPage from './pages/municipal/MunicipalServicesPage';
import WaterServicesPage from './pages/water/WaterServicesPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/electricity" element={<ElectricityServicesPage />} />
      <Route path="/mobile-upload/:token" element={<MobileUploadPage />} />
      <Route path="/gas" element={<GasServicesPage />} />
      <Route path="/municipal" element={<MunicipalServicesPage />} />
      <Route path="/municipal/water" element={<Navigate to="/water" replace />} />
      <Route path="/water" element={<WaterServicesPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
