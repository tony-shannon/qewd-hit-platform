docker run -it --name orchestrator --rm --network qewd-hit -p 8080:8080 -v ~/qewd-hit-platform/main:/opt/qewd/mapped rtweed/qewd-server
docker run -it --name oidc_provider --rm --network qewd-hit -p 8081:8080 -v ~/qewd-hit-platform/oidc-provider:/opt/qewd/mapped rtweed/qewd-server
docker run -it --name oidc-client --rm --network qewd-hit -v ~/qewd-hit-platform/oidc-client:/opt/qewd/mapped -e mode="microservice" rtweed/qewd-server
docker run -it --name mpi_service --rm --network qewd-hit -v ~/qewd-hit-platform/fhir-mpi:/opt/qewd/mapped -e mode="microservice" rtweed/qewd-server
docker run -it --name openehr_service --rm --network qewd-hit -v ~/qewd-hit-platform/openehr-ms:/opt/qewd/mapped -e mode="microservice" rtweed/qewd-server
docker run -it --name audit_service --rm --network qewd-hit -v ~/qewd-hit-platform/audit-ms:/opt/qewd/mapped -e mode="microservice" rtweed/qewd-server
docker run -it --rm --name ethercis-db --net ecis-net -p 5432:5432 rtweed/ethercis-db
docker run -it --rm --name ethercis-server --net ecis-net -e DB_IP=ethercis-db -e DB_PORT=5432 -e DB_USER=postgres -e DB_PW=postgres -p 8082:8080 rtweed/ethercis-server

