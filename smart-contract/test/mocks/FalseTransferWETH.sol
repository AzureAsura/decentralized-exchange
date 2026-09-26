// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

/// @dev Test-only WETH double whose `transfer` returns false instead of reverting, matching the
/// canonical (non-OZ) WETH9 contract's non-reverting ERC20 semantics. Exercises NirmalaRouter's
/// defensive check on IWETH.transfer's return value in addLiquidityETH.
contract FalseTransferWETH {
    mapping(address => uint256) public balanceOf;

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "FalseTransferWETH: ETH transfer failed");
    }

    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }

    receive() external payable {
        balanceOf[msg.sender] += msg.value;
    }
}
