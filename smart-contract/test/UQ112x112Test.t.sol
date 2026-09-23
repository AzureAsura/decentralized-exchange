// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test} from "forge-std/Test.sol";
import {UQ112x112} from "../src/libraries/UQ112x112.sol";

contract UQ112x112Harness {
    function encode(uint112 y) external pure returns (uint224) {
        return UQ112x112.encode(y);
    }

    function uqdiv(uint224 x, uint112 y) external pure returns (uint224) {
        return UQ112x112.uqdiv(x, y);
    }
}

contract UQ112x112Test is Test {
    uint224 private constant Q112 = 2 ** 112;

    UQ112x112Harness private lib;

    function setUp() public {
        lib = new UQ112x112Harness();
    }

    function test_encode_zero() public view {
        assertEq(lib.encode(0), 0);
    }

    function test_encode_one() public view {
        assertEq(lib.encode(1), Q112);
    }

    function test_encode_maxUint112() public view {
        uint112 maxY = type(uint112).max;
        assertEq(lib.encode(maxY), uint224(maxY) * Q112);
    }

    function test_uqdiv_basic() public view {
        uint224 encoded = lib.encode(10);
        assertEq(lib.uqdiv(encoded, 2), lib.encode(5));
    }

    function test_uqdiv_revertsOnDivideByZero() public {
        vm.expectRevert(); // arithmetic panic: division by zero
        lib.uqdiv(Q112, 0);
    }

    function testFuzz_encode_matchesManualCalculation(uint112 y) public view {
        assertEq(lib.encode(y), uint224(y) * Q112);
    }

    function testFuzz_uqdiv_matchesManualCalculation(uint224 x, uint112 y) public view {
        vm.assume(y != 0);
        assertEq(lib.uqdiv(x, y), x / uint224(y));
    }

    /// @dev encode() then uqdiv() by the same value round-trips back to the original UQ112x112 encoding.
    function testFuzz_encodeThenUqdiv_roundTrips(uint112 y) public view {
        vm.assume(y != 0);
        assertEq(lib.uqdiv(lib.encode(y), y), Q112);
    }
}
