const express = require('express');
const bodyParser = require('body-parser')
const cors = require("cors")

const app = express();
app.use(bodyParser.json());
app.use(cors())

const signup = require("./routes/signup.router")
const login = require("./routes/login.router")

app.use("/signup", signup);
app.use("/login", login);

app.get('/', (req, res) => {
  res.send('Hello Express app!')
});

// Error Handler
// Don't move
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "error occured, see the errMessage key for more details", errorMessage: err.message})
})

//  404 Route Handler
//  Note: Do NOT move. This should be the last route
app.use((req, res) => {
  res.status(404).json({ success: false, message: "route not found on server, please check"})
})


app.listen(3000, () => {
  console.log('server started');
});