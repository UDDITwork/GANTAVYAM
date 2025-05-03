import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const ViewUserDetails = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      const res = await axios.get(`http://localhost:5000/api/admin/users/${id}`);
      setUser(res.data.data);
    };
    fetchDetails();
  }, [id]);

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Phone:</strong> {user.phone}</p>
      <p><strong>Ride History:</strong> (to be implemented)</p>
      <Link to="/admin/view-users">Back to List</Link>
    </div>
  );
};

export default ViewUserDetails;
