// SPDX-License-identifier: MIT
pragma solidity 0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract MockUsdtToken is ERC20, Ownable {

    uint256 private constant MAX_SUPPLY = 1_000_000_000_000 ether; 

    constructor() 
    ERC20("M-USDT", "MUSDT")
    Ownable(msg.sender) {
        mint(msg.sender, 2_000_000 ether);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply reached");
        _mint(to, amount);
    }

}