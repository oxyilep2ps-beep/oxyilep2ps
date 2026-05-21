/**
 * Placeholder Oxyile Handshake contract on Polygon Amoy (testnet).
 * Deploy with Remix/Hardhat and set POLYGON_HANDSHAKE_CONTRACT in .env.local
 */
export const HANDSHAKE_CONTRACT_ABI = [
  'function mintAgreement(string handshakeId,address lender,address borrower,uint256 amount,uint256 interestRateBps,uint256 durationMonths) returns (bytes32)',
  'event AgreementMinted(string indexed handshakeId,address indexed lender,address indexed borrower,uint256 amount)',
] as const;

/** Sandbox placeholder — replace after deploying your contract to Amoy */
export const PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY =
  '0x0000000000000000000000000000000000000001';
