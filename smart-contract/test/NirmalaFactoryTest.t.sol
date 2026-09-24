// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test} from "forge-std/Test.sol";
import {NirmalaFactory} from "../src/NirmalaFactory.sol";
import {NirmalaPair} from "../src/NirmalaPair.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract NirmalaFactoryTest is Test {
    NirmalaFactory private factory;
    MockERC20 private tokenA;
    MockERC20 private tokenB;

    function setUp() public {
        factory = new NirmalaFactory();
        tokenA = new MockERC20("TokenA", "TKA");
        tokenB = new MockERC20("TokenB", "TKB");
    }

    function _expectedPairAddress(address token0, address token1) private view returns (address) {
        return vm.computeCreate2Address(
            keccak256(abi.encodePacked(token0, token1)), keccak256(type(NirmalaPair).creationCode), address(factory)
        );
    }

    function test_allPairsLength_startsAtZero() public view {
        assertEq(factory.allPairsLength(), 0);
    }

    function test_createPair_incrementsAllPairsLength() public {
        factory.createPair(address(tokenA), address(tokenB));
        assertEq(factory.allPairsLength(), 1);
    }

    function test_createPair_sortsTokensRegardlessOfInputOrder() public {
        address pairAddr = factory.createPair(address(tokenB), address(tokenA));
        NirmalaPair pair = NirmalaPair(pairAddr);
        assertLt(uint160(pair.token0()), uint160(pair.token1()));
    }

    function test_createPair_setsGetPairBothDirections() public {
        address pairAddr = factory.createPair(address(tokenA), address(tokenB));
        assertEq(factory.getPair(address(tokenA), address(tokenB)), pairAddr);
        assertEq(factory.getPair(address(tokenB), address(tokenA)), pairAddr);
    }

    function test_createPair_pushesToAllPairs() public {
        address pairAddr = factory.createPair(address(tokenA), address(tokenB));
        assertEq(factory.allPairs(0), pairAddr);
    }

    function test_createPair_returnsPairAddress() public {
        address pairAddr = factory.createPair(address(tokenA), address(tokenB));
        assertTrue(pairAddr != address(0));
    }

    function test_createPair_pairFactoryIsSetToFactory() public {
        address pairAddr = factory.createPair(address(tokenA), address(tokenB));
        assertEq(NirmalaPair(pairAddr).factory(), address(factory));
    }

    function test_createPair_deploysAtPredictedCreate2Address() public {
        (address token0, address token1) =
            address(tokenA) < address(tokenB) ? (address(tokenA), address(tokenB)) : (address(tokenB), address(tokenA));
        address expected = _expectedPairAddress(token0, token1);
        address pairAddr = factory.createPair(address(tokenA), address(tokenB));
        assertEq(pairAddr, expected);
    }

    function test_createPair_emitsPairCreated() public {
        (address token0, address token1) =
            address(tokenA) < address(tokenB) ? (address(tokenA), address(tokenB)) : (address(tokenB), address(tokenA));
        address expected = _expectedPairAddress(token0, token1);

        vm.expectEmit(true, true, false, true);
        emit NirmalaFactory.PairCreated(token0, token1, expected, 1);
        factory.createPair(address(tokenA), address(tokenB));
    }

    function test_createPair_revertsIfIdenticalAddresses() public {
        vm.expectRevert(NirmalaFactory.NirmalaFactory__IdenticalAddresses.selector);
        factory.createPair(address(tokenA), address(tokenA));
    }

    function test_createPair_revertsIfTokenAIsZeroAddress() public {
        vm.expectRevert(NirmalaFactory.NirmalaFactory__ZeroAddress.selector);
        factory.createPair(address(0), address(tokenB));
    }

    function test_createPair_revertsIfTokenBIsZeroAddress() public {
        vm.expectRevert(NirmalaFactory.NirmalaFactory__ZeroAddress.selector);
        factory.createPair(address(tokenA), address(0));
    }

    function test_createPair_revertsIfPairAlreadyExists() public {
        factory.createPair(address(tokenA), address(tokenB));
        vm.expectRevert(NirmalaFactory.NirmalaFactory__PairExists.selector);
        factory.createPair(address(tokenA), address(tokenB));
    }

    function test_createPair_revertsIfPairAlreadyExistsReversedOrder() public {
        factory.createPair(address(tokenA), address(tokenB));
        vm.expectRevert(NirmalaFactory.NirmalaFactory__PairExists.selector);
        factory.createPair(address(tokenB), address(tokenA));
    }

    function test_createPair_deployedPairIsFunctional() public {
        address pairAddr = factory.createPair(address(tokenA), address(tokenB));
        NirmalaPair pair = NirmalaPair(pairAddr);

        MockERC20(pair.token0() == address(tokenA) ? address(tokenA) : address(tokenB)).mint(address(pair), 1000e18);
        MockERC20(pair.token0() == address(tokenA) ? address(tokenB) : address(tokenA)).mint(address(pair), 1000e18);

        uint256 liquidity = pair.mint(address(this));
        assertGt(liquidity, 0);
    }

    function testFuzz_createPair_sortsAndPredictsAddress(address x, address y) public {
        vm.assume(x != y);
        vm.assume(x != address(0) && y != address(0));
        vm.assume(x.code.length == 0 && y.code.length == 0);

        (address token0, address token1) = x < y ? (x, y) : (y, x);
        address expected = _expectedPairAddress(token0, token1);

        address pairAddr = factory.createPair(x, y);
        assertEq(pairAddr, expected);
        assertEq(NirmalaPair(pairAddr).token0(), token0);
        assertEq(NirmalaPair(pairAddr).token1(), token1);
    }
}
