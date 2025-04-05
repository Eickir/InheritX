// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Pausable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title M-USDT Token
 * @author Richard Lavoura
 * @dev ERC20 token with pausable functionality, capped supply, and minting restricted to the owner.
 */
contract MockUsdtToken is ERC20, ERC20Pausable, Ownable {

    /// @notice Maximum supply of tokens (2 million MUSDT with 18 decimals)
    uint256 private constant MAX_SUPPLY = 2_000_000 ether;

    /// @notice Flag indicating whether minting is permanently disabled
    bool public mintingFinished = false;

    /// @notice Error thrown when the contract receives Ether
    error EtherNotAccepted();

    /// @notice Error thrown when minting is attempted after minting has been permanently disabled
    error MintingFinished();

    /// @notice Error thrown when minting would exceed the maximum supply
    error MaxSupplyReached();

    /// @notice Emitted when new tokens are minted
    event Minted(address indexed to, uint256 amount);

    /**
     * @notice Constructor that mints the full supply to the deployer and pauses the contract.
     */
    constructor() 
        ERC20("M-USDT", "MUSDT")
        Ownable(msg.sender)
    {
        mint(msg.sender, MAX_SUPPLY);
    }

    /**
     * @notice Mints new tokens to the specified address.
     * @dev Only callable by the contract owner. Cannot mint beyond the max supply or if minting is finished.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(!mintingFinished, MintingFinished());
        require(totalSupply() + amount <= MAX_SUPPLY, MaxSupplyReached());
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @notice Irreversibly disables all future minting operations.
     * @dev Only callable by the contract owner.
     */
    function finishMinting() external onlyOwner {
        mintingFinished = true;
    }

    /**
     * @notice Pauses all token transfers.
     * @dev Only the owner can call this function. Useful in case of emergency.
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

    /**
     * @notice Overrides the `_update` hook from ERC20 and ERC20Pausable to apply pause logic.
     * @dev Called internally during token transfers, minting, and burning.
     * @param from The address transferring tokens.
     * @param to The address receiving tokens.
     * @param value The amount of tokens being transferred.
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }

    /**
     * @notice Reverts any direct Ether transfers to the contract.
     * @dev This function is triggered when the contract receives Ether with empty calldata.
     */
    receive() external payable {
        revert EtherNotAccepted();
    }

    /**
     * @notice Reverts any calls to non-existent functions or direct Ether transfers with calldata.
     * @dev This function is triggered when no other function matches the call data.
     */
    fallback() external payable {
        revert EtherNotAccepted();
    }
}
