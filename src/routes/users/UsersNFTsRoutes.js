const express = require("express");
const { db } = require("../../config");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const userUid = req.userUid;

    const results = await db`
      SELECT
        inv_nft.amount,
        to_char(inv_nft.transfer_date, 'YYYY-MM-DD') as transfer_date,
        nfts.nft_id,
        nfts.nft_name,
        nfts.nft_description,
        nfts.nft_description_uk,
        nfts.nft_thumbnail_link,
        nfts.nft_link
      FROM investor_nft inv_nft
             JOIN nfts ON inv_nft.nft_id = nfts.nft_id
      WHERE inv_nft.user_id = ${userUid}
    `;

    const nfts = results.map(row => ({
      nft_transfer_date: row.transfer_date,
      nft_name: row.nft_name,
      nft_description: row.nft_description,
      nft_description_uk: row.nft_description_uk,
      nft_thumbnail_link: row.nft_thumbnail_link,
      nft_link: row.nft_link,
      nft_amount: row.amount
    }));

    res.json({ nfts: nfts });
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
