const express = require("express");
const cors = require("cors");
const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/common-evm-utils");

const serverless = require('serverless-http');

require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors())


// Add a variable for the api key and chain
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const chain = EvmChain.ETHEREUM;

app.get("/.netlify/functions/api/getEthPrice", async (req, res) => {
  try {
    const response = await Moralis.EvmApi.token.getTokenPrice({
      address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      chain: "0x1",
    });

    return res.status(200).json(response);
  } catch (err) {
    console.log(`Error: ${err}`);
    return res.status(400).json();
  }
});


app.get('/.netlify/functions/api/getTransactionsByAddress', async (req, res) => {
  try {
    const { query } = req;
    const address = query.address;

    const response =
      await Moralis.EvmApi.transaction.getWalletTransactionsVerbose({
        address,
        chain,
      });


    return res.status(200).json(response);
  } catch (error) {
    return res.json(400).json({ "Error: ": err });
  }
})

app.get("/.netlify/functions/api/getLatestBlocks", async (req, res) => {
  try {
    const latestBlock = await Moralis.EvmApi.block.getDateToBlock({
      date: Date.now(),
      chain,
    });

    let blockNrOrParentHash = latestBlock.toJSON().block;
    let previousBlockInfo = [];

    for (let i = 0; i < 5; i++) {
      const previousBlockNrs = await Moralis.EvmApi.block.getBlock({
        chain: "0x1",
        blockNumberOrHash: blockNrOrParentHash,
      });

      blockNrOrParentHash = previousBlockNrs.toJSON().parent_hash;
      if (i == 0) {
        previousBlockInfo.push({
          transactions: previousBlockNrs.toJSON().transactions.map((i) => {
            return {
              transactionHash: i.hash,
              time: i.block_timestamp,
              fromAddress: i.from_address,
              toAddress: i.to_address,
              value: i.value,
            };
          }),
        });
      }
      previousBlockInfo.push({
        blockNumber: previousBlockNrs.toJSON().number,
        totalTransactions: previousBlockNrs.toJSON().transaction_count,
        gasUsed: previousBlockNrs.toJSON().gas_used,
        miner: previousBlockNrs.toJSON().miner,
        time: previousBlockNrs.toJSON().timestamp,
      });
    }

    const response = {
      latestBlock: latestBlock.toJSON().block,
      previousBlockInfo,
    };

    return res.status(200).json(response);
  } catch (e) {
    console.log(`Somthing went wrong ${e}`);
    return res.status(400).json();
  }
});

const startServer = async () => {
  await Moralis.start({
    apiKey: MORALIS_API_KEY,
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};

startServer();


const handler = serverless(app)
// app.use('/.netlify/functions/api', router);
module.exports.handler = async (event, context) => {
  const result = await handler(event, context)
  return result
};