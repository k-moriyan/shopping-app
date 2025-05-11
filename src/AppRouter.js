// src/AppRouter.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TopPage from './App';
import StoreAdmin from './StoreAdmin';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<TopPage />} />
      <Route path="/store-admin" element={<StoreAdmin />} />
    </Routes>
  );
}