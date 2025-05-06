const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../public')));



// API to get all incidents 
app.get('/api/incidents', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        datetime, 
        complaint AS "complaint", 
        address, 
        dst_name AS "district", 
        call_type AS "call_type",  
        ST_X(geom) AS lon, 
        ST_Y(geom) AS lat 
      FROM incidents;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// API to get filtered incidents based on query parameters
app.get('/api/incidents/filter', async (req, res) => {
  try {
    const { district, complaint, callType } = req.query;
    
    let query = `
      SELECT 
        id, 
        datetime, 
        complaint AS "complaint", 
        address, 
        dst_name AS "district", 
        call_type AS "call_type",  
        ST_X(geom) AS lon, 
        ST_Y(geom) AS lat 
      FROM incidents
      WHERE 1=1
    `;
    
    const params = [];
    
    if (district) {
      query += ` AND dst_name = $${params.length + 1}`;
      params.push(district);
    }
    
    if (complaint) {
      query += ` AND complaint = $${params.length + 1}`;
      params.push(complaint);
    }
    
    if (callType) {
      query += ` AND call_type = $${params.length + 1}`;
      params.push(callType);
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Serving index.html for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

//server starting
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});