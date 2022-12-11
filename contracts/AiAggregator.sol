// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

/// @title Ai Aggregator
/// @author Dezentralizator/ Benoit Fontannaz
/// @notice Aggregator contract to updates AIs decentrally
/// @dev Allows people to contribute decentrally to an AI

import "hardhat/console.sol";

contract Aggregator {

    uint256 private constant amountOfParameters = 32; //amount of params
    uint256 private constant sizeOfParameters = 32; // size of info
    uint256 private constant bytes32Amounts = (amountOfParameters / sizeOfParameters) + 1;
    uint256 private constant uint256Amounts = (amountOfParameters / 256) + 1;

    uint256 private constant bytesLength = amountOfParameters/8;
    uint256 private constant amountOfContributions = 10;
    uint256 private constant uint16Max = 100000000;

    uint256 private constant quantileForUpdates = 95;



    uint256[] startIndex;

    uint256[] updatesSend;
    uint256[] public normalVector;
    uint32[] public parameters;

    bool private isInitiated;

    mapping(uint256 => address) committers;

    uint256 public lastCommit;
    uint256 public firstCommitInTau;
    uint256 public lastCommitInTau;

    uint256 public currentTau;
    uint256 public lastUpdateTime;
    bool public isUpgradeable;

    uint256 public lastTimeStamp;
    uint256 public constant timeToVerify = 1 days; //1 hour




    function init(uint32[] calldata _array) public {

        require(!isInitiated);
        require(_array.length == amountOfParameters);
        parameters = _array;
        isInitiated = true;
        startIndex.push(0);


    }


    function pushYourUpdate(uint256 input, uint256 normal) public {

        require(lastUpdateTime + timeToVerify < block.timestamp, "Verification time" );
        require(lastCommit-lastCommitInTau < amountOfContributions, "Max updates accepted reached");
        committers[lastCommit] = msg.sender;
        updatesSend.push(input);
        normalVector.push(normal);
        lastCommit += 1;

    }

    function setTauAndUpdate() public {

        require(lastCommit-lastCommitInTau == amountOfContributions);
        currentTau = sortForTau();
        firstCommitInTau = lastCommitInTau ;
        lastCommitInTau = lastCommit;

        isUpgradeable = true;

    }

    function upgrade(uint32[] memory _upgrade) public {

        require(isUpgradeable, "Upgrade is not allowed");
        require(_upgrade.length == amountOfParameters, "Incorrect length of parameters");
        uint256 currentIndex = firstCommitInTau;
        for (uint i = 0; i<amountOfParameters; ++i) {
            parameters.push( _upgrade[i]);
        }

        startIndex.push(currentIndex+amountOfParameters);


        lastUpdateTime = block.timestamp;

        isUpgradeable = false;

        
    }



    function normModifier(uint256 norm, uint256 tau) public pure returns(uint256 ) {

        if(norm < tau) {
            return norm;
        } 
        else {
            return tau;
        }
    }

    function claimError(uint256 parameter, uint32[] memory upgrader) public {

        require(lastUpdateTime + timeToVerify > block.timestamp, "Too late" );
        require(verifyLine(parameter) == false, "Parameter does not give back false");
        upgradeFromClaim(upgrader);
        lastUpdateTime = block.timestamp;

    }


    function verifyLine(uint256 parameter) public view returns (bool) {
        require(parameter < amountOfParameters, "too big parameter");   
        uint256 change = uint16Max;
        for (uint i = firstCommitInTau ; i < lastCommitInTau ; ++i) {
            if(isBitOne(updatesSend[i], parameter)){
                change += normModifier(normalVector[i],currentTau);
            } else {
                change -= normModifier(normalVector[i],currentTau);
            }

        }
        uint256 value =  (change + parameters[parameter]-uint16Max);


        return (value == parameters[parameter+amountOfParameters]);
        

    }


    function isBitOne(uint256 b, uint256 pos) public pure returns (bool) {
        return ((b >> (amountOfParameters-1-pos)) & 1) == 1;
    }



    function sortForTau() public view returns (uint256 tau) {

        uint256[] memory arrayToSort = new uint256[](lastCommit-lastCommitInTau);
        for(uint i = 0; i < lastCommit-lastCommitInTau ; ++i){
            arrayToSort[i]= normalVector[i];
        }
        quickSort(arrayToSort, int(0), int(arrayToSort.length - 1));
        uint256 index = (arrayToSort.length * quantileForUpdates/100) - 1;
        tau = (arrayToSort[index] + arrayToSort[index+1])/2;

    }

     function upgradeFromClaim(uint32[] memory _upgrade) private {

        require(_upgrade.length == amountOfParameters, "Incorrect length of parameters");
        uint256 currentIndex = startIndex[startIndex.length-1];
        for (uint i = 0; i<amountOfParameters; ++i) {
            parameters[currentIndex +i] = _upgrade[i];
        }
        
    }


    function quickSort(uint256[] memory arr, int left, int right) private pure {
        int i = left;
        int j = right;
        if(i==j) return;
        uint256 pivot = arr[uint256(left + (right - left) / 2)];
        while (i <= j) {
            while (arr[uint256(i)] < pivot) i++;
            while (pivot < arr[uint256(j)]) j--;
            if (i <= j) {
                (arr[uint256(i)], arr[uint256(j)]) = (arr[uint256(j)], arr[uint256(i)]);
                i++;
                j--;
            }
        }
        if (left < j)
            quickSort(arr, left, j);
        if (i < right)
            quickSort(arr, i, right);
    }

    function getParamLength() public view returns (uint256){
        return parameters.length;
    }
    function updatesLength() public view returns (uint256){
        return updatesSend.length;
    }
    function normLength() public view returns (uint256){
        return normalVector.length;
    }
    


}