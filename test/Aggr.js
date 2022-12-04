const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

function newParams(nb_weights) {
  var array = [];
  for(i = 0; i < nb_weights; i++) {
      array[i] = (Math.random() * 60000) | 0;
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
  return [signs, (Math.sqrt(norm)* 60000 / Math.sqrt(32)| 0) ]
}

function signsToInt(signs) {
  number = 0
  l = signs.length
  for (let i = 0; i < l; i += 1) {
      number += Math.pow(2, l - i - 1) * signs[i];
  }
  return number
}
initiator = newParams(32);
a = newWeights(32);
[sign, n] = signCompression(a);
nb = signsToInt(sign);


console.log(a);
console.log(sign);
console.log(nb);
console.log(n);

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

    function newParams(nb_weights) {
    var array = [];
    for(i = 0; i < nb_weights; i++) {
        array[i] = (Math.random() * 60000) | 0;
    }
    return array
}

    return { aggr,  owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);

      expect(await aggr.init(initiator)).not.to.be.reverted;
    });
    
    it("Should be possible to propose an update update", async function () {
      const { aggr, owner } = await loadFixture(deployAggregator);

      expect(await aggr.pushYourUpdate(sign, n )).not.to.be.reverted;
    });
  });
});





