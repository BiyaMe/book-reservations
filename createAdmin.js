const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const config = require('./config/database');

// Connect to MongoDB
mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

  async function updateAdminUser() {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('jk1234', salt);
  
      const updatedAdmin = await User.findOneAndUpdate(
        { email: 'admin@example.com' },
        {
          $set: {
            name: 'Admin',
            phoneNumber: '0901946736',
            password: hashedPassword,
            isAdmin: true,
          }
        },
        { new: true, upsert: true }
      );
  
      console.log('Admin user updated successfully');
      console.log(updatedAdmin);
  
      // Generate JWT token
      const payload = { user: { id: updatedAdmin.id } };
      const token = jwt.sign(payload, config.secret, { expiresIn: '1h' });
  
      console.log('Admin token:', token);
  
      mongoose.connection.close();
    } catch (err) {
      console.error(err.message);
      mongoose.connection.close();
    }
  }
  
  updateAdminUser();