import os

file_path = "services/lib-conxian-core/gateway/src/api/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

handlers = """
#[get("/alex/readiness")]
async fn alex_readiness_handler(engine: web::Data<Engine>) -> impl Responder {
    let res = engine.get_alex_readiness();
    HttpResponse::Ok().json(res)
}

#[derive(Deserialize)]
struct AlexQuoteRequest {
    from: String,
    to: String,
    amount: f64,
}

#[get("/alex/quote")]
async fn alex_quote_handler(
    engine: web::Data<Engine>,
    query: web::Query<AlexQuoteRequest>,
) -> impl Responder {
    let res = engine.get_alex_quote(&query.from, &query.to, query.amount);
    HttpResponse::Ok().json(res)
}

#[derive(Deserialize)]
struct AlexTxRequest {
    from: String,
    to: String,
    amount: u64,
    min_out: u64,
}

#[post("/alex/construct-tx")]
async fn alex_tx_handler(
    engine: web::Data<Engine>,
    req: web::Json<AlexTxRequest>,
) -> impl Responder {
    let res = engine.construct_alex_tx(&req.from, &req.to, req.amount, req.min_out);
    HttpResponse::Ok().json(res)
}
"""

if "alex_readiness_handler" not in content:
    # Insert before the config function
    config_pos = content.find("pub fn config(cfg: &mut web::ServiceConfig)")
    content = content[:config_pos] + handlers + "\n" + content[config_pos:]

# Register in config
routes = """
            .service(alex_readiness_handler)
            .service(alex_quote_handler)
            .service(alex_tx_handler)
"""

if ".service(alex_readiness_handler)" not in content:
    content = content.replace(".service(status_handler)", ".service(status_handler)" + routes)

with open(file_path, "w") as f:
    f.write(content)
