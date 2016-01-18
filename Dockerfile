FROM nodesource/trusty:4.2.1

ADD package.json package.json  
RUN npm install  
ADD . .

ENV IP=0.0.0.0 PORT=443
EXPOSE 443
EXPOSE 80
CMD ["bin/www"]  
