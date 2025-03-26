// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestamentManager {

    // stateVariable
    enum Status {Pending, Rejected, Granted}
    struct DepositInfo {string cid; string decryptionKey; uint depositTimetstamp; Status status;}
    mapping (address => DepositInfo) private deposits;
    event TestamentDeposited(address indexed _depositor, string _cid);

    // deposit testament 
    function depositTestament(string calldata _cid, string calldata _decryptionKey) external {
        deposits[msg.sender] = DepositInfo(_cid, _decryptionKey, block.timestamp, Status.Pending);
        emit TestamentDeposited(msg.sender, _cid);
    }

    // getter pour checker les déposit 
    function getDepositInfo() external view returns(DepositInfo memory) {
       return deposits[msg.sender];
    }

}