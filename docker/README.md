Upgrading Docker on UBUNTU

sudo service docker stop
sudo apt-get remove docker.io
wget -qO- https://get.docker.com/ | sh
sudo usermod -aG docker niedu02
