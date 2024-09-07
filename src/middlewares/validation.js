const { getAuth } = require("firebase-admin/auth");
const { firebaseApp } = require("../config");

const validateFirebaseToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split(" ")[1];

  if (!idToken) {
    return res.status(401).send("Invalid idToken");
  }

  try {
    const decoded_uid = await getAuth(firebaseApp).verifyIdToken(idToken);
    req.userUid = decoded_uid.uid;
    req.userEmail = decoded_uid.email;
    next();
  } catch (error) {
    console.error("Error verifying idToken:", error);
    return res.status(401).send("Invalid idToken");
  }
};

module.exports = validateFirebaseToken;
