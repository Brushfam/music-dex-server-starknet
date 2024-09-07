const {
  constants: starknetConstants,
  CallData,
  ec,
  hash,
  stark,
} = require("starknet");
const { encrypt } = require("./services");

const { RpcProvider, Account, Contract, cairo } = require("starknet");

const providerBlast = new RpcProvider({
  nodeUrl: "https://starknet-mainnet.public.blastapi.io/rpc/v0_7",
});
const OZ_ACCOUNT_CLASS_HASH =
  "0x00e2eb8f5672af4e6a4e8a8f1b44989685e668489b0a25437733756c5a34a1d6";

const DECIMALS = 10;

function getBaseAccount() {
  return new Account(
    providerBlast,
    process.env.STARKNET_BASE_ADDRESS,
    process.env.STARKNET_BASE_KEY,
    "1",
  );
}

async function updateUserBalance(userAddress, songAddress, tokenAmount) {
  const baseAccount = getBaseAccount();
  const amount = cairo.uint256(tokenAmount * DECIMALS);

  // Creating contract instance
  const { abi: contractAbi } = await providerBlast.getClassAt(songAddress);
  const baseContract = new Contract(contractAbi, songAddress, providerBlast);
  baseContract.connect(baseAccount);

  // Calculating fees
  const { suggestedMaxFee: estimatedFee } = await baseAccount.estimateInvokeFee(
    {
      contractAddress: songAddress,
      entrypoint: "transfer",
      calldata: [userAddress, amount],
    },
  );
  const fee = (estimatedFee * BigInt(12)) / BigInt(10);

  // Executing transaction
  const transferCall = baseContract.populate("transfer", [userAddress, amount]);
  const writeRes = await baseContract.transfer(transferCall.calldata, {
    maxFee: fee,
  });
  const res = await providerBlast.waitForTransaction(writeRes.transaction_hash);
  console.log(res);
}

async function createStarknetAccount() {
  const baseAccount = getBaseAccount();
  const contractClassHash = OZ_ACCOUNT_CLASS_HASH;
  const compiledContract =
    await providerBlast.getClassByHash(contractClassHash);
  const myCallData = new CallData(compiledContract.abi);
  const key = stark.randomAddress();
  const starkKeyPub = ec.starkCurve.getStarkKey(key);
  const constructor = myCallData.compile("constructor", {
    public_key: starkKeyPub,
  });
  const salt = stark.randomAddress();
  const addressDepl = hash.calculateContractAddressFromHash(
    ec.starkCurve.pedersen(baseAccount.address, salt),
    contractClassHash,
    constructor,
    starknetConstants.UDC.ADDRESS,
  );
  const encryptedKey = encrypt(key);

  return {
    address: addressDepl,
    encryptedKey: encryptedKey,
    constructor: constructor,
    salt: salt,
  };
}

async function deployStarknetAccount(constructor, salt) {
  const baseAccount = getBaseAccount();
  const myCall = {
    contractAddress: starknetConstants.UDC.ADDRESS,
    entrypoint: starknetConstants.UDC.ENTRYPOINT,
    calldata: CallData.compile({
      classHash: OZ_ACCOUNT_CLASS_HASH,
      salt: salt,
      unique: "1",
      calldata: constructor,
    }),
  };
  console.log("Deploy of contract in progress...");

  // Calculating fees
  const { suggestedMaxFee: estimatedFee } = await baseAccount.estimateDeployFee(
    {
      classHash: OZ_ACCOUNT_CLASS_HASH,
      constructorCalldata: constructor,
    },
  );
  const fee = (estimatedFee * BigInt(12)) / BigInt(10);

  // Deployment
  const { transaction_hash: txHDepl } = await baseAccount.execute([myCall], {
    maxFee: fee,
  });
  console.log("TxH =", txHDepl);
  const res = await providerBlast.waitForTransaction(txHDepl);
  console.log(res.statusReceipt);
}

module.exports = {
  updateUserBalance,
  createStarknetAccount,
  deployStarknetAccount,
};
