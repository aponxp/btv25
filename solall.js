const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Telegram bot token and chat ID
const botToken = 'Telegram Bot Token'; 
const chatId = 'Telegram Group ID'; // Replace with your chat ID
const bot = new TelegramBot(botToken, { polling: true });

// List of wallet addresses to monitor
const walletAddresses = [
  '5QkLK4hPGN9KhqL5kcWq4DHzSmSrpAb88DyW8qUih5mG',
'BTDNuFyZWSurHX78gbLMT4cGJxZrsuAbdvVfvtCvgYoA',
'GgLy9wTYSvFzLee5bxbk6b5SwaAif4y6cfV8TcPZSiPj',

];

// RPC endpoint for Solana
const solanaRpcEndpoint = 'https://api.mainnet-beta.solana.com'; // Mainnet RPC endpoint

// Tokens to monitor (add mint addresses and decimals for each token)
const tokens = [
    { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
    { symbol: 'PENGU', mint: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv', decimals: 6 },
    { symbol: 'WENX', mint: 'ADCSsqzufAJNnDBHXsX89M9T6NCGndBHLwLG55FQJn3u', decimals: 5 },
    { symbol: 'ME', mint: 'MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u', decimals: 6 },
    { symbol: 'CDOGE', mint: 'FXJAdx38aXJdQd3ABAVu7fQ7Bjh9oMN92eTxszFNpump', decimals: 6 },
    { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 },
    { symbol: 'ZEUS', mint: 'ZEUS1aR7aX8DFFJf5QjWj2ftDDdNTroMNGo8YoQm3Gq', decimals: 6 },
    { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    { symbol: 'UPT', mint: 'UPTx1d24aBWuRgwxVnFmX4gNraj3QGFzL3QqBgxtWQG', decimals: 9 },
    { symbol: 'ACT', mint: 'GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump', decimals: 6 },
    { symbol: 'HAWK', mint: 'HAWKThXRcNL9ZGZKqgUXLm4W8tnRZ7U6MVdEepSutj34', decimals: 6 },
    { symbol: 'Grass', mint: 'Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs', decimals: 9 }, // Replace with actual mint address
];

// Monitoring constants
const BALANCE_CHECK_INTERVAL = 4000; // 5 seconds

// Fetch native SOL balance
async function getSolBalance(walletAddress) {
    try {
        const response = await axios.post(solanaRpcEndpoint, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [walletAddress],
        });

        if (response.data && response.data.result) {
            const balanceInLamports = response.data.result.value; // Balance is in lamports
            const balanceInSol = balanceInLamports / 1e9; // Convert lamports to SOL
            console.log(`Fetched SOL balance: ${balanceInSol.toFixed(4)} SOL`);
            return balanceInSol;
        }
    } catch (error) {
        console.error(`Error fetching SOL balance for ${walletAddress}: ${error.message}`);
    }
    return null;
}

// Fetch token balances
async function getTokenBalances(walletAddress) {
    const balances = [];
    try {
        const response = await axios.post(solanaRpcEndpoint, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccountsByOwner',
            params: [
                walletAddress,
                { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, // Token program ID
                { encoding: 'jsonParsed' },
            ],
        });

        if (response.data && response.data.result && response.data.result.value) {
            const accounts = response.data.result.value;

            for (const token of tokens) {
                const tokenAccount = accounts.find(
                    (account) => account.account.data.parsed.info.mint === token.mint
                );

                if (tokenAccount) {
                    const rawBalance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
                    balances.push({ symbol: token.symbol, balance: rawBalance }); // Use uiAmount directly
                }
            }
        }
    } catch (error) {
        console.error(`Error fetching token balances for ${walletAddress}: ${error.message}`);
    }
    return balances;
}


// Send Telegram notification
async function sendNotification(message) {
    console.log('Sending Telegram notification:', message);
    try {
        await bot.sendMessage(chatId, message);
    } catch (error) {
        console.error('Error sending Telegram message:', error.message);
    }
}

// Process a single wallet address
async function processAddress(walletAddress) {
    let message = `🟨 Solana Network Found:\n${walletAddress}\nBalance:\n`;
    let hasBalance = false;

    // Fetch SOL balance
    const solBalance = await getSolBalance(walletAddress);
    if (solBalance !== null && solBalance > 0.00001) {
        message += `🔸SOL: ${solBalance.toFixed(4)}\n`;
        hasBalance = true;
    }

    // Fetch token balances
    const tokenBalances = await getTokenBalances(walletAddress);
    for (const tokenBalance of tokenBalances) {
        if (tokenBalance.balance > 0.00001) { // Set a threshold for token balances
            message += `🔸${tokenBalance.symbol}: ${tokenBalance.balance.toFixed(4)}\n`;
            hasBalance = true;
        }
    }

    // Send message if significant balance found
    if (hasBalance) {
        await sendNotification(message);
    } else {
        console.log(`No significant balance for wallet: ${walletAddress}`);
    }
}

// Monitor wallets
async function monitorWallets() {
    console.log('🔸 Monitoring wallets...');
    for (const walletAddress of walletAddresses) {
        console.log(`Checking balance for wallet: ${walletAddress}`);
        await processAddress(walletAddress);
        await new Promise((resolve) => setTimeout(resolve, BALANCE_CHECK_INTERVAL));
    }
    console.log('🔸 Monitoring complete.');
    await sendNotification('| Solana Network | Monitoring Complete.');
}

// Start monitoring
console.log('🔸 Solana Network Monitoring Server Started.');
sendNotification('| Solana Network | Monitoring Server Started.')
    .then(() => monitorWallets())
    .catch((error) => console.error('Error initializing server:', error));
