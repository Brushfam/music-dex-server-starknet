const express = require("express");
const { db } = require("../../config");
const router = express.Router();

async function getFirstLoginStatus(userId) {
  const [result] = await db`
    SELECT is_first_login
    FROM users
    WHERE user_id = ${userId}
  `;

  return result?.is_first_login ?? false;
}

// login-info GET route returns name and is_first_login boolean
router.get("/", async (req, res) => {
  const userUid = req.userUid;

  try {
    // Find user role
    const userResult = await db`
      SELECT user_role
      FROM users
      WHERE user_id = ${userUid}
    `;

    if (userResult.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userRole = userResult[0].user_role;
    let firstName = "";

    if (userRole === "investor") {
      const investorResult = await db`
        SELECT first_name
        FROM investors
        WHERE user_id = ${userUid}
      `;

      if (investorResult.length > 0) {
        firstName = investorResult[0].first_name || "";
      }
    } else if (userRole === "artist") {
      const artistResult = await db`
        SELECT first_name
        FROM artists
        WHERE user_id = ${userUid}
      `;

      if (artistResult.length > 0) {
        firstName = artistResult[0].first_name || "";
      }
    } else {
      return res.status(400).json({ error: "Invalid user role" });
    }

    const isFirstLogin = await getFirstLoginStatus(userUid);
    res.status(200).json({ firstName: firstName, isFirstLogin: isFirstLogin });
  } catch (error) {
    console.error("Error fetching user name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// login-info POST route sets is_first_login to false
router.post("/", async (req, res) => {
  const userUid = req.userUid;

  const updatedValue = false
  try {
    await db`
      UPDATE users
      SET is_first_login = ${updatedValue}
      WHERE user_id = ${userUid}
    `;
    res.status(200).send("OK.")
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Internal server error" });
  }
})

module.exports = router;
