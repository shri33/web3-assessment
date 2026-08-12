const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const killPort = require('kill-port');
const { ethers } = require('ethers');

require('dotenv').config();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

const checkPort = async (port, maxPort = 65535) => {

    if (port > maxPort) {
        throw new Error("No available ports found");
    }

    try {
        await killPort(port, "tcp");
        await killPort(port, "udp");
        return port;
    } catch (err) {
        return checkPort(port + 1, maxPort);
    }
};

(async () => {
    const safePort = await checkPort(PORT);
    const getPort = (await import('get-port')).default; // dynamic import
    const final_port = await getPort({ port: safePort });

    console.log(`Port ${final_port} is free. Ready to start server.`);

    // Middleware
    app.use(cors({ origin: `http://localhost:${final_port}` }));
    app.use(express.json());
    app.use(morgan('dev'));

    // Routes
    app.use('/api/items', require('./routes/items'));
    app.use('/api/stats', require('./routes/stats'));

    app.get('/api/ShrisApiTest', async (req, res) => {
        try {
            // Use a lightning-fast, free public node that doesn't require an API key
            const provider = new ethers.JsonRpcProvider('https://ethereum-rpc.publicnode.com');
            
            // Vitalik's public Ethereum address
            const vitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
            
            // Fetch balance from the blockchain
            const balanceWei = await provider.getBalance(vitalikAddress);
            const balanceEth = ethers.formatEther(balanceWei);
            
            // Log to console as required by the assignment
            console.log(`[ShrisApiTest] Fetched Vitalik's balance: ${balanceEth} ETH`);
            
            res.json({
                success: true,
                address: vitalikAddress,
                balanceEth: balanceEth,
                message: "Data fetched successfully from Ethereum Mainnet"
            });
        } catch (error) {
            console.error('[ShrisApiTest] Error fetching data:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route    [HTTP_METHOD] /api/endpoint
     * @desc     [Short summary of what this endpoint does, e.g., Reads or sets value in smart contract]
     * @author   [Your Name]
     * @access   [public/private/auth-required]
     * @param    {Request}  req  - Express request object. [Describe relevant body/query/params fields]
     * @param    {Response} res  - Express response object.
     * @returns  {JSON}          [Describe the JSON structure returned]
     * @throws   [Error conditions, e.g., 400 on invalid input, 500 on contract failure]
     *
     * @example
     * // Example request
     * curl -X POST http://localhost:3001/contract/value -H "Content-Type: application/json" -d '{"value": 42}'
     *
     * // Example response
     * {
     *   "message": "Value updated",
     *   "txHash": "0x..."
     * }
     */

    require('./config/dbHandler.js').connect();

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
        app.use(express.static('client/build'));
        app.get('*', (req, res) => {
            res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
        });
    }

    // Start server
    app.listen(final_port, () => {
        console.log(`Backend running on http://localhost:${final_port}`);
    });
})();