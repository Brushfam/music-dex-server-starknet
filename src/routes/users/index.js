const express = require("express");
const validateFirebaseToken = require("../../middlewares/validation");
const { db } = require("../../config");
const router = express.Router();
const loginInfoRoutes = require("./UsersLoginInfoRoutes")
const walletRoutes = require("./UsersWalletsRoutes");
const infoRoutes = require('./UsersInfoRoutes')
const overviewRoutes = require('./UsersOverviewRoutes')
const invoiceRoutes = require("./UsersInvoiceRoutes");
const activitiesRoutes = require('./UsersActivitiesRoutes')
const songsRoutes = require('./UsersSongsRoutes')
const nftsRoutes = require('./UsersNFTsRoutes')

router.use(validateFirebaseToken);

router.post("/", async (req, res) => {
  const userUid = req.userUid;
  const email = req.body.email;
  const role = req.body.role;

  const existingUsers =
    await db`select * from users where user_id = ${userUid}`;

  try {
    if (existingUsers.length > 0) {
      return res.status(409).send("User is already exist.");
    } else {
      await db`
        insert into users (user_id, email, user_role)
        values (${userUid}, ${email}, ${role})
        `;

      if (role === "investor") {
        await db`
            insert into investors (user_id)
            values (${userUid})
        `;
      } else if (role === "artist") {
        await db`
            insert into artists (user_id)
            values (${userUid})
        `;
      }
      res.status(200).send("OK");
    }
  } catch (error) {
    console.error("Error updating Users table: ", error);
    return res.status(500).send("Internal server error");
  }
});

router.get("/role", async (req, res) => {
  const userUid = req.userUid;

  try {
    const result = await db`
      select user_role
      from users
      where user_id = ${userUid}
    `;

    const { user_role } = result[0];
    res.json({ role: user_role });
  } catch (error) {
    console.error("Error fetching user wallets:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.use("/login-info", loginInfoRoutes)
router.use("/wallets", walletRoutes);
router.use("/info", infoRoutes)
router.use("/overview", overviewRoutes)
router.use('/invoice', invoiceRoutes)
router.use('/activities', activitiesRoutes)
router.use('/songs', songsRoutes)
router.use('/nfts', nftsRoutes)

module.exports = router;
