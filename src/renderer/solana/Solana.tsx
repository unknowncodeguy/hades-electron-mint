import * as bs58 from 'bs58';
import * as web3 from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import * as cmv2 from './candy-machine';
import fetch from "node-fetch";
import HttpsProxyAgent from "https-proxy-agent";
import { getCandyMachineMEState, mintOneMEToken } from './candy-machine-me';

const magicEdenApiUrl = 'https://api-mainnet.magiceden.io';
const metaplexDevRpcUrl = 'https://metaplex.devnet.rpcpool.com/';

export function VerifyPrivateKey(privateKey: any) {
    try {
        const privateKeyAsBuffer = bs58.decode(privateKey);
        const fromSecretKey = new Uint8Array(privateKeyAsBuffer);
        web3.Keypair.fromSecretKey(fromSecretKey);

        return true;
    } catch {
        return false;
    }
}

export async function WalletDetails(privateKey: any, rpcUrl: string, isDevelopment: boolean) {
    try {
        var connection = null;
        if (isDevelopment) {
            connection = new web3.Connection(
                metaplexDevRpcUrl,
                'confirmed',
            );
        } else {
            connection = new web3.Connection(
                rpcUrl ? rpcUrl : web3.clusterApiUrl("mainnet-beta"),
                'confirmed',
            );
        }

        var fromKeypair = null;

        if (privateKey !== '') {
            const privateKeyAsBuffer = bs58.decode(privateKey);
            const fromSecretKey = new Uint8Array(privateKeyAsBuffer);
    
            fromKeypair = web3.Keypair.fromSecretKey(fromSecretKey);
        } else {
            fromKeypair = web3.Keypair.generate();
        }
    
        var balance = await connection.getBalance(fromKeypair.publicKey);
        balance = balance / web3.LAMPORTS_PER_SOL;
        return {
            address: fromKeypair.publicKey.toBase58(),
            balance
        };
    } catch (e) {
        return null;
    }
}

export async function CandyMachine(fromWallet: anchor.Wallet, candyMachineId: any, rpcUrl: string, isDevelopment: any) {
    try {
        var connection = null;
        if (isDevelopment) {
            connection = new web3.Connection(
                metaplexDevRpcUrl,
                'confirmed',
            );
        } else {
            connection = new web3.Connection(
                rpcUrl ? rpcUrl : web3.clusterApiUrl("mainnet-beta"),
                'confirmed',
            );
        }
    
        const candyMachine = await cmv2.getCandyMachineState(fromWallet, candyMachineId, connection);
        return candyMachine;
    } catch (e) {
        return null;
    }
}

export async function MintToken(candyMachineId: any, rpcUrl: any, isDevelopment: any, privateKey: any) {
    try {
        const privateKeyAsBuffer = bs58.decode(privateKey);
        const fromSecretKey = new Uint8Array(privateKeyAsBuffer);
        let fromKeypair = web3.Keypair.fromSecretKey(fromSecretKey);
        const fromWallet = new anchor.Wallet(fromKeypair);

        const candyMachine = await CandyMachine(fromWallet, candyMachineId, rpcUrl, isDevelopment);
        console.log('c', candyMachine);
        if (candyMachine !== null) {
            if (candyMachine.state.isActive && !candyMachine.state.isSoldOut) {
                const candyMachineId = new web3.PublicKey(candyMachine.id);
                const txn = await cmv2.mintOneToken(candyMachine, fromKeypair.publicKey, candyMachineId);
                return txn;
            } else {
                return null;
            }
        }
        return null;
    } catch (e) {
        console.log(`MintToken -- error -- e: ${e}`);
        return null;
    }
}

export async function MintMEToken(candyMachineId: any, rpcUrl: any, privateKey: any) {
    try {
        const privateKeyAsBuffer = bs58.decode(privateKey);
        const fromSecretKey = new Uint8Array(privateKeyAsBuffer);
        let fromKeypair = web3.Keypair.fromSecretKey(fromSecretKey);
        const fromWallet = new anchor.Wallet(fromKeypair);
        let connection = new anchor.web3.Connection(rpcUrl);
        const candyMachine = await getCandyMachineMEState(fromWallet, new anchor.web3.PublicKey(candyMachineId), connection);
        if (candyMachine !== null) {
            if (!candyMachine?.state?.isSoldOut) {
                const candyMachineId = new web3.PublicKey(candyMachine.id);
                const txn = await mintOneMEToken(candyMachine, candyMachine.state.config, fromKeypair.publicKey, candyMachine.state.treasury);
                return txn;
            } else {
                console.log(`SOLD OUT`);
                return null;
            }
        }
        return null;
    } catch (e) {
        console.log(`MintToken -- error -- e: ${e}`);
        
        return null;
    }
}

