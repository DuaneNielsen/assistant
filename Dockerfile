FROM nodesource/trusty:4.2.1

ADD package.json package.json  
RUN npm install  
ADD . .

ENV IP=0.0.0.0 PORT=8080
EXPOSE 8080
CMD ["node","app.js"]  
