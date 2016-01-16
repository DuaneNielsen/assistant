##Upgrading Docker on UBUNTU 14.04

    sudo service docker stop
    sudo apt-get remove docker.io
    wget -qO- https://get.docker.com/ | sh
    sudo adduser assistant
    sudo adduser assistant sudo
    sudo usermod -aG docker assistant
    sudo service docker start

##creating resources

    docker network create assistnet
    docker volume create --name postgres-data
    docker volume create --name mongo-data

##install docker compose on Ubuntu 14.04

    sudo su
    curl -L https://github.com/docker/compose/releases/download/1.5.2/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

##run up images
    wget https://raw.githubusercontent.com/DuaneNielsen/assistant/master/docker-compose.yml
    export PASSWORD=password
    docker-compose up -d
    
##create database schema
    sudo apt-get install postgresql-client-9.3
    wget https://raw.githubusercontent.com/DuaneNielsen/assistant/master/postgres/trades_schema.sql
    psql -h localhost postgres postgres    
        create database assistant;
        \connect assistant
        \i trades_schema.sql
        \q
    

