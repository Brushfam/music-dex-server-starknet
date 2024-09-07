require("dotenv").config();
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middlewares/error");
const routes = require('./routes');
const app = express();

app.use(express.json());

app.use(cors({ origin: "*" }));

app.use('/', routes);

app.use(errorHandler);

app.get("*", (req, res) => {
  res.status(404).send("Page not found");
});

module.exports = app;
