// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {NirmalaPair} from "./NirmalaPair.sol";

contract NirmalaFactory {
    error NirmalaFactory__IdenticalAddresses();
    error NirmalaFactory__ZeroAddress();
    error NirmalaFactory__PairExists();

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairIndex);

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, NirmalaFactory__IdenticalAddresses());
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), NirmalaFactory__ZeroAddress());
        require(getPair[token0][token1] == address(0), NirmalaFactory__PairExists());

        pair = address(new NirmalaPair{salt: keccak256(abi.encodePacked(token0, token1))}());
        NirmalaPair(pair).initialize(token0, token1);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }
}
