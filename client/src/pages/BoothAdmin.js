// client/src/pages/BoothAdmin.js
import React from 'react';
import { Link } from 'react-router-dom';

const BoothAdmin = () => {
  return (
    <div>
      <h1>BOOTH ADMIN Dashboard</h1>
      <div>
        <Link to="/admin/register-driver">
          <button>Manual Driver Registration</button>
        </Link>
      </div>
      <div>
        <Link to="/admin/drivers">
          <button>View All Drivers</button>
        </Link>
      </div>
      <div><Link to="/admin/add-user">
  <button>ADD A USER</button>
</Link>
</div>
<div><Link to="/admin/view-users">
  <button>View Current Users/Customers Registered</button>
</Link>
</div>
    </div>
  );
};

export default BoothAdmin;