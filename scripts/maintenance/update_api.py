import os

file_path = "services/lib-conxian-core/gateway/src/api/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Add handlers to config
new_services = """
            .service(ai_allocation_handler)
            .service(ubi_identity_handler)
            .service(nexus_state_handler)
"""
if ".service(ai_allocation_handler)" not in content:
    content = content.replace(".service(risk_assessment_handler)", ".service(risk_assessment_handler)" + new_services)

# Add handler functions
handlers = """
#[derive(Deserialize)]
struct ProfileQuery {
    profile: String,
}

#[get("/ai/allocation")]
async fn ai_allocation_handler(engine: web::Data<Engine>, query: web::Query<ProfileQuery>) -> impl Responder {
    let res = engine.get_ai_allocation(&query.profile);
    HttpResponse::Ok().json(res)
}

#[get("/identity/ubi/{id}")]
async fn ubi_identity_handler(engine: web::Data<Engine>, path: web::Path<String>) -> impl Responder {
    let res = engine.get_ubi_identity(&path.into_inner());
    HttpResponse::Ok().json(res)
}

#[get("/nexus/state")]
async fn nexus_state_handler(engine: web::Data<Engine>) -> impl Responder {
    let res = engine.get_nexus_state();
    HttpResponse::Ok().json(res)
}
"""

if "async fn ai_allocation_handler" not in content:
    content += handlers

with open(file_path, "w") as f:
    f.write(content)
