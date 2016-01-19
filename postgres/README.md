## create database schema

  psql -h localhost postgres postgres 
  create database assistant;
  \connect assistant;
  \i trades_schema.sql 

## to navigate database

  \dt
  \t+ 

## add keys

  docker volume inspect postgres-data
  cp fullchain.pem <volume directory on host>
  cp privkey.pem <volume directory on host>
  edit the following in postgressql.conf
    ssl = on
    ssl_cert_file = 'fullchain.pem'
    ssl_key_file = 'privkey.pem'
