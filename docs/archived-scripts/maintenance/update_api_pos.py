import os

file_path = "services/lib-conxian-core/gateway/src/api/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

handlers = """
#[derive(Deserialize)]
struct OfflineAuthRequest {
    tx_hash: String,
    amount_msat: u64,
    biometric_attestation: String,
}

#[post("/pos/authorize")]
async fn pos_authorize_handler(
    engine: web::Data<Engine>,
    req: web::Json<OfflineAuthRequest>,
) -> impl Responder {
    let res = engine.authorize_offline_transaction(&req.tx_hash, req.amount_msat, &req.biometric_attestation);
    HttpResponse::Ok().json(res)
}

#[get("/pos/queue")]
async fn pos_queue_handler(engine: web::Data<Engine>) -> impl Responder {
    let res = engine.get_offline_queue();
    HttpResponse::Ok().json(res)
}

#[get("/pos/mesh-status")]
async fn pos_mesh_handler(engine: web::Data<Engine>) -> impl Responder {
    let res = engine.get_mesh_status();
    HttpResponse::Ok().json(res)
}
"""

if "pos_authorize_handler" not in content:
    config_pos = content.find("pub fn config(cfg: &mut web::ServiceConfig)")
    content = content[:config_pos] + handlers + "\n" + content[config_pos:]

# Register in config
routes = """
            .service(pos_authorize_handler)
            .service(pos_queue_handler)
            .service(pos_mesh_handler)
"""

if ".service(pos_authorize_handler)" not in content:
    content = content.replace(".service(verify_intent_handler)", ".service(verify_intent_handler)" + routes)

with open(file_path, "w") as f:
    f.write(content)
