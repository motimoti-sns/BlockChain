// EXPRESS関連
import express from 'express';
import bodyParser from 'body-parser';
import {check, validationResult} from 'express-validator';
const app = express();
app.use(express.json({limit: '100mb'}));
app.use(bodyParser.json());

// IOTA関連
import {composeAPI} from '@iota/core';
import {extractJson} from '@iota/extract-json';
import * as Converter from '@iota/converter';
import * as crypto from 'crypto';


import secureRandom from 'secure-random';
import {ec} from 'elliptic';
// eslint-disable-next-line new-cap
const ecdsa = new ec('secp256k1');

const iota = composeAPI({provider: 'http://localhost:14265',});

const depth = 5;
const minimumWeightMagnitude = 5;
const securityLevel = 2;

// eslint-disable-next-line max-len
const seed ='PUEOTSEITFEVEWCWBTSIZM9NKRGJEIMXTULBACGFRQK9IMGICLBKW9TTEVSDQMGWKBXPVCBMMCXWMNPDX';
var address;
getAddress(seed, 1).then(function(ret_address){
  address = ret_address;
});
const keypair = createKeyPair();

/* 2. listen()メソッドを実行して4001番ポートで待ち受け。*/
const serverPortNumber = 4001
const server = app.listen(serverPortNumber, () => {
  console.log("Node.js is listening to PORT:" + serverPortNumber);
});


// IOTA関連関数
function preparTransferMessage(address: string, data): Array<{
  value: number,
  address: string,
  message: string
}> {
  // Define a message to send.
  // This message must include only ASCII characters.
  const message = JSON.stringify(data);

  // Convert the message to trytes
  const messageInTrytes = Converter.asciiToTrytes(message);

  // Define a zero-value transaction object
  // that sends the message to the address
  return [
    {
      "value": 0,
      "address": address,
      "message": messageInTrytes
    }
  ];
}

type payload<data> =  {node: typeof iota; address: string, data: data;}

function writeToTangle<payloadData>(payload: payload<payloadData>, callBack?: (bundleHash: string, addressHash: string) => void) {
  const targetNode = payload.node;
  const address = payload.address;

  const transfers = preparTransferMessage(address, payload.data);
  targetNode.prepareTransfers(seed, transfers)
      .then(trytes => {
          return targetNode.sendTrytes(trytes, depth, minimumWeightMagnitude);
      })
      .then(bundle => {
          const bundle_hash = bundle[0].hash;// このハッシュ値をデータベースに書き込む
          console.log(bundle_hash + " <- transaction hash- ");
          if (callBack) {
              callBack(bundle[0].hash as string, bundle[0].address as string)
          }
      })
      .catch(err => {
          console.log(err);
      })
}

// test API
app.get("/api/test", (req, res, next) => {
    res.json({"result": "OK"});
    writeToTangle<{msg: string}>({node: iota, address:address, data: {msg: 'test'}},)
});

app.post("/api/post", [
  check("user_id").isInt(),
  check("previous_hash").isString(),
  check("hash").isString(),
  check("index").isInt(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  if (req.body) {
    const data = {
      user_id: req.body.user_id as number,
      previous_hash: req.body.previous_hash as string,
      hash: req.body.hash as string,
      index: req.body.index as number
    }
    console.log(data)
    writeToTangle<{
      user_id: number,
      previous_hash: string,
      hash: string,
      index: number
    }>({node: iota, address:address, data: data})
  }
})

async function getAddress(seed: string, index: number) {
    let newAddress = await iota.getNewAddress(seed, { index: index, security: securityLevel, total: 1 });
    return newAddress[0];
}

function createKeyPair() {
  const max = Buffer.from(
      "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140",
      "hex"
  );
  let isInvalid = true;
  let privateKey;

  while (isInvalid) {
      let privateKeySeed = secureRandom.randomBuffer(32);
      if (Buffer.compare(max, privateKeySeed) === 1) {
          isInvalid = false;
      }
      privateKey = privateKeySeed.toString("hex");
  }

  const keys = ecdsa.keyFromPrivate(privateKey);
  const publicKey = keys.getPublic("hex");

  return ({"privateKey":privateKey, "publicKey":publicKey});
}

function createSignature(message, privateKey) {
  const privateKeyPair = ecdsa.keyFromPrivate(privateKey);
  const signature = ecdsa.sign(message, privateKeyPair).toDER('hex'); //ハッシュされたメッセージに対して秘密鍵で電子署名する。
  return signature;
}

function verifySignature(message, publicKey, signature) {
  const publicKeyPair = ecdsa.keyFromPublic(publicKey, 'hex'); // 公開鍵で電子署名の真正を確認。
  const isVerified = publicKeyPair.verify(message, signature);
  return isVerified;
}

function stackHash(previous_hash, current_hash) {
  return crypto.createHash('sha256').update(previous_hash + current_hash).digest('hex');
}
