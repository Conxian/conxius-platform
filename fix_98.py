// src/main.rs

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use tokio::task;

#[derive(Debug)]
struct Transaction {
    hash: String,
    signature: String,
}

#[derive(Debug)]
struct TEE {
    cached_transactions: Arc<Mutex<HashMap<String, Transaction>>>,
}

impl TEE {
    fn new() -> Self {
        TEE {
            cached_transactions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn cache_transaction(&self, transaction: Transaction) {
        let mut cached_transactions = self.cached_transactions.lock().unwrap();
        cached_transactions.insert(transaction.hash.clone(), transaction);
    }

    fn sign_offline_receipt(&self, transaction_hash: &str) -> String {
        // Simulate TEE signing
        format!("SignedReceipt-{}", transaction_hash)
    }
}

#[derive(Debug)]
struct MeshNetwork {
    peers: Vec<String>,
    tx: mpsc::Sender<String>,
}

impl MeshNetwork {
    fn new(peers: Vec<String>) -> Self {
        let (tx, _rx) = mpsc::channel(100);
        MeshNetwork { peers, tx }
    }

    async fn broadcast_transaction(&self, transaction_hash: &str) {
        for _ in 0..self.peers.len() {
            self.tx.send(transaction_hash.to_string()).await.unwrap();
        }
    }
}

async fn handle_transaction(
    tee: Arc<TEE>,
    mesh_network: Arc<MeshNetwork>,
    transaction: Transaction,
) {
    tee.cache_transaction(transaction.clone());
    mesh_network.broadcast_transaction(&transaction.hash).await;
    let signed_receipt = tee.sign_offline_receipt(&transaction.hash);
    println!("Signed Receipt: {}", signed_receipt);
}

#[tokio::main]
async fn main() {
    let tee = Arc::new(TEE::new());
    let mesh_network = Arc::new(MeshNetwork::new(vec![
        "peer1".to_string(),
        "peer2".to_string(),
        "peer3".to_string(),
    ]));

    let transactions = vec![
        Transaction {
            hash: "tx1".to_string(),
            signature: "sig1".to_string(),
        },
        Transaction {
            hash: "tx2".to_string(),
            signature: "sig2".to_string(),
        },
    ];

    for transaction in transactions {
        let tee_clone = tee.clone();
        let mesh_network_clone = mesh_network.clone();
        task::spawn(async move {
            handle_transaction(tee_clone, mesh_network_clone, transaction).await;
        });
    }

    // Simulate 48 hours of network blackout
    tokio::time::sleep(tokio::time::Duration::from_secs(172800)).await;

    // Simulate reconnection and state reconciliation
    println!("Network reconnected, reconciling state...");
}