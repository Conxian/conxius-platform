import os

file_path = "services/lib-conxian-core/gateway/src/api/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

handlers = """
#[get("/wallet/sovereign/{address}")]
async fn sovereign_wallet_handler(
    engine: web::Data<Engine>,
    path: web::Path<String>,
) -> impl Responder {
    let res = engine.get_sovereign_wallet(&path.into_inner());
    HttpResponse::Ok().json(res)
}

#[derive(Deserialize)]
struct SecureActionRequest {
    address: String,
    tx_id: String,
}

#[post("/wallet/secure-action")]
async fn secure_action_handler(
    engine: web::Data<Engine>,
    req: web::Json<SecureActionRequest>,
) -> impl Responder {
    let res = engine.execute_secure_alex_action(&req.address, &req.tx_id);
    HttpResponse::Ok().json(res)
}
"""

if "sovereign_wallet_handler" not in content:
    config_pos = content.find("pub fn config(cfg: &mut web::ServiceConfig)")
    content = content[:config_pos] + handlers + "\n" + content[config_pos:]

# Register in config
routes = """
            .service(sovereign_wallet_handler)
            .service(secure_action_handler)
"""

if ".service(sovereign_wallet_handler)" not in content:
    content = content.replace(".service(alex_tx_handler)", ".service(alex_tx_handler)" + routes)

with open(file_path, "w") as f:
    f.write(content)
