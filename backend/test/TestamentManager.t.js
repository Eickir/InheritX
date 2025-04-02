const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TestamentManager", function () {
  let testamentManager, validatorPool, paymentToken;
  let owner, user, validator, otherUser;

  beforeEach(async () => {
    [owner, user, validator, otherUser] = await ethers.getSigners();

    const PaymentToken = await ethers.getContractFactory("ERC20Mock");
    paymentToken = await PaymentToken.deploy("MockToken", "MTK", user.address, ethers.utils.parseEther("1000"));

    const ValidatorPool = await ethers.getContractFactory("ValidatorPoolMock");
    validatorPool = await ValidatorPool.deploy([validator.address]);

    const TestamentManager = await ethers.getContractFactory("TestamentManager");
    testamentManager = await TestamentManager.deploy(validatorPool.address, paymentToken.address);

    // Approve TestamentManager to spend user's tokens
    await paymentToken.connect(user).approve(testamentManager.address, ethers.utils.parseEther("1000"));
  });

  describe("depositTestament", function () {
    it("should deposit a new testament", async function () {
      const cid = "Qm123";
      const decryptionKey = "secret";
      const amount = ethers.utils.parseEther("10");

      await expect(
        testamentManager.connect(user).depositTestament(cid, decryptionKey, amount)
      )
        .to.emit(testamentManager, "TestamentDeposited")
        .withArgs(user.address, cid);

      const testament = await testamentManager.getTestament(user.address);
      expect(testament.cid).to.equal(cid);
      expect(testament.decryptionKey).to.equal(decryptionKey);
      expect(testament.validity).to.equal(0); // Active
      expect(testament.status).to.equal(0);   // Pending
    });

    it("should mark previous testament as outdated", async function () {
      const amount = ethers.utils.parseEther("10");

      await testamentManager.connect(user).depositTestament("CID1", "KEY1", amount);
      await expect(
        testamentManager.connect(user).depositTestament("CID2", "KEY2", amount)
      ).to.emit(testamentManager, "TestamentOutdated");
    });

    it("should fail if user has not enough token", async function () {
      const lowUser = otherUser;
      await expect(
        testamentManager.connect(lowUser).depositTestament("CID", "KEY", ethers.utils.parseEther("1"))
      ).to.be.revertedWithCustomError(testamentManager, "HasNotEnoughToken");
    });
  });

  describe("approveTestament", function () {
    it("should approve testament and mint NFT", async function () {
      const cid = "QmTest";
      const decryptionKey = "secret";
      const amount = ethers.utils.parseEther("10");

      await testamentManager.connect(user).depositTestament(cid, decryptionKey, amount);

      await expect(
        testamentManager.connect(owner).approveTestament(validator.address, user.address)
      )
        .to.emit(testamentManager, "TestamentApproved")
        .withArgs(user.address, cid);

      const testament = await testamentManager.getTestament(user.address);
      expect(testament.status).to.equal(2); // Approved
    });

    it("should reject testament correctly", async function () {
      const cid = "QmTest";
      const amount = ethers.utils.parseEther("10");

      await testamentManager.connect(user).depositTestament(cid, "secret", amount);

      await expect(
        testamentManager.connect(owner).rejectTestament(validator.address, user.address)
      )
        .to.emit(testamentManager, "TestamentRejected")
        .withArgs(user.address, cid);

      const testament = await testamentManager.getTestament(user.address);
      expect(testament.status).to.equal(1); // Rejected
    });
  });

  describe("getters", function () {
    it("should return number of testaments", async function () {
      const amount = ethers.utils.parseEther("5");
      await testamentManager.connect(user).depositTestament("CID1", "KEY1", amount);
      await testamentManager.connect(user).depositTestament("CID2", "KEY2", amount);
      const count = await testamentManager.getTestamentsNumber(user.address);
      expect(count).to.equal(2);
    });

    it("should return decrypted key if validator is authorized", async function () {
      const amount = ethers.utils.parseEther("5");
      const cid = "QmCID";
      const key = "topsecret";
      await testamentManager.connect(user).depositTestament(cid, key, amount);

      const result = await testamentManager
        .connect(owner)
        .getDecryptedKey(validator.address, cid);

      expect(result).to.equal(key);
    });

    it("should revert if non-authorized validator tries to access key", async function () {
      const amount = ethers.utils.parseEther("5");
      await testamentManager.connect(user).depositTestament("CID", "KEY", amount);

      await expect(
        testamentManager.connect(owner).getDecryptedKey(otherUser.address, "CID")
      ).to.be.revertedWith("Not authorized notary");
    });
  });
});
