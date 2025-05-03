import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const AddUser = () => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/users/register', formData);
      setMessage('User registration successful!');
    } catch (err) {
      setMessage('Failed to register user');
    }
  };

  return (
    <div>
      <h2>Add a New User (Customer)</h2>
      <Link to="/admin">Back to Admin</Link>
      <form onSubmit={handleSubmit}>
  <input type="text" name="name" placeholder="Name" onChange={handleChange} required />
  <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
  <input type="text" name="phone" placeholder="Phone Number" onChange={handleChange} required />
  <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
  <button type="submit">Register</button>
</form>
      <p>{message}</p>
    </div>
  );
};

export default AddUser;
