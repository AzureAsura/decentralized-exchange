// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {NirmalaPair} from "../NirmalaPair.sol";

library NirmalaLibrary {
    bytes32 internal constant PAIR_INIT_CODE_HASH = 0x82217b6ea4b9b54aadaf683819bfbba1bf68a38b74ef201277c79741bc014134;

    error NirmalaLibrary__IdenticalAddresses();
    error NirmalaLibrary__ZeroAddress();
    error NirmalaLibrary__InsufficientAmount();
    error NirmalaLibrary__InsufficientInputAmount();
    error NirmalaLibrary__InsufficientOutputAmount();
    error NirmalaLibrary__InsufficientLiquidity();
    error NirmalaLibrary__InvalidPath();

    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, NirmalaLibrary__IdenticalAddresses());
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), NirmalaLibrary__ZeroAddress());
    }

    function pairFor(address factory, address tokenA, address tokenB) internal pure returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), factory, keccak256(abi.encodePacked(token0, token1)), PAIR_INIT_CODE_HASH)
        );
        // forge-lint: disable-next-line(unsafe-typecast)
        pair = address(uint160(uint256(hash)));
    }

    function getReserves(address factory, address tokenA, address tokenB)
        internal
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        (address token0,) = sortTokens(tokenA, tokenB);
        (uint112 reserve0, uint112 reserve1,) = NirmalaPair(pairFor(factory, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) internal pure returns (uint256 amountB) {
        require(amountA > 0, NirmalaLibrary__InsufficientAmount());
        require(reserveA > 0 && reserveB > 0, NirmalaLibrary__InsufficientLiquidity());
        amountB = (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountOut)
    {
        require(amountIn > 0, NirmalaLibrary__InsufficientInputAmount());
        require(reserveIn > 0 && reserveOut > 0, NirmalaLibrary__InsufficientLiquidity());
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountIn)
    {
        require(amountOut > 0, NirmalaLibrary__InsufficientOutputAmount());
        require(reserveIn > 0 && reserveOut > 0, NirmalaLibrary__InsufficientLiquidity());
        require(amountOut < reserveOut, NirmalaLibrary__InsufficientLiquidity());
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    function getAmountsOut(address factory, uint256 amountIn, address[] memory path)
        internal
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, NirmalaLibrary__InvalidPath());
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function getAmountsIn(address factory, uint256 amountOut, address[] memory path)
        internal
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, NirmalaLibrary__InvalidPath());
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
}
