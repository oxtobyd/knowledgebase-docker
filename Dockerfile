FROM node:20.17.0-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3002

# Start the application with the correct port
ENV PORT=3002
CMD ["npm", "run", "dev"]