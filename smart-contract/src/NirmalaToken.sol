// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract NirmalaToken is ERC20, ERC20Permit {
    constructor() ERC20("Nirmala LP", "NIR-LP") ERC20Permit("Nirmala LP") {}
}
