import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const ViewUsers = () => {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await axios.get('http://localhost:5000/api/admin/users');
      setUsers(res.data.data);
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <h2>Registered Customers</h2>
      <Link to="/admin">Back to Admin</Link>
      <ul>
        {users.map((user) => (
          <li key={user._id}>
            <button onClick={() => navigate(`/admin/users/${user._id}`)}>
              {user.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ViewUsers;
