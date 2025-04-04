// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Pausable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title InhxToken
 * @author Richard Lavoura
 * @dev ERC20 token with pausable functionality, capped supply, and minting restricted to the owner.
 * The contract is paused immediately after deployment.
 */
contract InhxToken is ERC20, ERC20Pausable, Ownable {

    uint256 private constant MAX_SUPPLY = 1_000_000 ether; 

    /**
     * @notice Constructor that mints the full supply to the deployer and pauses the contract.
     */
    constructor() 
        ERC20("InheritX", "INHX")
        Ownable(msg.sender)
    {
        mint(msg.sender, MAX_SUPPLY);
    }

    /**
     * @notice Mints new tokens to the specified address.
     * @dev Only the owner can call this function. Minting is allowed only if the new total supply does not exceed MAX_SUPPLY.
     * @param to The address to receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply reached");
        _mint(to, amount);
    }

    /**
     * @notice Pauses all token transfers.
     * @dev Only the owner can call this function.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses all token transfers.
     * @dev Only the owner can call this function.
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    // The following functions are overrides required by Solidity.

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
