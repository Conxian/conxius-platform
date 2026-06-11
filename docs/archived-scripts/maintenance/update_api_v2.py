import os

file_path = "services/lib-conxian-core/gateway/src/api/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

new_services = """
            .service(pacs008_handler)
            .service(erp_sync_handler)
            .service(hsm_status_handler)
"""
if ".service(pacs008_handler)" not in content:
    content = content.replace(".service(nexus_state_handler)", ".service(nexus_state_handler)" + new_services)

handlers = """
#[get("/iso2022/pacs008/{tx_id}")]
async fn pacs008_handler(engine: web::Data<Engine>, path: web::Path<String>) -> impl Responder {
    let res = engine.get_pacs008_wrapper(&path.into_inner());
    HttpResponse::Ok().json(res)
}

#[get("/erp/sync")]
async fn erp_sync_handler(engine: web::Data<Engine>) -> impl Responder {
    let res = engine.sync_erp("SAP");
    HttpResponse::Ok().json(res)
}

#[get("/hsm/status")]
async fn hsm_status_handler(engine: web::Data<Engine>) -> impl Responder {
    let res = engine.get_hsm_status();
    HttpResponse::Ok().json(res)
}
"""

if "async fn pacs008_handler" not in content:
    content += handlers

with open(file_path, "w") as f:
    f.write(content)
