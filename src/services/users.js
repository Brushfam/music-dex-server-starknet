const { db } = require("../config");

async function getUserById(userUid) {
    const result = await db`
    SELECT user_id, email, user_role
    FROM users
    WHERE user_id = ${userUid}
  `;
    return result[0];
}

module.exports = { getUserById };