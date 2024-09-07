const express = require("express");
const { db } = require("../../config");
const router = express.Router();
const { getUserById } = require("../../services/users");
const { format } = require("date-fns");

async function getInvestorSongs(userUid) {
  return db`
    SELECT ph.token_amount,
           ph.token_price,
           ph.purchase_timestamp,
           s.song_name,
           s.slug,
           s.price
    FROM purchase_history ph
           JOIN
         songs s ON ph.song_id = s.song_id
    WHERE ph.user_id = ${userUid}
      AND ph.payment_status = 'COMPLETE'
    ORDER BY ph.purchase_timestamp DESC
  `;
}

const getInvestorSongsData = async (userUid) => {
  const purchaseHistory = await getInvestorSongs(userUid);

  const aggregatedSongs = purchaseHistory.reduce((acc, row) => {
    const key = `${row.song_name}`;

    if (!acc[key]) {
      acc[key] = {
        date: row.purchase_timestamp,
        song_name: row.song_name,
        slug: row.slug,
        total_amount: 0,
        total_invested: 0,
      };
    }

    acc[key].total_amount += parseFloat(row.token_amount);
    acc[key].total_invested +=
      parseFloat(row.token_amount) * parseFloat(row.price);

    return acc;
  }, {});

  // Convert the result into an array and format total_invested
  return Object.values(aggregatedSongs).map((song) => ({
    date: format(new Date(song.date), "dd/MM/yyyy"),
    name: song.song_name,
    slug: song.slug,
    tokens: song.total_amount.toFixed(2),
    invested: song.total_invested.toFixed(2),
  }));
};

async function getArtistId(userId) {
  const [artist] = await db`
    SELECT artist_id FROM artists WHERE user_id = ${userId}
  `;
  return artist ? artist.artist_id : null;
}

async function getSongsByArtistId(artistId) {
  return db`
    SELECT song_id, song_name, listening_date
    FROM songs
    WHERE artist_id = ${artistId}
  `;
}

async function getPurchaseHistory(songIds) {
  return db`
    SELECT song_id, token_amount, token_price, purchase_timestamp
    FROM purchase_history
    WHERE song_id = ANY (${songIds})
      AND payment_status = 'COMPLETE'
      AND purchase_timestamp >= NOW() - INTERVAL '6 months'
  `;
}

function calculateMonthlyStatistics(purchaseHistory) {
  const statistics = {};

  // Initialize an object to store statistics for the past 6 months
  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() + 1 - i, 1);
    const month = date.toISOString().slice(0, 7); // YYYY-MM
    months.push(month);
  }

  // Calculate statistics
  purchaseHistory.forEach((record) => {
    const { song_id, token_amount, token_price, purchase_timestamp } = record;
    const month = purchase_timestamp.toISOString().slice(0, 7); // YYYY-MM

    if (!statistics[song_id]) {
      statistics[song_id] = {};
    }

    if (!statistics[song_id][month]) {
      statistics[song_id][month] = {
        invested: 0,
        amount: 0,
      };
    }

    statistics[song_id][month].invested += token_amount * token_price;
    statistics[song_id][month].amount += Number(token_amount);
  });

  // Ensure each song has at least 6 months of data
  for (const songId in statistics) {
    months.forEach((month) => {
      if (!statistics[songId][month]) {
        statistics[songId][month] = { invested: 0, amount: 0 };
      }
    });
    // Ensure months are in chronological order
    const sortedMonths = {};
    months.forEach((month) => {
      sortedMonths[month] = statistics[songId][month];
    });
    statistics[songId] = sortedMonths;
  }

  return statistics;
}

async function getSongData(userId) {
  const artistId = await getArtistId(userId);
  if (!artistId) {
    throw new Error("Artist not found");
  }

  const songs = await getSongsByArtistId(artistId);
  const songIds = songs.map((song) => song.song_id);

  const purchaseHistory = await getPurchaseHistory(songIds);
  const monthlyStatistics = calculateMonthlyStatistics(purchaseHistory);

  return songs.map((song) => {
    const { song_id, song_name, listening_date } = song;
    const statisticsRaw = monthlyStatistics[song_id] || {};

    let totalInvested = 0;
    let totalAmount = 0;
    for (const { invested, amount } of Object.values(statisticsRaw)) {
      totalInvested += invested;
      totalAmount += amount;
    }

    const statistics = Object.entries(statisticsRaw).map(
      ([month, { invested, amount }]) => ({
        month,
        invested,
        amount,
      }),
    );

    return {
      songName: song_name,
      listeningDate: format(new Date(listening_date), "dd/MM/yyyy"),
      totalInvested: totalInvested,
      totalAmount: totalAmount,
      statistics: statistics,
    };
  });
}

router.get("/", async (req, res) => {
  try {
    const userUid = req.userUid;
    const user = await getUserById(userUid);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.user_role === "investor") {
      const songs = await getInvestorSongsData(userUid);
      res.json({ songs: songs });
    } else if (user.user_role === "artist") {
      const songData = await getSongData(userUid);
      res.json({ songData: songData });
    } else {
      return res.status(400).json({ error: "Invalid user role" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
