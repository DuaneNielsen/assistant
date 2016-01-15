psql -h localhost postgres postgres 
create database assistant;
\connect assistant;
\i trades_schema.sql 
