const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const token = jwt.sign({ id: '6a6da2e653aaa27d5387e679' }, process.env.JWT_SECRET);
axios.get('https://coders-adda-backend.onrender.com/certificate/my-certificates', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => console.log(JSON.stringify(r.data, null, 2)))
  .catch(e => console.log(e.response ? e.response.data : e.message));
