const express = require("express");
const { db } = require("../../config");
const router = express.Router();
const { format } = require('date-fns');
const {getUserById} = require("../../services/users");

async function getInvestorInfo(user_id) {
  try {
    const result = await db`
      SELECT
        token_amount,
        token_price * token_amount as money_amount
      FROM
        purchase_history
      WHERE
        user_id = ${user_id} AND
        payment_status = 'COMPLETE'
    `;
    const totalTokensAmount = result.reduce((sum, row) => Number(sum) + Number(row.token_amount), 0);
    const totalInvestedAmount = result.reduce((sum, row) => Number(sum) + Number(row.money_amount), 0);

    if (result.length > 0) {
      return {
        totalInvestedAmount: totalInvestedAmount,
        totalTokensAmount: totalTokensAmount,
      };
    } else {
      return {
        totalInvestedAmount: 0,
        totalTokensAmount: 0,
      };
    }
  } catch (error) {
    console.error("Error fetching investor info:", error);
    throw new Error("Unable to fetch investor info");
  }
}

async function findArtistAndSongIDs(userUid) {
  const songIds = await db`
    SELECT s.song_id
    FROM artists a
    JOIN songs s ON a.artist_id = s.artist_id
    WHERE a.user_id = ${userUid}
  `;

  return songIds.map(row => row.song_id);
}

async function getArtistInfo(userUid) {
  const songIds = await findArtistAndSongIDs(userUid);

  if (songIds.length === 0) {
    return {
      totalTokensAmount: 0,
      totalInvestedAmount: 0,
    };
  }

  const purchaseHistory = await db`
    SELECT token_amount, token_price
    FROM purchase_history
    WHERE song_id = ANY(${songIds}) AND payment_status = 'COMPLETE'
  `;

  let totalTokensAmount = 0;
  let totalInvestedAmount = 0;

  for (const row of purchaseHistory) {
    const tokenAmount = row.token_amount;
    const tokenPrice = row.token_price;
    totalTokensAmount += Number(tokenAmount);
    totalInvestedAmount += tokenAmount * tokenPrice;
  }

  return {
    totalTokensAmount,
    totalInvestedAmount,
  };
}

async function getPurchaseHistory(userUid) {
  const songIds = await findArtistAndSongIDs(userUid);

  if (songIds.length === 0) {
    return [];
  }

  const purchaseHistory = await db`
    SELECT 
      ph.purchase_timestamp,
      ph.token_amount,
      ph.token_price,
      s.song_name
    FROM purchase_history ph
    JOIN songs s ON ph.song_id = s.song_id
    WHERE ph.song_id = ANY(${songIds}) AND payment_status = 'COMPLETE'
  `;

  return purchaseHistory.map(row => ({
    date: format(new Date(row.purchase_timestamp), 'dd/MM/yyyy'),
    name: row.song_name,
    amount: row.token_amount,
    invested: row.token_amount * row.token_price,
  }));
}

router.get("/", async (req, res) => {
  try {
    const userUid = req.userUid;
    const user = await getUserById(userUid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.user_role === "investor") {
      const { totalInvestedAmount, totalTokensAmount } =
        await getInvestorInfo(userUid);
      res
        .status(200)
        .json({
          totalInvestedAmount: totalInvestedAmount,
          totalTokensAmount: totalTokensAmount,
        });
    } else if (user.user_role === "artist") {
      const { totalInvestedAmount, totalTokensAmount } =
          await getArtistInfo(userUid);
      const history = await getPurchaseHistory(userUid)
      res
          .status(200)
          .json({
            totalInvestedAmount: totalInvestedAmount,
            totalTokensAmount: totalTokensAmount,
            history: history
          });
    } else {
      return res.status(400).json({ error: "Invalid user role" });
    }

    res.status(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
