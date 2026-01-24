# Replit.md

## Overview

This is a real-time chat application built with Node.js. It uses Express as the web server and Socket.IO for real-time bidirectional communication between clients and the server. The application allows multiple users to join chat rooms, send messages, and see messages from other participants in real-time. Messages are persisted to a JSON file for history retention.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Server Architecture
- **Framework**: Express.js (v5.2.1) serves as the HTTP server foundation
- **Real-time Communication**: Socket.IO (v4.8.3) handles WebSocket connections for instant message delivery between connected clients
- **Design Pattern**: Single-file server architecture with inline HTML generation for the frontend

### Data Persistence
- **Storage Approach**: File-based JSON storage (`messages.json`)
- **Rationale**: Simple persistence without database setup overhead; suitable for small-scale chat applications
- **Trade-offs**: 
  - Pros: Zero configuration, easy to inspect/debug, no external dependencies
  - Cons: Not suitable for high-volume applications, no concurrent write handling, data could be lost on crashes

### Frontend Architecture
- **Approach**: Server-side rendered HTML with inline CSS and JavaScript
- **Real-time Updates**: Socket.IO client library connects to the server for live message streaming
- **Message Display**: Messages are categorized as "mine" (user's own) or "other" (from other users) with distinct styling

### Message Types
The system supports two message types:
1. **Chat messages**: Regular user messages with name and text
2. **System messages**: Automated notifications (e.g., user join announcements)

## External Dependencies

### NPM Packages
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | HTTP server and routing |
| socket.io | ^4.8.3 | Real-time WebSocket communication |
| @types/node | ^22.13.11 | TypeScript type definitions for Node.js |

### External Services
- None - the application is self-contained with no external API integrations

### File System Dependencies
- `messages.json`: Persistent storage for chat message history
- `public/`: Static file directory for client-side assets