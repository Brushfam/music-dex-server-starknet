const express = require("express");
const { db } = require("../../config");
const crypto = require("crypto");
const { stark, ec, CallData, hash } = require("starknet");
const {createStarknetAccount, deployStarknetAccount} = require("../../services/starknet");
const router = express.Router();

router.get("/", async (req, res) => {
  const userUid = req.userUid;

  try {
    const result = await db`
      select user_wallets
      from investors
      where user_id = ${userUid}
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const primary = await db`
      SELECT primary_wallet
      FROM investors
      WHERE user_id = ${userUid}
    `;

    const { user_wallets } = result[0];
    const { primary_wallet } = primary[0] ?? "";
    res.json({ connectedWallets: user_wallets, primaryWallet: primary_wallet });
  } catch (error) {
    console.error("Error fetching user wallets:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", async (req, res) => {
  const userUid = req.userUid;
  const wallet_name = req.body.name;
  const address = req.body.address;

  try {
    await db`
      UPDATE investors
      SET user_wallets = ARRAY[(${wallet_name}, ${address})::user_wallets_type] || user_wallets,
          primary_wallet = ${address}
      WHERE user_id = ${userUid}
    `;

    res.status(200).send("OK.");
  } catch (error) {
    console.error("Error while adding new wallet:", error);
    res.status(500).json({ error: "Error while adding new wallet" });
  }
});

router.get("/primary", async (req, res) => {
  const userUid = req.userUid;

  try {
    const result = await db`
      SELECT primary_wallet
      FROM investors
      WHERE user_id = ${userUid}
    `;

    if (result.length > 0) {
      res.json({ primary_wallet: result[0].primary_wallet });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching primary wallet:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/primary", async (req, res) => {
  const userUid = req.userUid;
  const { primaryAddress } = req.body;

  if (!userUid || !primaryAddress) {
    return res
      .status(400)
      .json({ error: "userId and primaryAddress are required" });
  }

  try {
    await db`
      UPDATE investors
      SET primary_wallet = ${primaryAddress}
      WHERE user_id = ${userUid}
    `;

    res.status(200).json({ message: "Primary wallet updated successfully" });
  } catch (error) {
    console.error("Error updating primary wallet:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/internal", async (req, res) => {
  const userUid = req.userUid;

  try {
    const investor = await db`
      SELECT user_wallets, internal_wallet_signer
      FROM investors
      WHERE user_id = ${userUid}
    `;

    if (investor.length === 0) {
      return res.status(404).json({ message: "Investor not found" });
    }

    // Check if internal_wallet_signer already exists
    const { internal_wallet_signer } = investor[0];
    if (internal_wallet_signer) {
      return res
        .status(409)
        .json({ message: "Internal wallet signer already exists" });
    }

    // Creating account and returning 200
    const { address, encryptedKey, constructor, salt } = await createStarknetAccount();

    const newWallet = { wallet_name: "internal", address: address };
    await db`
      UPDATE investors
      SET user_wallets = ARRAY[(${newWallet.wallet_name}, ${newWallet.address})::user_wallets_type] || user_wallets,
          internal_wallet_signer = ${encryptedKey}
      WHERE user_id = ${userUid}
    `;

    res.status(200).send("Internal wallet was created.");

    try {
      await deployStarknetAccount(constructor, salt)
    } catch (error) {
      console.error("Error in blockchain process:", error);
      // Save deployment error to database
      await db`
        insert into purchase_errors (route_name, error_message)
        values ('/wallets/internal', ${error.message})
    `;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/exist", async (req, res) => {
  const userUid = req.userUid;

  if (!userUid) {
    return res.status(400).send("userId is required.");
  }

  try {
    // Query the investor table to get the user_wallets column for the given userId
    const result = await db`
      SELECT user_wallets
      FROM investors
      WHERE user_id = ${userUid}
    `;

    // Check if user_wallets array is not NULL or empty
    if (
      result.length > 0 &&
      result[0].user_wallets &&
      result[0].user_wallets.length > 0
    ) {
      res.status(200).json({ hasWallets: true });
    } else {
      res.status(200).json({ hasWallets: false });
    }
  } catch (error) {
    console.error("Error checking wallets:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
