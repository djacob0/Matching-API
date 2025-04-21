const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("./config/db");
const routes = require('./routes');

const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST'],
  allowedHeaders: [
    'RSBSASYSTEMGENERATEDNUMBER',
    'FIRSTNAME',
    'MIDDLENAME',
    'LASTNAME',
    'EXTENSIONNAME',
    'SEX',
    'MOTHERMAIDENNAME',
    'Content-Type'
  ],
  exposedHeaders: [
    'RSBSASYSTEMGENERATEDNUMBER',
    'FIRSTNAME',
    'MIDDLENAME',
    'LASTNAME',
    'EXTENSIONNAME',
    'SEX',
    'MOTHERMAIDENNAME'
  ]
}));

app.use(bodyParser.json());
app.use('/api', routes);

app.get("/", (req, res) => res.send("API is running..."));

app.listen(5001, () => {
  console.log("Server running on http://localhost:5001");
});