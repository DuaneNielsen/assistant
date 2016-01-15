Upgrading Docker on UBUNTU

sudo service docker stop
sudo apt-get remove docker.io
wget -qO- https://get.docker.com/ | sh
sudo usermod -aG docker niedu02
sudo service docker start

creating resources

docker network create assistnet
docker volume create --name postgres-data
