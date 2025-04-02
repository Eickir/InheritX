const {assert, expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Tests de MockUsdtToken", function () {
  let inhxToken, mockUsdtToken;
  let owner, addr1;
  const initialSupplyUsdt = ethers.parseEther("2000000");

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();

    // Déploiement de MockUsdtToken
    const MockUsdtTokenFactory = await ethers.getContractFactory("MockUsdtToken");
    mockUsdtToken = await MockUsdtTokenFactory.deploy();

  });

  it("doit attribuer l'offre initiale au owner (MockUsdtToken)", async function () {
    expect(await mockUsdtToken.balanceOf(owner.address)).to.equal(initialSupplyUsdt);
  });

  it("doit refuser le mint pour un non-owner (MockUsdtToken)", async function () {
    await expect(
      mockUsdtToken.connect(addr1).mint(addr1.address, ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(mockUsdtToken, "OwnableUnauthorizedAccount").withArgs(addr1.address);
  });

  it("doit permettre au owner de mint tant que MAX_SUPPLY n'est pas dépassé", async function () {
    const amount = ethers.parseEther("1000");
    await mockUsdtToken.mint(owner.address, amount);
  
    const newBalance = await mockUsdtToken.balanceOf(owner.address);
    expect(newBalance).to.equal(initialSupplyUsdt + amount);
  });

  it("doit refuser un mint qui dépasserait le MAX_SUPPLY (MockUsdtToken)", async function () {
    const maxSupply = ethers.parseEther("1000000000000"); // BigInt
    const currentSupply = await mockUsdtToken.totalSupply(); // BigInt
    const amountToMint = maxSupply - currentSupply + ethers.parseEther("1");    
    await expect(mockUsdtToken.mint(owner.address, amountToMint))
      .to.be.revertedWith("Max supply reached");
  });
});
