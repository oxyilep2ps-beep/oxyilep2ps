'use client';

import { useCallback, useState } from 'react';
import { BrowserProvider, type JsonRpcSigner } from 'ethers';
import {
  getEscrowMaticAmount,
  getPlatformEscrowWallet,
  POLYGON_AMOY_CHAIN_ID,
  POLYGON_AMOY_CHAIN_ID_HEX,
  POLYGON_AMOY_NETWORK,
} from '@/lib/web3/polygon-amoy';
import { getEthereumProvider, isUserRejectedError } from '@/lib/web3/ethereum-provider';

export type PolygonWeb3State = {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
};

export function usePolygonWeb3() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureAmoyNetwork = useCallback(async (provider: ReturnType<typeof getEthereumProvider>) => {
    if (!provider) throw new Error('MetaMask is not installed');

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY_CHAIN_ID_HEX }],
      });
    } catch (switchError: unknown) {
      const code = (switchError as { code?: number })?.code;
      if (code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [POLYGON_AMOY_NETWORK],
        });
        return;
      }
      throw switchError;
    }
  }, []);

  const getProviderAndSigner = useCallback(async (): Promise<{
    provider: BrowserProvider;
    signer: JsonRpcSigner;
    address: string;
  }> => {
    const eth = getEthereumProvider();
    if (!eth) {
      throw new Error('MetaMask (or a Web3 wallet) is required. Please install MetaMask to continue.');
    }

    await ensureAmoyNetwork(eth);

    const provider = new BrowserProvider(eth);
    const network = await provider.getNetwork();
    const numericChainId = Number(network.chainId);

    if (numericChainId !== POLYGON_AMOY_CHAIN_ID) {
      throw new Error(`Wrong network. Please switch to Polygon Amoy Testnet (Chain ID ${POLYGON_AMOY_CHAIN_ID}).`);
    }

    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();

    setAddress(signerAddress);
    setChainId(numericChainId);

    return { provider, signer, address: signerAddress };
  }, [ensureAmoyNetwork]);

  const connectWallet = useCallback(async (): Promise<string> => {
    setConnecting(true);
    setError(null);

    try {
      const eth = getEthereumProvider();
      if (!eth) {
        throw new Error('MetaMask is not installed. Add MetaMask to complete the on-chain escrow deposit.');
      }

      await eth.request({ method: 'eth_requestAccounts' });
      const { address: connected } = await getProviderAndSigner();
      return connected;
    } catch (err) {
      const message = isUserRejectedError(err)
        ? 'Wallet connection was rejected. Approve the MetaMask request to continue.'
        : err instanceof Error
          ? err.message
          : 'Could not connect wallet';
      setError(message);
      throw new Error(message);
    } finally {
      setConnecting(false);
    }
  }, [getProviderAndSigner]);

  const sendEscrowDeposit = useCallback(
    async (handshakeReference: string): Promise<string> => {
      const escrowWallet = getPlatformEscrowWallet();
      if (!escrowWallet) {
        throw new Error(
          'Platform escrow wallet is not configured. Set NEXT_PUBLIC_PLATFORM_ESCROW_WALLET in your environment.'
        );
      }

      const { signer } = await getProviderAndSigner();
      const { parseEther, hexlify, toUtf8Bytes } = await import('ethers');
      const maticAmount = getEscrowMaticAmount();

      const tx = await signer.sendTransaction({
        to: escrowWallet,
        value: parseEther(maticAmount),
        data: hexlify(toUtf8Bytes(`OXYILE-ESCROW-${handshakeReference}`)),
      });

      const receipt = await tx.wait();
      const hash = receipt?.hash ?? tx.hash;

      if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        throw new Error('Transaction completed but no valid hash was returned.');
      }

      return hash;
    },
    [getProviderAndSigner]
  );

  return {
    address,
    chainId,
    connecting,
    error,
    isAmoy: chainId === POLYGON_AMOY_CHAIN_ID,
    connectWallet,
    getProviderAndSigner,
    sendEscrowDeposit,
    clearError: () => setError(null),
  };
}
