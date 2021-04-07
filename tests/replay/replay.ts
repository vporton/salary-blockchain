import Web3 from "web3";
import { JsonRpcResponse } from "web3-core-helpers";

const fs = require("fs");
const DB_PATH = "db";
let mode;
let error_file, progress_file;

function lastProcessedBlock(): any {
  try {
    if (fs.existsSync(progress_file)) {
      let p = JSON.parse(fs.readFileSync(progress_file));
      if (p.hasOwnProperty("lastProcessedBlock")) {
        return p;
      } else {
        throw Error("Progress file is corrupted.");
      }
    } else {
      let p = {
        lastProcessedBlock: 0,
        ethTransactionsProcessed: 0,
      };
      fs.writeFileSync(progress_file, JSON.stringify(p));
      return p;
    }
  } catch (err) {
    throw err;
  }
}

function createErrorFile() {
  try {
    if (!fs.existsSync(error_file)) {
      fs.writeFileSync(
        error_file,
        JSON.stringify({
          errors: [],
        })
      );
    }
  } catch (err) {
    throw err;
  }
}

async function processBlock(web3: Web3, n: number): Promise<number> {
  // Get current block and iterate over its transaction hashes.
  let block = await web3.eth.getBlock(n);
  for (let txn of block.transactions) {
    let params = [txn];
    // Replay the current transaction.
    let req = new Promise<JsonRpcResponse>((resolve, reject) => {
      (web3.currentProvider as any).send(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "debug_traceTransaction",
          params,
        },
        (error: Error | null, result?: JsonRpcResponse) => {
          // We are only interested in errors. Error in HTTP request.
          if (error) {
            let e = JSON.parse(fs.readFileSync(error_file));
            let current = e.errors;
            current.push({
              block_number: n,
              txn: txn,
              error: error.message || error.toString(),
            });
            // Update error file.
            fs.writeFileSync(error_file, JSON.stringify(current));
            reject(`Failed ((${params.join(",")})): ${error.message || error.toString()}`);
          }
          console.log("Processed transaction: " + txn);
          resolve(result);
        }
      );
    });
    let response = await req;
    // We are only interested in errors. Error on processing the request.
    if (response.hasOwnProperty("error")) {
      let e = JSON.parse(fs.readFileSync(error_file));
      let current = e.errors;
      current.push({
        block_number: n,
        txn: txn,
        error: response.error,
      });
      // Update error file.
      fs.writeFileSync(error_file, JSON.stringify(current));
    }
  }
  // Return the number of transactions processed in this block.
  return block.transactions.length;
}

(async () => {

  // Required --url argument.
  let url;
  if (!process.env.npm_config_url || process.env.npm_config_debug == "") {
    console.error("Please provide an `--url` argument");
    process.exit(1);
  }
  url = process.env.npm_config_url;

  // Handle --debug or --trace argument. Default to --debug.
  if (!process.env.npm_config_mode || process.env.npm_config_mode == "") {
    mode = "debug";
    console.warn("No mode selected, running with `--debug`");
  } else if (process.env.npm_config_debug && process.env.npm_config_trace) {
    mode = "debug";
    console.warn("Multiple modes not supported, running with `--debug`");
  } else {
    mode = process.env.npm_config_mode;
  }

  let web3 = new Web3(url);
  // Check if there is connectivity.
  await web3.eth.net
    .isListening()
    .then(() => { })
    .catch((e) => {
      throw Error("Url cannot be accessed. Exit.");
    });


  // Create db directory if not exists.
  let db_path = DB_PATH + "/" + mode;
  if (!fs.existsSync(db_path)) {
    fs.mkdirSync(db_path);
  }

  error_file = db_path + "/error.json";
  progress_file = db_path + "/progress.json";

  // Create error file if not exists.
  createErrorFile();

  // Get last processed block number. Create progress file if not exists.
  let last = lastProcessedBlock();
  let from = last.lastProcessedBlock;
  let totalTxn = last.ethTransactionsProcessed;
  let to = await web3.eth.getBlockNumber();

  // Progress is corrupted
  // a.k.a. network purged but progress file still holding previous progress.
  if (from >= to) {
    throw Error("Outdated progress file.");
  }

  if (mode == "debug") {
    // Debug mode iterates over all unprocessed blocks and uses debug_traceTransaction to
    // replay the whole chain.
    let i;
    for (i = from + 1; i <= to; i++) {
      // Process a single block.
      totalTxn += await processBlock(web3, i);
      console.log("--- Processed block: " + i);
      // Update progress.
      fs.writeFileSync(
        progress_file,
        JSON.stringify({
          lastProcessedBlock: i,
          ethTransactionsProcessed: totalTxn,
        })
      );
    }
  } else if (mode == "trace") {
    // TODO
  } else {
    console.error("Mode is unsupported");
  }
})();
