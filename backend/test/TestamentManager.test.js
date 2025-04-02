const { expect } = require("chai");
const { ethers } = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("TestamentManager", function () {
  let testamentManager, validatorPool, paymentToken;
  let owner, user, validator, otherUser;

  beforeEach(async () => {
    [owner, user, validator, otherUser] = await ethers.getSigners();

    const InhxToken = await ethers.getContractFactory("InhxToken");
    const INHX = await InhxToken.deploy();
    const INHXAddress = await INHX.getAddress();

    const stakeEntryAmount = ethers.parseEther("5000");
    const ValidatorPool = await ethers.getContractFactory("ValidatorPool");
    validatorPool = await ValidatorPool.deploy(INHXAddress, stakeEntryAmount);
    const validatorPoolAddress = await validatorPool.getAddress();


    await INHX.transfer(validator.address, ethers.parseEther("5000"));
    await INHX.connect(validator).approve(validatorPoolAddress, stakeEntryAmount);
    await validatorPool.connect(validator).stake(stakeEntryAmount);

    await INHX.transfer(user.address, ethers.parseEther("500"));

    const TestamentManager = await ethers.getContractFactory("TestamentManager");
    testamentManager = await TestamentManager.deploy(validatorPoolAddress, INHXAddress);
    const testamentManagerAddress = await testamentManager.getAddress();

    // Approve TestamentManager to spend user's tokens
    await INHX.connect(user).approve(testamentManagerAddress, ethers.parseEther("1000"));
  });

  describe("depositTestament", function () {
    it("should deposit a new testament", async function () {
      
      const cid = "Qm123";
      const decryptionKey = "secret";
      const amount = ethers.parseEther("10");

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
      const amount = ethers.parseEther("10");

      await testamentManager.connect(user).depositTestament("CID1", "KEY1", amount);
      await expect(
        testamentManager.connect(user).depositTestament("CID2", "KEY2", amount)
      ).to.emit(testamentManager, "TestamentOutdated");
    });

    it("should fail if user has not enough token", async function () {
      const lowUser = otherUser;
      await expect(
        testamentManager.connect(lowUser).depositTestament("CID", "KEY", ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(testamentManager, "HasNotEnoughToken");
    });
  });

  describe("approveTestament", function () {
    it("should approve testament and mint NFT", async function () {
      const cid = "QmTest";
      const decryptionKey = "secret";
      const amount = ethers.parseEther("10");

      await testamentManager.connect(user).depositTestament(cid, decryptionKey, amount);

      await expect(
        testamentManager.connect(validator).approveTestament(validator.address, user.address)
      )
        .to.emit(testamentManager, "TestamentApproved")
        .withArgs(user.address, cid);

      const testament = await testamentManager.getTestament(user.address);
      expect(testament.status).to.equal(2); // Approved
    });

    it("should mint a soulbound NFT with correct tokenURI", async function () {
      const cid = "QmMintCheck";
      const key = "encryptedKey123";
      const amount = ethers.parseEther("10");
    
      await testamentManager.connect(user).depositTestament(cid, key, amount);
      await testamentManager.connect(validator).approveTestament(validator.address, user.address);
    
      // Vérifie l'URI du token 1
      const tokenUri = await testamentManager.tokenURI(1);
      expect(tokenUri).to.equal(cid);
    
      // Vérifie que la clé est stockée pour le token
      const storedKey = await testamentManager.getDecryptedKey(validator.address, cid);
      expect(storedKey).to.equal(key);

      it("should revert if non-owner tries to approve a testament", async function () {
        const amount = ethers.parseEther("10");
      
        await testamentManager.connect(user).depositTestament("CID1", "KEY1", amount);
      
        await expect(
          testamentManager.connect(user).approveTestament(validator.address, user.address)
        ).to.be.revertedWithCustomError(testamentManager, "OwnableUnauthorizedAccount");
      });

      
    });

    it("should reject testament correctly", async function () {
      const cid = "QmTest";
      const amount = ethers.parseEther("10");

      await testamentManager.connect(user).depositTestament(cid, "secret", amount);

      await expect(
        testamentManager.connect(validator).rejectTestament(validator.address, user.address)
      )
        .to.emit(testamentManager, "TestamentRejected")
        .withArgs(user.address, cid);

      const testament = await testamentManager.getTestament(user.address);
      expect(testament.status).to.equal(1); // Rejected
    });

    it("should revert if validator is not authorized", async function () {
      const amount = ethers.parseEther("10");
      await testamentManager.connect(user).depositTestament("CID", "KEY", amount);
    
      await expect(
        testamentManager.connect(validator).approveTestament(otherUser.address, user.address)
      ).to.be.revertedWith("Not authorized notary");
    });
    
    it("should revert if no testament found", async function () {
      await expect(
        testamentManager.connect(validator).approveTestament(validator.address, otherUser.address)
      ).to.be.revertedWith("No testament found");
    });
        
    it("should revert if testament already approved", async function () {
      const amount = ethers.parseEther("10");
      await testamentManager.connect(user).depositTestament("CID", "KEY", amount);
      await testamentManager.connect(validator).approveTestament(validator.address, user.address);
    
      await expect(
        testamentManager.connect(validator).approveTestament(validator.address, user.address)
      ).to.be.revertedWith("Testament already processed");
    });
    
  });

  describe("reject testament", async function() {

    it("should revert if validator is not authorized", async function () {
      const amount = ethers.parseEther("10");
      await testamentManager.connect(user).depositTestament("CID", "KEY", amount);
  
      await expect(
        testamentManager.connect(validator).rejectTestament(otherUser.address, user.address)
      ).to.be.revertedWith("Not authorized notary");
    });
  
    it("should revert if no testament found", async function () {
      await expect(
        testamentManager.connect(validator).rejectTestament(validator.address, otherUser.address)
      ).to.be.revertedWith("No testament found");
    });
    
    it("should revert if testament already rejected", async function () {
      const amount = ethers.parseEther("10");
      await testamentManager.connect(user).depositTestament("CID", "KEY", amount);
      await testamentManager.connect(validator).rejectTestament(validator.address, user.address);
  
      await expect(
        testamentManager.connect(validator).rejectTestament(validator.address, user.address)
      ).to.be.revertedWith("Testament already processed");
    });

  });

  describe("getters", function () {
    it("should return number of testaments", async function () {
      const amount = ethers.parseEther("5");
      await testamentManager.connect(user).depositTestament("CID1", "KEY1", amount);
      await testamentManager.connect(user).depositTestament("CID2", "KEY2", amount);
      const count = await testamentManager.getTestamentsNumber(user.address);
      expect(count).to.equal(2);
    });

    it("should return decrypted key if validator is authorized", async function () {
      const amount = ethers.parseEther("5");
      const cid = "QmCID";
      const key = "topsecret";
      await testamentManager.connect(user).depositTestament(cid, key, amount);

      const result = await testamentManager
        .connect(owner)
        .getDecryptedKey(validator.address, cid);

      expect(result).to.equal(key);
    });

    it("should revert if non-authorized validator tries to access key", async function () {
      const amount = ethers.parseEther("5");
      await testamentManager.connect(user).depositTestament("CID", "KEY", amount);

      await expect(
        testamentManager.connect(owner).getDecryptedKey(otherUser.address, "CID")
      ).to.be.revertedWith("Not authorized notary");
    });

    it("should return empty string if CID does not exist", async function () {
      const result = await testamentManager
        .connect(owner)
        .getDecryptedKey(validator.address, "UnknownCID");
    
      expect(result).to.equal("");
    });

  });

  describe("Soulbound enforcement", function () {
    it("should revert transferFrom (Soulbound)", async function () {
      const cid = "QmSoulboundTest";
      const key = "nope";
      const amount = ethers.parseEther("10");

      await testamentManager.connect(user).depositTestament(cid, key, amount);
      await testamentManager.connect(validator).approveTestament(validator.address, user.address);

      await expect(
        testamentManager.connect(user).transferFrom(user.address, otherUser.address, 1)
      ).to.be.revertedWith("Soulbound: Transfers are disabled");
    });

    it("should revert safeTransferFrom (Soulbound)", async function () {
      const cid = "QmSoulboundTest2";
      const key = "locked";
      const amount = ethers.parseEther("10");

      await testamentManager.connect(user).depositTestament(cid, key, amount);
      await testamentManager.connect(validator).approveTestament(validator.address, user.address);

      await expect(
        testamentManager.connect(user)["safeTransferFrom(address,address,uint256)"](
          user.address,
          otherUser.address,
          1
        )
      ).to.be.revertedWith("Soulbound: Transfers are disabled");
    });
  });

  describe("interface support", function () {
    it("should support ERC721 interface", async function () {
      // ERC721 interface ID: 0x80ac58cd
      const result = await testamentManager.supportsInterface("0x80ac58cd");
      expect(result).to.equal(true);
    });
  
    it("should not support random interface", async function () {
      const result = await testamentManager.supportsInterface("0x12345678");
      expect(result).to.equal(false);
    });
  });

  describe("burn (internal check only)", function () {
    it("should allow burn (to == 0)", async function () {
      const cid = "QmBurnTest";
      const key = "secret";
      const amount = ethers.parseEther("10");
    
      await testamentManager.connect(user).depositTestament(cid, key, amount);
      await testamentManager.connect(validator).approveTestament(validator.address, user.address);
    
      await expect(
        testamentManager.connect(user).burnTestament(1)
      ).to.not.be.reverted;
    });
    
    it("should revert if non-owner tries to burn a token", async function () {
      const cid = "QmBurnMe";
      const key = "superkey";
      const amount = ethers.parseEther("10");
    
      await testamentManager.connect(user).depositTestament(cid, key, amount);
      await testamentManager.connect(validator).approveTestament(validator.address, user.address);
    
      await expect(
        testamentManager.connect(otherUser).burnTestament(1)
      ).to.be.revertedWith("Not token owner");
    });
  });

});
