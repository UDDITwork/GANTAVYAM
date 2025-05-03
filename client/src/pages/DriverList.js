// client/src/pages/DriverList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllDrivers } from '../services/api';

const DriverList = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await getAllDrivers();
        setDrivers(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch drivers');
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>Registered Drivers</h1>
      <Link to="/admin">Back to Admin Dashboard</Link>
      <div>
        {drivers.length === 0 ? (
          <p>No drivers registered yet</p>
        ) : (
          <ul>
            {drivers.map((driver) => (
              <li key={driver._id}>
                <Link to={`/admin/drivers/${driver._id}`}>
                  {driver.fullName} - {driver.vehicleNo}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DriverList;