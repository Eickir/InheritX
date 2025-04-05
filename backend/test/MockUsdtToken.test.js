const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("musdtToken Tests", function () {
  let musdtToken;
  let owner, addr1;
  // The initial supply minted to the owner is 1,000,000 tokens (in wei)
  const initialSupplyMusdt = ethers.parseEther("1000000");

  beforeEach(async () => {
    [owner, addr1] = await ethers.getSigners();

    // Deploy the musdtToken contract
    const musdtTokenFactory = await ethers.getContractFactory("MockUsdtToken");
    musdtToken = await musdtTokenFactory.deploy();
  });

  it("should assign the initial supply to the owner", async function () {
    expect(await musdtToken.balanceOf(owner.address)).to.equal(initialSupplyMusdt);
  });

  it("should revert mint for a non-owner", async function () {
    await expect(
      musdtToken.connect(addr1).mint(addr1.address, ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(musdtToken, "OwnableUnauthorizedAccount");
  });

  it("should revert mint that exceeds MAX_SUPPLY", async function () {
    // The initial supply equals MAX_SUPPLY, so any further mint should revert with custom error MaxSupplyReached
    await expect(musdtToken.mint(owner.address, ethers.parseEther("1")))
      .to.be.revertedWithCustomError(musdtToken, "MaxSupplyReached");
  });

  it("should allow token transfers when unpaused", async function () {
    // By default the contract is unpaused
    await musdtToken.transfer(addr1.address, ethers.parseEther("10"));
    expect(await musdtToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
  });

  it("should prevent token transfers when paused", async function () {
    // Pause the contract using the owner account
    await musdtToken.pause();
    await expect(
      musdtToken.transfer(addr1.address, ethers.parseEther("10"))
    ).to.be.revertedWithCustomError(musdtToken, "EnforcedPause");
  });

  it("should allow transfers after unpausing", async function () {
    // Pause the contract then unpause it
    await musdtToken.pause();
    await musdtToken.unpause();
    await musdtToken.transfer(addr1.address, ethers.parseEther("10"));
    expect(await musdtToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
  });

  it("should only allow the owner to pause the contract", async function () {
    await expect(
      musdtToken.connect(addr1).pause()
    ).to.be.revertedWithCustomError(musdtToken, "OwnableUnauthorizedAccount");
  });

  it("should only allow the owner to unpause the contract", async function () {
    await musdtToken.pause();
    await expect(
      musdtToken.connect(addr1).unpause()
    ).to.be.revertedWithCustomError(musdtToken, "OwnableUnauthorizedAccount");
  });

  // Tests for finishMinting functionality
  it("should allow the owner to finish minting", async function () {
    await musdtToken.finishMinting();
    // After finishMinting, any attempt to mint should revert with custom error MintingFinished
    await expect(
      musdtToken.mint(owner.address, ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(musdtToken, "MintingFinished");
  });

  it("should revert finishMinting when called by a non-owner", async function () {
    await expect(
      musdtToken.connect(addr1).finishMinting()
    ).to.be.revertedWithCustomError(musdtToken, "OwnableUnauthorizedAccount");
  });

  it("should revert direct Ether transfers with EtherNotAccepted error", async function () {
    await expect(
      owner.sendTransaction({ to: musdtToken.target, value: ethers.parseEther("1") })
    ).to.be.reverted;
  });

  it("should revert calls to non-existent functions with EtherNotAccepted error", async function () {
    await expect(
      owner.sendTransaction({ to: musdtToken.target, data: "0x12345678" })
    ).to.be.reverted;
  });
});
