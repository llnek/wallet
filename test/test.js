// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Copyright © 2022, Kenneth Leung. All rights reserved.

//;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
//original ideas and source from https://github.com/lhartikk/naivecoin
//;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

"use strict";

const bodyParser =require( "body-parser");
const express= require("express");

const BC= require( "./blockchain");
const P2P= require("./p2p");
const TX= require("./tx");
const WALL= require("./wallet");

//;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
const httpPort= parseInt(process.env.HTTP_PORT) || 3001;
const p2pPort= parseInt(process.env.P2P_PORT) || 6001;

//;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
function start(myHttpPort, BC, TX, WALL, P2P){
  const app = express();
  app.use(bodyParser.json());
  app.use((err, req, res, next)=>{
    if(err)
      res.status(400).send(err.message)
  });

  app.get("/block/:hash", (req, res)=>{
    res.send(_.find(BC.CHAIN(), {hash: req.params.hash}))
  });

  app.get("/blocks", (req, res)=>{
    res.send(BC.CHAIN())
  });

  app.get("/transaction/:id", (req, res)=>{
    res.send(BC.CHAIN().map(b=> b.data).flat().find(t=> t.id == req.params.id))
  });

  app.get("/address/:address", (req, res)=>{
    res.send({
      unspentTxOuts: TX.getUnspentRecs().filter(u=> u.address == req.params.address) })
  });

  app.get("/unspentRecs", (req, res)=>{
    res.send(TX.getUnspentRecs())
  });

  app.get("/listUnspent", (req, res)=>{
    res.send(WALL.listUnspent())
  });

  app.post("/mineRawBlock", (req, res)=>{
    if(!req.body.data){
      res.send("data parameter is missing")
    }else{
      let b= BC.genRawNextBlock(req.body.data);
      b? res.send(b): res.status(400).send("could not generate block")
    }
  });

  app.post("/mineBlock", (req, res)=>{
    let b = BC.genNextBlock();
    b? res.send(b): res.status(400).send("could not generate block")
  });

  app.get("/balance", (req, res)=>{
    res.send({balance: WALL.getAccountBalance() })
  });

  app.get("/address", (req, res)=>{
    res.send({address: WALL.getPublicFromWallet() })
  });

  app.post("/mineTx", (req, res)=>{
    const address = req.body.address;
    const amount = req.body.amount;
    try{
      res.send( WALL.genBlockWith(address, amount))
    }catch(e){
      console.log(e.message);
      res.status(400).send(e.message);
    }
  });

  app.post("/sendTx", (req, res)=>{
    try{
      let
        amount = req.body.amount,
        address = req.body.address;
      if(!address || !amount)
        throw Error('invalid address or amount');
      res.send( WALL.sendTx(address, amount));
    }catch (e){
      console.log(e.message);
      res.status(400).send(e.message);
    }
  });

  app.get("/txPool", (req, res)=>{
    res.send(TX.getTransactionPool())
  });

  app.get("/peers", (req, res)=>{
    res.send(P2P.getSockets().map(s=> s._socket.remoteAddress + ":" + s._socket.remotePort));
  });

  app.post("/peers/add", (req, res)=>{
    P2P.connect(req.body.peer);
    res.send();
  });

  app.get("/stop", (req, res)=>{
    res.send();
    process.exit();
  });

  app.listen(myHttpPort, ()=>{
    console.log('Listening http on port: ' + myHttpPort);
  });

  P2P.initServer(p2pPort);
}

start(httpPort, BC,TX,WALL.init(BC,TX,P2P), P2P);



