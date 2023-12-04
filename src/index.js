const { port } = require('./config/vars');
const mongoose = require('./config/mongoose');
const app = require('./config/express');
app.set("view engine", "ejs");

const http = require('http');
mongoose.connect();

http.createServer(app).listen(port, "0.0.0.0" , () => {
    console.log(`Server is running at port ${port} ...`)});

module.exports = app;