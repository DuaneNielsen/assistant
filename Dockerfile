FROM nodesource/trusty:4.2.1

ADD package.json package.json  
RUN npm install  
ADD . .

CMD ["node","app.js"]  