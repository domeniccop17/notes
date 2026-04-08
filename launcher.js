const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const app = express();
app.use(cors());
app.get('/launch', (req, res) => {
  exec('start "" powershell.exe -NoExit -WorkingDirectory "C:\\Bureau\\TBP" -Command "python dashboard\\app.py"');
  res.json({ ok: true });
});
app.listen(5001, () => console.log('Launcher ready on port 5001'));
