# 📋 Paste Log Lab

Client-side log triage tool for shop-floor and UAT environments. Paste, drop, or upload log files for instant analysis — no backend, no uploads, everything stays in your browser.

**Live Demo:** [https://evan-thedev.github.io/paste-log-lab/](https://evan-thedev.github.io/paste-log-lab/)

## Features

- **Multiple Input Methods**
  - Drag & drop `.log` or `.txt` files
  - File picker upload
  - Direct paste from clipboard
  - Load sample log for testing

- **Auto-Detection**
  - Timestamps (ISO format: `YYYY-MM-DD HH:MM:SS.mmm`)
  - Log levels (DEBUG, INFO, WARN, ERROR, FATAL)
  - Logger/class names (text in square brackets)
  - Error codes (patterns like `ERR-1001`, `ERROR-2003`)

- **Analysis & Visualization**
  - Histogram by log level
  - Error code frequency counts
  - Timeline visualization (when timestamps present)
  - Total lines and unique logger counts

- **Filtering**
  - Search by substring
  - Filter by log level (click chips to toggle)
  - Filter by logger name (when multiple loggers detected)

- **Export**
  - Copy filtered lines to clipboard
  - Copy summary as Markdown

- **Privacy First**
  - 100% client-side processing
  - No data uploaded or transmitted
  - No tracking, no analytics
  - Works offline after initial load

## How to Use

1. **Load a log file:**
   - Drag and drop a `.log` or `.txt` file onto the drop zone
   - Click the drop zone to browse and select a file
   - Click "Load Sample Log" to see a demo
   - Click "Paste from Clipboard" to paste content directly

2. **Analyze:**
   - View the summary statistics and histograms
   - See log level distribution
   - Identify frequent error codes
   - Check timeline distribution

3. **Filter:**
   - Use the search box to filter by text
   - Click log level chips to show/hide levels
   - Click logger chips to filter by component

4. **Export:**
   - Click "Copy Filtered Lines" to copy visible log lines
   - Click "Copy Summary as Markdown" for a formatted summary

## Supported Log Formats

Paste Log Lab works best with structured log formats that include:

- **Timestamps:** ISO-like format (`2026-09-02 08:15:23.456`)
- **Log Levels:** DEBUG, INFO, WARN, ERROR, FATAL (and variants like WARNING, CRITICAL, TRACE)
- **Logger Names:** In square brackets (`[com.example.OrderService]`)
- **Error Codes:** Patterns like `ERR-1001`, `ERROR-2003`, `E1234`

### Example Log Line

```
2026-09-02 08:15:27.567 ERROR [com.example.PaymentGateway] Payment processing failed: ERR-1001 - Gateway timeout
```

The tool will still work with partial information (e.g., logs without timestamps or logger names).

## File Size Limits

- **Warning threshold:** 5 MB (processes but shows warning)
- **Maximum size:** 50 MB (rejects larger files)
- Large files may take a moment to process

## Technology Stack

- **Pure HTML/CSS/JavaScript** — no frameworks, no build step
- **GitHub Pages** — static hosting
- **Modern browser APIs:**
  - File API for drag & drop
  - Clipboard API for copy functionality
  - Fetch API for loading sample log

## Browser Requirements

Modern browsers with support for:
- ES6+ JavaScript
- File API
- Clipboard API (for copy features)

Tested on Chrome, Firefox, Safari, and Edge (2024+).

## Local Development

No build process required! Just open `index.html` in a browser:

```bash
# Clone the repository
git clone https://github.com/evan-thedev/paste-log-lab.git
cd paste-log-lab

# Open in your browser (or use a local server)
open index.html

# Or with Python
python3 -m http.server 8000
# Then visit http://localhost:8000

# Or with Node.js
npx serve
```

## Project Structure

```
paste-log-lab/
├── index.html          # Main HTML structure
├── styles.css          # Styling and layout
├── app.js             # Application logic
├── sample.log         # Sample log file for demo
├── LICENSE            # MIT License
└── README.md          # This file
```

## Privacy & Security

- **No data collection:** No analytics, no tracking, no cookies
- **No external requests:** Except loading the sample log from the same domain
- **Client-side only:** All processing happens in your browser
- **No persistence:** Clear the page and everything is gone

Perfect for analyzing logs with sensitive information.

## Author

**Evan Parrott**
- GitHub: [@evan-thedev](https://github.com/evan-thedev)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [csv-workshop](https://github.com/evan-thedev/csv-workshop) - Client-side CSV analysis tool
- [har-evidence-card](https://github.com/evan-thedev/har-evidence-card) - HAR file viewer

## Contributing

Issues and pull requests welcome! This is a simple tool meant to stay simple.

## Roadmap

Potential future enhancements:
- Support for JSON log formats
- Regex search
- Time range filtering
- Export to CSV
- Dark mode toggle
- Multiple file comparison

Keep it simple, keep it client-side!
