// Public interface definition for the Promethios supply policy on Ethereum (the base-chain)
interface IPromethios {
    function epoch() external view returns (uint256);

    function lastRebaseTimestampSec() external view returns (uint256);

    function inRebaseWindow() external view returns (bool);

    function globalPromethiosEpochAndFIRESupply() external view returns (uint256, uint256);
}
