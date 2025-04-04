const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("InhxToken Tests", function () {
  let inhxToken;
  let owner, addr1;
  // The initial supply minted to the owner is 1,000,000 tokens (in wei)
  const initialSupplyInhx = ethers.parseEther("1000000");

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();

    // Deploy the InhxToken contract
    const InhxTokenFactory = await ethers.getContractFactory("InhxToken");
    inhxToken = await InhxTokenFactory.deploy();
  });

  it("should assign the initial supply to the owner", async function () {
    expect(await inhxToken.balanceOf(owner.address)).to.equal(initialSupplyInhx);
  });

  it("should revert mint for a non-owner", async function () {
    await expect(
      inhxToken.connect(addr1).mint(addr1.address, ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(inhxToken, "OwnableUnauthorizedAccount");
  });

  it("should revert mint that exceeds MAX_SUPPLY", async function () {
    // The initial supply equals MAX_SUPPLY, so any further mint should revert
    await expect(inhxToken.mint(owner.address, ethers.parseEther("1")))
      .to.be.revertedWith("Max supply reached");
  });

  it("should allow token transfers when unpaused", async function () {
    // By default the contract is unpaused (unless _pause() is called in the constructor)
    await inhxToken.transfer(addr1.address, ethers.parseEther("10"));
    expect(await inhxToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
  });

  it("should prevent token transfers when paused", async function () {
    // Pause the contract using the owner account
    await inhxToken.pause();
    await expect(
      inhxToken.transfer(addr1.address, ethers.parseEther("10"))
    ).to.be.revertedWithCustomError(inhxToken, "EnforcedPause")
  });

  it("should allow transfers after unpausing", async function () {
    // Pause the contract...
    await inhxToken.pause();
    // ... then unpause it
    await inhxToken.unpause();
    await inhxToken.transfer(addr1.address, ethers.parseEther("10"));
    expect(await inhxToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
  });

  it("should only allow the owner to pause the contract", async function () {
    await expect(
      inhxToken.connect(addr1).pause()
    ).to.be.revertedWithCustomError(inhxToken, "OwnableUnauthorizedAccount");
  });

  it("should only allow the owner to unpause the contract", async function () {
    await inhxToken.pause();
    await expect(
      inhxToken.connect(addr1).unpause()
    ).to.be.revertedWithCustomError(inhxToken, "OwnableUnauthorizedAccount");
  });
});
