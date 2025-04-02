const {assert, expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Tests de InhxToken", function () {
  
  let inhxToken;
  let owner, addr1;
  const initialSupplyInhx = ethers.parseEther("1000000");

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();

    // Déploiement d'InhxToken
    const InhxTokenFactory = await ethers.getContractFactory("InhxToken");
    inhxToken = await InhxTokenFactory.deploy();


  });

  it("doit attribuer l'offre initiale au owner (InhxToken)", async function () {
    expect(await inhxToken.balanceOf(owner.address)).to.equal(initialSupplyInhx);
  });

  it("doit refuser le mint pour un non-owner (InhxToken)", async function () {
    await expect(
      inhxToken.connect(addr1).mint(addr1.address, ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(inhxToken, "OwnableUnauthorizedAccount").withArgs(addr1.address);
  });

  it("doit refuser un mint qui dépasserait le MAX_SUPPLY (InhxToken)", async function () {
    // L'offre initiale atteint déjà le MAX_SUPPLY
    await expect(inhxToken.mint(owner.address, ethers.parseEther("1")))
      .to.be.revertedWith("Max supply reached");
  });

});
