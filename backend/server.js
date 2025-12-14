const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// Connect to SQLite database
const dbPath = path.join(__dirname, 'sweet_shop.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    isAdmin INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('✅ Users table ready');
    }
  });

  // Sweets table
  db.run(`CREATE TABLE IF NOT EXISTS sweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating sweets table:', err);
    } else {
      console.log('✅ Sweets table ready');
    }
  });

  // Create default admin user if not exists
  db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('❌ Error checking admin user:', err);
    } else if (!row) {
      db.run(
        'INSERT INTO users (username, email, password, isAdmin) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@sweetshop.com', 'admin123', 1],
        function(err) {
          if (err) {
            console.error('❌ Error creating admin user:', err);
          } else {
            console.log('✅ Default admin user created: username=admin, password=admin123');
          }
        }
      );
    } else {
      console.log('✅ Admin user already exists');
    }
  });

  // Add sample sweets if table is empty
  db.get('SELECT COUNT(*) as count FROM sweets', (err, row) => {
    if (err) {
      console.error('❌ Error checking sweets count:', err);
    } else if (row && row.count === 0) {
      const sampleSweets = [
        ['Gulab Jamun', 'Traditional', 50, 100],
        ['Rasgulla', 'Traditional', 40, 80],
        ['Chocolate Bar', 'Modern', 30, 50],
        ['Ladoo', 'Traditional', 45, 120]
      ];
      
      const stmt = db.prepare('INSERT INTO sweets (name, category, price, quantity) VALUES (?, ?, ?, ?)');
      sampleSweets.forEach(sweet => {
        stmt.run(sweet, (err) => {
          if (err) {
            console.error('❌ Error inserting sample sweet:', err);
          }
        });
      });
      stmt.finalize((err) => {
        if (err) {
          console.error('❌ Error finalizing statement:', err);
        } else {
          console.log('✅ Sample sweets added');
        }
      });
    } else {
      console.log('✅ Sweets already exist in database');
    }
  });
});

// CORS middleware
app.use(cors({
  origin: 'http://localhost:3000'
}));

// Middleware - Parse JSON data
app.use(express.json());

// Helper function to check if user is logged in
function checkLoggedIn(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Login required' });
  }
  
  const token = authHeader.split(' ')[1] || authHeader;
  
  // Find user in database
  db.get('SELECT * FROM users WHERE username = ?', [token], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin === 1
    };
    next();
  });
}

// Helper function to check if user is admin
function checkAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Login required' });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sweet Shop API is running' });
});

// Get all sweets
app.get('/api/sweets', checkLoggedIn, (req, res) => {
  db.all('SELECT * FROM sweets ORDER BY name ASC', (err, sweets) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch sweets' });
    }
    res.json(sweets);
  });
});

// Get single sweet by ID
app.get('/api/sweets/:id', checkLoggedIn, (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid sweet ID' });
  }
  
  db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, sweet) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!sweet) {
      return res.status(404).json({ error: 'Sweet not found' });
    }
    res.json(sweet);
  });
});

// Search sweets by name or category
app.get('/api/sweets/search', checkLoggedIn, (req, res) => {
  const { search, category, minPrice, maxPrice } = req.query;
  
  let query = 'SELECT * FROM sweets WHERE 1=1';
  const params = [];
  
  if (search) {
    query += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  if (minPrice) {
    query += ' AND price >= ?';
    params.push(parseFloat(minPrice));
  }
  
  if (maxPrice) {
    query += ' AND price <= ?';
    params.push(parseFloat(maxPrice));
  }
  
  query += ' ORDER BY name ASC';
  
  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Add new sweet (Admin only)
app.post('/api/sweets', checkLoggedIn, checkAdmin, (req, res) => {
  const { name, category, price, quantity } = req.body;
  
  // Validate required fields
  if (!name || !category || price === undefined || quantity === undefined) {
    return res.status(400).json({ error: 'Name, category, price, and quantity are required' });
  }
  
  // Validate empty strings
  if (typeof name === 'string' && name.trim() === '') {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }
  if (typeof category === 'string' && category.trim() === '') {
    return res.status(400).json({ error: 'Category cannot be empty' });
  }
  
  // Validate numbers
  const priceNum = parseFloat(price);
  const quantityNum = parseInt(quantity);
  
  if (isNaN(priceNum) || isNaN(quantityNum)) {
    return res.status(400).json({ error: 'Price and quantity must be valid numbers' });
  }
  
  if (priceNum < 0 || quantityNum < 0) {
    return res.status(400).json({ error: 'Price and quantity must be 0 or greater' });
  }
  
  if (!Number.isInteger(quantityNum)) {
    return res.status(400).json({ error: 'Quantity must be a whole number' });
  }
  
  db.run(
    'INSERT INTO sweets (name, category, price, quantity) VALUES (?, ?, ?, ?)',
    [name.trim(), category.trim(), priceNum, quantityNum],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add sweet' });
      }
      
      db.get('SELECT * FROM sweets WHERE id = ?', [this.lastID], (err, sweet) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch created sweet' });
        }
        res.status(201).json(sweet);
      });
    }
  );
});

// Update existing sweet (Admin only)
app.put('/api/sweets/:id', checkLoggedIn, checkAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid sweet ID' });
  }
  
  const { name, category, price, quantity } = req.body;
  
  // Check if sweet exists
  db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, sweet) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!sweet) {
      return res.status(404).json({ error: 'Sweet not found' });
    }
    
    // Build update query
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      if (typeof name === 'string' && name.trim() === '') {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (category !== undefined) {
      if (typeof category === 'string' && category.trim() === '') {
        return res.status(400).json({ error: 'Category cannot be empty' });
      }
      updates.push('category = ?');
      params.push(category.trim());
    }
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum)) {
        return res.status(400).json({ error: 'Price must be a valid number' });
      }
      if (priceNum < 0) {
        return res.status(400).json({ error: 'Price must be 0 or greater' });
      }
      updates.push('price = ?');
      params.push(priceNum);
    }
    if (quantity !== undefined) {
      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum)) {
        return res.status(400).json({ error: 'Quantity must be a valid number' });
      }
      if (quantityNum < 0) {
        return res.status(400).json({ error: 'Quantity must be 0 or greater' });
      }
      if (!Number.isInteger(quantityNum)) {
        return res.status(400).json({ error: 'Quantity must be a whole number' });
      }
      updates.push('quantity = ?');
      params.push(quantityNum);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(id);
    
    db.run(`UPDATE sweets SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update sweet' });
      }
      
      db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, updatedSweet) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch updated sweet' });
        }
        res.json(updatedSweet);
      });
    });
  });
});

