import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomeworkHubPage } from '../pages/HomeworkHubPage';
import { HomeworkCreatePage } from '../pages/HomeworkCreatePage';
import { HomeworkDoPage } from '../pages/HomeworkDoPage';
import { HomeworkResultPage } from '../pages/HomeworkResultPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AppShell } from '../components/AppShell';

export const AppRoutes: React.FC = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/homework" replace />} />
        <Route path="/homework" element={<HomeworkHubPage />} />
        <Route path="/homework/create" element={<HomeworkCreatePage />} />
        <Route path="/homework/do/:codeOrId" element={<HomeworkDoPage />} />
        <Route path="/homework/result/:submissionId" element={<HomeworkResultPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="*" element={<Navigate to="/homework" replace />} />
      </Routes>
    </AppShell>
  );
};
