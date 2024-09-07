const express = require("express");
const { validateSignature } = require("../services/services");
const { db } = require("../config");
const { updateUserBalance } = require("../services/starknet");
const router = express.Router();

async function getInvoiceDetails(external_order_id) {
  const historyQuery = await db`
    select token_amount, song_id, user_id
    from purchase_history
    where purchase_id = ${external_order_id}
  `;

  return historyQuery[0];
}

function findInternalAddress(arr) {
  for (const item of arr) {
    const match = item.match(/^\(([^,]+),([^)]+)\)$/);
    if (match && match[1] === "internal") {
      return match[2];
    }
  }
  return null;
}

async function getInvestorAddress(userId) {
  const query = await db`
    select primary_wallet,
           user_wallets
    from investors
    where user_id = ${userId}
  `;

  if (query.length === 0) {
    throw new Error("Investor not found");
  }

  const { primary_wallet, user_wallets } = query[0];

  if (primary_wallet === "internal") {
    const internalWallet = findInternalAddress(user_wallets);
    if (!internalWallet) {
      throw new Error("Internal wallet not found");
    }
    return internalWallet;
  } else {
    return primary_wallet;
  }
}

async function getSongAddress(songId) {
  const result = await db`
      select token_address
      from songs
      where song_id = ${songId}
    `;

  return result[0].token_address;
}

router.post("/", async (req, res) => {
  const body = req.body;
  const isValid = validateSignature(body, req.headers["signature"]);
  if (!isValid) {
    return res.status(401).send("Invalid signature");
  }

  const { order } = body;
  const { currency, status, external_order_id } = order;

  // Updating payment_status and returning status 200
  const existingUsers =
    await db`select * from purchase_history where purchase_id = ${external_order_id}`;
  if (existingUsers.length > 0) {
    try {
      await db`
        update purchase_history
        set payment_status = ${status}, currency = ${currency}
        where purchase_id = ${external_order_id}`;

      res.status(200).send("OK.");
    } catch (error) {
      console.error("Error updating purchase_history");
      res.status(500).send("Error updating purchase_history");
      return;
    }
  } else {
    console.log("Invoice doesn't exist in purchases history.");
    res.status(404).send("Invoice doesn't exist in purchases history.");
    return;
  }

  // Transfer tokens to user's address
  if (status === "COMPLETE") {
    try {
      const { user_id, song_id, token_amount } =
        await getInvoiceDetails(external_order_id);
      const userAddress = await getInvestorAddress(user_id);
      const songAddress = await getSongAddress(song_id);
      await updateUserBalance(userAddress, songAddress, token_amount);
    } catch (error) {
      console.error("Error in token transfer process:", error);
      // Save transfer error to database
      await db`
        insert into purchase_errors (route_name, error_message)
        values ('/whitepay-invoice', ${error.message})
    `;
    }
  }
});

module.exports = router;