// Delete sweet (Admin only)
app.delete('/api/sweets/:id', checkLoggedIn, checkAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid sweet ID' });
  }
  
  db.run('DELETE FROM sweets WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete sweet' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Sweet not found' });
    }
    
    res.json({ message: 'Sweet deleted successfully' });
  });
});

// Purchase sweet (decrease quantity)
app.post('/api/sweets/:id/purchase', checkLoggedIn, (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid sweet ID' });
  }
  
  const { quantity = 1 } = req.body;
  const quantityNum = parseInt(quantity);
  
  if (isNaN(quantityNum) || quantityNum <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive whole number' });
  }
  
  if (!Number.isInteger(quantityNum)) {
    return res.status(400).json({ error: 'Quantity must be a whole number' });
  }
  
  db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, sweet) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!sweet) {
      return res.status(404).json({ error: 'Sweet not found' });
    }
    
    if (sweet.quantity < quantityNum) {
      return res.status(400).json({ error: 'Not enough items in stock' });
    }
    
    const newQuantity = sweet.quantity - quantityNum;
    
    db.run(
      'UPDATE sweets SET quantity = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [newQuantity, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to process purchase' });
        }
        
        db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, updatedSweet) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch updated sweet' });
          }
          res.json({
            message: 'Purchase successful',
            sweet: updatedSweet
          });
        });
      }
    );
  });
});

// Restock sweet (increase quantity - Admin only)
app.post('/api/sweets/:id/restock', checkLoggedIn, checkAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid sweet ID' });
  }
  
  const { quantity } = req.body;
  
  if (quantity === undefined || quantity === null) {
    return res.status(400).json({ error: 'Quantity is required' });
  }
  
  const quantityNum = parseInt(quantity);
  
  if (isNaN(quantityNum) || quantityNum <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive whole number' });
  }
  
  if (!Number.isInteger(quantityNum)) {
    return res.status(400).json({ error: 'Quantity must be a whole number' });
  }
  
  db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, sweet) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!sweet) {
      return res.status(404).json({ error: 'Sweet not found' });
    }
    
    const newQuantity = sweet.quantity + quantityNum;
    
    db.run(
      'UPDATE sweets SET quantity = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [newQuantity, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to restock sweet' });
        }
        
        db.get('SELECT * FROM sweets WHERE id = ?', [id], (err, updatedSweet) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch updated sweet' });
          }
          res.json({
            message: 'Restock successful',
            sweet: updatedSweet
          });
        });
      }
    );
  });
});

// Register new user
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  
  // Validate empty strings
  if (typeof username === 'string' && username.trim() === '') {
    return res.status(400).json({ error: 'Username cannot be empty' });
  }
  if (typeof email === 'string' && email.trim() === '') {
    return res.status(400).json({ error: 'Email cannot be empty' });
  }
  if (typeof password === 'string' && password.trim() === '') {
    return res.status(400).json({ error: 'Password cannot be empty' });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Password length validation
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim().toLowerCase()], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username.trim(), email.trim().toLowerCase(), password],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Registration failed' });
        }

        // Check if user is admin from database
        db.get('SELECT isAdmin FROM users WHERE id = ?', [this.lastID], (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch user data' });
          }
          
          const userResponse = {
            id: this.lastID,
            username: username.trim(),
            email: email.trim().toLowerCase(),
            isAdmin: user.isAdmin === 1
          };

          const token = username.trim();

          res.status(201).json({
            message: 'User registered successfully',
            token: token,
            user: userResponse
          });
        });
      }
    );
  });
});

// Login user
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  if (typeof username === 'string' && username.trim() === '') {
    return res.status(400).json({ error: 'Username cannot be empty' });
  }
  if (typeof password === 'string' && password.trim() === '') {
    return res.status(400).json({ error: 'Password cannot be empty' });
  }

  const trimmedUsername = username.trim();
  const trimmedPassword = password; // Don't trim password, keep as is

  // Debug logging
  console.log('🔐 Login attempt:', { username: trimmedUsername, passwordLength: trimmedPassword.length });

  db.get('SELECT * FROM users WHERE username = ?', [trimmedUsername], (err, user) => {
    if (err) {
      console.error('❌ Database error in login:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      console.log('❌ User not found:', trimmedUsername);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log('👤 User found:', { id: user.id, username: user.username, passwordMatch: user.password === trimmedPassword });

    if (user.password !== trimmedPassword) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin === 1
    };

    const token = user.username;

    res.json({
      message: 'Login successful',
      token: token,
      user: userResponse
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Default admin: username=admin, password=admin123`);
  console.log(`💾 Database: ${dbPath}`);
});

// Close database on server shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});

module.exports = app;
