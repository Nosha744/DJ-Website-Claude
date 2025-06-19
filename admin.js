// admin.js
document.addEventListener('DOMContentLoaded', () => {
    const requestList = document.getElementById('request-list');
    const saveOrderBtn = document.getElementById('saveOrderBtn');
    const clearPlayedBtn = document.getElementById('clearPlayedBtn');
    const messageArea = document.getElementById('message-area');
    let sortable;

    if (requestList) {
        sortable = new Sortable(requestList, {
            animation: 150,
            handle: 'tr',
            filter: '.status-played',
            onEnd: () => {
                saveOrderBtn.style.display = 'inline-block';
            }
        });
    }

    requestList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-played')) {
            const button = e.target;
            button.disabled = true;
            const songId = button.dataset.id;
            
            try {
                const response = await fetch(`/admin/mark-played/${songId}`, { method: 'POST' });
                if (response.ok) {
                    const row = button.closest('tr');
                    row.classList.remove('status-pending');
                    row.classList.add('status-played');
                    row.querySelector('.status-badge').textContent = 'played';
                    button.remove();
                    showMessage('Song marked as played.', 'success');
                    // Optional: Move the row to the end or handle visually
                    // For now, it stays in place but is styled differently and un-draggable.
                } else {
                   const result = await response.json();
                   showMessage(result.message || 'Failed to update status.', 'error');
                   button.disabled = false;
                }
            } catch (error) {
                showMessage('An error occurred.', 'error');
                button.disabled = false;
            }
        }
    });

    saveOrderBtn.addEventListener('click', async () => {
        const order = sortable.toArray();
        saveOrderBtn.disabled = true;
        saveOrderBtn.textContent = 'Saving...';
        
        try {
            const response = await fetch('/admin/update-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order }),
            });
            if (response.ok) {
                showMessage('Queue order saved!', 'success');
                saveOrderBtn.style.display = 'none';
            } else {
                const result = await response.json();
                showMessage(result.message || 'Failed to save order.', 'error');
            }
        } catch (error) {
            showMessage('An error occurred while saving the order.', 'error');
        } finally {
            saveOrderBtn.disabled = false;
            saveOrderBtn.textContent = 'Save Order';
        }
    });

    clearPlayedBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to permanently remove all "played" songs?')) return;

        try {
            const response = await fetch('/admin/clear-played', { method: 'POST' });
            if (response.ok) {
                document.querySelectorAll('tr.status-played').forEach(row => row.remove());
                showMessage('Played songs cleared successfully.', 'success');
            } else {
                const result = await response.json();
                showMessage(result.message || 'Failed to clear songs.', 'error');
            }
        } catch (error) {
            showMessage('An error occurred while clearing songs.', 'error');
        }
    });

    function showMessage(text, type) {
        messageArea.textContent = text;
        messageArea.className = `message ${type}`;
        setTimeout(() => { messageArea.textContent = ''; messageArea.className = 'message'; }, 4000);
    }
});