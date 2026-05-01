import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ToastProvider } from './components/ui';
import {
  DashboardPage,
  StoolRecordPage,
  DietRecordPage,
  SymptomRecordPage,
  MedicationRecordPage,
  AnalysisPage,
  FCTrackerPage,
  ReportPage,
  PersonalDataPage,
  SettingsPage,
} from './pages';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/stool" element={<StoolRecordPage />} />
            <Route path="/diet" element={<DietRecordPage />} />
            <Route path="/symptom" element={<SymptomRecordPage />} />
            <Route path="/medication" element={<MedicationRecordPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/fc" element={<FCTrackerPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/profile" element={<PersonalDataPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MainLayout>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