export async function MEDetails() {
    const agent = HttpsProxyAgent(`http://galbanese91_gmail_com:UYBYEpXgMW@65.215.107.172:3128`);

    const res = await fetch(`${magicEdenApiUrl}/launchpad_collections`, {
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostmanRunetime/7.29.0',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
        },
        agent
    });
    if (res.status === 200) {
        const jsonRes = await res.json();
        return jsonRes;
    }

    return res;
}

export async function ME_AccountInfo() {
    const agent = HttpsProxyAgent(`http://galbanese91_gmail_com:UYBYEpXgMW@65.215.107.172:3128`);

    const body = JSON.stringify(
        {
            "response": "2EE2Hhoe8fVAYn7J5qwuayNmrEgmTPskLyszojv",
            "message": "HeAAwA6UY4e5strw4Eg5SgpDkEmuM4SXTBvwnf7yiUzuofj5sXboQ8e3kmw16v1xQYVF3h9WgHqcyz4HRHbEM7xJpdJMzjBRZdE9YutSqpnctbHC53opqSYnCdXW6vffKMTS93vXH1bNETbgbmzYFn6sUvkzQf86L8PvpUsr5f8VCGKc4sNrXpVDsGCQmvVt7QjsosPbmoXN9SDsnZcWTsZgVYDoQezoFz5wc5Rh2v8pvQK8WAnymfhqJWnki6qvggxfLkrjJ1g8zFsayuGUTnnbZJcokA9BRoxVXwFPcY52fwwz76Hic65gr5BCS7TigXKLqvTDXts8Aab8mzwDEgRukXvZebMCfMEFMjn2Hic7wCBdBMtuu6a5sJaFGvppvyQai2BQNmR93kQZHcJxqLgzy8Qcekf1137YQKMUz69ogbNKqPFmZ45BJmtssrA8vZtyGormM1KEwF6djz1quBkKPn7rZuuUDdpPVt9tgM1i8Ei7dL6XjtJxiKKVyRcrYWLuGfATkfw9erqWnXY71BiYDu6Hu6p77USkGERpyzPKGUuwQJvuzdaXjW1tT6s4FHQrbMyJ91X362x1ZNL4x3JTjWDJ6zuk7DXav7tCwfMc9EDNHWrV9GBf5AS31rgkN61CPyc4s5KRt9F6mqsooAwpL9Xh8hfc8FAyz5SsjtHE9Gh5oRxAhSUwyjFhyL5mSFn1KE6PYobbeyq3K3vmdQu8EAWBGThjWWaJ8DUMaicWgkdYHTgnNspJC6QtZGrfe3VhHg3wHcAo6TJSMsmwgJnpwWLxYpaWUuwMGN4D2SRoTCEATN2CU6GdReWL5svVFcQh7HvHR3yrHconKRi7FHHi5shrPSfRm7Ukd65tD5fc3tYe6rQmBWBuYDKziqS4y5fCCe8fNRdsMumsMbArvN3vp6qKdj7scQua1xioY2z4tqpo6R4bYwH4wf7cPooEeaqU7h49Ps2V1F9ohe35PA75FDWGELEQbsZaxFBMEyNYcr7eFkKvJpQm6wSrESVt9rAKfdcxHPDSvAFMADUDiRMRdZreZzZFqC7vMHH57bh9Cds6KFgJQJXcPp4rzBgS1WsVkezuFEF4dEui8S7HsfDzX4S8UuVx9Qew8tw73yFpasCaPG9WAXfHg"
        }
    );

    const res = await fetch(`https://wk-notary-prod.magiceden.io/sign`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostmanRunetime/7.29.0',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
        },
        agent,
        body
    });
    if (res.status === 200) {
        const jsonRes = await res.json();
        return jsonRes;
    }

    return res;
}