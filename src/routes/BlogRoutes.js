const express = require("express");
const router = express.Router();
const { db } = require("../config");

router.get("/", async (req, res) => {
  try {
    const result = await db`
        SELECT TO_CHAR(blog_date, 'YYYY-MM-DD') AS blog_date,
            blog_image, blog_link, title_en, title_uk
        FROM blog
        ORDER BY blog_id DESC;
        `;
    if (!result.length) {
      res.status(200).json({ blog: [] });
    } else {
      res.status(200).json({ blog: result });
    }
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
