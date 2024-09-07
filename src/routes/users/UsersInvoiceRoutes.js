const express = require("express");
const { db } = require("../../config");
const axios = require("axios");
const router = express.Router();

async function getSongPrice(songId) {
  const result = await db`
      select price
      from songs
      where song_id = ${songId}
  `;

  return result[0].price;
}

router.post("/", async (req, res) => {
  const { song_id, token_amount } = req.body;
  const parsed_token_amount = parseFloat(token_amount.toFixed(2));
  const userUid = req.userUid;

  try {
    const songPrice = await getSongPrice(song_id);
    const toPay = token_amount * songPrice;
    const parsedToPay = parseFloat(toPay.toFixed(2));
    const paymentStatus = "WAITING";

    const purchase_ids = await db`
        insert into purchase_history
            (song_id, user_id, token_amount, token_price, payment_status)
        values
            (${song_id}, ${userUid}, ${parsed_token_amount}, ${songPrice}, ${paymentStatus})
        returning purchase_id
    `;

    const currentOrder = purchase_ids[0].purchase_id;

    axios
      .post(
        "https://api.whitepay.com/private-api/crypto-orders/musicdex",
        {
          amount: parsedToPay.toString(),
          currency: "USDT",
          external_order_id: currentOrder.toString(),
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.WP_API_KEY,
          },
        },
      )
      .then(async (orderResponse) => {
        const orderUrl = orderResponse.data.order.acquiring_url;
        await db`
        UPDATE purchase_history
        SET order_url = ${orderUrl}
        WHERE purchase_id = ${currentOrder}
      `;

        res.json({ order_url: orderUrl });
      })
      .catch((error) => {
        console.log(error);
        res.status(500).send("Internal server error during invoice creating.");
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
