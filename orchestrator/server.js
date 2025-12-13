require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'SentinelChain Orchestrator is running' });
});

// Add routes for other modules as needed
// e.g., app.use('/agents', require('../agents'));
// app.use('/dashboard', require('../dashboard'));
// etc.

app.listen(port, () => {
  console.log(`Orchestrator listening on port ${port}`);
});
