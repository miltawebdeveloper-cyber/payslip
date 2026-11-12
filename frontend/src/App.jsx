import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import SalaryDataPage from './pages/SalaryDataPage.jsx';
import PayslipGeneratorPage from './pages/PayslipGeneratorPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/salary-data" replace />} />
        <Route path="/salary-data" element={<SalaryDataPage />} />
        <Route path="/payslip-generator" element={<PayslipGeneratorPage />} />
        <Route path="*" element={<Navigate to="/salary-data" replace />} />
      </Route>
    </Routes>
  );
}
