import Web3 from "web3";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { typesBundle } from "../../../moonbeam-types-bundle";

import { spawn, ChildProcess, ChildProcessWithoutNullStreams } from "child_process";
import {
  BINARY_PATH,
  DISPLAY_LOG,
  MOONBEAM_LOG,
  PORT,
  RPC_PORT,
  SPAWNING_TIME,
  WS_PORT,
} from "../constants";
import { ErrorReport } from "./fillBlockWithTx";

export function log(...msg: (string | number | ErrorReport)[]) {
  if (process.argv && process.argv[2] && process.argv[2] === "--printlogs") {
    console.log(...msg);
  }
}

export interface Context {
  web3: Web3;

  // WsProvider for the PolkadotJs API
  wsProvider: WsProvider;
  polkadotApi: ApiPromise;
}

let runningNode: ChildProcessWithoutNullStreams;

export async function startMoonbeamNode(
  //TODO Make this parameter optional and just default to development.
  // For now I'm just ignoring the param and hardcoding development below.
  specFilename: string,
  provider?: string
): Promise<{ context: Context }> {
  let web3;
  if (!provider || provider == "http") {
    web3 = new Web3(`http://localhost:${RPC_PORT}`);
  }

  const wsProvider = new WsProvider(`ws://localhost:${WS_PORT}`);
  const polkadotApi = await ApiPromise.create({
    provider: wsProvider,
    typesBundle: typesBundle as any,
  });

  if (provider == "ws") {
    web3 = new Web3(`ws://localhost:${WS_PORT}`);
  }

  return { context: { web3, polkadotApi, wsProvider } };
}

export function describeWithMoonbeam(
  title: string,
  specFilename: string,
  cb: (context: Context) => void,
  provider?: string
) {
  describe(title, () => {
    let context: Context = { web3: null, wsProvider: null, polkadotApi: null };

    // Making sure the Moonbeam node has started
    before("Starting Moonbeam Test Node", async function () {
      this.timeout(SPAWNING_TIME);
      const init = await startMoonbeamNode(specFilename, provider);
      // Context is given prior to this assignement, so doing
      // context = init.context will fail because it replace the variable;
      context.web3 = init.context.web3;
      context.wsProvider = init.context.wsProvider;
      context.polkadotApi = init.context.polkadotApi;
    });

    cb(context);
  });
}
