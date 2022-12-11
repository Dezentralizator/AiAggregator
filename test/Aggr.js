const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");


function newParams(nb_weights) {
  var array = [];
  for(i = 0; i < nb_weights; i++) {
      array[i] = 300000 + (Math.random() * 60000) | 0;
  }
  return array
}

function newWeights(nb_weights) {
var array = [];
for(i = 0; i < nb_weights; i++) {
    array[i] = Math.random() * 2 - 1;
}
return array
}


function signCompression(array) {
  var norm = 0
  var signs = [];
  for (let i = 0; i < array.length; i += 1) {
      norm += Math.pow(array[i], 2);
      signs[i] = Math.sign(array[i]) / 2 + 0.5
  }
  return [signs, (Math.sqrt(norm)* 600 / Math.sqrt(32)| 0) ]
}

function signsToInt(signs) {
  number = 0
  number1 = 0
  l = signs.length
  for (let i = 0; i < l; i += 1) {
      number += Math.pow(2,  l-i-1 ) * signs[i];

  }


  return number
}
initiator = newParams(32);
a = newWeights(32);
[sign, n] = signCompression(a);
nb = signsToInt(sign);



describe("AiAggregator", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAggregator() {
    const ONE_GWEI = 1_000_000_000;


    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const AI = await ethers.getContractFactory("Aggregator");
    const aggr = await AI.deploy();

   

    return { aggr,  owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);

      expect(await aggr.init(initiator)).not.to.be.reverted;
    });
    
    it("Should be possible to propose an update ", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);

      expect(await aggr.pushYourUpdate(nb, n )).not.to.be.reverted;
    });

    it("Should be possible to propose an update 10 times and create a Tau", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);
      let Normlist = [];
      for (let i = 0; i < 10; i += 1) {
      a1 = newWeights(32);
      [sign1, n1] = signCompression(a1);
      sign1 = signsToInt(sign1)
      Normlist[i] = n1
      expect(await aggr.pushYourUpdate(sign1, n1 )).not.to.be.reverted;
    }

    Normlist.sort();
    const value = (Normlist[8]+Normlist[9])/2 | 0;
    
    await aggr.setTauAndUpdate();
    expect(await aggr.currentTau()).to.be.equal(value);


    });

    it("Should be possible to propose an update 10 times and create a Tau and send an update", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);

      await aggr.init(initiator);

      let Normlist = [];
      let SignList = [];
      for (let i = 0; i < 10; i += 1) {
        a1 = newWeights(32);
        [sign1, n1] = signCompression(a1);
        SignList[i] = sign1;
        signup = signsToInt(sign1)

        Normlist[i] = n1;
      
        await aggr.pushYourUpdate(signup, n1 )
      }
      let NormList2 = Normlist.slice();
      NormList2.sort();
      const value = (NormList2[8]+NormList2[9])/2 | 0;
    
      await aggr.setTauAndUpdate();
      expect(await aggr.currentTau()).to.be.equal(value);

      for (let i = 0; i < Normlist.length; i += 1) {
        if (Normlist[i] > value){
          Normlist[i] = value;
        }
      }

      for(let i = 0; i < Normlist.length; i+=1){
        list = await aggr.normalVector(i);
        modifList = await aggr.normModifier(list, await aggr.currentTau());
      }

      for (let j = 0; j < 32; j +=1 ){
        let sum = 0;
          for (let i = 0; i < Normlist.length; i += 1) {
            sum += Normlist[i]*(((SignList[i][j])*2)-1) ;

          }
        initiator[j] += sum;
      }
      await expect(aggr.upgrade(initiator)).not.to.be.reverted;
    });
    it("After an update that is correct all verifiers should return true", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);

      await aggr.init(initiator);

      let Normlist = [];
      let SignList = [];
      for (let i = 0; i < 10; i += 1) {
        a1 = newWeights(32);
        [sign1, n1] = signCompression(a1);
        SignList[i] = sign1;
        signup = signsToInt(sign1)

        Normlist[i] = n1;
      
        await aggr.pushYourUpdate(signup, n1 )
      }
      let NormList2 = Normlist.slice();
      NormList2.sort();
      const value = (NormList2[8]+NormList2[9])/2 | 0;
    
      await aggr.setTauAndUpdate();
      expect(await aggr.currentTau()).to.be.equal(value);

      for (let i = 0; i < Normlist.length; i += 1) {
        if (Normlist[i] > value){
          Normlist[i] = value;
        }
      }

      for(let i = 0; i < Normlist.length; i+=1){
        list = await aggr.normalVector(i);
        modifList = await aggr.normModifier(list, await aggr.currentTau());
      }

      for (let j = 0; j < 32; j +=1 ){
        let sum = 0;
          for (let i = 0; i < Normlist.length; i += 1) {
            sum += Normlist[i]*(((SignList[i][j])*2)-1) ;

          }
        initiator[j] += sum;
      }
      await expect(aggr.upgrade(initiator)).not.to.be.reverted;
      for (let i = 0; i < 32; i +=1){
        await expect(await aggr.verifyLine(i)).to.be.equal(true);
      }
    });

    it("After an update that is fraudulent at least a verifier should return false", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);

      await aggr.init(initiator);

      let Normlist = [];
      let SignList = [];
      for (let i = 0; i < 10; i += 1) {
        a1 = newWeights(32);
        [sign1, n1] = signCompression(a1);
        SignList[i] = sign1;
        signup = signsToInt(sign1)

        Normlist[i] = n1;
      
        await aggr.pushYourUpdate(signup, n1 )
      }
      let NormList2 = Normlist.slice();
      NormList2.sort();
      const value = (NormList2[8]+NormList2[9])/2 | 0;
    
      await aggr.setTauAndUpdate();
      expect(await aggr.currentTau()).to.be.equal(value);

      for (let i = 0; i < Normlist.length; i += 1) {
        if (Normlist[i] > value){
          Normlist[i] = value;
        }
      }

      for(let i = 0; i < Normlist.length; i+=1){
        list = await aggr.normalVector(i);
        modifList = await aggr.normModifier(list, await aggr.currentTau());
      }

      for (let j = 0; j < 32; j +=1 ){
        let sum = 0;
          for (let i = 0; i < Normlist.length; i += 1) {
            sum += Normlist[i]*(((SignList[i][j])*2)-1) ;

          }
        initiator[j] += sum;
      }
      initiator[15] +=1;
      await expect(aggr.upgrade(initiator)).not.to.be.reverted;
      let counter = 0;
      for (let i = 0; i < 32; i +=1){  
        if(!await aggr.verifyLine(i)) counter++;
      }
      expect(counter).to.be.above(0);
    });
    it("After an update that is fraudulent at least a verifier should return false, and it can be corrected", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);

      await aggr.init(initiator);

      let Normlist = [];
      let SignList = [];
      for (let i = 0; i < 10; i += 1) {
        a1 = newWeights(32);
        [sign1, n1] = signCompression(a1);
        SignList[i] = sign1;
        signup = signsToInt(sign1)

        Normlist[i] = n1;
      
        await aggr.pushYourUpdate(signup, n1 )
      }
      let NormList2 = Normlist.slice();
      NormList2.sort();
      const value = (NormList2[8]+NormList2[9])/2 | 0;
    
      await aggr.setTauAndUpdate();
      expect(await aggr.currentTau()).to.be.equal(value);

      for (let i = 0; i < Normlist.length; i += 1) {
        if (Normlist[i] > value){
          Normlist[i] = value;
        }
      }

      for(let i = 0; i < Normlist.length; i+=1){
        list = await aggr.normalVector(i);
        modifList = await aggr.normModifier(list, await aggr.currentTau());
      }

      for (let j = 0; j < 32; j +=1 ){
        let sum = 0;
          for (let i = 0; i < Normlist.length; i += 1) {
            sum += Normlist[i]*(((SignList[i][j])*2)-1) ;

          }
        initiator[j] += sum;
      }
      initiator[15] +=1;
      await aggr.upgrade(initiator);
      let counter = 0;
      for (let i = 0; i < 32; i +=1){  
        if(!await aggr.verifyLine(i)) {counter = i};
      }

      initiator[15] -=1;
      await aggr.claimError(counter,initiator)
    });

    it("After an update that is fraudulent at least a verifier should return false, and it can be corrected and verifier now return true", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);

      await aggr.init(initiator);

      let Normlist = [];
      let SignList = [];
      for (let i = 0; i < 10; i += 1) {
        a1 = newWeights(32);
        [sign1, n1] = signCompression(a1);
        SignList[i] = sign1;
        signup = signsToInt(sign1)

        Normlist[i] = n1;
      
        await aggr.pushYourUpdate(signup, n1 )
      }
      let NormList2 = Normlist.slice();
      NormList2.sort();
      const value = (NormList2[8]+NormList2[9])/2 | 0;
    
      await aggr.setTauAndUpdate();
      expect(await aggr.currentTau()).to.be.equal(value);

      for (let i = 0; i < Normlist.length; i += 1) {
        if (Normlist[i] > value){
          Normlist[i] = value;
        }
      }

      for(let i = 0; i < Normlist.length; i+=1){
        list = await aggr.normalVector(i);
        modifList = await aggr.normModifier(list, await aggr.currentTau());
      }

      for (let j = 0; j < 32; j +=1 ){
        let sum = 0;
          for (let i = 0; i < Normlist.length; i += 1) {
            sum += Normlist[i]*(((SignList[i][j])*2)-1) ;

          }
        initiator[j] += sum;
      }
      initiator[15] +=1;
      await aggr.upgrade(initiator);
      let counter = 0;
      for (let i = 0; i < 32; i +=1){  
        if(!await aggr.verifyLine(i)) {counter = i};
      }

      initiator[15] -=1;
      await aggr.claimError(counter, initiator)
      console.log(await aggr.getParamLength())
      for (let i = 0; i < 32; i +=1){
        expect(await aggr.verifyLine(i)).to.be.equal(true);
      }
    });
  });
});





i-1