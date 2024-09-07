const express = require("express");
const { db } = require("../../config");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const userUid = req.userUid;

    const purchaseHistory = await db`
      SELECT
        ph.token_amount,
        ph.token_price,
        ph.currency,
        ph.purchase_timestamp,
        ph.payment_status,
        ph.order_url,
        s.song_name
      FROM
        purchase_history ph
          JOIN
        songs s
        ON
          ph.song_id = s.song_id
      WHERE
        ph.user_id = ${userUid}
      ORDER BY
        ph.purchase_id DESC
    `;

    res.status(200).json({ purchaseHistory: purchaseHistory });
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
