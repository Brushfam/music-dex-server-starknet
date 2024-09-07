require("dotenv").config();
const { initializeApp } = require("firebase-admin/app");
const admin = require("firebase-admin");
const serviceAccount = require("../credentials/adminsdk-data.json");
const postgres = require("postgres");

const firebaseApp = initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, WP_WEBHOOK_KEY } = process.env;
const db = postgres({
  host: PGHOST,
  database: PGDATABASE,
  username: PGUSER,
  password: PGPASSWORD,
  port: 5432,
  ssl: "require",
});

module.exports = {
  firebaseApp,
  db,
};
