##Upgrading Docker on UBUNTU 14.04

>sudo service docker stop
>sudo apt-get remove docker.io
>wget -qO- https://get.docker.com/ | sh
>sudo usermod -aG docker niedu02
>sudo service docker start

##creating resources

>docker network create assistnet
>docker volume create --name postgres-data

##install docker compose on Ubuntu 14.04

>curl -s 'https://sks-keyservers.net/pks/lookup?op=get&search=0xee6d536cf7dc86e2d7d56f59a178ac6c6238f52e' | sudo apt-key add --import
>sudo apt-get update && sudo apt-get install apt-transport-https
>sudo apt-get install -y linux-image-extra-virtual

