// SPDX-License-identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract InheritXLiquidityPool is Ownable {

    // add addresses of the two tokens used for the liquidity pool + router from UniswapV2
    address public tokenA; 
    address public tokenB;
    IUniswapV2Router02 public router;
    
    // take address of token A and B, router and owner inside the constructor 
    // POC purpose: create liquidity when the contract is deployed 
    constructor(
        address _tokenA,
        address _tokenB,
        address _router
    ) 
    Ownable(msg.sender)
    {
        tokenA = _tokenA;
        tokenB = _tokenB;
        router = IUniswapV2Router02(_router);
    }

    function approveRouter() external onlyOwner {
        _safeApprove(tokenA, address(router));
        _safeApprove(tokenB, address(router));
    }

    function _safeApprove(address token, address spender) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.approve.selector, spender, type(uint256).max)
        );

        require(success && (data.length == 0 || abi.decode(data, (bool))), "APPROVE_FAILED");
    }


    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external onlyOwner {

        // Approve router to spend the tokens
        IERC20(tokenA).approve(address(router), amountADesired);
        IERC20(tokenB).approve(address(router), amountBDesired);


        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            msg.sender,
            block.timestamp + 600
        );
    }

    /**
     * @notice Swap de TokenA vers TokenB via Uniswap V2.
     * @param amountIn Le montant de TokenA à échanger.
     * @param amountOutMin Le montant minimum de TokenB attendu.
     * @param deadline Timestamp limite pour l'exécution du swap.
     */
    function swapTokenAForTokenB(
        uint amountIn,
        uint amountOutMin,
        uint deadline
    ) external {
        // Transférer TokenA de l'utilisateur vers ce contrat
        require(
            IERC20(tokenA).transferFrom(msg.sender, address(this), amountIn),
            "Transfert echoue"
        );

        // Approuver le routeur Uniswap pour dépenser TokenA
        require(
            IERC20(tokenA).approve(address(router), amountIn),
            "Approbation echouee"
        );

        // Définir le chemin du swap : TokenA -> TokenB
        address[] memory path = new address[](2);
        path[0] = tokenA;
        path[1] = tokenB;

        // Exécuter le swapExactTokensForTokens sur le routeur Uniswap V2
        router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender, // Les tokens reçus seront directement envoyés à l'utilisateur
            deadline
        );
    }

    /**
     * @notice Swap de TokenB vers TokenA via Uniswap V2.
     * @param amountIn Le montant de TokenB à échanger.
     * @param amountOutMin Le montant minimum de TokenA attendu.
     * @param deadline Timestamp limite pour l'exécution du swap.
     */
    function swapTokenBForTokenA(
        uint amountIn,
        uint amountOutMin,
        uint deadline
    ) external {
        // Transférer TokenB de l'utilisateur vers ce contrat
        require(
            IERC20(tokenB).transferFrom(msg.sender, address(this), amountIn),
            "Transfert echoue"
        );

        // Approuver le routeur Uniswap pour dépenser TokenB
        require(
            IERC20(tokenB).approve(address(router), amountIn),
            "Approbation echouee"
        );

        // Définir le chemin du swap : TokenB -> TokenA
        address[] memory path = new address[](2);
        path[0] = tokenB;
        path[1] = tokenA;

        // Exécuter le swapExactTokensForTokens sur le routeur Uniswap V2
        router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender, // Les tokens reçus seront directement envoyés à l'utilisateur
            deadline
        );
    }

        function getReserves() external view returns (uint112 reserveA, uint112 reserveB) {
        address pair = IUniswapV2Factory(router.factory()).getPair(tokenA, tokenB);
        require(pair != address(0), "Pair does not exist");

        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair).getReserves();

        // Return reserves in tokenA/tokenB order
        (reserveA, reserveB) = tokenA < tokenB ? (reserve0, reserve1) : (reserve1, reserve0);
    }




}
