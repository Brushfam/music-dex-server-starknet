require("dotenv").config();
const { HmacSHA256 } = require("crypto-js");
const crypto = require("crypto");

function validateSignature(payload, signatureFromHeader) {
  const payloadJson = JSON.stringify(payload).replace(/\//g, "\\/");
  const computedSignature = HmacSHA256(
    payloadJson,
    process.env.WP_WEBHOOK_KEY,
  ).toString();

  if (computedSignature !== signatureFromHeader) {
    console.error("Signature verification failed.");
    return false;
  }
  return true;
}

function encrypt(text) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.ENCRYPTION_KEY),
    Buffer.from(process.env.ENCRYPTION_IV, "hex"),
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString("hex");
}

module.exports = { validateSignature, encrypt };
