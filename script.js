// script.js
$(document).ready(function() {
    const songRequestForm = $('#songRequestForm');
    const payButton = $('#payButton');
    const messageArea = $('#messageArea');
    const nameInput = $('#name');
    const songTitleInput = $('#songTitle');
    const publicQueueList = $('#public-queue-list');

    const PAYREXX_BASE_URL = "https://dj-n744.payrexx.com/pay?tid=ec96356d";

    payButton.payrexxModal();

    payButton.on('click', function(e) {
        messageArea.html('').removeClass('message-success message-error message-info');
        const name = nameInput.val().trim();
        const songTitle = songTitleInput.val().trim();

        if (!songTitle) {
            e.preventDefault();
            e.stopImmediatePropagation();
            showMessage('Song title is required.', 'error');
            songTitleInput.focus();
            return;
        }

        const internalRef = generateUUID();
        const songData = { name: name, songTitle: songTitle, internalRef: internalRef };
        
        try {
            sessionStorage.setItem(internalRef, JSON.stringify(songData));
        } catch (storageError) {
            e.preventDefault();
            e.stopImmediatePropagation();
            showMessage('Could not prepare payment. Please try again.', 'error');
            return;
        }
        
        const newHref = `${PAYREXX_BASE_URL}&reference=${internalRef}&amount=100¤cy=CHF`;
        $(this).attr('href', newHref);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const prReference = urlParams.get('pr_reference');

    if (prReference) {
        if (window.history.replaceState) {
            const cleanURL = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: cleanURL }, '', cleanURL);
        }

        const storedSongDataJSON = sessionStorage.getItem(prReference);
        sessionStorage.removeItem(prReference);

        if (paymentStatus === 'success' && storedSongDataJSON) {
            const songData = JSON.parse(storedSongDataJSON);
            if (songData.internalRef === prReference) {
                submitSongToServer(songData);
            } else {
                showMessage('Payment successful, but reference mismatch.', 'error');
            }
        } else if (paymentStatus === 'failed') {
            showMessage('Payment failed or was cancelled.', 'error');
        } else if (!storedSongDataJSON && paymentStatus === 'success') {
            showMessage('Payment successful, but request details were lost. Please contact the DJ.', 'error');
        }
    }
    
    async function submitSongToServer(songData) {
        showMessage('Payment successful! Submitting your song request...', 'info');
        try {
            const response = await fetch('/submit-song', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: songData.name,
                    songTitle: songData.songTitle,
                    reference: songData.internalRef
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);
            
            showMessage('Song requested successfully! Thank you.', 'success');
            songRequestForm[0].reset();
            fetchPublicQueue();
        } catch (error) {
            showMessage(`Error: ${error.message}. Your payment was successful, but the song couldn't be auto-submitted. Please notify the DJ.`, 'error');
        }
    }
    
    async function fetchPublicQueue() {
        try {
            const response = await fetch('/api/queue');
            if (!response.ok) throw new Error('Could not fetch queue.');
            const queue = await response.json();
            renderPublicQueue(queue);
        } catch (error) {
            publicQueueList.html('<li class="empty">Could not load queue.</li>');
        }
    }

    function renderPublicQueue(queue) {
        publicQueueList.empty();
        if (queue.length === 0) {
            publicQueueList.append('<li class="empty">The queue is currently empty. Be the first!</li>');
        } else {
            queue.forEach(request => {
                const listItem = `<li><span class="queue-song-title">${escapeHTML(request.songTitle)}</span><span class="queue-requester-name">Requested by: ${escapeHTML(request.name)}</span></li>`;
                publicQueueList.append(listItem);
            });
        }
    }

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
    
    function showMessage(text, type = 'info') {
        messageArea.text(text).removeClass('message-success message-error message-info').addClass(`message-${type}`);
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    fetchPublicQueue();
    setInterval(fetchPublicQueue, 15000);
});