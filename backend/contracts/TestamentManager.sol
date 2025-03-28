// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; 
import "./ValidatorPool.sol";

contract TestamentManager is ERC721URIStorage, Ownable {

    // stateVariable
    enum Status {Pending, Rejected, Approved}
    uint256 private _tokenIdCounter;
    struct TestamentInfo {string cid; string decryptionKey; uint depositTimestamp; Status status;}
    mapping (address => TestamentInfo) private lastTestament;
    mapping (address => TestamentInfo[]) private testaments;
    mapping(uint256 => string) private encryptedKeys;
    

    
    // events 
    event TestamentDeposited(address indexed _depositor, string _cid);
    event TestamentApproved(address indexed _testator, string _cid);
    event TestamentRejected(address indexed _testator, string _cid);


    // custom errors 
    error HasNotEnoughToken();
    error TestamentAlreadyExists();


    ValidatorPool public validatorPool;
    IERC20 public paymentToken;  

    constructor(address _validatorPool, address _paymentToken)
        ERC721("Soulbound Testament", "SBT")
        Ownable (msg.sender)
    {
        validatorPool = ValidatorPool(_validatorPool);
        paymentToken = IERC20(_paymentToken);
    }

    // Modifier pour les fonctions nécessitant un paiement
    modifier requiresPayment(uint256 _amount) {
        require(
            paymentToken.balanceOf(msg.sender) >= _amount,
            HasNotEnoughToken()
        );
        _;
    }

    // deposit testament 
    function depositTestament(string memory _cid, string calldata _decryptionKey, uint256 _amount) external requiresPayment(_amount) {
        require(keccak256(bytes(lastTestament[msg.sender].cid)) != keccak256(bytes(_cid)), TestamentAlreadyExists());
        paymentToken.transferFrom(msg.sender, address(this), _amount);
        lastTestament[msg.sender] = TestamentInfo(_cid, _decryptionKey, block.timestamp, Status.Pending);
        emit TestamentDeposited(msg.sender, _cid);
    }

    // check testament -> intervention des validateurs 
    function approveTestament(address _testator, bool _approved) external {
        require(validatorPool.isAuthorized(msg.sender), "Not authorized notary");
        require(lastTestament[_testator].depositTimestamp != 0, "No testament found");
        require(lastTestament[_testator].status == Status.Pending, "Testament already processed");

        if (_approved) {
            lastTestament[_testator].status = Status.Approved;
            mintTestament(_testator, lastTestament[_testator].cid, lastTestament[_testator].decryptionKey);
            emit TestamentApproved(_testator, lastTestament[_testator].cid);
        } else {
            lastTestament[_testator].status = Status.Rejected;
            emit TestamentRejected(_testator, lastTestament[_testator].cid);
        }
    }

    function mintTestament(address to, string memory _cid, string memory _decryptionKey) internal onlyOwner {
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _cid);
        encryptedKeys[tokenId] = _decryptionKey; // <- Association ici
    }

    // Getter pour obtenir les informations d’un testament
    function getTestament(address _testator) external view returns (TestamentInfo memory) {
        return lastTestament[_testator];
    }

}