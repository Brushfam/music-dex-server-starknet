const express = require("express");
const router = express.Router();
const { db } = require("../config");
const { RpcProvider, Contract } = require("starknet");

router.get("/", async (req, res) => {
  try {
    const result = await db`
      SELECT song_name, cover, cover_to_top, genre, country, slug, 
             TO_CHAR(release_date, 'YYYY-MM-DD') AS release_date, 
             TO_CHAR(listening_date, 'YYYY-MM-DD') AS listening_date,
             rightsholder, total_supply, price
      FROM songs 
      ORDER BY song_id DESC
    `;
    res.status(200).json({ catalog: result });
  } catch (error) {
    console.error("Error fetching catalog:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
})

router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db`
      SELECT song_id, song_name, cover, cover_to_top, genre, country, rightsholder, 
          TO_CHAR(release_date, 'YYYY-MM-DD') AS release_date, 
          TO_CHAR(listening_date, 'YYYY-MM-DD') AS listening_date,
          description_en, description_uk, total_supply, price, donate_link
      FROM songs
      WHERE slug = ${slug}
    `;

    if (!result.length) {
      res.status(404).send("Song slug doesn't exist.");
      return;
    }
    res.status(200).json({ songMainData: result[0] });
  } catch (error) {
    console.error("Error fetching song data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:slug/available-amount", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db`
      SELECT token_address
      FROM songs
      WHERE slug = ${slug}
    `;
    if (!result.length) {
      res.status(404).send("Song slug doesn't exist.");
      return;
    }
    const tokenAddress = result[0].token_address;

    const providerBlast = new RpcProvider({
      nodeUrl: "https://starknet-mainnet.public.blastapi.io/rpc/v0_7",
    });
    const { abi: contractAbi } = await providerBlast.getClassAt(tokenAddress);
    const songContract = new Contract(contractAbi, tokenAddress, providerBlast);
    let amount = await songContract.get_free_token_balance();
    res.status(200).json({ amount: Number(amount) });
  } catch (error) {
    console.error("Error fetching tokens available amount:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:slug/overview", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db`
      SELECT sl.youtube_id, sl.youtube, sl.youtube_music, sl.apple_music, sl.spotify
      FROM song_streams_links sl
      JOIN songs s ON s.song_id = sl.song_id
      WHERE s.slug = ${slug} 
    `;
    if (!result.length) {
      res.status(404).send("Song slug doesn't exist.");
      return;
    }
    res.status(200).json({ overview: result[0] });
  } catch (error) {
    console.error("Error fetching song streams links:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:slug/royalties", async (req, res) => {
  res.status(200).json({ royalties: [] });
});

router.get("/:slug/listening/:platform", async (req, res) => {
  const { slug, platform } = req.params;

  try {
    const result = await db`
      SELECT slh.month_listening, slh.streams
      FROM song_listening_history slh
      JOIN songs s ON s.song_id = slh.song_id
      WHERE s.slug = ${slug} AND slh.platform = ${platform}
      ORDER BY slh.song_listening_id ASC;
    `;
    if (!result.length) {
      res.status(404).send("Song slug doesn't exist.");
      return;
    }

    const formattedResult = result.map((row) => ({
      month: row.month_listening,
      streams: row.streams,
    }));

    res.status(200).json({ result: formattedResult });
  } catch (error) {
    console.error("Error fetching song listenings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:slug/about-artist", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db`
      SELECT aa.about_uk, aa.about_en
      FROM about_artists aa
      JOIN songs s ON s.about_artist_id = aa.about_artist_id
      WHERE s.slug = ${slug} 
    `;
    if (!result.length) {
      res.status(404).send("Song slug doesn't exist.");
      return;
    }
    res
      .status(200)
      .json({ aboutEN: result[0].about_en, aboutUK: result[0].about_uk });
  } catch (error) {
    console.error("Error fetching information about artist:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
