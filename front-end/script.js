document.getElementById('signup-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    
    const response = await fetch('/users/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    document.getElementById('message').textContent = result.message;
});

document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    const response = await fetch('/users/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    document.getElementById('message').textContent = result.message;
    if (response.ok) {
        document.getElementById('logout-button').style.display = 'block';
    }
});

document.getElementById('logout-button').addEventListener('click', async () => {
    const response = await fetch('/users/logout', {
        method: 'POST',
    });

    const result = await response.json();
    document.getElementById('message').textContent = result.message;
    if (response.ok) {
        document.getElementById('logout-button').style.display = 'none';
    }
});
