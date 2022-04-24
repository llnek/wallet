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
  function _module(Core, CryptoJS){


    /**
     * @module mcfud/crypto/blockchain
     */

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function CHAIN(pos){ return is.num(pos) ? _blockChainDB.at(pos) : _blockChainDB }
    function CHAIN_ADD(b){ return _blockChainDB.push(b)>0 }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const TS1=Date.parse("01 Jan 2001 00:00:00 GMT");
    const _blockChainDB= [];
    const { is,u:_ }=Core;

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const
      DIFFICULTY_ADJUSTMENT_BLOCKS= 10,
      BLOCK_GEN_INTERVAL_SECS= 10;

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function calcAdjDifficulty(e){
      let
        prev = CHAIN(-DIFFICULTY_ADJUSTMENT_BLOCKS),
        {difficulty}=prev.POW,
        diff = e.ts - prev.ts,
        expected = BLOCK_GEN_INTERVAL_SECS*1000 * DIFFICULTY_ADJUSTMENT_BLOCKS;
      return (diff < expected/2)? (difficulty+1)
                                : (diff > expected*2)? (difficulty-1) : difficulty
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function calcDifficulty(){
      let e= CHAIN(-1);
      return (e.index != 0 &&
              e.index % DIFFICULTY_ADJUSTMENT_BLOCKS == 0)?
        calcAdjDifficulty(e) : e.POW.difficulty;
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function* genBlock(index, prev, ts, data, difficulty){
      for(let v,hash,nonce=0; !v; ++nonce){
        hash = calcHash(index, prev, ts, data, difficulty, nonce);
        v=hashMatchesDifficulty(hash, difficulty)?
          Block(ts,index, data, hash, prev, {nonce, difficulty}) : UNDEF;
        yield v;
      }
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function mineBlock(index, prev, ts, data, difficulty){
      for(let v,hash,nonce=0; ;++nonce){
        hash = calcHash(index, prev, ts, data, difficulty, nonce);
        //console.log("hash==="+hash)
        if(hashMatchesDifficulty(hash, difficulty))
          return Block(ts,index, data, hash, prev, {nonce, difficulty})
      }
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function calcHashForBlock(b){
      let {nonce,difficulty}=b.POW;
      return calcHash(b.index, b.prev, b.ts, b.data, difficulty, nonce)
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function addBlock(b){
      if(_$.isValidNewBlock(b, CHAIN(-1))){
        CHAIN_ADD(b)
      }
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function calcTotalDifficulty(bc){
      if(!bc)
        bc= CHAIN();
      return bc.reduce((acc,b)=>{
        return acc + Math.pow(2,b.POW.difficulty)
      },0)
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function isValidTS(b, prev){
      const ONE_MIN=60*1000;
      return (prev.ts - ONE_MIN) < b.ts && (b.ts - ONE_MIN) < _.now()
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function hasValidHash(b){
      let {difficulty}=b.POW;
      if(!hashMatchesContent(b)){
        console.log(`invalid hash, got: ${b.hash}`);
        return false;
      }
      if(!hashMatchesDifficulty(b.hash, difficulty)){
        console.log(`block difficulty error, expected: ${difficulty} got: ${b.hash}`);
      }
      return true;
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function hashMatchesContent(b){
      return calcHashForBlock(b) == b.hash
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function hashMatchesDifficulty(hash, difficulty){
      return _.hexToBin(hash).startsWith("0".repeat(difficulty))
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function isValidRoot(b){
      let r=CHAIN(0);
      return r.ts == b.ts &&
             r.index==b.index &&
             r.hash==b.hash &&
             r.prev==b.prev &&
             r.POW.nonce==b.POW.nonce &&
             r.POW.difficulty==b.POW.difficulty &&
             r.data.toString()==b.data.toString()
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function calcHash(index, prev, ts, data, difficulty, nonce){
      return CryptoJS.SHA256("" + index + prev + ts + data.toString() + difficulty + nonce).toString()
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function Block(ts,index,data,hash,prev,pow){
      return{ ts,index, data, hash, prev, POW: _.inject({}, pow) }
    }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    function POW(nonce=0,difficulty=0){ return {nonce, difficulty} }

    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    //MODULE EXPORT
    //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
    const _$={
      DIFFICULTY_ADJUSTMENT_BLOCKS,
      BLOCK_GEN_INTERVAL_SECS,
      blockChainDB: UNDEF,
      calcTotalDifficulty,
      CHAIN,
      CHAIN_ADD,
      /**Get the next block index.
       * @memberof module:mcfud/crypto/blockchain
       * @return {number}
       */
      nextIndex(){
        return CHAIN(-1).index+1
      },
      /**
       * @memberof module:mcfud/crypto/blockchain
       * @return {string}
       */
      serialize(){
        return JSON.stringify(_blockChainDB)
      },
      /**Get the block data.
       * @memberof module:mcfud/crypto/blockchain
       * @param {number} pos
       * @return {any}
       */
      getDataOf(pos){
        let c= CHAIN(pos);
        return c? c.data : UNDEF;
      },
      /**Get the chain, READONLY please.
       * @memberof module:mcfud/crypto/blockchain
       * @return {Block[]}
       */
      //getChain(){ return _blockChainDB },
      /**Get the first block in the chain.
       * @memberof module:mcfud/crypto/blockchain
       * @return {Block}
       */
      headChain(){ return _blockChainDB[0] },
      /**Get the last block in the chain.
       * @memberof module:mcfud/crypto/blockchain
       * @return {Block}
       */
      tailChain(){ return _.last(_blockChainDB) },
      /**Check if block zero is correct.
       * @memberof module:mcfud/crypto/blockchain
       * @param {Block[]} b
       * @param {boolean}
       */
      ensureRoot(b){
        return isValidRoot(b)
      },
      /**Create a new block using generator (async).
       * @memberof module:mcfud/crypto/blockchain
       * @param {any} data
       * @param {function} cb
       */
      genNextBlockAsync(data, cb){
        let
          diff = calcDifficulty(),
          prev = _.last(_blockChainDB),
          gen= genBlock(prev.index+1, prev.hash, _.now(), data, diff);
        function func(){
          let b= gen.next().value;
          if(b){
            addBlock(b);
            _$.bcastChanges();
            if(cb) cb(b);
          }else{
            setTimeout(func,0)
          }
        }
        setTimeout(func,0);
      },
      /**Create a new block.
       * @memberof module:mcfud/crypto/blockchain
       * @param {any} data
       * @return {Block}
       */
      genNextBlock(data){
        let
          diff = calcDifficulty(),
          prev = _.last(_blockChainDB),
          b= mineBlock(prev.index+1, prev.hash, _.now(), data, diff);
        addBlock(b);
        this.bcastChanges();
        return b;
      },
      /**Check if the block is kosher.
       * @memberof module:mcfud/crypto/blockchain
       * @param {Block} b
       * @return {boolean}
       */
      isValidBlockShape(b){
        return is.num(b.index) &&
               is.str(b.hash) &&
               is.str(b.prev) &&
               is.num(b.ts) && _.echt(b.data)
      },
      /**Add this block to the chain.
       * @memberof module:mcfud/crypto/blockchain
       * @param {Block} b
       * @return {boolean}
       */
      addBlockToChain(b){
        if(this.isValidNewBlock(b, _.last(_blockChainDB))){
          return CHAIN_ADD(b)
        }
      },
      /**Check if this is a valid new block.
       * @memberof module:mcfud/crypto/blockchain
       * @param {Block} b
       * @param {Block} prev
       * @return {boolean}
       */
      isValidNewBlock(b, prev){
        let msg;
        if(!this.isValidBlockShape(b)){
          msg="invalid structure";
        }
        else if(prev.index+1 != b.index){
          msg="invalid index";
        }
        else if(prev.hash != b.prev){
          msg="invalid previous hash";
        }
        else if(!isValidTS(b, prev)){
          msg="invalid timestamp";
        }
        if(msg)
          console.log(msg);
        return msg?false: hasValidHash(b);
      },
      isValidChain(bc){
        for(let i= 0; i< bc.length; ++i){
          if(i==0){
            if(!isValidRoot(bc[i]))
            return false;
          }else if(!this.isValidNewBlock(bc[i], bc[i-1])){
            return false
          }
        }
        return true;
      },
      /**Replace with this chain.
       * @memberof module:mcfud/crypto/blockchain
       * @param {Block[]} bc
       */
      replaceChain(bc){
        if(this.isValidChain(bc) &&
           calcTotalDifficulty(bc) >= calcTotalDifficulty()){
          console.log('Replacing blockchain with updated blockchain');
          this.resetChain(bc);
        }else{
          console.log('Received invalid blockchain');
        }
      },
      resetChain(bc){
        _.append(_blockChainDB,bc,true);
        this.bcastChanges();
      },
      bcastChanges(){
        this.evtMsg.pub(["bc.latest"], CHAIN(-1))
      },
      genRawNextBlock(data){
        let
          prev= this.tailChain(),
          difficulty= getDifficulty(),
          nx= prev.index + 1,
          b= mineBlock(nx, prev.hash, _.now(), data, difficulty);
        if(this.addBlockToChain(b)){
          this.bcastChanges();
          return b;
        }
      },
      init(ext, evt){
        if(ext){ ext.lift(this) }
        let data= this.genRoot();
        this.evtMgr=evt;
        _blockChainDB[0]= Block(TS1,0, data, calcHash(0,"",TS1, data,0,0),"", POW());
        return this;
      },
      genRoot(){ return "Beware: Money is the root of all evil!" }
    };

    return _$;
  }

  //export--------------------------------------------------------------------
  if(typeof module == "object" && module.exports){
    module.exports=_module(require("../main/core"),
                           require("crypto-js"));
  }else{
    gscope["io/czlab/mcfud/crypto/blockchain"]=_module
  }

})(this);


