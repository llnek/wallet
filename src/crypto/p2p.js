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

;(function(gscope,UNDEF){

  //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
  //original ideas and source from https://github.com/lhartikk/naivecoin
  //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

  "use strict";

  /**Create the module.
  */
  function _module(Core, WebSocket){

    /**
     * @module mcfud/crypto/p2p
     */

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const {Server}= WebSocket;
    const { is,u:_ }=Core;
    const _sockets = [];

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function SOCS_ADD(s){ return _sockets.push(s)>0 }
    function SOCS(){ return _sockets }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const MsgType={
      QUERY_LATEST: 0,
      QUERY_ALL: 1,
      QUERY_TXPOOL: 2,
      RESPONSE_TXPOOL: 4,
      RESPONSE_BLOCKCHAIN: 8
    };

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const QueryTransactionPoolMsg = {
      type: MsgType.QUERY_TXPOOL
    };
    const QueryChainLengthMsg={
      type: MsgType.QUERY_LATEST
    };
    const QueryAllMsg={
      type: MsgType.QUERY_ALL
    };
    const ResponseLatestMsg=(arg)=>({
      type: MsgType.BLOCKCHAIN,
      data: JSON.stringify([arg])
    });
    const ResponseChainMsg=(arg)=>({
      type: MsgType.BLOCKCHAIN,
      data: JSON.stringify(arg)
    });
    const ResponseTxPoolMsg =(arg)=> ({
      type: MsgType.RESPONSE_TXPOOL,
      data: JSON.stringify(arg)
    });

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function JSONToObject(data){
      try{ return JSON.parse(data) }catch(e){ console.error(e) } }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function writeMsg(ws, msg){ ws && ws.send(JSON.stringify(msg)) }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function cfgMessageHandler(ws,bcObj,txObj){
      ws.on("message", (msg)=>{
        const obj= JSONToObject(msg);
        if(!obj){
          console.log(`could not parse JSON message: ${msg}`)
        }else{
          console.log(`got json-message ${JSON.stringify(obj)}`);
          switch(obj.type){
            case MsgType.QUERY_LATEST:
              writeMsg(ws, ResponseLatestMsg(bcObj.tailChain()));
              break;
            case MsgType.QUERY_ALL:
              writeMsg(ws, ResponseChainMsg(bcObj.CHAIN()));
              break;
            case MsgType.RESPONSE_BLOCKCHAIN:
              if(1){
                let r= JSONToObject(obj.data);
                if(r){
                  handleUpdates(r,bcObj)
                }else{
                  console.log("invalid blocks received")
                }
              }
              break;
            case MsgType.QUERY_TXPOOL:
              writeMsg(ws, ResponseTxPoolMsg(txObj.getTxPool()));
              break;
            case MsgType.RESPONSE_TXPOOL:
              if(1){
                let txs= JSONToObject(obj.data);
                if(!txs)
                  console.log("invalid transaction received");
                if(txs)
                  txs.forEach(t=>{
                    try{
                      txObj.handleReceivedTx(t);
                      _$.bcastTxPool();
                    }catch (e){
                      console.error(e.message)
                    }
                  });
              }
              break;
          }
        }
      })
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function broadcast(msg){
      _sockets.forEach(s=> writeMsg(s, msg))
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function cfgErrorHandler(ws){
      let closeConnection = (w)=>{
        console.log(`connection failed to peer: ${w.url}`);
        _.disj(_sockets,w)
      };
      ws.on("close", ()=> closeConnection(ws));
      ws.on("error", ()=> closeConnection(ws));
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function handleUpdates(newBlocks,bcObj){
      if(newBlocks.length == 0)
        return console.log("received block chain size of 0");
      let latest= newBlocks.at(-1);
      if(!bcObj.isValidBlockShape(latest))
        return console.log("block structuture not valid");
      let curLast= bcObj.tailChain();
      if(latest.index > curLast.index){
        console.log(`last-index: ${curLast.index}, peer-last-index: ${latest.index}`);
        if(curLast.hash == latest.prev){
          if(bcObj.addBlockToChain(latest))
            broadcast(ResponseLatestMsg(bcObj.tailChain()))
        }else if(newBlocks.length == 1){
          console.log("have to query the chain from our peer");
          broadcast(QueryAllMsg);
        }else{
          console.log("blockchain is longer than current blockchain");
          bcObj.replaceChain(newBlocks);
        }
      }else{
        console.log("received blockchain is shorter. Do nothing")
      }
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    //MODULE EXPORT
    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const _$={
      initServer(p2pPort){
        let s= new WebSocket.Server({port: p2pPort});
        s.on("connection", ws=> this.cfgConnection(ws));
        console.log(`listening websocket p2p port on: ${p2pPort}`);
      },
      getSockets(){ return _sockets},
      connect(addr){
        let ws= new WebSocket(addr);
        ws.on("open", ()=> this.cfgConnection(ws));
        ws.on("error", ()=> console.error('connection failed'));
      },
      cfgConnection(ws){
        SOCS_ADD(ws);
        cfgMessageHandler(ws, this.bcObj, this.txObj);
        cfgErrorHandler(ws);
        writeMsg(ws, QueryChainLengthMsg);
      },
      onBCLatest(arg){
        console.log("send changes to peers");
        broadcast(ResponseLatestMsg(arg));
      },
      onTxPool(arg){
        console.log("send tx-pool to peers");
        broadcast(ResponseTxPoolMsg(arg));
      },
      init(BC,TX,evt){
        this.evtMsg=evt;
        this.bcObj=BC;
        this.txObj=TX;
        evt.sub(["bc.latest"], "onBCLatest",this);
        evt.sub(["tx.pool"], "onTxPool",this);
      }
    };

    return _$;
  }
  //export--------------------------------------------------------------------
  if(typeof module == "object" && module.exports){
    module.exports=_module(require("../main/core"), require("ws"));
  }else{
  }

})(this);


