AI Playlist Generator is an intelligent application that analyzes your Plex listening history (and optional Last.fm data) to generate personalized playlists using AI models via OpenRouter. It connects to your Plex Media Server, fetches listening history, runs AI-driven analysis, and creates playlists you can review and add back to Plex.

## Installing

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/ai-playlist-generator.git
cd ai-playlist-generator
npm install
```

## Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
PLEX_SERVER_URL=http://localhost:32400
LASTFM_API_KEY=your_lastfm_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
PLEX_CLIENT_ID=ai-playlist-generator
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Starting the Application

### Development

```bash
npm start
```

Application will run at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run serve
```

## Usage

1. **Authenticate with Plex**
   Click “Sign in with Plex” and authorize the application.
2. **Select AI Model**
   Choose your preferred model provided via OpenRouter.
3. **Configure Time Frame**
   Pick the period of listening history to analyze (e.g., last 30 days).
4. **Generate Playlist**
   Application will: - Load library and history from Plex (and Last.fm if configured) - Analyze musical preferences (tempo, genre, energy) - Find similar artists and albums - Select tracks and assemble a personalized playlist
5. **Review \& Create**
   Examine the suggested tracks, make edits if desired, then add the playlist back to your Plex library.

## Features

- **Plex Integration**: Fetch music library and listening history
- **Last.fm Support**: Enrich history with scrobbles for deeper insights
- **OpenRouter AI**: Run AI analysis via OpenRouter endpoints
- **Real-time Progress**: Live status updates during generation
- **Playlist Management**: Review, edit, and save playlists in Plex
- **Music Profile Analysis**: Energy, era, and genre breakdowns

## API Integration

- **Plex Media Server**: Library and history access
- **Last.fm API**: Optional listening data enrichment
- **OpenRouter**: AI inference for music analysis

## Error Handling

- Handles authentication errors and token expirations
- Validates API responses and network failures
- Provides user-friendly messages for missing data or time-frame issues

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -m "Add awesome feature"`)
4. Push to your branch (`git push origin feature/awesome-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For questions or issues, open an issue on GitHub or join the discussion in Discussions.
