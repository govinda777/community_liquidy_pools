// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract LiquidityPool {
    struct Pool {
        address token;
        uint256 totalContributions;
    }

    Pool[] public pools;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    function createPool(address _token) public {
        pools.push(Pool({
            token: _token,
            totalContributions: 0
        }));
    }

    function contribute(uint256 _poolId, uint256 _amount) public {
        require(_poolId < pools.length, "Pool does not exist");
        // For simplicity, this contract does not handle token transfers.
        // In a real-world scenario, you would need to use IERC20 to transfer tokens.
        contributions[_poolId][msg.sender] += _amount;
        pools[_poolId].totalContributions += _amount;
    }

    function getContribution(uint256 _poolId, address _user) public view returns (uint256) {
        require(_poolId < pools.length, "Pool does not exist");
        return contributions[_poolId][_user];
    }

    function getTotalContributions(uint256 _poolId) public view returns (uint256) {
        require(_poolId < pools.length, "Pool does not exist");
        return pools[_poolId].totalContributions;
    }
}
