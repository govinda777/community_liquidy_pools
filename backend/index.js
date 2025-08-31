const express = require('express');
const { ethers } = require('ethers');
const LiquidityPoolArtifact = require('../artifacts/contracts/LiquidityPool.sol/LiquidityPool.json');

const app = express();
app.use(express.json());
const port = 3001;

const contractAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
const contractABI = LiquidityPoolArtifact.abi;

const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
// This is the default private key for the first account in the Hardhat node
const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const signer = new ethers.Wallet(privateKey, provider);

const liquidityPool = new ethers.Contract(contractAddress, contractABI, signer);

app.post('/pools', async (req, res) => {
    const { token } = req.body;
    try {
        const tx = await liquidityPool.createPool(token);
        await tx.wait();
        res.status(201).send({ success: true, txHash: tx.hash });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});

app.post('/pools/:id/contribute', async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    try {
        const tx = await liquidityPool.contribute(id, amount);
        await tx.wait();
        res.status(200).send({ success: true, txHash: tx.hash });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});

app.get('/pools/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await liquidityPool.pools(id);
        const totalContributions = await liquidityPool.getTotalContributions(id);
        res.status(200).send({
            token: pool.token,
            totalContributions: totalContributions.toString(),
        });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});

app.get('/pools/:id/contributions/:user', async (req, res) => {
    const { id, user } = req.params;
    try {
        const contribution = await liquidityPool.getContribution(id, user);
        res.status(200).send({ contribution: contribution.toString() });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
});


app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
