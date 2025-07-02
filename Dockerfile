# Stage 1: Build the application
FROM node:22 AS builder

WORKDIR /usr/src/app

# Copy package.json, package-lock.json and tsconfig.json
COPY package*.json ./
COPY tsconfig.json ./
COPY .env ./

# Install all dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Create the production image
FROM node:22-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the compiled code from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port the app runs on (if any, you might need to change this)
# EXPOSE 3000

# Command to run the application
CMD ["node", "dist/index.js"]
