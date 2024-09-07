const express = require("express");
const { db } = require("../../config");
const router = express.Router();

async function getUserById(userUid) {
  const result = await db`
    SELECT user_id, email, user_role
    FROM users
    WHERE user_id = ${userUid}
  `;
  return result[0];
}

async function getInvestorDetails(userUid) {
  const result = await db`
    SELECT first_name, last_name, country, fav_genre, profiles
    FROM investors
    WHERE user_id = ${userUid}
  `;
  return result[0];
}

async function getArtistDetails(userUid) {
  const result = await db`
    SELECT first_name, last_name, artist_name, country
    FROM artists
    WHERE user_id = ${userUid}
  `;
  return result[0];
}

async function updateInvestorDetails(userUid, details) {
  await db`
    UPDATE investors
    SET first_name = ${details.firstName},
        last_name = ${details.lastName},
        country = ${details.country},
        fav_genre = ${details.favGenre},
        profiles = ${details.profiles}
    WHERE user_id = ${userUid}
  `;
}

async function updateArtistDetails(userUid, details) {
  await db`
    UPDATE artists
    SET first_name = ${details.firstName},
        last_name = ${details.lastName},
        artist_name = ${details.artistName},
        country = ${details.country}
    WHERE user_id = ${userUid}
  `;
}

router.get("/", async (req, res) => {
  try {
    const userUid = req.userUid;
    const user = await getUserById(userUid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let userDetails;
    if (user.user_role === "investor") {
      userDetails = await getInvestorDetails(userUid);
    } else if (user.user_role === "artist") {
      userDetails = await getArtistDetails(userUid);
    } else {
      return res.status(400).json({ error: "Invalid user role" });
    }

    res.json({
      info: userDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userUid = req.userUid;
    const user = await getUserById(userUid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const details = req.body.details;

    if (user.user_role === "investor") {
      await updateInvestorDetails(userUid, details);
    } else if (user.user_role === "artist") {
      await updateArtistDetails(userUid, details);
    } else {
      return res.status(400).json({ error: "Invalid user role" });
    }

    res.status(200).json({ message: "User details updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
