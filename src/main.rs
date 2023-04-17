use anyhow::{anyhow};
use cln_rpc::{model::GetinfoRequest, ClnRpc, Request};
use std::path::Path;
use tokio;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {


    let rpc_path = "/Users/nitesh/.polar/networks/1/volumes/c-lightning/bob/lightningd/regtest/lightning-rpc";
    let p = Path::new(&rpc_path);

    let mut rpc = ClnRpc::new(p).await?;
    let response = rpc
        .call(Request::Getinfo(GetinfoRequest {}))
        .await
        .map_err(|e| anyhow!("Error calling getinfo: {:?}", e))?;
    
    println!("{}", serde_json::to_string_pretty(&response)?);
    Ok(())
}