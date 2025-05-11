// client/src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BoothAdmin from './pages/BoothAdmin';
import DriverList from './pages/DriverList';
import DriverDetails from './pages/DriverDetails';
import DriverRegistration from './pages/DriverRegistration';
import DriverSignup from './pages/DriverSignup';
import DriverLogin from './pages/DriverLogin';
import AddUser from './pages/AddUser';
import UserSignup from './pages/UserSignup';
import UserLogin from './pages/UserLogin';
import ViewUsers from './pages/ViewUsers';
import ViewUserDetails from './pages/ViewUserDetails';
import DriverDashboard from './pages/DriverDashboard';
import DriverProfile from './pages/DriverProfile';
import UserDashboard from './pages/userDashboard';
import ForgotPassword from './pages/ForgotPassword'
function App() {
  return (
    <div className="App">
      <h1>Welcome to GANTAVYAM</h1>
      <Routes>
        <Route path="/admin" element={<BoothAdmin />} />
        <Route path="/admin/drivers" element={<DriverList />} />
        <Route path="/admin/drivers/:id" element={<DriverDetails />} />
        <Route path="/admin/register-driver" element={<DriverRegistration />} />
        <Route path="/driver/signup" element={<DriverSignup />} />
        <Route path="/driver/login" element={<DriverLogin />} />
        <Route path="/" element={<DriverLogin />} />
        <Route path="/admin/add-user" element={<AddUser />} />
        <Route path="/user/signup" element={<UserSignup />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/admin/view-users" element={<ViewUsers />} />
        <Route path="/admin/users/:id" element={<ViewUserDetails />} />
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        <Route path="/driver/profile/:id" element={<DriverProfile />} />
        <Route path="/user/forgot-password" element={<ForgotPassword />} />
      </Routes>
    </div>
  );
}

export default App;