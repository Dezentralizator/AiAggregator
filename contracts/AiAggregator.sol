// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.11;

/// @title Ai Aggregator
/// @author Dezentralizator/ Benoit Fontannaz
/// @notice Aggregator contract to updates AIs decentrally
/// @dev Allows people to contribute decentrally to an AI


contract Aggregator {

    uint256 private constant amountOfParameters = 32; //amount of params
    uint256 private constant sizeOfParameters = 16; // size of info
    uint256 private constant bytes32Amounts = (amountOfParameters / sizeOfParameters) + 1;
    uint256 private constant uint256Amounts = (amountOfParameters / 256) + 1;

    uint256 private constant bytesLength = amountOfParameters/8;
    uint256 private constant amountOfContributions = 3;
    uint256 private constant uint16Max = 65536;

    uint256 private constant quantileForUpdates = 95;



    uint256[] startIndexParameterOfVersion;

    uint256[] updatesSend;
    uint256[] normalVector;
    uint16[] public  parameters;

    bool private isInitiated;

    mapping(uint256 => address) committers;

    uint256 public lastCommit;
    uint256 public firstCommitInTau;
    uint256 public lastCommitInTau;

    uint256 public currentTau;
    uint256 public lastUpdateTime;
    bool public isUpgradeable;




    function init(uint16[] calldata _array) public {

        require(!isInitiated);
        require(_array.length == amountOfParameters);
        parameters = _array;
        isInitiated = true;
        startIndexParameterOfVersion.push(0);

    }


    function pushYourUpdate(uint256 input, uint256 normal) public {

        committers[lastCommit] = msg.sender;
        updatesSend.push(input);
        normalVector.push(normal);
        lastCommit += 1;

    }

    function setTauAndUpdate() public {

        require(lastCommit-lastCommitInTau > amountOfContributions);
        currentTau = sortForTau();
        firstCommitInTau = lastCommitInTau + 1;
        lastCommitInTau = lastCommit;

        isUpgradeable = true;

    }

    function upgrade(uint16[] memory _upgrade) public {

        require(isUpgradeable);
        require(_upgrade.length == amountOfParameters);
        uint256 nextIndex = startIndexParameterOfVersion[startIndexParameterOfVersion.length-1];
        for (uint i = 0; i<amountOfParameters; ++i) {
            parameters[i+nextIndex] = _upgrade[i];
        }

        startIndexParameterOfVersion.push(nextIndex+amountOfParameters);
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

    function claimError(uint256 parameter, uint16[] memory upgrader) public {

        require(verifyLine(parameter) == false);
        isUpgradeable = true;
        upgrade(upgrader);

    }


    function verifyLine(uint256 parameter) public view returns (bool) {

        uint256 tau = currentTau;
        uint256 change = uint16Max;
        for (uint i = 0 ; i < amountOfContributions ; ++i) {
            if(isBitOne(updatesSend[firstCommitInTau+i], parameter)){
                change + normModifier(normalVector[firstCommitInTau+i],tau);
            } else {
                change - normModifier(normalVector[firstCommitInTau+i],tau);
            }

        }

        uint256 start = startIndexParameterOfVersion[startIndexParameterOfVersion.length-2];

        if(change > uint16Max){

            return uint16(change-uint16Max + parameters[start+parameter]) == parameters[start+parameter+32];

        } else {

            return uint16(uint16Max-change + parameters[start+parameter]) == parameters[start+parameter+32];


        }

    }


    function isBitOne(uint256 b, uint256 pos) public pure returns (bool) {
        return ((b >> pos) & 1) == 1;
    }



    function sortForTau() public view returns (uint256 tau) {

        uint256[] memory arrayToSort = new uint256[](lastCommitInTau-lastCommit);
        for(uint i = 0; i < lastCommitInTau-lastCommit ; ++i){
            arrayToSort[i]= normalVector[i];
        }
        quickSort(arrayToSort, int(0), int(arrayToSort.length - 1));
        uint256 index = arrayToSort.length * 3 / 4;
        tau = (arrayToSort[index] + arrayToSort[index+1])/2;

    }

    function quickSort(uint256[] memory arr, int left, int right) internal pure {
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
    


}