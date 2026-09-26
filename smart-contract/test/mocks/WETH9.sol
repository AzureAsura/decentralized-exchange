// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Test-only WETH mock for Anvil/local testing. Testnets/mainnet use the chain's canonical
/// WETH/WBNB via HelperConfig.s.sol instead — this never belongs in src/ (see PRD bagian 4).
contract WETH9 is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "WETH9: ETH transfer failed");
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
    }
}
