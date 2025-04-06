const { expect } = require("chai");
const { ethers } = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ValidatorPool", function () {
  let ValidatorPool, validatorPool, Inhxtoken, inhxToken;
  let owner, user1, user2;
  const initialSupply = ethers.parseEther("10000");
  const minStake = ethers.parseEther("5000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Déployer un inhxToken ERC20 fictif
    const InhxTokenFactory = await ethers.getContractFactory("InhxToken");
    inhxToken = await InhxTokenFactory.deploy();

    // Déployer ValidatorPool
    ValidatorPool = await ethers.getContractFactory("ValidatorPool");
    validatorPool = await ValidatorPool.deploy(inhxToken.target, minStake);

    // Distribuer des inhxTokens aux utilisateurs
    await inhxToken.transfer(user1.address, ethers.parseEther("10000"));
    await inhxToken.transfer(user2.address, ethers.parseEther("200"));
  });

  describe("Staking", function () {
    it("should allow user to stake above minStake and become validator", async function () {
      const stakeAmount = ethers.parseEther("5000");

      await inhxToken.connect(user1).approve(validatorPool.target, stakeAmount);
      await expect(validatorPool.connect(user1).stake(stakeAmount))
        .to.emit(validatorPool, "TokensStaked")
        .withArgs(user1.address, stakeAmount);

      const isVal = await validatorPool.isAuthorized(user1.address);
      expect(isVal).to.equal(true);

      const stake = await validatorPool.stakes(user1.address);
      expect(stake).to.equal(stakeAmount);
    });

    it("should not emit AddedToPool if stake is more than minStakeAmount", async function () {
      const amount = ethers.parseEther("6000");
      await inhxToken.connect(user1).approve(validatorPool.target, amount);

      await expect(validatorPool.connect(user1).stake(amount))
        .to.emit(validatorPool, "TokensStaked")
        .withArgs(user1.address, amount)
        .and.to.not.emit(validatorPool, "AddedToPool");
    });

    it("should not emit AddedToPool if stake > minStakeAmount", async function () {
      const overStake = ethers.parseEther("6000");
    
      await inhxToken.connect(user1).approve(validatorPool.target, overStake);
    
      await expect(validatorPool.connect(user1).stake(overStake))
        .to.emit(validatorPool, "TokensStaked")
        .withArgs(user1.address, overStake)
        .and.to.not.emit(validatorPool, "AddedToPool"); // ✅ le test important ici
    
      const isVal = await validatorPool.isAuthorized(user1.address);
      expect(isVal).to.equal(false); // car ce n’est pas exactement minStake
    });

    it("should revert if stake is below minimum", async function () {
      const lowAmount = ethers.parseEther("50");
      await inhxToken.connect(user1).approve(validatorPool.target, lowAmount);
      await expect(validatorPool.connect(user1).stake(lowAmount)).to.be.revertedWithCustomError(
        validatorPool,
        "DepositBelowMinimumRequired"
      );
    });

    it("should revert if already a validator", async function () {
      const amount = ethers.parseEther("5000");

      await inhxToken.connect(user1).approve(validatorPool.target, amount);
      await validatorPool.connect(user1).stake(amount);

      await inhxToken.connect(user1).approve(validatorPool.target, amount);
      await expect(validatorPool.connect(user1).stake(amount)).to.be.revertedWithCustomError(
        validatorPool,
        "ValidatorAlreadyInPool"
      );
    });

    it("should emit AddedToPool when stake equals minStakeAmount", async function () {
      const amount = ethers.parseEther("5000");

      await inhxToken.connect(user1).approve(validatorPool.target, amount);
      await expect(validatorPool.connect(user1).stake(amount))
        .to.emit(validatorPool, "AddedToPool")
        .withArgs(user1.address);
    });

    it("should not allow staking without prior approval", async function () {
      const amount = ethers.parseEther("5000");
      await expect(
        validatorPool.connect(user1).stake(amount)
      ).to.be.reverted; 
    });

  });

  describe("Withdraw", function () {
    it("should allow validator to withdraw and be removed from pool", async function () {
      const amount = ethers.parseEther("5000");

      await inhxToken.connect(user1).approve(validatorPool.target, amount);
      await validatorPool.connect(user1).stake(amount);

      const balanceBefore = await inhxToken.balanceOf(user1.address);
      await expect(validatorPool.connect(user1).withdraw())
        .to.emit(validatorPool, "TokensWithdrawn")
        .withArgs(user1.address, amount);

      const balanceAfter = await inhxToken.balanceOf(user1.address);
      expect(balanceAfter).to.be.above(balanceBefore);

      const isVal = await validatorPool.isAuthorized(user1.address);
      expect(isVal).to.equal(false);
    });

    it("should pass require check and withdraw if user has staked tokens", async function () {
      const amount = ethers.parseEther("5000");

      await inhxToken.connect(user1).approve(validatorPool.target, amount);
      await validatorPool.connect(user1).stake(amount);

      await expect(validatorPool.connect(user1).withdraw())
        .to.emit(validatorPool, "TokensWithdrawn");
    });


    it("should revert withdraw if user has no inhxTokens", async function () {
      await expect(validatorPool.connect(user1).withdraw()).to.be.revertedWithCustomError(
        validatorPool,
        "NoTokensToWithdraw"
      );
    });

    it("should reset stake to zero after withdraw", async function () {
      const amount = ethers.parseEther("5000");
      await inhxToken.connect(user1).approve(validatorPool.target, amount);
      await validatorPool.connect(user1).stake(amount);

      await validatorPool.connect(user1).withdraw();
      const stake = await validatorPool.stakes(user1.address);
      expect(stake).to.equal(0);
    });

    it("should emit both TokensWithdrawn and RemovedFromPool", async function () {
      const amount = ethers.parseEther("5000");
      await inhxToken.connect(user1).approve(validatorPool.target, amount);
      await validatorPool.connect(user1).stake(amount);

      await expect(validatorPool.connect(user1).withdraw())
        .to.emit(validatorPool, "TokensWithdrawn")
        .withArgs(user1.address, amount)
        .and.to.emit(validatorPool, "RemovedFromPool")
        .withArgs(user1.address);
    });

    it("should reduce contract balance after withdraw", async function () {
      const amount = ethers.parseEther("5000");
      await inhxToken.connect(user1).approve(validatorPool.target, amount);
      await validatorPool.connect(user1).stake(amount);

      const contractBalanceBefore = await inhxToken.balanceOf(validatorPool.target);
      await validatorPool.connect(user1).withdraw();
      const contractBalanceAfter = await inhxToken.balanceOf(validatorPool.target);
      expect(contractBalanceAfter).to.be.lt(contractBalanceBefore);
    });


  });

  describe("Admin Functions", function () {
    it("should allow owner to update min stake", async function () {
      const newMin = ethers.parseEther("250");
      await expect(validatorPool.connect(owner).updateMinStakeAmount(newMin))
        .to.emit(validatorPool, "MinStakeUpdated")
        .withArgs(newMin);

      expect(await validatorPool.minStakeAmount()).to.equal(newMin);
    });

    it("should not allow non-owner to update min stake", async function () {
      const newMin = ethers.parseEther("300");
      await expect(validatorPool.connect(user1).updateMinStakeAmount(newMin)).to.be.revertedWithCustomError(validatorPool, "OwnableUnauthorizedAccount").withArgs(user1.address);
    });

    it("should allow setting same minStake again", async function () {
      await expect(
        validatorPool.connect(owner).updateMinStakeAmount(minStake)
      ).to.emit(validatorPool, "MinStakeUpdated")
        .withArgs(minStake);
    });

    it("should allow setting minStake to zero (if allowed)", async function () {
      const zeroStake = ethers.parseEther("0");
      await expect(
        validatorPool.connect(owner).updateMinStakeAmount(zeroStake)
      ).to.emit(validatorPool, "MinStakeUpdated")
        .withArgs(zeroStake);
    });

    it("should update minStakeAmount correctly and emit event", async function () {
      const newMinStake = ethers.parseEther("7500");
      await expect(validatorPool.connect(owner).updateMinStakeAmount(newMinStake))
        .to.emit(validatorPool, "MinStakeUpdated")
        .withArgs(newMinStake);

      const currentMin = await validatorPool.minStakeAmount();
      expect(currentMin).to.equal(newMinStake); 
    });
  });

  describe("isAuthorized", function () {
    it("should return false for non-validator", async function () {
      const isVal = await validatorPool.isAuthorized(user1.address);
      expect(isVal).to.equal(false);
    });

    it("should return true for validator", async function () {
      const amount = ethers.parseEther("5000");
      await inhxToken.connect(user1).approve(validatorPool.target, amount);
      await validatorPool.connect(user1).stake(amount);

      const isVal = await validatorPool.isAuthorized(user1.address);
      expect(isVal).to.equal(true);
    });
  });


});
