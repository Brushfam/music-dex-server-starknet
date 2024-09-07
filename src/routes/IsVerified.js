const express = require("express");
const { getAuth } = require("firebase-admin/auth");
const router = express.Router();

router.get("/", async (req, res) => {
  getAuth()
    .getUserByEmail(req.query.email)
    .then((userRecord) => {
      res.status(200).send({ isVerified: userRecord.emailVerified });
    })
    .catch((error) => {
      if (error.code === "auth/user-not-found") {
        res.status(404).send("user doesn't exist.");
      } else {
        res.status(422).send("Invalid data.");
      }
    });
});

module.exports = router;
