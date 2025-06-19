# DJ Song Request Website

This is a website for taking paid song requests during a live DJ set. It features a public queue, an admin dashboard to manage requests, and a persistent database to store the queue between server restarts.

## Features

-   **Public Page**: Users can enter their name and a song title to request.
-   **Payrexx Integration**: Redirects users to a Payrexx payment link.
-   **Live Queue**: The public page shows a live list of pending song requests.
-   **Admin Dashboard**: A password-protected area for the DJ.
-   **Queue Management**: Admins can mark songs as "played".
-   **Queue Re-ordering**: Admins can drag and drop pending songs to change the play order.
-   **Persistent Storage**: Uses `lowdb` to save the queue in a `db.json` file, so no data is lost on server restart.
-   **Clear Old Requests**: Admins can clear all "played" songs from the database.

---

## Setup and Installation

Follow these steps to get the application running on your local machine.

### 1. Prerequisities

You must have [Node.js](https://nodejs.org/) installed (which includes `npm`).

### 2. Get the Code

Clone the repository or download the ZIP file and extract it to a folder on your computer.

### 3. Create Environment File

Create a file named `.env` in the root directory of the project. Copy the contents of the example below into it. You can change the secret key to any random string.