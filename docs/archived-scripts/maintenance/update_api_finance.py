import os

file_path = "services/lib-conxian-core/gateway/src/api/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

handlers = """
#[get("/finance/ops-loans")]
async fn ops_loans_handler(engine: web::Data<Engine>) -> impl Responder {
    let res = engine.get_ops_loans();
    HttpResponse::Ok().json(res)
}

#[derive(Deserialize)]
struct VerifyIntentRequest {
    loan_id: String,
    guardian: String,
}

#[post("/finance/verify-intent")]
async fn verify_intent_handler(
    engine: web::Data<Engine>,
    req: web::Json<VerifyIntentRequest>,
) -> impl Responder {
    let res = engine.verify_loan_intent(&req.loan_id, &req.guardian);
    HttpResponse::Ok().json(res)
}
"""

if "ops_loans_handler" not in content:
    config_pos = content.find("pub fn config(cfg: &mut web::ServiceConfig)")
    content = content[:config_pos] + handlers + "\n" + content[config_pos:]

# Register in config
routes = """
            .service(ops_loans_handler)
            .service(verify_intent_handler)
"""

if ".service(ops_loans_handler)" not in content:
    content = content.replace(".service(secure_action_handler)", ".service(secure_action_handler)" + routes)

with open(file_path, "w") as f:
    f.write(content)
