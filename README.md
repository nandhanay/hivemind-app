<h1 align="center"> HiveMind</h1>

<p align="center">
  <strong>Your AI-powered study productivity companion</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-FBC02D?style=for-the-badge&labelColor=0D0D0D" />
  <img src="https://img.shields.io/badge/expo-SDK%2054-FBC02D?style=for-the-badge&labelColor=0D0D0D" />
  <img src="https://img.shields.io/badge/backend-Firebase-FBC02D?style=for-the-badge&labelColor=0D0D0D" />
</p>

<p align="center">
  <em>Focus together. Learn smarter. Build streaks. </em>
</p>


## Overview

**HiveMind** is an AI-powered cross-platform study productivity application designed to help students improve focus, planning, and collaborative learning. The platform combines productivity tools with real-time collaboration features, creating a unified environment for both individual and group study sessions.

The goal is to reduce distractions, increase study consistency, and make learning more engaging through intelligent and interactive experiences.


## Key Features

### Focus & Productivity
- Multiple focus modes:
  - Focus Mode
  - Pomodoro
  - Long Focus
  - Custom sessions
- Automatic focus → break transitions
- Session tracking and study streaks
- Ambient study sound support

### Smart Study Planner
- Calendar-based task management
- Subject and topic scheduling
- Task difficulty indicators
- Progress tracking

### Learning Resources
- Notes management
- Flashcards
- AI-powered quizzes
- Weak topic identification and revision support

### Collaborative Study Rooms

HiveMind's core feature enabling group productivity:

- Create and join study rooms
- Shared real-time timers
- Collaborative task checklists
- Live member activity indicators
- Shared whiteboard
- Room themes and ambience customization

### Analytics & Progress

- Weekly study statistics
- Study heatmaps
- Achievement system
- Session insights and progress tracking

### User Authentication

- Email/password login
- Guest mode
- Persistent sessions


## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native |
| **Platform** | Expo SDK 54 |
| **Backend** | Firebase |
| **Database** | Firestore |
| **Authentication** | Firebase Auth |
| **State Management** | React Context API |
| **Storage** | AsyncStorage |
| **Graphics** | React Native SVG |
| **Audio** | Expo AV |
| **AI Provider** | Groq (Llama models) |


## Environment Setup & EAS Build Configuration

### Local Development
To run this application locally, you must define the required environment variables:
1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your actual API keys and configurations:
   - **EXPO_PUBLIC_GROQ_API_KEY**: Generate a key at [Groq Console](https://console.groq.com/).
   - **EXPO_PUBLIC_FIREBASE_***: Get these credentials from your Project Settings in the [Firebase Console](https://console.firebase.google.com/).

### Secure EAS Builds
For cloud builds (Expo Application Services), DO NOT commit your `.env` file or hardcode keys. Instead, use EAS Secrets:
1. Ensure your keys are prefixed with `EXPO_PUBLIC_` (e.g., `EXPO_PUBLIC_GROQ_API_KEY`).
2. Add these variables to your Expo project dashboard under **Project Settings > Secrets**, or define them using the EAS CLI:
   ```bash
   eas secret:create --name EXPO_PUBLIC_GROQ_API_KEY --value your-groq-key
   eas secret:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value your-firebase-key
   # Repeat for other Firebase variables
   ```
Expo's build system dynamically injects any EAS secrets starting with `EXPO_PUBLIC_` into the application bundle during compilation.


## Problem Statement

Students often switch between multiple applications for scheduling, focus sessions, collaboration, notes, and progress tracking. This fragmented workflow creates distractions and reduces productivity.

HiveMind solves this by providing a single integrated platform that combines:

- Productivity tools
- Smart planning
- Real-time collaboration
- Learning resources
- Progress analytics


## Future Scope

- AI-generated personalized quizzes
- Push notifications and reminders
- Leaderboards and social learning
- In-room chat functionality
- Offline mode with synchronization
- Study data export


<p align="center">
  <sub>"The hive is stronger together." — HiveMind</sub>
</p>
