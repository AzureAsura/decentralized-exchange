// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {Test} from "forge-std/Test.sol";
import {NirmalaToken} from "../src/NirmalaToken.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Test-only harness exposing NirmalaToken's internal mint/burn; NirmalaPair gets the real external entry points.
contract NirmalaTokenHarness is NirmalaToken {
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract NirmalaTokenTest is Test {
    bytes32 private constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    NirmalaTokenHarness private token;

    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");

    function setUp() public {
        token = new NirmalaTokenHarness();
    }

    function test_metadata() public view {
        assertEq(token.name(), "Nirmala LP");
        assertEq(token.symbol(), "NIR-LP");
        assertEq(token.decimals(), 18);
    }

    function test_mint_increasesBalanceAndSupply() public {
        token.mint(alice, 100e18);
        assertEq(token.balanceOf(alice), 100e18);
        assertEq(token.totalSupply(), 100e18);
    }

    function test_burn_decreasesBalanceAndSupply() public {
        token.mint(alice, 100e18);
        token.burn(alice, 40e18);
        assertEq(token.balanceOf(alice), 60e18);
        assertEq(token.totalSupply(), 60e18);
    }

    function test_burn_revertsOnInsufficientBalance() public {
        token.mint(alice, 10e18);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, 10e18, 11e18));
        token.burn(alice, 11e18);
    }

    function test_transfer_movesBalanceAndEmits() public {
        token.mint(alice, 100e18);

        vm.expectEmit(true, true, false, true, address(token));
        emit IERC20.Transfer(alice, bob, 30e18);

        vm.prank(alice);
        token.transfer(bob, 30e18);

        assertEq(token.balanceOf(alice), 70e18);
        assertEq(token.balanceOf(bob), 30e18);
    }

    function test_transfer_revertsOnInsufficientBalance() public {
        token.mint(alice, 10e18);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, 10e18, 11e18));
        vm.prank(alice);
        token.transfer(bob, 11e18);
    }

    function test_transfer_revertsOnZeroAddressReceiver() public {
        token.mint(alice, 10e18);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InvalidReceiver.selector, address(0)));
        vm.prank(alice);
        token.transfer(address(0), 1e18);
    }

    function test_approve_setsAllowance() public {
        vm.prank(alice);
        token.approve(bob, 50e18);
        assertEq(token.allowance(alice, bob), 50e18);
    }

    function test_transferFrom_movesBalanceAndDecreasesAllowance() public {
        token.mint(alice, 100e18);
        vm.prank(alice);
        token.approve(bob, 50e18);

        vm.prank(bob);
        token.transferFrom(alice, bob, 30e18);

        assertEq(token.balanceOf(alice), 70e18);
        assertEq(token.balanceOf(bob), 30e18);
        assertEq(token.allowance(alice, bob), 20e18);
    }

    function test_transferFrom_revertsOnInsufficientAllowance() public {
        token.mint(alice, 100e18);
        vm.prank(alice);
        token.approve(bob, 10e18);

        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, bob, 10e18, 11e18));
        vm.prank(bob);
        token.transferFrom(alice, bob, 11e18);
    }

    function test_permit_grantsAllowanceAndConsumesNonce() public {
        (address owner, uint256 ownerKey) = makeAddrAndKey("owner");
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 digest = _permitDigest(owner, bob, 40e18, token.nonces(owner), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);

        token.permit(owner, bob, 40e18, deadline, v, r, s);

        assertEq(token.allowance(owner, bob), 40e18);
        assertEq(token.nonces(owner), 1);
    }

    function test_permit_revertsOnExpiredDeadline() public {
        (address owner, uint256 ownerKey) = makeAddrAndKey("owner");
        uint256 deadline = block.timestamp;
        bytes32 digest = _permitDigest(owner, bob, 40e18, token.nonces(owner), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);

        vm.warp(deadline + 1);
        vm.expectRevert(abi.encodeWithSignature("ERC2612ExpiredSignature(uint256)", deadline));
        token.permit(owner, bob, 40e18, deadline, v, r, s);
    }

    function test_permit_revertsOnWrongSigner() public {
        (address owner,) = makeAddrAndKey("owner");
        (, uint256 wrongKey) = makeAddrAndKey("impostor");
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 digest = _permitDigest(owner, bob, 40e18, token.nonces(owner), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, digest);

        vm.expectRevert();
        token.permit(owner, bob, 40e18, deadline, v, r, s);
    }

    function testFuzz_transfer_movesExactAmount(uint256 supply, uint256 amount) public {
        supply = bound(supply, 1, type(uint128).max);
        amount = bound(amount, 0, supply);

        token.mint(alice, supply);
        vm.prank(alice);
        token.transfer(bob, amount);

        assertEq(token.balanceOf(alice), supply - amount);
        assertEq(token.balanceOf(bob), amount);
    }

    function testFuzz_transferFrom_decreasesAllowanceByAmount(uint256 allowanceAmount, uint256 spendAmount) public {
        allowanceAmount = bound(allowanceAmount, 0, type(uint128).max);
        spendAmount = bound(spendAmount, 0, allowanceAmount);

        token.mint(alice, allowanceAmount);
        vm.prank(alice);
        token.approve(bob, allowanceAmount);

        vm.prank(bob);
        token.transferFrom(alice, bob, spendAmount);

        assertEq(token.allowance(alice, bob), allowanceAmount - spendAmount);
    }

    function testFuzz_permit_grantsExactAmount(uint256 amount, uint256 deadlineOffset) public {
        amount = bound(amount, 0, type(uint128).max);
        deadlineOffset = bound(deadlineOffset, 0, 365 days);

        (address owner, uint256 ownerKey) = makeAddrAndKey("fuzzOwner");
        uint256 deadline = block.timestamp + deadlineOffset;

        bytes32 digest = _permitDigest(owner, bob, amount, token.nonces(owner), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);

        token.permit(owner, bob, amount, deadline, v, r, s);

        assertEq(token.allowance(owner, bob), amount);
    }

    function _permitDigest(address owner, address spender, uint256 value, uint256 nonce, uint256 deadline)
        private
        view
        returns (bytes32)
    {
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonce, deadline));
        return keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
    }
}
