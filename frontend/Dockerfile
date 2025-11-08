# frontend/Dockerfile
FROM node:18

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --ignore-scripts

# Copy the rest of the app
COPY . .

# Expose the Vite port
EXPOSE 5173

# The command is handled by docker-compose,
# but this is a good default.
CMD ["npm", "run", "dev"]