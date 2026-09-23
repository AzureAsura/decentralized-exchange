// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {INirmalaCallee} from "../../src/interfaces/INirmalaCallee.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Test-only flash-swap recipient. `data` encodes (token0, token1, repay0, repay1) so tests control repayment.
contract MockNirmalaCallee is INirmalaCallee {
    function nirmalaCall(address, uint256, uint256, bytes calldata data) external override {
        (address token0, address token1, uint256 repay0, uint256 repay1) =
            abi.decode(data, (address, address, uint256, uint256));

        if (repay0 > 0) IERC20(token0).transfer(msg.sender, repay0);
        if (repay1 > 0) IERC20(token1).transfer(msg.sender, repay1);
    }
}
